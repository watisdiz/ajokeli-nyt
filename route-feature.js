import {
  buildStationView,
  formatNumber,
  haversineKm,
  relativeAge,
} from "./risk.js";
import { demoCameras, demoMeasurements, demoMetadata } from "./demo-data.js";
import {
  ROUTE_CORRIDOR_KM,
  analyzeRouteStations,
  formatRouteDistance,
  formatRouteDuration,
} from "./route.js";

const NOMINATIM_API = "https://nominatim.openstreetmap.org/search";
const OSRM_API = "https://router.project-osrm.org/route/v1/driving";
const DIGITRAFFIC_API = "https://tie.digitraffic.fi";
const ROUTE_SOURCE_ID = "route-feature-line";
const ROUTE_CASING_LAYER_ID = "route-feature-casing";
const ROUTE_LAYER_ID = "route-feature-route";
const ROUTE_STATIONS_SOURCE_ID = "route-feature-stations";
const ROUTE_STATIONS_LAYER_ID = "route-feature-station-points";
const CORE_STATIONS_LAYER_ID = "weather-station-points";
const USER_HEADER = "AjokeliNyt/MVP 1.2";
const demoMode = new URLSearchParams(window.location.search).get("demo") === "1";

const state = {
  map: window.__ajokeliMap ?? null,
  places: { from: null, to: null },
  results: { from: [], to: [] },
  route: null,
  analysis: null,
  markers: [],
  routeLoading: false,
  observations: null,
  observationsLoadedAt: 0,
};

const geocodeCache = new Map();
let geocodeQueue = Promise.resolve();
let lastGeocodeAt = 0;

injectRouteStyles();
const elements = injectRoutePanel();
enhanceExistingLabels();
bindRouteEvents();
initializeMapFeature();

function injectRouteStyles() {
  const style = document.createElement("style");
  style.dataset.feature = "route-search";
  style.textContent = `
    .route-panel {
      background:
        radial-gradient(circle at top right, rgba(37, 99, 235, 0.16), transparent 43%),
        rgba(255, 255, 255, 0.025);
    }

    .route-heading-row,
    .route-summary-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
    }

    .route-heading-row h2 {
      margin-bottom: 0;
    }

    .route-beta {
      padding: 3px 7px;
      border: 1px solid rgba(98, 168, 255, 0.35);
      border-radius: 999px;
      color: var(--accent);
      background: rgba(98, 168, 255, 0.09);
      font-size: 0.68rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    .route-field {
      position: relative;
      margin-top: 13px;
    }

    .route-input-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 7px;
    }

    .route-input-row .button {
      min-width: 58px;
      padding-inline: 10px;
    }

    .route-selected {
      border-color: rgba(53, 199, 137, 0.72) !important;
      box-shadow: 0 0 0 3px rgba(53, 199, 137, 0.1) !important;
    }

    .route-swap {
      display: block;
      margin: 10px auto -3px;
    }

    .route-actions {
      margin-top: 14px;
      display: grid;
      gap: 8px;
    }

    .route-primary {
      background: #2563eb;
      border: 1px solid rgba(255, 255, 255, 0.16);
    }

    .route-status {
      margin: 10px 0 0;
      line-height: 1.45;
    }

    .route-status.route-error {
      color: #ff9aaf;
    }

    .route-status.route-success {
      color: #7ce2b6;
    }

    .route-place-results {
      margin-top: 8px;
      max-height: 250px;
      overflow-y: auto;
      border: 1px solid var(--border);
      border-radius: 11px;
      background: var(--bg);
      box-shadow: var(--shadow);
    }

    .route-place-result,
    .route-station-button,
    .route-highlight-button {
      width: 100%;
      min-height: 48px;
      padding: 9px 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      border: 0;
      border-bottom: 1px solid var(--border);
      color: var(--text);
      background: transparent;
      text-align: left;
    }

    .route-place-result:last-child,
    .route-station-button:last-child,
    .route-highlight-button:last-child {
      border-bottom: 0;
    }

    .route-place-result:hover,
    .route-place-result:focus-visible,
    .route-station-button:hover,
    .route-station-button:focus-visible,
    .route-highlight-button:hover,
    .route-highlight-button:focus-visible {
      background: var(--surface-2);
    }

    .route-place-result strong,
    .route-place-result span {
      display: block;
    }

    .route-place-result span {
      margin-top: 3px;
      color: var(--muted);
      font-size: 0.7rem;
      line-height: 1.35;
    }

    .route-no-results {
      margin: 0;
      padding: 12px;
      color: var(--muted);
      font-size: 0.8rem;
      line-height: 1.45;
    }

    .route-summary {
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px solid var(--border);
    }

    .route-summary-header h3 {
      margin-bottom: 4px;
      font-size: 1.05rem;
    }

    .route-summary-meta {
      margin-bottom: 0;
      color: var(--muted);
      font-size: 0.78rem;
    }

    .route-worst {
      padding: 7px 9px;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      border: 1px solid var(--border);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.035);
      font-size: 0.72rem;
      font-weight: 800;
      white-space: nowrap;
    }

    .route-summary-section {
      margin-top: 14px;
    }

    .route-summary-section h3 {
      margin-bottom: 8px;
    }

    .route-highlight-list,
    .route-station-list {
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: 11px;
      background: rgba(0, 0, 0, 0.1);
    }

    .route-highlight-button {
      display: block;
      min-height: 0;
    }

    .route-highlight-button strong,
    .route-highlight-button span {
      display: block;
    }

    .route-highlight-button span {
      margin-top: 3px;
      color: var(--muted);
      font-size: 0.72rem;
      line-height: 1.35;
    }

    .route-station-main {
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .route-station-main span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .route-station-meta {
      color: var(--muted);
      font-size: 0.7rem;
      white-space: nowrap;
    }

    .route-disclaimer {
      margin: 12px 0 0;
      color: var(--muted);
      font-size: 0.72rem;
      line-height: 1.45;
    }

    .route-map-legend {
      width: 18px;
      height: 4px;
      display: inline-block;
      border-radius: 999px;
      background: #2563eb;
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.82);
    }

    @media (min-width: 1181px) {
      .main-layout {
        grid-template-columns: 310px minmax(0, 1fr) 340px;
      }
    }

    @media (max-width: 420px) {
      .route-input-row {
        grid-template-columns: minmax(0, 1fr) 54px;
      }

      .route-input-row .button {
        min-width: 54px;
        padding-inline: 7px;
      }
    }
  `;
  document.head.append(style);
}

