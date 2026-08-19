# Melyik Zóna? — GPS-alapú parkolási zóna kereső

Egy gomb, és megmondja, melyik parkolási zónában áll az autó. A telefon GPS-e
alapján, ingyen, regisztráció nélkül.

**A probléma, amit megold:** a parkoló-applikációk egy része külön díjat kér
azért, hogy automatikusan kitöltse a zónakódot. A kódot magát viszont a
koordinátából nyílt térképadatból is ki lehet olvasni — ez az oldal pontosan
ezt teszi.

---

## Hogyan működik

```
böngésző GPS  →  /api/zone?lat=…&lon=…  →  Overpass API (OpenStreetMap)
                          ↓
        három adatréteg  →  egyetlen verdikt  →  zónakód + "most fizetős?"
```

A válasz nem egyetlen forrásból jön, mert Magyarországon a parkolási adat sem
egységes. Három réteget kérdezünk le egyszerre, és a legerősebb nyer:

| Réteg | Mit ad | Megbízhatóság |
|-------|--------|---------------|
| **Hivatalos készlet** (`data/zones.json`) | zónakód, díj, időszak, pontos határ | magas |
| **Zóna-poligon** (`zone=parking`) | zónakód, ha az OSM tárolja | közepes |
| **Úttest-tagek** (`parking:right:fee=yes`, `parking:condition:*`) | fizetős-e a szakasz | közepes |
| **Közeli parkolók** (`amenity=parking`) | csak kontextus, nem verdikt | gyenge |

Ez a rétegzés a lényeg: a magyar utcák nagy részén nincs zóna-poligon, viszont
az úttestre rá van tagelve, hogy fizetős. Ha csak a poligonokat néznénk, egy
valóban fizetős belvárosi utcát is ingyenesnek mutatnánk.

Ha egyik réteg sem tud semmit, a válasz `unknown` — **nem** „ingyenes".

### Fizetős-e éppen most?

A `lib/openingHours.ts` az `opening_hours` szintaxis gyakori részhalmazát
értékeli ki (`Mo-Fr 08:00-18:00`, `Mo-Sa 08:00-20:00; Su off`, `24/7`,
`PH off`, éjfélen átnyúló sávok, ebédszünet), budapesti helyi időben, a
magyar munkaszüneti napokat is beleszámolva — a húsvéthoz kötött mozgó
ünnepeket számítjuk, nem táblázatból olvassuk.

Amit nem tudunk biztosan értelmezni (hónap-szelektor, `sunrise`, szöveges
megjegyzés), arra `supported: false`-t adunk, és a felület a nyers kifejezést
mutatja. Rossz idősáv-válasz büntetést ér, ezért itt nem tippelünk.

### Lefedettségi térkép

A `/lefedettseg` oldal egyetlen országos Overpass-lekérdezésből rajzolja meg,
hol van egyáltalán zónaadat Magyarországon, és hol van hozzá zónakód is.
Ez mérés, nem becslés — ezért mutat üres foltokat is.

## A zónatérkép kérdése — ez dönti el a terméket

Az egész oldal egyetlen dolgon áll vagy bukik: **egy GPS-koordinátáról meg
tudjuk-e mondani, melyik parkolási zónában van, és mi a zóna kódja.**

### Amit tudni kell a nyílt adatról

A `zone=parking` OSM-tag elsősorban lengyel térképezési konvenció. Magyar
területen ritkán fordul elő, és **zónakódot szinte soha nem hordoz**. Ebből
következik, hogy pusztán az OpenStreetMapre építve a termék fő ígérete nem
teljesíthető megbízhatóan. Ezért a rendszer négyrétegű, és a legfelső réteg
nem az OSM:

| # | Réteg | Mit ad | Megbízhatóság |
|---|-------|--------|---------------|
| 0 | **Hivatalos zóna-poligon** (`data/zones.json`) | zónakód, díj, időszak, pontos határ | magas |
| 1 | **Hivatalos utcajegyzék** (`data/street-zones.json`) | zónakód utcanév + kerület alapján | magas |
| 2 | OSM zóna-poligon (`zone=parking`) | zónakód, ha az OSM tárolja | közepes |
| 3 | OSM úttest-tagek (`parking:*`) | fizetős-e a szakasz, néha kód | gyenge–közepes |
| 4 | Közeli `amenity=parking` | csak kontextus | gyenge |

