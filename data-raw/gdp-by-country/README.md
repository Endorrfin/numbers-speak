# data-raw / gdp-by-country

| File | What |
|---|---|
| `legacy-2023.csv` | Snapshot from the legacy page (`_examples/Contribution/Demographics/GDP by country/files/data.csv`, a copy of the `src/D3` original dated 2025‑09‑08). World Bank WDI, release of 2024‑12‑16, GDP (current US$) for 2023, in US$ billions. |
| `prep.ts` | `npm run prep -- gdp-by-country` → `public/data/gdp-by-country/gdp-2023.json` |

**What prep does:** names → ISO 3166‑1 alpha‑2 (Intl.DisplayNames + an alias table; an unmatched name
aborts); region derived from the code (UN M49, `data-raw/_shared/m49.ts`) — this moved 11 Caribbean
countries and Brunei out of the legacy "Oceania"; values → whole US$; flags and "world share" dropped
(flags come from the code, the share is computed at runtime from `worldTotal` = WB "World" 2023,
$106,172 bn). The output is validated by `src/viz/gdp-by-country/data.ts` — the same parser the page
and `check:data` use.

**Licence:** World Bank data, CC BY 4.0 — attribution on the page (About the data).

**Refresh to a newer year** (the sandbox cannot reach api.worldbank.org, so this is an owner step):
download `https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.CD?format=json&date=<year>&per_page=400`
and the `WLD` aggregate, add an ISO3 → ISO2 step to `prep.ts`, bump the year in `meta.ts`, `DATA_FILE`
and `retrieved`.