function injectRoutePanel() {
  const sidebar = document.querySelector("#filter-sidebar");
  const firstPanel = sidebar?.querySelector(".panel");

  if (!sidebar || !firstPanel) {
    throw new Error("Reittipaneelia ei voitu lisätä käyttöliittymään.");
  }

  const panel = document.createElement("section");
  panel.className = "panel route-panel";
  panel.setAttribute("aria-labelledby", "route-heading");
  panel.innerHTML = `
    <div class="route-heading-row">
      <h2 id="route-heading">Reitin ajokeli</h2>
      <span class="route-beta">Beta</span>
    </div>

    <form id="route-form" novalidate>
      <div class="route-field">
        <label class="search-label" for="route-from-input">Lähtöpaikka</label>
        <div class="route-input-row">
          <input
            id="route-from-input"
            class="search-input"
            type="search"
            autocomplete="off"
            placeholder="Esim. Vantaa"
            aria-controls="route-from-results"
            aria-expanded="false"
          />
          <button id="route-from-search" class="button button-secondary" type="button">
            Hae
          </button>
        </div>
        <div
          id="route-from-results"
          class="route-place-results hidden"
          role="listbox"
          aria-label="Lähtöpaikan hakutulokset"
        ></div>
      </div>

      <button
        id="route-swap-button"
        class="text-button route-swap"
        type="button"
        aria-label="Vaihda lähtöpaikka ja määränpää"
      >
        ⇅ Vaihda paikat
      </button>

      <div class="route-field">
        <label class="search-label" for="route-to-input">Määränpää</label>
        <div class="route-input-row">
          <input
            id="route-to-input"
            class="search-input"
            type="search"
            autocomplete="off"
            placeholder="Esim. Tampere"
            aria-controls="route-to-results"
            aria-expanded="false"
          />
          <button id="route-to-search" class="button button-secondary" type="button">
            Hae
          </button>
        </div>
        <div
          id="route-to-results"
          class="route-place-results hidden"
          role="listbox"
          aria-label="Määränpään hakutulokset"
        ></div>
      </div>

      <div class="route-actions">
        <button
          id="route-submit-button"
          class="button route-primary"
          type="submit"
          disabled
        >
          Näytä reitin ajokeli
        </button>
        <button
          id="route-clear-button"
          class="button button-secondary hidden"
          type="button"
        >
          Poista reitti
        </button>
      </div>

      <p id="route-status" class="muted small route-status" aria-live="polite">
        Hae ja valitse molemmat paikat. Haku käynnistyy vain Hae-painikkeesta.
      </p>
    </form>

    <div id="route-summary" class="route-summary hidden" aria-live="polite"></div>
  `;

  sidebar.insertBefore(panel, firstPanel);

  return {
    panel,
    form: panel.querySelector("#route-form"),
    fromInput: panel.querySelector("#route-from-input"),
    toInput: panel.querySelector("#route-to-input"),
    fromSearch: panel.querySelector("#route-from-search"),
    toSearch: panel.querySelector("#route-to-search"),
    fromResults: panel.querySelector("#route-from-results"),
    toResults: panel.querySelector("#route-to-results"),
    swapButton: panel.querySelector("#route-swap-button"),
    submitButton: panel.querySelector("#route-submit-button"),
    clearButton: panel.querySelector("#route-clear-button"),
    status: panel.querySelector("#route-status"),
    summary: panel.querySelector("#route-summary"),
    detailsPanel: document.querySelector("#details-panel"),
  };
}

