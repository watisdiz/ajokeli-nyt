import { APP_VERSION } from "./beta.js?v=1.9.4";

const DIGITRAFFIC_API = "https://tie.digitraffic.fi";

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
  } catch {
    // Some browsers or embedded previews may reject the custom header preflight.
    response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  }

  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}
