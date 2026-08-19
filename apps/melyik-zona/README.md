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
| **Zóna-poligon** (`zone=parking`) | zónakód, díj, fizetős időszak, határ a térképen | magas |
| **Úttest-tagek** (`parking:right:fee=yes`, `parking:condition:*`) | fizetős-e a szakasz, gyakran zónakód is | közepes |
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
tests/
  lookup.test.cjs          geometria, tag-értelmezés, rétegzett verdikt
  hours.test.cjs           idősáv-kiértékelés, ünnepnapok, időzóna
```

## Deploy

Vercel, keretrendszer-felismeréssel (Next.js). A projekt gyökere ez a mappa
(`apps/melyik-zona`).
