(function () {
  try {
    var stored = window.localStorage.getItem("ajokeli-theme");
    if (stored === "light" || stored === "dark") {
      document.documentElement.dataset.theme = stored;
    }
  } catch (error) {
    // Storage disabled (private browsing etc.) — falls back to
    // prefers-color-scheme, handled entirely in CSS.
  }
})();
