// These are static source-text checks (regex against file contents), not
// behavior tests — they don't load a DOM, run any code, or catch runtime
// regressions. They exist to pin a few structural facts (which endpoints,
// which element ids, which CSS breakpoints) that are easy to remove by
// accident during a refactor. For actual behavior coverage, see the
// dom-harness-based tests (route-flow, station-selection).
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [
  html,
  wrapper,
  core,
  routeFeature,
  trafficFeature,
  forecastBootstrap,
  forecastFeature,
  css,
  route,
  traffic,
  forecast,
] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../app-core.js", import.meta.url), "utf8"),
  readFile(new URL("../route-feature.js", import.meta.url), "utf8"),
  readFile(new URL("../traffic-feature.js", import.meta.url), "utf8"),
  readFile(new URL("../forecast-bootstrap.js", import.meta.url), "utf8"),
  readFile(new URL("../forecast-feature.js", import.meta.url), "utf8"),
  readFile(new URL("../styles.css", import.meta.url), "utf8"),
  readFile(new URL("../route.js", import.meta.url), "utf8"),
  readFile(new URL("../traffic.js", import.meta.url), "utf8"),
  readFile(new URL("../forecast.js", import.meta.url), "utf8"),
]);

test("mobile controls and accessible station search remain present", () => {
  assert.match(html, /id="mobile-filter-button"/);
  assert.match(html, /id="close-sidebar-button"/);
  assert.match(html, /id="sidebar-backdrop"/);
  assert.match(html, /id="station-results"/);
  assert.match(html, /role="combobox"/);
  assert.match(html, /aria-controls="station-results"/);
});

test("wrapper cache-busts and loads the stable application features", () => {
  // Only pins that a semver BUILD_VERSION exists at all — the actual value
  // and its consistency across app.js, beta.js, privacy.html and
  // request-guard.js is asserted against package.json in beta.test.mjs.
  assert.match(wrapper, /BUILD_VERSION = "\d+\.\d+\.\d+"/);
  assert.match(wrapper, /asset\("\.\/app-core\.js"\)/);
  assert.match(wrapper, /asset\("\.\/route-feature\.js"\)/);
  assert.match(wrapper, /asset\("\.\/traffic-feature\.js"\)/);
  assert.match(wrapper, /asset\("\.\/forecast-bootstrap\.js"\)/);
  assert.match(wrapper, /asset\("\.\/beta-feature\.js"\)/);
  assert.doesNotMatch(wrapper, /radar-feature|radar-polish|unified-map-mode/);
  assert.match(wrapper, /window\.__ajokeliMap/);
  // The version parameter is asserted against package.json in beta.test.mjs;
  // here it only matters that the bootstrap still pulls in the feature.
  assert.match(forecastBootstrap, /await import\("\.\/forecast-feature\.js\?v=[\d.]+"\)/);
  assert.match(core, /function setSidebarOpen/);
  assert.match(core, /function renderSearchResults/);
});

test("route search injects explicit place search and routing controls", () => {
  assert.match(routeFeature, /id="route-from-input"/);
  assert.match(routeFeature, /id="route-to-input"/);
  assert.match(routeFeature, /id="route-submit-button"/);
  assert.match(routeFeature, /NOMINATIM_API/);
  assert.match(routeFeature, /OSRM_API/);
  assert.match(routeFeature, /function buildRoute/);
  assert.match(routeFeature, /analyzeRouteStations/);
  assert.match(route, /ROUTE_CORRIDOR_KM/);
});

test("traffic feature uses current Digitraffic simple JSON endpoints", () => {
  assert.match(trafficFeature, /\/api\/traffic-message\/v2\/roadworks/);
  assert.match(trafficFeature, /\/api\/traffic-message\/v2\/traffic-announcements/);
  assert.match(trafficFeature, /Promise\.allSettled/);
  assert.match(trafficFeature, /traffic-summary-section/);
  assert.match(trafficFeature, /traffic-incidents-line/);
  assert.match(traffic, /analyzeRouteTraffic/);
  assert.match(traffic, /TRAFFIC_CORRIDOR_KM/);
});

test("forecast feature uses current simple forecast-section endpoints and departure comparison", () => {
  assert.match(forecastFeature, /\/api\/weather\/v1\/forecast-sections-simple/);
  assert.match(forecastFeature, /\/api\/weather\/v1\/forecast-sections-simple\/forecasts/);
  assert.match(forecastFeature, /id="forecast-departure-select"/);
  assert.match(forecastFeature, /forecast-summary-section/);
  assert.match(forecastFeature, /route-weather-forecast-lines/);
  assert.match(forecast, /buildDepartureOptions/);
  assert.match(forecast, /compareDepartureOptions/);
  assert.match(forecast, /FORECAST_CORRIDOR_KM/);
});

test("production map style and responsive bottom sheet remain configured", () => {
  assert.match(core, /https:\/\/tiles\.openfreemap\.org\/styles\/positron/);
  assert.doesNotMatch(core, /demotiles\.maplibre\.org/);
  assert.match(routeFeature, /route-feature-route/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /\.sidebar\.mobile-open/);
  assert.match(css, /\.details-panel:not\(\.has-content\)/);
});

test("favicon and social metadata are included", () => {
  assert.match(html, /rel="icon" href="\.\/favicon\.svg"/);
  assert.match(html, /property="og:title" content="Ajokeli nyt"/);
  assert.match(html, /name="twitter:card" content="summary"/);
});