function enhanceExistingLabels() {
  const mobileButton = document.querySelector("#mobile-filter-button");
  if (mobileButton) {
    mobileButton.innerHTML = `<span aria-hidden="true">☰</span> Reitti ja suodattimet`;
  }

  const sidebarHeading = document.querySelector(".sidebar-header h2");
  if (sidebarHeading) sidebarHeading.textContent = "Reitti ja suodattimet";

  const legend = document.querySelector(".map-legend");
  if (legend) {
    const routeLegend = document.createElement("span");
    routeLegend.innerHTML = `<i class="route-map-legend" aria-hidden="true"></i> Reitti`;
    legend.prepend(routeLegend);
  }

  const footerText = document.querySelector(".footer p");
  if (footerText) {
    footerText.textContent =
      "Tiesää: Fintraffic / Digitraffic, CC BY 4.0. Kartta ja paikkahaku: OpenStreetMap, OpenFreeMap ja Nominatim. Reititys: OSRM. Tarkista viralliset liikenne- ja kelivaroitukset ennen ajoa.";
  }
}

function initializeMapFeature() {
  if (!state.map) {
    setStatus("Karttayhteyttä ei saatu. Lataa sivu uudelleen.", "error");
    return;
  }

  if (state.map.loaded()) {
    addRouteLayers();
  } else {
    state.map.once("load", addRouteLayers);
  }
}

function addRouteLayers() {
  if (!state.map || state.map.getSource(ROUTE_SOURCE_ID)) return;

  state.map.addSource(ROUTE_SOURCE_ID, {
    type: "geojson",
    data: emptyFeatureCollection(),
  });

  state.map.addLayer({
    id: ROUTE_CASING_LAYER_ID,
    type: "line",
    source: ROUTE_SOURCE_ID,
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "rgba(255,255,255,0.95)",
      "line-width": ["interpolate", ["linear"], ["zoom"], 4, 5, 10, 8, 14, 12],
      "line-opacity": 0.95,
    },
  });

  state.map.addLayer({
    id: ROUTE_LAYER_ID,
    type: "line",
    source: ROUTE_SOURCE_ID,
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#2563eb",
      "line-width": ["interpolate", ["linear"], ["zoom"], 4, 3, 10, 5, 14, 8],
      "line-opacity": 0.95,
    },
  });

  state.map.addSource(ROUTE_STATIONS_SOURCE_ID, {
    type: "geojson",
    data: emptyFeatureCollection(),
  });

  state.map.addLayer({
    id: ROUTE_STATIONS_LAYER_ID,
    type: "circle",
    source: ROUTE_STATIONS_SOURCE_ID,
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 7, 8, 10, 13, 14],
      "circle-color": ["get", "color"],
      "circle-stroke-width": 3,
      "circle-stroke-color": "#2563eb",
      "circle-opacity": 0.96,
    },
  });

  state.map.on("mouseenter", ROUTE_STATIONS_LAYER_ID, () => {
    state.map.getCanvas().style.cursor = "pointer";
  });

  state.map.on("mouseleave", ROUTE_STATIONS_LAYER_ID, () => {
    state.map.getCanvas().style.cursor = "";
  });

  state.map.on("click", ROUTE_STATIONS_LAYER_ID, (event) => {
    const stationId = Number(event.features?.[0]?.properties?.stationId);
    if (stationId) showStation(stationId, true);
  });

  renderMapRoute(Boolean(state.route));
}

