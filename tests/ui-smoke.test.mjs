import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [html, wrapper, core, routeFeature, trafficFeature, css, route, traffic] =
  await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../app-core.js", import.meta.url), "utf8"),
    readFile(new URL("../route-feature.js", import.meta.url), "utf8"),
    readFile(new URL("../traffic-feature.js", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8"),
    readFile(new URL("../route.js", import.meta.url), "utf8"),
    readFile(new URL("../traffic.js", import.meta.url), "utf8"),
  ]);

test("mobile controls and accessible station search remain present", () => {
  assert.match(html, /id="mobile-filter-button"/);
  assert.match(html, /id="close-sidebar-button"/);
  assert.match(html, /id="sidebar-backdrop"/);
  assert.match(html, /id="station-results"/);
  assert.match(html, /role="combobox"/);
  assert.match(html, /aria-controls="station-results"/);
});

test("wrapper preserves the core app and loads route and traffic features", () => {
  assert.match(wrapper, /await import\("\.\/app-core\.js"\)/);
  assert.match(wrapper, /await import\("\.\/route-feature\.js"\)/);
  assert.match(wrapper, /await import\("\.\/traffic-feature\.js"\)/);
  assert.match(wrapper, /window\.__ajokeliMap/);
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
  assert.match(trafficFeature, /includeAreaGeometry=true/);
  assert.match(trafficFeature, /Promise\.allSettled/);
  assert.match(trafficFeature, /traffic-summary-section/);
  assert.match(trafficFeature, /traffic-incidents-line/);
  assert.match(traffic, /analyzeRouteTraffic/);
  assert.match(traffic, /TRAFFIC_CORRIDOR_KM/);
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
