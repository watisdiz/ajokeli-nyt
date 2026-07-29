import assert from "node:assert/strict";
import test from "node:test";
import { createHarness, freshImport, waitFor } from "./dom-harness.mjs";
import { demoCameras, demoMeasurements, demoMetadata } from "../demo-data.js";

// Two route changes with the forecast responses arriving in reverse order.
// The old code returned early while a load was in flight, so the newer route
// never fetched at all and the older request still wrote its result -- one
// route's forecast stayed on screen for a different route, with nothing left
// to correct it.

const sectionId = (lon) => (lon < 25 ? "SECTION-A" : "SECTION-B");

function routeAt(lon) {
  return {
    geometry: {
      type: "LineString",
      coordinates: [
        [lon, 60.19],
        [lon + 0.2, 60.19],
      ],
    },
  };
}

function sectionsPayload(lon) {
  const id = sectionId(lon);
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        id,
        geometry: {
          type: "LineString",
          coordinates: [
            [lon, 60.19],
            [lon + 0.2, 60.19],
          ],
        },
        properties: { id, description: id, roadNumber: 1 },
      },
    ],
  };
}

function forecastsPayload(lon) {
  return {
    forecastSections: [
      {
        id: sectionId(lon),
        forecasts: [
          {
            time: new Date(Date.now() + 3_600_000).toISOString(),
            overallRoadCondition: "NORMAL_CONDITION",
            type: "FORECAST",
          },
        ],
      },
    ],
  };
}

test("a superseded forecast response does not overwrite the current route", async () => {
  const harness = await createHarness({
    fetchHandlers: [
      ["/api/weather/v1/stations/data", () => demoMeasurements],
      ["/api/weather/v1/stations", () => demoMetadata],
      ["/api/weathercam/v1/stations", () => demoCameras],
    ],
  });
  const { document, window } = harness;
  const baseFetch = globalThis.fetch;
  const pending = [];

  globalThis.fetch = async (input, init) => {
    const url = String(input?.url ?? input);
    if (url.includes("forecast-sections")) {
      // The bbox in the query tells the two routes apart.
      const xMin = Number(new URL(url, "http://test").searchParams.get("xMin"));
      const lon = xMin < 25 ? 24.6 : 25.6;
      const body = url.includes("/forecasts") ? forecastsPayload(lon) : sectionsPayload(lon);
      return new Promise((resolve) => {
        pending.push({
          id: sectionId(lon),
          release: () =>
            resolve(
              new Response(JSON.stringify(body), {
                status: 200,
                headers: { "content-type": "application/json" },
              }),
            ),
        });
      });
    }
    return baseFetch(input, init);
  };

  try {
    await freshImport("../app-core.js");
    await waitFor(() => document.querySelector("#data-timestamp").textContent.length > 0);
    await freshImport("../route-feature.js");
    await freshImport("../forecast-feature.js");

    const emitRoute = (route) =>
      window.dispatchEvent(
        new window.CustomEvent("ajokeli:route-changed", { detail: { route, analysis: null } }),
      );

    emitRoute(routeAt(24.6));
    await waitFor(() => pending.filter((p) => p.id === "SECTION-A").length === 2, {
      timeout: 10_000,
    });

    emitRoute(routeAt(25.6));
    await waitFor(() => pending.filter((p) => p.id === "SECTION-B").length === 2, {
      timeout: 10_000,
    });

    // Reverse order: the current route answers first, the superseded one after.
    pending.filter((p) => p.id === "SECTION-B").forEach((p) => p.release());
    await waitFor(
      () => {
        const data = window.__ajokeliMap
          .getSource("route-weather-forecast-sections")
          ?.serialize().data;
        return data?.features?.length > 0;
      },
      { timeout: 10_000 },
    );

    pending.filter((p) => p.id === "SECTION-A").forEach((p) => p.release());
    await new Promise((resolve) => setTimeout(resolve, 250));

    const data = window.__ajokeliMap.getSource("route-weather-forecast-sections").serialize().data;
    const rendered = JSON.stringify(data);
    assert.ok(
      !rendered.includes("SECTION-A"),
      "the superseded route's forecast overwrote the current one",
    );
    assert.ok(rendered.includes("SECTION-B"), "the current route's forecast should be displayed");
  } finally {
    globalThis.fetch = baseFetch;
    harness.cleanup();
  }
});
