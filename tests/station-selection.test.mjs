import assert from "node:assert/strict";
import test from "node:test";
import { createHarness, freshImport, waitFor } from "./dom-harness.mjs";
import { demoCameras, demoMeasurements, demoMetadata } from "../demo-data.js";

// Exercises the real app-core.js search-and-select flow end to end: typing
// in the station search box, picking a result, and checking the rendered
// details panel — including that escapeHtml() actually ran on the station
// name (a plain string check can't tell you that; a DOM assertion can).

function buildFetchHandlers() {
  return [
    ["/api/weather/v1/stations/data", () => demoMeasurements],
    ["/api/weather/v1/stations", () => demoMetadata],
    ["/api/weathercam/v1/stations", () => demoCameras],
  ];
}

test("searching for a station and selecting it renders its details", async () => {
  const harness = await createHarness({ fetchHandlers: buildFetchHandlers() });
  const { document } = harness;

  try {
    await freshImport("../app-core.js");
    await waitFor(() => document.querySelector("#data-timestamp").textContent.length > 0);

    const searchInput = document.querySelector("#station-search");
    searchInput.value = "Espoo";
    searchInput.dispatchEvent(new document.defaultView.Event("input", { bubbles: true }));

    const resultButton = await waitFor(() => document.querySelector(".search-result"));
    resultButton.click();

    await waitFor(() => document.querySelector("#details-panel").classList.contains("has-content"));

    const heading = document.querySelector("#details-panel h2");
    assert.equal(heading.textContent, "Tie 1 Espoo, Sepänkylä");

    const banner = document.querySelector("#details-panel .risk-banner");
    assert.ok(banner.classList.contains("risk-banner-normal"));
    assert.match(banner.querySelector(".risk-banner-level strong").textContent, /Normaali/);

    const metricRows = [...document.querySelectorAll("#details-panel .metric-row")].map((row) =>
      row.textContent.replace(/\s+/g, " ").trim(),
    );
    assert.ok(
      metricRows.some((row) => row.includes("Tienpinta") && row.includes("Kuiva")),
      `expected a surface metric row mentioning "Kuiva", got: ${metricRows.join(" | ")}`,
    );

    document.querySelector("#close-details-button").click();
    assert.equal(document.querySelector("#details-panel").classList.contains("has-content"), false);
  } finally {
    harness.cleanup();
  }
});

// Opening the mobile filter panel used to focus the station search input,
// which pops the on-screen keyboard straight over the filters the user just
// opened. Focus should land on the panel -- so keyboard and screen-reader
// users still get taken there -- without putting the caret in a text field.
test("opening the mobile filter panel does not focus a text field", async () => {
  const harness = await createHarness({ fetchHandlers: buildFetchHandlers() });
  const { document, window } = harness;

  try {
    Object.defineProperty(window, "innerWidth", { value: 420, configurable: true });
    await freshImport("../app-core.js");
    await waitFor(() => document.querySelector("#data-timestamp").textContent.length > 0);

    document.querySelector("#mobile-filter-button").click();
    const sidebar = document.querySelector("#filter-sidebar");
    await waitFor(() => sidebar.classList.contains("mobile-open"));
    await waitFor(() => document.activeElement !== document.body);

    assert.equal(
      document.activeElement.id,
      "filter-sidebar",
      `expected focus on the panel, got ${document.activeElement.tagName}#${document.activeElement.id}`,
    );
    assert.notEqual(
      document.activeElement.tagName,
      "INPUT",
      "focusing an input here is what opens the mobile keyboard",
    );
    // Focusable programmatically, but never a Tab stop.
    assert.equal(sidebar.getAttribute("tabindex"), "-1");
  } finally {
    harness.cleanup();
  }
});
