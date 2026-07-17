# Performance Insights — Royal Mediterran

<!--
Forrás: Asana kampány-briefek 2025-2026 + heti Looker csekk munkafolyamat
        + VALÓS Meta Ads export (Drive: Royal_mediterran_meta_ads), 2026-07-17-én beolvasva.
A "Mit tudunk a Meta adatból" szekció MÉRT számokat tartalmaz (Meta-riportált).
A többi tanulság a briefek mintázatából levont következtetés. Ahol nincs mért adat, HIPOTÉZIS.
-->

## ⭐ Mit tudunk a VALÓS Meta adatból (2026-07-17-i export)

> **Fiók:** *Sparadise Kft.* Meta-fiók — ez EGY fiókban keveri a szálloda-csomagokat,
> a **hajóbérlést** (Hajóbérlés/Sparadise vízisport), a **Sunset Bar**-t és az
> **álláshirdetéseket**. A szálloda ROAS-t ezektől elkülönítve kell nézni.
> A ROAS/CPA értékek **Meta-riportáltak** — havonta a SabeeApp (PMS) valós foglalással
> reconciliálandók (ld. lentebb a mérési eltérés-pontot). Az irány azonban egyértelmű.

**A pénztermelő motor egyértelmű:**
- **`Purchase - csomagok`** (Purchase objective, pixel-purchase, CBO): **ROAS 5,18** teljes
  élettartamon, **~10,2 M Ft** elköltve (ez a fiók domináns költése), **1122 vásárlás**,
  **CPA ~9 133 Ft**. Az elmúlt 30 napban (nyár): **ROAS 4,66**, CPA ~14 796 Ft, 11 vásárlás.
  → **Ez kapja a budget zömét. Purchase objective + CBO a nyerő váz.**
- **`Purchase v2`** (Purchase): ROAS 2,83, CPA ~22 072 Ft — másodlagos, kisebb.

**Ami alulteljesített (tanulság: ne ide menjen a fő pénz):**
- **Traffic / Engagement / Boost objective = ROAS < 1** minden esetben:
  `2-Traffic` 0,87 · `Conversion (traffic)` 0,59 · `Postboost` 0,69 · `Post boost` 0,24.
  → Ezek NEM hoznak közvetlen foglalást; csak olcsó remarketing-üzemanyagként érdemesek.
- **AddToCart-ra optimalizált konverziós kampányok**: `Conversion (cart)` ~1,72 M Ft és
  `Conversion (addtocart_2025)` ~0,94 M Ft — **0 rögzített vásárlás, üres ROAS**.
  → Add-to-cart optimalizálás nem fordult át vásárlásba (esemény/attribúció-hiba gyanúja).
  **Purchase-re optimalizálj, ne AddToCart-ra.**
- **`Sabeeapp Conversion`**: rossz eseményre (`donate_website`) optimalizált → 88 357 Ft / 1 konv,
  leállítva (2026-05-31). Megerősíti a CAPI/esemény-térkép hibát — javítandó.

**Piac-tanulságok (KORREKCIÓ a brain hipotéziséhez):**
- **DE (német) Meta-n NEM térült meg lead-genen:** `Német - traffic` ~146 k Ft → **0 mért
  vásárlás**; `Német - Lead` **161 564 Ft / 1 lead**; a friss 30 napban a DE Lead CPM
  extrém magas (**1 849 Ft**) 0 eredménnyel. → A "HU+DE kettős motor" **Meta-n egyelőre nem
  igazolt**. Ajánlás: DE lead-formákat állítsd le; ha DE-t tesztelsz, **Purchase objective +
  a HU nyerő kreatív natív német fordításával**, kis capelt kerettel, CPA-küszöbre kilövéssel.
- **PL (lengyel) Lead** új kísérlet: ~124 k Ft (+63 k friss) → **0 konverzió**. Cap/figyelés,
  teszt-státusz, nem core.
- **Hajóbérlés / Sunset Bar** külön Sparadise termékvonalak ugyanabban a fiókban
  (`Traffic - Hajóbérlés` ROAS 1,21 élettartam / 1,46 friss). **Külön kell tartani a szálloda
  budgettől és riporttól**, nehogy hígítsa a szálloda ROAS-t.

**Benchmark-számok a tervezéshez (Meta-riportált):**
- **CPA-cél (foglalás):** ~9 000–12 000 Ft (élettartam 9 133; nyári csúcs 14 796 mint felső sáv).
- **ROAS:** flagship Purchase **4,66–5,18** bizonyítottan → blended cél **≥ 4,0** reális,
  Purchase/BOF floor **4,0**, cél **5,0**; TOF traffic reálisan < 1 ROAS közvetlenül (funnel-üzemanyag).
- **Attribúció:** a nyerők 7-napos klikk / 1-napos nézés ablakon futnak; a Purchase-kampányok
  `fb_pixel_purchase` eseményre.
- **Költés-koncentráció tanulság:** a fiók történelmileg a nyerőre (Purchase-csomagok) tette a
  keret zömét — ezt folytatni kell, nem szétaprózni gyenge traffic/cart kampányokra.

