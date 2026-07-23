import { APP_VERSION } from "./beta.js";

const nativeFetch = window.fetch.bind(window);
const guardedHosts = new Map([
  ["tie.digitraffic.fi", 12_000],
  ["nominatim.openstreetmap.org", 12_000],
  ["router.project-osrm.org", 15_000],
]);
const lastCompleted = {};

function requestUrl(input) {
  try {
    return new URL(typeof input === "string" ? input : input.url, window.location.href);
  } catch {
    return null;
  }
}

function requestHeaders(input, init, url) {
  const initial =
    init.headers ?? (typeof Request !== "undefined" && input instanceof Request
      ? input.headers
      : undefined);
  const headers = new Headers(initial ?? {});

  if (url?.hostname === "tie.digitraffic.fi" && headers.has("Digitraffic-User")) {
    headers.set("Digitraffic-User", `AjokeliNyt/MVP ${APP_VERSION}`);
  }

  return headers;
}

function requestCategory(url) {
  if (!url) return "other";
  if (url.hostname === "nominatim.openstreetmap.org") return "place";
  if (url.hostname === "router.project-osrm.org") return "route";
  if (url.hostname !== "tie.digitraffic.fi") return "other";
  if (url.pathname.includes("/traffic-message/")) return "traffic";
  if (url.pathname.includes("/forecast-sections")) return "forecast";
  if (url.pathname.includes("/weather/") || url.pathname.includes("/weathercam/")) {
    return "weather";
  }
  return "digitraffic";
}

function recordCompletion(url) {
  const category = requestCategory(url);
  lastCompleted[category] = Date.now();
  window.dispatchEvent(
    new CustomEvent("ajokeli:request-complete", {
      detail: { category, completedAt: lastCompleted[category] },
    }),
  );
}

window.fetch = async function guardedFetch(input, init = {}) {
  const url = requestUrl(input);
  const timeoutMs = url ? guardedHosts.get(url.hostname) : null;

  if (!timeoutMs) {
    return nativeFetch(input, init);
  }

  const controller = new AbortController();
  const externalSignal = init.signal;
  let timedOut = false;

  const relayAbort = () => controller.abort(externalSignal?.reason);
  if (externalSignal?.aborted) relayAbort();
  else externalSignal?.addEventListener("abort", relayAbort, { once: true });

  const timeout = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await nativeFetch(input, {
      ...init,
      headers: requestHeaders(input, init, url),
      signal: controller.signal,
    });
    if (response.ok) recordCompletion(url);
    return response;
  } catch (error) {
    if (timedOut) {
      const timeoutError = new Error(
        `Pyyntö aikakatkaistiin ${Math.round(timeoutMs / 1000)} sekunnin jälkeen.`,
      );
      timeoutError.name = "TimeoutError";
      window.dispatchEvent(
        new CustomEvent("ajokeli:request-timeout", {
          detail: { host: url?.hostname ?? "", timeoutMs },
        }),
      );
      throw timeoutError;
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", relayAbort);
  }
};

window.__ajokeliNetworkGuard = {
  version: APP_VERSION,
  guardedHosts: [...guardedHosts.keys()],
  lastCompleted,
};
