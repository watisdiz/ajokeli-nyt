import {
  RISK_LEVELS,
  buildStationView,
  formatNumber,
  haversineKm,
  relativeAge,
} from "./risk.js";
import { demoCameras, demoMeasurements, demoMetadata } from "./demo-data.js";

const API_BASE = "https://tie.digitraffic.fi";
const USER_HEADER = "AjokeliNyt/MVP 1.1";
const REFRESH_SECONDS = 60;
const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const MAP_SOURCE_ID = "weather-stations";
const MAP_LAYER_ID = "weather-station-points";
const MOBILE_BREAKPOINT = 760;

const state = {
  map: null,
  mapReady: false,
  mapLoadTimer: null,
  stations: [],
  cameras: [],
  selectedStationId: null,
  activeRisks: new Set(Object.keys(RISK_LEVELS)),
  search: "",
  refreshRemaining: REFRESH_SECONDS,
  refreshTimer: null,
  loading: false,
  sidebarOpen: false,
  errorKind: null,
  locationMarker: null,
  demoMode: new URLSearchParams(window.location.search).get("demo") === "1",
};

const elements = {
  liveStatus: document.querySelector("#live-status"),
  refreshButton: document.querySelector("#refresh-button"),
  stationSearch: document.querySelector("#station-search"),
  stationResults: document.querySelector("#station-results"),
  riskFilters: document.querySelector("#risk-filters"),
  selectAllButton: document.querySelector("#select-all-button"),
  locateButton: document.querySelector("#locate-button"),
  summaryGrid: document.querySelector("#summary-grid"),
  dataTimestamp: document.querySelector("#data-timestamp"),
  refreshCountdown: document.querySelector("#refresh-countdown"),
  mapError: document.querySelector("#map-error"),
  mapLoading: document.querySelector("#map-loading"),
  detailsPanel: document.querySelector("#details-panel"),
  methodologyDialog: document.querySelector("#methodology-dialog"),
  methodologyLink: document.querySelector("#methodology-link"),
  closeMethodology: document.querySelector("#close-methodology"),
  modeIndicator: document.querySelector("#mode-indicator"),
  filterSidebar: document.querySelector("#filter-sidebar"),
  mobileFilterButton: document.querySelector("#mobile-filter-button"),
  closeSidebarButton: document.querySelector("#close-sidebar-button"),
  sidebarBackdrop: document.querySelector("#sidebar-backdrop"),
  srStatus: document.querySelector("#sr-status"),
};

function isMobile() {
  return window.innerWidth <= MOBILE_BREAKPOINT;
}

