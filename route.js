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
  return [lon * EARTH_KM_PER_DEGREE * Math.cos(latitudeRadians), lat * EARTH_KM_PER_DEGREE];
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

// Matching stations, roadworks and forecast sections against a route means
// asking "how far is this point from the route" thousands of times, and
// distanceToRouteKm walks every segment each time. On a long route
// (Vantaa-Vaasa is ~3900 segments) against all of Finland's ~580 traffic
// incidents that is hundreds of millions of distance calculations, which
// blocked the main thread for the better part of 20 seconds.
//
// The index buckets segments into a grid whose cells are corridorKm across,
// so a lookup only measures the segments in the 3x3 block of cells around
// the point. Cells that size guarantee the block covers the whole corridor:
// anything within corridorKm of the point is at most one cell away in each
// direction. Segments are filed under every cell their bounding box touches,
// so a segment crossing a cell without ending in it is still found.
export function buildRouteIndex(routeCoordinates = [], corridorKm = ROUTE_CORRIDOR_KM) {
  if (!Array.isArray(routeCoordinates) || routeCoordinates.length < 2) return null;

  let maxAbsLat = 0;
  for (const coordinate of routeCoordinates) {
    const lat = Math.abs(Number(coordinate?.[1]));
    if (Number.isFinite(lat) && lat > maxAbsLat) maxAbsLat = lat;
  }

  const cellLat = corridorKm / EARTH_KM_PER_DEGREE;
  // A degree of longitude covers less ground the further north you go, so
  // size the cells for the highest latitude the route reaches. Wider cells
  // than strictly needed further south only add candidates, never lose them.
  const shrink = Math.max(0.05, Math.cos((Math.min(89, maxAbsLat) * Math.PI) / 180));
  const cellLon = corridorKm / (EARTH_KM_PER_DEGREE * shrink);

  const cells = new Map();
  const fileSegment = (ix, iy, segmentIndex) => {
    const key = `${ix}:${iy}`;
    const bucket = cells.get(key);
    if (bucket) bucket.push(segmentIndex);
    else cells.set(key, [segmentIndex]);
  };

  for (let index = 0; index < routeCoordinates.length - 1; index += 1) {
    const start = routeCoordinates[index];
    const end = routeCoordinates[index + 1];
    const lon0 = Number(start?.[0]);
    const lat0 = Number(start?.[1]);
    const lon1 = Number(end?.[0]);
    const lat1 = Number(end?.[1]);
    if (![lon0, lat0, lon1, lat1].every(Number.isFinite)) continue;

    const ixMin = Math.floor(Math.min(lon0, lon1) / cellLon);
    const ixMax = Math.floor(Math.max(lon0, lon1) / cellLon);
    const iyMin = Math.floor(Math.min(lat0, lat1) / cellLat);
    const iyMax = Math.floor(Math.max(lat0, lat1) / cellLat);

    for (let ix = ixMin; ix <= ixMax; ix += 1) {
      for (let iy = iyMin; iy <= iyMax; iy += 1) fileSegment(ix, iy, index);
    }
  }

  return { cells, cellLon, cellLat, routeCoordinates };
}

// Same contract as distanceToRouteKm, but only exact for points inside the
// corridor the index was built for. Points with no segment nearby come back
// as Infinity instead of their true distance -- every caller filters on
// "<= corridorKm", so that is the same answer where it matters.
export function distanceToRouteKmIndexed(point, index) {
  if (!index) return distanceToRouteKm(point, []);

  const lon = Number(point?.[0]);
  const lat = Number(point?.[1]);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    return { distanceKm: Number.POSITIVE_INFINITY, routePosition: Number.POSITIVE_INFINITY };
  }

  const { cells, cellLon, cellLat, routeCoordinates } = index;
  const ix = Math.floor(lon / cellLon);
  const iy = Math.floor(lat / cellLat);

  let nearest = {
    distanceKm: Number.POSITIVE_INFINITY,
    routePosition: Number.POSITIVE_INFINITY,
    segmentIndex: -1,
  };
  let seen = null;

  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      const bucket = cells.get(`${ix + dx}:${iy + dy}`);
      if (!bucket) continue;

      for (const segmentIndex of bucket) {
        // Segments filed under several cells would otherwise be measured
        // more than once. Only allocate the guard when there is something
        // to guard, which is the common case for short segments.
        if (bucket.length > 1 || dx || dy) {
          if (seen === null) seen = new Set();
          if (seen.has(segmentIndex)) continue;
          seen.add(segmentIndex);
        }

        const measurement = pointToSegmentDistanceKm(
          point,
          routeCoordinates[segmentIndex],
          routeCoordinates[segmentIndex + 1],
        );

        if (measurement.distanceKm < nearest.distanceKm) {
          nearest = {
            distanceKm: measurement.distanceKm,
            routePosition: segmentIndex + measurement.fraction,
            segmentIndex,
          };
        }
      }
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

  return (
    candidates.reduce((worst, item) => {
      if (!worst || levelOrder(item.station) > levelOrder(worst.station)) return item;
      return worst;
    }, null)?.station?.level ?? null
  );
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
  const index = buildRouteIndex(routeCoordinates, corridorKm);

  const nearbyStations = stations
    .map((station) => {
      const distance = index
        ? distanceToRouteKmIndexed(station.coordinates, index)
        : distanceToRouteKm(station.coordinates, routeCoordinates);
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