function emptyFeatureCollection() {
  return { type: "FeatureCollection", features: [] };
}

function normalizeQuery(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function compactLabel(result) {
  return String(result.display_name ?? result.name ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");
}

function placeContext(result) {
  return String(result.display_name ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(1, 5)
    .join(", ");
}

async function waitForGeocodeSlot() {
  const elapsed = Date.now() - lastGeocodeAt;
  const waitMs = Math.max(0, 1_050 - elapsed);
  if (waitMs) await new Promise((resolve) => window.setTimeout(resolve, waitMs));
  lastGeocodeAt = Date.now();
}

function queueGeocode(task) {
  const run = geocodeQueue.then(async () => {
    await waitForGeocodeSlot();
    return task();
  });
  geocodeQueue = run.catch(() => undefined);
  return run;
}

async function geocode(query) {
  const normalized = normalizeQuery(query);
  const cacheKey = normalized.toLocaleLowerCase("fi-FI");
  if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey);

  return queueGeocode(async () => {
    const parameters = new URLSearchParams({
      q: normalized,
      format: "jsonv2",
      addressdetails: "1",
      countrycodes: "fi",
      limit: "5",
      "accept-language": "fi",
    });

    const response = await fetch(`${NOMINATIM_API}?${parameters}`, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "fi",
      },
    });

    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

    const results = (await response.json())
      .map((item) => ({
        lat: Number(item.lat),
        lon: Number(item.lon),
        label: compactLabel(item),
        context: placeContext(item),
        displayName: item.display_name,
      }))
      .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lon));

    geocodeCache.set(cacheKey, results);
    return results;
  });
}

function kindElements(kind) {
  return kind === "from"
    ? {
        input: elements.fromInput,
        searchButton: elements.fromSearch,
        results: elements.fromResults,
      }
    : {
        input: elements.toInput,
        searchButton: elements.toSearch,
        results: elements.toResults,
      };
}

function setStatus(message, type = "") {
  elements.status.className = `muted small route-status${type ? ` route-${type}` : ""}`;
  elements.status.textContent = message;
}

function hideResults(kind) {
  const { input, results } = kindElements(kind);
  results.classList.add("hidden");
  results.innerHTML = "";
  input.setAttribute("aria-expanded", "false");
}

function renderResults(kind) {
  const { input, results } = kindElements(kind);
  const matches = state.results[kind];

  results.classList.remove("hidden");
  input.setAttribute("aria-expanded", "true");

  if (!matches.length) {
    results.innerHTML = `<p class="route-no-results">Paikkaa ei löytynyt Suomesta.</p>`;
    return;
  }

  results.innerHTML = matches
    .map(
      (place, index) => `
        <button
          class="route-place-result"
          type="button"
          role="option"
          data-place-kind="${kind}"
          data-place-index="${index}"
        >
          <span>
            <strong>${escapeHtml(place.label || place.displayName)}</strong>
            <span>${escapeHtml(place.context || place.displayName)}</span>
          </span>
        </button>
      `,
    )
    .join("");
}

function clearPlace(kind) {
  state.places[kind] = null;
  kindElements(kind).input.classList.remove("route-selected");
  updateSubmit();
}

function choosePlace(kind, index) {
  const place = state.results[kind]?.[index];
  if (!place) return;

  state.places[kind] = place;
  const { input } = kindElements(kind);
  input.value = place.label || place.displayName;
  input.classList.add("route-selected");
  hideResults(kind);
  updateSubmit();

  const label = kind === "from" ? "Lähtöpaikka" : "Määränpää";
  setStatus(`${label} valittu: ${place.label}.`, "success");
}