function announce(message) {
  elements.srStatus.textContent = "";
  window.setTimeout(() => {
    elements.srStatus.textContent = message;
  }, 20);
}

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

  state.mapLoadTimer = window.setTimeout(() => {
    if (state.mapReady) return;
    elements.mapLoading.classList.add("hidden");
    showError(
      `Karttaa ei saatu ladattua. Tarkista verkkoyhteys ja yritä uudelleen.
       <div class="message-actions">
         <button class="button button-secondary" type="button" data-action="reload-map">
           Lataa kartta uudelleen
         </button>
       </div>`,
      "map",
    );
  }, 15_000);

  state.map.on("load", () => {
    state.mapReady = true;
    window.clearTimeout(state.mapLoadTimer);
    elements.mapLoading.classList.add("hidden");
    hideError("map");

    state.map.addSource(MAP_SOURCE_ID, {
      type: "geojson",
      data: emptyFeatureCollection(),
    });

    state.map.addLayer({
      id: MAP_LAYER_ID,
      type: "circle",
      source: MAP_SOURCE_ID,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 6, 8, 9, 13, 13],
        "circle-color": ["get", "color"],
        "circle-stroke-width": ["case", ["boolean", ["get", "selected"], false], 4, 1.5],
        "circle-stroke-color": [
          "case",
          ["boolean", ["get", "selected"], false],
          "#ffffff",
          "#07101d",
        ],
        "circle-opacity": 0.92,
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
  elements.refreshButton.disabled = true;
  elements.refreshButton.setAttribute("aria-busy", "true");
  setStatus("loading", "Päivitetään…");
  hideError("data");

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
    announce(`${state.stations.length} tiesääasemaa päivitetty.`);
  } catch (error) {
    console.error(error);
    const retainedText = state.stations.length
      ? " Aiemmin ladatut havainnot jäävät näkyviin."
      : "";

    setStatus("error", "Datan haku epäonnistui");
    showError(
      `Digitrafficin dataa ei saatu ladattua (${escapeHtml(error.message)}).${retainedText}
       <div class="message-actions">
         <button class="button button-secondary" type="button" data-action="retry-data">
           Yritä uudelleen
         </button>
         <a class="button button-secondary" href="${window.location.pathname}?demo=1">
           Avaa demo
         </a>
       </div>`,
      "data",
    );
    announce("Ajantasaisen datan lataaminen epäonnistui.");
  } finally {
    state.loading = false;
    elements.refreshButton.disabled = false;
    elements.refreshButton.removeAttribute("aria-busy");
  }
}

function renderAll() {
  renderRiskFilters();
  renderSummary();
  renderMapData();

  if (state.selectedStationId) {
    const stillExists = state.stations.some((station) => station.id === state.selectedStationId);
    if (stillExists) renderStationDetails(state.selectedStationId);
    else closeDetails();
  }
}

function filteredStations() {
  const query = state.search.trim().toLocaleLowerCase("fi-FI");
  return state.stations.filter((station) => {
    const riskMatches = state.activeRisks.has(station.level.key);
    const searchMatches = !query || station.name.toLocaleLowerCase("fi-FI").includes(query);
    return riskMatches && searchMatches;
  });
}

function searchMatches() {
  const query = state.search.trim().toLocaleLowerCase("fi-FI");
  if (query.length < 2) return [];

  return state.stations
    .filter((station) => station.name.toLocaleLowerCase("fi-FI").includes(query))
    .sort((a, b) => {
      const aStarts = a.name.toLocaleLowerCase("fi-FI").startsWith(query);
      const bStarts = b.name.toLocaleLowerCase("fi-FI").startsWith(query);
      if (aStarts !== bStarts) return aStarts ? -1 : 1;
      return a.name.localeCompare(b.name, "fi-FI");
    })
    .slice(0, 8);
}

function renderSearchResults() {
  const query = state.search.trim();
  const matches = searchMatches();

  if (query.length < 2) {
    hideSearchResults();
    return;
  }

  elements.stationResults.classList.remove("hidden");
  elements.stationSearch.setAttribute("aria-expanded", "true");

  if (!matches.length) {
    elements.stationResults.innerHTML = `
      <p class="search-empty">Hakusanalla “${escapeHtml(query)}” ei löytynyt tiesääasemaa.</p>
    `;
    return;
  }

  elements.stationResults.innerHTML = matches
    .map(
      (station) => `
        <button
          class="search-result"
          type="button"
          role="option"
          data-station-id="${station.id}"
        >
          <span class="search-result-main">
            <i class="legend-dot risk-${station.level.key}" aria-hidden="true"></i>
            <span>${escapeHtml(station.name)}</span>
          </span>
          <span class="search-result-meta">${escapeHtml(station.level.label)}</span>
        </button>
      `,
    )
    .join("");
}

function hideSearchResults() {
  elements.stationResults.classList.add("hidden");
  elements.stationResults.innerHTML = "";
  elements.stationSearch.setAttribute("aria-expanded", "false");
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
  const allSelected = state.activeRisks.size === Object.keys(RISK_LEVELS).length;

  elements.selectAllButton.textContent = allSelected ? "Poista kaikki" : "Näytä kaikki";
  elements.selectAllButton.setAttribute("aria-pressed", String(allSelected));

  elements.riskFilters.innerHTML = Object.values(RISK_LEVELS)
    .map(
      (level) => `
        <div class="risk-filter">
          <label>
            <input
              type="checkbox"
              data-risk="${level.key}"
              ${state.activeRisks.has(level.key) ? "checked" : ""}
            />
            <i class="legend-dot risk-${level.key}" aria-hidden="true"></i>
            ${level.label}
          </label>
          <span class="filter-count">${counts[level.key]}</span>
        </div>
      `,
    )
    .join("");
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

function selectStation(stationId, flyTo = false, ensureVisible = false) {
  const station = state.stations.find((item) => item.id === stationId);
  if (!station) return;

  if (ensureVisible && !state.activeRisks.has(station.level.key)) {
    state.activeRisks.add(station.level.key);
    renderRiskFilters();
  }

  state.selectedStationId = stationId;

  if (flyTo && state.mapReady) {
    state.map.easeTo({
      center: station.coordinates,
      zoom: Math.max(state.map.getZoom(), 8),
      duration: 700,
    });
  }

  renderMapData();
  renderStationDetails(stationId);
  announce(`${station.name} valittu.`);
}

function renderStationDetails(stationId) {
  const station = state.stations.find((item) => item.id === stationId);
  if (!station) return;

  const camera = nearestCamera(station.coordinates);
  const scoreText = station.score === null ? "Ei laskettu" : `${station.score} pistettä`;
  const metrics = station.metrics;

  elements.detailsPanel.classList.add("has-content");
  elements.detailsPanel.innerHTML = `
    <div class="detail-header">
      <div>
        <p class="eyebrow">Tiesääasema</p>
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
        Luokitus kuvaa aseman lähiympäristön havaintoja. Olosuhteet voivat muuttua
        nopeasti ja poiketa tieosuuden muissa kohdissa.
      </p>
    </section>
  `;
}

function closeDetails() {
  state.selectedStationId = null;
  elements.detailsPanel.classList.remove("has-content");
  elements.detailsPanel.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon" aria-hidden="true">◎</div>
      <h2>Valitse tiesääasema</h2>
      <p>Klikkaa kartan pistettä nähdäksesi mittaukset ja luokituksen perustelut.</p>
    </div>
  `;
  renderMapData();
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

function showError(message, kind) {
  state.errorKind = kind;
  elements.mapError.innerHTML = message;
  elements.mapError.classList.remove("hidden");
}

function hideError(kind = null) {
  if (kind && state.errorKind !== kind) return;
  state.errorKind = null;
  elements.mapError.classList.add("hidden");
  elements.mapError.innerHTML = "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setSidebarOpen(open) {
  state.sidebarOpen = open && isMobile();
  elements.filterSidebar.classList.toggle("mobile-open", state.sidebarOpen);
  elements.sidebarBackdrop.classList.toggle("visible", state.sidebarOpen);
  elements.mobileFilterButton.setAttribute("aria-expanded", String(state.sidebarOpen));
  document.body.classList.toggle("sidebar-open", state.sidebarOpen);

  if (state.sidebarOpen) {
    window.setTimeout(() => elements.stationSearch.focus(), 180);
  } else {
    hideSearchResults();
  }
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

function handleSearchInput(event) {
  state.search = event.target.value;
  renderMapData();
  renderSearchResults();
}

function handleSearchKeydown(event) {
  const resultButtons = [...elements.stationResults.querySelectorAll(".search-result")];

  if (event.key === "ArrowDown" && resultButtons.length) {
    event.preventDefault();
    resultButtons[0].focus();
  } else if (event.key === "Escape") {
    hideSearchResults();
    elements.stationSearch.select();
  } else if (event.key === "Enter") {
    const matches = searchMatches();
    if (matches.length === 1) {
      event.preventDefault();
      chooseSearchResult(matches[0].id);
    }
  }
}

function chooseSearchResult(stationId) {
  const station = state.stations.find((item) => item.id === stationId);
  if (!station) return;

  state.search = station.name;
  elements.stationSearch.value = station.name;
  hideSearchResults();
  selectStation(station.id, true, true);
  setSidebarOpen(false);
}

function bindEvents() {
  elements.refreshButton.addEventListener("click", refreshData);
  elements.stationSearch.addEventListener("input", handleSearchInput);
  elements.stationSearch.addEventListener("keydown", handleSearchKeydown);
  elements.stationSearch.addEventListener("focus", renderSearchResults);

  elements.stationResults.addEventListener("click", (event) => {
    const button = event.target.closest("[data-station-id]");
    if (!button) return;
    chooseSearchResult(Number(button.dataset.stationId));
  });

  elements.stationResults.addEventListener("keydown", (event) => {
    const buttons = [...elements.stationResults.querySelectorAll(".search-result")];
    const currentIndex = buttons.indexOf(document.activeElement);

    if (event.key === "ArrowDown" && buttons.length) {
      event.preventDefault();
      buttons[(currentIndex + 1) % buttons.length].focus();
    } else if (event.key === "ArrowUp" && buttons.length) {
      event.preventDefault();
      if (currentIndex <= 0) elements.stationSearch.focus();
      else buttons[currentIndex - 1].focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      elements.stationSearch.focus();
      hideSearchResults();
    }
  });

  elements.riskFilters.addEventListener("change", (event) => {
    const input = event.target.closest("input[data-risk]");
    if (!input) return;

    if (input.checked) state.activeRisks.add(input.dataset.risk);
    else state.activeRisks.delete(input.dataset.risk);

    renderRiskFilters();
    renderMapData();
  });

  elements.selectAllButton.addEventListener("click", () => {
    const allSelected = state.activeRisks.size === Object.keys(RISK_LEVELS).length;
    state.activeRisks = allSelected ? new Set() : new Set(Object.keys(RISK_LEVELS));
    renderRiskFilters();
    renderMapData();
  });

  elements.locateButton.addEventListener("click", () => {
    if (!navigator.geolocation) {
      showError("Selaimesi ei tue paikannusta.", "data");
      return;
    }

    const originalText = elements.locateButton.textContent;
    elements.locateButton.disabled = true;
    elements.locateButton.textContent = "Haetaan sijaintia…";

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        hideError("data");
        state.map?.easeTo({
          center: [coords.longitude, coords.latitude],
          zoom: 9,
          duration: 900,
        });

        state.locationMarker?.remove();
        state.locationMarker = new maplibregl.Marker({ color: "#2563eb" })
          .setLngLat([coords.longitude, coords.latitude])
          .setPopup(new maplibregl.Popup().setText("Sijaintisi"))
          .addTo(state.map);

        elements.locateButton.disabled = false;
        elements.locateButton.textContent = originalText;
        setSidebarOpen(false);
        announce("Sijaintisi näytetään kartalla.");
      },
      () => {
        elements.locateButton.disabled = false;
        elements.locateButton.textContent = originalText;
        showError(
          `Sijaintia ei voitu hakea. Tarkista selaimen paikannuslupa.
           <div class="message-actions">
             <button class="button button-secondary" type="button" data-action="dismiss-error">
               Sulje
             </button>
           </div>`,
          "data",
        );
      },
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  });

  elements.mobileFilterButton.addEventListener("click", () => setSidebarOpen(true));
  elements.closeSidebarButton.addEventListener("click", () => setSidebarOpen(false));
  elements.sidebarBackdrop.addEventListener("click", () => setSidebarOpen(false));

  elements.detailsPanel.addEventListener("click", (event) => {
    if (event.target.closest("#close-details-button")) closeDetails();
  });

  elements.mapError.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (!action) return;

    if (action === "retry-data") refreshData();
    if (action === "reload-map") window.location.reload();
    if (action === "dismiss-error") hideError();
  });

  elements.methodologyLink.addEventListener("click", (event) => {
    event.preventDefault();
    elements.methodologyDialog.showModal();
  });
  elements.closeMethodology.addEventListener("click", () => elements.methodologyDialog.close());
  elements.methodologyDialog.addEventListener("click", (event) => {
    if (event.target === elements.methodologyDialog) elements.methodologyDialog.close();
  });

  document.addEventListener("click", (event) => {
    if (
      !elements.stationResults.contains(event.target) &&
      event.target !== elements.stationSearch
    ) {
      hideSearchResults();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    if (state.sidebarOpen) {
      setSidebarOpen(false);
      elements.mobileFilterButton.focus();
      return;
    }

    if (state.selectedStationId) closeDetails();
  });

  window.addEventListener("resize", () => {
    if (!isMobile() && state.sidebarOpen) setSidebarOpen(false);
    state.map?.resize();
  });
}

try {
  initMap();
} catch (error) {
  console.error(error);
  elements.mapLoading.classList.add("hidden");
  showError(
    `Karttaa ei voitu käynnistää (${escapeHtml(error.message)}).
     <div class="message-actions">
       <button class="button button-secondary" type="button" data-action="reload-map">
         Yritä uudelleen
       </button>
     </div>`,
    "map",
  );
}

bindEvents();
renderRiskFilters();
renderSummary();
startRefreshTimer();
refreshData();
