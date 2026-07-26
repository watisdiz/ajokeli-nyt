import assert from "node:assert/strict";
import test from "node:test";
import { createHarness, freshImport, waitFor } from "./dom-harness.mjs";
import { demoCameras, demoMeasurements, demoMetadata } from "../demo-data.js";

// Drives the real app-core/route-feature/traffic-feature/forecast-feature/
// beta-feature modules against a jsdom document, with fetch and maplibregl
// stubbed. Unlike source-shape.test.mjs, this actually runs the code and
// checks what ends up in the DOM — in particular that beta-feature's
// "Reitin yhteenveto" card reflects the SAME analysis that route-feature,
// traffic-feature and forecast-feature computed, purely via the
// ajokeli:route-changed / traffic-changed / forecast-changed events. If that
// wiring breaks, this test breaks with it.

const ROUTE_GEOMETRY = {
  type: "LineString",
  coordinates: [
    [24.6, 60.19],
    [24.8, 60.19],
  ],
};

const roadworkFixture = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [24.7, 60.19] },
      properties: {
        situationId: "TEST-ROADWORK-1",
        announcements: [
          {
            language: "fi",
            title: "Testitietyö reitillä",
            location: { description: "Testitie" },
            roadWorkPhases: [],
          },
        ],
      },
    },
  ],
};

const emptyFeatureCollection = { type: "FeatureCollection", features: [] };

function nominatimResult(lat, lon, name) {
  return [{ lat: String(lat), lon: String(lon), display_name: `${name}, Testikunta, Suomi` }];
}

function buildFetchHandlers() {
  return [
    ["/api/weather/v1/stations/data", () => demoMeasurements],
    ["/api/weather/v1/stations", () => demoMetadata],
    ["/api/weathercam/v1/stations", () => demoCameras],
    ["/api/traffic-message/v2/roadworks", () => roadworkFixture],
    ["/api/traffic-message/v2/traffic-announcements", () => emptyFeatureCollection],
    ["/api/weather/v1/forecast-sections-simple/forecasts", () => ({ forecastSections: [] })],
    ["/api/weather/v1/forecast-sections-simple", () => ({ type: "FeatureCollection", features: [] })],
    [
      "nominatim.openstreetmap.org",
      (url) => {
        const q = new URL(url).searchParams.get("q");
        if (q === "FROMPLACE") return nominatimResult(60.19, 24.6, "Fromplace");
        if (q === "TOPLACE") return nominatimResult(60.19, 24.8, "Toplace");
        return [];
      },
    ],
    [
      "router.project-osrm.org",
      () => ({
        code: "Ok",
        routes: [{ distance: 45_000, duration: 2_700, geometry: ROUTE_GEOMETRY }],
      }),
    ],
  ];
}

async function bootstrapApp(harness) {
  await freshImport("../app-core.js");
  await waitFor(() => harness.document.querySelector("#data-timestamp").textContent.length > 0);
  await freshImport("../route-feature.js");
  await freshImport("../traffic-feature.js");
  await freshImport("../forecast-feature.js");
  await freshImport("../beta-feature.js");
}

async function selectPlace(document, kind, query, { timeout } = {}) {
  const input = document.querySelector(`#route-${kind}-input`);
  const searchButton = document.querySelector(`#route-${kind}-search`);
  input.value = query;
  searchButton.click();

  const resultButton = await waitFor(
    () => document.querySelector(`#route-${kind}-results .route-place-result`),
    { timeout },
  );
  resultButton.click();
}

test("building a route propagates through the event bus into the beta overview card", async () => {
  const harness = await createHarness({ fetchHandlers: buildFetchHandlers() });
  const { document } = harness;

  try {
    await bootstrapApp(harness);

    await selectPlace(document, "from", "FROMPLACE");
    await selectPlace(document, "to", "TOPLACE", { timeout: 3000 });

    document.querySelector("#route-submit-button").click();

    await waitFor(() => !document.querySelector("#route-summary").classList.contains("hidden"));

    const routeWorst = document.querySelector("#route-summary .risk-banner-level strong");
    assert.equal(routeWorst.textContent.trim(), "Normaali");

    await waitFor(() => document.querySelector("#traffic-summary-section"));
    const trafficCards = document.querySelectorAll("#traffic-summary-section .traffic-count-card strong");
    assert.equal(trafficCards[0].textContent.trim(), "1");
    assert.equal(trafficCards[1].textContent.trim(), "0");

    await waitFor(
      () =>
        document.querySelector("#forecast-summary-section .forecast-summary-badge")?.textContent.trim() ===
        "Ei saatavilla",
    );

    await waitFor(() => document.querySelector("#beta-route-overview"));
    const betaCards = document.querySelectorAll("#beta-route-overview .beta-status-card strong");
    assert.equal(betaCards[0].textContent.trim(), "Normaali", "beta card should mirror route-feature's worst level");
    assert.equal(
      betaCards[1].textContent.trim(),
      "1 tietyötä · 0 häiriötä",
      "beta card should mirror traffic-feature's incident counts",
    );
    assert.equal(
      betaCards[2].textContent.trim(),
      "Ei saatavilla",
      "beta card should mirror forecast-feature's unavailable status",
    );

    document.querySelector("#route-clear-button").click();

    await waitFor(() => !document.querySelector("#beta-route-overview"));
    assert.equal(document.querySelector("#route-summary").classList.contains("hidden"), true);
    assert.equal(document.querySelector("#traffic-summary-section"), null);
    assert.equal(document.querySelector("#forecast-summary-section"), null);
  } finally {
    harness.cleanup();
  }
});
