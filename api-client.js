import { APP_VERSION } from "./beta.js?v=1.9.5";

const DIGITRAFFIC_API = "https://tie.digitraffic.fi";

// A rejected preflight surfaces as a TypeError ("Failed to fetch"), and that
// is the only failure the headerless retry was ever meant to recover. A
// timeout from request-guard is a plain Error named TimeoutError and an abort
// is a DOMException named AbortError; retrying either just spends the guard's
// budget twice, so a dead upstream took 24 seconds to report instead of 12.
// Checked by name rather than instanceof so it survives realm boundaries.
function isPreflightRejection(error) {
  return error?.name === "TypeError";
}

export async function digitrafficJson(path) {
  const url = `${DIGITRAFFIC_API}${path}`;
  let response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Digitraffic-User": `AjokeliNyt/MVP ${APP_VERSION}`,
      },
      cache: "no-store",
    });
  } catch (error) {
    if (!isPreflightRejection(error)) throw error;
    // Some browsers or embedded previews may reject the custom header preflight.
    response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  }

  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}
