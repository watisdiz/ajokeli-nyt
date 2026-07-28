import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeRouteStations,
  buildRouteIndex,
  distanceToRouteKm,
  distanceToRouteKmIndexed,
  formatRouteDistance,
  formatRouteDuration,
  pointToSegmentDistanceKm,
} from "../route.js";

// Deterministic pseudo-random source, so a failure is reproducible instead of
// showing up on one run in twenty.
function makeRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
}

function makeWanderingRoute(random, points) {
  const route = [];
  let lon = 24.9;
  let lat = 60.2;
  for (let index = 0; index < points; index += 1) {
    lon += (random() - 0.35) * 0.02;
    lat += (random() - 0.3) * 0.02;
    route.push([lon, lat]);
  }
  return route;
}

test("formats route distance and duration for Finnish UI", () => {
  assert.equal(formatRouteDistance(850), "850 m");
  assert.match(formatRouteDistance(179_400), /179 km/);
  assert.equal(formatRouteDuration(7_500), "2 h 5 min");
});

test("calculates point distance to a route segment", () => {
  const measurement = pointToSegmentDistanceKm([24.5, 60.1], [24.4, 60.1], [24.6, 60.1]);
  assert.ok(measurement.distanceKm < 0.01);
  assert.ok(measurement.fraction > 0.45 && measurement.fraction < 0.55);

  const routeMeasurement = distanceToRouteKm(
    [24.5, 60.11],
    [
      [24.4, 60.1],
      [24.6, 60.1],
      [24.8, 60.2],
    ],
  );
  assert.ok(routeMeasurement.distanceKm > 1 && routeMeasurement.distanceKm < 1.3);
  assert.equal(routeMeasurement.segmentIndex, 0);
});

test("selects stations inside the route corridor and finds the worst reliable level", () => {
  const routeCoordinates = [
    [24.0, 60.0],
    [25.0, 60.0],
    [26.0, 60.0],
  ];

  const stations = [
    {
      id: 1,
      name: "A",
      coordinates: [24.5, 60.01],
      level: { key: "normal", label: "Normaali", order: 0 },
      reasons: ["Ei tunnistettuja merkittäviä kelitekijöitä."],
    },
    {
      id: 2,
      name: "B",
      coordinates: [25.5, 60.02],
      level: { key: "difficult", label: "Vaikea", order: 2 },
      reasons: ["Tienpinta: Jää (+4)"],
    },
    {
      id: 3,
      name: "C",
      coordinates: [25.5, 60.2],
      level: { key: "extreme", label: "Erittäin vaikea", order: 3 },
      reasons: ["Jäätävä sade (+4)"],
    },
    {
      id: 4,
      name: "D",
      coordinates: [25.2, 60.01],
      level: { key: "stale", label: "Data puuttuu / vanha", order: 4 },
      reasons: ["Mittaus on yli 15 minuuttia vanha."],
    },
  ];

  const analysis = analyzeRouteStations(stations, routeCoordinates, 8);

  assert.deepEqual(
    analysis.nearbyStations.map((item) => item.station.id),
    [1, 4, 2],
  );
  assert.equal(analysis.worstLevel.key, "difficult");
  assert.equal(analysis.stationIds.has(3), false);
  assert.equal(analysis.highlights[0].stationId, 2);
});

// The grid index exists purely to make the corridor match faster. It is only
// worth having if it produces the same answer as walking every segment, so
// this checks it against the brute-force implementation on a route that
// doubles back on itself -- the case where a naive "nearest cell" shortcut
// would pick the wrong segment.
test("the route index agrees with the exhaustive scan inside the corridor", () => {
  const random = makeRandom(20_260_727);
  const route = makeWanderingRoute(random, 900);
  const corridorKm = 8;
  const index = buildRouteIndex(route, corridorKm);

  let insideCorridor = 0;

  for (let trial = 0; trial < 800; trial += 1) {
    const point = [24.9 + (random() - 0.5) * 4, 60.2 + (random() - 0.5) * 4];

    const exact = distanceToRouteKm(point, route);
    const indexed = distanceToRouteKmIndexed(point, index);

    if (exact.distanceKm <= corridorKm) {
      insideCorridor += 1;
      assert.ok(
        Math.abs(indexed.distanceKm - exact.distanceKm) < 1e-9,
        `distance mismatch at ${point}: ${indexed.distanceKm} vs ${exact.distanceKm}`,
      );
      assert.equal(indexed.segmentIndex, exact.segmentIndex, `segment mismatch at ${point}`);
    } else {
      // Outside the corridor the index is allowed to give up rather than
      // report a true distance, but it must never claim the point is closer
      // than it really is -- that would pull it into the corridor.
      assert.ok(
        indexed.distanceKm >= exact.distanceKm - 1e-9,
        `index understated distance at ${point}`,
      );
    }
  }

  assert.ok(
    insideCorridor > 20,
    `expected the sample to exercise the corridor, got ${insideCorridor}`,
  );
});

test("indexed and exhaustive station analysis select the same stations", () => {
  const random = makeRandom(7_271_986);
  const route = makeWanderingRoute(random, 600);

  const stations = Array.from({ length: 400 }, (_, id) => ({
    id: `s${id}`,
    name: `Asema ${id}`,
    coordinates: [24.9 + (random() - 0.5) * 3, 60.2 + (random() - 0.5) * 3],
    level: { key: "normal", order: 0 },
    reasons: [],
  }));

  const analyzed = analyzeRouteStations(stations, route, 8);

  const expected = stations
    .filter((station) => distanceToRouteKm(station.coordinates, route).distanceKm <= 8)
    .map((station) => station.id)
    .sort();

  assert.deepEqual([...analyzed.stationIds].sort(), expected);
  assert.ok(
    expected.length > 5,
    `expected several stations in the corridor, got ${expected.length}`,
  );
});
