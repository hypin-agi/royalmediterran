const assert = require("node:assert");
const sn = require("../.test-build/lib/streetNames.js");
const sz = require("../.test-build/lib/streetZones.js");

let pass = 0;
function ok(name, fn) {
  try { fn(); pass++; console.log("ok   -", name); }
  catch (e) { console.log("FAIL -", name, "\n     ", e.message); process.exitCode = 1; }
}

// ---------------------------------------------------------- normalizálás

ok("rövidítés feloldása a saját teljes alakjára", () => {
  assert.strictEqual(sn.normalizeStreet("Tűzoltó u."), "tuzolto utca");
  assert.strictEqual(sn.normalizeStreet("Tűzoltó utca"), "tuzolto utca");
  assert.strictEqual(sn.normalizeStreet("József krt."), "jozsef korut");
  assert.strictEqual(sn.normalizeStreet("Belgrád rkp."), "belgrad rakpart");
});

ok("KRITIKUS: az út és az utca NEM mosódik össze", () => {
  const ut = sn.normalizeStreet("Váci út");
  const utca = sn.normalizeStreet("Váci utca");
  assert.strictEqual(ut, "vaci ut");
  assert.strictEqual(utca, "vaci utca");
  assert.notStrictEqual(ut, utca, "két külön közterület, más zónában");
});

ok("kisbetű/nagybetű és ékezet nem számít", () => {
  assert.strictEqual(sn.normalizeStreet("TŰZOLTÓ UTCA"), sn.normalizeStreet("tűzoltó utca"));
  assert.strictEqual(sn.normalizeStreet("Üllői út"), "ulloi ut");
  assert.strictEqual(sn.normalizeStreet("Őrmező sétány"), "ormezo setany");
});

ok("a végén lévő házszám lekerül a névről", () => {
  assert.strictEqual(sn.normalizeStreet("Ráday utca 12"), "raday utca");
  assert.strictEqual(sn.normalizeStreet("Ráday utca 12-14"), "raday utca");
});

ok("üres és értelmetlen bemenet nem robban", () => {
  assert.strictEqual(sn.normalizeStreet(""), "");
  assert.strictEqual(sn.normalizeStreet("   "), "");
  assert.strictEqual(sn.normalizeStreet(null), "");
});

ok("kerület felismerése római és arab számból", () => {
  assert.strictEqual(sn.normalizeDistrict("IX."), 9);
  assert.strictEqual(sn.normalizeDistrict("IX. kerület"), 9);
  assert.strictEqual(sn.normalizeDistrict("09"), 9);
  assert.strictEqual(sn.normalizeDistrict("9. ker"), 9);
  assert.strictEqual(sn.normalizeDistrict("XIII"), 13);
  assert.strictEqual(sn.normalizeDistrict("XXIII. kerület"), 23);
  assert.strictEqual(sn.normalizeDistrict("Szeged"), null);
  assert.strictEqual(sn.normalizeDistrict(null), null);
});

// ------------------------------------------------------ utcajegyzék-keresés

const entry = (street, district, code, extra = {}) => ({
  street, key: sn.normalizeStreet(street), city: extra.city ?? "Budapest",
  district, code, houseNumbers: extra.houseNumbers ?? null,
  openingHours: extra.openingHours ?? null,
  hourlyRateHUF: extra.hourlyRateHUF ?? null,
  maxstay: extra.maxstay ?? null,
});

const TABLE = [
  entry("Tűzoltó u.", 9, "3061", { openingHours: "Mo-Fr 08:00-18:00", hourlyRateHUF: 600 }),
  entry("Ráday utca", 9, "3061", { houseNumbers: "1-25" }),
  entry("Ráday utca", 9, "3062", { houseNumbers: "27-99" }),
  entry("Váci út", 13, "3122"),
  entry("Váci utca", 5, "3011"),
  entry("Kossuth utca", 9, "3065"),
  entry("Kossuth utca", 11, "3111"),
];

ok("OSM-írásmód és jegyzék-rövidítés összeér", () => {
  // Az OSM-ből "Tűzoltó utca" jön, a jegyzékben "Tűzoltó u." szerepel.
  const hit = sz.lookupStreetIn(TABLE, "Tűzoltó utca", { district: "IX. kerület" });
  assert.strictEqual(hit.status, "match");
  assert.strictEqual(hit.code, "3061");
});

ok("azonos utcanév két kerületben: a kerület dönt", () => {
  assert.strictEqual(sz.lookupStreetIn(TABLE, "Kossuth utca", { district: "IX. kerület" }).code, "3065");
  assert.strictEqual(sz.lookupStreetIn(TABLE, "Kossuth utca", { district: "XI. kerület" }).code, "3111");
});

ok("kerület nélkül, több jelölt esetén nem tippelünk", () => {
  const hit = sz.lookupStreetIn(TABLE, "Kossuth utca", {});
  assert.strictEqual(hit.status, "ambiguous");
  assert.strictEqual(hit.code, null);
  assert.strictEqual(hit.entries.length, 2);
});

ok("házszám szerint megosztott utcánál nem választunk kódot", () => {
  const hit = sz.lookupStreetIn(TABLE, "Ráday utca", { district: 9 });
  assert.strictEqual(hit.status, "ambiguous");
  assert.strictEqual(hit.code, null);
  assert.deepStrictEqual(hit.entries.map((e) => e.code).sort(), ["3061", "3062"]);
});

ok("Váci út és Váci utca külön zónát ad", () => {
  assert.strictEqual(sz.lookupStreetIn(TABLE, "Váci út", { district: 13 }).code, "3122");
  assert.strictEqual(sz.lookupStreetIn(TABLE, "Váci utca", { district: 5 }).code, "3011");
});

ok("ismeretlen utcára nincs találat, nem téves kód", () => {
  const hit = sz.lookupStreetIn(TABLE, "Nem Létező utca", { district: 9 });
  assert.strictEqual(hit.status, "none");
  assert.strictEqual(hit.code, null);
});

ok("hiányzó utcanév nem okoz találatot", () => {
  assert.strictEqual(sz.lookupStreetIn(TABLE, null, { district: 9 }).status, "none");
  assert.strictEqual(sz.lookupStreetIn(TABLE, "", {}).status, "none");
});

ok("üres jegyzékkel nem robban", () => {
  assert.strictEqual(sz.lookupStreetIn([], "Tűzoltó utca", { district: 9 }).status, "none");
});

// ------------------------- a script és az app normalizálója nem térhet el

(async () => {
  const mjs = await import("../scripts/_streetNames.mjs");
  const samples = [
    "Tűzoltó u.", "Tűzoltó utca", "Váci út", "Váci utca", "József krt.",
    "Belgrád rkp.", "Üllői út", "Őrmező sétány", "Ráday utca 12-14",
    "TŰZOLTÓ UTCA", "Szent István krt.", "Bajcsy-Zsilinszky út", "",
  ];
  ok("a script és az app normalizálója egyezik", () => {
    for (const sample of samples) {
      assert.strictEqual(
        mjs.normalizeStreet(sample),
        sn.normalizeStreet(sample),
        `eltérés: "${sample}"`,
      );
    }
  });
  ok("a kerület-normalizálás is egyezik", () => {
    for (const sample of ["IX.", "IX. kerület", "13", "XXIII", "Szeged"]) {
      assert.strictEqual(mjs.normalizeDistrict(sample), sn.normalizeDistrict(sample), sample);
    }
  });

  console.log("\n" + pass + " teszt futott le sikeresen.");
})();