### A két hivatalos út — és miért van kettő

A zónahatárokat **poligonként** megszerezni nehéz. A szolgáltatók viszont
**utcajegyzékként** is közzéteszik, melyik közterület melyik zónába tartozik —
ezt táblázatként jóval könnyebb beszerezni.

A GPS-pontból az OpenStreetMap megbízhatóan megadja a legközelebbi utca nevét
és a kerületet. Ezt a hivatalos utcajegyzékkel összekapcsolva a zónakód
**poligon nélkül is** megvan:

```
GPS  →  OSM: "Tűzoltó utca", IX. kerület  →  utcajegyzék  →  3061
```

A névillesztés normalizálva történik (`lib/streetNames.ts`), mert a jegyzék
„Tűzoltó u."-t ír, az OSM „Tűzoltó utcá"-t. Amit **nem** vonunk össze: a
„Váci út" és a „Váci utca" két külön közterület, más zónában — ezek
egybemosása rosszabb lenne, mint a találat hiánya.

Ha egy közterület több zónára esik (jellemzően házszám szerint), **nem
választunk**: kimondjuk, hogy fizetős, felsoroljuk a szóba jövő kódokat, és a
táblához irányítunk. Egy tippelt kód büntetést ér.

Ha egyik réteg sem tud semmit, a válasz `unknown` — **nem** „ingyenes”.

### Hogyan mérhető, hogy tényleg működik-e

Két eszköz van rá, és mindkettő valódi lekérdezést futtat, nem becsül:

```bash
# 1) Parancssorból, tetszőleges környezet ellen
npm run verify:zones -- --base https://melyik-zona.vercel.app

# 2) Böngészőből, kattintásra
#    → /diagnosztika oldal, „Mérés indítása”
```

Mindkettő ugyanazt a 22 ellenőrző pontot méri (`data/probe-points.json`):
13 budapesti helyszín, 7 vidéki nagyváros, és 2 kontrollpont, ahol *nem*
szabad fizetős zónát találni. A jelentés megmutatja, hány ponton kaptunk
zónakódot — ez az egyetlen szám, ami számít.

A `data/probe-points.json` `expectation` mezője **emberi feltételezés**, nem
hiteles adat: azért van ott, hogy a gyanús eltérések kiugorjanak.

### Hivatalos zónaadat betöltése

Ez a lépés teszi a terméket használhatóvá ott, ahol az OSM nem elég.
Bármelyik forma megteszi — az utcajegyzék a könnyebben beszerezhető.

**A) Utcajegyzék (CSV vagy JSON, akár URL-ről)**

```bash
node scripts/import-street-zones.mjs utcajegyzek.csv \\
  --source "a forrás megnevezése" \\
  --license "a licenc megnevezése"
```

Az oszlopneveket ékezet-érzéketlenül ismeri fel (`Közterület`, `Zónakód`,
`Kerület`, `Házszám`, `Fizetős időszak`, `Óradíj`, `Időkorlát`), és jelenti,
hány közterület esik több zónára — ezeknél az app nem fog tippelni.

**B) Zóna-poligonok (GeoJSON)**

```bash
# a hivatalos állomány WGS84-ben kell legyen; ha EOV-ban van:
ogr2ogr -f GeoJSON -t_srs EPSG:4326 zonak-wgs84.geojson eredeti.geojson

node scripts/import-zones.mjs zonak-wgs84.geojson \
  --source "a forrás megnevezése" \
  --license "a licenc megnevezése"
```

Az importáló felismeri a szokásos magyar mezőneveket (`zonakod`, `ovezet`,
`oradij`, `idoszak`…), kézzel is felülírható (`--code`, `--hours`, …), és
**megtagadja az importot, ha a koordináták nem WGS84-ben vannak** — mert
átvetítés nélkül minden pont rossz helyre kerülne, ami rosszabb a semminél.

Az eredmény a `data/zones.json`, amit a `lib/zoneDataset.ts` bbox-előszűréssel
és pont-a-poligonban teszttel keres. Betöltés után a `/api/status` és a
kezdőlap is jelzi, hogy hivatalos adatból dolgozunk.

---

