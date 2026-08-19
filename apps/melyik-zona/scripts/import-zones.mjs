#!/usr/bin/env node
/**
 * Hivatalos parkolási zóna GeoJSON → data/zones.json
 *
 * Használat:
 *   node scripts/import-zones.mjs <bemenet.geojson> [opciók]
 *
 * Opciók:
 *   --code <mező>       a zónakódot tartalmazó property neve
 *   --name <mező>       a zóna nevének property neve
 *   --city <mező>       település
 *   --district <mező>   kerület
 *   --category <mező>   övezet-kategória (A/B/C…)
 *   --rate <mező>       óradíj (szám, Ft)
 *   --hours <mező>      fizetős időszak opening_hours szintaxisban
 *   --maxstay <mező>    maximális várakozási idő
 *   --operator <mező>   üzemeltető
 *   --source "<szöveg>" honnan származik az adat (kötelező)
 *   --license "<szöveg>" licenc megnevezése
 *   --out <fájl>        kimenet (alap: data/zones.json)
 *   --dry-run           csak jelentés, nem ír fájlt
 *
 * A megadott mezőneveket nem kötelező kitölteni: ha nincs megadva, a script
 * megpróbálja a szokásos elnevezéseket (code, kod, zona, zonakod, ref…).
 *
 * FONTOS: a bemenetnek WGS84 (EPSG:4326) koordinátákban kell lennie. A magyar
 * hivatalos állományok gyakran EOV-ban (EPSG:23700) érkeznek — azt a script
 * felismeri és megtagadja az importot, mert az átvetítés nélkül minden
 * koordináta hibás lenne.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const args = process.argv.slice(2);
if (args.length === 0 || args[0].startsWith("--")) {
  console.error("Használat: node scripts/import-zones.mjs <bemenet.geojson> [opciók]");
  console.error("A teljes opciólista a fájl fejlécében található.");
  process.exit(1);
}

const inputPath = args[0];
const options = {};
for (let i = 1; i < args.length; i++) {
  if (!args[i].startsWith("--")) continue;
  const key = args[i].slice(2);
  if (key === "dry-run") {
    options.dryRun = true;
    continue;
  }
  options[key] = args[i + 1];
  i++;
}

const CANDIDATES = {
  code: ["code", "kod", "kód", "zona", "zóna", "zonakod", "zónakód", "zone_code", "ref", "zonaszam", "zone"],
  name: ["name", "nev", "név", "megnevezes", "megnevezés", "title"],
  city: ["city", "telepules", "település", "varos", "város"],
  district: ["district", "kerulet", "kerület"],
  category: ["category", "kategoria", "kategória", "ovezet", "övezet", "zone_type", "tipus", "típus"],
  rate: ["rate", "dij", "díj", "oradij", "óradíj", "hourly_rate", "ar", "ár", "tarifa"],
  hours: ["hours", "opening_hours", "idoszak", "időszak", "fizetos_idoszak", "sav"],
  maxstay: ["maxstay", "max_stay", "max_varakozas", "maxvarakozas", "idokorlat", "időkorlát"],
  operator: ["operator", "uzemelteto", "üzemeltető", "kezelo", "kezelő"],
};

function pickField(properties, kind) {
  if (options[kind]) return options[kind];
  const keys = Object.keys(properties ?? {});
  const lowered = new Map(keys.map((k) => [k.toLowerCase(), k]));
  for (const candidate of CANDIDATES[kind]) {
    const hit = lowered.get(candidate);
    if (hit) return hit;
  }
  return null;
}

function readValue(properties, field) {
  if (!field) return null;
  const value = properties?.[field];
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function ringFromCoords(coords) {
  return coords.map(([lon, lat]) => ({ lat, lon }));
}

function polygonsOf(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") {
    const [outer, ...holes] = geometry.coordinates;
    return [{ outers: [ringFromCoords(outer)], inners: holes.map(ringFromCoords) }];
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.map((polygon) => {
      const [outer, ...holes] = polygon;
      return { outers: [ringFromCoords(outer)], inners: holes.map(ringFromCoords) };
    });
  }
  if (geometry.type === "GeometryCollection") {
    return geometry.geometries.flatMap(polygonsOf);
  }
  return [];
}

function computeBbox(polygons) {
  let minLat = Infinity, minLon = Infinity, maxLat = -Infinity, maxLon = -Infinity;
  for (const polygon of polygons) {
    for (const ring of [...polygon.outers, ...polygon.inners]) {
      for (const p of ring) {
        if (p.lat < minLat) minLat = p.lat;
        if (p.lat > maxLat) maxLat = p.lat;
        if (p.lon < minLon) minLon = p.lon;
        if (p.lon > maxLon) maxLon = p.lon;
      }
    }
  }
  return [minLat, minLon, maxLat, maxLon];
}

/** Magyarország befoglaló téglalapja — a józansági ellenőrzéshez. */
const HU = { south: 45.5, west: 15.9, north: 48.8, east: 23.1 };

const raw = JSON.parse(readFileSync(resolve(inputPath), "utf8"));
const features = raw.type === "FeatureCollection" ? raw.features : [raw];

if (!Array.isArray(features) || features.length === 0) {
  console.error("A bemenet nem tartalmaz feature-öket.");
  process.exit(1);
}

