const EARTH_KM_PER_DEGREE = 111.32;

export const ROUTE_CORRIDOR_KM = 8;

export function formatRouteDistance(meters) {
  const value = Number(meters);
  if (!Number.isFinite(value) || value < 0) return "–";
  if (value < 1000) return `${Math.round(value)} m`;
  return `${new Intl.NumberFormat("fi-FI", { maximumFractionDigits: value < 100_000 ? 1 : 0 }).format(value / 1000)} km`;
}

export function formatRouteDuration(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value < 0) return "–";

  const totalMinutes = Math.max(1, Math.round(value / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) return `${minutes} min`;
  if (!minutes) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

function toLocalKm([lon, lat], referenceLat) {
  const latitudeRadians = (referenceLat * Math.PI) / 180;
  return [
    lon * EARTH_KM_PER_DEGREE * Math.cos(latitudeRadians),
    lat * EARTH_KM_PER_DEGREE,
  ];
}

export function pointToSegmentDistanceKm(point, start, end) {
  const referenceLat = (point[1] + start[1] + end[1]) / 3;
  const [px, py] = toLocalKm(point, referenceLat);
  const [ax, ay] = toLocalKm(start, referenceLat);
  const [bx, by] = toLocalKm(end, referenceLat);

  const dx = bx - ax;
  const dy = by - ay;
  const denominator = dx * dx + dy * dy;

  if (!denominator) {
    return {
      distanceKm: Math.hypot(px - ax, py - ay),
      fraction: 0,
    };
  }

  const rawFraction = ((px - ax) * dx + (py - ay) * dy) / denominator;
  const fraction = Math.max(0, Math.min(1, rawFraction));
  const closestX = ax + fraction * dx;
  const closestY = ay + fraction * dy;

  return {
    distanceKm: Math.hypot(px - closestX, py - closestY),
    fraction,
  };
}

export function distanceToRouteKm(point, routeCoordinates = []) {
  if (!Array.isArray(routeCoordinates) || routeCoordinates.length < 2) {
    return {
      distanceKm: Number.POSITIVE_INFINITY,
      routePosition: Number.POSITIVE_INFINITY,
      segmentIndex: -1,
    };
  }

  let nearest = {
    distanceKm: Number.POSITIVE_INFINITY,
    routePosition: Number.POSITIVE_INFINITY,
    segmentIndex: -1,
  };

  for (let index = 0; index < routeCoordinates.length - 1; index += 1) {
    const measurement = pointToSegmentDistanceKm(
      point,
      routeCoordinates[index],
      routeCoordinates[index + 1],
    );

    if (measurement.distanceKm < nearest.distanceKm) {
      nearest = {
        distanceKm: measurement.distanceKm,
        routePosition: index + measurement.fraction,
        segmentIndex: index,
      };
    }
  }

  return nearest;
}

function levelOrder(station) {
  return Number.isFinite(Number(station?.level?.order)) ? Number(station.level.order) : -1;
}

function chooseWorstLevel(nearbyStations) {
  const reliable = nearbyStations.filter((item) => item.station?.level?.key !== "stale");
  const candidates = reliable.length ? reliable : nearbyStations;

  if (!candidates.length) return null;

  return candidates.reduce((worst, item) => {
    if (!worst || levelOrder(item.station) > levelOrder(worst.station)) return item;
    return worst;
  }, null)?.station?.level ?? null;
}

function buildHighlights(nearbyStations, limit = 5) {
  const seen = new Set();
  const highlights = [];

  const candidates = [...nearbyStations].sort((a, b) => {
    const severityDifference = levelOrder(b.station) - levelOrder(a.station);
    if (severityDifference) return severityDifference;
    return a.routePosition - b.routePosition;
  });

  for (const item of candidates) {
    if (item.station?.level?.key === "stale") continue;

    const reason = item.station?.reasons?.find(Boolean);
    if (!reason) continue;

    const key = `${item.station.id}:${reason}`;
    if (seen.has(key)) continue;
    seen.add(key);

    highlights.push({
      stationId: item.station.id,
      stationName: item.station.name,
      level: item.station.level,
      reason,
      distanceFromRouteKm: item.distanceFromRouteKm,
      routePosition: item.routePosition,
    });

    if (highlights.length >= limit) break;
  }

  return highlights;
}

export function analyzeRouteStations(
  stations = [],
  routeCoordinates = [],
  corridorKm = ROUTE_CORRIDOR_KM,
) {
  const nearbyStations = stations
    .map((station) => {
      const distance = distanceToRouteKm(station.coordinates, routeCoordinates);
      return {
        station,
        distanceFromRouteKm: distance.distanceKm,
        routePosition: distance.routePosition,
      };
    })
    .filter((item) => item.distanceFromRouteKm <= corridorKm)
    .sort((a, b) => a.routePosition - b.routePosition);

  const counts = {};
  for (const item of nearbyStations) {
    const key = item.station?.level?.key ?? "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return {
    corridorKm,
    nearbyStations,
    stationIds: new Set(nearbyStations.map((item) => item.station.id)),
    worstLevel: chooseWorstLevel(nearbyStations),
    highlights: buildHighlights(nearbyStations),
    counts,
  };
}
