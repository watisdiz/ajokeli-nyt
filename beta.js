export const APP_VERSION = "1.7.1";

export function normalizeShareLabel(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function buildShareUrl(currentUrl, route = {}) {
  const url = new URL(currentUrl);
  const from = normalizeShareLabel(route.from);
  const to = normalizeShareLabel(route.to);
  const departure = String(route.departure ?? "").trim();

  if (from) url.searchParams.set("from", from);
  else url.searchParams.delete("from");

  if (to) url.searchParams.set("to", to);
  else url.searchParams.delete("to");

  if (departure) url.searchParams.set("departure", departure);
  else url.searchParams.delete("departure");

  url.hash = "";
  return url.toString();
}

export function parseSharedRoute(search) {
  const params = new URLSearchParams(search);
  const from = normalizeShareLabel(params.get("from"));
  const to = normalizeShareLabel(params.get("to"));
  const departure = String(params.get("departure") ?? "").trim();

  if (!from || !to) return null;
  return { from, to, departure };
}

export function pickClosestDeparture(options = [], targetTime) {
  const values = options
    .map((option) => String(option?.value ?? option ?? "").trim())
    .filter(Boolean);

  if (!values.length) return null;
  if (!targetTime) return values[0];
  if (values.includes(targetTime)) return targetTime;

  const target = Date.parse(targetTime);
  if (!Number.isFinite(target)) return values[0];

  return values.reduce((closest, value) => {
    const distance = Math.abs(Date.parse(value) - target);
    const closestDistance = Math.abs(Date.parse(closest) - target);
    if (!Number.isFinite(distance)) return closest;
    if (!Number.isFinite(closestDistance) || distance < closestDistance) return value;
    return closest;
  }, values[0]);
}
