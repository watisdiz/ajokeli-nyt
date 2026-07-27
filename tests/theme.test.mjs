import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createHarness, freshImport } from "./dom-harness.mjs";

// Two kinds of theme coverage:
//
//   1. theme-toggle.js actually flips the attribute the CSS keys off, keeps
//      the button's accessible name in sync, and persists the choice.
//   2. The map overlays don't reintroduce hardcoded dark backgrounds. Those
//      overlays inherit their text color from --text, so a fixed dark
//      background renders near-black text on near-black in the light theme.
//      Shipped that way in 1.8.0 and got caught only in manual testing.

test("the theme toggle flips the theme, the label, and the stored preference", async () => {
  const harness = await createHarness();
  const { document, window } = harness;

  try {
    await freshImport("../theme-toggle.js");

    const button = document.querySelector("#theme-toggle-button");
    assert.ok(button, "expected the toggle to be injected into .topbar-actions");

    // jsdom reports no light preference, so the starting point is dark and
    // the button offers the other direction.
    assert.equal(button.getAttribute("aria-label"), "Vaalea teema");

    button.click();
    assert.equal(document.documentElement.dataset.theme, "light");
    assert.equal(button.getAttribute("aria-label"), "Tumma teema");
    assert.equal(window.localStorage.getItem("ajokeli-theme"), "light");

    button.click();
    assert.equal(document.documentElement.dataset.theme, "dark");
    assert.equal(button.getAttribute("aria-label"), "Vaalea teema");
    assert.equal(window.localStorage.getItem("ajokeli-theme"), "dark");
  } finally {
    harness.cleanup();
  }
});

// Every background these selectors get, across all rules that name them --
// they appear in grouped and media-query rules too, so matching only the
// first one silently checks the wrong block.
function backgroundsFor(css, selector) {
  const backgrounds = [];
  for (const [, selectorList, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!selectorList.split(",").some((one) => one.trim() === selector)) continue;
    for (const [, value] of body.matchAll(/background(?:-color)?:\s*([^;]+);/g)) {
      backgrounds.push(value.trim());
    }
  }
  return backgrounds;
}

test("map overlays take their background from theme tokens", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  for (const selector of [".map-action-button", ".map-legend", ".map-message"]) {
    const backgrounds = backgroundsFor(css, selector);
    assert.ok(backgrounds.length > 0, `expected ${selector} to declare a background`);

    for (const background of backgrounds) {
      assert.match(
        background,
        /var\(--|color-mix\(/,
        `${selector} background must come from a token, not a fixed color`,
      );
    }
  }

  // The specific literal that broke the light theme in 1.8.0.
  assert.doesNotMatch(
    css,
    /background:\s*rgba\(7,\s*16,\s*29/,
    "hardcoded dark navy background reintroduced",
  );
});
