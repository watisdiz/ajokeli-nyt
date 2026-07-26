import {
  FORECAST_CORRIDOR_KM,
  buildDepartureOptions,
  compareDepartureOptions,
  formatForecastTime,
  matchForecastSectionsToRoute,
  normalizeForecastSections,
  routeBoundingBox,
} from "./forecast.js";
import { escapeHtml } from "./dom-utils.js";
import { digitrafficJson } from "./api-client.js";
import { EVENTS, emit } from "./events.js";

const METADATA_PATH = "/api/weather/v1/forecast-sections-simple";
const FORECASTS_PATH = "/api/weather/v1/forecast-sections-simple/forecasts";
const ROUTE_LAYER_ID = "route-feature-route";
const FORECAST_SOURCE_ID = "route-weather-forecast-sections";
const FORECAST_CASING_LAYER_ID = "route-weather-forecast-casing";
const FORECAST_LAYER_ID = "route-weather-forecast-lines";
const CACHE_MS = 5 * 60_000;
const demoMode = new URLSearchParams(window.location.search).get("demo") === "1";

const state = {
  map: window.__ajokeliMap ?? null,
  routeSummary: document.querySelector("#route-summary"),
  routePanel: document.querySelector(".route-panel"),
  route: null,
  matchedSections: [],
  departureOptions: [],
  comparison: null,
  selectedTime: null,
  loading: false,
  popup: null,
  cache: new Map(),
};

const elements = injectStatusElement();
enhanceLabels();
bindEvents();
initializeMap();

function injectStatusElement() {
  if (!state.routePanel || !state.routeSummary) {
    throw new Error("Keliennustetta ei voitu liittää reittipaneeliin.");
  }

  const status = document.createElement("p");
  status.id = "forecast-data-status";
  status.className = "forecast-data-status hidden";
  status.setAttribute("role", "status");
  state.routeSummary.insertAdjacentElement("afterend", status);

  return {
    status,
    legend: document.querySelector(".map-legend"),
  };
}

function enhanceLabels() {
  if (elements.legend && !elements.legend.querySelector("[data-forecast-legend]")) {
    const forecast = document.createElement("span");
    forecast.dataset.forecastLegend = "route";
    forecast.innerHTML =
      '<i class="forecast-map-legend" aria-hidden="true"></i> Tiejaksoennuste';
    elements.legend.append(forecast);
  }

  const footerText = document.querySelector(".footer p");
  if (footerText) {
    footerText.textContent =
      "Tiesää, tiejaksoennusteet ja liikennetiedotteet: Fintraffic / Digitraffic, CC BY 4.0. Kartta ja paikkahaku: OpenStreetMap, OpenFreeMap ja Nominatim. Reititys: OSRM. Tarkista viralliset liikenne- ja kelivaroitukset ennen ajoa.";
  }
}

function initializeMap() {
  if (!state.map) {
    showStatus("Keliennustetta ei voitu liittää karttaan.", true);
    return;
  }

  if (state.map.loaded()) addLayers();
  else state.map.once("load", addLayers);
}

function addLayers() {
  if (!state.map || state.map.getSource(FORECAST_SOURCE_ID)) return;

  state.map.addSource(FORECAST_SOURCE_ID, {
    type: "geojson",
    data: emptyFeatureCollection(),
  });

  const beforeLayer = state.map.getLayer(ROUTE_LAYER_ID) ? ROUTE_LAYER_ID : undefined;

  state.map.addLayer(
    {
      id: FORECAST_CASING_LAYER_ID,
      type: "line",
      source: FORECAST_SOURCE_ID,
      paint: {
        "line-color": "#ffffff",
        "line-width": ["interpolate", ["linear"], ["zoom"], 4, 5, 9, 8, 14, 11],
        "line-opacity": 0.8,
      },
    },
    beforeLayer,
  );

  state.map.addLayer(
    {
      id: FORECAST_LAYER_ID,
      type: "line",
      source: FORECAST_SOURCE_ID,
      paint: {
        "line-color": ["get", "color"],
        "line-width": ["interpolate", ["linear"], ["zoom"], 4, 3, 9, 5, 14, 8],
        "line-opacity": 0.92,
      },
    },
    beforeLayer,
  );

  state.map.on("mouseenter", FORECAST_LAYER_ID, () => {
    state.map.getCanvas().style.cursor = "pointer";
  });
  state.map.on("mouseleave", FORECAST_LAYER_ID, () => {
    state.map.getCanvas().style.cursor = "";
  });
  state.map.on("click", FORECAST_LAYER_ID, handleForecastMapClick);

  renderMapForecast();
}

