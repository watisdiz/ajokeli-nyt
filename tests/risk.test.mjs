import test from "node:test";
import assert from "node:assert/strict";
import { evaluateStation, haversineKm } from "../risk.js";

const now = new Date("2026-01-15T12:00:00Z");

function sensor(name, value, descriptionFi, measuredTime = now.toISOString()) {
  return {
    id: 1,
    stationId: 100,
    name,
    shortName: name,
    measuredTime,
    value,
    unit: "",
    reliability: "OK",
    sensorValueDescriptionFi: descriptionFi,
  };
}

function station(sensorValues, dataUpdatedTime = now.toISOString()) {
  return { id: 100, dataUpdatedTime, sensorValues };
}

test("warm and dry conditions are normal", () => {
  const result = evaluateStation(
    station([
      sensor("TIE_1", 8),
      sensor("KELI_1", 1, "Kuiva"),
      sensor("SADE", 0, "Pouta"),
      sensor("NÄKYVYYS_KM", 20),
      sensor("MAKSIMITUULI", 5),
    ]),
    now,
  );
  assert.equal(result.level.key, "normal");
  assert.equal(result.score, 0);
});

test("wet road near zero creates attention level", () => {
  const result = evaluateStation(
    station([
      sensor("TIE_1", 0.4),
      sensor("KELI_1", 3, "Märkä"),
      sensor("SADE", 1, "Heikko sade"),
      sensor("NÄKYVYYS_KM", 8),
    ]),
    now,
  );
  assert.equal(result.level.key, "attention");
  assert.equal(result.score, 3);
});

test("snow, frost and poor visibility create difficult conditions", () => {
  const result = evaluateStation(
    station([
      sensor("TIE_1", -4),
      sensor("KELI_1", 6, "Lumi"),
      sensor("SATEEN_OLOMUOTO_PWDXX", 11, "Lumisade"),
      sensor("NÄKYVYYS_KM", 1.2),
    ]),
    now,
  );
  assert.equal(result.level.key, "extreme");
  assert.ok(result.score >= 7);
});

test("freezing rain and ice are extreme", () => {
  const result = evaluateStation(
    station([
      sensor("TIE_1", -1.5),
      sensor("KELI_1", 7, "Jää"),
      sensor("SATEEN_OLOMUOTO_PWDXX", 19, "Jäätävä sade"),
    ]),
    now,
  );
  assert.equal(result.level.key, "extreme");
  assert.equal(result.score, 10);
});

test("old measurements are marked stale", () => {
  const oldTime = "2026-01-15T11:00:00Z"; // an hour old, well past the limit
  const result = evaluateStation(station([sensor("TIE_1", -2, undefined, oldTime)], oldTime), now);
  assert.equal(result.level.key, "stale");
  assert.equal(result.score, null);
  assert.match(result.reasons[0], /minuuttia vanha/);
});

// Freshness used to be taken as the newest timestamp anywhere on the station,
// so a current reading from an unrelated sensor made an old core measurement
// look current and it got scored anyway. Measured against the live payload,
// 15% of stations have sensor times that diverge within the station, by up to
// 22 hours.
test("a stale core measurement is not rescued by a fresh unrelated sensor", () => {
  const oldTime = "2026-01-15T11:00:00Z";
  const result = evaluateStation(
    station(
      [
        sensor("TIE_1", -2, undefined, oldTime),
        sensor("ILMAN_KOSTEUS", 80, undefined, now.toISOString()),
      ],
      oldTime,
    ),
    now,
  );

  assert.equal(result.level.key, "stale", "old road temperature must not be scored");
  assert.equal(result.score, null);
});

// dataUpdatedTime is when the payload was assembled, not when anything was
// measured. On its own it must never make a station look current.
test("a fresh payload timestamp does not make stale sensors current", () => {
  const oldTime = "2026-01-15T11:00:00Z";
  const result = evaluateStation(
    station(
      [sensor("TIE_1", -2, undefined, oldTime), sensor("KELI_1", 3, "Luminen", oldTime)],
      now.toISOString(),
    ),
    now,
  );

  assert.equal(result.level.key, "stale");
  assert.equal(result.ageMs, Number.POSITIVE_INFINITY);
});

test("a station with no core sensors is stale for a different reason", () => {
  const result = evaluateStation(
    station([sensor("ILMAN_KOSTEUS", 80, undefined, now.toISOString())], now.toISOString()),
    now,
  );

  assert.equal(result.level.key, "stale");
  assert.match(result.reasons[0], /ei ole saatavilla/);
});

// The threshold has to clear Digitraffic's own cadence: core sensors arrive
// every 16-17 minutes at the median, so a reading in that range is normal
// operation and must still be scored.
test("a measurement at the observed reporting cadence is still scored", () => {
  const seventeenMinutes = "2026-01-15T11:43:00Z";
  const result = evaluateStation(
    station([sensor("TIE_1", -2, undefined, seventeenMinutes)], seventeenMinutes),
    now,
  );

  assert.notEqual(result.level.key, "stale");
  assert.equal(typeof result.score, "number");
});

test("haversine distance is approximately correct", () => {
  const helsinkiToTampere = haversineKm([24.9384, 60.1699], [23.761, 61.4978]);
  assert.ok(helsinkiToTampere > 155 && helsinkiToTampere < 165);
});
