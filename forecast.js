import { distanceToRouteKm, pointToSegmentDistanceKm } from "./route.js";

export const FORECAST_CORRIDOR_KM = 5;

export const FORECAST_LEVELS = {
  normal: {
    key: "normal",
    label: "Normaali",
    order: 0,
    color: "#35c789",
  },
  difficult: {
    key: "difficult",
    label: "Huono",
    order: 2,
    color: "#ff8a4c",
  },
  extreme: {
    key: "extreme",
    label: "Erittäin huono",
    order: 3,
    color: "#ff4d6d",
  },
  stale: {
    key: "stale",
    label: "Ei arviota",
    order: -1,
    color: "#7d8999",
  },
};

const CONDITION_LEVELS = {
  NORMAL_CONDITION: FORECAST_LEVELS.normal,
  POOR_CONDITION: FORECAST_LEVELS.difficult,
  EXTREMELY_POOR_CONDITION: FORECAST_LEVELS.extreme,
  CONDITION_COULD_NOT_BE_RESOLVED: FORECAST_LEVELS.stale,
};

const PRECIPITATION_LABELS = {
  LIGHT_RAIN: "Kevyttä vesisadetta",
  RAIN: "Vesisadetta",
  HEAVY_RAIN: "Voimakasta vesisadetta",
  LIGHT_SNOWFALL: "Heikkoa lumisadetta",
  SNOWFALL: "Lumisadetta",
  HEAVY_SNOWFALL: "Voimakasta lumisadetta",
};

const ROAD_LABELS = {
  DRY_ROAD: "Tienpinta kuiva",
  WET_ROAD: "Tienpinta märkä",
  MOIST_ROAD: "Tienpinta kostea",
  WET_AND_SALTED_ROAD: "Tienpinta märkä ja suolattu",
  SNOWY_ROAD: "Tienpinta luminen",
  ICY_ROAD: "Tienpinta jäinen",
  SLUSHY_ROAD: "Tienpinnalla sohjoa",
  PARTLY_ICY_ROAD: "Tienpinta paikoin jäinen",
  PARTLY_SNOWY_ROAD: "Tienpinta paikoin luminen",
};

const WIND_LABELS = {
  STRONG_WIND: "Voimakasta tuulta",
  VERY_STRONG_WIND: "Erittäin voimakasta tuulta",
  DANGEROUSLY_STRONG_WIND: "Vaarallisen voimakasta tuulta",
};

const VISIBILITY_LABELS = {
  POOR_VISIBILITY: "Heikko näkyvyys",
  VERY_POOR_VISIBILITY: "Erittäin heikko näkyvyys",
  EXTREMELY_POOR_VISIBILITY: "Äärimmäisen heikko näkyvyys",
};

const FRICTION_LABELS = {
  SLIPPERY: "Liukas tienpinta",
  VERY_SLIPPERY: "Erittäin liukas tienpinta",
  EXTREMELY_SLIPPERY: "Äärimmäisen liukas tienpinta",
};

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function validCoordinate(value) {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    Number.isFinite(Number(value[0])) &&
    Number.isFinite(Number(value[1]))
  );
}

export function geometryLines(geometry) {
  if (!geometry) return [];

  if (geometry.type === "LineString") {
    return [
      (geometry.coordinates ?? [])
        .filter(validCoordinate)
        .map(([lon, lat]) => [Number(lon), Number(lat)]),
    ].filter((line) => line.length >= 2);
  }

  if (geometry.type === "MultiLineString") {
    return (geometry.coordinates ?? [])
      .map((line) =>
        (line ?? [])
          .filter(validCoordinate)
          .map(([lon, lat]) => [Number(lon), Number(lat)]),
      )
      .filter((line) => line.length >= 2);
  }

  return [];
}

function sampleLine(line, maxPoints = 180) {
  if (line.length <= maxPoints) return line;
  const step = Math.ceil(line.length / maxPoints);
  const sampled = line.filter((_, index) => index % step === 0);
  const last = line[line.length - 1];
  if (sampled[sampled.length - 1] !== last) sampled.push(last);
  return sampled;
}

function pointToLineDistanceKm(point, line) {
  let nearest = Number.POSITIVE_INFINITY;

  for (let index = 0; index < line.length - 1; index += 1) {
    const measurement = pointToSegmentDistanceKm(point, line[index], line[index + 1]);
    nearest = Math.min(nearest, measurement.distanceKm);
  }

  return nearest;
}