function emptyFeatureCollection() {
  return { type: "FeatureCollection", features: [] };
}

function bboxParameters(bbox) {
  return new URLSearchParams({
    xMin: bbox.xMin.toFixed(4),
    yMin: bbox.yMin.toFixed(4),
    xMax: bbox.xMax.toFixed(4),
    yMax: bbox.yMax.toFixed(4),
  });
}

function bboxKey(bbox) {
  return [bbox.xMin, bbox.yMin, bbox.xMax, bbox.yMax]
    .map((value) => value.toFixed(2))
    .join(":");
}

async function loadForecastData(coordinates, force = false) {
  const bbox = routeBoundingBox(coordinates);
  if (!bbox) throw new Error("Reitin rajausta ei voitu muodostaa");

  const key = bboxKey(bbox);
  const cached = state.cache.get(key);
  if (!force && cached && Date.now() - cached.loadedAt < CACHE_MS) {
    return cached.sections;
  }

  const parameters = bboxParameters(bbox);
  const [metadata, forecasts] = await Promise.all([
    digitrafficJson(`${METADATA_PATH}?${parameters}`),
    digitrafficJson(`${FORECASTS_PATH}?${parameters}`),
  ]);

  const sections = normalizeForecastSections(metadata, forecasts);
  state.cache.set(key, { sections, loadedAt: Date.now() });
  return sections;
}

function handleRouteChanged(route) {
  state.route = route;

  if (!route) {
    resetForecast();
    return;
  }

  synchronizeWithRoute();
}

async function synchronizeWithRoute(force = false) {
  if (!state.route) return;
  const coordinates = state.route.geometry.coordinates;

  if (state.loading) return;
  state.loading = true;
  renderLoadingSummary();

  if (demoMode) {
    state.loading = false;
    state.matchedSections = [];
    state.departureOptions = [];
    renderUnavailableSummary(
      "Keliennustetta ei haeta demo-tilassa. Poista osoitteesta ?demo=1 käyttääksesi live-ennustetta.",
    );
    return;
  }

  showStatus("Ladataan reitin tiejaksoennustetta…");

  try {
    const sections = await loadForecastData(coordinates, force);
    state.matchedSections = matchForecastSectionsToRoute(
      sections,
      coordinates,
      FORECAST_CORRIDOR_KM,
    );
    state.departureOptions = buildDepartureOptions(state.matchedSections, new Date());

    if (!state.departureOptions.length) {
      state.selectedTime = null;
      state.comparison = null;
      renderUnavailableSummary("Reitille ei löytynyt käytettävissä olevia ennusteaikoja.");
      renderMapForecast();
      hideStatus();
      return;
    }

    if (!state.departureOptions.some((option) => option.time === state.selectedTime)) {
      state.selectedTime = state.departureOptions[0].time;
    }

    state.comparison = compareDepartureOptions(
      state.matchedSections,
      state.departureOptions,
    );

    renderForecastSummary();
    renderMapForecast();
    hideStatus();
  } catch (error) {
    console.error(error);
    state.matchedSections = [];
    state.departureOptions = [];
    state.comparison = null;
    renderUnavailableSummary(
      "Tiejaksokohtaista keliennustetta ei saatu ladattua. Nykyiset havainnot ja liikennetilanne toimivat silti.",
    );
    showStatus(
      `Keliennusteen haku epäonnistui (${error.message}). ` +
        '<button class="text-button" type="button" data-forecast-action="retry">Yritä uudelleen</button>',
      true,
    );
    renderMapForecast();
  } finally {
    state.loading = false;
  }
}

