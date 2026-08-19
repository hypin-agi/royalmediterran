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
      pont-a-poligonban teszt a zónahatárokon  →  zónakód + díjadatok
```

1. A böngésző elkéri a pozíciót (`navigator.geolocation`, nagy pontosságú mód).
2. A szerveroldali route egyetlen Overpass-lekérdezéssel begyűjti:
   - az `is_in`-nel a pontot tartalmazó területeket (közigazgatási határok és a
     parkolási zónák, amelyekhez az Overpass area-t generált),
   - a közeli `zone=parking` poligonokat teljes geometriával,
   - a pont körüli elnevezett utakat (utcanév + az útra rögzített `parking:*` tagek).
3. A geometriából gyűrűket épít (`lib/geo.ts`), és ray-casting pont-a-poligonban
   teszttel eldönti, melyik zóna tartalmazza a pontot.
4. A válasz tartalmazza a zónakódot, a díjszabást, a fizetős időszakot, a
   maximális várakozási időt, a szomszédos zónákat és a térképhez a körvonalat.

## Adatforrás és korlátok

- Az adat az **OpenStreetMap**-ből származik (ODbL licenc), az **Overpass API**-n
  keresztül lekérdezve. Nincs benne kézzel bevitt vagy becsült díjtétel:
  amit az oldal mutat, az mind az OSM tagekből jön.
- Ebből következik, hogy **hiányos vagy elavult lehet**. Ha egy zóna nincs
  feltérképezve, az oldal ezt megmondja, és nem tippel.
- Ez **nem hivatalos szolgáltatás**. A zónakódot a parkolás indítása előtt
  mindig érdemes összevetni az utcai zónatáblával.
- A GPS pontossága városban jellemzően 5–50 méter. Az oldal kiírja a mért
  pontosságot, és figyelmeztet, ha az akkora, hogy szomszédos zónát is
  jelenthet, illetve ha zónahatár közelében állsz.

## Futtatás fejlesztői gépen

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # a zónakereső logika egységtesztjei (Overpass nélkül)
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

Válasz (rövidítve):

```json
{
  "point": { "lat": 47.4979, "lon": 19.0546 },
  "zones": [{ "code": "3013", "name": "…", "containsPoint": true,
              "charge": "…", "openingHours": "…", "maxstay": "…",
              "outline": [[{ "lat": 0, "lon": 0 }]] }],
  "nearbyZones": [],
  "street": { "name": "Váci utca", "distanceMeters": 8, "parkingTags": {} },
  "admin": { "city": "Budapest", "district": "V. kerület", "areas": [] }
}
```

A válaszokat az oldal két szinten gyorsítótárazza: a szerver memóriájában
~11 méteres rácsra kerekített koordináta szerint, és a CDN-en
(`s-maxage=86400`). Ez tartja az Overpass terhelést a fair-use korláton belül.

## Struktúra

```
app/
  page.tsx              a landing oldal
  layout.tsx            metaadatok, PWA
  globals.css           teljes stíluslap
  manifest.ts           telefonra kitehető webapp
  api/zone/route.ts     a lekérdező végpont (cache, hibakezelés)
components/
  ZoneFinder.tsx        a gomb, az állapotgép és az eredménykártyák
  ZoneMap.tsx           Leaflet térkép (lazy, opcionális)
lib/
  overpass.ts           lekérdezés-építés + végpont-fallback
  geo.ts                gyűrű-összefűzés, pont-a-poligonban, távolság
  zone.ts               Overpass válasz → normalizált zónaadat
tests/
  lookup.test.cjs       egységtesztek szintetikus Overpass válaszra
```

## Deploy

Vercel, keretrendszer-felismeréssel (Next.js). A projekt gyökere ez a mappa
(`apps/melyik-zona`).
