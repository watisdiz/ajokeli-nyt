import {
  TRAFFIC_CORRIDOR_KM,
  analyzeRouteTraffic,
  formatIncidentTimeWindow,
  normalizeTrafficCollection,
} from "./traffic.js?v=1.9.6";
import { escapeHtml } from "./dom-utils.js?v=1.9.6";
import { digitrafficJson } from "./api-client.js?v=1.9.6";
import { EVENTS, emit } from "./events.js?v=1.9.6";

const ROADWORKS_PATH = "/api/traffic-message/v2/roadworks";
const ANNOUNCEMENTS_PATH = "/api/traffic-message/v2/traffic-announcements";

const TRAFFIC_SOURCE_ID = "traffic-incidents";
const TRAFFIC_FILL_LAYER_ID = "traffic-incidents-fill";
const TRAFFIC_LINE_LAYER_ID = "traffic-incidents-line";
const TRAFFIC_POINT_LAYER_ID = "traffic-incidents-points";
const CACHE_MS = 2 * 60_000;
// traffic.js severities (low/medium/high) use the same colors as these risk
// levels, so the shared risk-banner/risk-dot styling can be reused as-is.
const SEVERITY_RISK_KEY = { low: "attention", medium: "difficult", high: "extreme" };

const state = {
  map: window.__ajokeliMap ?? null,
  route: null,
  incidents: [],
  routeAnalysis: null,
  dataLoadedAt: 0,
  loadPromise: null,
  unavailableSources: [],
  popup: null,
};

const elements = injectStatusElement();
enhanceLabels();
bindEvents();
initializeMap();

function injectStatusElement() {
  const routePanel = document.querySelector(".route-panel");
  const routeSummary = document.querySelector("#route-summary");

  if (!routePanel || !routeSummary) {
    throw new Error("Liikennetilannetta ei voitu liittää reittipaneeliin.");
  }

  const status = document.createElement("p");
  status.id = "traffic-data-status";
  status.className = "traffic-data-status hidden";
  status.setAttribute("role", "status");
  status.innerHTML = `
    Liikennetietoja ei saatu ladattua. Reitin ajokeli toimii silti.
    <button class="text-button" type="button" data-traffic-action="retry">Yritä uudelleen</button>
  `;
  routeSummary.insertAdjacentElement("afterend", status);

  return {
    routePanel,
    routeSummary,
    status,
    legend: document.querySelector(".map-legend"),
  };
}

function enhanceLabels() {
  if (elements.legend && !elements.legend.querySelector("[data-traffic-legend]")) {
    const roadwork = document.createElement("span");
    roadwork.dataset.trafficLegend = "roadwork";
    roadwork.innerHTML = '<i class="traffic-map-roadwork" aria-hidden="true"></i> Tietyö';

    const announcement = document.createElement("span");
    announcement.dataset.trafficLegend = "announcement";
    announcement.innerHTML =
      '<i class="traffic-map-announcement" aria-hidden="true"></i> Liikennehäiriö';

    elements.legend.append(roadwork, announcement);
  }

  const footerText = document.querySelector(".footer p");
  if (footerText) {
    footerText.textContent =
      "Tiesää ja liikennetiedotteet: Fintraffic / Digitraffic, CC BY 4.0. Kartta ja paikkahaku: OpenStreetMap, OpenFreeMap ja Nominatim. Reititys: OSRM. Tarkista viralliset liikenne- ja kelivaroitukset ennen ajoa.";
  }
}

function initializeMap() {
  if (!state.map) {
    showDataWarning(["karttayhteys"]);
    return;
  }

  if (state.map.loaded()) addLayers();
  else state.map.once("load", addLayers);

  loadTrafficData().catch((error) => console.error(error));
}