function selectedComparison() {
  return (
    state.comparison?.comparisons.find(
      (item) => item.option.time === state.selectedTime,
    ) ?? state.comparison?.comparisons[0] ?? null
  );
}

function renderLoadingSummary() {
  let section = document.querySelector("#forecast-summary-section");
  if (!section) {
    section = document.createElement("section");
    section.id = "forecast-summary-section";
    section.className = "route-summary-section forecast-summary-section";
    state.routeSummary.append(section);
  }

  section.innerHTML = `
    <div class="forecast-summary-heading">
      <div>
        <h3>Keliennuste ja lähtöaika</h3>
        <span class="forecast-summary-note">Ladataan tiejaksoennusteita…</span>
      </div>
      <span class="forecast-summary-badge is-loading">Ladataan…</span>
    </div>
  `;
  emit(EVENTS.FORECAST_CHANGED, { status: "loading" });
}

function renderUnavailableSummary(message) {
  let section = document.querySelector("#forecast-summary-section");
  if (!section) {
    section = document.createElement("section");
    section.id = "forecast-summary-section";
    section.className = "route-summary-section forecast-summary-section";
    state.routeSummary.append(section);
  }

  section.innerHTML = `
    <div class="forecast-summary-heading">
      <div>
        <h3>Keliennuste ja lähtöaika</h3>
        <p class="forecast-summary-note">${escapeHtml(message)}</p>
      </div>
      <span class="forecast-summary-badge">Ei saatavilla</span>
    </div>
  `;
  emit(EVENTS.FORECAST_CHANGED, { status: "unavailable" });
}

function recommendationText(selected, best) {
  if (!selected || !best) return "Vertailuun ei saatu riittävästi ennustetietoa.";

  if (best.option.time !== selected.option.time && best.score < selected.score) {
    return `Ennusteen perusteella vertailun suotuisin lähtöaika on ${best.option.label.toLocaleLowerCase("fi-FI")}. Tämä on tiejaksoennusteeseen perustuva vertailu, ei ajosuositus.`;
  }

  if (best.option.time === selected.option.time) {
    return `${selected.option.label} on tämän ennustevertailun suotuisimpien aikojen joukossa.`;
  }

  return "Valittu lähtöaika on ennustevertailussa samalla tasolla kuin paras vaihtoehto.";
}

