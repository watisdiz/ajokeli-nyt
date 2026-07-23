import assert from "node:assert/strict";
import test from "node:test";
import {
  RADAR_BOUNDS,
  analyzeRouteRain,
  buildRadarGeoTiffUrl,
  buildRadarQueryUrl,
  intensityFromRaw,
  latestRadarReference,
  radarImageCoordinates,
  rainColor,
  transformationFromXml,
} from "../radar.js";

test("buildRadarQueryUrl requests the FMI rainfall-intensity composite", () => {
  const url = new URL(buildRadarQueryUrl(new Date("2026-07-23T12:30:00Z"), 20));
  assert.equal(url.hostname, "opendata.fmi.fi");
  assert.equal(url.searchParams.get("storedquery_id"), "fmi::radar::composite::rr");
  assert.equal(url.searchParams.get("starttime"), "2026-07-23T12:10:00.000Z");
  assert.equal(url.searchParams.get("endtime"), "2026-07-23T12:30:00.000Z");
});

test("latestRadarReference chooses the newest FMI file reference", () => {
  const xml = `
    <root xmlns:gml="http://www.opengis.net/gml/3.2">
      <gml:fileReference>http://openwms.fmi.fi/geoserver/Radar/wms?time=2026-07-23T12%3A20%3A00Z&amp;layers=Radar%3Asuomi_rr_eureffin</gml:fileReference>
      <gml:fileReference>http://openwms.fmi.fi/geoserver/Radar/wms?time=2026-07-23T12%3A25%3A00Z&amp;layers=Radar%3Asuomi_rr_eureffin</gml:fileReference>
    </root>`;
  const latest = latestRadarReference(xml);
  assert.equal(latest.time, "2026-07-23T12:25:00Z");
  assert.match(latest.url, /suomi_rr_eureffin/);
});

test("transformation metadata and raw rainfall values are interpreted", () => {
  const xml = `
    <linearTransformationGain>0.02</linearTransformationGain>
    <linearTransformationOffset>-0.1</linearTransformationOffset>`;
  assert.deepEqual(transformationFromXml(xml), { gain: 0.02, offset: -0.1 });
  assert.equal(intensityFromRaw(105, 0.02, -0.1), 2);
});

test("buildRadarGeoTiffUrl keeps Download Service GeoTIFF format", () => {
  const url = new URL(
    buildRadarGeoTiffUrl(
      "http://openwms.fmi.fi/geoserver/Radar/wms?layers=Radar%3Asuomi_rr_eureffin&time=2026-07-23T12%3A25%3A00Z&srs=EPSG%3A3067",
    ),
  );
  assert.equal(url.protocol, "https:");
  assert.equal(url.searchParams.get("format"), "image/geotiff");
  assert.equal(url.searchParams.get("crs"), "EPSG:4326");
  assert.equal(url.searchParams.has("srs"), false);
  assert.equal(url.searchParams.get("bbox"), "59.7,19.1,70.1,31.7");
  assert.deepEqual(radarImageCoordinates(), [
    [RADAR_BOUNDS.west, RADAR_BOUNDS.north],
    [RADAR_BOUNDS.east, RADAR_BOUNDS.north],
    [RADAR_BOUNDS.east, RADAR_BOUNDS.south],
    [RADAR_BOUNDS.west, RADAR_BOUNDS.south],
  ]);
});

test("rain palette leaves dry pixels transparent and highlights heavy rain", () => {
  assert.deepEqual(rainColor(0.05), [0, 0, 0, 0]);
  assert.equal(rainColor(0.5)[3] > 0, true);
  assert.deepEqual(rainColor(12).slice(0, 3), [255, 74, 35]);
});

test("route rain analysis estimates rainy distance and maximum intensity", () => {
  const width = 4;
  const height = 4;
  const intensities = new Float32Array([
    0, 0, 0, 0,
    0, 2, 7, 0,
    0, 0, 0, 0,
    0, 0, 0, 0,
  ]);
  const route = [
    [22.25, 66.2],
    [25.4, 66.2],
    [28.55, 66.2],
  ];
  const analysis = analyzeRouteRain(intensities, width, height, route);
  assert.equal(analysis.totalKm > 250, true);
  assert.equal(analysis.rainyKm > 0, true);
  assert.equal(analysis.maxIntensity >= 7, true);
  assert.equal(analysis.level.key, "heavy");
});
