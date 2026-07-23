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

test("beta runtime keeps stable route features and excludes radar processing", async () => {
  const [app, guard, feature, privacy, checklist, readme] = await Promise.all([
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../request-guard.js", import.meta.url), "utf8"),
    readFile(new URL("../beta-feature.js", import.meta.url), "utf8"),
    readFile(new URL("../privacy.html", import.meta.url), "utf8"),
    readFile(new URL("../BETA_TESTING.md", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
  ]);

  assert.equal(APP_VERSION, "1.7.1");
  assert.match(app, /BUILD_VERSION = "1\.7\.1"/);
  assert.match(app, /asset\("\.\/request-guard\.js"\)/);
  assert.match(app, /asset\("\.\/route-feature\.js"\)/);
  assert.match(app, /asset\("\.\/traffic-feature\.js"\)/);
  assert.match(app, /asset\("\.\/forecast-bootstrap\.js"\)/);
  assert.match(app, /asset\("\.\/beta-feature\.js"\)/);
  assert.doesNotMatch(app, /radar-feature|radar-polish|unified-map-mode/);
  assert.doesNotMatch(guard, /opendata\.fmi\.fi|openwms\.fmi\.fi|"radar"/);
  assert.match(guard, /TimeoutError/);
  assert.match(guard, /AjokeliNyt\/MVP \$\{APP_VERSION\}/);
  assert.match(feature, /beta-route-overview/);
  assert.match(feature, /route-share-button/);
  assert.match(feature, /load-shared-route-button/);
  assert.match(privacy, /ei käytä evästeitä, kirjautumista tai analytiikkaa/i);
  assert.doesNotMatch(privacy, /GeoTIFF|sadetutka/i);
  assert.match(checklist, /Vantaa → Vaasa/);
  assert.match(checklist, /Pitkien reittien suorituskyky/);
  assert.match(readme, /suorituskyky- ja luotettavuusongelmien vuoksi/);
});
