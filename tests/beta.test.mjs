import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
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

  assert.equal(pickClosestDeparture(options, "2026-07-23T16:00:00Z"), "2026-07-23T15:00:00Z");
});

test("beta runtime keeps stable route features and excludes radar processing", async () => {
  const [app, guard, feature, privacy, checklist, readme, index] = await Promise.all([
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../request-guard.js", import.meta.url), "utf8"),
    readFile(new URL("../beta-feature.js", import.meta.url), "utf8"),
    readFile(new URL("../privacy.html", import.meta.url), "utf8"),
    readFile(new URL("../BETA_TESTING.md", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
  ]);

  // package.json is the single source of truth for the version. Asserting
  // against it (instead of a hardcoded literal) means this test fails when a
  // version bump misses one of the places the number is duplicated, rather
  // than becoming yet another place that has to be bumped by hand.
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const version = pkg.version;

  assert.equal(APP_VERSION, version);
  assert.ok(app.includes(`BUILD_VERSION = "${version}"`), `app.js BUILD_VERSION is not ${version}`);
  assert.ok(
    privacy.includes(`Beta · versio ${version}`),
    `privacy.html visible version is not ${version}`,
  );
  assert.ok(
    guard.includes(`./beta.js?v=${version}`) && guard.includes(`./events.js?v=${version}`),
    `request-guard.js cache-busting params are not ${version}`,
  );
  assert.ok(
    readme.includes(`Nykyinen versio on **${version} beta**`) &&
      readme.includes(`AjokeliNyt/MVP ${version}`),
    `README.md still documents a different version than ${version}`,
  );
  assert.ok(
    checklist.includes(`-version ${version} manuaalista`),
    `BETA_TESTING.md still documents a different version than ${version}`,
  );
  // index.html loads these three outside the BUILD_VERSION scheme, so they
  // need their own ?v=. Without it the browser keeps a 4h-cached copy and
  // users end up running new JS against an old stylesheet -- which is
  // exactly what happened when 1.8.1 shipped.
  for (const asset of ["./theme-init.js", "./styles.css", "./app.js"]) {
    assert.ok(
      index.includes(`${asset}?v=${version}`),
      `index.html does not cache-bust ${asset} at ${version}`,
    );
  }
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

// BUILD_VERSION only cache-busts what app.js imports by name. Everything
// those modules import in turn is fetched at a bare URL, and Pages serves
// those with max-age=14400 -- so a returning visitor can end up running a
// new feature module against a four-hour-old logic module. When 1.9.0 added
// buildRouteIndex to route.js, that skew stopped being cosmetic: traffic.js
// imports the new symbol by name, so a stale route.js makes the app fail to
// boot rather than just behave like the old version. Every relative import
// therefore carries the version too.
test("every relative import is pinned to the current version", async () => {
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const root = new URL("../", import.meta.url);

  const files = (await readdir(root)).filter(
    (name) => name.endsWith(".js") && !name.startsWith("eslint.config"),
  );
  assert.ok(files.length > 10, `expected to find the app modules, got ${files.length}`);

  const problems = [];

  for (const name of files) {
    const source = await readFile(new URL(name, root), "utf8");

    // app.js builds its own versioned URLs through asset(), so its bare
    // strings are intentional.
    if (name === "app.js") continue;

    for (const [, specifier] of source.matchAll(/["'](\.\/[^"']+\.js[^"']*)["']/g)) {
      if (!specifier.includes("?v=")) {
        problems.push(`${name}: ${specifier} has no ?v=`);
      } else if (!specifier.endsWith(`?v=${pkg.version}`)) {
        problems.push(`${name}: ${specifier} is not pinned to ${pkg.version}`);
      }
    }
  }

  assert.deepEqual(problems, [], `unpinned imports:\n${problems.join("\n")}`);
});
