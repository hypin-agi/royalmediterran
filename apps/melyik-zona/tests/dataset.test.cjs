const assert = require("node:assert");
const ds = require("../.test-build/lib/zoneDataset.js");

let pass = 0;
function ok(name, fn) {
  try { fn(); pass++; console.log("ok   -", name); }
  catch (e) { console.log("FAIL -", name, "\n     ", e.message); process.exitCode = 1; }
}

const rect = (minLat, minLon, maxLat, maxLon) => ([
  { lat: minLat, lon: minLon },
  { lat: minLat, lon: maxLon },
  { lat: maxLat, lon: maxLon },
  { lat: maxLat, lon: minLon },
  { lat: minLat, lon: minLon },
]);

function feature(code, minLat, minLon, maxLat, maxLon, extra = {}) {
  const polygons = [{ outers: [rect(minLat, minLon, maxLat, maxLon)], inners: [] }];
  return {
    code, name: extra.name ?? null, city: extra.city ?? null,
    district: extra.district ?? null, category: null,
    hourlyRateHUF: extra.hourlyRateHUF ?? null,
    openingHours: extra.openingHours ?? null,
    maxstay: null, operator: null,
    bbox: ds.computeBbox(polygons), polygons,
  };
}

const FEATURES = [
  feature("3061", 47.480, 19.060, 47.490, 19.075, { name: "Ferencváros belső", district: "IX. kerület", openingHours: "Mo-Fr 08:00-18:00", hourlyRateHUF: 600 }),
  feature("3062", 47.480, 19.075, 47.490, 19.090, { name: "Ferencváros külső", district: "IX. kerület" }),
  feature("3013", 47.495, 19.050, 47.505, 19.065, { name: "Lipótváros", district: "V. kerület" }),
];

ok("a pontot tartalmazó zónát adja vissza", () => {
  const hit = ds.findZoneIn(FEATURES, { lat: 47.485, lon: 19.067 });
  assert.ok(hit, "kellett volna találat");
  assert.strictEqual(hit.feature.code, "3061");
  assert.strictEqual(hit.exact, true);
  assert.strictEqual(hit.feature.openingHours, "Mo-Fr 08:00-18:00");
});

ok("a szomszédos zónát nem keveri össze", () => {
  const hit = ds.findZoneIn(FEATURES, { lat: 47.485, lon: 19.080 });
  assert.strictEqual(hit.feature.code, "3062");
});

ok("zónán kívüli pontra null", () => {
  assert.strictEqual(ds.findZoneIn(FEATURES, { lat: 47.400, lon: 19.000 }), null);
  assert.strictEqual(ds.findZoneIn(FEATURES, { lat: 47.492, lon: 19.067 }), null);
});

ok("bbox előszűrés nem ejt el érvényes találatot a határ mentén", () => {
  // Pont a poligon belsejében, de közel a sarokhoz.
  const hit = ds.findZoneIn(FEATURES, { lat: 47.4801, lon: 19.0601 });
  assert.ok(hit);
  assert.strictEqual(hit.feature.code, "3061");
});

ok("lyukas poligon: a lyukban álló pont nincs a zónában", () => {
  const outer = rect(47.40, 19.00, 47.50, 19.10);
  const inner = rect(47.44, 19.04, 47.46, 19.06);
  const polygons = [{ outers: [outer], inners: [inner] }];
  const holed = [{
    code: "9999", name: "lyukas", city: null, district: null, category: null,
    hourlyRateHUF: null, openingHours: null, maxstay: null, operator: null,
    bbox: ds.computeBbox(polygons), polygons,
  }];
  assert.ok(ds.findZoneIn(holed, { lat: 47.42, lon: 19.02 }), "gyűrűn belül");
  assert.strictEqual(ds.findZoneIn(holed, { lat: 47.45, lon: 19.05 }), null, "a lyukban nincs zóna");
});

ok("computeBbox helyes befoglaló téglalapot ad", () => {
  const polygons = [{ outers: [rect(47.1, 19.1, 47.3, 19.4)], inners: [] }];
  assert.deepStrictEqual(ds.computeBbox(polygons), [47.1, 19.1, 47.3, 19.4]);
});

ok("üres adatkészlettel nem robban, csak nem talál", () => {
  assert.strictEqual(ds.findZoneIn([], { lat: 47.5, lon: 19.05 }), null);
});

ok("a repóban lévő adatkészlet szerkezete érvényes", () => {
  const dataset = ds.getDataset();
  assert.ok(Array.isArray(dataset.features), "features tömb");
  assert.strictEqual(typeof dataset.version, "string");
  assert.strictEqual(typeof dataset.source, "string");
  // Ha üres, azt is tudnunk kell — a felület erre külön figyelmeztet.
  assert.strictEqual(ds.hasOfficialData(), dataset.features.length > 0);
});

console.log("\n" + pass + " teszt futott le sikeresen.");
