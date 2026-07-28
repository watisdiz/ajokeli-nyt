export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// A stored choice wins, otherwise follow the system preference. This lives
// here rather than in theme-toggle.js because the map needs the same answer
// to pick its basemap, and two copies of the rule would drift apart.
export function resolveTheme() {
  const stored = document.documentElement.dataset.theme;
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function bindImageFallback(root, selector = ".camera-card img") {
  const image = root?.querySelector(selector);
  image?.addEventListener(
    "error",
    () => {
      const card = image.closest(".camera-card");
      if (card) card.style.display = "none";
    },
    { once: true },
  );
}
