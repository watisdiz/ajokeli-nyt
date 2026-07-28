import { resolveTheme } from "./dom-utils.js?v=1.9.4";
import { EVENTS, emit } from "./events.js?v=1.9.4";

const STORAGE_KEY = "ajokeli-theme";
const root = document.documentElement;

function applyTheme(theme) {
  root.dataset.theme = theme;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage disabled — theme still applies for this page load, just
    // won't persist across reloads.
  }
  // The map picks its basemap from the theme and cannot read CSS variables,
  // so it needs telling. Goes over the event bus like every other
  // cross-feature signal.
  emit(EVENTS.THEME_CHANGED, { theme });
}

function labelFor(theme) {
  return theme === "light" ? "Tumma teema" : "Vaalea teema";
}

function iconFor(theme) {
  return theme === "light" ? "🌙" : "☀️";
}

function injectToggle() {
  const actions = document.querySelector(".topbar-actions");
  if (!actions || actions.querySelector("#theme-toggle-button")) return;

  const theme = resolveTheme();
  const button = document.createElement("button");
  button.id = "theme-toggle-button";
  button.className = "icon-button theme-toggle-button";
  button.type = "button";
  button.setAttribute("aria-label", labelFor(theme));
  button.textContent = iconFor(theme);
  actions.prepend(button);

  button.addEventListener("click", () => {
    const next = resolveTheme() === "light" ? "dark" : "light";
    applyTheme(next);
    button.textContent = iconFor(next);
    button.setAttribute("aria-label", labelFor(next));
  });
}

injectToggle();
