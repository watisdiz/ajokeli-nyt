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
  radarFeature,
  radarHelp,
  radarPolish,
  css,
  route,
  traffic,
  forecast,
  radar,
] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../app-core.js", import.meta.url), "utf8"),
  readFile(new URL("../route-feature.js", import.meta.url), "utf8"),
  readFile(new URL("../traffic-feature.js", import.meta.url), "utf8"),
  readFile(new URL("../forecast-bootstrap.js", import.meta.url), "utf8"),
  readFile(new URL("../forecast-feature.js", import.meta.url), "utf8"),
  readFile(new URL("../radar-feature.js", import.meta.url), "utf8"),
  readFile(new URL("../radar-ux-hotfix.js", import.meta.url), "utf8"),
  readFile(new URL("../radar-polish.js", import.meta.url), "utf8"),
  readFile(new URL("../styles.css", import.meta.url), "utf8"),
  readFile(new URL("../route.js", import.meta.url), "utf8"),
  readFile(new URL("../traffic.js", import.meta.url), "utf8"),
  readFile(new URL("../forecast.js", import.meta.url), "utf8"),
  readFile(new URL("../radar.js", import.meta.url), "utf8"),
]);

test("mobile controls and accessible station search remain present", () => {
  assert.match(html, /id="mobile-filter-button"/);
  assert.match(html, /id="close-sidebar-button"/);
  assert.match(html, /id="sidebar-backdrop"/);
  assert.match(html, /id="station-results"/);
  assert.match(html, /role="combobox"/);
  assert.match(html, /aria-controls="station-results"/);
});

test("wrapper cache-busts and loads all application features", () => {
  assert.match(wrapper, /BUILD_VERSION = "1\.6\.2"/);
  assert.match(wrapper, /asset\("\.\/app-core\.js"\)/);
  assert.match(wrapper, /asset\("\.\/route-feature\.js"\)/);
  assert.match(wrapper, /asset\("\.\/traffic-feature\.js"\)/);
  assert.match(wrapper, /asset\("\.\/forecast-bootstrap\.js"\)/);
  assert.match(wrapper, /asset\("\.\/beta-feature\.js"\)/);
  assert.match(wrapper, /asset\("\.\/radar-feature\.js"\)/);
  assert.match(wrapper, /asset\("\.\/radar-ux-hotfix\.js"\)/);
  assert.match(wrapper, /asset\("\.\/radar-polish\.js"\)/);
  assert.match(wrapper, /window\.__ajokeliMap/);
  assert.match(forecastBootstrap, /await import\("\.\/forecast-feature\.js"\)/);
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

test("forecast feature uses current simple forecast-section endpoints and departure comparison", () => {
  assert.match(forecastFeature, /\/api\/weather\/v1\/forecast-sections-simple/);
  assert.match(
    forecastFeature,
    /\/api\/weather\/v1\/forecast-sections-simple\/forecasts/,
  );
  assert.match(forecastFeature, /id="forecast-departure-select"/);
  assert.match(forecastFeature, /forecast-summary-section/);
  assert.match(forecastFeature, /route-weather-forecast-lines/);
  assert.match(forecast, /buildDepartureOptions/);
  assert.match(forecast, /compareDepartureOptions/);
  assert.match(forecast, /FORECAST_CORRIDOR_KM/);
});

test("radar feature uses FMI Download Service GeoTIFF data and explains empty views", () => {
  assert.match(radarFeature, /id="radar-toggle-button"/);
  assert.match(radarFeature, /aria-pressed="false"/);
  assert.match(radarFeature, /fmi-radar-layer/);
  assert.match(radarFeature, /image\/geotiff/);
  assert.match(radarFeature, /geotiff@2\.1\.3/);
  assert.match(radarFeature, /radar-summary-section/);
  assert.match(radar, /fmi::radar::composite::rr/);
  assert.match(radar, /buildRadarGeoTiffUrl/);
  assert.match(radar, /analyzeRouteRain/);
  assert.match(radarHelp, /ei pilvipeitettä/i);
  assert.match(radarHelp, /Näytä koko Suomi/);
  assert.match(radarPolish, /Ei havaittua sadetta Suomessa/);
  assert.match(radarPolish, /Näytä sadealueet/);
  assert.match(radarPolish, /max-width: min\(204px/);
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
