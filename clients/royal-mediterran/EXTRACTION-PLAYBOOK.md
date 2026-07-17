# EXTRACTION PLAYBOOK — hogyan "maxold ki" az ügyfél-adatot

Ez a fájl felsorolja az **összes deliverable-t, amit a rendszer generálni tud** a
`brain/`-ből, mindegyikhez egy **kész prompttal**. Használat: nyisd meg az ügyfél
mappáját Claude Code-ban, és írd be a promptot (a `{{...}}` helyeket cseréld).

> **Alapszabály minden prompthoz:** *"Olvasd be a teljes `brain/` mappát és a
> `CONTEXT.md`-t, mielőtt válaszolsz. Tartsd be a `constraints.md`-t."*

---

## 1. Marketing stratégia (negyedéves)
**Mit ad:** pozicionálás-összefoglaló, célok, csatorna-mix, szezonális naptár, budget-javaslat.
```
Olvasd be a teljes brain/ mappát. Készíts egy negyedéves marketingstratégiát
{{Q3 2026}}-ra. Térj ki: fő üzenetek szegmensenként, csatorna-mix (Meta/Google/
organikus/hírlevél), szezonális kampány-naptár a performance-insights alapján,
és havi budget-allokáció. Az outputot írd az output/strategy/ alá.
```

## 2. PPC-terv (Meta + Google)
**Mit ad:** kampánystruktúra, célközönségek, angle-ök, budget-split, KPI-célok, ad copy vázlatok.
```
A brain/ (különösen performance-insights.yaml, audience.yaml, offering.yaml) alapján
készíts részletes PPC-tervet a következő {{kampányra: pl. Black Week}}. Add meg:
Meta kampánystruktúra (kampány/ad set/ad szinten), célközönségek, kreatív angle-ök
szegmensenként, Google keresési kampány kulcsszó-témák, napi budget-javaslat és
CPA/ROAS célok. Amit a múlt adata alátámaszt, jelöld. output/ppc/ alá.
```

## 3. Social media naptár (havi)
**Mit ad:** 20-30 poszt ötlet dátumozva, pillérenként, caption-vázlattal, CTA-val.
```
A brain/brand.yaml hangvétele és a content pillérek alapján készíts {{augusztusi}}
social naptárt: napi/heti bontás, poszttípus (statikus/reel/story), téma, caption
draft magyarul{{ és németül}}, CTA, és melyik csomagot tolja. output/social-calendar/ alá.
```

## 4. Kreatív brief (grafikusnak/videósnak)
**Mit ad:** a "szokásos koncepció" strukturált briefje egy adott csomagra/kampányra.
```
Készíts kreatív briefet a(z) {{csomag neve}} csomaghoz a brand.yaml vizuális
szabályai és a bevált kreatív-konvenciók (performance-insights) szerint. Add meg:
headline-variánsok, alcím, ár-blokk (áthúzott + akciós + megtakarítás), CTA,
kép-irány, kötelező elemek, méretek (feed/story/reel). output/creative-briefs/ alá.
```

## 5. Image-generáló promptok (Nano Banana / Higgsfield / Midjourney)
**Mit ad:** copy-paste kész képgeneráló promptok, brand-konzisztens stílussal.
```
A brand.yaml (színek, stílus, hangulat) és a raw/assets képei alapján írj 10 db
copy-paste kész image-generáló promptot a(z) {{csomag/téma}}-hoz. Egységes arculat,
feliratok pontosan, {{szezon}} hangulat. output/image-prompts/ alá.
```
> Tipp: a Hypin' `termekfoto-promptok` skill ehhez direktben használható.

## 6. Ad copy csomag (headline + törzsszöveg, több nyelven)
**Mit ad:** X változat headline + primary text, szegmensre és nyelvre szabva.
```
A brand hangvétel és audience personák alapján írj {{8}} Meta hirdetés-variánst a(z)
{{csomag}}-hoz: headline (max 40 char), primary text, description, CTA. Külön a
{{családos}} és a {{párok}} szegmensre{{, HU és DE nyelven}}. output/creative-briefs/ alá.
```

## 7. Hírlevél / e-mail kampány
```
A brain/ és az aktuális akció alapján írj {{Black Week}} hírlevelet: tárgy (3 variáns),
preheader, törzs, CTA. A hangvétel a brand.yaml szerint. output/creative-briefs/ alá.
```

## 8. Landing page / weboldal copy
```
A positioning.md és offering.yaml alapján írj landing page copy-t a(z) {{csomag}}-hoz:
hero, USP-blokkok, csomag-tartalom, social proof helyek, GYIK, CTA-k. output/ alá.
```

## 9. Teljesítmény-elemzés (riport → tanulság)
**Mit ad:** a nyers ads/social exportból strukturált tanulság a brain-be.
```
Olvasd be a raw/ads/ exportokat. Elemezd: mely csomag/angle/szegmens/időszak hozta a
legjobb ROAS-t és CPA-t, mi alulteljesített. A tanulságokat írd be tömören a
brain/performance-insights.md-be (ne másold a nyers számokat, a következtetést vond le).
```

## 10. Versenytárs / pozicionálás frissítés
```
A positioning.md versenytársait nézd át {{web/ads}} alapján, és javasolj 3 differenciáló
üzenetet, amivel kitűnhetünk. Frissítsd a positioning.md-t.
```

---

## Hogyan lesz ez EGYRE jobb (a flywheel)
1. Minden kampány után a **9-es recept** visszatölti a tanulságot a `brain/`-be.
2. A `brain/` gazdagodik → a 1–8 receptek outputja **pontosabb** lesz.
3. A jól sikerült outputokat "példaként" belinkelheted a `brain/`-be (few-shot).

> Minél többször fut a kör, annál kevesebb briefelés kell, és annál inkább az
> ügyfél *saját hangján* szól minden anyag.
