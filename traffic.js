import { distanceToRouteKm } from "./route.js";

export const TRAFFIC_CORRIDOR_KM = 2;

export const TRAFFIC_SEVERITIES = {
  low: { key: "low", label: "Vähäinen", order: 1, color: "#f5c84c" },
  medium: { key: "medium", label: "Merkittävä", order: 2, color: "#ff8a4c" },
  high: { key: "high", label: "Vakava", order: 3, color: "#ff4d6d" },
};

const SEVERITY_ALIASES = {
  low: "low",
  slight: "low",
  medium: "medium",
  moderate: "medium",
  high: "high",
  severe: "high",
  highest: "high",
};

function parseTime(value) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function isTimeWindowActive(window = {}, now = new Date()) {
  const nowTime = now.getTime();
  const start = parseTime(window?.startTime);
  const end = parseTime(window?.endTime);

  if (start !== null && start > nowTime) return false;
  if (end !== null && end < nowTime) return false;
  return true;
}

function cleanText(value = "") {
  return String(value)
    .replace(/\r/g, "")
    .replace(/(^|\n)\s*L\d+:\s*/g, "$1")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function announcementFor(feature) {
  const announcements = feature?.properties?.announcements ?? [];
  return announcements.find((item) => item.language === "fi") ?? announcements[0] ?? null;
}

function timedRoadWorkPhases(announcement) {
  return (announcement?.roadWorkPhases ?? []).filter(
    (phase) => phase?.timeAndDuration?.startTime || phase?.timeAndDuration?.endTime,
  );
}

function activeRoadWorkPhases(announcement, now) {
  const timed = timedRoadWorkPhases(announcement);
  if (!timed.length) return announcement?.roadWorkPhases ?? [];
  return timed.filter((phase) => isTimeWindowActive(phase.timeAndDuration, now));
}

function normalizeSeverity(value) {
  const key = SEVERITY_ALIASES[String(value ?? "").toLowerCase()];
  return key ? TRAFFIC_SEVERITIES[key] : null;
}

function severityFromText(text, kind) {
  const normalized = String(text ?? "").toLocaleLowerCase("fi-FI");

  const highPatterns = [
    "tie on suljettu",
    "liikenne poikki",
    "liikenne on poikki",
    "kiertotie",
    "vakava liikenneonnettomuus",
    "liikenneonnettomuus",
    "ajoneuvo tulessa",
    "este tiellä",
    "tunneli suljettu",
    "epäkunnossa",
  ];

  const mediumPatterns = [
    "kaista on suljettu",
    "kaista suljettu",
    "ajokaistoja on suljettu",
    "liikenne saattaa ruuhkautua",
    "liikennejärjestelyt",
    "liikenne hidastuu",
    "nopeusrajoitus",
    "lossi",
    "lautta",
  ];

  if (highPatterns.some((pattern) => normalized.includes(pattern))) {
    return TRAFFIC_SEVERITIES.high;
  }
  if (mediumPatterns.some((pattern) => normalized.includes(pattern))) {
    return TRAFFIC_SEVERITIES.medium;
  }
  return kind === "roadwork" ? TRAFFIC_SEVERITIES.medium : TRAFFIC_SEVERITIES.low;
}

function incidentSeverity(kind, announcement, phases) {
  const phaseSeverities = phases
    .map((phase) => normalizeSeverity(phase.severity))
    .filter(Boolean)
    .sort((a, b) => b.order - a.order);

  if (phaseSeverities.length) {
    return { ...phaseSeverities[0], source: "api" };
  }

  const text = [
    announcement?.title,
    announcement?.comment,
    ...(announcement?.features ?? []).map((item) => item?.name),
    ...phases.flatMap((phase) => [
      ...(phase?.worktypes ?? []).map((item) => item?.description || item?.type),
      ...(phase?.restrictions ?? []).map((item) => item?.restriction?.name || item?.type),
    ]),
  ]
    .filter(Boolean)
    .join(" ");

  return { ...severityFromText(text, kind), source: "derived" };
}

function incidentWindow(announcement, phases) {
  const phaseWindows = phases.map((phase) => phase?.timeAndDuration).filter(Boolean);
  const starts = phaseWindows
    .map((window) => parseTime(window.startTime))
    .filter((value) => value !== null);
  const ends = phaseWindows
    .map((window) => parseTime(window.endTime))
    .filter((value) => value !== null);

  if (starts.length || ends.length) {
    return {
      startTime: starts.length ? new Date(Math.min(...starts)).toISOString() : null,
      endTime: ends.length ? new Date(Math.max(...ends)).toISOString() : null,
    };
  }

  return {
    startTime: announcement?.timeAndDuration?.startTime ?? null,
    endTime: announcement?.timeAndDuration?.endTime ?? null,
  };
}

function workDetails(phases) {
  const worktypes = phases
    .flatMap((phase) => phase?.worktypes ?? [])
    .map((item) => cleanText(item?.description || item?.type))
    .filter(Boolean);

  const restrictions = phases
    .flatMap((phase) => phase?.restrictions ?? [])
    .map((item) => {
      const restriction = item?.restriction ?? {};
      const name = cleanText(restriction.name || item?.type);
      const quantity = restriction.quantity;
      const unit = restriction.unit;
      if (!name) return "";
      return Number.isFinite(Number(quantity)) && unit
        ? `${name}: ${Number(quantity)} ${unit}`
        : name;
    })
    .filter(Boolean);

  return {
    worktypes: [...new Set(worktypes)],
    restrictions: [...new Set(restrictions)],
  };
}

function incidentFeatures(announcement) {
  return [...new Set((announcement?.features ?? []).map((item) => cleanText(item?.name)).filter(Boolean))];
}

export function normalizeTrafficFeature(feature, kind, now = new Date()) {
  if (!feature?.geometry) return null;

  const announcement = announcementFor(feature);
  if (!announcement) return null;

  const allPhases = announcement.roadWorkPhases ?? [];
  const timedPhases = timedRoadWorkPhases(announcement);
  const activePhases = activeRoadWorkPhases(announcement, now);

  if (kind === "roadwork" && timedPhases.length && !activePhases.length) return null;
  if (
    kind !== "roadwork" &&
    !isTimeWindowActive(announcement.timeAndDuration ?? {}, now)
  ) {
    return null;
  }

  if (
    kind === "roadwork" &&
    !timedPhases.length &&
    !isTimeWindowActive(announcement.timeAndDuration ?? {}, now)
  ) {
    return null;
  }

  const relevantPhases = activePhases.length ? activePhases : allPhases;
  const severity = incidentSeverity(kind, announcement, relevantPhases);
  const details = workDetails(relevantPhases);
  const features = incidentFeatures(announcement);
  const window = incidentWindow(announcement, relevantPhases);

  const title =
    cleanText(announcement.title) ||
    cleanText(announcement.location?.description) ||
    (kind === "roadwork" ? "Tietyö" : "Liikennetiedote");

  const location = cleanText(announcement.location?.description);
  const comment = cleanText(announcement.comment);
  const description =
    comment ||
    features.join(", ") ||
    details.worktypes.join(", ") ||
    location ||
    title;

  return {
    id: String(feature.properties?.situationId ?? `${kind}-${feature.properties?.version ?? "unknown"}`),
    kind,
    typeLabel: kind === "roadwork" ? "Tietyö" : "Liikennetiedote",
    title,
    location,
    description,
    comment,
    features,
    worktypes: details.worktypes,
    restrictions: details.restrictions,
    severity,
    startTime: window.startTime,
    endTime: window.endTime,
    releaseTime: feature.properties?.releaseTime ?? null,
    versionTime: feature.properties?.versionTime ?? null,
    geometry: feature.geometry,
  };
}

export function normalizeTrafficCollection(collection, kind, now = new Date()) {
  return (collection?.features ?? [])
    .map((feature) => normalizeTrafficFeature(feature, kind, now))
    .filter(Boolean);
}

function coordinateLines(geometry) {
  if (!geometry) return [];

  switch (geometry.type) {
    case "Point":
      return [[geometry.coordinates]];
    case "MultiPoint":
      return geometry.coordinates.map((coordinate) => [coordinate]);
    case "LineString":
      return [geometry.coordinates];
    case "MultiLineString":
      return geometry.coordinates;
    case "Polygon":
      return geometry.coordinates;
    case "MultiPolygon":
      return geometry.coordinates.flat();
    case "GeometryCollection":
      return (geometry.geometries ?? []).flatMap(coordinateLines);
    default:
      return [];
  }
}

function sampleLine(line, maximum = 48) {
  const valid = (line ?? []).filter(
    (coordinate) =>
      Array.isArray(coordinate) &&
      coordinate.length >= 2 &&
      Number.isFinite(Number(coordinate[0])) &&
      Number.isFinite(Number(coordinate[1])),
  );

  if (valid.length <= maximum) return valid;
  const sampled = [];
  const step = (valid.length - 1) / (maximum - 1);
  for (let index = 0; index < maximum; index += 1) {
    sampled.push(valid[Math.round(index * step)]);
  }
  return sampled;
}

export function geometryRouteDistance(geometry, routeCoordinates = []) {
  let nearest = {
    distanceKm: Number.POSITIVE_INFINITY,
    routePosition: Number.POSITIVE_INFINITY,
  };

  for (const line of coordinateLines(geometry)) {
    for (const coordinate of sampleLine(line)) {
      const distance = distanceToRouteKm(coordinate, routeCoordinates);
      if (distance.distanceKm < nearest.distanceKm) {
        nearest = {
          distanceKm: distance.distanceKm,
          routePosition: distance.routePosition,
        };
      }
    }
  }

  return nearest;
}

export function analyzeRouteTraffic(
  incidents = [],
  routeCoordinates = [],
  corridorKm = TRAFFIC_CORRIDOR_KM,
) {
  const matched = incidents
    .map((incident) => ({
      incident,
      ...geometryRouteDistance(incident.geometry, routeCoordinates),
    }))
    .filter((item) => item.distanceKm <= corridorKm)
    .sort((a, b) => {
      if (a.routePosition !== b.routePosition) return a.routePosition - b.routePosition;
      return b.incident.severity.order - a.incident.severity.order;
    });

  const counts = {
    total: matched.length,
    roadwork: 0,
    traffic: 0,
    low: 0,
    medium: 0,
    high: 0,
  };

  for (const item of matched) {
    counts[item.incident.kind] += 1;
    counts[item.incident.severity.key] += 1;
  }

  const worstSeverity = matched.reduce((worst, item) => {
    if (!worst || item.incident.severity.order > worst.order) return item.incident.severity;
    return worst;
  }, null);

  return {
    corridorKm,
    matched,
    counts,
    worstSeverity,
  };
}

export function formatIncidentTimeWindow(incident) {
  const formatter = new Intl.DateTimeFormat("fi-FI", {
    dateStyle: "short",
    timeStyle: "short",
  });

  const start = parseTime(incident?.startTime);
  const end = parseTime(incident?.endTime);

  if (start !== null && end !== null) {
    return `${formatter.format(new Date(start))}–${formatter.format(new Date(end))}`;
  }
  if (start !== null) return `Alkaen ${formatter.format(new Date(start))}`;
  if (end !== null) return `Voimassa ${formatter.format(new Date(end))} asti`;
  return "Voimassaoloaikaa ei ilmoitettu";
}
