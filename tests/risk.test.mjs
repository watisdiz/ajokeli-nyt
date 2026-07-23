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
  const oldTime = "2026-01-15T11:30:00Z";
  const result = evaluateStation(station([sensor("TIE_1", -2, undefined, oldTime)], oldTime), now);
  assert.equal(result.level.key, "stale");
  assert.equal(result.score, null);
});

test("haversine distance is approximately correct", () => {
  const helsinkiToTampere = haversineKm([24.9384, 60.1699], [23.761, 61.4978]);
  assert.ok(helsinkiToTampere > 155 && helsinkiToTampere < 165);
});
