/**
 * Végponttól végpontig tartó teszt a termék legfontosabb útvonalára:
 * koordináta → hivatalos zónakészlet → zónakód + fizetős időszak.
 *
 * Hálózat nélkül fut: az Overpass válaszát rögzített minta helyettesíti.
 */
const assert = require("node:assert");
const ds = require("../.test-build/lib/zoneDataset.js");
const zone = require("../.test-build/lib/zone.js");
const official = require("../.test-build/lib/officialLayer.js");
const oh = require("../.test-build/lib/openingHours.js");

let pass = 0;
function ok(name, fn) {
  try { fn(); pass++; console.log("ok   -", name); }
  catch (e) { console.log("FAIL -", name, "\n     ", e.message); process.exitCode = 1; }
}

const rect = (a, b, c, d) => ([
  { lat: a, lon: b }, { lat: a, lon: d }, { lat: c, lon: d }, { lat: c, lon: b }, { lat: a, lon: b },
]);

function makeFeature(code, box, extra = {}) {
  const polygons = [{ outers: [rect(...box)], inners: [] }];
  return {
    code, name: extra.name ?? null, city: extra.city ?? null,
    district: extra.district ?? null, category: null,
    hourlyRateHUF: extra.hourlyRateHUF ?? null,
    openingHours: extra.openingHours ?? null,
    maxstay: extra.maxstay ?? null, operator: extra.operator ?? null,
    bbox: ds.computeBbox(polygons), polygons,
  };
}

// Ferencváros mintaként: a bejelentett IX. kerületi eset.
const FERENCVAROS = makeFeature("3061", [47.480, 19.060, 47.490, 19.075], {
  name: "Ferencváros belső",
  city: "Budapest",
  district: "IX. kerület",
  hourlyRateHUF: 600,
  openingHours: "Mo-Fr 08:00-18:00",
  maxstay: "3 h",
  operator: "Budapest Közút",
});

// Az OSM oldali válasz: van utcanév és kerület, de zónakód sehol.
const OSM_RESPONSE = { elements: [
  { type: "area", id: 3_600_000_001, tags: { boundary: "administrative", admin_level: "8", name: "Budapest" } },
  { type: "area", id: 3_600_000_002, tags: { boundary: "administrative", admin_level: "9", name: "IX. kerület" } },
  { type: "way", id: 555, tags: { highway: "residential", name: "Tűzoltó utca" },
    geometry: [{ lat: 47.4849, lon: 19.0669 }, { lat: 47.4851, lon: 19.0671 }] },
]};

const POINT = { lat: 47.4850, lon: 19.0670 };

ok("hivatalos adat nélkül nincs zónakód — ez a jelenlegi valóság", () => {
  const lookup = zone.parseLookup(OSM_RESPONSE, POINT);
  assert.strictEqual(lookup.verdict.code, null);
  assert.strictEqual(lookup.verdict.source, "none");
  assert.strictEqual(lookup.verdict.paid, "unknown");
  assert.strictEqual(lookup.streetName, "Tűzoltó utca");
});

ok("betöltött hivatalos zónával a koordinátából megvan a kód", () => {
  const hit = ds.findZoneIn([FERENCVAROS], POINT);
  assert.ok(hit, "a pontnak a zónában kell lennie");

  const lookup = official.applyOfficial(zone.parseLookup(OSM_RESPONSE, POINT), hit);
  assert.strictEqual(lookup.verdict.source, "official");
  assert.strictEqual(lookup.verdict.code, "3061");
  assert.strictEqual(lookup.verdict.paid, "paid");
  assert.strictEqual(lookup.verdict.confidence, "high");
  assert.strictEqual(lookup.verdict.hoursExpression, "Mo-Fr 08:00-18:00");
  assert.ok(lookup.verdict.charge.includes("600"), "az óradíj megjelenik");
  assert.strictEqual(lookup.verdict.maxstay, "3 h");
});

ok("az OSM kontextus megmarad a hivatalos találat mellett", () => {
  const hit = ds.findZoneIn([FERENCVAROS], POINT);
  const lookup = official.applyOfficial(zone.parseLookup(OSM_RESPONSE, POINT), hit);
  assert.strictEqual(lookup.streetName, "Tűzoltó utca");
  assert.strictEqual(lookup.admin.district, "IX. kerület");
  assert.ok(lookup.zones[0].outline.length > 0, "van körvonal a térképhez");
});

ok("a zónán kívüli pont nem kap kódot a szomszéd zónából", () => {
  const outside = { lat: 47.4850, lon: 19.0900 };
  assert.strictEqual(ds.findZoneIn([FERENCVAROS], outside), null);
  const lookup = official.applyOfficial(zone.parseLookup(OSM_RESPONSE, outside), null);
  assert.strictEqual(lookup.verdict.code, null);
});

ok("Overpass kiesésekor is válaszolunk, ha van hivatalos adat", () => {
  const hit = ds.findZoneIn([FERENCVAROS], POINT);
  const lookup = official.applyOfficial(official.emptyLookup(POINT), hit);
  assert.strictEqual(lookup.verdict.code, "3061");
  assert.strictEqual(lookup.streetName, null, "utcanév nélkül, de a lényeg megvan");
});