function addLayers() {
  if (!state.map || state.map.getSource(TRAFFIC_SOURCE_ID)) return;

  state.map.addSource(TRAFFIC_SOURCE_ID, {
    type: "geojson",
    data: emptyFeatureCollection(),
  });

  state.map.addLayer({
    id: TRAFFIC_FILL_LAYER_ID,
    type: "fill",
    source: TRAFFIC_SOURCE_ID,
    filter: ["==", ["geometry-type"], "Polygon"],
    paint: {
      "fill-color": ["get", "color"],
      "fill-opacity": 0.18,
      "fill-outline-color": ["get", "color"],
    },
  });

  state.map.addLayer({
    id: TRAFFIC_LINE_LAYER_ID,
    type: "line",
    source: TRAFFIC_SOURCE_ID,
    filter: ["==", ["geometry-type"], "LineString"],
    paint: {
      "line-color": ["get", "color"],
      "line-width": ["interpolate", ["linear"], ["zoom"], 4, 3, 9, 5, 14, 8],
      "line-opacity": 0.9,
    },
  });

  state.map.addLayer({
    id: TRAFFIC_POINT_LAYER_ID,
    type: "circle",
    source: TRAFFIC_SOURCE_ID,
    filter: ["==", ["geometry-type"], "Point"],
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 6, 9, 9, 14, 12],
      "circle-color": ["get", "color"],
      "circle-stroke-width": 2.5,
      "circle-stroke-color": "#ffffff",
      "circle-opacity": 0.95,
    },
  });

  for (const layerId of [TRAFFIC_FILL_LAYER_ID, TRAFFIC_LINE_LAYER_ID, TRAFFIC_POINT_LAYER_ID]) {
    state.map.on("mouseenter", layerId, () => {
      state.map.getCanvas().style.cursor = "pointer";
    });
    state.map.on("mouseleave", layerId, () => {
      state.map.getCanvas().style.cursor = "";
    });
    state.map.on("click", layerId, handleMapIncidentClick);
  }

  renderMapIncidents();
}

function emptyFeatureCollection() {
  return { type: "FeatureCollection", features: [] };
}

async function loadTrafficData(force = false) {
  if (state.loadPromise) return state.loadPromise;
  if (!force && state.incidents.length && Date.now() - state.dataLoadedAt < CACHE_MS) {
    return state.incidents;
  }

  state.loadPromise = (async () => {
    const [roadworks, announcements] = await Promise.allSettled([
      digitrafficJson(ROADWORKS_PATH),
      digitrafficJson(ANNOUNCEMENTS_PATH),
    ]);

    const unavailable = [];
    const incidents = [];

    if (roadworks.status === "fulfilled") {
      incidents.push(...normalizeTrafficCollection(roadworks.value, "roadwork"));
    } else {
      unavailable.push("tietyöt");
      console.warn("Tietyödatan haku epäonnistui:", roadworks.reason);
    }

    if (announcements.status === "fulfilled") {
      incidents.push(...normalizeTrafficCollection(announcements.value, "traffic"));
    } else {
      unavailable.push("liikennetiedotteet");
      console.warn("Liikennetiedotteiden haku epäonnistui:", announcements.reason);
    }

    if (unavailable.length === 2) {
      state.unavailableSources = unavailable;
      showDataWarning(unavailable);
      throw new Error("Digitrafficin liikennetietoja ei saatu ladattua");
    }

    state.incidents = incidents;
    state.dataLoadedAt = Date.now();
    state.unavailableSources = unavailable;

    if (unavailable.length) showDataWarning(unavailable);
    else hideDataWarning();

    if (state.route) synchronizeWithRoute();
    return incidents;
  })().finally(() => {
    state.loadPromise = null;
  });

  return state.loadPromise;
}

function showDataWarning(sources) {
  const sourceText = sources.join(" ja ");
  elements.status.classList.remove("hidden");
  elements.status.innerHTML = `
    ${escapeHtml(sourceText)} eivät ole juuri nyt saatavilla. Reitin ajokeli toimii silti.
    <button class="text-button" type="button" data-traffic-action="retry">Yritä uudelleen</button>
  `;
}

function hideDataWarning() {
  elements.status.classList.add("hidden");
}

function handleRouteChanged(route) {
  state.route = route;

  if (!route) {
    state.routeAnalysis = null;
    document.querySelector("#traffic-summary-section")?.remove();
    renderMapIncidents();
    emit(EVENTS.TRAFFIC_CHANGED, { status: "unavailable" });
    return;
  }

  synchronizeWithRoute();
}

function synchronizeWithRoute() {
  if (!state.incidents.length) {
    if (!state.loadPromise) loadTrafficData().catch(() => undefined);
    renderLoadingSummary();
    emit(EVENTS.TRAFFIC_CHANGED, { status: "loading" });
    return;
  }

  state.routeAnalysis = analyzeRouteTraffic(
    state.incidents,
    state.route.geometry.coordinates,
    TRAFFIC_CORRIDOR_KM,
  );
  renderTrafficSummary();
  renderMapIncidents();
  emit(EVENTS.TRAFFIC_CHANGED, { status: "ready", analysis: state.routeAnalysis });
}

