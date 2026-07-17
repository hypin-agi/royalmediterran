# output/ — generált deliverable-ök

Ide kerül minden, amit Claude a `brain/`-ből gyárt. Fájlnév-konvenció:
`YYYY-MM-DD-rovid-cim.md`.

```
output/
├── strategy/         # negyedéves/havi marketingstratégia
├── ppc/              # Meta + Google PPC-tervek
├── social-calendar/  # havi social naptárak
├── creative-briefs/  # grafikus/videós briefek, ad copy, hírlevél
└── image-prompts/    # kép-generáló promptok
```

A recepteket (kész promptokat) lásd: [`../EXTRACTION-PLAYBOOK.md`](../EXTRACTION-PLAYBOOK.md).

> A kiemelkedően jól sikerült outputokat érdemes visszalinkelni a `brain/`-be
> few-shot példaként — így a következő generálás még pontosabb lesz.