function renderForecastSummary() {
  const selected = selectedComparison();
  if (!selected) {
    renderUnavailableSummary("Ennustetietoa ei löytynyt valitulle reitille.");
    return;
  }

  let section = document.querySelector("#forecast-summary-section");
  if (!section) {
    section = document.createElement("section");
    section.id = "forecast-summary-section";
    section.className = "route-summary-section forecast-summary-section";
    state.routeSummary.append(section);
  }

  const analysis = selected.analysis;
  const worst = analysis.worstLevel;
  const highlights = analysis.highlights;
  const best = state.comparison?.best;

  section.innerHTML = `
    <div class="forecast-summary-heading">
      <div>
        <h3>Keliennuste ja lähtöaika</h3>
        <span class="forecast-summary-note">
          Tiejaksokohtainen ennuste valitulle lähtöajalle
        </span>
      </div>
      <span class="forecast-summary-badge">
        <i class="risk-dot risk-${worst?.key ?? "stale"}" aria-hidden="true"></i>
        ${escapeHtml(worst?.label ?? "Ei arviota")}
      </span>
    </div>

    <div class="forecast-control-row">
      <label for="forecast-departure-select">
        Lähtöaika
        <select id="forecast-departure-select" class="forecast-select">
          ${state.departureOptions
            .map(
              (option) => `
                <option value="${escapeHtml(option.time)}" ${
                  option.time === state.selectedTime ? "selected" : ""
                }>
                  ${escapeHtml(option.label)} · ${escapeHtml(formatForecastTime(option.time))}
                </option>
              `,
            )
            .join("")}
        </select>
      </label>
    </div>

    <div class="forecast-comparison" aria-label="Lähtöaikojen vertailu">
      ${state.comparison.comparisons
        .map(
          (item) => `
            <button
              class="forecast-option ${
                item.option.time === state.selectedTime ? "is-selected" : ""
              }"
              type="button"
              data-forecast-time="${escapeHtml(item.option.time)}"
            >
              <strong>${escapeHtml(item.option.label)}</strong>
              <span>
                ${escapeHtml(item.analysis.worstLevel?.label ?? "Ei arviota")} ·
                ${item.analysis.coverage.forecastSections}/${item.analysis.coverage.matchedSections} tiejaksoa
              </span>
            </button>
          `,
        )
        .join("")}
    </div>

    <p class="forecast-recommendation">
      ${escapeHtml(recommendationText(selected, best))}
    </p>

    <div class="forecast-counts">
      ${forecastCountCard(analysis.counts.normal, "normaalia")}
      ${forecastCountCard(analysis.counts.difficult, "huonoa")}
      ${forecastCountCard(analysis.counts.extreme, "erittäin huonoa")}
      ${forecastCountCard(analysis.counts.stale, "ei arviota")}
    </div>

    ${
      highlights.length
        ? `<div class="forecast-highlight-list">
            ${highlights.map(renderForecastHighlight).join("")}
          </div>`
        : `<p class="muted small">
            Valitulle ajalle ei tunnistettu huonoja tai erittäin huonoja tiejaksoja.
          </p>`
    }

    <p class="forecast-summary-note">
      Ennuste kattaa ${analysis.coverage.forecastSections}/${analysis.coverage.matchedSections}
      reitin lähellä olevasta tiejaksosta enintään ${FORECAST_CORRIDOR_KM} km etäisyydellä.
      Aineisto päivittyy Digitrafficissa noin viiden minuutin välein.
    </p>
  `;
  emit(EVENTS.FORECAST_CHANGED, { status: "ready", label: worst?.label ?? "Ei arviota" });
}

function forecastCountCard(value, label) {
  return `
    <div class="forecast-count-card">
      <strong>${value}</strong>
      <span>${label}</span>
    </div>
  `;
}

function renderForecastHighlight(record) {
  const description =
    record.reasons.join(", ") ||
    `${record.level.label} ajokeli tiejaksolla`;

  return `
    <button
      class="forecast-highlight-button"
      type="button"
      data-forecast-section="${escapeHtml(record.section.id)}"
    >
      <span class="forecast-item-header">
        <strong>${escapeHtml(record.section.description)}</strong>
        <span class="forecast-item-level">
          ${escapeHtml(record.level.label)}
        </span>
      </span>
      <span class="forecast-item-description">${escapeHtml(description)}</span>
      <span class="forecast-item-meta">
        Ennuste ${escapeHtml(formatForecastTime(record.forecast.time))}
        ${formatTemperatures(record.forecast)}
      </span>
    </button>
  `;
}

function formatTemperatures(forecast) {
  const road = Number.isFinite(forecast.roadTemperature)
    ? ` · tie ${formatNumber(forecast.roadTemperature)} °C`
    : "";
  const air = Number.isFinite(forecast.temperature)
    ? ` · ilma ${formatNumber(forecast.temperature)} °C`
    : "";
  return `${road}${air}`;
}

function renderMapForecast() {
  const source = state.map?.getSource(FORECAST_SOURCE_ID);
  if (!source) return;

  const selected = selectedComparison();
  source.setData({
    type: "FeatureCollection",
    features: (selected?.analysis.records ?? []).map((record) => ({
      type: "Feature",
      geometry: record.section.geometry,
      properties: {
        sectionId: record.section.id,
        description: record.section.description,
        condition: record.level.label,
        color: record.level.color,
        forecastTime: record.forecast.time,
      },
    })),
  });
}

function handleForecastMapClick(event) {
  const sectionId = event.features?.[0]?.properties?.sectionId;
  if (!sectionId) return;

  const record = selectedComparison()?.analysis.records.find(
    (item) => item.section.id === sectionId,
  );
  if (!record) return;

  const coordinate = event.lngLat
    ? [event.lngLat.lng, event.lngLat.lat]
    : representativeCoordinate(record.section.geometry);
  showForecastPopup(record, coordinate);
}