function renderLoadingSummary() {
  let section = document.querySelector("#traffic-summary-section");
  if (!section) {
    section = document.createElement("section");
    section.id = "traffic-summary-section";
    section.className = "route-summary-section traffic-summary-section";
    elements.routeSummary.append(section);
  }
  section.innerHTML = `
    <div class="traffic-summary-heading">
      <h3>Liikennetilanne</h3>
      <span class="traffic-summary-badge is-loading">Ladataan…</span>
    </div>
  `;
}

function renderTrafficSummary() {
  const analysis = state.routeAnalysis;
  if (!analysis) return;

  let section = document.querySelector("#traffic-summary-section");
  if (!section) {
    section = document.createElement("section");
    section.id = "traffic-summary-section";
    section.className = "route-summary-section traffic-summary-section";
    elements.routeSummary.append(section);
  }

  const visibleItems = analysis.matched.slice(0, 8);
  const remaining = Math.max(0, analysis.matched.length - visibleItems.length);
  const worst = analysis.worstSeverity;
  const bannerKey = worst ? SEVERITY_RISK_KEY[worst.key] : "stale";
  const topIncident = worst
    ? analysis.matched.find((item) => item.incident.severity.key === worst.key)?.incident
    : null;
  const severeText = analysis.counts.high ? `${analysis.counts.high} vakavaa` : "Ei vakavia";

  section.innerHTML = `
    <div class="traffic-summary-heading">
      <h3>Liikennetilanne</h3>
    </div>

    <div class="risk-banner risk-banner-${bannerKey}">
      <div class="risk-banner-level">
        <i class="risk-dot risk-${bannerKey}" aria-hidden="true"></i>
        <strong>${escapeHtml(worst?.label ?? "Ei kohteita")}</strong>
      </div>
      ${topIncident ? `<p class="risk-banner-reason">${escapeHtml(topIncident.title)}</p>` : ""}
    </div>

    <div class="traffic-summary-counts">
      <div class="traffic-count-card">
        <strong>${analysis.counts.roadwork}</strong>
        <span>tietyötä</span>
      </div>
      <div class="traffic-count-card">
        <strong>${analysis.counts.traffic}</strong>
        <span>häiriötä</span>
      </div>
      <div class="traffic-count-card">
        <strong>${analysis.counts.high}</strong>
        <span>vakavaa</span>
      </div>
    </div>

    ${
      visibleItems.length
        ? `<div class="traffic-incident-list">
            ${visibleItems
              .map(({ incident, distanceKm }) => renderIncidentButton(incident, distanceKm))
              .join("")}
          </div>
          ${
            remaining
              ? `<p class="traffic-summary-note">${remaining} muuta kohdetta näkyy kartalla.</p>`
              : ""
          }`
        : `<p class="muted small">
            Reitin läheltä ei löytynyt aktiivisia tietöitä tai liikennetiedotteita.
          </p>`
    }

    <p class="traffic-summary-note">
      ${severeText}. Mukana ovat aktiiviset GeoJSON-kohteet enintään
      ${TRAFFIC_CORRIDOR_KM} km reitiltä. Tiedot eivät muuta valittua reittiä automaattisesti.
    </p>
  `;
}

function renderIncidentButton(incident, distanceKm) {
  return `
    <button
      class="traffic-incident-button"
      type="button"
      data-traffic-id="${escapeHtml(incident.id)}"
    >
      <span class="traffic-item-header">
        <strong>${escapeHtml(incident.title)}</strong>
        <span class="traffic-kind traffic-kind-${incident.kind}">
          ${escapeHtml(incident.typeLabel)}
        </span>
      </span>
      <span class="traffic-item-description">${escapeHtml(incident.description)}</span>
      <span class="traffic-item-meta">
        ${escapeHtml(incident.severity.label)} ·
        ${formatDistance(distanceKm)} reitiltä ·
        ${escapeHtml(formatIncidentTimeWindow(incident))}
      </span>
    </button>
  `;
}

function incidentsForMap() {
  return state.routeAnalysis
    ? state.routeAnalysis.matched.map((item) => item.incident)
    : state.incidents;
}

