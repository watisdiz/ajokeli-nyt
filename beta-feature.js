import {
  APP_VERSION,
  buildShareUrl,
  parseSharedRoute,
  pickClosestDeparture,
} from "./beta.js";
import { escapeHtml } from "./dom-utils.js";
import { formatRouteDistance, formatRouteDuration } from "./route.js";
import { EVENTS } from "./events.js";

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
  route: null,
  routeAnalysis: null,
  trafficStatusText: "Ladataan…",
  forecastStatusText: "Ladataan…",
  observationsText: "",
};

injectBetaBadge();
injectFooterLinks();
injectShareControls();
injectSharedRoutePrompt();
bindBetaEvents();
scheduleOverviewRender();

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

  window.addEventListener(EVENTS.ROUTE_CHANGED, (event) => {
    state.route = event.detail.route;
    state.routeAnalysis = event.detail.analysis;
    scheduleOverviewRender();
  });

  window.addEventListener(EVENTS.TRAFFIC_CHANGED, (event) => {
    state.trafficStatusText = trafficStatusText(event.detail);
    scheduleOverviewRender();
  });

  window.addEventListener(EVENTS.FORECAST_CHANGED, (event) => {
    state.forecastStatusText = forecastStatusText(event.detail);
    scheduleOverviewRender();
  });

  window.addEventListener(EVENTS.OBSERVATIONS_CHANGED, (event) => {
    state.observationsText = event.detail.timestampText ?? "";
    scheduleOverviewRender();
  });

  window.addEventListener(EVENTS.REQUEST_TIMEOUT, (event) => {
    showNetworkNote(
      `Yhteys palveluun ${event.detail?.host || ""} aikakatkaistiin. Toimintoa voi yrittää uudelleen.`,
    );
  });
  window.addEventListener(EVENTS.REQUEST_COMPLETE, scheduleOverviewRender);
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

  const shareButton = document.querySelector("#route-share-button");
  const routeActive = Boolean(state.route);

  shareButton?.classList.toggle("hidden", !routeActive);

  if (!routeActive) {
    routeSummary.querySelector("#beta-route-overview")?.remove();
    routeSummary.querySelector("#beta-details-toggle")?.remove();
    routeSummary.classList.remove("beta-details-collapsed");
    return;
  }

  const routeHeader = routeSummary.querySelector(".route-summary-header");
  if (!routeHeader) return;

  let overview = routeSummary.querySelector("#beta-route-overview");
  if (!overview) {
    overview = document.createElement("section");
    overview.id = "beta-route-overview";
    overview.className = "beta-overview";
    routeHeader.insertAdjacentElement("afterend", overview);
  }

  const observed = state.routeAnalysis?.worstLevel?.label ?? "Ei asemia";
  const traffic = state.trafficStatusText;
  const forecast = state.forecastStatusText;
  const routeMeta = `${formatRouteDistance(state.route.distance)} · noin ${formatRouteDuration(state.route.duration)}`;
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
  const completed = window.__ajokeliNetworkGuard?.lastCompleted ?? {};
  const parts = [];

  if (state.observationsText) parts.push(state.observationsText);
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
  const loadingClass = value === "Ladataan…" ? "is-loading" : "";
  return `
    <div class="beta-status-card">
      <span>${escapeHtml(label)}</span>
      <strong class="${loadingClass}">${escapeHtml(value)}</strong>
    </div>
  `;
}

function trafficStatusText(detail) {
  if (detail.status === "ready") {
    return `${detail.analysis.counts.roadwork} tietyötä · ${detail.analysis.counts.traffic} häiriötä`;
  }
  if (detail.status === "loading") return "Ladataan…";
  return "Ei saatavilla";
}

function forecastStatusText(detail) {
  if (detail.status === "ready") return detail.label;
  if (detail.status === "loading") return "Ladataan…";
  return "Ei saatavilla";
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
    const routeReady = waitForRouteChange(22_000);
    submitButton?.click();
    await routeReady;

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

function waitForRouteChange(timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener(EVENTS.ROUTE_CHANGED, handleChange);
      reject(new Error("toiminto aikakatkaistiin"));
    }, timeoutMs);

    function handleChange(event) {
      if (!event.detail.route) return;
      window.clearTimeout(timeout);
      window.removeEventListener(EVENTS.ROUTE_CHANGED, handleChange);
      resolve();
    }

    window.addEventListener(EVENTS.ROUTE_CHANGED, handleChange);
  });
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
