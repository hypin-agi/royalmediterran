# CLAUDE.md — utasítások Claude-nak ehhez a repóhoz

Ez egy **AI-native ügyfél tudásbázis** (client brain). Lásd `README.md` a teljes koncepcióért.

## Mit csinálj, amikor egy ügyfélen dolgozol

1. **Először mindig olvasd be az ügyfél `CONTEXT.md`-jét** (`clients/<slug>/CONTEXT.md`).
   Ez a belépési pont; onnan hivatkozik minden más fájlra.
2. Ha deliverable-t kérnek (terv, PPC, poszt, prompt), a **`brain/`** a forrás igazsága.
   Ne a `raw/`-ból dolgozz közvetlenül — a `brain/` a destillált, validált verzió.
3. Az outputot mindig a `clients/<slug>/output/<típus>/` alá írd, dátumozott fájlnévvel
   (`YYYY-MM-DD-rovid-cim.md`).
4. Tartsd tiszteletben a `brain/constraints.md`-t (tiltólista, jogi, hangvétel).

## Adat-destillálás (raw → brain)

Amikor új nyersanyag érkezik a `raw/`-ba (ads export, social export, scrape),
a feladatod **kivonatolni a tanulságot a `brain/`-be**, nem bemásolni a nyerset.
Példa: egy Meta ads CSV-ből a `brain/performance-insights.md`-be az kerül, hogy
"a romantikus/jakuzzi angle 2x jobb CTR-t hoz, mint a strand angle a párok szegmensen".

## Fájlformátum-konvenciók

- **`.yaml`** = strukturált, gépi tények (árak, csomagok, célközönség, brand paraméterek).
- **`.md`** = narratív tudás (pozicionálás, tanulságok, tiltások).
- Minden ügyfél-mappa a `_template/` másolata — a struktúra ugyanaz mindenhol.

## Amit NE csinálj

- Ne találj ki teljesítmény-számokat. Ha nincs adat, írd: `TODO: adat hiányzik`.
- Ne írj a `_template/`-be ügyfél-specifikus adatot (az sablon marad).
- Ne tölts fel a repóba nagy bináris fájlt (kép/videó/PDF) — azok **Drive-linkként**
  élnek a `raw/assets/drive-links.yaml`-ben. A repó szöveg-only.