async function searchPlace(kind) {
  const { input, searchButton } = kindElements(kind);
  const query = normalizeQuery(input.value);

  if (query.length < 2) {
    setStatus("Kirjoita vähintään kaksi merkkiä ennen hakua.", "error");
    input.focus();
    return;
  }

  clearPlace(kind);
  hideResults(kind);
  const originalText = searchButton.textContent;
  searchButton.disabled = true;
  searchButton.textContent = "Haetaan…";
  setStatus(`Haetaan paikkaa “${query}”…`);

  try {
    state.results[kind] = await geocode(query);
    renderResults(kind);
    setStatus(
      state.results[kind].length
        ? "Valitse oikea paikka hakutuloksista."
        : "Paikkaa ei löytynyt Suomesta.",
      state.results[kind].length ? "" : "error",
    );
  } catch (error) {
    console.error(error);
    setStatus(
      `Paikkahaku epäonnistui (${error.message}). Yritä hetken kuluttua uudelleen.`,
      "error",
    );
  } finally {
    searchButton.disabled = false;
    searchButton.textContent = originalText;
  }
}

function updateSubmit() {
  elements.submitButton.disabled =
    state.routeLoading || !state.places.from || !state.places.to;
}

function swapPlaces() {
  const previousFrom = state.places.from;
  state.places.from = state.places.to;
  state.places.to = previousFrom;

  const fromValue = elements.fromInput.value;
  elements.fromInput.value = elements.toInput.value;
  elements.toInput.value = fromValue;

  elements.fromInput.classList.toggle("route-selected", Boolean(state.places.from));
  elements.toInput.classList.toggle("route-selected", Boolean(state.places.to));
  state.results.from = [];
  state.results.to = [];
  hideResults("from");
  hideResults("to");
  updateSubmit();
  setStatus("Lähtöpaikka ja määränpää vaihdettiin.");
}

