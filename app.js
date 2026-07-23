import {
  RISK_LEVELS,
  buildStationView,
  formatNumber,
  haversineKm,
  relativeAge,
} from "./risk.js";
import { demoCameras, demoMeasurements, demoMetadata } from "./demo-data.js";

const API_BASE = "https://tie.digitraffic.fi";
const USER_HEADER = "AjokeliNyt/MVP 1.0";
const REFRESH_SECONDS = 60;
const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const MAP_SOURCE_ID = "weather-stations";
const MAP_LAYER_ID = "weather-station-points";

const state = {
  map: null,
  mapReady: false,
  stations: [],
  cameras: [],
  selectedStationId: null,
  activeRisks: new Set(Object.keys(RISK_LEVELS)),
  search: "",
  refreshRemaining: REFRESH_SECONDS,
  refreshTimer: null,
  loading: false,
  demoMode: new URLSearchParams(window.location.search).get("demo") === "1",
};

const elements = {
  liveStatus: document.querySelector("#live-status"),
  refreshButton: document.querySelector("#refresh-button"),
  stationSearch: document.querySelector("#station-search"),
  riskFilters: document.querySelector("#risk-filters"),
  selectAllButton: document.querySelector("#select-all-button"),
  locateButton: document.querySelector("#locate-button"),
  summaryGrid: document.querySelector("#summary-grid"),
  dataTimestamp: document.querySelector("#data-timestamp"),
  refreshCountdown: document.querySelector("#refresh-countdown"),
  mapError: document.querySelector("#map-error"),
  detailsPanel: document.querySelector("#details-panel"),
  methodologyDialog: document.querySelector("#methodology-dialog"),
  methodologyLink: document.querySelector("#methodology-link"),
  closeMethodology: document.querySelector("#close-methodology"),
  modeIndicator: document.querySelector("#mode-indicator"),
};

function initMap() {
  state.map = new maplibregl.Map({
    container: "map",
    style: MAP_STYLE_URL,
    center: [25.2, 64.4],
    zoom: 4.35,
    minZoom: 3.5,
    maxZoom: 16,
    attributionControl: false,
  });

  state.map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
  state.map.addControl(
    new maplibregl.AttributionControl({
      compact: true,
      customAttribution: "Fintraffic / Digitraffic CC BY 4.0",
    }),
    "bottom-right",
  );

  state.map.on("load", () => {
    state.mapReady = true;
    state.map.addSource(MAP_SOURCE_ID, {
      type: "geojson",
      data: emptyFeatureCollection(),
    });

    state.map.addLayer({
      id: MAP_LAYER_ID,
      type: "circle",
      source: MAP_SOURCE_ID,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 5, 8, 8, 13, 12],
        "circle-color": ["get", "color"],
        "circle-stroke-width": ["case", ["boolean", ["get", "selected"], false], 4, 1.5],
        "circle-stroke-color": ["case", ["boolean", ["get", "selected"], false], "#ffffff", "#07101d"],
        "circle-opacity": 0.9,
      },
    });

    state.map.on("mouseenter", MAP_LAYER_ID, () => {
      state.map.getCanvas().style.cursor = "pointer";
    });
    state.map.on("mouseleave", MAP_LAYER_ID, () => {
      state.map.getCanvas().style.cursor = "";
    });
    state.map.on("click", MAP_LAYER_ID, (event) => {
      const stationId = Number(event.features?.[0]?.properties?.stationId);
      if (stationId) selectStation(stationId, true);
    });

    renderMapData();
  });

  state.map.on("error", (event) => {
    if (event?.error?.message) console.warn("MapLibre error:", event.error.message);
  });
}

function emptyFeatureCollection() {
  return { type: "FeatureCollection", features: [] };
}

async function fetchJson(path) {
  const url = `${API_BASE}${path}`;
  const options = {
    headers: {
      Accept: "application/json",
      "Digitraffic-User": USER_HEADER,
    },
    cache: "no-store",
  };

  let response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    // Some browsers or embedded previews may reject the custom header preflight.
    response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  }

  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function loadLiveData() {
  const [metadata, measurements, cameras] = await Promise.all([
    fetchJson("/api/weather/v1/stations"),
    fetchJson("/api/weather/v1/stations/data"),
    fetchJson("/api/weathercam/v1/stations").catch((error) => {
      console.warn("Kelikameroiden haku epäonnistui:", error);
      return emptyFeatureCollection();
    }),
  ]);
  return { metadata, measurements, cameras };
}

