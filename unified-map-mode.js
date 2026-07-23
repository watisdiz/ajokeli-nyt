const APP_VERSION = "1.7.0";
const map = window.__ajokeliMap ?? null;

const RADAR_SOURCE_ID = "fmi-radar-image";
const RADAR_LAYER_ID = "fmi-radar-layer";
const DIM_SOURCE_ID = "radar-map-dim-source";
const DIM_LAYER_ID = "radar-map-dim-layer";
const FORECAST_LAYER_IDS = [
  "route-weather-forecast-casing",
  "route-weather-forecast-lines",
];
const ROUTE_LAYER_IDS = ["route-feature-casing", "route-feature-route"];
const TRAFFIC_LAYER_IDS = [
  "traffic-incidents-fill",
  "traffic-incidents-line",
  "traffic-incidents-points",
];
const CORE_STATION_LAYER_ID = "weather-station-points";
const ROUTE_STATION_LAYER_ID = "route-feature-station-points";
const ROUTE_SOURCE_ID = "route-feature-line";
const RADAR_COORDINATES = [
  [19.1, 70.1],
  [31.7, 70.1],
  [31.7, 59.7],
  [19.1, 59.7],
];

const state = {
  radarEnabled: false,
  roadInfoVisible: true,
  stationsVisible: true,
  processedObservation: null,
  processedObjectUrl: null,
  processing: false,
  syncTimer: null,
};

injectStyles();
enhanceRadarControls();
bindEvents();
initializeMapMode();
applyVersionLabels();

function injectStyles() {
  if (document.querySelector('style[data-feature="unified-map-mode"]')) return;

  const style = document.createElement("style");
  style.dataset.feature = "unified-map-mode";
  style.textContent = `
    .map-mode-button {
      min-height: 38px;
      padding: 7px 9px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 9px;
      color: var(--muted);
      background: rgba(255, 255, 255, 0.035);
      font: inherit;
      font-size: 0.68rem;
      font-weight: 800;
      white-space: nowrap;
    }

    .map-mode-button:hover,
    .map-mode-button:focus-visible,
    .map-mode-button[aria-pressed="true"] {
      border-color: rgba(98, 168, 255, 0.68);
      color: #e8f3ff;
      background: rgba(98, 168, 255, 0.17);
    }

    .radar-controls .radar-control-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 6px;
    }

    .radar-controls .radar-toggle {
      width: 100%;
      min-width: 0;
      min-height: 38px;
      padding: 7px 9px;
      font-size: 0.68rem;
    }

    .radar-controls #radar-refresh-button {
      margin-top: 7px;
    }

    .radar-map-active .map-legend {
      background: rgba(6, 17, 26, 0.88);
      backdrop-filter: blur(8px);
    }

    .unified-map-note {
      margin: 8px 0 0;
      color: var(--muted);
      font-size: 0.62rem;
      line-height: 1.4;
    }

    @media (max-width: 760px) {
      .radar-controls,
      .radar-controls.radar-expanded {
        position: absolute !important;
        top: auto !important;
        right: auto !important;
        bottom: 12px !important;
        left: 50% !important;
        width: auto !important;
        max-width: calc(100vw - 24px) !important;
        padding: 6px !important;
        transform: translateX(-50%);
        border-radius: 15px !important;
        background: rgba(8, 17, 29, 0.94) !important;
      }

      .radar-controls .radar-control-row {
        grid-template-columns: repeat(3, minmax(64px, auto));
      }

      .radar-controls .radar-control-details {
        position: absolute;
        right: 0;
        bottom: calc(100% + 8px);
        width: min(278px, calc(100vw - 24px));
        margin: 0;
        padding: 10px;
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 13px;
        background: rgba(8, 17, 29, 0.96);
        box-shadow: var(--shadow);
        backdrop-filter: blur(12px);
      }

      .radar-controls:not(.radar-expanded) .radar-control-details {
        display: none !important;
      }

      .radar-controls .map-mode-button,
      .radar-controls .radar-toggle {
        min-height: 42px !important;
        padding: 8px 9px !important;
      }
    }

    @media (max-width: 390px) {
      .radar-controls .radar-control-row {
        grid-template-columns: repeat(3, minmax(58px, auto));
        gap: 4px;
      }

      .radar-controls .map-mode-button,
      .radar-controls .radar-toggle {
        padding-inline: 7px !important;
        font-size: 0.64rem;
      }
    }
  `;
  document.head.append(style);
}

