import {
  FORECAST_CORRIDOR_KM,
  buildDepartureOptions,
  compareDepartureOptions,
  formatForecastTime,
  matchForecastSectionsToRoute,
  normalizeForecastSections,
  routeBoundingBox,
} from "./forecast.js";

const DIGITRAFFIC_API = "https://tie.digitraffic.fi";
const USER_HEADER = "AjokeliNyt/MVP 1.4";
const METADATA_PATH = "/api/weather/v1/forecast-sections-simple";
const FORECASTS_PATH = "/api/weather/v1/forecast-sections-simple/forecasts";
const ROUTE_SOURCE_ID = "route-feature-line";
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
  matchedSections: [],
  departureOptions: [],
  comparison: null,
  selectedTime: null,
  lastRouteSignature: null,
  loading: false,
  syncTimer: null,
  popup: null,
  cache: new Map(),
};

injectStyles();
const elements = injectStatusElement();
enhanceLabels();
bindEvents();
initializeMap();

function injectStyles() {
  const style = document.createElement("style");
  style.dataset.feature = "route-weather-forecast";
  style.textContent = `
    .forecast-data-status {
      margin: 10px 0 0;
      padding: 9px 10px;
      border: 1px solid rgba(98, 168, 255, 0.32);
      border-radius: 10px;
      color: #b9d9ff;
      background: rgba(98, 168, 255, 0.08);
      line-height: 1.45;
    }

    .forecast-summary-section {
      padding-top: 13px;
      border-top: 1px solid var(--border);
    }

    .forecast-summary-heading,
    .forecast-control-row,
    .forecast-counts,
    .forecast-item-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .forecast-summary-heading {
      align-items: flex-start;
    }

    .forecast-summary-heading h3 {
      margin-bottom: 3px;
    }

    .forecast-summary-badge {
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

    .forecast-control-row {
      margin-top: 10px;
      align-items: flex-end;
    }

    .forecast-control-row label {
      flex: 1 1 auto;
      font-size: 0.76rem;
      font-weight: 750;
    }

    .forecast-select {
      width: 100%;
      min-height: 42px;
      margin-top: 5px;
      padding: 8px 10px;
      border: 1px solid var(--border);
      border-radius: 9px;
      color: var(--text);
      background: var(--bg);
      font: inherit;
    }

    .forecast-comparison {
      margin-top: 10px;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 7px;
    }

    .forecast-option {
      min-width: 0;
      padding: 8px;
      border: 1px solid var(--border);
      border-radius: 9px;
      color: var(--text);
      background: rgba(0, 0, 0, 0.1);
      text-align: left;
    }

    .forecast-option:hover,
    .forecast-option:focus-visible,
    .forecast-option.is-selected {
      border-color: rgba(98, 168, 255, 0.65);
      background: rgba(98, 168, 255, 0.1);
    }

    .forecast-option strong,
    .forecast-option span {
      display: block;
    }

    .forecast-option strong {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.72rem;
    }

    .forecast-option span {
      margin-top: 3px;
      color: var(--muted);
      font-size: 0.65rem;
    }

    .forecast-recommendation {
      margin: 10px 0 0;
      padding: 9px 10px;
      border-left: 3px solid var(--accent);
      border-radius: 0 8px 8px 0;
      color: #d7e9ff;
      background: rgba(98, 168, 255, 0.07);
      font-size: 0.72rem;
      line-height: 1.45;
    }

    .forecast-counts {
      margin: 10px 0;
      align-items: stretch;
    }

    .forecast-count-card {
      flex: 1 1 0;
      min-width: 0;
      padding: 7px 4px;
      border: 1px solid var(--border);
      border-radius: 9px;
      background: rgba(0, 0, 0, 0.1);
      text-align: center;
    }

    .forecast-count-card strong,
    .forecast-count-card span {
      display: block;
    }

    .forecast-count-card strong {
      font-size: 0.95rem;
    }

    .forecast-count-card span {
      margin-top: 2px;
      color: var(--muted);
      font-size: 0.6rem;
    }

    .forecast-highlight-list {
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: 11px;
      background: rgba(0, 0, 0, 0.1);
    }

    .forecast-highlight-button {
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

    .forecast-highlight-button:last-child {
      border-bottom: 0;
    }

    .forecast-highlight-button:hover,
    .forecast-highlight-button:focus-visible {
      background: var(--surface-2);
    }

    .forecast-item-header strong {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.78rem;
    }

    .forecast-item-level {
      flex: 0 0 auto;
      font-size: 0.65rem;
      font-weight: 800;
    }

    .forecast-item-description,
    .forecast-item-meta,
    .forecast-summary-note {
      display: block;
      color: var(--muted);
      line-height: 1.4;
    }

    .forecast-item-description {
      margin-top: 5px;
      font-size: 0.7rem;
    }

    .forecast-item-meta {
      margin-top: 4px;
      font-size: 0.65rem;
    }

    .forecast-summary-note {
      margin: 9px 0 0;
      font-size: 0.68rem;
    }

    .forecast-map-legend {
      width: 18px;
      height: 5px;
      display: inline-block;
      border-radius: 999px;
      background: linear-gradient(90deg, #35c789, #ff8a4c, #ff4d6d);
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.82);
    }

    .forecast-popup {
      min-width: min(270px, 70vw);
      max-width: 340px;
    }

    .forecast-popup h3 {
      margin-bottom: 5px;
      font-size: 0.95rem;
    }

    .forecast-popup p {
      margin: 5px 0 0;
      font-size: 0.76rem;
      line-height: 1.4;
    }

    .forecast-popup-meta {
      color: var(--muted);
    }

    @media (max-width: 420px) {
      .forecast-comparison {
        grid-template-columns: 1fr;
      }

      .forecast-counts {
        gap: 5px;
      }
    }
  `;
  document.head.append(style);
}

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
  const middle = coordinates[Math.floor(coordinates.length / 2)];
  const last = coordinates[coordinates.length - 1];

  return [
    coordinates.length,
    first.map((value) => Number(value).toFixed(4)).join(","),
    middle.map((value) => Number(value).toFixed(4)).join(","),
    last.map((value) => Number(value).toFixed(4)).join(","),
  ].join(":");
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
    fetchDigitraffic(`${METADATA_PATH}?${parameters}`),
    fetchDigitraffic(`${FORECASTS_PATH}?${parameters}`),
  ]);

  const sections = normalizeForecastSections(metadata, forecasts);
  state.cache.set(key, { sections, loadedAt: Date.now() });
  return sections;
}

function scheduleSynchronization() {
  window.clearTimeout(state.syncTimer);
  state.syncTimer = window.setTimeout(() => synchronizeWithRoute(), 100);
}

async function synchronizeWithRoute(force = false) {
  const coordinates = routeCoordinates();
  const signature = routeSignature(coordinates);
  const existingSection = document.querySelector("#forecast-summary-section");

  if (!coordinates || state.routeSummary.classList.contains("hidden")) {
    resetForecast();
    return;
  }

  if (
    !force &&
    signature === state.lastRouteSignature &&
    state.matchedSections.length &&
    state.departureOptions.length
  ) {
    if (!existingSection) renderForecastSummary();
    return;
  }

  if (state.loading) return;
  state.loading = true;
  state.lastRouteSignature = signature;
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
      <span class="forecast-summary-badge">Ladataan…</span>
    </div>
  `;
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
  state.lastRouteSignature = null;
  state.popup?.remove();
  state.popup = null;
  document.querySelector("#forecast-summary-section")?.remove();
  hideStatus();
  renderMapForecast();
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function bindEvents() {
  const observer = new MutationObserver(scheduleSynchronization);
  observer.observe(state.routeSummary, {
    attributes: true,
    attributeFilter: ["class"],
    childList: true,
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
