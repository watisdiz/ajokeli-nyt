import {
  RADAR_BOUNDS,
  RADAR_REFRESH_MS,
  analyzeRouteRain,
  buildRadarGeoTiffUrl,
  buildRadarQueryUrl,
  formatRainIntensity,
  intensityFromRaw,
  latestRadarReference,
  radarImageCoordinates,
  rainColor,
  transformationFromXml,
} from "./radar.js";

const GEOTIFF_MODULE = "https://cdn.jsdelivr.net/npm/geotiff@2.1.3/+esm";
const RADAR_SOURCE_ID = "fmi-radar-image";
const RADAR_LAYER_ID = "fmi-radar-layer";
const ROUTE_SOURCE_ID = "route-feature-line";
const ROUTE_LAYER_ID = "route-feature-route";
const DEFAULT_OPACITY = 0.72;

const state = {
  map: window.__ajokeliMap ?? null,
  enabled: false,
  loading: false,
  opacity: DEFAULT_OPACITY,
  data: null,
  objectUrl: null,
  refreshTimer: null,
  routeSignature: null,
  routeAnalysis: null,
  renderTimer: null,
};

injectStyles();
const elements = injectControls();
bindEvents();
initializeMap();

function injectStyles() {
  const style = document.createElement("style");
  style.dataset.feature = "radar-layer";
  style.textContent = `
    .radar-controls {
      position: absolute;
      top: 14px;
      right: 14px;
      z-index: 8;
      width: min(250px, calc(100% - 28px));
      padding: 9px;
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 12px;
      background: rgba(11, 18, 32, 0.92);
      box-shadow: var(--shadow);
      backdrop-filter: blur(10px);
    }

    .radar-control-row,
    .radar-status-row,
    .radar-legend {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .radar-control-row {
      justify-content: space-between;
    }

    .radar-toggle {
      min-height: 40px;
      padding: 8px 11px;
    }

    .radar-toggle[aria-pressed="true"] {
      border-color: rgba(98, 168, 255, 0.72);
      color: #d9ebff;
      background: rgba(98, 168, 255, 0.18);
    }

    .radar-control-details {
      margin-top: 8px;
    }

    .radar-status-row {
      justify-content: space-between;
      color: var(--muted);
      font-size: 0.68rem;
      line-height: 1.35;
    }

    .radar-status-row strong {
      color: var(--text);
      text-align: right;
    }

    .radar-opacity-label {
      margin-top: 8px;
      display: grid;
      grid-template-columns: auto 1fr;
      align-items: center;
      gap: 8px;
      color: var(--muted);
      font-size: 0.68rem;
    }

    .radar-opacity-label input {
      width: 100%;
    }

    .radar-legend {
      margin-top: 8px;
      flex-wrap: wrap;
      gap: 5px 9px;
      color: var(--muted);
      font-size: 0.62rem;
    }

    .radar-legend span {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .radar-legend i {
      width: 14px;
      height: 6px;
      display: inline-block;
      border-radius: 999px;
    }

    .radar-light { background: rgb(78, 162, 255); }
    .radar-moderate { background: rgb(55, 79, 255); }
    .radar-heavy { background: rgb(218, 48, 255); }
    .radar-extreme { background: rgb(255, 74, 35); }

    .beta-status-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .radar-summary-section {
      padding-top: 13px;
      border-top: 1px solid var(--border);
    }

    .radar-summary-heading,
    .radar-summary-cards {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .radar-summary-heading h3 {
      margin: 0;
    }

    .radar-summary-badge {
      display: inline-flex;
      align-items: center;
      padding: 5px 8px;
      border: 1px solid var(--border);
      border-radius: 999px;
      font-size: 0.68rem;
      font-weight: 800;
      white-space: nowrap;
    }

    .radar-summary-cards {
      margin-top: 9px;
      align-items: stretch;
    }

    .radar-summary-card {
      flex: 1 1 0;
      min-width: 0;
      padding: 8px;
      border: 1px solid var(--border);
      border-radius: 9px;
      background: rgba(0, 0, 0, 0.1);
      text-align: center;
    }

    .radar-summary-card strong,
    .radar-summary-card span {
      display: block;
    }

    .radar-summary-card strong {
      font-size: 0.82rem;
    }

    .radar-summary-card span,
    .radar-summary-note {
      color: var(--muted);
      font-size: 0.65rem;
      line-height: 1.4;
    }

    .radar-summary-card span { margin-top: 3px; }
    .radar-summary-note { margin: 8px 0 0; }

    @media (max-width: 760px) {
      .radar-controls {
        top: 70px;
        right: 10px;
        width: min(230px, calc(100% - 20px));
      }
    }

    @media (max-width: 420px) {
      .radar-controls {
        left: 10px;
        right: auto;
        width: calc(100% - 20px);
      }

      .radar-control-details {
        display: grid;
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.append(style);
}

function injectControls() {
  const mapSection = document.querySelector(".map-section");
  if (!mapSection) throw new Error("Sadetutkaa ei voitu liittää karttaan.");

  const container = document.createElement("div");
  container.className = "radar-controls";
  container.innerHTML = `
    <div class="radar-control-row">
      <button
        id="radar-toggle-button"
        class="button button-secondary radar-toggle"
        type="button"
        aria-pressed="false"
        aria-controls="radar-control-details"
      >
        Sade nyt
      </button>
      <button
        id="radar-refresh-button"
        class="text-button hidden"
        type="button"
      >
        Päivitä
      </button>
    </div>
    <div id="radar-control-details" class="radar-control-details hidden">
      <div class="radar-status-row" role="status" aria-live="polite">
        <span>Tutkahavainto</span>
        <strong id="radar-status-text">Ei ladattu</strong>
      </div>
      <label class="radar-opacity-label" for="radar-opacity-input">
        Läpinäkyvyys
        <input
          id="radar-opacity-input"
          type="range"
          min="0.25"
          max="0.95"
          step="0.05"
          value="${DEFAULT_OPACITY}"
        />
      </label>
      <div class="radar-legend" aria-label="Sateen voimakkuuden selite">
        <span><i class="radar-light"></i> Heikko</span>
        <span><i class="radar-moderate"></i> Kohtalainen</span>
        <span><i class="radar-heavy"></i> Voimakas</span>
        <span><i class="radar-extreme"></i> Rankka</span>
      </div>
    </div>
  `;
  mapSection.append(container);

  return {
    container,
    toggle: container.querySelector("#radar-toggle-button"),
    refresh: container.querySelector("#radar-refresh-button"),
    details: container.querySelector("#radar-control-details"),
    status: container.querySelector("#radar-status-text"),
    opacity: container.querySelector("#radar-opacity-input"),
    routeSummary: document.querySelector("#route-summary"),
  };
}

function bindEvents() {
  elements.toggle.addEventListener("click", toggleRadar);
  elements.refresh.addEventListener("click", () => loadRadar(true));
  elements.opacity.addEventListener("input", () => {
    state.opacity = Number(elements.opacity.value);
    if (state.map?.getLayer(RADAR_LAYER_ID)) {
      state.map.setPaintProperty(RADAR_LAYER_ID, "raster-opacity", state.opacity);
    }
  });

  if (elements.routeSummary) {
    const observer = new MutationObserver((mutations) => {
      const relevant = mutations.some((mutation) => {
        const target =
          mutation.target?.nodeType === Node.ELEMENT_NODE
            ? mutation.target
            : mutation.target?.parentElement;
        if (target?.closest?.("#radar-summary-section")) return false;
        return true;
      });
      if (relevant) scheduleRouteSync();
    });
    observer.observe(elements.routeSummary, {
      attributes: true,
      attributeFilter: ["class"],
      childList: true,
      subtree: true,
    });
  }

  window.addEventListener("resize", () => state.map?.resize());
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && state.enabled && isStale()) loadRadar().catch(() => undefined);
  });
}

function initializeMap() {
  if (!state.map) {
    setStatus("Kartta ei ole saatavilla");
    elements.toggle.disabled = true;
    return;
  }
  scheduleRouteSync();
  window.setTimeout(() => syncBetaRadarCard(), 120);
}

async function toggleRadar() {
  state.enabled = !state.enabled;
  elements.toggle.setAttribute("aria-pressed", String(state.enabled));
  elements.details.classList.toggle("hidden", !state.enabled);
  elements.refresh.classList.toggle("hidden", !state.enabled);

  if (!state.enabled) {
    setLayerVisibility(false);
    stopRefreshTimer();
    state.routeAnalysis = null;
    renderRouteSummary();
    dispatchRadarState();
    return;
  }

  setLayerVisibility(true);
  startRefreshTimer();
  renderRouteSummary();
  dispatchRadarState();

  if (!state.data || isStale()) await loadRadar();
}

function isStale() {
  return !state.data || Date.now() - state.data.loadedAt >= RADAR_REFRESH_MS;
}

function startRefreshTimer() {
  stopRefreshTimer();
  state.refreshTimer = window.setInterval(() => {
    if (!document.hidden && state.enabled) loadRadar().catch(() => undefined);
  }, RADAR_REFRESH_MS);
}

function stopRefreshTimer() {
  window.clearInterval(state.refreshTimer);
  state.refreshTimer = null;
}

function setStatus(message) {
  elements.status.textContent = message;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/xml,text/xml" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}

async function fetchBuffer(url) {
  const response = await fetch(url, {
    headers: { Accept: "image/geotiff,application/octet-stream" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.arrayBuffer();
}

async function loadRadar(force = false) {
  if (state.loading) return;
  if (!force && !isStale()) {
    setLayerVisibility(state.enabled);
    syncRouteAnalysis();
    return;
  }

  state.loading = true;
  elements.toggle.disabled = true;
  elements.refresh.disabled = true;
  setStatus("Ladataan…");
  renderRouteSummary("loading");

  try {
    const xml = await fetchText(buildRadarQueryUrl(new Date()));
    const reference = latestRadarReference(xml);
    if (!reference) throw new Error("uusinta tutkahavaintoa ei löytynyt");

    const transformation = transformationFromXml(xml);
    const geotiffUrl = buildRadarGeoTiffUrl(reference.url);
    const buffer = await fetchBuffer(geotiffUrl);
    const { fromArrayBuffer } = await import(GEOTIFF_MODULE);
    const tiff = await fromArrayBuffer(buffer);
    const image = await tiff.getImage();
    const width = image.getWidth();
    const height = image.getHeight();
    const samples = image.getSamplesPerPixel();
    if (samples !== 1) throw new Error(`odottamaton tutkakuvan kanavamäärä ${samples}`);

    const raw = await image.readRasters({ interleave: true });
    const noData = image.getGDALNoData?.() ?? null;
    const intensities = new Float32Array(raw.length);
    for (let index = 0; index < raw.length; index += 1) {
      intensities[index] = intensityFromRaw(
        raw[index],
        transformation.gain,
        transformation.offset,
        noData,
      );
    }

    const objectUrl = await rasterObjectUrl(intensities, width, height);
    const previousUrl = state.objectUrl;
    state.objectUrl = objectUrl;
    state.data = {
      intensities,
      width,
      height,
      bounds: RADAR_BOUNDS,
      observedAt: reference.time ? new Date(reference.time) : new Date(),
      loadedAt: Date.now(),
    };

    renderRadarLayer();
    if (previousUrl) window.setTimeout(() => URL.revokeObjectURL(previousUrl), 2_000);
    setStatus(formatObservationTime(state.data.observedAt));
    syncRouteAnalysis(true);
    dispatchRadarState();
  } catch (error) {
    console.error(error);
    setStatus("Ei saatavilla");
    renderRouteSummary("error", error.message);
    dispatchRadarState(error.message);
  } finally {
    state.loading = false;
    elements.toggle.disabled = false;
    elements.refresh.disabled = false;
  }
}

async function rasterObjectUrl(intensities, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: true });
  const imageData = context.createImageData(width, height);

  for (let index = 0; index < intensities.length; index += 1) {
    const [red, green, blue, alpha] = rainColor(intensities[index], 1);
    const target = index * 4;
    imageData.data[target] = red;
    imageData.data[target + 1] = green;
    imageData.data[target + 2] = blue;
    imageData.data[target + 3] = alpha;
  }

  context.putImageData(imageData, 0, 0);
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("tutkakuvan muodostaminen epäonnistui"));
    }, "image/png");
  });
  return URL.createObjectURL(blob);
}

function renderRadarLayer() {
  if (!state.map || !state.objectUrl) return;
  if (state.map.getLayer(RADAR_LAYER_ID)) state.map.removeLayer(RADAR_LAYER_ID);
  if (state.map.getSource(RADAR_SOURCE_ID)) state.map.removeSource(RADAR_SOURCE_ID);

  state.map.addSource(RADAR_SOURCE_ID, {
    type: "image",
    url: state.objectUrl,
    coordinates: radarImageCoordinates(),
  });

  const beforeId = state.map.getLayer(ROUTE_LAYER_ID) ? ROUTE_LAYER_ID : undefined;
  state.map.addLayer(
    {
      id: RADAR_LAYER_ID,
      type: "raster",
      source: RADAR_SOURCE_ID,
      paint: {
        "raster-opacity": state.enabled ? state.opacity : 0,
        "raster-fade-duration": 250,
        "raster-resampling": "linear",
      },
    },
    beforeId,
  );
}

function setLayerVisibility(visible) {
  if (!state.map?.getLayer(RADAR_LAYER_ID)) return;
  state.map.setPaintProperty(RADAR_LAYER_ID, "raster-opacity", visible ? state.opacity : 0);
}

function routeData() {
  const source = state.map?.getSource(ROUTE_SOURCE_ID);
  if (!source) return null;
  const serialized = typeof source.serialize === "function" ? source.serialize() : null;
  return serialized?.data ?? source._data ?? null;
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

function signatureForRoute(coordinates) {
  if (!coordinates?.length) return null;
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  return `${coordinates.length}:${first.join(",")}:${last.join(",")}`;
}

function scheduleRouteSync() {
  window.clearTimeout(state.renderTimer);
  state.renderTimer = window.setTimeout(() => {
    syncRouteAnalysis();
    syncBetaRadarCard();
  }, 100);
}

function syncRouteAnalysis(force = false) {
  const coordinates = routeCoordinates();
  const signature = signatureForRoute(coordinates);
  const routeActive =
    coordinates?.length &&
    elements.routeSummary &&
    !elements.routeSummary.classList.contains("hidden");

  if (!routeActive) {
    state.routeSignature = null;
    state.routeAnalysis = null;
    renderRouteSummary();
    dispatchRadarState();
    return;
  }

  if (!state.enabled || !state.data) {
    state.routeAnalysis = null;
    renderRouteSummary(state.loading ? "loading" : null);
    dispatchRadarState();
    return;
  }

  if (!force && signature === state.routeSignature && state.routeAnalysis) return;
  state.routeSignature = signature;
  state.routeAnalysis = analyzeRouteRain(
    state.data.intensities,
    state.data.width,
    state.data.height,
    coordinates,
    state.data.bounds,
  );
  renderRouteSummary();
  dispatchRadarState();
}

function renderRouteSummary(mode = null, errorMessage = "") {
  if (!elements.routeSummary) return;
  const coordinates = routeCoordinates();
  const routeActive =
    coordinates?.length && !elements.routeSummary.classList.contains("hidden");
  let section = document.querySelector("#radar-summary-section");

  if (!routeActive) {
    section?.remove();
    return;
  }

  if (!section) {
    section = document.createElement("section");
    section.id = "radar-summary-section";
    section.className = "route-summary-section radar-summary-section";
    elements.routeSummary.append(section);
  }

  if (!state.enabled) {
    section.innerHTML = `
      <div class="radar-summary-heading">
        <h3>Sade nyt</h3>
        <span class="radar-summary-badge">Pois päältä</span>
      </div>
      <p class="radar-summary-note">Sadetutkakerroksen voi avata kartan Sade nyt -painikkeesta.</p>
    `;
    return;
  }

  if (mode === "loading" || state.loading) {
    section.innerHTML = `
      <div class="radar-summary-heading">
        <h3>Sade nyt</h3>
        <span class="radar-summary-badge">Ladataan…</span>
      </div>
    `;
    return;
  }

  if (mode === "error" || (!state.data && errorMessage)) {
    section.innerHTML = `
      <div class="radar-summary-heading">
        <h3>Sade nyt</h3>
        <span class="radar-summary-badge">Ei saatavilla</span>
      </div>
      <p class="radar-summary-note">Tutkahavaintoa ei saatu ladattua. Muut reittitiedot toimivat silti.</p>
    `;
    return;
  }

  const analysis = state.routeAnalysis;
  if (!analysis) {
    section.innerHTML = `
      <div class="radar-summary-heading">
        <h3>Sade nyt</h3>
        <span class="radar-summary-badge">Odottaa reittiä</span>
      </div>
    `;
    return;
  }

  section.innerHTML = `
    <div class="radar-summary-heading">
      <h3>Sade nyt</h3>
      <span class="radar-summary-badge">${escapeHtml(analysis.level.label)}</span>
    </div>
    <div class="radar-summary-cards">
      <div class="radar-summary-card">
        <strong>${formatDistance(analysis.rainyKm)}</strong>
        <span>sadetta reitillä</span>
      </div>
      <div class="radar-summary-card">
        <strong>${escapeHtml(formatRainIntensity(analysis.maxIntensity))}</strong>
        <span>voimakkain havainto</span>
      </div>
    </div>
    <p class="radar-summary-note">
      Tutkahavainto ${escapeHtml(formatObservationTime(state.data.observedAt))}. Arvio perustuu reittiviivan kohdalla oleviin tutkakuvapikseleihin eikä ole ennuste.
    </p>
  `;
}

function formatDistance(distanceKm) {
  const value = Number(distanceKm);
  if (!Number.isFinite(value) || value < 0.05) return "0 km";
  return `${new Intl.NumberFormat("fi-FI", { maximumFractionDigits: value < 10 ? 1 : 0 }).format(value)} km`;
}

function formatObservationTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "aika ei tiedossa";
  return new Intl.DateTimeFormat("fi-FI", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function dispatchRadarState(error = "") {
  syncBetaRadarCard(error);
  window.dispatchEvent(
    new CustomEvent("ajokeli:radar-state", {
      detail: {
        enabled: state.enabled,
        loading: state.loading,
        error,
        observedAt: state.data?.observedAt?.toISOString?.() ?? null,
        analysis: state.routeAnalysis,
      },
    }),
  );
}

function syncBetaRadarCard(error = "") {
  const grid = document.querySelector("#beta-route-overview .beta-status-grid");
  if (!grid) return;

  let card = grid.querySelector("#beta-radar-card");
  if (!card) {
    card = document.createElement("div");
    card.id = "beta-radar-card";
    card.className = "beta-status-card";
    grid.append(card);
  }

  let value = "Pois päältä";
  if (state.loading) value = "Ladataan…";
  else if (error) value = "Ei saatavilla";
  else if (state.enabled && state.routeAnalysis) value = state.routeAnalysis.level.label;
  else if (state.enabled && state.data) value = "Tutka päällä";

  card.innerHTML = `<span>Sade nyt</span><strong>${escapeHtml(value)}</strong>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
