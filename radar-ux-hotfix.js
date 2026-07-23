const APP_VERSION = "1.6.1";
const map = window.__ajokeliMap ?? null;
let lastObservationLabel = "";

applyVersionLabels();
injectRadarExplanation();
bindRadarHelp();

function applyVersionLabels() {
  document.documentElement.dataset.appVersion = APP_VERSION;
  document.querySelectorAll(".beta-badge").forEach((badge) => {
    badge.textContent = `Beta · v${APP_VERSION}`;
  });

  const overviewVersion = document.querySelector("#beta-route-overview .muted.small");
  if (overviewVersion) overviewVersion.textContent = `v${APP_VERSION} beta`;
}

function injectRadarExplanation() {
  const details = document.querySelector("#radar-control-details");
  if (!details || details.querySelector(".radar-explanation")) return;

  const note = document.createElement("p");
  note.className = "radar-explanation";
  note.innerHTML = `
    Sadetutka näyttää <strong>sateen intensiteetin</strong>, ei pilvipeitettä.
    Tyhjä kartta tarkoittaa yleensä, ettei näkyvällä alueella ole havaittua sadetta.
  `;
  details.append(note);

  const style = document.createElement("style");
  style.dataset.feature = "radar-visibility-hotfix";
  style.textContent = `
    .radar-explanation {
      margin: 8px 0 0;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      color: var(--muted);
      font-size: 0.64rem;
      line-height: 1.4;
    }

    .radar-explanation strong {
      color: var(--text);
    }

    .radar-map-actions {
      margin-top: 7px;
      display: flex;
      gap: 8px;
    }

    .radar-map-actions .text-button {
      font-size: 0.64rem;
    }
  `;
  document.head.append(style);

  const actions = document.createElement("div");
  actions.className = "radar-map-actions";
  actions.innerHTML = `
    <button id="radar-show-finland" class="text-button" type="button">
      Näytä koko Suomi
    </button>
  `;
  details.append(actions);
  bindShowFinland();
}

function bindShowFinland() {
  const button = document.querySelector("#radar-show-finland");
  if (!button || button.dataset.bound === "true") return;
  button.dataset.bound = "true";
  button.addEventListener("click", () => {
    map?.fitBounds(
      [
        [19.1, 59.7],
        [31.7, 70.1],
      ],
      { padding: 34, duration: 700 },
    );
  });
}

function updateRadarStatus(detail = {}) {
  const status = document.querySelector("#radar-status-text");
  if (!status || !detail.enabled || detail.loading || detail.error) return;

  if (!lastObservationLabel && /\d{1,2}[.:]\d{2}/.test(status.textContent)) {
    lastObservationLabel = status.textContent.trim();
  }

  const routeLevel = detail.analysis?.level;
  if (!routeLevel || !lastObservationLabel) return;

  status.textContent =
    routeLevel.key === "none"
      ? `Ei sadetta reitillä · ${lastObservationLabel}`
      : `${routeLevel.label} reitillä · ${lastObservationLabel}`;
}

function bindRadarHelp() {
  bindShowFinland();

  window.addEventListener("ajokeli:radar-state", (event) => {
    applyVersionLabels();
    injectRadarExplanation();
    updateRadarStatus(event.detail);
  });

  const observer = new MutationObserver(() => {
    applyVersionLabels();
    injectRadarExplanation();
    bindShowFinland();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
