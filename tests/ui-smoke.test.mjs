import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [html, app, css] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../styles.css", import.meta.url), "utf8"),
]);

test("mobile controls and accessible station search are present", () => {
  assert.match(html, /id="mobile-filter-button"/);
  assert.match(html, /id="close-sidebar-button"/);
  assert.match(html, /id="sidebar-backdrop"/);
  assert.match(html, /id="station-results"/);
  assert.match(html, /role="combobox"/);
  assert.match(html, /aria-controls="station-results"/);
});

test("application wires mobile panels and details closing", () => {
  assert.match(app, /function setSidebarOpen/);
  assert.match(app, /close-details-button/);
  assert.match(app, /function closeDetails/);
  assert.match(app, /function renderSearchResults/);
  assert.match(app, /data-action="retry-data"/);
});

test("production map style and responsive bottom sheet remain configured", () => {
  assert.match(app, /https:\/\/tiles\.openfreemap\.org\/styles\/positron/);
  assert.doesNotMatch(app, /demotiles\.maplibre\.org/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /\.sidebar\.mobile-open/);
  assert.match(css, /\.details-panel:not\(\.has-content\)/);
});

test("favicon and social metadata are included", () => {
  assert.match(html, /rel="icon" href="\.\/favicon\.svg"/);
  assert.match(html, /property="og:title" content="Ajokeli nyt"/);
  assert.match(html, /name="twitter:card" content="summary"/);
});