## ⭐⭐ HIRDETÉS-SZINTŰ (ad-level) elemzés — 2026-07-17-i export (241 hirdetés)

> Forrás: `raw/ads/meta/2026-07-17-meta-hirdetes-szintu-2023-2026.csv` (Sparadise Kft.,
> 2023.06.17–2026.07.17, 241 hirdetés, ebből 175 költött). Ez a legrészletesebb adat:
> hirdetésenkénti költés/vásárlás/ROAS + hirdetéssorozat + minőségi rangsor.
> Össz mért költés 6,70 M Ft, 285 vásárlás; a **Purchase-objektívű** hirdetések adják a
> **285-ből 240 vásárlást** (~84%). Költés-súlyozott átlag ROAS a mérhető hirdetéseken: **4,61**.

**A single legnagyobb nyerő hirdetés:**
- **`2026_01 - 99e - kép`** (Deluxe lakosztály 99.900 Ft, **statikus KÉP**): **722.526 Ft** költés,
  **55 vásárlás**, CPA **13.137 Ft**, **ROAS 7,91**. Egyetlen statikus ár-blokk kép — a fiók
  legnagyobb és egyik legjövedelmezőbb hirdetése. → A "99e Deluxe + statikus kép" bevált nyerő.

**Formátum-tanulság (KORREKCIÓ a formátum-mix hipotézishez):**
- **Statikus KÉP: súlyozott ROAS 4,50** (1,42 M Ft költés) ≫ **videó: 1,91** (705 e Ft) ≈ **AI videó: 2,23** (153 e Ft).
- → A **statikus ár-blokk kép viszi a konverziót**, a videó (sima és AI is) alulteljesít vásárlásra.
  A brain korábbi "1 statikus + 1 AI mozgó + 1 beszélős videó" mixe finomítandó: a videó
  awareness/feltöltés, a **konverziós budgetet statikus ár-blokk képre** kell tenni.

**Angle / csomag ROAS-rangsor (hirdetésnév alapján, költés-súlyozott):**
| Angle/csomag | db | költés | súly. ROAS |
|---|---|---|---|
| Privát strand | 1 | 31 e | **8,59** |
| **Penthouse** | 10 | 351 e | **8,28** |
| **Deluxe** | 7 | 254 e | **7,35** |
| **Last Minute** | 9 | 262 e | **7,03** |
| Nőnap | 1 | 51 e | 6,68 |
| **Szerelmesek** | 25 | **1,08 M** | **6,08** (legnagyobb volumen) |
| Valentin | 8 | 133 e | 5,00 |
| Romantika/feltöltődés | 9 | 549 e | 3,62 |
| Piknik/hajós | 3 | 293 e | 2,98 |
| Hajóbérlés | 8 | 488 e | 2,01 |
| Karácsony/családi | 8 | 99 e | **1,47** (gyenge) |

→ **Párok/romantika a pénz**: Penthouse, Deluxe, Last Minute, Szerelmesek mind 6–8 ROAS.
A **családi/karácsonyi** angle (1,47) és a **hajóbérlés** (2,01) gyenge — a hajó külön
Sparadise termékvonal, a családi hotel-angle Meta-n nem hoz vásárlást.

**Szezonalitás (ad-level megerősítés):** a **decemberi páros/penthouse/last minute** hirdetések
a legjövedelmezőbbek (ROAS 8–13, CPA 4.500–11.000 Ft): pl. `2025_12 - karácsonyi szerelmesek`
ROAS 12,95; `2025_12 - karácsonyi penthouse` 9,90–10,12; `2025_12 (lastminute 40e)` 8,81 (27 vásárlás).
→ December a legjobb megtérülésű ablak — ide skálázni.

**Bizonyított ár-pontok (a nyerő hirdetések nevéből):** Deluxe **99.900**; Szerelmesek **69.900**
(illetve 70–80e "ajándék hajóval"); Last Minute **40e** (és 10e/fő/éj kommunikáció);
Romantika **55e**; Valentin **59.900**; Penthouse mikulás **25e/fő**.

**Elpazarolt költés (ad-level, kerülendő):**
- **`2025_alwayson_kép_v2`** always-on boost: **584.339 Ft** költés → **2 vásárlás, ROAS 0,07**. A legnagyobb pénznyelő.
- Összesen **~1,82 M Ft** ment el 0-vásárlásos hirdetésekre (>30 e Ft/db) — jellemzően
  link_click / landing_page_view / video_thruplay / **add_to_cart** objektívvel
  (pl. `2026_04 - szerelmesek + hajo 80e` add_to_cart-on 57.840 Ft → 0 vásárlás),
  és a `donate_website` eseményre optimalizált `15szazalek` (65.975 Ft → 0).
- Objektív-bontás: link_click 47 hirdetés / 1,56 M Ft / **mindössze 16 vásárlás**;
  add_to_cart 9 hirdetés / 292 e Ft / **4 vásárlás**. → Ezekre NE menjen konverziós budget.