async function refreshData() {
  if (state.loading) return;
  state.loading = true;
  setStatus("loading", "Päivitetään…");
  elements.refreshButton.disabled = true;
  hideError();

  try {
    const payload = state.demoMode
      ? { metadata: demoMetadata, measurements: demoMeasurements, cameras: demoCameras }
      : await loadLiveData();

    const measurementsById = new Map(
      (payload.measurements.stations ?? []).map((station) => [Number(station.id), station]),
    );

    const now = new Date();
    state.stations = (payload.metadata.features ?? [])
      .filter((feature) => feature.properties?.collectionStatus === "GATHERING")
      .map((feature) => buildStationView(feature, measurementsById.get(Number(feature.id)), now));

    state.cameras = (payload.cameras.features ?? []).filter(
      (feature) =>
        feature.properties?.collectionStatus === "GATHERING" &&
        feature.properties?.presets?.some((preset) => preset.inCollection),
    );

    const latest = payload.measurements.dataUpdatedTime || payload.metadata.dataUpdatedTime;
    elements.dataTimestamp.textContent = latest
      ? `Digitrafficin aineisto päivitetty ${formatDateTime(latest)}.`
      : "Aineiston päivitysaikaa ei saatu.";

    setStatus("live", state.demoMode ? "Demoaineisto" : "Ajantasainen data");
    elements.modeIndicator.textContent = state.demoMode
      ? "Demo-tila käytössä. Poista URL-osoitteesta ?demo=1 käyttääksesi live-dataa."
      : "Live-data päivittyy automaattisesti kerran minuutissa.";

    state.refreshRemaining = REFRESH_SECONDS;
    renderAll();
  } catch (error) {
    console.error(error);
    setStatus("error", "Datan haku epäonnistui");
    showError(
      `Digitrafficin dataa ei saatu ladattua (${error.message}). Tarkista verkkoyhteys tai avaa ` +
        `<a href="${window.location.pathname}?demo=1">demo-tila</a>.`,
    );
  } finally {
    state.loading = false;
    elements.refreshButton.disabled = false;
  }
}

function renderAll() {
  renderRiskFilters();
  renderSummary();
  renderMapData();
  if (state.selectedStationId) renderStationDetails(state.selectedStationId);
}

function filteredStations() {
  const query = state.search.trim().toLocaleLowerCase("fi-FI");
  return state.stations.filter((station) => {
    const riskMatches = state.activeRisks.has(station.level.key);
    const searchMatches = !query || station.name.toLocaleLowerCase("fi-FI").includes(query);
    return riskMatches && searchMatches;
  });
}

function renderMapData() {
  if (!state.mapReady) return;
  const features = filteredStations().map((station) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: station.coordinates },
    properties: {
      stationId: station.id,
      name: station.name,
      level: station.level.key,
      label: station.level.label,
      color: station.level.color,
      score: station.score ?? "",
      selected: station.id === state.selectedStationId,
    },
  }));
  state.map.getSource(MAP_SOURCE_ID)?.setData({ type: "FeatureCollection", features });
}

function riskCounts() {
  const counts = Object.fromEntries(Object.keys(RISK_LEVELS).map((key) => [key, 0]));
  for (const station of state.stations) counts[station.level.key] += 1;
  return counts;
}

function renderRiskFilters() {
  const counts = riskCounts();
  elements.riskFilters.innerHTML = Object.values(RISK_LEVELS)
    .map(
      (level) => `
        <div class="risk-filter">
          <label>
            <input type="checkbox" data-risk="${level.key}" ${state.activeRisks.has(level.key) ? "checked" : ""} />
            <i class="legend-dot risk-${level.key}"></i>
            ${level.label}
          </label>
          <span class="filter-count">${counts[level.key]}</span>
        </div>
      `,
    )
    .join("");

  elements.riskFilters.querySelectorAll("input[data-risk]").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) state.activeRisks.add(input.dataset.risk);
      else state.activeRisks.delete(input.dataset.risk);
      renderMapData();
    });
  });
}

function renderSummary() {
  const counts = riskCounts();
  elements.summaryGrid.innerHTML = Object.values(RISK_LEVELS)
    .map(
      (level) => `
        <div class="summary-card">
          <strong style="color:${level.color}">${counts[level.key]}</strong>
          <span>${level.label}</span>
        </div>
      `,
    )
    .join("");
}

function selectStation(stationId, flyTo = false) {
  state.selectedStationId = stationId;
  const station = state.stations.find((item) => item.id === stationId);
  if (!station) return;
  if (flyTo && state.mapReady) {
    state.map.easeTo({ center: station.coordinates, zoom: Math.max(state.map.getZoom(), 8), duration: 700 });
  }
  renderMapData();
  renderStationDetails(stationId);
}

