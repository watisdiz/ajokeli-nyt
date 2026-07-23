import assert from "node:assert/strict";
import test from "node:test";

import {
  FORECAST_LEVELS,
  analyzeForecastAtTime,
  buildDepartureOptions,
  compareDepartureOptions,
  distanceGeometryToRouteKm,
  forecastReasonTexts,
  matchForecastSectionsToRoute,
  normalizeForecastSections,
  routeBoundingBox,
  selectForecastForTime,
} from "../forecast.js";

const now = new Date("2026-01-15T08:00:00Z");

function forecast(time, condition, reason = {}) {
  return {
    time,
    type: "FORECAST",
    forecastName: "test",
    overallRoadCondition: condition,
    roadTemperature: -1,
    temperature: -2,
    windSpeed: 4,
    reliability: "NORMAL",
    forecastConditionReason: reason,
  };
}

const metadata = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      id: "section-a",
      geometry: {
        type: "LineString",
        coordinates: [
          [24.9, 60.2],
          [25.1, 60.2],
        ],
      },
      properties: {
        id: "section-a",
        description: "Tie 4 Helsinki",
        roadNumber: 4,
      },
    },
    {
      type: "Feature",
      id: "section-b",
      geometry: {
        type: "LineString",
        coordinates: [
          [25.2, 60.2],
          [25.4, 60.2],
        ],
      },
      properties: {
        id: "section-b",
        description: "Tie 4 Vantaa",
        roadNumber: 4,
      },
    },
    {
      type: "Feature",
      id: "far-away",
      geometry: {
        type: "LineString",
        coordinates: [
          [27, 62],
          [27.2, 62],
        ],
      },
      properties: {
        id: "far-away",
        description: "Kaukana",
      },
    },
  ],
};

const forecasts = {
  dataUpdatedTime: now.toISOString(),
  forecastSections: [
    {
      id: "section-a",
      forecasts: [
        forecast("2026-01-15T08:00:00Z", "NORMAL_CONDITION"),
        forecast("2026-01-15T11:00:00Z", "POOR_CONDITION", {
          precipitationCondition: "SNOWFALL",
          winterSlipperiness: true,
        }),
      ],
    },
    {
      id: "section-b",
      forecasts: [
        forecast("2026-01-15T08:00:00Z", "POOR_CONDITION", {
          roadCondition: "ICY_ROAD",
        }),
        forecast("2026-01-15T11:00:00Z", "NORMAL_CONDITION"),
      ],
    },
  ],
};

const route = [
  [24.8, 60.2],
  [25.5, 60.2],
];

test("normalizes forecast sections and matches only the route corridor", () => {
  const sections = normalizeForecastSections(metadata, forecasts);
  assert.equal(sections.length, 3);
  assert.equal(sections[0].forecasts.length, 2);

  const matched = matchForecastSectionsToRoute(sections, route, 5);
  assert.deepEqual(
    matched.map((item) => item.section.id),
    ["section-a", "section-b"],
  );
  assert.ok(matched.every((item) => item.distanceKm < 0.1));
});

test("geometry distance and bounding box cover the selected route", () => {
  const distance = distanceGeometryToRouteKm(metadata.features[0].geometry, route);
  assert.ok(distance.distanceKm < 0.1);

  const bounds = routeBoundingBox(route, 0.1);
  assert.equal(bounds.xMin, 24.7);
  assert.equal(bounds.yMin, 60.1);
  assert.equal(bounds.xMax, 25.6);
  assert.ok(Math.abs(bounds.yMax - 60.3) < 1e-9);
});

test("selects nearest forecast and translates material condition reasons", () => {
  const sections = normalizeForecastSections(metadata, forecasts);
  const selected = selectForecastForTime(
    sections[0].forecasts,
    "2026-01-15T10:30:00Z",
  );

  assert.equal(selected.overallRoadCondition, "POOR_CONDITION");
  assert.deepEqual(forecastReasonTexts(selected), [
    "Lumisadetta",
    "Liukkauden riski",
  ]);
});

test("builds departure options from actual forecast times", () => {
  const sections = normalizeForecastSections(metadata, forecasts);
  const matched = matchForecastSectionsToRoute(sections, route, 5);
  const options = buildDepartureOptions(matched, now, [0, 3]);

  assert.equal(options.length, 2);
  assert.equal(options[0].label, "Nyt");
  assert.equal(options[1].time, "2026-01-15T11:00:00.000Z");
});

test("analyzes route forecast and compares departure times", () => {
  const sections = normalizeForecastSections(metadata, forecasts);
  const matched = matchForecastSectionsToRoute(sections, route, 5);

  const nowAnalysis = analyzeForecastAtTime(matched, "2026-01-15T08:00:00Z");
  assert.equal(nowAnalysis.worstLevel.key, FORECAST_LEVELS.difficult.key);
  assert.equal(nowAnalysis.counts.difficult, 1);
  assert.equal(nowAnalysis.highlights[0].section.id, "section-b");

  const options = buildDepartureOptions(matched, now, [0, 3]);
  const comparison = compareDepartureOptions(matched, options);

  assert.equal(comparison.comparisons.length, 2);
  assert.ok(comparison.best);
  assert.equal(comparison.best.analysis.worstLevel.key, "difficult");
});