function enhanceRadarControls() {
  const controls = document.querySelector(".radar-controls");
  const row = controls?.querySelector(".radar-control-row");
  const radarToggle = document.querySelector("#radar-toggle-button");
  const details = document.querySelector("#radar-control-details");
  const refresh = document.querySelector("#radar-refresh-button");
  if (!controls || !row || !radarToggle || !details) return;

  radarToggle.textContent = "Sade";
  radarToggle.title = "Näytä tai piilota sadetutka";

  if (!document.querySelector("#road-info-layer-toggle")) {
    const roadInfo = createModeButton(
      "road-info-layer-toggle",
      "Tieinfot",
      "Näytä tai piilota tiejaksoennusteet ja liikennetiedot",
      true,
    );
    row.append(roadInfo);
  }

  if (!document.querySelector("#station-layer-toggle")) {
    const stations = createModeButton(
      "station-layer-toggle",
      "Asemat",
      "Näytä tai piilota tiesääasemat",
      true,
    );
    row.append(stations);
  }

  if (refresh && refresh.parentElement !== details) {
    refresh.classList.remove("hidden");
    refresh.textContent = "Päivitä tutkakuva";
    details.append(refresh);
  }

  if (!details.querySelector(".unified-map-note")) {
    const note = document.createElement("p");
    note.className = "unified-map-note";
    note.textContent =
      "Sade, ajoreitti, tiejaksot, häiriöt ja valitut tiesääasemat näkyvät samalla kartalla.";
    details.append(note);
  }

  syncControlClasses();
}

function createModeButton(id, label, title, pressed) {
  const button = document.createElement("button");
  button.id = id;
  button.className = "map-mode-button";
  button.type = "button";
  button.textContent = label;
  button.title = title;
  button.setAttribute("aria-pressed", String(pressed));
  return button;
}

function bindEvents() {
  document.querySelector("#road-info-layer-toggle")?.addEventListener("click", () => {
    state.roadInfoVisible = !state.roadInfoVisible;
    updateButton("#road-info-layer-toggle", state.roadInfoVisible);
    applyLayerVisibility();
  });

  document.querySelector("#station-layer-toggle")?.addEventListener("click", () => {
    state.stationsVisible = !state.stationsVisible;
    updateButton("#station-layer-toggle", state.stationsVisible);
    applyLayerVisibility();
  });

  document.querySelector("#radar-toggle-button")?.addEventListener("click", () => {
    window.setTimeout(syncControlClasses, 0);
  });

  window.addEventListener("ajokeli:radar-state", (event) => {
    const detail = event.detail ?? {};
    state.radarEnabled = Boolean(detail.enabled);
    document.body.classList.toggle("radar-map-active", state.radarEnabled);
    syncControlClasses();
    scheduleMapSync();

    if (
      state.radarEnabled &&
      !detail.loading &&
      !detail.error &&
      detail.observedAt &&
      detail.observedAt !== state.processedObservation
    ) {
      softenRadarImage(detail.observedAt).catch((error) => {
        console.warn("Sadetutkan pehmennys epäonnistui", error);
      });
    }
  });

  const routeSummary = document.querySelector("#route-summary");
  if (routeSummary) {
    const observer = new MutationObserver(scheduleMapSync);
    observer.observe(routeSummary, {
      attributes: true,
      attributeFilter: ["class"],
      childList: true,
      subtree: true,
    });
  }

  window.addEventListener("resize", syncControlClasses);
}

function initializeMapMode() {
  if (!map) return;

  const ready = () => {
    ensureDimLayer();
    applyLayerVisibility();
    reorderOperationalLayers();
    window.setTimeout(scheduleMapSync, 250);
    window.setTimeout(scheduleMapSync, 1_000);
  };

  if (map.loaded()) ready();
  else map.once("load", ready);
}

function scheduleMapSync() {
  window.clearTimeout(state.syncTimer);
  state.syncTimer = window.setTimeout(() => {
    ensureDimLayer();
    applyLayerVisibility();
    reorderOperationalLayers();
  }, 60);
}

function syncControlClasses() {
  const controls = document.querySelector(".radar-controls");
  const radarToggle = document.querySelector("#radar-toggle-button");
  if (!controls || !radarToggle) return;

  const expanded = radarToggle.getAttribute("aria-pressed") === "true";
  state.radarEnabled = expanded;
  controls.classList.toggle("radar-expanded", expanded);
  document.body.classList.toggle("radar-map-active", expanded);
}

function updateButton(selector, pressed) {
  document.querySelector(selector)?.setAttribute("aria-pressed", String(pressed));
}

function ensureDimLayer() {
  if (!map || !map.isStyleLoaded()) return;

  if (!map.getSource(DIM_SOURCE_ID)) {
    map.addSource(DIM_SOURCE_ID, {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [16.5, 57.5],
              [34.5, 57.5],
              [34.5, 72.5],
              [16.5, 72.5],
              [16.5, 57.5],
            ],
          ],
        },
      },
    });
  }

  if (!map.getLayer(DIM_LAYER_ID)) {
    const before = map.getLayer(RADAR_LAYER_ID) ? RADAR_LAYER_ID : undefined;
    map.addLayer(
      {
        id: DIM_LAYER_ID,
        type: "fill",
        source: DIM_SOURCE_ID,
        paint: {
          "fill-color": "#082b28",
          "fill-opacity": state.radarEnabled ? 0.23 : 0,
        },
      },
      before,
    );
  } else {
    map.setPaintProperty(DIM_LAYER_ID, "fill-opacity", state.radarEnabled ? 0.23 : 0);
  }
}

