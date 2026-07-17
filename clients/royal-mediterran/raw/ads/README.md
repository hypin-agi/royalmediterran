# raw/ads/ — hirdetési teljesítmény adat

## Mit tegyél ide
- **Meta:** Ads Manager export CSV-k a `meta/` alá (kampány / ad set / ad szinten).
- **Google:** Google Ads report CSV-k a `google/` alá + a Looker Studio riport linkje.
- Kreatívok képei NEM ide — Drive-linkként a `../assets/drive-links.yaml`-ben.

## Ajánlott export-oszlopok (a jó elemzéshez)
`campaign, ad_set, ad_name, date_range, spend, impressions, clicks, ctr, cpc,
purchases/conversions, conversion_value, roas, cpa`

## Fontos
A nyers CSV itt marad **archívumnak**. A tanulságot Claude a
`brain/performance-insights.md`-be vonja ki (lásd EXTRACTION-PLAYBOOK 9. recept).

## Kapcsolódó linkek
- Looker Studio riport URL: lásd `client.yaml` → `systems.google_ads.looker_studio`
- Booking/PMS (pl. SabeeApp) riport: a valós bevétellel való összevetéshez
