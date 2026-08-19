const assert = require("node:assert");
const geo = require("../.test-build/geo.js");
const zone = require("../.test-build/zone.js");

let pass = 0;
function ok(name, fn) {
  try { fn(); pass++; console.log("ok   -", name); }
  catch (e) { console.log("FAIL -", name, "\n     ", e.message); process.exitCode = 1; }
}

// --- geo ---
ok("assembleRings zárt gyűrűt épít darabolt vonalláncokból", () => {
  const a = [{lat:0,lon:0},{lat:0,lon:1}];
  const b = [{lat:0,lon:1},{lat:1,lon:1}];
  const c = [{lat:1,lon:0},{lat:1,lon:1}]; // fordított irányú darab
  const d = [{lat:1,lon:0},{lat:0,lon:0}];
  const rings = geo.assembleRings([a,b,c,d]);
  assert.strictEqual(rings.length, 1);
  const r = rings[0];
  assert.deepStrictEqual(r[0], r[r.length-1], "a gyűrű zárt");
});

ok("pointInPolygon lyukkal", () => {
  const outer = [{lat:0,lon:0},{lat:0,lon:10},{lat:10,lon:10},{lat:10,lon:0},{lat:0,lon:0}];
  const inner = [{lat:4,lon:4},{lat:4,lon:6},{lat:6,lon:6},{lat:6,lon:4},{lat:4,lon:4}];
  assert.strictEqual(geo.pointInPolygon({lat:1,lon:1}, {outers:[outer], inners:[inner]}), true);
  assert.strictEqual(geo.pointInPolygon({lat:5,lon:5}, {outers:[outer], inners:[inner]}), false);
  assert.strictEqual(geo.pointInPolygon({lat:20,lon:20}, {outers:[outer], inners:[inner]}), false);
});

ok("haversine kb. helyes távolságot ad", () => {
  const d = geo.haversineMeters({lat:47.4979,lon:19.0546},{lat:47.4979,lon:19.0646});
  assert.ok(d > 700 && d < 780, "kb. 750 m, kapott: " + Math.round(d));
});

// --- zónakód ---
ok("extractCode a ref tagből olvas", () => {
  assert.strictEqual(zone.extractCode({ref:"3013", name:"Belváros"}), "3013");
});
ok("extractCode a névből olvassa a kódot, ha nincs ref", () => {
  assert.strictEqual(zone.extractCode({name:"3013 Lipótváros"}), "3013");
});
ok("extractCode nem talál kódot ott, ahol nincs", () => {
  assert.strictEqual(zone.extractCode({name:"Belváros"}), null);
});

// --- parseLookup ---
const point = {lat: 47.5000, lon: 19.0500};
const square = (latMin, lonMin, latMax, lonMax) => ([
  {lat:latMin,lon:lonMin},{lat:latMin,lon:lonMax},{lat:latMax,lon:lonMax},{lat:latMax,lon:lonMin},{lat:latMin,lon:lonMin}
]);

const response = { elements: [
  { type:"area", id: 3600001, tags:{ boundary:"administrative", admin_level:"8", name:"Budapest" } },
  { type:"area", id: 3600002, tags:{ boundary:"administrative", admin_level:"9", name:"V. kerület" } },
  { type:"relation", id: 42, tags:{ zone:"parking", name:"3013 Lipótváros", fee:"yes", charge:"600 HUF/hour", opening_hours:"Mo-Fr 08:00-20:00", maxstay:"3 hours", operator:"Budapest Közút" },
    members:[
      { type:"way", ref:1, role:"outer", geometry:[{lat:47.4990,lon:19.0490},{lat:47.4990,lon:19.0510}] },
      { type:"way", ref:2, role:"outer", geometry:[{lat:47.4990,lon:19.0510},{lat:47.5010,lon:19.0510}] },
      { type:"way", ref:3, role:"outer", geometry:[{lat:47.5010,lon:19.0510},{lat:47.5010,lon:19.0490}] },
      { type:"way", ref:4, role:"outer", geometry:[{lat:47.5010,lon:19.0490},{lat:47.4990,lon:19.0490}] }
    ] },
  { type:"way", id: 77, tags:{ zone:"parking", ref:"3014", name:"Szomszéd zóna" }, geometry: square(47.5020, 19.0520, 47.5040, 19.0540) },
  { type:"way", id: 99, tags:{ highway:"residential", name:"Váci utca", "parking:right:fee":"yes", "parking:right:zone":"3013" },
    geometry:[{lat:47.5000,lon:19.0499},{lat:47.5002,lon:19.0499}] },
  { type:"way", id: 100, tags:{ highway:"footway" }, geometry:[{lat:47.5000,lon:19.0501}] }
]};

const result = zone.parseLookup(response, point);

ok("a tartalmazó zónát találja meg elsőként", () => {
  assert.strictEqual(result.zones.length, 1);
  assert.strictEqual(result.zones[0].code, "3013");
  assert.strictEqual(result.zones[0].containsPoint, true);
  assert.strictEqual(result.zones[0].charge, "600 HUF/hour");
  assert.strictEqual(result.zones[0].openingHours, "Mo-Fr 08:00-20:00");
  assert.ok(result.zones[0].outline.length === 1, "van körvonal a térképhez");
});

ok("a nem tartalmazó zóna a szomszédok közé kerül távolsággal", () => {
  assert.strictEqual(result.nearbyZones.length, 1);
  assert.strictEqual(result.nearbyZones[0].code, "3014");
  assert.strictEqual(result.nearbyZones[0].containsPoint, false);
  assert.ok(result.nearbyZones[0].distanceMeters > 0);
});

ok("közigazgatási hely feloldás", () => {
  assert.strictEqual(result.admin.city, "Budapest");
  assert.strictEqual(result.admin.district, "V. kerület");
});

ok("legközelebbi elnevezett utca és annak parkolási tagjei", () => {
  assert.strictEqual(result.street.name, "Váci utca");
  assert.deepStrictEqual(result.street.parkingTags, {
    "parking:right:fee": "yes",
    "parking:right:zone": "3013",
  });
});

ok("area-ként érkező zóna geometria nélkül is találat", () => {
  const r = zone.parseLookup({ elements: [
    { type:"area", id: 3_600_000_042, tags:{ zone:"parking", ref:"3013" } }
  ]}, point);
  assert.strictEqual(r.zones.length, 1);
  assert.strictEqual(r.zones[0].containsPoint, true);
  assert.strictEqual(r.zones[0].osmType, "relation");
  assert.strictEqual(r.zones[0].osmId, 42);
});

ok("area és relation ugyanarra a zónára nem duplikálódik", () => {
  const r = zone.parseLookup({ elements: [
    { type:"area", id: 3_600_000_042, tags:{ zone:"parking", ref:"3013" } },
    { type:"relation", id: 42, tags:{ zone:"parking", ref:"3013" }, members:[
      { type:"way", ref:1, role:"outer", geometry: square(47.4990, 19.0490, 47.5010, 19.0510) }
    ] }
  ]}, point);
  assert.strictEqual(r.zones.length + r.nearbyZones.length, 1, "egy zóna, nem kettő");
});

console.log("\n" + pass + " teszt futott le sikeresen.");