export function distanceGeometryToRouteKm(geometry, routeCoordinates = []) {
  if (!Array.isArray(routeCoordinates) || routeCoordinates.length < 2) {
    return {
      distanceKm: Number.POSITIVE_INFINITY,
      routePosition: Number.POSITIVE_INFINITY,
    };
  }

  const lines = geometryLines(geometry);
  if (!lines.length) {
    return {
      distanceKm: Number.POSITIVE_INFINITY,
      routePosition: Number.POSITIVE_INFINITY,
    };
  }

  const sampledRoute = sampleLine(routeCoordinates, 220);
  let nearest = {
    distanceKm: Number.POSITIVE_INFINITY,
    routePosition: Number.POSITIVE_INFINITY,
  };

  for (const rawLine of lines) {
    const line = sampleLine(rawLine, 100);

    for (const point of line) {
      const measurement = distanceToRouteKm(point, routeCoordinates);
      if (measurement.distanceKm < nearest.distanceKm) {
        nearest = {
          distanceKm: measurement.distanceKm,
          routePosition: measurement.routePosition,
        };
      }
    }

    for (const routePoint of sampledRoute) {
      const distanceKm = pointToLineDistanceKm(routePoint, line);
      if (distanceKm < nearest.distanceKm) {
        const routeMeasurement = distanceToRouteKm(routePoint, routeCoordinates);
        nearest = {
          distanceKm,
          routePosition: routeMeasurement.routePosition,
        };
      }
    }
  }

  return nearest;
}

function normalizeForecast(forecast) {
  const time = new Date(forecast?.time);
  if (Number.isNaN(time.getTime())) return null;

  return {
    time: time.toISOString(),
    timeMs: time.getTime(),
    type: String(forecast?.type ?? ""),
    forecastName: String(forecast?.forecastName ?? ""),
    daylight: forecast?.daylight ?? null,
    roadTemperature: asNumber(forecast?.roadTemperature),
    temperature: asNumber(forecast?.temperature),
    windSpeed: asNumber(forecast?.windSpeed),
    windDirection: asNumber(forecast?.windDirection),
    overallRoadCondition: String(forecast?.overallRoadCondition ?? ""),
    weatherSymbol: String(forecast?.weatherSymbol ?? ""),
    reliability: String(forecast?.reliability ?? ""),
    forecastConditionReason: forecast?.forecastConditionReason ?? null,
  };
}

export function normalizeForecastSections(metadataPayload = {}, forecastPayload = {}) {
  const weatherById = new Map(
    (forecastPayload.forecastSections ?? []).map((item) => [
      String(item?.id ?? ""),
      (item?.forecasts ?? []).map(normalizeForecast).filter(Boolean),
    ]),
  );

  return (metadataPayload.features ?? [])
    .map((feature) => {
      const id = String(feature?.id ?? feature?.properties?.id ?? "");
      if (!id) return null;

      const lines = geometryLines(feature.geometry);
      if (!lines.length) return null;

      return {
        id,
        description:
          String(feature?.properties?.description ?? "").trim() ||
          `Tie ${feature?.properties?.roadNumber ?? ""}`.trim(),
        roadNumber: asNumber(feature?.properties?.roadNumber),
        roadSectionNumber: asNumber(feature?.properties?.roadSectionNumber),
        geometry: feature.geometry,
        forecasts: weatherById.get(id) ?? [],
      };
    })
    .filter(Boolean);
}

export function matchForecastSectionsToRoute(
  sections = [],
  routeCoordinates = [],
  corridorKm = FORECAST_CORRIDOR_KM,
) {
  return sections
    .map((section) => {
      const distance = distanceGeometryToRouteKm(section.geometry, routeCoordinates);
      return {
        section,
        distanceKm: distance.distanceKm,
        routePosition: distance.routePosition,
      };
    })
    .filter((item) => item.distanceKm <= corridorKm)
    .sort((a, b) => a.routePosition - b.routePosition);
}

export function forecastLevel(forecast) {
  return CONDITION_LEVELS[forecast?.overallRoadCondition] ?? FORECAST_LEVELS.stale;
}

function humanizeEnum(value) {
  return String(value ?? "")
    .toLocaleLowerCase("fi-FI")
    .replaceAll("_", " ")
    .replace(/(^|\s)\S/g, (character) => character.toLocaleUpperCase("fi-FI"));
}

