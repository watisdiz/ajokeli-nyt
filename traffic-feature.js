import {
  TRAFFIC_CORRIDOR_KM,
  analyzeRouteTraffic,
  formatIncidentTimeWindow,
  normalizeTrafficCollection,
} from "./traffic.js";

const DIGITRAFFIC_API = "https://tie.digitraffic.fi";
const USER_HEADER = "AjokeliNyt/MVP 1.3";
const ROADWORKS_PATH = "/api/traffic-message/v2/roadworks?includeAreaGeometry=true";
const ANNOUNCEMENTS_PATH =
  "/api/traffic-message/v2/traffic-announcements?includeAreaGeometry=true";

const ROUTE_SOURCE_ID = "route-feature-line";
const TRAFFIC_SOURCE_ID = "traffic-incidents";
const TRAFFIC_FILL_LAYER_ID = "traffic-incidents-fill";
const TRAFFIC_LINE_LAYER_ID = "traffic-incidents-line";
const TRAFFIC_POINT_LAYER_ID = "traffic-incidents-points";
const CACHE_MS = 2 * 60_000;

const state = {
  map: window.__ajokeliMap ?? null,
  incidents: [],
  routeAnalysis: null,
  dataLoadedAt: 0,
  loadPromise: null,
  unavailableSources: [],
  popup: null,
  lastRouteSignature: null,
  syncTimer: null,
};

injectStyles();
const elements = injectStatusElement();
enhanceLabels();
bindEvents();
initializeMap();