function renderMapIncidents() {
  const source = state.map?.getSource(TRAFFIC_SOURCE_ID);
  if (!source) return;

  source.setData({
    type: "FeatureCollection",
    features: incidentsForMap().map((incident) => ({
      type: "Feature",
      geometry: incident.geometry,
      properties: {
        incidentId: incident.id,
        kind: incident.kind,
        title: incident.title,
        severity: incident.severity.key,
        color: incident.kind === "roadwork" ? "#ff8a4c" : "#ff4d6d",
      },
    })),
  });
}

function handleMapIncidentClick(event) {
  const incidentId = event.features?.[0]?.properties?.incidentId;
  const incident = state.incidents.find((item) => item.id === incidentId);
  if (!incident) return;
  showIncidentPopup(incident, event.lngLat);
}

function showIncidentPopup(incident, lngLat = null) {
  state.popup?.remove();

  const coordinate = lngLat
    ? [lngLat.lng, lngLat.lat]
    : representativeCoordinate(incident.geometry);
  if (!coordinate) return;

  const content = document.createElement("div");
  content.className = "traffic-popup";

  const heading = document.createElement("h3");
  heading.textContent = incident.title;

  const severity = document.createElement("p");
  severity.className = "traffic-popup-severity";
  severity.textContent = `${incident.typeLabel} · ${incident.severity.label}`;

  const description = document.createElement("p");
  description.textContent = incident.description;

  const location = document.createElement("p");
  location.className = "traffic-popup-meta";
  location.textContent = incident.location || formatIncidentTimeWindow(incident);

  const time = document.createElement("p");
  time.className = "traffic-popup-meta";
  time.textContent = formatIncidentTimeWindow(incident);

  content.append(heading, severity, description);
  if (incident.location) content.append(location);
  content.append(time);

  state.popup = new maplibregl.Popup({ maxWidth: "360px" })
    .setLngLat(coordinate)
    .setDOMContent(content)
    .addTo(state.map);
}

function representativeCoordinate(geometry) {
  if (!geometry) return null;
  if (geometry.type === "Point") return geometry.coordinates;

  const coordinates = [];
  collectCoordinates(geometry.coordinates, coordinates);
  if (!coordinates.length) return null;

  return coordinates[Math.floor(coordinates.length / 2)];
}

function collectCoordinates(value, target) {
  if (
    Array.isArray(value) &&
    value.length >= 2 &&
    Number.isFinite(Number(value[0])) &&
    Number.isFinite(Number(value[1]))
  ) {
    target.push([Number(value[0]), Number(value[1])]);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectCoordinates(item, target);
  }
}

function focusIncident(incident) {
  const coordinates = [];
  collectCoordinates(incident.geometry?.coordinates, coordinates);
  if (!coordinates.length) return;

  if (coordinates.length === 1) {
    state.map.easeTo({
      center: coordinates[0],
      zoom: Math.max(state.map.getZoom(), 10),
      duration: 700,
    });
  } else {
    const bounds = coordinates.reduce(
      (current, coordinate) => current.extend(coordinate),
      new maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
    );
    state.map.fitBounds(bounds, {
      padding: 90,
      maxZoom: 13,
      duration: 700,
    });
  }

  showIncidentPopup(incident);
}

function formatDistance(distanceKm) {
  if (!Number.isFinite(Number(distanceKm))) return "–";
  if (distanceKm < 1) return `${Math.max(10, Math.round((distanceKm * 1000) / 10) * 10)} m`;
  return `${new Intl.NumberFormat("fi-FI", { maximumFractionDigits: 1 }).format(distanceKm)} km`;
}

function bindEvents() {
  window.addEventListener(EVENTS.ROUTE_CHANGED, (event) => {
    handleRouteChanged(event.detail.route);
  });

  elements.routeSummary.addEventListener("click", (event) => {
    const button = event.target.closest("[data-traffic-id]");
    if (!button) return;

    const incident = state.incidents.find((item) => item.id === button.dataset.trafficId);
    if (incident) focusIncident(incident);
  });

  elements.status.addEventListener("click", (event) => {
    if (!event.target.closest('[data-traffic-action="retry"]')) return;
    elements.status.classList.add("hidden");
    loadTrafficData(true).catch(() => undefined);
  });

  window.addEventListener("resize", () => state.map?.resize());
}
