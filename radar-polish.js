const APP_VERSION = "1.6.2";
const RADAR_SOURCE_ID = "fmi-radar-image";
const RADAR_BOUNDS = Object.freeze({ west: 19.1, south: 59.7, east: 31.7, north: 70.1 });
const map = window.__ajokeliMap ?? null;

let latestRadarDetail = null;
let lastObservationLabel = "";
let rainBounds = null;
let analysisToken = 0;

injectCompactStyles();
observeControls();
applyVersionLabels();

window.addEventListener("ajokeli:radar-state", (event) => {
  latestRadarDetail = event.detail ?? null;
  applyVersionLabels();
  syncControlState();

  if (!latestRadarDetail?.enabled || latestRadarDetail.loading || latestRadarDetail.error) {
    rainBounds = null;
    updateRainAreaAction();
    return;
  }

  analyzeRenderedRadar().catch((error) => {
    console.warn("Sadetutkan näkyvyystarkistus epäonnistui", error);
  });
});

function injectCompactStyles() {
  if (document.querySelector('style[data-feature="radar-polish-1-6-2"]')) return;

  const style = document.createElement("style");
  style.dataset.feature = "radar-polish-1-6-2";
  style.textContent = `
    .radar-pixel-note {
      margin: 7px 0 0;
      color: var(--muted);
      font-size: 0.63rem;
      line-height: 1.35;
    }

    .radar-area-action {
      margin-top: 7px;
    }

    @media (max-width: 760px) {
      .radar-controls {
        top: 66px !important;
        right: 10px !important;
        left: auto !important;
        width: auto !important;
        max-width: 218px;
        padding: 6px !important;
        border-radius: 11px;
      }

      .radar-controls.radar-expanded {
        width: min(218px, calc(100vw - 20px)) !important;
        padding: 8px !important;
      }

      .radar-controls:not(.radar-expanded) .radar-control-row {
        justify-content: flex-end;
      }

      .radar-controls:not(.radar-expanded) #radar-refresh-button {
        display: none !important;
      }

      .radar-toggle {
        min-height: 38px !important;
        padding: 7px 10px !important;
      }
    }

    @media (max-width: 420px) {
      .radar-controls,
      .radar-controls.radar-expanded {
        right: 8px !important;
        left: auto !important;
        max-width: min(204px, calc(100vw - 16px));
      }
    }
  `;
  document.head.append(style);
}

function observeControls() {
  const observer = new MutationObserver(() => {
    applyVersionLabels();
    syncControlState();
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true });
  syncControlState();
}

function syncControlState() {
  const controls = document.querySelector(".radar-controls");
  const toggle = document.querySelector("#radar-toggle-button");
  if (!controls || !toggle) return;

  const expanded = toggle.getAttribute("aria-pressed") === "true";
  controls.classList.toggle("radar-expanded", expanded);

  const details = document.querySelector("#radar-control-details");
  if (details && !details.querySelector(".radar-pixel-note")) {
    const note = document.createElement("p");
    note.className = "radar-pixel-note";
    note.textContent = "Värilliset alueet tarkoittavat mitattua sadetta. Pilvipeitettä ei näytetä.";
    details.append(note);
  }
}

function applyVersionLabels() {
  document.documentElement.dataset.appVersion = APP_VERSION;
  document.querySelectorAll(".beta-badge").forEach((badge) => {
    const value = `Beta · v${APP_VERSION}`;
    if (badge.textContent !== value) badge.textContent = value;
  });

  const overview = document.querySelector("#beta-route-overview .muted.small");
  if (overview) overview.textContent = `v${APP_VERSION} beta`;
}

async function analyzeRenderedRadar() {
  if (!map) return;
  const token = ++analysisToken;
  const source = map.getSource(RADAR_SOURCE_ID);
  const serialized = typeof source?.serialize === "function" ? source.serialize() : null;
  const imageUrl = serialized?.url ?? source?.url ?? null;
  if (!imageUrl) return;

  const image = await loadImage(imageUrl);
  if (token !== analysisToken) return;

  const maxSide = 480;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;

  let rainyPixels = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha < 12) continue;
      rainyPixels += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  rainBounds = rainyPixels > 0 ? pixelBoundsToMapBounds(minX, minY, maxX, maxY, width, height) : null;
  updateRadarMessage(rainyPixels);
  updateRainAreaAction();
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("tutkakuvan lukeminen epäonnistui"));
    image.src = url;
  });
}

function pixelBoundsToMapBounds(minX, minY, maxX, maxY, width, height) {
  const lon = (x) => RADAR_BOUNDS.west + (x / Math.max(1, width - 1)) * (RADAR_BOUNDS.east - RADAR_BOUNDS.west);
  const lat = (y) => RADAR_BOUNDS.north - (y / Math.max(1, height - 1)) * (RADAR_BOUNDS.north - RADAR_BOUNDS.south);
  return [
    [lon(minX), lat(maxY)],
    [lon(maxX), lat(minY)],
  ];
}

function updateRadarMessage(rainyPixels) {
  const status = document.querySelector("#radar-status-text");
  if (!status) return;

  const current = status.textContent.trim();
  if (/\d{1,2}[.:]\d{2}/.test(current)) {
    const timeMatch = current.match(/(?:ma|ti|ke|to|pe|la|su)?\s*\d{1,2}[.:]\d{2}/i);
    if (timeMatch) lastObservationLabel = timeMatch[0].trim();
  }

  const time = lastObservationLabel ? ` · ${lastObservationLabel}` : "";
  const routeLevel = latestRadarDetail?.analysis?.level;

  if (rainyPixels === 0) {
    status.textContent = `Ei havaittua sadetta Suomessa${time}`;
    return;
  }

  if (routeLevel?.key === "none") {
    status.textContent = `Sadetta muualla, ei reitillä${time}`;
    return;
  }

  if (routeLevel?.label) {
    status.textContent = `${routeLevel.label} reitillä${time}`;
    return;
  }

  status.textContent = `Sadetta havaittu Suomessa${time}`;
}

function updateRainAreaAction() {
  const details = document.querySelector("#radar-control-details");
  if (!details) return;

  let button = details.querySelector("#radar-show-rain-areas");
  if (!rainBounds) {
    button?.remove();
    return;
  }

  if (!button) {
    button = document.createElement("button");
    button.id = "radar-show-rain-areas";
    button.className = "text-button radar-area-action";
    button.type = "button";
    button.textContent = "Näytä sadealueet";
    button.addEventListener("click", () => {
      map?.fitBounds(rainBounds, { padding: 36, duration: 700, maxZoom: 8 });
    });
    details.append(button);
  }
}
