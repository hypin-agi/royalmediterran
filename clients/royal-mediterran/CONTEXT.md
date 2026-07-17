# Royal Mediterran Aparthotel — Client Brain

> **Egymondatos lényeg:** Közvetlen Balaton-parti aparthotel Siófokon, saját stranddal és
> privát wellnesszel — nyáron **családoknak**, egész évben **pároknak/romantikának**
> (Penthouse, jakuzzi, félpanzió, hajós élménycsomagok). HU + DE piac.

## Gyors tények
- **Web:** https://royalmediterran.hu
- **Iparág:** aparthotel / wellness, Balaton-part (Siófok)
- **Nyelvek / piacok:** hu, de / HU, DE, AT
- **Fő KPI:** bevétel/nap + ROAS (heti Looker Studio csekk)
- **Account manager:** Levi (Levente Tanai)

## Hol van mi (a brain térképe)
| Kérdés | Fájl |
|--------|------|
| Ki a célközönség? | [`brain/audience.yaml`](brain/audience.yaml) |
| Milyen a hangvétel / arculat + kreatív konvenciók? | [`brain/brand.yaml`](brain/brand.yaml) |
| Mit árulunk? (csomagok/árak) | [`brain/offering.yaml`](brain/offering.yaml) |
| Miben vagyunk jobbak? (USP, verseny) | [`brain/positioning.md`](brain/positioning.md) |
| Mi vált be eddig? (szezon, angle-ök) | [`brain/performance-insights.md`](brain/performance-insights.md) |
| Mit TILOS? | [`brain/constraints.md`](brain/constraints.md) |
| Nyers adat (drive, ads, web) | [`raw/`](raw/) |
| Kész deliverable-ök | [`output/`](output/) |

## Mit tudok ebből generálni?
Lásd [`EXTRACTION-PLAYBOOK.md`](EXTRACTION-PLAYBOOK.md) — kész promptok:
marketingstratégia, PPC-terv, social naptár, kreatív brief, HU/DE ad copy, image promptok.

## Kulcslinkek
- **Looker Studio riport:** a `client.yaml` → `systems.google_ads.looker_studio`
- **Drive ügyfélmappa:** Logó Vektoros / hirdetési szövegek / Kreatívok
- **Asana projekt:** `client.yaml` → `systems.project_mgmt.asana_project`

## A brain állapota (mi hiányzik még)
A brain nagyrészt feltöltve az Asana + Drive adatból. Nyitott `TODO`-k:
Meta/Google fiók ID-k, GA4, social profil linkek, pontos budget, egyes normál árak
megerősítése. **A kimaxoláshoz töltsd ki:** [`INTAKE-QUESTIONNAIRE.md`](INTAKE-QUESTIONNAIRE.md)
(vagy a Drive-on lévő intake Google Sheet).
