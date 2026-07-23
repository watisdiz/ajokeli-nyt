import assert from "node:assert/strict";
import test from "node:test";
import {
  TRAFFIC_CORRIDOR_KM,
  analyzeRouteTraffic,
  formatIncidentTimeWindow,
  isTimeWindowActive,
  normalizeTrafficCollection,
  normalizeTrafficFeature,
} from "../traffic.js";

const now = new Date("2026-07-23T12:00:00Z");

function feature({
  id = "x",
  geometry = { type: "Point", coordinates: [25, 60] },
  title = "Tie 1. Liikennetiedote.",
  comment = "",
  features = [],
  timeAndDuration = {
    startTime: "2026-07-23T10:00:00Z",
    endTime: "2026-07-23T14:00:00Z",
  },
  phases = [],
} = {}) {
  return {
    type: "Feature",
    geometry,
    properties: {
      situationId: id,
      announcements: [
        {
          language: "fi",
          title,
          comment,
          features: features.map((name) => ({ name })),
          timeAndDuration,
          roadWorkPhases: phases,
        },
      ],
    },
  };
}

test("time windows exclude future and expired incidents", () => {
  assert.equal(isTimeWindowActive({ startTime: "2026-07-23T13:00:00Z" }, now), false);
  assert.equal(isTimeWindowActive({ endTime: "2026-07-23T11:00:00Z" }, now), false);
  assert.equal(isTimeWindowActive({ startTime: "2026-07-23T11:00:00Z" }, now), true);
});

test("road work severity uses phase severity and active phase window", () => {
  const result = normalizeTrafficFeature(
    feature({
      id: "rw",
      phases: [
        {
          severity: "high",
          timeAndDuration: {
            startTime: "2026-07-23T11:00:00Z",
            endTime: "2026-07-23T13:00:00Z",
          },
          worktypes: [{ description: "Päällystystyö" }],
        },
      ],
    }),
    "roadwork",
    now,
  );

  assert.equal(result.severity.key, "high");
  assert.equal(result.severity.source, "api");
  assert.deepEqual(result.worktypes, ["Päällystystyö"]);
});

test("traffic closure severity is derived as high", () => {
  const result = normalizeTrafficFeature(
    feature({
      id: "ta",
      features: ["Tie on suljettu liikenteeltä", "Kiertotie käytössä"],
    }),
    "traffic",
    now,
  );

  assert.equal(result.severity.key, "high");
  assert.equal(result.severity.source, "derived");
});

test("collection normalization filters expired and missing geometry", () => {
  const collection = {
    features: [
      feature({ id: "active" }),
      feature({
        id: "expired",
        timeAndDuration: {
          startTime: "2026-07-22T10:00:00Z",
          endTime: "2026-07-22T11:00:00Z",
        },
      }),
      feature({ id: "no-geometry", geometry: null }),
    ],
  };

  assert.deepEqual(
    normalizeTrafficCollection(collection, "traffic", now).map((item) => item.id),
    ["active"],
  );
});

test("route analysis finds incidents near the route and counts types", () => {
  const route = [
    [24.9, 60],
    [25.1, 60],
  ];
  const incidents = [
    normalizeTrafficFeature(
      feature({ id: "near", geometry: { type: "Point", coordinates: [25, 60.005] } }),
      "traffic",
      now,
    ),
    normalizeTrafficFeature(
      feature({
        id: "work",
        geometry: {
          type: "LineString",
          coordinates: [
            [25.02, 60.002],
            [25.04, 60.002],
          ],
        },
        phases: [{ severity: "medium" }],
      }),
      "roadwork",
      now,
    ),
    normalizeTrafficFeature(
      feature({ id: "far", geometry: { type: "Point", coordinates: [25, 60.1] } }),
      "traffic",
      now,
    ),
  ];

  const analysis = analyzeRouteTraffic(incidents, route, TRAFFIC_CORRIDOR_KM);
  assert.deepEqual(
    analysis.matched.map((item) => item.incident.id),
    ["near", "work"],
  );
  assert.equal(analysis.counts.total, 2);
  assert.equal(analysis.counts.traffic, 1);
  assert.equal(analysis.counts.roadwork, 1);
});

test("incident time windows are formatted", () => {
  const text = formatIncidentTimeWindow({
    startTime: "2026-07-23T10:00:00Z",
    endTime: "2026-07-23T12:00:00Z",
  });
  assert.match(text, /23\.7\.2026/);
});
