export const RADAR_BOUNDS = Object.freeze({
  west: 19.1,
  south: 59.7,
  east: 31.7,
  north: 70.1,
});

export const RADAR_REFRESH_MS = 5 * 60_000;
export const RAIN_THRESHOLD_MM_H = 0.1;

export function buildRadarQueryUrl(now = new Date(), lookbackMinutes = 25) {
  const end = new Date(now);
  const start = new Date(end.getTime() - lookbackMinutes * 60_000);
  const url = new URL("https://opendata.fmi.fi/wfs");
  url.search = new URLSearchParams({
    service: "WFS",
    version: "2.0.0",
    request: "getFeature",
    storedquery_id: "fmi::radar::composite::rr",
    starttime: start.toISOString(),
    endtime: end.toISOString(),
  }).toString();
  return url.toString();
}

function decodeXml(value) {
  return String(value ?? "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .trim();
}

export function extractRadarReferences(xmlText) {
  const matches = [];
  const pattern = /<(?:[\w.-]+:)?fileReference\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?fileReference>/gi;
  let match;

  while ((match = pattern.exec(String(xmlText ?? "")))) {
    const url = decodeXml(match[1]);
    if (!url) continue;
    let time = null;
    try {
      time = new URL(url).searchParams.get("time");
    } catch {
      // Ignore malformed references; the caller will filter them out.
    }
    matches.push({ url, time });
  }

  return matches;
}

export function latestRadarReference(xmlText) {
  return extractRadarReferences(xmlText)
    .filter((item) => {
      try {
        return new URL(item.url).hostname === "openwms.fmi.fi";
      } catch {
        return false;
      }
    })
    .sort((left, right) => {
      const leftTime = Date.parse(left.time ?? "") || 0;
      const rightTime = Date.parse(right.time ?? "") || 0;
      return rightTime - leftTime;
    })[0] ?? null;
}

export function transformationFromXml(xmlText) {
  const read = (name) => {
    const pattern = new RegExp(
      `<(?:[\\w.-]+:)?${name}\\b[^>]*>([^<]+)<\\/(?:[\\w.-]+:)?${name}>`,
      "i",
    );
    const match = String(xmlText ?? "").match(pattern);
    const value = Number(decodeXml(match?.[1]));
    return Number.isFinite(value) ? value : null;
  };

  return {
    gain: read("linearTransformationGain") ?? 0.01,
    offset: read("linearTransformationOffset") ?? 0,
  };
}

export function buildRadarGeoTiffUrl(
  referenceUrl,
  bounds = RADAR_BOUNDS,
  width = 760,
  height = 1120,
) {
  const url = new URL(referenceUrl);
  url.protocol = "https:";
  url.searchParams.set("service", "WMS");
  url.searchParams.set("version", "1.3.0");
  url.searchParams.set("request", "GetMap");
  url.searchParams.set("format", "image/geotiff");
  url.searchParams.set("styles", url.searchParams.get("styles") || "raster");
  url.searchParams.delete("srs");
  url.searchParams.set("crs", "EPSG:4326");
  url.searchParams.set(
    "bbox",
    [bounds.south, bounds.west, bounds.north, bounds.east].join(","),
  );
  url.searchParams.set("width", String(width));
  url.searchParams.set("height", String(height));
  return url.toString();
}

export function radarImageCoordinates(bounds = RADAR_BOUNDS) {
  return [
    [bounds.west, bounds.north],
    [bounds.east, bounds.north],
    [bounds.east, bounds.south],
    [bounds.west, bounds.south],
  ];
}

export function intensityFromRaw(rawValue, gain = 0.01, offset = 0, noData = null) {
  const raw = Number(rawValue);
  if (!Number.isFinite(raw)) return Number.NaN;
  if (Number.isFinite(Number(noData)) && raw === Number(noData)) return Number.NaN;
  const value = raw * gain + offset;
  return value >= 0 && value <= 500 ? value : Number.NaN;
}

export function rainLevel(intensity) {
  const value = Number(intensity);
  if (!Number.isFinite(value) || value < RAIN_THRESHOLD_MM_H) {
    return { key: "none", label: "Ei sadetta", rank: 0 };
  }
  if (value < 1) return { key: "light", label: "Heikko sade", rank: 1 };
  if (value < 4) return { key: "moderate", label: "Kohtalainen sade", rank: 2 };
  if (value < 10) return { key: "heavy", label: "Voimakas sade", rank: 3 };
  return { key: "extreme", label: "Rankka sade", rank: 4 };
}

export function rainColor(intensity, opacity = 0.72) {
  const level = rainLevel(intensity);
  const alpha = Math.max(0, Math.min(1, Number(opacity) || 0));

  if (level.key === "none") return [0, 0, 0, 0];
  if (level.key === "light") return [78, 162, 255, Math.round(alpha * 150)];
  if (level.key === "moderate") return [55, 79, 255, Math.round(alpha * 200)];
  if (level.key === "heavy") return [218, 48, 255, Math.round(alpha * 230)];
  return [255, 74, 35, Math.round(alpha * 245)];
}

export function formatRainIntensity(intensity) {
  const value = Number(intensity);
  if (!Number.isFinite(value)) return "–";
  const digits = value < 1 ? 1 : 0;
  return `${new Intl.NumberFormat("fi-FI", { maximumFractionDigits: digits }).format(value)} mm/h`;
}

export function sampleRadar(intensities, width, height, coordinate, bounds = RADAR_BOUNDS) {
  if (!intensities || !Number.isFinite(width) || !Number.isFinite(height)) return Number.NaN;
  const [lon, lat] = coordinate ?? [];
  if (!Number.isFinite(Number(lon)) || !Number.isFinite(Number(lat))) return Number.NaN;
  if (lon < bounds.west || lon > bounds.east || lat < bounds.south || lat > bounds.north) {
    return Number.NaN;
  }

  const x = Math.max(
    0,
    Math.min(width - 1, Math.round(((lon - bounds.west) / (bounds.east - bounds.west)) * (width - 1))),
  );
  const y = Math.max(
    0,
    Math.min(height - 1, Math.round(((bounds.north - lat) / (bounds.north - bounds.south)) * (height - 1))),
  );
  return Number(intensities[y * width + x]);
}

function toRadians(value) {
  return (Number(value) * Math.PI) / 180;
}

export function haversineKm(left, right) {
  const [lon1, lat1] = left;
  const [lon2, lat2] = right;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371.0088 * Math.asin(Math.sqrt(a));
}

export function analyzeRouteRain(
  intensities,
  width,
  height,
  routeCoordinates,
  bounds = RADAR_BOUNDS,
) {
  const coordinates = Array.isArray(routeCoordinates) ? routeCoordinates : [];
  let totalKm = 0;
  let rainyKm = 0;
  let maxIntensity = 0;
  let maxCoordinate = null;
  let sampledSegments = 0;

  for (let index = 1; index < coordinates.length; index += 1) {
    const start = coordinates[index - 1];
    const end = coordinates[index];
    const segmentKm = haversineKm(start, end);
    if (!Number.isFinite(segmentKm)) continue;
    totalKm += segmentKm;

    const midpoint = [(Number(start[0]) + Number(end[0])) / 2, (Number(start[1]) + Number(end[1])) / 2];
    const samples = [
      sampleRadar(intensities, width, height, start, bounds),
      sampleRadar(intensities, width, height, midpoint, bounds),
      sampleRadar(intensities, width, height, end, bounds),
    ].filter(Number.isFinite);

    if (!samples.length) continue;
    sampledSegments += 1;
    const segmentIntensity = Math.max(...samples);
    if (segmentIntensity >= RAIN_THRESHOLD_MM_H) rainyKm += segmentKm;
    if (segmentIntensity > maxIntensity) {
      maxIntensity = segmentIntensity;
      maxCoordinate = midpoint;
    }
  }

  return {
    totalKm,
    rainyKm,
    rainShare: totalKm > 0 ? rainyKm / totalKm : 0,
    maxIntensity,
    maxCoordinate,
    level: rainLevel(maxIntensity),
    sampledSegments,
  };
}
