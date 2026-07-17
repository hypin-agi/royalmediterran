# Client Brain — Hypin' ügyfél tudásbázis

Ez a repó egy **AI-native ügyfél tudásbázis**. Célja: minden ügyfélhez tartozó adatot
(weboldal, képek, brandbook, social előzmény, Meta/Google Ads teljesítmény) úgy tárolni,
hogy **Claude egyetlen kontextusként be tudja olvasni** az egész ügyfelet, és onnan
magas minőségű deliverable-öket generáljon: marketingtervet, PPC-tervet, social naptárt,
kreatív briefeket és képgeneráló promptokat.

> **Alapelv:** nem embereknek rendezünk mappát — *AI-nak strukturálunk adatot*.
> Minél gépi-olvashatóbb a `brain/`, annál több és jobb output jön ki belőle.

---

## A 3 rétegű logika

```
raw/     →   brain/    →   output/
nyers        destillált    generált
adat         tudás         deliverable
(ahogy jön)  (YAML/MD)     (terv, poszt, PPC, prompt)
```

| Réteg | Mi kerül ide | Ki tölti |
|-------|--------------|----------|
| **`raw/`** | Nyers, ahogy érkezik: website scrape, ads CSV export, social export, Drive linkek, brandbook PDF | Ember tölti fel / Claude scrape-el |
| **`brain/`** | Destillált, strukturált tudás: brand hangvétel, célközönség, USP, past performance tanulságok, tiltólista | Claude destillálja a `raw/`-ból, ember validálja |
| **`output/`** | Kész deliverable-ök: stratégia, PPC-terv, social naptár, kreatív brief, image prompt | Claude generálja a `brain/`-ből |

Minden ügyfélnek van egy **`CONTEXT.md`** (a belépési pont, amit Claude először olvas)
és egy **`client.yaml`** (gépi metaadat).

---

## Repó struktúra

```
/
├── README.md                  ← ez a fájl
├── CLAUDE.md                  ← utasítás Claude-nak, amikor ebben a repóban dolgozik
├── _template/                 ← ÚJRAHASZNOSÍTHATÓ sablon (másold új ügyfélhez)
└── clients/
    └── royal-mediterran/      ← első valós ügyfél
```

## Új ügyfél felvétele

```bash
cp -r _template clients/<ugyfel-slug>
```
Majd nyisd meg a `clients/<ugyfel-slug>/CONTEXT.md`-t és kövesd a benne lévő
**onboarding checklistet**.

## Hogyan "maxolom ki"?

Lásd: [`_template/EXTRACTION-PLAYBOOK.md`](_template/EXTRACTION-PLAYBOOK.md) —
ez felsorolja az ÖSSZES deliverable-t, amit a rendszer generálni tud, és a hozzájuk
tartozó kész promptokat.
