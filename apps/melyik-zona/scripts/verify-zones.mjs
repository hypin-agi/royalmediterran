#!/usr/bin/env node
/**
 * A koordináta → zóna leképezés mérése éles adaton.
 *
 * Ez a script azt a kérdést válaszolja meg, ami az egész terméket eldönti:
 * tényleg meg tudjuk-e mondani egy GPS-pontról, melyik parkolási zónában van?
 *
 * Használat:
 *   node scripts/verify-zones.mjs                       # localhost:3000 ellen
 *   node scripts/verify-zones.mjs --base https://melyik-zona.vercel.app
 *   node scripts/verify-zones.mjs --json                # gépi kimenet
 *
 * Kilépőkód: 0, ha minden ellenőrző pont választ kapott, és a kontrollpontok
 * nem lettek tévesen fizetősnek jelölve. Egyébként 1 — így CI-ban is használható.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--json") options.json = true;
  else if (args[i].startsWith("--")) {
    options[args[i].slice(2)] = args[i + 1];
    i++;
  }
}

const base = (options.base ?? "http://localhost:3000").replace(/\/$/, "");
const { points } = JSON.parse(
  readFileSync(resolve("data/probe-points.json"), "utf8"),
);

const SOURCE_LABEL = {
  official: "hivatalos",
  zone: "OSM zóna",
  street: "OSM utca",
  lot: "parkoló",
  none: "—",
};

async function probe(point) {
  const url = `${base}/api/zone?lat=${point.lat}&lon=${point.lon}&debug=1`;
  const started = Date.now();
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(70_000),
    });
    const json = await response.json();
    return {
      point,
      ms: Date.now() - started,
      ok: response.ok,
      status: response.status,
      verdict: json.verdict ?? null,
      streetName: json.streetName ?? null,
      district: json.admin?.district ?? null,
      city: json.admin?.city ?? null,
      error: json.error ?? null,
    };
  } catch (error) {
    return {
      point,
      ms: Date.now() - started,
      ok: false,
      status: 0,
      verdict: null,
      error: String(error),
    };
  }
}

function pad(text, width) {
  const value = String(text ?? "");
  return value.length > width
    ? value.slice(0, width - 1) + "…"
    : value.padEnd(width);
}

console.error(`Cél: ${base}`);
console.error(`Ellenőrző pontok: ${points.length}`);
console.error("Az Overpass lassú tud lenni, ez eltarthat pár percig…\n");

const results = [];
for (const point of points) {
  const result = await probe(point);
  results.push(result);
  if (!options.json) {
    const v = result.verdict;
    console.log(
      [
        pad(point.label, 38),
        pad(v ? SOURCE_LABEL[v.source] ?? v.source : "HIBA", 11),
        pad(v?.code ?? "—", 8),
        pad(v?.paid ?? "—", 8),
        pad(v?.hoursExpression ?? "—", 22),
        pad(result.district ?? result.city ?? "—", 16),
        `${result.ms} ms`,
      ].join(" "),
    );
  }
  // Az Overpass fair-use korlátja miatt nem lövünk párhuzamosan.
  await new Promise((r) => setTimeout(r, 1200));
}

const answered = results.filter((r) => r.verdict !== null);
const withCode = results.filter((r) => r.verdict?.code);
const paid = results.filter((r) => r.verdict?.paid === "paid");
const errors = results.filter((r) => r.verdict === null);

const expectedPaid = results.filter((r) => r.point.expectation === "paid");
const expectedPaidGotCode = expectedPaid.filter((r) => r.verdict?.code);
const expectedPaidGotPaid = expectedPaid.filter((r) => r.verdict?.paid === "paid");
const controls = results.filter((r) => r.point.expectation === "free");
const controlsWronglyPaid = controls.filter((r) => r.verdict?.paid === "paid");

const summary = {
  base,
  total: results.length,
  answered: answered.length,
  errors: errors.length,
  withCode: withCode.length,
  paid: paid.length,
  expectedPaid: expectedPaid.length,
  expectedPaidGotPaid: expectedPaidGotPaid.length,
  expectedPaidGotCode: expectedPaidGotCode.length,
  controls: controls.length,
  controlsWronglyPaid: controlsWronglyPaid.length,
};

if (options.json) {
  console.log(JSON.stringify({ summary, results }, null, 2));
} else {
  console.log("\n" + "─".repeat(78));
  console.log("ÖSSZEGZÉS");
  console.log(`  válasz érkezett:                 ${summary.answered}/${summary.total}`);
  console.log(`  hibás lekérdezés:                ${summary.errors}`);
  console.log(`  fizetősnek jelölt pont:          ${summary.paid}`);
  console.log(`  ZÓNAKÓDOT KAPOTT:                ${summary.withCode}/${summary.total}`);
  console.log("");
  console.log(`  várhatóan fizetős pontok:        ${summary.expectedPaid}`);
  console.log(`    ebből fizetősnek ismertük fel: ${summary.expectedPaidGotPaid}`);
  console.log(`    ebből kódot is adtunk:         ${summary.expectedPaidGotCode}`);
  console.log(`  kontrollpont (nem fizetős):      ${summary.controls}`);
  console.log(`    tévesen fizetősnek jelölve:    ${summary.controlsWronglyPaid}`);
  console.log("─".repeat(78));

  if (summary.withCode === 0) {
    console.log("\nÍTÉLET: a rendszer EGYETLEN pontra sem tud zónakódot mondani.");
    console.log("Ez azt jelenti, hogy a nyílt térképadat nem elég — be kell tölteni");
    console.log("a hivatalos zónakészletet:  node scripts/import-zones.mjs <fájl.geojson>");
  } else if (summary.expectedPaidGotCode < summary.expectedPaid) {
    console.log(
      `\nÍTÉLET: részleges lefedettség — ${summary.expectedPaidGotCode}/${summary.expectedPaid} ponton van zónakód.`,
    );
    console.log("A hiányzó területekre hivatalos adat betöltése kell.");
  } else {
    console.log("\nÍTÉLET: minden várhatóan fizetős ponton van zónakód.");
  }
}

const failed = summary.errors > 0 || summary.controlsWronglyPaid > 0;
process.exit(failed ? 1 : 0);
