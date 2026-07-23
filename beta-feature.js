import {
  APP_VERSION,
  buildShareUrl,
  parseSharedRoute,
  pickClosestDeparture,
} from "./beta.js";

const routePanel = document.querySelector(".route-panel");
const routeSummary = document.querySelector("#route-summary");
const routeForm = document.querySelector("#route-form");
const fromInput = document.querySelector("#route-from-input");
const toInput = document.querySelector("#route-to-input");
const fromSearch = document.querySelector("#route-from-search");
const toSearch = document.querySelector("#route-to-search");
const submitButton = document.querySelector("#route-submit-button");
const routeActions = document.querySelector(".route-actions");

const state = {
  detailsExpanded: false,
  renderScheduled: false,
  restoring: false,
  sharedRoute: parseSharedRoute(window.location.search),
};

injectStyles();
injectBetaBadge();
injectFooterLinks();
injectShareControls();
injectSharedRoutePrompt();
bindBetaEvents();
scheduleOverviewRender();

function injectStyles() {
  const style = document.createElement("style");
  style.dataset.feature = "beta-readiness";
  style.textContent = `
    .beta-badge {
      display: inline-flex;
      align-items: center;
      margin-top: 8px;
      padding: 4px 8px;
      border: 1px solid rgba(98, 168, 255, 0.38);
      border-radius: 999px;
      color: #b9d9ff;
      background: rgba(98, 168, 255, 0.1);
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .shared-route-prompt {
      margin: 0 0 13px;
      padding: 10px;
      border: 1px solid rgba(98, 168, 255, 0.34);
      border-radius: 10px;
      background: rgba(98, 168, 255, 0.08);
    }

    .shared-route-prompt strong,
    .shared-route-prompt span {
      display: block;
    }

    .shared-route-prompt span {
      margin-top: 4px;
      color: var(--muted);
      font-size: 0.72rem;
      line-height: 1.4;
    }

    .shared-route-prompt .button {
      width: 100%;
      margin-top: 9px;
    }

    .beta-overview {
      margin-top: 13px;
      padding: 12px;
      border: 1px solid rgba(98, 168, 255, 0.24);
      border-radius: 12px;
      background:
        radial-gradient(circle at top right, rgba(98, 168, 255, 0.12), transparent 52%),
        rgba(0, 0, 0, 0.11);
    }

    .beta-overview-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .beta-overview-heading h3 {
      margin: 0;
      font-size: 0.86rem;
    }

    .beta-route-meta,
    .beta-updated {
      margin: 4px 0 0;
      color: var(--muted);
      font-size: 0.68rem;
      line-height: 1.4;
    }

    .beta-status-grid {
      margin-top: 10px;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 7px;
    }

    .beta-status-card {
      min-width: 0;
      padding: 9px 7px;
      border: 1px solid var(--border);
      border-radius: 9px;
      background: rgba(255, 255, 255, 0.025);
    }

    .beta-status-card span,
    .beta-status-card strong {
      display: block;
    }

    .beta-status-card span {
      color: var(--muted);
      font-size: 0.62rem;
    }

    .beta-status-card strong {
      margin-top: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 0.76rem;
      line-height: 1.3;
    }

    .beta-details-toggle {
      width: 100%;
      min-height: 42px;
      margin-top: 10px;
    }

    #route-summary.beta-details-collapsed > .route-summary-section,
    #route-summary.beta-details-collapsed > .route-disclaimer {
      display: none;
    }

    .beta-footer-links {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 10px 16px;
      font-size: 0.72rem;
    }

    .beta-footer-links a {
      color: var(--accent);
    }

    .beta-network-note {
      position: fixed;
      right: 14px;
      bottom: 14px;
      z-index: 30;
      max-width: min(360px, calc(100vw - 28px));
      padding: 10px 12px;
      border: 1px solid rgba(245, 200, 76, 0.4);
      border-radius: 10px;
      color: #ffe39a;
      background: rgba(11, 18, 32, 0.96);
      box-shadow: var(--shadow);
      font-size: 0.72rem;
      line-height: 1.4;
    }

    @media (max-width: 540px) {
      .beta-status-grid {
        grid-template-columns: 1fr;
      }

      .beta-status-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .beta-status-card strong {
        margin-top: 0;
        text-align: right;
      }
    }
  `;
  document.head.append(style);
}

