const assert = require("node:assert");
const oh = require("../.test-build/openingHours.js");

let pass = 0;
function ok(name, fn) {
  try { fn(); pass++; console.log("ok   -", name); }
  catch (e) { console.log("FAIL -", name, "\n     ", e.message); process.exitCode = 1; }
}

// 2026-08-19 szerda. 12:00 UTC = 14:00 Budapest (CEST).
const wedAfternoon = new Date("2026-08-19T12:00:00Z");
const wedEvening = new Date("2026-08-19T17:30:00Z");   // 19:30 Budapest
const wedEarly = new Date("2026-08-19T05:00:00Z");     // 07:00 Budapest
const wedLunch = new Date("2026-08-19T11:00:00Z");     // 13:00 Budapest
const saturday = new Date("2026-08-22T12:00:00Z");     // szombat 14:00
const sunday = new Date("2026-08-23T12:00:00Z");       // vasárnap 14:00
const aug20 = new Date("2026-08-20T12:00:00Z");        // csütörtök, nemzeti ünnep
const januaryNoon = new Date("2026-01-14T12:00:00Z");  // szerda 13:00 Budapest (CET)

ok("helyi idő Budapest szerint, nyári időszámítással", () => {
  const now = oh.localNowBudapest(wedAfternoon);
  assert.strictEqual(now.weekday, 2, "szerda = 2");
  assert.strictEqual(now.minutes, 14 * 60);
  assert.strictEqual(now.iso, "2026-08-19");
});

ok("helyi idő téli időszámítással is stimmel", () => {
  const now = oh.localNowBudapest(januaryNoon);
  assert.strictEqual(now.minutes, 13 * 60, "CET = UTC+1");
});

ok("hétköznap, fizetős időszakban", () => {
  const v = oh.evaluateHours("Mo-Fr 08:00-18:00", wedAfternoon);
  assert.strictEqual(v.supported, true);
  assert.strictEqual(v.activeNow, true);
  assert.strictEqual(v.nextChange, "18:00");
  assert.deepStrictEqual(v.todayRanges, ["08:00–18:00"]);
});

ok("hétköznap este már nem fizetős — ez volt a bejelentett eset", () => {
  const v = oh.evaluateHours("Mo-Fr 08:00-18:00", wedEvening);
  assert.strictEqual(v.activeNow, false);
  assert.strictEqual(v.nextChange, null, "ma már nincs több váltás");
});

ok("reggel, a fizetős időszak kezdete előtt", () => {
  const v = oh.evaluateHours("Mo-Fr 08:00-18:00", wedEarly);
  assert.strictEqual(v.activeNow, false);
  assert.strictEqual(v.nextChange, "08:00");
});

ok("ebédszünetes, kétsávos kifejezés", () => {
  const v = oh.evaluateHours("Mo-Fr 08:00-12:00,14:00-18:00", wedLunch);
  assert.strictEqual(v.activeNow, false);
  assert.strictEqual(v.nextChange, "14:00");
  assert.deepStrictEqual(v.todayRanges, ["08:00–12:00", "14:00–18:00"]);
});

ok("szombat nincs a szelektorban → nem fizetős", () => {
  const v = oh.evaluateHours("Mo-Fr 08:00-18:00", saturday);
  assert.strictEqual(v.supported, true);
  assert.strictEqual(v.activeNow, false);
  assert.deepStrictEqual(v.todayRanges, []);
});

ok("szombaton fizetős, vasárnap kifejezetten szünetel", () => {
  const sat = oh.evaluateHours("Mo-Sa 08:00-20:00; Su off", saturday);
  assert.strictEqual(sat.activeNow, true);
  const sun = oh.evaluateHours("Mo-Sa 08:00-20:00; Su off", sunday);
  assert.strictEqual(sun.activeNow, false);
});

ok("24/7 mindig aktív", () => {
  const v = oh.evaluateHours("24/7", sunday);
  assert.strictEqual(v.supported, true);
  assert.strictEqual(v.activeNow, true);
});

ok("PH off — augusztus 20. csütörtök ellenére sem fizetős", () => {
  const v = oh.evaluateHours("Mo-Fr 08:00-18:00; PH off", aug20);
  assert.strictEqual(v.isPublicHoliday, true);
  assert.strictEqual(v.activeNow, false);
});

ok("ünnepnapot akkor is jelezzük, ha a kifejezés nem kezeli", () => {
  const v = oh.evaluateHours("Mo-Fr 08:00-18:00", aug20);
  assert.strictEqual(v.isPublicHoliday, true);
  assert.strictEqual(v.activeNow, true, "az adat szerint fizetős, ezt nem írjuk felül");
});

ok("nem értett kifejezésre nem tippelünk", () => {
  for (const expr of [
    'Mo-Fr 08:00-18:00 open "kivéve ünnepnap"',
    "Apr-Oct Mo-Fr 08:00-18:00",
    "sunrise-sunset",
    "Mo-Fr 08:00-18:00; week 1-20 off",
  ]) {
    const v = oh.evaluateHours(expr, wedAfternoon);
    assert.strictEqual(v.supported, false, expr);
    assert.strictEqual(v.activeNow, null, expr);
  }
});

ok("üres vagy hiányzó kifejezés → nem tudjuk", () => {
  assert.strictEqual(oh.evaluateHours(null, wedAfternoon).activeNow, null);
  assert.strictEqual(oh.evaluateHours("", wedAfternoon).activeNow, null);
  assert.strictEqual(oh.evaluateHours("   ", wedAfternoon).supported, false);
});

ok("húsvét számítás", () => {
  assert.deepStrictEqual(oh.easterSunday(2025), { month: 4, day: 20 });
  assert.deepStrictEqual(oh.easterSunday(2026), { month: 4, day: 5 });
  assert.deepStrictEqual(oh.easterSunday(2027), { month: 3, day: 28 });
});

ok("magyar munkaszüneti napok halmaza", () => {
  const h = oh.hungarianPublicHolidays(2026);
  for (const day of ["2026-01-01","2026-03-15","2026-04-03","2026-04-06","2026-05-01","2026-05-25","2026-08-20","2026-10-23","2026-11-01","2026-12-25","2026-12-26"]) {
    assert.ok(h.has(day), day + " hiányzik");
  }
  assert.ok(!h.has("2026-08-19"), "hétköznap nem ünnep");
});

ok("éjfélen átnyúló idősáv", () => {
  const night = new Date("2026-08-19T22:30:00Z"); // 00:30 Budapest (csütörtök)
  const v = oh.evaluateHours("Mo-Su 20:00-02:00", night);
  assert.strictEqual(v.activeNow, true);
});

console.log("\n" + pass + " teszt futott le sikeresen.");
