export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
