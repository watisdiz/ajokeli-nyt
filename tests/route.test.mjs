import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeRouteStations,
  distanceToRouteKm,
  formatRouteDistance,
  formatRouteDuration,
  pointToSegmentDistanceKm,
} from "../route.js";

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
