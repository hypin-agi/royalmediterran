# raw/ — nyers adatok (ahogy érkeznek)

Ide kerül minden nyers forrás. A repó **szöveg-only** → nagy binárisok (kép, videó,
PDF) **Drive-linkként** élnek, nem fájlként.

```
raw/
├── website/          # weboldal tartalom
│   └── pages/        # oldalanként 1 markdown (scrape vagy export)
├── assets/           # vizuális eszközök
│   ├── drive-links.yaml   # kép/logó/brandbook Drive linkek
│   └── brandbook/    # brandbook PDF VAGY drive link a drive-links.yaml-ben
├── social/           # korábbi social kommunikáció
│   ├── instagram/    # export / top posztok / caption archívum
│   └── facebook/
└── ads/              # hirdetési teljesítmény
    ├── meta/         # Meta export CSV + kreatívok linkje
    └── google/       # Google Ads export CSV + Looker link
```

## Elv
A `raw/` az **archívum és bizonyíték**. A deliverable-öket sosem közvetlenül innen
gyártjuk — előbb a tanulság a `brain/`-be destillálódik (lásd `CLAUDE.md`).
