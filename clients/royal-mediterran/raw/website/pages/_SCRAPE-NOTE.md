# Weboldal — scrape jegyzet

**Állapot:** a `https://royalmediterran.hu` automatikus lekérése **403 Forbidden**-t ad
(bot-védelem / Cloudflare). Emiatt a weboldal tartalma még nincs beimportálva.

## Amit a csomag-URL-ekből és hirdetésekből eddig tudunk
- Aparthotel Siófokon, közvetlen Balaton-part, saját strand, privát wellness.
- Csomag-oldalak struktúrája: `royalmediterran.hu/csomag/<slug>/` (ld. `brain/offering.yaml`).
- Karrier oldal is van: `royalmediterran.hu/karrier/...`

## Hogyan pótoljuk (opciók)
1. **CMS export** (WordPress → oldalak szövege) — a legtisztább.
2. **Kézi másolás** a fő oldalakról (kezdőlap, csomagok, rólunk, GYIK) ide, oldalanként 1 md.
3. Böngésző-alapú scrape (Playwright) egyeztetés után, ha az ügyfél engedélyezi.

> Amíg nincs meg a teljes weboldal-tartalom, a copy-generálás a `brain/` + a
> `raw/assets/ad-copy-hu-de.md` alapján is jó minőségű.