ok("a 18 órás eset: ugyanaz a zóna délután fizetős, este nem", () => {
  const hit = ds.findZoneIn([FERENCVAROS], POINT);
  const lookup = official.applyOfficial(official.emptyLookup(POINT), hit);
  const expr = lookup.verdict.hoursExpression;

  const delutan = oh.evaluateHours(expr, new Date("2026-08-19T12:00:00Z")); // szerda 14:00
  assert.strictEqual(delutan.activeNow, true);
  assert.strictEqual(delutan.nextChange, "18:00");

  const este = oh.evaluateHours(expr, new Date("2026-08-19T17:00:00Z")); // szerda 19:00
  assert.strictEqual(este.activeNow, false, "18 óra után már nem fizetős");

  const szombat = oh.evaluateHours(expr, new Date("2026-08-22T12:00:00Z"));
  assert.strictEqual(szombat.activeNow, false, "hétvégén nem fizetős");
});

ok("két egymás melletti zóna között a határ helyesen dönt", () => {
  const A = makeFeature("3061", [47.480, 19.060, 47.490, 19.070]);
  const B = makeFeature("3062", [47.480, 19.070, 47.490, 19.080]);
  assert.strictEqual(ds.findZoneIn([A, B], { lat: 47.485, lon: 19.065 }).feature.code, "3061");
  assert.strictEqual(ds.findZoneIn([A, B], { lat: 47.485, lon: 19.075 }).feature.code, "3062");
});

console.log("\n" + pass + " teszt futott le sikeresen.");

// ---------------------------------------------------------------------------
// Utcajegyzék-útvonal: poligon nélkül, pusztán utcanév + kerület alapján.
// Ez a legkönnyebben beszerezhető hivatalos adat, ezért külön is bizonyítjuk.

const sn = require("../.test-build/lib/streetNames.js");

const tableEntry = (street, district, code, extra = {}) => ({
  street, key: sn.normalizeStreet(street), city: "Budapest", district, code,
  houseNumbers: extra.houseNumbers ?? null,
  openingHours: extra.openingHours ?? null,
  hourlyRateHUF: extra.hourlyRateHUF ?? null,
  maxstay: extra.maxstay ?? null,
});

const STREET_TABLE = [
  tableEntry("Tűzoltó u.", 9, "3061", { openingHours: "Mo-Fr 08:00-18:00", hourlyRateHUF: 600, maxstay: "3 h" }),
  tableEntry("Ráday utca", 9, "3061", { houseNumbers: "1-25" }),
  tableEntry("Ráday utca", 9, "3062", { houseNumbers: "27-99" }),
];

function osmWithStreet(name) {
  return { elements: [
    { type: "area", id: 3_600_000_001, tags: { boundary: "administrative", admin_level: "8", name: "Budapest" } },
    { type: "area", id: 3_600_000_002, tags: { boundary: "administrative", admin_level: "9", name: "IX. kerület" } },
    { type: "way", id: 900, tags: { highway: "residential", name },
      geometry: [{ lat: 47.4849, lon: 19.0669 }, { lat: 47.4851, lon: 19.0671 }] },
  ]};
}

ok("GPS → utcanév → hivatalos utcajegyzék → zónakód", () => {
  const base = zone.parseLookup(osmWithStreet("Tűzoltó utca"), POINT);
  assert.strictEqual(base.verdict.code, null, "önmagában az OSM nem tud kódot");

  const withTable = official.applyStreetZone(base, STREET_TABLE);
  assert.strictEqual(withTable.verdict.source, "street-table");
  assert.strictEqual(withTable.verdict.code, "3061");
  assert.strictEqual(withTable.verdict.paid, "paid");
  assert.strictEqual(withTable.verdict.confidence, "high");
  assert.strictEqual(withTable.verdict.hoursExpression, "Mo-Fr 08:00-18:00");
  assert.ok(withTable.verdict.charge.includes("600"));
});

ok("házszám szerint megosztott utcánál kódot nem, alternatívákat adunk", () => {
  const base = zone.parseLookup(osmWithStreet("Ráday utca"), POINT);
  const withTable = official.applyStreetZone(base, STREET_TABLE);

  assert.strictEqual(withTable.verdict.source, "street-table");
  assert.strictEqual(withTable.verdict.paid, "paid", "azt tudjuk, hogy fizetős");
  assert.strictEqual(withTable.verdict.code, null, "de a kódot nem találjuk ki");
  assert.deepStrictEqual(
    withTable.verdict.alternatives.map((a) => a.code).sort(),
    ["3061", "3062"],
  );
  assert.ok(withTable.verdict.evidence.some((e) => e.includes("több zónára")));
});

ok("jegyzékben nem szereplő utca nem kap kitalált kódot", () => {
  const base = zone.parseLookup(osmWithStreet("Ismeretlen utca"), POINT);
  const withTable = official.applyStreetZone(base, STREET_TABLE);
  assert.strictEqual(withTable.verdict.code, null);
  assert.strictEqual(withTable.verdict.source, "none");
});

ok("üres jegyzékkel a válasz változatlan marad", () => {
  const base = zone.parseLookup(osmWithStreet("Tűzoltó utca"), POINT);
  const withTable = official.applyStreetZone(base, []);
  assert.deepStrictEqual(withTable.verdict, base.verdict);
});

console.log("\n" + pass + " teszt futott le sikeresen (utcajegyzékkel együtt).");