export function forecastReasonTexts(forecast) {
  const reason = forecast?.forecastConditionReason ?? {};
  const texts = [];

  const precipitation = PRECIPITATION_LABELS[reason.precipitationCondition];
  if (precipitation) texts.push(precipitation);

  const road = ROAD_LABELS[reason.roadCondition];
  if (road) texts.push(road);

  const wind = WIND_LABELS[reason.windCondition];
  if (wind) texts.push(wind);

  const visibility = VISIBILITY_LABELS[reason.visibilityCondition];
  if (visibility) texts.push(visibility);

  const friction = FRICTION_LABELS[reason.frictionCondition];
  if (friction) texts.push(friction);

  if (reason.freezingRainCondition === true) texts.push("Jäätävää sadetta");
  if (reason.winterSlipperiness === true) texts.push("Liukkauden riski");

  for (const [key, value] of [
    ["roadCondition", reason.roadCondition],
    ["windCondition", reason.windCondition],
    ["visibilityCondition", reason.visibilityCondition],
    ["frictionCondition", reason.frictionCondition],
  ]) {
    const known =
      (key === "roadCondition" && ROAD_LABELS[value]) ||
      (key === "windCondition" && WIND_LABELS[value]) ||
      (key === "visibilityCondition" && VISIBILITY_LABELS[value]) ||
      (key === "frictionCondition" && FRICTION_LABELS[value]);

    if (value && !known && value !== "NO_DATA_AVAILABLE" && !String(value).startsWith("NORMAL")) {
      texts.push(humanizeEnum(value));
    }
  }

  if (!texts.length) {
    const level = forecastLevel(forecast);
    if (level.key === "difficult") texts.push("Huono ajokeli tiejaksolla");
    if (level.key === "extreme") texts.push("Erittäin huono ajokeli tiejaksolla");
  }

  return [...new Set(texts)];
}

export function selectForecastForTime(forecasts = [], targetTime, maxDifferenceMs = 4 * 60 * 60_000) {
  const targetMs = new Date(targetTime).getTime();
  if (!Number.isFinite(targetMs)) return null;

  let nearest = null;

  for (const forecast of forecasts) {
    const timeMs = asNumber(forecast?.timeMs) ?? new Date(forecast?.time).getTime();
    if (!Number.isFinite(timeMs)) continue;

    const differenceMs = Math.abs(timeMs - targetMs);
    if (differenceMs > maxDifferenceMs) continue;

    if (
      !nearest ||
      differenceMs < nearest.differenceMs ||
      (differenceMs === nearest.differenceMs &&
        forecast.type === "FORECAST" &&
        nearest.forecast.type !== "FORECAST")
    ) {
      nearest = { forecast, differenceMs };
    }
  }

  return nearest?.forecast ?? null;
}

function allForecastTimes(matchedSections, nowMs) {
  const times = new Set();

  for (const { section } of matchedSections) {
    for (const forecast of section.forecasts) {
      if (forecast.type !== "FORECAST") continue;
      if (forecast.timeMs < nowMs - 30 * 60_000) continue;
      times.add(forecast.timeMs);
    }
  }

  return [...times].sort((a, b) => a - b);
}

