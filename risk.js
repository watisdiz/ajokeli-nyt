const MINUTE_MS = 60_000;
// Measured against the live Digitraffic payload on 2026-07-28: the median age
// of every core sensor type (TIE, KELI, SADE, NAKYVYYS_KM, SATEEN_OLOMUOTO)
// is 16-17 minutes, p90 is 18-19. The old 15-minute limit was therefore
// shorter than the observation cadence itself -- applying it per sensor would
// have marked all 503 stations stale. 30 minutes is roughly two reporting
// cycles, which tolerates one missed round and still leaves 8 stations
// correctly flagged as stale.
export const STALE_AFTER_MS = 30 * MINUTE_MS;

export const RISK_LEVELS = {
  normal: { key: "normal", label: "Normaali", color: "#35c789", order: 0 },
  attention: { key: "attention", label: "Huomio", color: "#f5c84c", order: 1 },
  difficult: { key: "difficult", label: "Vaikea", color: "#ff8a4c", order: 2 },
  extreme: { key: "extreme", label: "Erittäin vaikea", color: "#ff4d6d", order: 3 },
  stale: { key: "stale", label: "Data puuttuu / vanha", color: "#7d8999", order: 4 },
};

const normalize = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

const isUsable = (sensor) =>
  sensor && sensor.reliability !== "FAULTY" && Number.isFinite(Number(sensor.value));

export function latestMeasurementTime(sensorValues = [], fallback) {
  const timestamps = sensorValues
    .filter(isUsable)
    .map((sensor) => Date.parse(sensor.measuredTime))
    .filter(Number.isFinite);
  const fallbackTime = Date.parse(fallback);
  if (Number.isFinite(fallbackTime)) timestamps.push(fallbackTime);
  return timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null;
}

// Freshness is judged per sensor, not per station. A station reports its
// sensors at slightly different times, and taking the newest one let an old
// core reading inherit a fresh sensor's timestamp: an hour-old road
// temperature next to a current humidity reading scored as if both were
// current. Sensors without a parsable time are dropped -- the live payload
// has none, so this costs nothing and avoids vouching for unknown data.
function freshSensors(sensorValues = [], now = new Date()) {
  const cutoff = now.getTime() - STALE_AFTER_MS;
  return sensorValues.filter((sensor) => {
    if (!isUsable(sensor)) return false;
    const measured = Date.parse(sensor.measuredTime);
    return Number.isFinite(measured) && measured >= cutoff;
  });
}

function sensorEntries(sensorValues = []) {
  return sensorValues.filter(isUsable).map((sensor) => ({
    ...sensor,
    normalizedName: normalize(sensor.name),
  }));
}

function sensorsByPrefix(entries, prefixes) {
  const normalizedPrefixes = prefixes.map(normalize);
  return entries.filter((entry) =>
    normalizedPrefixes.some(
      (prefix) => entry.normalizedName === prefix || entry.normalizedName.startsWith(`${prefix}_`),
    ),
  );
}

function firstSensor(entries, prefixes) {
  return sensorsByPrefix(entries, prefixes)[0] ?? null;
}

function minimumValue(entries, prefixes) {
  const matches = sensorsByPrefix(entries, prefixes);
  if (!matches.length) return null;
  return Math.min(...matches.map((sensor) => Number(sensor.value)));
}

function maximumValue(entries, prefixes) {
  const matches = sensorsByPrefix(entries, prefixes);
  if (!matches.length) return null;
  return Math.max(...matches.map((sensor) => Number(sensor.value)));
}

function description(sensor, fallbackMap = {}) {
  if (!sensor) return null;
  return (
    sensor.sensorValueDescriptionFi || fallbackMap[Number(sensor.value)] || String(sensor.value)
  );
}

const SURFACE_DESCRIPTIONS = {
  0: "Anturissa on vikaa",
  1: "Kuiva",
  2: "Kostea",
  3: "Märkä",
  4: "Märkä ja suolattu",
  5: "Kuura",
  6: "Lumi",
  7: "Jää",
  8: "Todennäköisesti kostea ja suolainen",
  9: "Sohjoinen",
};

const PRECIPITATION_DESCRIPTIONS = {
  7: "Pouta",
  8: "Hyvin heikko sade",
  9: "Tihku",
  10: "Vesisade",
  11: "Lumisade",
  12: "Märkä räntä",
  13: "Räntä",
  14: "Rakeita",
  15: "Jääkiteitä",
  16: "Lumijyväsiä",
  17: "Lumirakeita",
  18: "Jäätävä tihku",
  19: "Jäätävä sade",
};

const SIMPLE_RAIN_DESCRIPTIONS = {
  0: "Pouta",
  1: "Heikko sade",
  2: "Kohtalainen sade",
  3: "Runsas sade",
  4: "Heikko lumi/räntä",
  5: "Kohtalainen lumi/räntä",
  6: "Runsas lumi/räntä",
};

