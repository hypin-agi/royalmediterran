const assert = require("node:assert");
const geo = require("../.test-build/geo.js");
const zone = require("../.test-build/zone.js");
const sp = require("../.test-build/streetParking.js");

let pass = 0;
function ok(name, fn) {
  try { fn(); pass++; console.log("ok   -", name); }
  catch (e) { console.log("FAIL -", name, "\n     ", e.message); process.exitCode = 1; }
}

// ---------------------------------------------------------------- geometria

ok("assembleRings zárt gyűrűt épít darabolt vonalláncokból", () => {
  const a = [{lat:0,lon:0},{lat:0,lon:1}];
  const b = [{lat:0,lon:1},{lat:1,lon:1}];
  const c = [{lat:1,lon:0},{lat:1,lon:1}];
  const d = [{lat:1,lon:0},{lat:0,lon:0}];
  const rings = geo.assembleRings([a,b,c,d]);
  assert.strictEqual(rings.length, 1);
  assert.deepStrictEqual(rings[0][0], rings[0][rings[0].length-1]);
});

ok("pointInPolygon lyukkal", () => {
  const outer = [{lat:0,lon:0},{lat:0,lon:10},{lat:10,lon:10},{lat:10,lon:0},{lat:0,lon:0}];
  const inner = [{lat:4,lon:4},{lat:4,lon:6},{lat:6,lon:6},{lat:6,lon:4},{lat:4,lon:4}];
  assert.strictEqual(geo.pointInPolygon({lat:1,lon:1}, {outers:[outer], inners:[inner]}), true);
  assert.strictEqual(geo.pointInPolygon({lat:5,lon:5}, {outers:[outer], inners:[inner]}), false);
});

ok("haversine kb. helyes távolságot ad", () => {
  const d = geo.haversineMeters({lat:47.4979,lon:19.0546},{lat:47.4979,lon:19.0646});
  assert.ok(d > 700 && d < 780, "kb. 750 m, kapott: " + Math.round(d));
});

// ------------------------------------------------------------------ zónakód

ok("extractCode a ref tagből olvas", () => {
  assert.strictEqual(zone.extractCode({ref:"3013", name:"Belváros"}), "3013");
});
ok("extractCode a névből olvassa a kódot, ha nincs ref", () => {
  assert.strictEqual(zone.extractCode({name:"3013 Lipótváros"}), "3013");
});
ok("extractCode nem talál kódot ott, ahol nincs", () => {
  assert.strictEqual(zone.extractCode({name:"Belváros"}), null);
});

// ------------------------------------------------------- utcaszintű parkolás

ok("aktuális séma: jobb oldal fizetős, zónakóddal", () => {
  const info = sp.parseStreetParking({
    highway: "residential",
    name: "Tűzoltó utca",
    "parking:right": "lane",
    "parking:right:fee": "yes",
    "parking:right:zone": "3061",
    "parking:right:maxstay": "3 h",
    "parking:left": "no",
  }, { osmId: 1, distanceMeters: 6 });

  const v = sp.summariseStreet(info);
  assert.strictEqual(v.paid, true);
  assert.strictEqual(v.zoneCode, "3061");
  assert.strictEqual(v.maxstay, "3 h");
  assert.ok(v.evidence.length > 0);
});

ok("régi séma: parking:condition + time_interval", () => {
  const info = sp.parseStreetParking({
    highway: "residential",
    name: "Ráday utca",
    "parking:lane:right": "parallel",
    "parking:condition:right": "ticket",
    "parking:condition:right:time_interval": "Mo-Fr 08:00-18:00",
  }, { osmId: 2, distanceMeters: 9 });

  const v = sp.summariseStreet(info);
  assert.strictEqual(v.paid, true);
  assert.strictEqual(v.hoursExpression, "Mo-Fr 08:00-18:00");
});

ok("feltételes díj zárójeles időkifejezése kiolvasható", () => {
  assert.strictEqual(
    sp.conditionalInterval("no @ (Mo-Fr 18:00-08:00)"),
    "Mo-Fr 18:00-08:00",
  );
  assert.strictEqual(sp.conditionalInterval("yes"), null);
  assert.strictEqual(sp.conditionalInterval(null), null);
});

ok("kifejezetten ingyenes oldal nem lesz fizetős", () => {
  const info = sp.parseStreetParking({
    highway: "residential",
    name: "Csendes köz",
    "parking:both": "lane",
    "parking:both:fee": "no",
  }, { osmId: 3, distanceMeters: 4 });
  assert.strictEqual(sp.summariseStreet(info).paid, false);
});

ok("parkolási adat nélküli utcáról nem állítunk semmit", () => {
  const info = sp.parseStreetParking(
    { highway: "residential", name: "Névtelen utca" },
    { osmId: 4, distanceMeters: 4 },
  );
  assert.strictEqual(info.sides.length, 0);
  assert.strictEqual(sp.summariseStreet(info).paid, null);
});

// ------------------------------------------------------------- teljes válasz

