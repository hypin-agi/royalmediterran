<!--
============================================================
CONTEXT.md — AZ ÜGYFÉL BELÉPÉSI PONTJA
Ezt olvassa Claude ELŐSZÖR. Rövid, összeköti a többi fájlt.
Nem ide írjuk a részleteket — ide a "hol keresd" térképet és
a legfontosabb 10 sort, ami minden deliverable-höz kell.
============================================================
-->

# {{CLIENT NAME}} — Client Brain

> **Egymondatos lényeg:** {{mit csinál, kinek, mi az egyediség — 1 mondat}}

## Gyors tények
- **Web:** {{url}}
- **Iparág:** {{industry}}
- **Nyelvek / piacok:** {{hu, de / HU, DE}}
- **Fő KPI:** {{pl. ROAS / foglalás}}

## Hol van mi (a brain térképe)
| Kérdés | Fájl |
|--------|------|
| Ki a célközönség? | [`brain/audience.yaml`](brain/audience.yaml) |
| Milyen a hangvétel / arculat? | [`brain/brand.yaml`](brain/brand.yaml) |
| Mit árulunk? (csomagok/árak) | [`brain/offering.yaml`](brain/offering.yaml) |
| Miben vagyunk jobbak? (USP, verseny) | [`brain/positioning.md`](brain/positioning.md) |
| Mi vált be eddig? (ads/social tanulság) | [`brain/performance-insights.md`](brain/performance-insights.md) |
| Mit TILOS? (jogi, hangvétel) | [`brain/constraints.md`](brain/constraints.md) |
| Nyers adatok (export, scrape, drive) | [`raw/`](raw/) |
| Kész deliverable-ök | [`output/`](output/) |

## Mit tudok ebből generálni?
Lásd [`EXTRACTION-PLAYBOOK.md`](EXTRACTION-PLAYBOOK.md) — kész promptok minden
deliverable-höz (marketingterv, PPC-terv, social naptár, kreatív brief, image prompt).

## Onboarding checklist (új ügyfélnél töltsd ki)
- [ ] `client.yaml` kitöltve (rendszerek, linkek, kontaktok)
- [ ] `brain/brand.yaml` — hangvétel, színek, logó, tiltott szavak
- [ ] `brain/audience.yaml` — legalább 2 persona
- [ ] `brain/offering.yaml` — összes termék/csomag + ár
- [ ] `brain/positioning.md` — USP + 3 versenytárs
- [ ] `raw/assets/drive-links.yaml` — kép/brandbook/logó drive linkek
- [ ] `raw/website/` — weboldal tartalom (scrape vagy export)
- [ ] `raw/ads/` — Meta + Google export vagy Looker link
- [ ] `brain/performance-insights.md` — első tanulságok a múltból