function injectBetaBadge() {
  const headingContainer = document.querySelector(".topbar > div:first-child");
  if (!headingContainer || headingContainer.querySelector(".beta-badge")) return;

  const badge = document.createElement("span");
  badge.className = "beta-badge";
  badge.textContent = `Beta · v${APP_VERSION}`;
  headingContainer.append(badge);
}

function injectFooterLinks() {
  const footer = document.querySelector(".footer");
  if (!footer || footer.querySelector(".beta-footer-links")) return;

  const links = document.createElement("p");
  links.className = "beta-footer-links";
  links.innerHTML = `
    <a
      href="https://github.com/watisdiz/ajokeli-nyt/blob/main/CHANGELOG.md"
      target="_blank"
      rel="noopener noreferrer"
    >
      Muutoshistoria
    </a>
    <a href="./privacy.html">Tietosuoja</a>
    <a
      href="https://github.com/watisdiz/ajokeli-nyt/blob/main/BETA_TESTING.md"
      target="_blank"
      rel="noopener noreferrer"
    >
      Beta-testauksen tarkistuslista
    </a>
    <a
      href="https://github.com/watisdiz/ajokeli-nyt/issues/new"
      target="_blank"
      rel="noopener noreferrer"
    >
      Anna palautetta
    </a>
  `;
  footer.append(links);
}

function injectShareControls() {
  if (!routeActions || routeActions.querySelector("#route-share-button")) return;

  const button = document.createElement("button");
  button.id = "route-share-button";
  button.className = "button button-secondary hidden";
  button.type = "button";
  button.textContent = "Jaa reitti";
  routeActions.append(button);
}

function injectSharedRoutePrompt() {
  if (!state.sharedRoute || !routePanel || !routeForm) return;

  const prompt = document.createElement("div");
  prompt.id = "shared-route-prompt";
  prompt.className = "shared-route-prompt";
  prompt.innerHTML = `
    <strong>Jaettu reitti</strong>
    <span>
      ${escapeHtml(state.sharedRoute.from)} → ${escapeHtml(state.sharedRoute.to)}
    </span>
    <button id="load-shared-route-button" class="button route-primary" type="button">
      Lataa jaettu reitti
    </button>
    <span id="shared-route-status" role="status" aria-live="polite">
      Paikkahaut käynnistyvät vasta painikkeesta.
    </span>
  `;
  routePanel.insertBefore(prompt, routeForm);
}