// --- Koordináta-rendszer ellenőrzés -----------------------------------------
const sampleGeom = features.find((f) => f.geometry)?.geometry;
const samplePolys = polygonsOf(sampleGeom);
if (samplePolys.length === 0) {
  console.error("A bemenetben nincs poligon geometria (Polygon vagy MultiPolygon kell).");
  process.exit(1);
}
const sampleBbox = computeBbox(samplePolys);
const looksProjected =
  Math.abs(sampleBbox[0]) > 90 || Math.abs(sampleBbox[1]) > 180 ||
  Math.abs(sampleBbox[2]) > 90 || Math.abs(sampleBbox[3]) > 180;

if (looksProjected) {
  console.error("HIBA: a koordináták nem WGS84 fok-értékek (valószínűleg EOV / EPSG:23700).");
  console.error(`Minta bbox: ${sampleBbox.join(", ")}`);
  console.error("Vetítsd át WGS84-re az import előtt, például:");
  console.error("  ogr2ogr -f GeoJSON -t_srs EPSG:4326 zonak-wgs84.geojson bemenet.geojson");
  process.exit(2);
}

const codeField = pickField(features[0].properties, "code");
const fields = {
  code: codeField,
  name: pickField(features[0].properties, "name"),
  city: pickField(features[0].properties, "city"),
  district: pickField(features[0].properties, "district"),
  category: pickField(features[0].properties, "category"),
  rate: pickField(features[0].properties, "rate"),
  hours: pickField(features[0].properties, "hours"),
  maxstay: pickField(features[0].properties, "maxstay"),
  operator: pickField(features[0].properties, "operator"),
};

console.log("Felismert mezők:");
for (const [kind, field] of Object.entries(fields)) {
  console.log(`  ${kind.padEnd(10)} → ${field ?? "(nincs)"}`);
}
if (!fields.code) {
  console.error("\nHIBA: nem találtam zónakód mezőt. Add meg kézzel: --code <mezőnév>");
  console.error(`Elérhető mezők: ${Object.keys(features[0].properties ?? {}).join(", ")}`);
  process.exit(1);
}

const out = [];
const problems = { noGeometry: 0, noCode: 0, outsideHungary: 0 };

for (const feature of features) {
  const polygons = polygonsOf(feature.geometry);
  if (polygons.length === 0) {
    problems.noGeometry += 1;
    continue;
  }
  const code = readValue(feature.properties, fields.code);
  if (!code) {
    problems.noCode += 1;
    continue;
  }
  const bbox = computeBbox(polygons);
  if (bbox[0] < HU.south || bbox[2] > HU.north || bbox[1] < HU.west || bbox[3] > HU.east) {
    problems.outsideHungary += 1;
    continue;
  }

  const rateText = readValue(feature.properties, fields.rate);
  const rate = rateText === null ? null : Number(rateText.replace(/[^\d.,]/g, "").replace(",", "."));

  out.push({
    code,
    name: readValue(feature.properties, fields.name),
    city: readValue(feature.properties, fields.city),
    district: readValue(feature.properties, fields.district),
    category: readValue(feature.properties, fields.category),
    hourlyRateHUF: Number.isFinite(rate) ? rate : null,
    openingHours: readValue(feature.properties, fields.hours),
    maxstay: readValue(feature.properties, fields.maxstay),
    operator: readValue(feature.properties, fields.operator),
    bbox,
    polygons,
  });
}

const dataset = {
  version: new Date().toISOString().slice(0, 10),
  source: options.source ?? "ISMERETLEN — add meg a --source kapcsolóval!",
  license: options.license ?? "",
  fetchedAt: new Date().toISOString(),
  features: out,
};

const withCode = out.filter((f) => f.code).length;
const withHours = out.filter((f) => f.openingHours).length;
const withRate = out.filter((f) => f.hourlyRateHUF !== null).length;
const vertexCount = out.reduce(
  (sum, f) => sum + f.polygons.reduce(
    (s, p) => s + [...p.outers, ...p.inners].reduce((n, r) => n + r.length, 0), 0), 0);

console.log("\nEredmény:");
console.log(`  importált zóna:        ${out.length}`);
console.log(`  ebből kóddal:          ${withCode}`);
console.log(`  fizetős időszakkal:    ${withHours}`);
console.log(`  óradíjjal:             ${withRate}`);
console.log(`  összes töréspont:      ${vertexCount}`);
if (problems.noGeometry) console.log(`  kihagyva (nincs geometria): ${problems.noGeometry}`);
if (problems.noCode) console.log(`  kihagyva (nincs kód):       ${problems.noCode}`);
if (problems.outsideHungary) console.log(`  kihagyva (Magyarországon kívül): ${problems.outsideHungary}`);

if (!options.source) {
  console.warn("\nFIGYELEM: nem adtál meg --source értéket. Az adat eredete visszakövethetetlen lesz.");
}

if (options.dryRun) {
  console.log("\n--dry-run: fájl nem íródott ki.");
  process.exit(0);
}

const outPath = resolve(options.out ?? "data/zones.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(dataset, null, 0) + "\n", "utf8");
console.log(`\nKiírva: ${outPath}`);