const point = {lat: 47.5000, lon: 19.0500};
const square = (latMin, lonMin, latMax, lonMax) => ([
  {lat:latMin,lon:lonMin},{lat:latMin,lon:lonMax},{lat:latMax,lon:lonMax},{lat:latMax,lon:lonMin},{lat:latMin,lon:lonMin}
]);
const adminElements = [
  { type:"area", id: 3_600_000_001, tags:{ boundary:"administrative", admin_level:"8", name:"Budapest" } },
  { type:"area", id: 3_600_000_002, tags:{ boundary:"administrative", admin_level:"9", name:"IX. kerület" } },
];

ok("zóna-poligon a legerősebb réteg", () => {
  const r = zone.parseLookup({ elements: [
    ...adminElements,
    { type:"relation", id: 42, tags:{ zone:"parking", name:"3061 Ferencváros", ref:"3061", fee:"yes", charge:"600 HUF/hour", opening_hours:"Mo-Fr 08:00-18:00", maxstay:"3 hours" },
      members:[{ type:"way", ref:1, role:"outer", geometry: square(47.4990, 19.0490, 47.5010, 19.0510) }] },
  ]}, point);

  assert.strictEqual(r.verdict.source, "zone");
  assert.strictEqual(r.verdict.paid, "paid");
  assert.strictEqual(r.verdict.code, "3061");
  assert.strictEqual(r.verdict.confidence, "high");
  assert.strictEqual(r.verdict.hoursExpression, "Mo-Fr 08:00-18:00");
  assert.strictEqual(r.admin.district, "IX. kerület");
});

ok("zóna hiányában az úttest adata dönt — ez volt a IX. kerületi hiba", () => {
  const r = zone.parseLookup({ elements: [
    ...adminElements,
    { type:"way", id: 99, tags:{
        highway:"residential", name:"Tűzoltó utca",
        "parking:right":"lane", "parking:right:fee":"yes",
        "parking:right:zone":"3061",
        "parking:right:restriction":"ticket",
        "parking:right:time_interval":"Mo-Fr 08:00-18:00",
      }, geometry:[{lat:47.5000,lon:19.0499},{lat:47.5002,lon:19.0499}] },
  ]}, point);

  assert.strictEqual(r.verdict.source, "street", "az utcaréteget kell használni");
  assert.strictEqual(r.verdict.paid, "paid");
  assert.strictEqual(r.verdict.code, "3061");
  assert.strictEqual(r.verdict.hoursExpression, "Mo-Fr 08:00-18:00");
  assert.strictEqual(r.streetName, "Tűzoltó utca");
  assert.strictEqual(r.streets.length, 1);
});

ok("gyalogutat nem tekintünk parkolóhelynek", () => {
  const r = zone.parseLookup({ elements: [
    { type:"way", id: 5, tags:{ highway:"footway", name:"Sétány", "parking:both:fee":"yes" },
      geometry:[{lat:47.5000,lon:19.0500}] },
  ]}, point);
  assert.strictEqual(r.verdict.source, "none");
});

ok("semmilyen adat nélkül unknown, nem 'ingyenes'", () => {
  const r = zone.parseLookup({ elements: adminElements }, point);
  assert.strictEqual(r.verdict.paid, "unknown");
  assert.strictEqual(r.verdict.source, "none");
  assert.strictEqual(r.verdict.code, null);
  assert.ok(r.verdict.evidence[0].includes("nincs parkolási adat"));
});

ok("fizetős parkoló a közelben csak kontextus, nem verdikt", () => {
  const r = zone.parseLookup({ elements: [
    { type:"way", id: 7, tags:{ amenity:"parking", fee:"yes", name:"Mélygarázs" },
      center:{ lat:47.5004, lon:19.0504 } },
  ]}, point);
  assert.strictEqual(r.verdict.source, "lot");
  assert.strictEqual(r.verdict.paid, "unknown", "a parkolóból nem következik az utcai díj");
  assert.strictEqual(r.lots.length, 1);
  assert.ok(r.lots[0].distanceMeters > 0);
});

ok("a nem tartalmazó zóna szomszédként jelenik meg", () => {
  const r = zone.parseLookup({ elements: [
    { type:"way", id: 77, tags:{ zone:"parking", ref:"3062" }, geometry: square(47.5020, 19.0520, 47.5040, 19.0540) },
  ]}, point);
  assert.strictEqual(r.zones.length, 0);
  assert.strictEqual(r.nearbyZones.length, 1);
  assert.strictEqual(r.nearbyZones[0].code, "3062");
  assert.ok(r.nearbyZones[0].distanceMeters > 0);
});

ok("area és relation ugyanarra a zónára nem duplikálódik", () => {
  const r = zone.parseLookup({ elements: [
    { type:"area", id: 3_600_000_042, tags:{ zone:"parking", ref:"3013" } },
    { type:"relation", id: 42, tags:{ zone:"parking", ref:"3013" }, members:[
      { type:"way", ref:1, role:"outer", geometry: square(47.4990, 19.0490, 47.5010, 19.0510) }
    ] }
  ]}, point);
  assert.strictEqual(r.zones.length + r.nearbyZones.length, 1);
});

console.log("\n" + pass + " teszt futott le sikeresen.");
