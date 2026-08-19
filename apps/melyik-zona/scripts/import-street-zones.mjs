#!/usr/bin/env node
/**
 * Hivatalos utcajegyzék (CSV vagy JSON) → data/street-zones.json
 *
 * Ez a legkönnyebben beszerezhető zónaadat: a szolgáltatók utcanév szerint
 * teszik közzé, melyik közterület melyik zónába tartozik. Poligon nem kell
 * hozzá, mégis megadja a zónakódot — az utcanevet az OpenStreetMapből
 * megkapjuk a GPS-pont mellé.
 *
 * Használat:
 *   node scripts/import-street-zones.mjs <fájl.csv|fájl.json|URL> [opciók]
 *
 * Opciók (mind opcionális, a script próbál magától felismerni):
 *   --street <oszlop>    közterület neve
 *   --code <oszlop>      zónakód
 *   --district <oszlop>  kerület
 *   --city <oszlop>      település
 *   --house <oszlop>     házszám-tartomány
 *   --hours <oszlop>     fizetős időszak (opening_hours szintaxis)
 *   --rate <oszlop>      óradíj
 *   --maxstay <oszlop>   max. várakozás
 *   --delimiter <jel>    CSV elválasztó (alap: automatikus , ; vagy tab)
 *   --source "<szöveg>"  az adat eredete
 *   --license "<szöveg>" licenc
 *   --out <fájl>         kimenet (alap: data/street-zones.json)
 *   --dry-run            csak jelentés
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { normalizeStreet, normalizeDistrict, stripDiacritics } from "./_streetNames.mjs";

const args = process.argv.slice(2);
if (args.length === 0 || args[0].startsWith("--")) {
  console.error("Használat: node scripts/import-street-zones.mjs <fájl.csv|fájl.json|URL> [opciók]");
  process.exit(1);
}

const inputPath = args[0];
const options = {};
for (let i = 1; i < args.length; i++) {
  if (!args[i].startsWith("--")) continue;
  const key = args[i].slice(2);
  if (key === "dry-run") { options.dryRun = true; continue; }
  options[key] = args[i + 1];
  i++;
}

const CANDIDATES = {
  street: ["street", "kozterulet", "kozterulet_neve", "utca", "utcanev", "nev", "kozterulet_nev"],
  code: ["code", "kod", "zonakod", "zona", "zone", "ref"],
  district: ["district", "kerulet", "ker"],
  city: ["city", "telepules", "varos"],
  house: ["house", "hazszam", "hazszamok", "szakasz", "tartomany"],
  hours: ["hours", "opening_hours", "idoszak", "fizetos_idoszak", "dijfizetesi_idoszak"],
  rate: ["rate", "dij", "oradij", "tarifa", "ar"],
  maxstay: ["maxstay", "max_stay", "idokorlat", "max_varakozas", "varakozasi_ido"],
};

function detectDelimiter(text) {
  if (options.delimiter) return options.delimiter === "tab" ? "\t" : options.delimiter;
  const firstLine = text.split(/\r?\n/)[0] ?? "";
  const counts = { ",": 0, ";": 0, "\t": 0 };
  for (const ch of firstLine) if (ch in counts) counts[ch] += 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

/** Idézőjeleket is kezelő, egyszerű CSV-olvasó. */
function parseCsv(text, delimiter) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === delimiter) { row.push(field); field = ""; continue; }
    if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    if (ch === "\r") continue;
    field += ch;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }

  const header = (rows.shift() ?? []).map((h) => h.trim());
  return rows
    .filter((r) => r.some((cell) => cell.trim() !== ""))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
}

