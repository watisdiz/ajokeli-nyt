import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [html, wrapper, core, feature, css, route] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../app-core.js", import.meta.url), "utf8"),
  readFile(new URL("../route-feature.js", import.meta.url), "utf8"),
  readFile(new URL("../styles.css", import.meta.url), "utf8"),
  readFile(new URL("../route.js", import.meta.url), "utf8"),
]);

test("mobile controls and accessible station search remain present", () => {
  assert.match(html, /id="mobile-filter-button"/);
  assert.match(html, /id="close-sidebar-button"/);
  assert.match(html, /id="sidebar-backdrop"/);
  assert.match(html, /id="station-results"/);
  assert.match(html, /role="combobox"/);
  assert.match(html, /aria-controls="station-results"/);
});

test("wrapper preserves the core app and loads the route feature", () => {
  assert.match(wrapper, /await import\("\.\/app-core\.js"\)/);
  assert.match(wrapper, /await import\("\.\/route-feature\.js"\)/);
  assert.match(wrapper, /window\.__ajokeliMap/);
  assert.match(core, /function setSidebarOpen/);
  assert.match(core, /function renderSearchResults/);
});

test("route search injects explicit place search and routing controls", () => {
  assert.match(feature, /id="route-from-input"/);
  assert.match(feature, /id="route-to-input"/);
  assert.match(feature, /id="route-submit-button"/);
  assert.match(feature, /NOMINATIM_API/);
  assert.match(feature, /OSRM_API/);
  assert.match(feature, /function buildRoute/);
  assert.match(feature, /analyzeRouteStations/);
  assert.match(route, /ROUTE_CORRIDOR_KM/);
});

test("production map style and responsive bottom sheet remain configured", () => {
  assert.match(core, /https:\/\/tiles\.openfreemap\.org\/styles\/positron/);
  assert.doesNotMatch(core, /demotiles\.maplibre\.org/);
  assert.match(feature, /route-feature-route/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /\.sidebar\.mobile-open/);
  assert.match(css, /\.details-panel:not\(\.has-content\)/);
});

test("favicon and social metadata are included", () => {
  assert.match(html, /rel="icon" href="\.\/favicon\.svg"/);
  assert.match(html, /property="og:title" content="Ajokeli nyt"/);
  assert.match(html, /name="twitter:card" content="summary"/);
});