## Futtatás fejlesztői gépen

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # egységtesztek Overpass nélkül: geometria, tag-értelmezés, idősávok
npm run build
```

GPS nélküli teszteléshez a koordináta a címsorban is megadható:

```
http://localhost:3000/?lat=47.4979&lon=19.0546
```

## API

`GET /api/zone?lat=<szám>&lon=<szám>`

| paraméter | kötelező | leírás |
|-----------|----------|--------|
| `lat`, `lon` | igen | WGS84 koordináta |
| `radius` | nem | keresési sugár méterben a szomszédos zónákhoz (100–2000, alap: 600) |
| `debug` | nem | `1` esetén a nyers Overpass statisztikát is visszaadja |

`GET /api/coverage` — országos lefedettség (paraméter nélkül, 24 órára cache-elve).

`GET /api/status` — milyen adatforrásra támaszkodhat a rendszer (be van-e töltve
hivatalos zónakészlet, hány zóna, mennyi kóddal).

Válasz (rövidítve):

```json
{
  "point": { "lat": 47.4979, "lon": 19.0546 },
  "verdict": {
    "paid": "paid",
    "source": "street",
    "code": "3061",
    "confidence": "medium",
    "hoursExpression": "Mo-Fr 08:00-18:00",
    "charge": null,
    "maxstay": "3 h",
    "evidence": ["Tűzoltó utca: az úttest adata szerint fizetős a várakozás."]
  },
  "zones": [],
  "nearbyZones": [],
  "streetName": "Tűzoltó utca",
  "streets": [],
  "lots": [],
  "admin": { "city": "Budapest", "district": "IX. kerület", "areas": [] }
}
```

A válaszokat az oldal két szinten gyorsítótárazza: a szerver memóriájában
~11 méteres rácsra kerekített koordináta szerint, és a CDN-en
(`s-maxage=86400`). Ez tartja az Overpass terhelést a fair-use korláton belül.

## Struktúra

```
app/
  page.tsx                 landing: hero + kereső + hogyan működik + GYIK
  lefedettseg/page.tsx     országos lefedettségi térkép
  layout.tsx               metaadatok, PWA
  globals.css              teljes stíluslap (világos, autós arculat)
  api/zone/route.ts        a lekérdező végpont (cache, hibakezelés)
  api/coverage/route.ts    országos lefedettség-lekérdezés
components/
  ZoneFinder.tsx           a gomb, az állapotgép és az eredménykártyák
  ZoneMap.tsx              Leaflet térkép a zóna körvonalával
  CoverageView.tsx         lefedettségi statisztika + táblázat
  CoverageMap.tsx          országos pont-térkép
  SiteHeader.tsx / SiteFooter.tsx
lib/
  overpass.ts              lekérdezés-építés + végpont-fallback
  geo.ts                   gyűrű-összefűzés, pont-a-poligonban, távolság
  zone.ts                  Overpass válasz → rétegzett verdikt
  streetParking.ts         az úttestre tagelt parkolási adat értelmezése
  openingHours.ts          idősáv-kiértékelés + magyar munkaszüneti napok
  cities.ts                városközpontok a lefedettségi bontáshoz
  zoneDataset.ts           hivatalos zóna-poligonok: bbox-index + pont-a-poligonban
  streetZones.ts           utcanév + kerület → zónakód, egyértelműség-kezeléssel
  streetNames.ts           magyar közterületnevek normalizálása
  officialLayer.ts         a hivatalos találatok beillesztése a válaszba
data/
  zones.json               hivatalos zóna-poligonok (alapból üres)
  street-zones.json        hivatalos utcajegyzék (alapból üres)
  probe-points.json        ellenőrző pontok a méréshez
scripts/
  import-zones.mjs         hivatalos GeoJSON → data/zones.json
  import-street-zones.mjs  utcajegyzék CSV/JSON → data/street-zones.json
  _streetNames.mjs         a normalizáló JS-párja (tesztelt egyezéssel)
  verify-zones.mjs         éles mérés: hány ponton van zónakód
tests/
  lookup.test.cjs          geometria, tag-értelmezés, rétegzett verdikt
  hours.test.cjs           idősáv-kiértékelés, ünnepnapok, időzóna
  dataset.test.cjs         zónakészlet keresés, lyukas poligon, bbox
  streetNames.test.cjs     normalizálás, kerület-egyértelműsítés, út≠utca
  pipeline.test.cjs        végponttól végpontig: koordináta → kód → időszak
```

## Deploy

Vercel, keretrendszer-felismeréssel (Next.js). A projekt gyökere ez a mappa
(`apps/melyik-zona`).
