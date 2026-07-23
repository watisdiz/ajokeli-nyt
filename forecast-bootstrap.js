const OriginalMutationObserver = window.MutationObserver;

if (!OriginalMutationObserver) {
  await import("./forecast-feature.js");
} else {
  window.MutationObserver = class ForecastMutationObserver extends OriginalMutationObserver {
    constructor(callback) {
      super((mutations, observer) => {
        const relevant = mutations.some((mutation) => {
          if (mutation.type === "attributes") return true;

          const targetElement =
            mutation.target?.nodeType === Node.ELEMENT_NODE ? mutation.target : null;
          if (
            targetElement?.id === "forecast-summary-section" ||
            targetElement?.closest?.("#forecast-summary-section")
          ) {
            return false;
          }

          const changedNodes = [
            ...(mutation.addedNodes ?? []),
            ...(mutation.removedNodes ?? []),
          ].filter((node) => node.nodeType === Node.ELEMENT_NODE);

          if (
            changedNodes.length &&
            changedNodes.every(
              (node) =>
                node.id === "forecast-summary-section" ||
                node.closest?.("#forecast-summary-section"),
            )
          ) {
            return false;
          }

          return true;
        });

        if (relevant) callback(mutations, observer);
      });
    }
  };

  try {
    await import("./forecast-feature.js");
  } finally {
    window.MutationObserver = OriginalMutationObserver;
  }
}