function injectStyles() {
  const style = document.createElement("style");
  style.dataset.feature = "traffic-incidents";
  style.textContent = `
    .traffic-data-status {
      margin: 10px 0 0;
      padding: 9px 10px;
      border: 1px solid rgba(245, 200, 76, 0.32);
      border-radius: 10px;
      color: #ffe39a;
      background: rgba(245, 200, 76, 0.08);
      line-height: 1.45;
    }

    .traffic-summary-section {
      padding-top: 13px;
      border-top: 1px solid var(--border);
    }

    .traffic-summary-heading,
    .traffic-summary-counts,
    .traffic-item-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .traffic-summary-heading h3 {
      margin-bottom: 0;
    }

    .traffic-summary-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 8px;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.035);
      font-size: 0.7rem;
      font-weight: 800;
      white-space: nowrap;
    }

    .traffic-summary-counts {
      margin: 9px 0;
      align-items: stretch;
    }

    .traffic-count-card {
      flex: 1 1 0;
      min-width: 0;
      padding: 8px;
      border: 1px solid var(--border);
      border-radius: 9px;
      background: rgba(0, 0, 0, 0.1);
      text-align: center;
    }

    .traffic-count-card strong,
    .traffic-count-card span {
      display: block;
    }

    .traffic-count-card strong {
      font-size: 1rem;
    }

    .traffic-count-card span {
      margin-top: 2px;
      color: var(--muted);
      font-size: 0.65rem;
    }

    .traffic-incident-list {
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: 11px;
      background: rgba(0, 0, 0, 0.1);
    }

    .traffic-incident-button {
      width: 100%;
      min-height: 0;
      padding: 10px;
      display: block;
      border: 0;
      border-bottom: 1px solid var(--border);
      color: var(--text);
      background: transparent;
      text-align: left;
    }

    .traffic-incident-button:last-child {
      border-bottom: 0;
    }

    .traffic-incident-button:hover,
    .traffic-incident-button:focus-visible {
      background: var(--surface-2);
    }

    .traffic-item-header strong {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.79rem;
    }

    .traffic-kind {
      flex: 0 0 auto;
      padding: 3px 6px;
      border-radius: 999px;
      font-size: 0.62rem;
      font-weight: 800;
    }

    .traffic-kind-roadwork {
      color: #ffd9a8;
      background: rgba(255, 138, 76, 0.16);
    }

    .traffic-kind-traffic {
      color: #ffb7c6;
      background: rgba(255, 77, 109, 0.16);
    }

    .traffic-item-description,
    .traffic-item-meta,
    .traffic-summary-note {
      display: block;
      color: var(--muted);
      line-height: 1.4;
    }

    .traffic-item-description {
      margin-top: 5px;
      font-size: 0.7rem;
    }

    .traffic-item-meta {
      margin-top: 4px;
      font-size: 0.65rem;
    }

    .traffic-summary-note {
      margin: 9px 0 0;
      font-size: 0.68rem;
    }

    .traffic-map-roadwork,
    .traffic-map-announcement {
      width: 17px;
      height: 5px;
      display: inline-block;
      border-radius: 999px;
    }

    .traffic-map-roadwork {
      background: #ff8a4c;
    }

    .traffic-map-announcement {
      background: #ff4d6d;
    }

    .traffic-popup {
      min-width: min(280px, 70vw);
      max-width: 340px;
    }

    .traffic-popup h3 {
      margin-bottom: 5px;
      font-size: 0.95rem;
    }

    .traffic-popup p {
      margin: 5px 0 0;
      font-size: 0.76rem;
      line-height: 1.4;
    }

    .traffic-popup-meta {
      color: var(--muted);
    }

    .traffic-popup-severity {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 800;
    }

    @media (max-width: 420px) {
      .traffic-summary-counts {
        gap: 6px;
      }

      .traffic-count-card {
        padding-inline: 5px;
      }
    }
  `;
  document.head.append(style);
}

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
    roadwork.innerHTML =
      '<i class="traffic-map-roadwork" aria-hidden="true"></i> Tietyö';

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

  for (const layerId of [
    TRAFFIC_FILL_LAYER_ID,
    TRAFFIC_LINE_LAYER_ID,
    TRAFFIC_POINT_LAYER_ID,
  ]) {
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

async function fetchDigitraffic(path) {
  const url = `${DIGITRAFFIC_API}${path}`;
  let response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Digitraffic-User": USER_HEADER,
      },
      cache: "no-store",
    });
  } catch (error) {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  }

  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function loadTrafficData(force = false) {
  if (state.loadPromise) return state.loadPromise;
  if (!force && state.incidents.length && Date.now() - state.dataLoadedAt < CACHE_MS) {
    return state.incidents;
  }

  state.loadPromise = (async () => {
    const [roadworks, announcements] = await Promise.allSettled([
      fetchDigitraffic(ROADWORKS_PATH),
      fetchDigitraffic(ANNOUNCEMENTS_PATH),
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

    synchronizeWithRoute(true);
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

function routeData() {
  const source = state.map?.getSource(ROUTE_SOURCE_ID);
  if (!source) return null;

  const serialized = typeof source.serialize === "function" ? source.serialize() : null;
  const data = serialized?.data ?? source._data ?? null;

  if (!data || typeof data === "string") return null;
  return data;
}

function routeCoordinates() {
  const data = routeData();
  const geometry =
    data?.type === "FeatureCollection"
      ? data.features?.[0]?.geometry
      : data?.type === "Feature"
        ? data.geometry
        : data;

  return geometry?.type === "LineString" ? geometry.coordinates : null;
}

function routeSignature(coordinates) {
  if (!coordinates?.length) return null;
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  return [
    coordinates.length,
    Number(first[0]).toFixed(5),
    Number(first[1]).toFixed(5),
    Number(last[0]).toFixed(5),
    Number(last[1]).toFixed(5),
  ].join(":");
}

function scheduleSynchronization() {
  window.clearTimeout(state.syncTimer);
  state.syncTimer = window.setTimeout(() => synchronizeWithRoute(), 80);
}

function synchronizeWithRoute(force = false) {
  const coordinates = routeCoordinates();
  const signature = routeSignature(coordinates);
  const existingSection = document.querySelector("#traffic-summary-section");

  if (!coordinates || elements.routeSummary.classList.contains("hidden")) {
    state.routeAnalysis = null;
    state.lastRouteSignature = null;
    existingSection?.remove();
    renderMapIncidents();
    return;
  }

  if (!state.incidents.length) {
    if (!state.loadPromise) loadTrafficData().catch(() => undefined);
    renderLoadingSummary();
    return;
  }

  if (!force && signature === state.lastRouteSignature && existingSection) return;

  state.lastRouteSignature = signature;
  state.routeAnalysis = analyzeRouteTraffic(
    state.incidents,
    coordinates,
    TRAFFIC_CORRIDOR_KM,
  );
  renderTrafficSummary();
  renderMapIncidents();
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
      <span class="traffic-summary-badge">Ladataan…</span>
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
  const severeText = analysis.counts.high
    ? `${analysis.counts.high} vakavaa`
    : "Ei vakavia";

  section.innerHTML = `
    <div class="traffic-summary-heading">
      <h3>Liikennetilanne</h3>
      <span class="traffic-summary-badge">
        <span aria-hidden="true">●</span>
        ${escapeHtml(worst?.label ?? "Ei kohteita")}
      </span>
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
  if (distanceKm < 1) return `${Math.max(10, Math.round(distanceKm * 1000 / 10) * 10)} m`;
  return `${new Intl.NumberFormat("fi-FI", { maximumFractionDigits: 1 }).format(distanceKm)} km`;
}

function bindEvents() {
  const observer = new MutationObserver(scheduleSynchronization);
  observer.observe(elements.routeSummary, {
    attributes: true,
    attributeFilter: ["class"],
    childList: true,
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
