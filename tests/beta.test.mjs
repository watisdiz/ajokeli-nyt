import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  APP_VERSION,
  buildShareUrl,
  normalizeShareLabel,
  parseSharedRoute,
  pickClosestDeparture,
} from "../beta.js";

test("share labels are normalized", () => {
  assert.equal(normalizeShareLabel("  Vantaa   keskusta "), "Vantaa keskusta");
});

test("share URL preserves unrelated parameters and stores the route", () => {
  const url = buildShareUrl("https://example.test/?demo=1#map", {
    from: " Vantaa ",
    to: "Tampere",
    departure: "2026-07-23T15:00:00Z",
  });

  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get("demo"), "1");
  assert.equal(parsed.searchParams.get("from"), "Vantaa");
  assert.equal(parsed.searchParams.get("to"), "Tampere");
  assert.equal(parsed.searchParams.get("departure"), "2026-07-23T15:00:00Z");
  assert.equal(parsed.hash, "");
});

test("shared route requires both endpoints", () => {
  assert.equal(parseSharedRoute("?from=Vantaa"), null);
  assert.deepEqual(parseSharedRoute("?from=Vantaa&to=Tampere"), {
    from: "Vantaa",
    to: "Tampere",
    departure: "",
  });
});

test("closest forecast option is selected when exact time is unavailable", () => {
  const options = [
    { value: "2026-07-23T12:00:00Z" },
    { value: "2026-07-23T15:00:00Z" },
    { value: "2026-07-23T18:00:00Z" },
  ];

  assert.equal(
    pickClosestDeparture(options, "2026-07-23T16:00:00Z"),
    "2026-07-23T15:00:00Z",
  );
});

test("beta runtime files include cache busting, timeout and unified map controls", async () => {
  const [
    app,
    guard,
    feature,
    radarHelp,
    radarPolish,
    unifiedMap,
    privacy,
    checklist,
  ] = await Promise.all([
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../request-guard.js", import.meta.url), "utf8"),
    readFile(new URL("../beta-feature.js", import.meta.url), "utf8"),
    readFile(new URL("../radar-ux-hotfix.js", import.meta.url), "utf8"),
    readFile(new URL("../radar-polish.js", import.meta.url), "utf8"),
    readFile(new URL("../unified-map-mode.js", import.meta.url), "utf8"),
    readFile(new URL("../privacy.html", import.meta.url), "utf8"),
    readFile(new URL("../BETA_TESTING.md", import.meta.url), "utf8"),
  ]);

  assert.equal(APP_VERSION, "1.7.0");
  assert.match(app, /BUILD_VERSION = "1\.7\.0"/);
  assert.match(app, /asset\("\.\/request-guard\.js"\)/);
  assert.match(app, /asset\("\.\/radar-ux-hotfix\.js"\)/);
  assert.match(app, /asset\("\.\/radar-polish\.js"\)/);
  assert.match(app, /asset\("\.\/unified-map-mode\.js"\)/);
  assert.match(guard, /TimeoutError/);
  assert.match(guard, /AjokeliNyt\/MVP \$\{APP_VERSION\}/);
  assert.match(guard, /opendata\.fmi\.fi/);
  assert.match(guard, /openwms\.fmi\.fi/);
  assert.match(feature, /beta-route-overview/);
  assert.match(feature, /route-share-button/);
  assert.match(feature, /load-shared-route-button/);
  assert.match(radarHelp, /ei pilvipeitettä/i);
  assert.match(radarPolish, /Ei havaittua sadetta Suomessa/);
  assert.match(radarPolish, /Näytä sadealueet/);
  assert.match(unifiedMap, /road-info-layer-toggle/);
  assert.match(unifiedMap, /station-layer-toggle/);
  assert.match(unifiedMap, /blur\(5px\)/);
  assert.match(unifiedMap, /radar-map-dim-layer/);
  assert.match(unifiedMap, /bottom: 12px/);
  assert.match(privacy, /ei käytä evästeitä, kirjautumista tai analytiikkaa/i);
  assert.match(privacy, /Ilmatieteen laitos/);
  assert.match(checklist, /Vantaa → Tampere/);
  assert.match(checklist, /Sadetutkan tarkistukset/);
});