function optionLabel(timeMs, nowMs) {
  const differenceHours = (timeMs - nowMs) / 3_600_000;
  if (Math.abs(differenceHours) < 1.5) return "Nyt";

  const date = new Date(timeMs);
  const time = new Intl.DateTimeFormat("fi-FI", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  const today = new Date(nowMs);
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  if (sameDay) return `Tänään ${time}`;

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowMatch =
    date.getFullYear() === tomorrow.getFullYear() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getDate() === tomorrow.getDate();

  if (tomorrowMatch) return `Huomenna ${time}`;

  return new Intl.DateTimeFormat("fi-FI", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function buildDepartureOptions(
  matchedSections = [],
  now = new Date(),
  targetOffsetsHours = [0, 3, 6, 12, 24],
) {
  const nowMs = new Date(now).getTime();
  const times = allForecastTimes(matchedSections, nowMs);
  if (!times.length) return [];

  const selected = [];

  for (const offsetHours of targetOffsetsHours) {
    const target = nowMs + offsetHours * 3_600_000;
    const nearest = times.reduce((best, timeMs) => {
      const difference = Math.abs(timeMs - target);
      return !best || difference < best.difference ? { timeMs, difference } : best;
    }, null);

    const maxDifference = offsetHours >= 12 ? 6 * 3_600_000 : 3 * 3_600_000;
    if (!nearest || nearest.difference > maxDifference) continue;
    if (selected.some((item) => item.timeMs === nearest.timeMs)) continue;

    selected.push({
      time: new Date(nearest.timeMs).toISOString(),
      timeMs: nearest.timeMs,
      offsetHours,
      label: optionLabel(nearest.timeMs, nowMs),
    });
  }

  if (!selected.length) {
    return times.slice(0, 5).map((timeMs) => ({
      time: new Date(timeMs).toISOString(),
      timeMs,
      offsetHours: Math.max(0, Math.round((timeMs - nowMs) / 3_600_000)),
      label: optionLabel(timeMs, nowMs),
    }));
  }

  return selected;
}

export function analyzeForecastAtTime(matchedSections = [], targetTime) {
  const records = [];

  for (const match of matchedSections) {
    const forecast = selectForecastForTime(match.section.forecasts, targetTime);
    if (!forecast) continue;

    records.push({
      ...match,
      forecast,
      level: forecastLevel(forecast),
      reasons: forecastReasonTexts(forecast),
    });
  }

  const counts = {
    normal: 0,
    difficult: 0,
    extreme: 0,
    stale: 0,
  };

  for (const record of records) counts[record.level.key] += 1;

  const reliable = records.filter((record) => record.level.key !== "stale");
  const worstLevel = reliable.reduce(
    (worst, record) =>
      !worst || record.level.order > worst.order ? record.level : worst,
    null,
  );

  const highlights = [...records]
    .filter((record) => ["difficult", "extreme"].includes(record.level.key))
    .sort((a, b) => {
      const severity = b.level.order - a.level.order;
      return severity || a.routePosition - b.routePosition;
    })
    .slice(0, 5);

  return {
    targetTime: new Date(targetTime).toISOString(),
    records,
    counts,
    worstLevel: worstLevel ?? (records.length ? FORECAST_LEVELS.stale : null),
    highlights,
    coverage: {
      matchedSections: matchedSections.length,
      forecastSections: records.length,
      ratio: matchedSections.length ? records.length / matchedSections.length : 0,
    },
  };
}

function comparisonScore(analysis) {
  if (!analysis?.records?.length) return Number.POSITIVE_INFINITY;

  const worstOrder =
    analysis.worstLevel?.key === "stale"
      ? 8
      : Math.max(0, Number(analysis.worstLevel?.order ?? 8));

  const missingPenalty = Math.round((1 - analysis.coverage.ratio) * 100);
  return (
    worstOrder * 10_000 +
    analysis.counts.extreme * 1_000 +
    analysis.counts.difficult * 100 +
    analysis.counts.stale * 10 +
    missingPenalty
  );
}

export function compareDepartureOptions(matchedSections = [], options = []) {
  const comparisons = options.map((option) => {
    const analysis = analyzeForecastAtTime(matchedSections, option.time);
    return {
      option,
      analysis,
      score: comparisonScore(analysis),
    };
  });

  const usable = comparisons.filter((item) => Number.isFinite(item.score));
  const best = usable.reduce(
    (winner, item) =>
      !winner ||
      item.score < winner.score ||
      (item.score === winner.score && item.option.timeMs < winner.option.timeMs)
        ? item
        : winner,
    null,
  );

  return { comparisons, best };
}

export function routeBoundingBox(routeCoordinates = [], paddingDegrees = 0.18) {
  const valid = routeCoordinates.filter(validCoordinate);
  if (!valid.length) return null;

  const longitudes = valid.map((coordinate) => Number(coordinate[0]));
  const latitudes = valid.map((coordinate) => Number(coordinate[1]));

  return {
    xMin: Math.max(-180, Math.min(...longitudes) - paddingDegrees),
    yMin: Math.max(-90, Math.min(...latitudes) - paddingDegrees),
    xMax: Math.min(180, Math.max(...longitudes) + paddingDegrees),
    yMax: Math.min(90, Math.max(...latitudes) + paddingDegrees),
  };
}

export function formatForecastTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "–";

  return new Intl.DateTimeFormat("fi-FI", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
