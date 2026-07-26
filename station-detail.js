import { escapeHtml } from "./dom-utils.js";
import { formatNumber, haversineKm, relativeAge } from "./risk.js";

export function nearestCamera(coordinates, cameras = []) {
  let nearest = null;

  for (const feature of cameras) {
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

function metricRow(label, value) {
  return `<div class="metric-row"><span>${label}</span><strong>${value}</strong></div>`;
}

function formatMetric(value, unit) {
  return Number.isFinite(Number(value)) ? `${formatNumber(value)} ${unit}` : "–";
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
        />
        <div class="camera-card-body">
          <strong>${escapeHtml(camera.name)}</strong>
          <p class="muted small">Kuva päivittyy Digitrafficin kamerarytmin mukaisesti.</p>
        </div>
      </div>
    </section>
  `;
}

// Renders the station detail panel with the risk level as the dominant
// element (a color-tinted banner with the top contributing reason as a
// teaser), and splits metrics into the ones that actually feed the risk
// score (risk.js's scoreSurface/scoreRoadTemperature/scorePrecipitation/
// scoreVisibility/scoreWind) from the ones that are informational only
// (air temperature, average wind aren't scored at all).
export function renderStationDetailHtml(station, camera, { eyebrow, disclaimer }) {
  const scoreText = station.score === null ? "Ei laskettu" : `${station.score} pistettä`;
  const metrics = station.metrics;
  const topReason = station.reasons[0];

  return `
    <div class="detail-header">
      <div>
        <p class="eyebrow">${escapeHtml(eyebrow)}</p>
        <h2>${escapeHtml(station.name)}</h2>
        <p class="muted small">Havainto ${relativeAge(station.latestTime)}</p>
      </div>
      <button
        id="close-details-button"
        class="icon-button detail-close-button"
        type="button"
        aria-label="Sulje aseman tiedot"
      >
        ×
      </button>
    </div>

    <div class="risk-banner risk-banner-${station.level.key}">
      <div class="risk-banner-level">
        <i class="risk-dot risk-${station.level.key}" aria-hidden="true"></i>
        <strong>${escapeHtml(station.level.label)}</strong>
        <span class="risk-banner-score">${scoreText}</span>
      </div>
      ${topReason ? `<p class="risk-banner-reason">${escapeHtml(topReason)}</p>` : ""}
    </div>

    <section class="detail-section">
      <h3>Perustelut</h3>
      <ul class="reason-list">
        ${station.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}
      </ul>
    </section>

    <section class="detail-section">
      <h3>Vaikuttavat mittaukset</h3>
      <div class="metrics">
        ${metricRow("Tienpinta", metrics.surface || "–")}
        ${metricRow("Tienpinnan lämpötila", formatMetric(metrics.roadTemperature, "°C"))}
        ${metricRow("Sade", metrics.precipitation || "–")}
        ${metricRow("Näkyvyys", formatMetric(metrics.visibility, "km"))}
        ${metricRow("Tuulen maksimi", formatMetric(metrics.maxWind, "m/s"))}
      </div>
    </section>

    <section class="detail-section detail-section-secondary">
      <h3>Muut havainnot</h3>
      <div class="metrics metrics-secondary">
        ${metricRow("Ilman lämpötila", formatMetric(metrics.airTemperature, "°C"))}
        ${metricRow("Tuulen keskinopeus", formatMetric(metrics.averageWind, "m/s"))}
      </div>
    </section>

    ${camera ? renderCamera(camera) : ""}

    <section class="detail-section">
      <p class="muted small">${escapeHtml(disclaimer)}</p>
    </section>
  `;
}
