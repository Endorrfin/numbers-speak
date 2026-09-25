# data-raw / population-by-country

| File | What |
|---|---|
| `wpp2024-population-2025.csv` | 237 countries/areas + the World row: name, WPP footnote numbers, M49 location code, ISO3, ISO2, year, total population on 1 July (thousands, 3 decimals = persons) and WPP's own density (kept only for a cross-check, never shipped). Extracted by `extract-wpp.py`. |
| `wpp2024-notes.csv` | The WPP footnotes those rows reference (e.g. 15 = "Including Crimea" on Ukraine). |
| `extract-wpp.py` | `python3 extract-wpp.py <WPP2024_GEN_F01_DEMOGRAPHIC_INDICATORS_COMPACT.xlsx>` — sheet "Medium variant", Year 2025, Type "Country/Area" + "World". Needs `openpyxl`. |
| `prep.ts` | `npm run prep -- population-by-country` → `public/data/population-by-country/population-2025.json` |

## Source

United Nations, Department of Economic and Social Affairs, Population Division (2024). *World Population
Prospects 2024*, file GEN/01/REV1 "Demographic indicators by region, subregion and country, annually for
1950–2100" (compact), https://population.un.org/wpp/downloads?folder=Standard%20Projections&group=Most%20used
— © July 2024 United Nations, **CC BY 3.0 IGO**. Downloaded by the owner on 2026-09-24 (not committed, 26 MB):

```
98e34d9b65b53858cd08a57a566e45050b08093ad85ba5714fe6fbd78055ae6d  WPP2024_GEN_F01_DEMOGRAPHIC_INDICATORS_COMPACT.xlsx
```

WPP 2024 is the UN's latest revision (checked 2026-09-24). The World Bank WDI (July 2026) publishes the same
2025 numbers (India 1,463,865,525 in both) but only for 217 economies — no Taiwan — so the UN file is the
canonical route. The legacy page's 195 rows were the same figures via Worldometers.

## Decisions (S3-rb)

1. **Year 2025, not 2026** (owner): 2026 is still in progress. Note that in WPP 2024 every year from 2024 on is
   a *medium-variant projection*; 2023 is the last estimate year. The page says "estimates for 1 July 2025 —
   modelled figures, not census counts".
2. **Density = population ÷ land area** (CATALOG §E Q3; World Bank EN.POP.DNST definition, inland water
   excluded). Land area is **not copied** here: the page loads `public/data/land-area/land-area.json` and joins
   on the ISO code at runtime (`rankPopulation` in `src/viz/population-by-country/data.ts`), so the two entries
   can never disagree. Join result: 234 of 237 rows; **Guernsey, Jersey and Kosovo** have no land-area row →
   density `null`, note "no land-area figure" (listed in the table, not in the chart).
3. **Approximate density below 25 km² of land**: the land-area source rounds to whole km², which moves density
   by more than 2 % below 25 km² — Monaco's "1 km²" (really ≈ 2 km²) gives 38,341/km² instead of WPP's 25,732.
   Such rows (Monaco, Gibraltar, Tokelau, Nauru, Saint Barthélemy) are marked, not corrected; the Holy See keeps
   its corrected 0.49 km² and is not marked. Our world density (Σ population ÷ Σ land area of the 234 rows,
   63.3/km²) is within 0.3 % of WPP's own 63.1/km².
4. **Borders**: internationally recognized, as in `land-area` — WPP counts Crimea in Ukraine (footnote 15), not
   in Russia; both rows carry `note: 'recognized-borders'` and prep aborts if Ukraine's footnote changes.
5. Regions from ISO via `data-raw/_shared/m49.ts` (Kosovo = Europe, as the World Bank places it).

Open: Monaco's 1 km² and Gibraltar's land area above total area are `land-area` data issues (Worldometers
rounding) — fixing them there would fix the density here automatically.