function applyLayerVisibility() {
  if (!map || !map.isStyleLoaded()) return;

  const roadVisibility = state.roadInfoVisible ? "visible" : "none";
  for (const layerId of [...FORECAST_LAYER_IDS, ...TRAFFIC_LAYER_IDS]) {
    setVisibility(layerId, roadVisibility);
  }

  const routeActive = hasRoute();
  setVisibility(
    CORE_STATION_LAYER_ID,
    state.stationsVisible && !routeActive ? "visible" : "none",
  );
  setVisibility(
    ROUTE_STATION_LAYER_ID,
    state.stationsVisible && routeActive ? "visible" : "none",
  );

  if (map.getLayer(CORE_STATION_LAYER_ID)) {
    const radarFilter = [
      "any",
      ["==", ["get", "selected"], true],
      ["in", ["get", "level"], ["literal", ["difficult", "extreme"]]],
    ];
    map.setFilter(CORE_STATION_LAYER_ID, state.radarEnabled ? radarFilter : null);
    map.setPaintProperty(
      CORE_STATION_LAYER_ID,
      "circle-opacity",
      state.radarEnabled ? 0.78 : 0.92,
    );
  }

  if (map.getLayer(ROUTE_STATION_LAYER_ID)) {
    map.setPaintProperty(
      ROUTE_STATION_LAYER_ID,
      "circle-opacity",
      state.radarEnabled ? 0.86 : 0.96,
    );
    map.setPaintProperty(
      ROUTE_STATION_LAYER_ID,
      "circle-stroke-color",
      state.radarEnabled ? "#ffffff" : "#2563eb",
    );
  }
}

function setVisibility(layerId, visibility) {
  if (!map.getLayer(layerId)) return;
  if (map.getLayoutProperty(layerId, "visibility") !== visibility) {
    map.setLayoutProperty(layerId, "visibility", visibility);
  }
}

function hasRoute() {
  const source = map?.getSource(ROUTE_SOURCE_ID);
  if (!source) return false;
  const serialized = typeof source.serialize === "function" ? source.serialize() : null;
  const data = serialized?.data ?? source._data ?? null;
  const features = data?.type === "FeatureCollection" ? data.features : null;
  return Boolean(features?.length);
}

function reorderOperationalLayers() {
  if (!map || !map.isStyleLoaded() || !map.getLayer(RADAR_LAYER_ID)) return;

  const beforeRadar = FORECAST_LAYER_IDS.find((layerId) => map.getLayer(layerId));
  if (beforeRadar) map.moveLayer(RADAR_LAYER_ID, beforeRadar);

  if (map.getLayer(DIM_LAYER_ID)) map.moveLayer(DIM_LAYER_ID, RADAR_LAYER_ID);

  const topOrder = [
    ...FORECAST_LAYER_IDS,
    ...ROUTE_LAYER_IDS,
    ...TRAFFIC_LAYER_IDS,
    CORE_STATION_LAYER_ID,
    ROUTE_STATION_LAYER_ID,
  ];

  for (const layerId of topOrder) {
    if (map.getLayer(layerId)) map.moveLayer(layerId);
  }
}

async function softenRadarImage(observedAt) {
  if (!map || state.processing) return;
  const source = map.getSource(RADAR_SOURCE_ID);
  if (!source || typeof source.updateImage !== "function") return;

  const serialized = typeof source.serialize === "function" ? source.serialize() : null;
  const sourceUrl = serialized?.url ?? source.url ?? null;
  if (!sourceUrl || sourceUrl === state.processedObjectUrl) return;

  state.processing = true;
  try {
    const image = await loadImage(sourceUrl);
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { alpha: true });
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    const downsample = document.createElement("canvas");
    downsample.width = Math.max(1, Math.round(image.naturalWidth * 0.62));
    downsample.height = Math.max(1, Math.round(image.naturalHeight * 0.62));
    const downsampleContext = downsample.getContext("2d", { alpha: true });
    downsampleContext.imageSmoothingEnabled = true;
    downsampleContext.imageSmoothingQuality = "high";
    downsampleContext.drawImage(image, 0, 0, downsample.width, downsample.height);

    if ("filter" in context) {
      context.filter = "blur(5px) saturate(1.22) contrast(1.08)";
    }
    context.drawImage(downsample, 0, 0, canvas.width, canvas.height);
    context.filter = "none";

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error("pehmennettyä tutkakuvaa ei voitu muodostaa"));
      }, "image/png");
    });

    const nextUrl = URL.createObjectURL(blob);
    source.updateImage({ url: nextUrl, coordinates: RADAR_COORDINATES });
    const previousUrl = state.processedObjectUrl;
    state.processedObjectUrl = nextUrl;
    state.processedObservation = observedAt;
    if (previousUrl) window.setTimeout(() => URL.revokeObjectURL(previousUrl), 2_000);
    reorderOperationalLayers();
  } finally {
    state.processing = false;
  }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("tutkakuvaa ei voitu avata"));
    image.src = url;
  });
}

function applyVersionLabels() {
  document.documentElement.dataset.appVersion = APP_VERSION;
  document.querySelectorAll(".beta-badge").forEach((badge) => {
    badge.textContent = `Beta · v${APP_VERSION}`;
  });

  const overview = document.querySelector("#beta-route-overview .muted.small");
  if (overview) overview.textContent = `v${APP_VERSION} beta`;
}