function scoreSurface(surfaceSensors, reasons) {
  let points = 0;
  let worst = null;
  for (const sensor of surfaceSensors) {
    const value = Number(sensor.value);
    let sensorPoints = 0;
    if (value === 7) sensorPoints = 4;
    else if ([5, 6, 9].includes(value)) sensorPoints = 3;
    else if ([2, 3, 4, 8].includes(value)) sensorPoints = 1;
    if (!worst || sensorPoints > worst.points) worst = { sensor, points: sensorPoints };
    points = Math.max(points, sensorPoints);
  }
  if (worst?.points)
    reasons.push(
      `Tienpinta: ${description(worst.sensor, SURFACE_DESCRIPTIONS)} (+${worst.points})`,
    );
  return { points, label: worst ? description(worst.sensor, SURFACE_DESCRIPTIONS) : null };
}

function scoreWarning(warningSensors, reasons) {
  let points = 0;
  for (const sensor of warningSensors) {
    const value = Number(sensor.value);
    const sensorPoints = value === 2 ? 3 : value === 3 ? 3 : value === 1 ? 2 : value === 4 ? 1 : 0;
    points = Math.max(points, sensorPoints);
  }
  if (points) reasons.push(`Tiesääaseman varoitustaso (+${points})`);
  return points;
}

function scoreRoadTemperature(temperature, reasons) {
  if (!Number.isFinite(temperature)) return 0;
  if (temperature < -1) {
    reasons.push(`Tienpinnan lämpötila ${formatNumber(temperature)} °C (+2)`);
    return 2;
  }
  if (temperature <= 1) {
    reasons.push(`Tienpinnan lämpötila lähellä nollaa: ${formatNumber(temperature)} °C (+1)`);
    return 1;
  }
  return 0;
}

function scorePrecipitation(typeSensor, rainSensor, reasons) {
  if (typeSensor) {
    const value = Number(typeSensor.value);
    let points = 0;
    if ([18, 19].includes(value)) points = 4;
    else if ([11, 12, 13, 14, 15, 16, 17].includes(value)) points = 2;
    else if ([8, 9, 10].includes(value)) points = 1;
    if (points)
      reasons.push(`Sade: ${description(typeSensor, PRECIPITATION_DESCRIPTIONS)} (+${points})`);
    return { points, label: description(typeSensor, PRECIPITATION_DESCRIPTIONS) };
  }
  if (rainSensor) {
    const value = Number(rainSensor.value);
    const points = value >= 4 ? 2 : value >= 1 ? 1 : 0;
    if (points)
      reasons.push(`Sade: ${description(rainSensor, SIMPLE_RAIN_DESCRIPTIONS)} (+${points})`);
    return { points, label: description(rainSensor, SIMPLE_RAIN_DESCRIPTIONS) };
  }
  return { points: 0, label: null };
}

function scoreVisibility(visibility, reasons) {
  if (!Number.isFinite(visibility)) return 0;
  let points = 0;
  if (visibility < 0.5) points = 3;
  else if (visibility < 2) points = 2;
  else if (visibility < 5) points = 1;
  if (points) reasons.push(`Näkyvyys ${formatNumber(visibility)} km (+${points})`);
  return points;
}

function scoreWind(maxWind, reasons) {
  if (!Number.isFinite(maxWind)) return 0;
  let points = 0;
  if (maxWind >= 25) points = 3;
  else if (maxWind >= 17) points = 2;
  else if (maxWind >= 12) points = 1;
  if (points) reasons.push(`Tuulen maksiminopeus ${formatNumber(maxWind)} m/s (+${points})`);
  return points;
}

function levelForScore(score) {
  if (score >= 7) return RISK_LEVELS.extreme;
  if (score >= 4) return RISK_LEVELS.difficult;
  if (score >= 2) return RISK_LEVELS.attention;
  return RISK_LEVELS.normal;
}

export function formatNumber(value, digits = 1) {
  return Number.isFinite(Number(value))
    ? new Intl.NumberFormat("fi-FI", { maximumFractionDigits: digits }).format(Number(value))
    : "–";
}

function hasCoreObservation(entries) {
  return (
    Number.isFinite(minimumValue(entries, ["TIE"])) ||
    sensorsByPrefix(entries, ["KELI"]).length > 0 ||
    Boolean(firstSensor(entries, ["SATEEN_OLOMUOTO_PWDXX"])) ||
    Boolean(firstSensor(entries, ["SADE"])) ||
    Number.isFinite(minimumValue(entries, ["NAKYVYYS_KM"]))
  );
}