**Minőségi rangsor:** a legtöbb hirdetésnél üres ("–"), a besoroltak közül 18 "Átlagos",
csak 4 "Átlag feletti" — a kreatív-minőség jelzés gyenge, a nyerőket az ár/angle/objektív viszi, nem a Meta minőség-score.


## Mit tudunk (bevált mintázatok a kampány-történetből)
- A **romantika / privát jakuzzi** angle a párok fő húzóüzenete (Penthouse, Szerelmesek).
- **Forintosított kedvezmény + áthúzott ár** a bevált ár-kommunikáció (Levi rendszeresen
  ezt kéri, %-os helyett vagy mellett).
- **Ajándék-hook** ("ajándék hajózással", "névre szóló ajándékutalvány") növeli a vonzerőt.
- **Bevált vizuálok újrahasznosítása**: "a grafika legyen ugyanaz mint tavaly, mert nagyon
  mentünk vele" → a nyerő kampány-kreatívokat évről évre visszahozzuk, csak ár/dátum frissül.
- **Formátum-mix csomagonként**: 1 statikus + 1 AI mozgó videó + 1 beszélős AI videó.

## Csatorna-tanulságok
### Meta Ads
- Fő kreatív-motor (statikus + AI videók). Szegmens-szintű angle-ök (párok vs családok vs DE).
- **MÉRT (2026-07 export):** a nyerő kampánytípus a **Purchase objective + CBO** ("Purchase -
  csomagok", ROAS 5,18). Traffic/engagement/AddToCart objective alulteljesít (ROAS < 1 / 0 vásárlás).
  DE lead-gen nem térült (161 k Ft/lead). Ld. fentebb a "VALÓS Meta adat" szekciót.
### Google Ads
- Heti Looker Studio csekk (riport link a client.yaml-ben). Zoli/ads felelős.
- TODO: legjobb kulcsszó-témák, kampánytípus a Google exportból.

## Szezonalitás (a valós kampány-naptár)
| Időszak | Kampány | Mi működik |
|---------|---------|-----------|
| Február | **RED WEEK** (kb. 02.09-02.15), Valentin | páros csomagok, "Csak Ma ár", Penthouse/Deluxe/Szerelmesek |
| Március eleje | **PINK WEEKEND** (kb. 03.06-03.08) | Szerelmesek + Deluxe, forintosított kedvezmény |
| Március | tavaszi **last minute** | last minute + piknik csomag, /fő/éj ár |
| Március-május | nyári tervezés | családi + DE apartman hirdetések felfutása |
| Június-augusztus | **nyári főszezon** | családok, saját strand, közvetlen vízpart (HU+DE) |
| November | **BLACK WEEK** (11.07-11.17) + **BLACK WEEKEND** (11.27-30) | legerősebb akciók, %-os kedvezmény, "bevált tavalyi grafika" |
| December eleje | **Mikulás** (12.05-06) | MIKULAS40 kupon, Penthouse 99.900 |
| December | **karácsony** (12.19-24 erős), ajándék | KARACSONY20, Penthouse "csak ma", ajándékutalvány |
| December | **last minute téli** | LASTM2025, 39.900 Ft, limitált darab |

> Megjegyzés a briefekből: **dec 20-23 erős időszak**, **dec 24-27-re készletet kell
> foglalni előre** (volt év, amikor kimaradt → elveszett bevétel).

## Kampány-napló (kronológia, tanulságok)
- **2025-11** — Black Week: tavalyi bevált grafikák újrahasznosítása, %-os kedvezmény kirakva.
- **2025-12** — Mikulás + karácsonyi kampány, cél ~napi 200e Ft bevétel, ~20e Ft/nap költési limit.
- **2026-02** — RED WEEK: "Csak Ma ár" mechanika napra pontosan (02.09).
- **2026-03** — Pink Weekend + tavaszi last minute + árfrissítések.
- **2026-05** — hajós ajándék angle ("ajándék hajózással") több csomagon.

## Amit NE ismételjünk (kudarcok / kockázatok)
- **Készlethiány csúcsidőben** (dec 24-27) — előre foglalni a hirdetett csomagra kapacitást.
- **Mérési eltérés**: volt feladat "miért lehet más a mérés mint a valóság" → a Meta/Google
  konverziót vesd össze a SabeeApp (PMS) valós foglalással, mielőtt ROAS-t következtetsz.

## Nyitott kérdések / mérendő
- ✅ Meta valós ROAS: beolvasva (Purchase-csomagok 5,18; részletek fent). Google Ads külön export kell.
- ✅ DE Meta-megtérülés: egyelőre NEM igazolt lead-genen (fent). Purchase-objective DE-teszt nyitott.
- Melyik ajándék-hook (hajózás vs utalvány) hoz több foglalást? (a Meta export kampány-szinten nem bontja).
- Meta ROAS ↔ SabeeApp (PMS) valós foglalás reconciliáció — havi rendszerességgel.
- Google Ads Looker export beolvasása (kulcsszó-témák, kampánytípus).
