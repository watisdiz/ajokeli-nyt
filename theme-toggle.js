const STORAGE_KEY = "ajokeli-theme";
const root = document.documentElement;

function systemPrefersLight() {
  return window.matchMedia("(prefers-color-scheme: light)").matches;
}

function currentTheme() {
  return root.dataset.theme || (systemPrefersLight() ? "light" : "dark");
}

function applyTheme(theme) {
  root.dataset.theme = theme;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage disabled — theme still applies for this page load, just
    // won't persist across reloads.
  }
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

  const theme = currentTheme();
  const button = document.createElement("button");
  button.id = "theme-toggle-button";
  button.className = "icon-button theme-toggle-button";
  button.type = "button";
  button.setAttribute("aria-label", labelFor(theme));
  button.textContent = iconFor(theme);
  actions.prepend(button);

  button.addEventListener("click", () => {
    const next = currentTheme() === "light" ? "dark" : "light";
    applyTheme(next);
    button.textContent = iconFor(next);
    button.setAttribute("aria-label", labelFor(next));
  });
}

injectToggle();
