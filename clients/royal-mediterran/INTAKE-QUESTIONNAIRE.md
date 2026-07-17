# INTAKE QUESTIONNAIRE — a brain kimaxolása

Ez az **átfogó kérdéssor**, amivel a `brain/` a lehető legjobb tudásra tölthető fel.
Minden szekció egy `brain/` fájlnak felel meg → a válaszok közvetlenül oda kerülnek.

> **Munkamódszer:** ezt a kérdéssort a legjobb egy **Google Sheetben** kitöltetni az
> ügyféllel/csapattal (lásd `README.md` → intake flow). Claude a kitöltött Sheetet
> beolvassa a Drive-ról és szinkronizálja a `brain/` YAML/MD fájlokba.

Jelölés: ⭐ = kritikus (enélkül gyenge az output), ➕ = növeli a minőséget.

---

## A) Alapadatok → `client.yaml`
1. ⭐ Hivatalos név, cégnév, weboldal URL?
2. ⭐ Milyen nyelveken és mely országokban hirdettek/hirdetnétek? (HU/DE/AT…)
3. ⭐ Fő KPI, amit nézünk? (ROAS / foglalás / bevétel/nap / lead)
4. Havi hirdetési budget nagyságrend?
5. ⭐ Rendszerek + hozzáférés: Google Ads fiók, Meta Business, GA4, CMS (WordPress?),
   hírlevél (MailerLite?), foglalás/PMS (SabeeApp?), Looker riport link?
6. Kapcsolattartók: account manager, grafikus, PPC-s, ügyfél-oldali döntéshozó?

## B) Termékek / csomagok → `offering.yaml`
7. ⭐ Sorold fel az ÖSSZES aktív csomagot: név, URL, tartalom, időtartam, kapacitás.
8. ⭐ Áranatómia csomagonként: normál (áthúzott) ár, szokásos akciós ár, legalacsonyabb
   (last minute) ár, meddig felhasználható.
9. Melyik a zászlóshajó (hero) csomag? Melyik hozza a legtöbb bevételt/profitot?
10. ➕ Upsell/cross-sell elemek? (hajózás, masszázs, pezsgős bekészítés, vacsora…)
11. Kupon-logika: milyen kódokat használtok, milyen alkalomra?
12. Van szezonális/limitált készlet, amit figyelni kell? (mikor telik be a hotel?)

## C) Célközönség → `audience.yaml`
13. ⭐ Kik a fő vásárlói szegmensek? (pl. párok, családok, csapatépítés, német turisták)
14. ⭐ Szegmensenként: kor, nem, hol élnek, nyelv.
15. ⭐ Miért vásárolnak? Fő motiváció szegmensenként. (élmény, ajándék, kikapcsolódás)
16. Mi tartja vissza őket? (ár, bizalom, távolság, "megéri-e")
17. ⭐ Mi indítja a vásárlást? (Valentin, évforduló, nyári szabi, karácsonyi ajándék, last minute)
18. Melyik csomag melyik szegmensnek megy a legjobban?
19. ➕ Ki a "legjobb vásárló" (legnagyobb érték, legkönnyebb elérni)?

## D) Pozicionálás & verseny → `positioning.md`
20. ⭐ Egy mondatban: kinek + mit + miben vagytok mások?
21. ⭐ 3 legfőbb USP (miért titeket válasszanak)?
22. Mivel bizonyítjátok? (közvetlen vízpart, saját strand, díjak, értékelések)
23. ⭐ 3-5 fő versenytárs neve + weboldala.
24. Miben jobbak náluk? Miben jobbak ők?
25. ➕ Mik a leggyakoribb kifogások, és mi rájuk a válasz?

## E) Arculat & hangvétel → `brand.yaml`
26. ⭐ Van brandbook? (Drive/PDF link) Ha nincs: fő színek (HEX), betűtípusok, logó.
27. ⭐ Milyen a hangvétel? (3-5 jelző) Tegező vagy magázó? Emoji igen/nem?
28. ⭐ Fotóstílus, hangulat, amit a képek sugározzanak?
29. ⭐ A "szokásos kreatív koncepció" pontosan: hogyan néz ki egy ár-blokk
    (áthúzás színe, %/forint kedvezmény, /fő/éj bontás), milyen sürgetés-elemek
    (Csak Ma ár, UTOLSÓ NAP, érvényesség)?
30. Milyen kreatív-formátumok kellenek kampányonként? (statikus, AI mozgó videó, beszélős videó)
31. ➕ Visszatérő szlogen, jellegzetes fordulatok?

## F) Tiltások & megfelelőség → `constraints.md`
32. ⭐ Mit TILOS mondani/ígérni? (jogi, egészségügyi, ár-feltüntetés)
33. Kötelező feltüntetések? (érvényesség, "kép illusztráció", ÁSZF)
34. Platform-tiltások, amikbe belefutottatok korábban (Meta elutasítás)?

## G) Múltbeli teljesítmény → `performance-insights.md`
35. ⭐ Melyik kampány/időszak volt a legjobb valaha? Miért?
36. ⭐ Melyik csomag + melyik üzenet (angle) konvertált a legjobban?
37. Mi ment rosszul, mit ne ismételjünk?
38. ⭐ Szezonális ritmus: hónapról hónapra mikor mit toltok? (Black Week, Mikulás,
    Valentin/Red Week, Pink Weekend, nyári főszezon, last minute…)
39. Meta vs Google: melyik mit hoz nálatok?
40. ➕ Van összevetés a hirdetési adat és a VALÓS foglalás/bevétel (PMS) között?

## H) Meglévő eszközök → `raw/assets/drive-links.yaml`
41. ⭐ Drive-mappa linkje: logó, fotók, korábbi kreatívok, hirdetési szövegek.
42. Korábbi social kommunikáció: mely top posztok mentek a legjobban? (linkek)
43. ➕ Van olyan anyag (videó, vélemény, sajtó), amit szeretnétek felhasználni?

---

## Kitöltés után
Add ezt a promptot Claude-nak:
```
Olvasd be a kitöltött intake Sheetet a Drive ügyfélmappából, és szinkronizáld a
tartalmat a brain/ megfelelő fájljaiba (client.yaml, offering.yaml, audience.yaml,
positioning.md, brand.yaml, constraints.md, performance-insights.md). Ahol hiányos a
válasz, jelöld `TODO`-val, és listázd, mi hiányzik a teljes brain-hez.
```
