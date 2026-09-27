# data-raw / real-estate-world

CHANGED (S3-re) — CATALOG §C #9, replacing `_examples/Contribution/real estate most expensive` (top 15, US$ per m²,
"2025", no source or date; audit in CLAUDE.md §14 S3-re).

| File | What |
|---|---|
| `numbeo-price-centre.txt` | Numbeo "Price Rankings by City: Price per Square Meter to Buy Apartment in City Centre", US$, 516 cities. From the owner's workbook `docs/data/Real estate.xlsx` (sheet 2) via `extract-xlsx.py`: tab-separated `rank · city label · · $price`. |
| `numbeo-price-outside.txt` | The same for "Outside of Centre", 514 cities (sheet 3). |
| `numbeo-property-index.txt` | Numbeo "Current Property Prices Index by City", 402 cities (sheet 4), with its header row. Columns after `Rank · City`: price to income ratio · gross rental yield centre / outside · price to rent ratio centre / outside · mortgage as % of income · affordability index — prep keeps the ratio, both price-to-rent ratios and the mortgage share; the other three columns repeat them (checked on all 402 rows: yield = 100 ÷ price-to-rent, affordability index = 100 ÷ mortgage share, up to Numbeo's rounding to 0.1). |
| `city-names.csv` | `numbeo,code,en,uk,lat,lon,source,note` — Numbeo's label → ISO code (checked against the label), display names and WGS 84 coordinates, 528 cities. EN = Numbeo's city name (Kyiv, Odesa, Kraków, Querétaro, Reggio Emilia, Washington, D.C., Ghent, Erbil, Lucknow, Freiburg, Las Palmas adjusted; US and Canadian labels "City, ST, Country" → "City"). UK and coordinates = Wikidata (`source` = `wikidata:Q…`: label + P625) or, where Wikidata had no match, the wrong item or an off spelling, a name to review (`source` = `review`, reason in `note`; 54 rows; coordinates placed by hand where noted). |
| `extract-xlsx.py` | `python3 extract-xlsx.py "<xlsx>" <sheet 1-based> <out.txt>` — stdlib only; keeps the header and the ranked rows; US$ cells keep their `$`; other numbers as Numbeo shows them (8.1999999999999993 → 8.2). Prints both sha256 and the row count. |
| `prep.ts` | `npm run prep -- real-estate-world` → `public/data/real-estate-world/numbeo-2026-09.json` (one row per city: URL id `<name>-<iso>`, names, region, coordinates, the three measures Numbeo ranks with their ranks, the mortgage share and both price-to-rent ratios) and `land-110m.json` (the map's land outline, below). Fails on an unknown country, a missing name or coordinate, a price not in US$, a missing or repeated rank, a value that rises with rank, a changed column order, a table shorter than expected, two cities with one id, or a land file that is not the expected world-atlas release. |
| `../_shared/world-atlas-land-110m.json` | world-atlas 2.0.2 `land-110m.json` (TopoJSON of Natural Earth 1:110m land; public domain data, world-atlas ISC — `../_shared/world-atlas-LICENSE.txt`), from `npm pack world-atlas@2.0.2`. prep decodes it, drops Antarctica (no city south of 60° S), projects it once to Equal Earth fitted to 1000 px and writes one SVG path (48.6 kB, 19 kB gzip); the page projects city coordinates with the same parameters (the formula is written out in `src/charts/renderPointMap.ts` and pinned to d3-geo's by a test), so the site loads no geo library. |

## Sources and terms

**Numbeo** (crowd-sourced; asking prices, rents and salaries reported by users, not registered sales):
- https://www.numbeo.com/cost-of-living/city_price_rankings?displayCurrency=USD&itemId=100 (516 cities, 2026-09-27)
- https://www.numbeo.com/cost-of-living/city_price_rankings?displayCurrency=USD&itemId=101 (514 cities)
- https://www.numbeo.com/property-investment/rankings_current.jsp (402 cities)
- Formulas: https://www.numbeo.com/property-investment/indicators_explained.jsp — price to income = 90 m² × average of
  the centre and outside prices ÷ (1.5 × average net salary × 12); mortgage = 20-year loan for 100 % of that price,
  monthly payment ÷ monthly family income; price to rent = price per m² ÷ yearly rent per m² (centre / outside).
  Derived on the page, never stored: centre premium = centre ÷ outside; m² a year of income = 90 ÷ price to income.

Terms (https://www.numbeo.com/common/terms_of_use.jsp): free for personal use; personal websites must credit Numbeo with
a link back; automated collection (scraping, crawling) is prohibited without written permission — hence the owner's
manual copies (the workbook). The page links every table it uses and its formulas.

**Numbeo's free monthly page limit:** its price-ranking pages lock for free users after a few views a month (reset on
the 1st); reads from the in-app browser on the owner's computer count too. Never open Numbeo from the agent.

**Wikidata** (CC0) — Ukrainian labels and coordinates (P625), queried 2026-09-25 and 2026-09-27 through the Query
Service in the in-app browser: English label or alias + country (ISO 3166-1 via P297) + an instance of human settlement
(Q486972), the most populous match; US cities through their state (P131, one to three hops).

**Natural Earth** (public domain) via **world-atlas** 2.0.2 (ISC, Mike Bostock) — https://github.com/topojson/world-atlas

```
95b816ba893983b29f0939d7b8a5ab9079409c1b0082b50fd99427dceb93551a  Real estate.xlsx (owner, docs/data, 2026-09-27, not committed)
14a7497fed3ece9c0a1d06ac6edd9d7bb14dc1bf9e8843ecb21bf46849c7a705  numbeo-price-centre.txt (516 rows)
dfb3fd889aca11295d57fa2bdd7447590cb4eadb63643233b4fa8fa393b1f1da  numbeo-price-outside.txt (514 rows)
f6aba83e083c2cb84118cb22c01ca014e58def0972f42c3cdb2ac672e1ee1207  numbeo-property-index.txt (402 rows)
6914731830d102faa5d17864469c542e20806f2207e670ff13a374e824e682d4  city-names.csv (528 cities, 54 review)
ead5f68119c49a9250902e7da303bcb209341bbb8fefe7369a439b48b704658a  ../_shared/world-atlas-land-110m.json
```

## Decisions (owner)

1. **2026-09-25 — Numbeo, a row = a city** with its country's flag (ISO: Hong Kong = HK, Macao = MO, not CN); all
   cities; Numbeo's own ranks where it ranks (its order breaks ties); Ukrainian names from Wikidata + owner review.
2. **2026-09-27 — a rich page, not a single ranking:** six angles — a ranking of eight measures, price vs affordability
   (scatter), a year of income & the mortgage (waffles + beeswarm), the centre vs the outskirts + rent (dumbbell +
   beeswarm), a world map (region zoom), a comparison; a city picker (up to five, state in the URL) highlights cities
   on every angle, the Ukrainian cities by default, presets «Україна» and «Україна й сусіди».
3. **Legacy numbers are not used**: a 2025 snapshot of a rolling crowd-sourced table cannot be reproduced (Numbeo's
   city history is paid), and the same cities differ by −35 … +30 % from Numbeo in September 2026.

## Refresh (owner)

1. Save the three Numbeo tables into one workbook (as in September 2026), then for each sheet:
   `python3 extract-xlsx.py "docs/data/<workbook>.xlsx" <sheet> data-raw/real-estate-world/<file>.txt`.
2. `npm run prep -- real-estate-world` lists every city without a name or coordinates — add them to `city-names.csv`.
3. Add a new data file for a new month (`numbeo-YYYY-MM.json`) rather than overwriting, update `meta.ts`, CHANGELOG.
4. Review the 54 `review` rows of `city-names.csv` (fix `uk` / coordinates in place; `source` may stay `review`).