function bindBetaEvents() {
  document.querySelector("#route-share-button")?.addEventListener("click", shareRoute);
  document
    .querySelector("#load-shared-route-button")
    ?.addEventListener("click", restoreSharedRoute);

  routeSummary?.addEventListener("click", (event) => {
    const toggle = event.target.closest("#beta-details-toggle");
    if (!toggle) return;
    state.detailsExpanded = !state.detailsExpanded;
    scheduleOverviewRender();
  });

  routeSummary?.addEventListener("change", (event) => {
    if (event.target.id === "forecast-departure-select") {
      scheduleOverviewRender();
    }
  });

  if (routeSummary) {
    const observer = new MutationObserver((mutations) => {
      const onlyBetaChanges = mutations.every((mutation) => {
        const target =
          mutation.target?.nodeType === Node.ELEMENT_NODE
            ? mutation.target
            : mutation.target?.parentElement;
        if (target?.closest?.("#beta-route-overview")) return true;

        const changed = [
          ...(mutation.addedNodes ?? []),
          ...(mutation.removedNodes ?? []),
        ].filter((node) => node.nodeType === Node.ELEMENT_NODE);

        return (
          changed.length > 0 &&
          changed.every(
            (node) =>
              node.id === "beta-route-overview" ||
              node.id === "beta-details-toggle" ||
              node.closest?.("#beta-route-overview"),
          )
        );
      });

      if (!onlyBetaChanges) scheduleOverviewRender();
    });

    observer.observe(routeSummary, {
      attributes: true,
      attributeFilter: ["class"],
      childList: true,
      subtree: true,
    });
  }

  const timestamp = document.querySelector("#data-timestamp");
  if (timestamp) {
    new MutationObserver(scheduleOverviewRender).observe(timestamp, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  window.addEventListener("ajokeli:request-timeout", (event) => {
    showNetworkNote(
      `Yhteys palveluun ${event.detail?.host || ""} aikakatkaistiin. Toimintoa voi yrittää uudelleen.`,
    );
  });
  window.addEventListener("ajokeli:request-complete", scheduleOverviewRender);
}

function scheduleOverviewRender() {
  if (state.renderScheduled) return;
  state.renderScheduled = true;
  window.setTimeout(() => {
    state.renderScheduled = false;
    renderOverview();
  }, 60);
}

function renderOverview() {
  if (!routeSummary) return;

  const routeHeader = routeSummary.querySelector(".route-summary-header");
  const shareButton = document.querySelector("#route-share-button");
  const routeActive = Boolean(routeHeader) && !routeSummary.classList.contains("hidden");

  shareButton?.classList.toggle("hidden", !routeActive);

  if (!routeActive) {
    routeSummary.querySelector("#beta-route-overview")?.remove();
    routeSummary.querySelector("#beta-details-toggle")?.remove();
    routeSummary.classList.remove("beta-details-collapsed");
    return;
  }

  let overview = routeSummary.querySelector("#beta-route-overview");
  if (!overview) {
    overview = document.createElement("section");
    overview.id = "beta-route-overview";
    overview.className = "beta-overview";
    routeHeader.insertAdjacentElement("afterend", overview);
  }

  const observed = cleanText(routeSummary.querySelector(".route-worst")) || "Ei arviota";
  const traffic = trafficStatus();
  const forecast = forecastStatus();
  const routeMeta = cleanText(routeSummary.querySelector(".route-summary-meta"));
  const updated = updatedStatus();

  overview.innerHTML = `
    <div class="beta-overview-heading">
      <h3>Reitin yhteenveto</h3>
      <span class="muted small">v${APP_VERSION} beta</span>
    </div>
    ${routeMeta ? `<p class="beta-route-meta">${escapeHtml(routeMeta)}</p>` : ""}
    <div class="beta-status-grid">
      ${statusCard("Ajokeli nyt", observed)}
      ${statusCard("Liikennetilanne", traffic)}
      ${statusCard("Ennuste", forecast)}
    </div>
    <p class="beta-updated">${escapeHtml(updated)}</p>
  `;

  let toggle = routeSummary.querySelector("#beta-details-toggle");
  if (!toggle) {
    toggle = document.createElement("button");
    toggle.id = "beta-details-toggle";
    toggle.className = "button button-secondary beta-details-toggle";
    toggle.type = "button";
    overview.insertAdjacentElement("afterend", toggle);
  }

  toggle.textContent = state.detailsExpanded
    ? "Piilota yksityiskohdat"
    : "Näytä asemat, ennusteet ja häiriöt";
  toggle.setAttribute("aria-expanded", String(state.detailsExpanded));
  routeSummary.classList.toggle("beta-details-collapsed", !state.detailsExpanded);
}

function updatedStatus() {
  const observation = cleanText(document.querySelector("#data-timestamp"));
  const completed = window.__ajokeliNetworkGuard?.lastCompleted ?? {};
  const parts = [];

  if (observation) parts.push(observation);
  if (completed.traffic) parts.push(`Liikenne haettu ${formatClock(completed.traffic)}`);
  if (completed.forecast) parts.push(`Ennuste haettu ${formatClock(completed.forecast)}`);

  return parts.length
    ? parts.join(" · ")
    : "Päivitysaika ei ole vielä saatavilla.";
}

function formatClock(timestamp) {
  return new Intl.DateTimeFormat("fi-FI", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
}

function statusCard(label, value) {
  return `
    <div class="beta-status-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function trafficStatus() {
  const section = document.querySelector("#traffic-summary-section");
  if (!section) return "Ladataan…";

  const cards = [...section.querySelectorAll(".traffic-count-card")]
    .map((card) => cleanText(card))
    .filter(Boolean);

  if (cards.length) return cards.slice(0, 2).join(" · ");
  return cleanText(section.querySelector(".traffic-summary-badge")) || "Ei saatavilla";
}

function forecastStatus() {
  const section = document.querySelector("#forecast-summary-section");
  if (!section) return "Ladataan…";
  return cleanText(section.querySelector(".forecast-summary-badge")) || "Ei saatavilla";
}

async function shareRoute() {
  const button = document.querySelector("#route-share-button");
  const from = fromInput?.value;
  const to = toInput?.value;
  const departure = document.querySelector("#forecast-departure-select")?.value ?? "";

  if (!from || !to) return;

  const shareUrl = buildShareUrl(window.location.href, { from, to, departure });
  window.history.replaceState({}, "", shareUrl);

  try {
    await navigator.clipboard.writeText(shareUrl);
    temporarilyLabel(button, "Linkki kopioitu");
  } catch {
    window.prompt("Kopioi reittilinkki:", shareUrl);
    temporarilyLabel(button, "Linkki valmis");
  }
}

async function restoreSharedRoute() {
  if (!state.sharedRoute || state.restoring) return;

  const button = document.querySelector("#load-shared-route-button");
  const status = document.querySelector("#shared-route-status");
  state.restoring = true;
  button.disabled = true;
  button.textContent = "Ladataan…";

  try {
    setSharedStatus(status, "Haetaan lähtöpaikkaa…");
    await searchAndSelect("from", state.sharedRoute.from);

    setSharedStatus(status, "Haetaan määränpäätä…");
    await searchAndSelect("to", state.sharedRoute.to);

    setSharedStatus(status, "Lasketaan reittiä…");
    submitButton?.click();

    await waitFor(
      () =>
        !routeSummary?.classList.contains("hidden") &&
        routeSummary?.querySelector(".route-summary-header"),
      22_000,
    );

    if (state.sharedRoute.departure) {
      setSharedStatus(status, "Asetetaan jaettu ennusteaika…");
      const select = await waitFor(
        () => document.querySelector("#forecast-departure-select"),
        22_000,
        true,
      ).catch(() => null);

      if (select) {
        const selected = pickClosestDeparture([...select.options], state.sharedRoute.departure);
        if (selected) {
          select.value = selected;
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    }

    setSharedStatus(status, "Jaettu reitti ladattu. Tarkista valitut paikat.");
    document.querySelector("#shared-route-prompt")?.classList.add("hidden");
    scheduleOverviewRender();
  } catch (error) {
    console.error(error);
    setSharedStatus(
      status,
      `Jaettua reittiä ei voitu ladata (${error.message}). Hae paikat käsin.`,
    );
    button.disabled = false;
    button.textContent = "Yritä uudelleen";
  } finally {
    state.restoring = false;
  }
}

async function searchAndSelect(kind, label) {
  const input = kind === "from" ? fromInput : toInput;
  const searchButton = kind === "from" ? fromSearch : toSearch;
  const resultsSelector =
    kind === "from" ? "#route-from-results" : "#route-to-results";

  input.value = label;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  searchButton.click();

  const resultButton = await waitFor(
    () => document.querySelector(`${resultsSelector} .route-place-result`),
    16_000,
    true,
  );

  resultButton.click();

  await waitFor(
    () => input.classList.contains("route-selected"),
    3_000,
  );
}

function waitFor(predicate, timeoutMs, returnValue = false) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const check = () => {
      const result = predicate();
      if (result) {
        resolve(returnValue ? result : true);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error("toiminto aikakatkaistiin"));
        return;
      }

      window.setTimeout(check, 80);
    };

    check();
  });
}

function setSharedStatus(element, message) {
  if (element) element.textContent = message;
}

function temporarilyLabel(button, label) {
  if (!button) return;
  const original = button.textContent;
  button.textContent = label;
  window.setTimeout(() => {
    button.textContent = original;
  }, 2_000);
}

function showNetworkNote(message) {
  document.querySelector(".beta-network-note")?.remove();

  const note = document.createElement("div");
  note.className = "beta-network-note";
  note.setAttribute("role", "status");
  note.textContent = message;
  document.body.append(note);

  window.setTimeout(() => note.remove(), 6_000);
}

function cleanText(element) {
  return String(element?.textContent ?? "").trim().replace(/\s+/g, " ");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
