# data-raw / crime-index

| File | What |
|---|---|
| `unodc-homicide-latest.csv` | `iso3,year,rate,victims` — per country or territory, the latest year (2015 or later) with a UNODC rate of victims of intentional homicide per 100,000 (all ages, both sexes, all contexts), with the victim count of the same year; UNODC's sub-national codes for the UK (`GBR_E_W`, `GBR_S`, `GBR_NI`) and Iraq (`IRQ_C`) as published; the last row `WLD` = UNODC's world estimate. |
| `numbeo-crime-2026-mid.txt` | Numbeo's table copied by hand by the owner (tab-separated `Rank · Country · Crime Index · Safety Index`, 148 rows, header and reference line kept as copied). |
| `prep.ts` | `npm run prep -- crime-index` → `public/data/crime-index/homicide-rate.json` (+ `numbeo-crime-2026-mid.json` when the .txt exists) |

## Sources

**UNODC** — Data Portal, Intentional homicide, "Download data":
https://data.unodc.org/sites/dataportal.unodc.org/files/2026-07/data_cts_intentional_homicide.xlsx (file dated
12 Jul 2026; 7,762,260 bytes; not committed), read 2026-09-24 in the in-app browser (SheetJS): sheet
`data_cts_intentional_homicide` → Indicator "Victims of intentional homicide", Dimension, Category, Sex, Age =
"Total", unit "Rate per 100,000 population" (and "Counts" for the same year); sheet
`data_cts_homicide_reg_estimates` → World, 2024, per 100,000, Total = 5.14. Terms: UNODC data portal
"Terms and Conditions" (https://www.unodc.org/unodc/legal.html) — cited with a link.

```
126c1b5282f2872d5197bcd130c0d2d4adf3b820230651f402ec3c0918c423bb  data_cts_intentional_homicide.xlsx (UNODC, not committed)
0480589cd1bfad75df147ba41fd2ef5b5c2e826e1599bd7669f434b56a6cd3d1  unodc-homicide-latest.csv (169 rows incl. WLD)
7914a9fe6883135f037f45e174b9c4536a98c63b9556f5753c56fe73dffe8ef5  numbeo-crime-2026-mid.txt (owner's copy, 2026-09-25)
```

**Numbeo** — Crime Index by Country 2026 Mid-Year, https://www.numbeo.com/crime/rankings_by_country.jsp (148
countries). Terms (https://www.numbeo.com/common/terms_of_use.jsp): personal websites may use the data with a
link back; automated collection (scraping) is prohibited — hence the owner's manual copy.

## Decisions (S3-rb)

1. **Both measures as sub-tabs** (owner): `?show=homicide` (default — official statistics) and `?show=numbeo`
   (perception). They are never mixed in one ranking.
2. **Homicide = latest year since 2015 per country** (168 of 203 with any rate; 95 already 2024): older values
   are dropped rather than presented as current; values older than 2024 are marked with their year.
3. **United Kingdom** = England and Wales + Scotland + Northern Ireland, all 2023, combined as
   Σ victims ÷ Σ (victims ÷ rate × 100,000) — each part's population is implied by UNODC's own figures, nothing
   typed. **Iraq**: the only recent figure (2021) is Central Iraq without the Kurdistan Region — kept, marked.
4. **Ukraine**: UNODC's latest figure is 2021; war deaths are not intentional homicides (UNODC definition), so
   there is no wartime value to substitute.
5. **Numbeo Safety Index is derived** (100 − Crime Index); prep aborts if Numbeo's published safety differs.
   Equal indexes (Numbeo shows one decimal) keep Numbeo's published order (its rank column) — Jamaica 9th,
   Guyana 10th at 67.4. Numbeo names that differ from the CLDR English names are mapped in `NUMBEO_ALIASES`
   (e.g. "Us Virgin Islands" → VI, "Kosovo (Disputed Territory)" → XK).
6. Regions from ISO via `data-raw/_shared/m49.ts` (Haiti = Americas, CATALOG §E Q1); ISO3 → ISO2 via the WPP
   location table in `data-raw/population-by-country/`.