export function evaluateStation(stationData, now = new Date()) {
  const sensorValues = stationData?.sensorValues ?? [];
  const fresh = freshSensors(sensorValues, now);
  const entries = sensorEntries(fresh);
  // What the station last reported at all. Shown as "Havainto X sitten", and
  // the only thing worth showing when nothing is fresh enough to score --
  // note it deliberately includes dataUpdatedTime, which is a payload stamp
  // rather than a measurement and must never gate scoring on its own.
  const latestTime = latestMeasurementTime(sensorValues, stationData?.dataUpdatedTime);
  // How old the data behind the score actually is.
  const scoredTime = latestMeasurementTime(fresh);
  const ageMs = scoredTime ? now.getTime() - Date.parse(scoredTime) : Number.POSITIVE_INFINITY;

  const roadTemperature = minimumValue(entries, ["TIE"]);
  const airTemperature = firstSensor(entries, ["ILMA"]);
  const visibility = minimumValue(entries, ["NAKYVYYS_KM"]);
  const maxWind = maximumValue(entries, ["MAKSIMITUULI"]);
  const averageWind = maximumValue(entries, ["KESKITUULI"]);
  const surfaceSensors = sensorsByPrefix(entries, ["KELI"]);
  const warningSensors = sensorsByPrefix(entries, ["VAROITUS"]);
  const precipitationType = firstSensor(entries, ["SATEEN_OLOMUOTO_PWDXX"]);
  const simpleRain = firstSensor(entries, ["SADE"]);

  const hasCoreMeasurement = hasCoreObservation(entries);
  // Distinguishes "the station reported, but too long ago" from "this station
  // does not measure the things the score needs at all".
  const coreWentStale = !hasCoreMeasurement && hasCoreObservation(sensorEntries(sensorValues));

  if (!hasCoreMeasurement) {
    return {
      score: null,
      level: RISK_LEVELS.stale,
      reasons: coreWentStale
        ? [`Mittaus on yli ${Math.round(STALE_AFTER_MS / MINUTE_MS)} minuuttia vanha.`]
        : ["Keskeisiä kelihavaintoja ei ole saatavilla."],
      latestTime,
      ageMs,
      metrics: {
        roadTemperature,
        airTemperature: airTemperature ? Number(airTemperature.value) : null,
        surface: surfaceSensors[0] ? description(surfaceSensors[0], SURFACE_DESCRIPTIONS) : null,
        precipitation: precipitationType
          ? description(precipitationType, PRECIPITATION_DESCRIPTIONS)
          : simpleRain
            ? description(simpleRain, SIMPLE_RAIN_DESCRIPTIONS)
            : null,
        visibility,
        maxWind,
        averageWind,
      },
    };
  }

  const reasons = [];
  let score = 0;
  const surface = scoreSurface(surfaceSensors, reasons);
  score += surface.points;
  score += scoreWarning(warningSensors, reasons);
  score += scoreRoadTemperature(roadTemperature, reasons);
  const precipitation = scorePrecipitation(precipitationType, simpleRain, reasons);
  score += precipitation.points;
  score += scoreVisibility(visibility, reasons);
  score += scoreWind(maxWind, reasons);

  if (!reasons.length) reasons.push("Ei tunnistettuja merkittäviä kelitekijöitä.");

  return {
    score,
    level: levelForScore(score),
    reasons,
    latestTime,
    ageMs,
    metrics: {
      roadTemperature,
      airTemperature: airTemperature ? Number(airTemperature.value) : null,
      surface: surface.label,
      precipitation: precipitation.label,
      visibility,
      maxWind,
      averageWind,
    },
  };
}

export function buildStationView(feature, stationData, now = new Date()) {
  const evaluation = evaluateStation(stationData, now);
  return {
    id: Number(feature.id ?? feature.properties?.id),
    name: feature.properties?.name || `Asema ${feature.id}`,
    coordinates: feature.geometry?.coordinates ?? [0, 0],
    collectionStatus: feature.properties?.collectionStatus,
    stationState: feature.properties?.state,
    dataUpdatedTime: stationData?.dataUpdatedTime || feature.properties?.dataUpdatedTime || null,
    ...evaluation,
  };
}

export function relativeAge(isoTime, now = new Date()) {
  if (!isoTime) return "ei aikaleimaa";
  const diffMinutes = Math.max(0, Math.round((now.getTime() - Date.parse(isoTime)) / MINUTE_MS));
  if (diffMinutes < 1) return "alle minuutti sitten";
  if (diffMinutes === 1) return "1 minuutti sitten";
  if (diffMinutes < 60) return `${diffMinutes} minuuttia sitten`;
  const hours = Math.round(diffMinutes / 60);
  return `${hours} h sitten`;
}

export function haversineKm([lon1, lat1], [lon2, lat2]) {
  const toRad = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