function headerKey(name) {
  return stripDiacritics(String(name))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function pickField(sample, kind) {
  if (options[kind]) return options[kind];
  const keys = Object.keys(sample ?? {});
  const lowered = new Map(keys.map((k) => [headerKey(k), k]));
  for (const candidate of CANDIDATES[kind]) {
    const hit = lowered.get(candidate);
    if (hit) return hit;
  }
  return null;
}

function readValue(row, field) {
  if (!field) return null;
  const value = row?.[field];
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

async function loadInput(source) {
  let text;
  if (/^https?:\/\//i.test(source)) {
    console.log(`Letöltés: ${source}`);
    const response = await fetch(source, { signal: AbortSignal.timeout(120_000) });
    if (!response.ok) {
      console.error(`HIBA: a letöltés ${response.status} státusszal tért vissza.`);
      process.exit(1);
    }
    text = await response.text();
  } else {
    text = readFileSync(resolve(source), "utf8");
  }

  const trimmed = text.trimStart();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const json = JSON.parse(text);
    return Array.isArray(json) ? json : (json.rows ?? json.data ?? json.entries ?? []);
  }
  return parseCsv(text, detectDelimiter(text));
}

const rows = await loadInput(inputPath);
if (!Array.isArray(rows) || rows.length === 0) {
  console.error("A bemenet nem tartalmaz sorokat.");
  process.exit(1);
}

const fields = Object.fromEntries(
  Object.keys(CANDIDATES).map((kind) => [kind, pickField(rows[0], kind)]),
);

console.log("Felismert oszlopok:");
for (const [kind, field] of Object.entries(fields)) {
  console.log(`  ${kind.padEnd(9)} → ${field ?? "(nincs)"}`);
}
if (!fields.street || !fields.code) {
  console.error("\nHIBA: közterület- és zónakód-oszlop nélkül nem lehet importálni.");
  console.error("Add meg kézzel: --street <oszlop> --code <oszlop>");
  console.error(`Elérhető oszlopok: ${Object.keys(rows[0]).join(", ")}`);
  process.exit(1);
}

const entries = [];
const skipped = { noStreet: 0, noCode: 0, badKey: 0 };

for (const row of rows) {
  const street = readValue(row, fields.street);
  const code = readValue(row, fields.code);
  if (!street) { skipped.noStreet += 1; continue; }
  if (!code) { skipped.noCode += 1; continue; }

  const key = normalizeStreet(street);
  if (!key) { skipped.badKey += 1; continue; }

  const rateText = readValue(row, fields.rate);
  const rate = rateText === null
    ? null
    : Number(rateText.replace(/[^\d.,]/g, "").replace(",", "."));

  entries.push({
    street,
    key,
    city: readValue(row, fields.city),
    district: normalizeDistrict(readValue(row, fields.district)),
    code,
    houseNumbers: readValue(row, fields.house),
    openingHours: readValue(row, fields.hours),
    hourlyRateHUF: Number.isFinite(rate) ? rate : null,
    maxstay: readValue(row, fields.maxstay),
  });
}

// Minőségjelentés: hány utcanév vezet több zónakódhoz?
const byKey = new Map();
for (const entry of entries) {
  const scope = `${entry.district ?? entry.city ?? ""}|${entry.key}`;
  if (!byKey.has(scope)) byKey.set(scope, new Set());
  byKey.get(scope).add(entry.code);
}
const ambiguous = [...byKey.entries()].filter(([, codes]) => codes.size > 1);

const table = {
  version: new Date().toISOString().slice(0, 10),
  source: options.source ?? "ISMERETLEN — add meg a --source kapcsolóval!",
  license: options.license ?? "",
  fetchedAt: new Date().toISOString(),
  entries,
};

console.log("\nEredmény:");
console.log(`  importált sor:            ${entries.length}`);
console.log(`  egyedi közterület:        ${byKey.size}`);
console.log(`  kerülettel:               ${entries.filter((e) => e.district !== null).length}`);
console.log(`  fizetős időszakkal:       ${entries.filter((e) => e.openingHours).length}`);
console.log(`  óradíjjal:                ${entries.filter((e) => e.hourlyRateHUF !== null).length}`);
console.log(`  több zónás közterület:    ${ambiguous.length}  (ezeknél nem tippelünk, a felület jelzi)`);
if (skipped.noStreet) console.log(`  kihagyva (nincs utcanév): ${skipped.noStreet}`);
if (skipped.noCode) console.log(`  kihagyva (nincs kód):     ${skipped.noCode}`);
if (skipped.badKey) console.log(`  kihagyva (üres kulcs):    ${skipped.badKey}`);

if (ambiguous.length > 0) {
  console.log("\n  Példák többzónás közterületre:");
  for (const [scope, codes] of ambiguous.slice(0, 5)) {
    console.log(`    ${scope.split("|")[1]} → ${[...codes].join(", ")}`);
  }
}

if (!options.source) {
  console.warn("\nFIGYELEM: nem adtál meg --source értéket. Az adat eredete visszakövethetetlen lesz.");
}

if (options.dryRun) {
  console.log("\n--dry-run: fájl nem íródott ki.");
  process.exit(0);
}

const outPath = resolve(options.out ?? "data/street-zones.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(table, null, 0) + "\n", "utf8");
console.log(`\nKiírva: ${outPath}`);