function renderStationDetails(stationId) {
  const station = state.stations.find((item) => item.id === stationId);
  if (!station) return;
  const camera = nearestCamera(station.coordinates);
  const scoreText = station.score === null ? "Ei laskettu" : `${station.score} pistettä`;
  const metrics = station.metrics;

  elements.detailsPanel.innerHTML = `
    <div class="detail-header">
      <div>
        <p class="eyebrow">Tiesääasema</p>
        <h2>${escapeHtml(station.name)}</h2>
        <p class="muted small">Havainto ${relativeAge(station.latestTime)}</p>
      </div>
      <span class="risk-badge">
        <i class="risk-dot risk-${station.level.key}"></i>
        ${station.level.label}
      </span>
    </div>

    <section class="detail-section">
      <div class="panel-heading-row">
        <h3>Luokitus</h3>
        <strong>${scoreText}</strong>
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
        ${metricRow("Tuulen keskinopeus", formatMetric(metrics.averageWind, "m/s"))}
      </div>
    </section>

    ${camera ? renderCamera(camera) : ""}

    <section class="detail-section">
      <p class="muted small">
        Luokitus kuvaa aseman lähiympäristön havaintoja. Olosuhteet voivat muuttua nopeasti ja poiketa tieosuuden muissa kohdissa.
      </p>
    </section>
  `;
}

function metricRow(label, value) {
  return `<div class="metric-row"><span>${label}</span><strong>${value}</strong></div>`;
}

function formatMetric(value, unit) {
  return Number.isFinite(Number(value)) ? `${formatNumber(value)} ${unit}` : "–";
}

function nearestCamera(coordinates) {
  let nearest = null;
  for (const feature of state.cameras) {
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
        <img src="${imageUrl}" alt="Kelikamerakuva: ${escapeHtml(camera.name)}" loading="lazy" onerror="this.closest('.camera-card').style.display='none'" />
        <div class="camera-card-body">
          <strong>${escapeHtml(camera.name)}</strong>
          <p class="muted small">Kuva päivittyy Digitrafficin kamerarytmin mukaisesti.</p>
        </div>
      </div>
    </section>
  `;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fi-FI", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function setStatus(type, text) {
  elements.liveStatus.className = `status-pill status-${type}`;
  elements.liveStatus.textContent = text;
}

function showError(message) {
  elements.mapError.innerHTML = message;
  elements.mapError.classList.remove("hidden");
}

function hideError() {
  elements.mapError.classList.add("hidden");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function startRefreshTimer() {
  clearInterval(state.refreshTimer);
  state.refreshTimer = setInterval(() => {
    state.refreshRemaining -= 1;
    if (state.refreshRemaining <= 0) {
      state.refreshRemaining = REFRESH_SECONDS;
      refreshData();
    }
    elements.refreshCountdown.textContent = `Päivittyy ${state.refreshRemaining} s`;
  }, 1000);
}

function bindEvents() {
  elements.refreshButton.addEventListener("click", refreshData);
  elements.stationSearch.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderMapData();
    const matches = filteredStations();
    if (state.search.trim().length >= 3 && matches.length === 1) selectStation(matches[0].id, true);
  });

  elements.selectAllButton.addEventListener("click", () => {
    const allSelected = state.activeRisks.size === Object.keys(RISK_LEVELS).length;
    state.activeRisks = allSelected ? new Set() : new Set(Object.keys(RISK_LEVELS));
    renderRiskFilters();
    renderMapData();
  });

  elements.locateButton.addEventListener("click", () => {
    if (!navigator.geolocation) {
      showError("Selaimesi ei tue paikannusta.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        hideError();
        state.map?.easeTo({ center: [coords.longitude, coords.latitude], zoom: 9, duration: 900 });
        new maplibregl.Marker({ color: "#62a8ff" })
          .setLngLat([coords.longitude, coords.latitude])
          .setPopup(new maplibregl.Popup().setText("Sijaintisi"))
          .addTo(state.map);
      },
      () => showError("Sijaintia ei voitu hakea. Tarkista selaimen paikannuslupa."),
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  });

  elements.methodologyLink.addEventListener("click", (event) => {
    event.preventDefault();
    elements.methodologyDialog.showModal();
  });
  elements.closeMethodology.addEventListener("click", () => elements.methodologyDialog.close());
  elements.methodologyDialog.addEventListener("click", (event) => {
    if (event.target === elements.methodologyDialog) elements.methodologyDialog.close();
  });
}

initMap();
bindEvents();
renderRiskFilters();
renderSummary();
startRefreshTimer();
refreshData();