function focusForecastSection(sectionId) {
  const record = selectedComparison()?.analysis.records.find(
    (item) => item.section.id === sectionId,
  );
  if (!record) return;

  const coordinates = [];
  collectCoordinates(record.section.geometry?.coordinates, coordinates);
  if (!coordinates.length) return;

  const bounds = coordinates.reduce(
    (current, coordinate) => current.extend(coordinate),
    new maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
  );

  state.map.fitBounds(bounds, {
    padding: 90,
    maxZoom: 13,
    duration: 700,
  });
  showForecastPopup(record, coordinates[Math.floor(coordinates.length / 2)]);
}

function showForecastPopup(record, coordinate) {
  if (!coordinate) return;
  state.popup?.remove();

  const content = document.createElement("div");
  content.className = "forecast-popup";

  const heading = document.createElement("h3");
  heading.textContent = record.section.description;

  const condition = document.createElement("p");
  condition.textContent = `${record.level.label} · ${formatForecastTime(record.forecast.time)}`;

  const reason = document.createElement("p");
  reason.textContent =
    record.reasons.join(", ") || "Tarkempaa vaikutuksen syytä ei ilmoitettu.";

  const details = document.createElement("p");
  details.className = "forecast-popup-meta";
  details.textContent = [
    Number.isFinite(record.forecast.roadTemperature)
      ? `Tienpinta ${formatNumber(record.forecast.roadTemperature)} °C`
      : null,
    Number.isFinite(record.forecast.temperature)
      ? `Ilma ${formatNumber(record.forecast.temperature)} °C`
      : null,
    Number.isFinite(record.forecast.windSpeed)
      ? `Tuuli ${formatNumber(record.forecast.windSpeed)} m/s`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  content.append(heading, condition, reason);
  if (details.textContent) content.append(details);

  state.popup = new maplibregl.Popup({ maxWidth: "360px" })
    .setLngLat(coordinate)
    .setDOMContent(content)
    .addTo(state.map);
}

function representativeCoordinate(geometry) {
  const coordinates = [];
  collectCoordinates(geometry?.coordinates, coordinates);
  return coordinates[Math.floor(coordinates.length / 2)] ?? null;
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

function resetForecast() {
  state.matchedSections = [];
  state.departureOptions = [];
  state.comparison = null;
  state.selectedTime = null;
  state.popup?.remove();
  state.popup = null;
  document.querySelector("#forecast-summary-section")?.remove();
  hideStatus();
  renderMapForecast();
  emit(EVENTS.FORECAST_CHANGED, { status: "unavailable" });
}

function showStatus(message, html = false) {
  elements.status.classList.remove("hidden");
  if (html) elements.status.innerHTML = message;
  else elements.status.textContent = message;
}

function hideStatus() {
  elements.status.classList.add("hidden");
  elements.status.textContent = "";
}

function formatNumber(value) {
  return new Intl.NumberFormat("fi-FI", {
    maximumFractionDigits: 1,
  }).format(value);
}

function bindEvents() {
  window.addEventListener(EVENTS.ROUTE_CHANGED, (event) => {
    handleRouteChanged(event.detail.route);
  });

  state.routeSummary.addEventListener("change", (event) => {
    const select = event.target.closest("#forecast-departure-select");
    if (!select) return;
    state.selectedTime = select.value;
    renderForecastSummary();
    renderMapForecast();
  });

  state.routeSummary.addEventListener("click", (event) => {
    const timeButton = event.target.closest("[data-forecast-time]");
    if (timeButton) {
      state.selectedTime = timeButton.dataset.forecastTime;
      renderForecastSummary();
      renderMapForecast();
      return;
    }

    const sectionButton = event.target.closest("[data-forecast-section]");
    if (sectionButton) focusForecastSection(sectionButton.dataset.forecastSection);
  });

  elements.status.addEventListener("click", (event) => {
    if (!event.target.closest('[data-forecast-action="retry"]')) return;
    hideStatus();
    synchronizeWithRoute(true);
  });

  window.addEventListener("resize", () => state.map?.resize());
}
