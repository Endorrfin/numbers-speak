# data-raw / gdp-by-country

| File | What |
|---|---|
| `legacy-2023.csv` | Snapshot from the legacy page (`_examples/Contribution/Demographics/GDP by country/files/data.csv`, a copy of the `src/D3` original dated 2025‑09‑08). World Bank WDI, release of 2024‑12‑16, GDP (current US$) for 2023, in US$ billions. |
| `gdp-by-country 2024-2026.xlsx` · `GDP by Country 2024-2026.txt` | Owner workbook (2026‑09‑20): Worldometers "GDP by Country" for 2024 and 2025, one sheet per source (IMF WEO April 2026 · World Bank WDI July 2026) + the page notes and URLs. Source of record. |
| `GDP per Capita 2024-2026.xlsx` · `GDP per Capita 2024-2026.txt` | The same for "GDP per Capita". |
| `wb-gdp-<year>.csv` | The **World Bank** sheet of the GDP workbook, exported as‑is: `rank` (`—` = unranked by the source), `country`, `gdp_label` (display text incl. notes such as `(IMF)`, `(UN, 2023)`, `(2022)`), `gdp_usd`, `gdp_per_capita_usd`. |
| `wb-gdp-per-capita-<year>.csv` | The **World Bank** sheet of the per‑capita workbook: `rank`, `country`, `per_capita` (number or text with a note). |
| `prep.ts` | `npm run prep -- gdp-by-country` → `public/data/gdp-by-country/gdp-{2023,2024,2025}.json` + `gdp-per-capita-{2024,2025}.json` |

**What prep does:** names → ISO 3166‑1 alpha‑2 (Intl.DisplayNames + an alias table; an unmatched name
aborts); region derived from the code (UN M49, `data-raw/_shared/m49.ts`) — this moved 11 Caribbean
countries and Brunei out of the legacy "Oceania"; values → whole US$; flags, ranks, growth and "world share"
dropped (flags come from the code, rank and share are computed at runtime).

- **2023:** `worldTotal` = WB "World" 2023, $106,172 bn (181 economies cover part of it).
- **2024 / 2025 (decision S3‑gdp: World Bank sheets; IMF sheets kept for reference only):**
  `worldTotal` = Σ of the 218 listed economies — the denominator Worldometers uses for its "Share of World
  GDP" column (prep cross‑checks the US share: 26.24 % / 26.0 %). `worldAverage` (per capita) = Σ GDP ÷ Σ
  population, population = GDP ÷ GDP per capita from the GDP sheet → $13,767 (2024), $14,458 (2025).
- **Marked values (decision S3‑gdp: keep + mark):** a label with `(IMF)`, `(UN, <year>)` or `(<earlier year>)`
  is not a WB figure for that year → the row keeps its value and gets `note: {source?, year?}`; the page
  shows `*` and explains it. 2024: 20 rows, 2025: 34 rows (e.g. Taiwan, UAE = IMF; Monaco = WB 2024).

The output is validated by `src/viz/gdp-by-country/data.ts` — the same parser the page and `check:data` use.

**Re‑export the CSVs** (after replacing a workbook): the four CSVs are the WB sheets saved as CSV (UTF‑8),
headers as above; non‑breaking spaces in labels → normal spaces. Then `npm run prep -- gdp-by-country`.

**Licence:** World Bank data, CC BY 4.0; IMF data, IMF terms (attribution) — both credited on the page
(About the data). Worldometers is the retrieval route, not the publisher; its own terms were not verified —
replace with the WB API download when the owner can fetch it:
`https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.CD?format=json&date=<year>&per_page=400`
(and `NY.GDP.PCAP.CD`, plus the `WLD` aggregates); add an ISO3 → ISO2 step to `prep.ts`.