async function fetchRoute(from, to) {
  const coordinates = `${from.lon},${from.lat};${to.lon},${to.lat}`;
  const parameters = new URLSearchParams({
    overview: "full",
    geometries: "geojson",
    steps: "false",
    alternatives: "false",
  });

  const response = await fetch(`${OSRM_API}/${coordinates}?${parameters}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

  const payload = await response.json();
  if (payload.code !== "Ok" || !payload.routes?.length) {
    throw new Error(payload.message || "Ajoreittiä ei löytynyt");
  }

  return {
    from,
    to,
    distance: payload.routes[0].distance,
    duration: payload.routes[0].duration,
    geometry: payload.routes[0].geometry,
  };
}

async function digitrafficJson(path) {
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

async function loadObservations() {
  const age = Date.now() - state.observationsLoadedAt;
  if (state.observations && age < 60_000) return state.observations;

  const payload = demoMode
    ? {
        metadata: demoMetadata,
        measurements: demoMeasurements,
        cameras: demoCameras,
      }
    : await (async () => {
        const [metadata, measurements, cameras] = await Promise.all([
          digitrafficJson("/api/weather/v1/stations"),
          digitrafficJson("/api/weather/v1/stations/data"),
          digitrafficJson("/api/weathercam/v1/stations").catch(() => emptyFeatureCollection()),
        ]);
        return { metadata, measurements, cameras };
      })();

  const measurementsById = new Map(
    (payload.measurements.stations ?? []).map((station) => [Number(station.id), station]),
  );

  const now = new Date();
  const stations = (payload.metadata.features ?? [])
    .filter((feature) => feature.properties?.collectionStatus === "GATHERING")
    .map((feature) => buildStationView(feature, measurementsById.get(Number(feature.id)), now));

  const cameras = (payload.cameras.features ?? []).filter(
    (feature) =>
      feature.properties?.collectionStatus === "GATHERING" &&
      feature.properties?.presets?.some((preset) => preset.inCollection),
  );

  state.observations = { stations, cameras };
  state.observationsLoadedAt = Date.now();
  return state.observations;
}

async function buildRoute(event) {
  event.preventDefault();

  if (!state.places.from || !state.places.to || state.routeLoading) {
    setStatus("Hae ja valitse ensin sekä lähtöpaikka että määränpää.", "error");
    return;
  }

  state.routeLoading = true;
  updateSubmit();
  elements.fromSearch.disabled = true;
  elements.toSearch.disabled = true;
  elements.submitButton.textContent = "Lasketaan reittiä…";
  hideResults("from");
  hideResults("to");
  setStatus("Lasketaan ajoreittiä ja yhdistetään tiesäähavaintoihin…");

  try {
    const [route, observations] = await Promise.all([
      fetchRoute(state.places.from, state.places.to),
      loadObservations(),
    ]);

    state.route = route;
    state.analysis = analyzeRouteStations(
      observations.stations,
      route.geometry.coordinates,
      ROUTE_CORRIDOR_KM,
    );

    renderMapRoute(true);
    renderSummary();
    elements.clearButton.classList.remove("hidden");
    setStatus(
      `Reitti valmis. ${state.analysis.nearbyStations.length} tiesääasemaa enintään ${ROUTE_CORRIDOR_KM} km reitiltä.`,
      "success",
    );

    window.setTimeout(() => {
      elements.summary.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  } catch (error) {
    console.error(error);
    setStatus(
      `Reitin laskenta epäonnistui (${error.message}). Tarkista paikat ja yritä uudelleen.`,
      "error",
    );
  } finally {
    state.routeLoading = false;
    elements.fromSearch.disabled = false;
    elements.toSearch.disabled = false;
    elements.submitButton.textContent = "Näytä reitin ajokeli";
    updateSubmit();
  }
}

function renderMapRoute(fit = false) {
  if (!state.map?.getSource(ROUTE_SOURCE_ID)) return;

  state.map.getSource(ROUTE_SOURCE_ID).setData({
    type: "FeatureCollection",
    features: state.route
      ? [{ type: "Feature", properties: {}, geometry: state.route.geometry }]
      : [],
  });

  state.map.getSource(ROUTE_STATIONS_SOURCE_ID).setData({
    type: "FeatureCollection",
    features: state.analysis
      ? state.analysis.nearbyStations.map(({ station }) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: station.coordinates,
          },
          properties: {
            stationId: station.id,
            color: station.level.color,
            label: station.level.label,
          },
        }))
      : [],
  });

  state.markers.forEach((marker) => marker.remove());
  state.markers = [];

  setCoreStationsVisible(!state.route);

  if (!state.route) return;

  state.markers = [
    new maplibregl.Marker({ color: "#2563eb" })
      .setLngLat([state.route.from.lon, state.route.from.lat])
      .setPopup(new maplibregl.Popup().setText(`Lähtö: ${state.route.from.label}`))
      .addTo(state.map),
    new maplibregl.Marker({ color: "#111827" })
      .setLngLat([state.route.to.lon, state.route.to.lat])
      .setPopup(new maplibregl.Popup().setText(`Määränpää: ${state.route.to.label}`))
      .addTo(state.map),
  ];

  if (fit) fitRoute();
}

function setCoreStationsVisible(visible) {
  if (!state.map?.getLayer(CORE_STATIONS_LAYER_ID)) return;
  state.map.setLayoutProperty(
    CORE_STATIONS_LAYER_ID,
    "visibility",
    visible ? "visible" : "none",
  );
}

function fitRoute() {
  const coordinates = state.route?.geometry?.coordinates;
  if (!coordinates?.length) return;

  const bounds = coordinates.reduce(
    (current, coordinate) => current.extend(coordinate),
    new maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
  );

  const mobile = window.innerWidth <= 760;
  const wide = window.innerWidth > 1120;
  state.map.fitBounds(bounds, {
    padding: mobile
      ? { top: 80, right: 40, bottom: 100, left: 40 }
      : {
          top: 50,
          right: wide ? 370 : 50,
          bottom: 50,
          left: wide ? 335 : 285,
        },
    duration: 900,
    maxZoom: 12,
  });
}

function renderSummary() {
  if (!state.route || !state.analysis) {
    elements.summary.classList.add("hidden");
    elements.summary.innerHTML = "";
    return;
  }

  const worst = state.analysis.worstLevel;
  const stationRows = state.analysis.nearbyStations.slice(0, 10);
  const remaining = Math.max(0, state.analysis.nearbyStations.length - stationRows.length);

  elements.summary.innerHTML = `
    <div class="route-summary-header">
      <div>
        <p class="eyebrow">Havaittu kelitilanne</p>
        <h3>${escapeHtml(state.route.from.label)} → ${escapeHtml(state.route.to.label)}</h3>
        <p class="route-summary-meta">
          ${formatRouteDistance(state.route.distance)} · noin ${formatRouteDuration(state.route.duration)}
        </p>
      </div>
      ${
        worst
          ? `<span class="route-worst">
               <i class="risk-dot risk-${worst.key}" aria-hidden="true"></i>
               ${escapeHtml(worst.label)}
             </span>`
          : `<span class="route-worst">Ei asemia</span>`
      }
    </div>

    <section class="route-summary-section">
      <h3>Merkittävimmät havainnot</h3>
      ${
        state.analysis.highlights.length
          ? `<div class="route-highlight-list">
              ${state.analysis.highlights
                .map(
                  (item) => `
                    <button
                      class="route-highlight-button"
                      type="button"
                      data-route-station="${item.stationId}"
                    >
                      <strong>
                        <i class="risk-dot risk-${item.level.key}" aria-hidden="true"></i>
                        ${escapeHtml(item.stationName)}
                      </strong>
                      <span>${escapeHtml(item.reason)}</span>
                    </button>
                  `,
                )
                .join("")}
             </div>`
          : `<p class="muted small">Merkittäviä kelitekijöitä ei tunnistettu.</p>`
      }
    </section>

    <section class="route-summary-section">
      <h3>Asemat matkan varrella (${state.analysis.nearbyStations.length})</h3>
      ${
        stationRows.length
          ? `<div class="route-station-list">
              ${stationRows
                .map(
                  ({ station, distanceFromRouteKm }) => `
                    <button
                      class="route-station-button"
                      type="button"
                      data-route-station="${station.id}"
                    >
                      <span class="route-station-main">
                        <i class="legend-dot risk-${station.level.key}" aria-hidden="true"></i>
                        <span>${escapeHtml(station.name)}</span>
                      </span>
                      <span class="route-station-meta">
                        ${escapeHtml(station.level.label)} · ${formatNumber(distanceFromRouteKm)} km
                      </span>
                    </button>
                  `,
                )
                .join("")}
             </div>
             ${
               remaining
                 ? `<p class="muted small">${remaining} muuta asemaa näkyy kartalla.</p>`
                 : ""
             }`
          : `<p class="muted small">Reitin läheltä ei löytynyt aktiivisia tiesääasemia.</p>`
      }
    </section>

    <p class="route-disclaimer">
      Yhteenveto perustuu yksittäisiin havaintoasemiin enintään
      ${state.analysis.corridorKm} km etäisyydellä reitistä. Se ei ole ennuste,
      navigointiohje tai virallinen varoitus.
    </p>
  `;

  elements.summary.classList.remove("hidden");
}

function clearRoute() {
  state.route = null;
  state.analysis = null;
  state.markers.forEach((marker) => marker.remove());
  state.markers = [];
  elements.summary.classList.add("hidden");
  elements.summary.innerHTML = "";
  elements.clearButton.classList.add("hidden");
  setStatus("Reitti poistettu. Valitut paikat säilyvät uutta hakua varten.");

  renderMapRoute(false);
  state.map?.easeTo({ center: [25.2, 64.4], zoom: 4.35, duration: 650 });
}

function findStation(stationId) {
  return state.observations?.stations.find((station) => station.id === stationId) ?? null;
}

function showStation(stationId, flyTo = false) {
  const station = findStation(stationId);
  if (!station || !elements.detailsPanel) return;

  if (flyTo) {
    state.map?.easeTo({
      center: station.coordinates,
      zoom: Math.max(state.map.getZoom(), 8),
      duration: 700,
    });
  }

  const camera = nearestCamera(station.coordinates);
  const metrics = station.metrics;
  const score = station.score === null ? "Ei laskettu" : `${station.score} pistettä`;

  elements.detailsPanel.classList.add("has-content");
  elements.detailsPanel.innerHTML = `
    <div class="detail-header">
      <div>
        <p class="eyebrow">Reitin tiesääasema</p>
        <h2>${escapeHtml(station.name)}</h2>
        <p class="muted small">Havainto ${relativeAge(station.latestTime)}</p>
      </div>
      <div class="detail-header-actions">
        <span class="risk-badge">
          <i class="risk-dot risk-${station.level.key}" aria-hidden="true"></i>
          ${escapeHtml(station.level.label)}
        </span>
        <button
          id="close-details-button"
          class="icon-button detail-close-button"
          type="button"
          aria-label="Sulje aseman tiedot"
        >
          ×
        </button>
      </div>
    </div>

    <section class="detail-section">
      <div class="panel-heading-row">
        <h3>Luokitus</h3>
        <strong>${score}</strong>
      </div>
      <ul class="reason-list">
        ${station.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}
      </ul>
    </section>

    <section class="detail-section">
      <h3>Mittaukset</h3>
      <div class="metrics">
        ${metricRow("Tienpinta", metrics.surface || "–")}
        ${metricRow("Tienpinnan lämpötila", formatMetric(metrics.roadTemperature, "°C"))}
        ${metricRow("Ilman lämpötila", formatMetric(metrics.airTemperature, "°C"))}
        ${metricRow("Sade", metrics.precipitation || "–")}
        ${metricRow("Näkyvyys", formatMetric(metrics.visibility, "km"))}
        ${metricRow("Tuulen maksimi", formatMetric(metrics.maxWind, "m/s"))}
      </div>
    </section>

    ${camera ? renderCamera(camera) : ""}

    <section class="detail-section">
      <p class="muted small">
        Luokitus kuvaa yksittäisen aseman lähiympäristöä eikä koko reitin olosuhteita.
      </p>
    </section>
  `;
}

function nearestCamera(coordinates) {
  let nearest = null;

  for (const feature of state.observations?.cameras ?? []) {
    const distanceKm = haversineKm(coordinates, feature.geometry.coordinates);
    if (distanceKm > 25) continue;

    const preset = feature.properties.presets.find((item) => item.inCollection);
    if (!preset) continue;

    if (!nearest || distanceKm < nearest.distanceKm) {
      nearest = {
        name: feature.properties.name || feature.properties.id,
        presetId: preset.id,
        distanceKm,
      };
    }
  }

  return nearest;
}

function renderCamera(camera) {
  const imageUrl = `https://weathercam.digitraffic.fi/${encodeURIComponent(camera.presetId)}.jpg?thumbnail=true`;

  return `
    <section class="detail-section">
      <div class="camera-heading">
        <h3>Lähin kelikamera</h3>
        <span class="muted small">${formatNumber(camera.distanceKm)} km</span>
      </div>
      <div class="camera-card">
        <img
          src="${imageUrl}"
          alt="Kelikamerakuva: ${escapeHtml(camera.name)}"
          loading="lazy"
          onerror="this.closest('.camera-card').style.display='none'"
        />
        <div class="camera-card-body">
          <strong>${escapeHtml(camera.name)}</strong>
          <p class="muted small">Kuva päivittyy Digitrafficin kamerarytmin mukaisesti.</p>
        </div>
      </div>
    </section>
  `;
}

function metricRow(label, value) {
  return `<div class="metric-row"><span>${label}</span><strong>${value}</strong></div>`;
}

function formatMetric(value, unit) {
  return Number.isFinite(Number(value)) ? `${formatNumber(value)} ${unit}` : "–";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function bindRouteEvents() {
  elements.fromSearch.addEventListener("click", () => searchPlace("from"));
  elements.toSearch.addEventListener("click", () => searchPlace("to"));

  for (const kind of ["from", "to"]) {
    const { input, results } = kindElements(kind);

    input.addEventListener("input", () => {
      const selected = state.places[kind];
      if (selected && normalizeQuery(input.value) !== normalizeQuery(selected.label)) {
        clearPlace(kind);
      }
      hideResults(kind);
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        searchPlace(kind);
      } else if (event.key === "Escape") {
        hideResults(kind);
      }
    });

    results.addEventListener("click", (event) => {
      const button = event.target.closest("[data-place-index]");
      if (button) choosePlace(kind, Number(button.dataset.placeIndex));
    });
  }

  elements.swapButton.addEventListener("click", swapPlaces);
  elements.form.addEventListener("submit", buildRoute);
  elements.clearButton.addEventListener("click", clearRoute);

  elements.summary.addEventListener("click", (event) => {
    const button = event.target.closest("[data-route-station]");
    if (button) showStation(Number(button.dataset.routeStation), true);
  });

  document.addEventListener("click", (event) => {
    for (const kind of ["from", "to"]) {
      const { input, results } = kindElements(kind);
      if (!results.contains(event.target) && event.target !== input) hideResults(kind);
    }
  });
}
