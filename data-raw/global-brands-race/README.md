# data-raw / global-brands-race

| File | What |
|---|---|
| `interbrand-2000-2019.csv` | `date,name,category,value` (US$ m), Interbrand Best Global Brands 2000–2019 — the extract behind the D3 gallery [“Bar chart race”](https://observablehq.com/@d3/bar-chart-race) (`category-brands.csv`); copied unchanged from `_examples/d3_collections/Interbrands race with scrubber/files/category-brands-initial.csv`. 2000 = 75 brands, 2001–2019 = 100. |
| `interbrand-2020-2025.csv` | `year,rank,brand,value_bn,change` — the 2020–2025 rankings as published on [interbrand.com](https://interbrand.com/best-global-brands/global/) (2025 page + `/2020-report/` … `/2024-report/`), retrieved 2026‑09‑21. Value in US$ bn with one decimal as displayed; `change` = Interbrand's year‑on‑year change in % or `NEW`. |
| `brands.csv` | `name,sector,country` — one row per brand: Interbrand's sector (legacy category for 2000–2019 brands; prep fails if they differ), ISO 3166‑1 alpha‑2 home country (editorial: the brand's home / headquarters country). |
| `prep.ts` | `npm run prep -- global-brands-race` → `public/data/global-brands-race/brands-2000-2025.json` |

**Why not the legacy `interbrand.csv` / `data.csv`:** those copies are corrupt — 2020–2024 hold only 22 brands a
year, and Ford 2000–2019 is filed as a second “Citi” (category Automotive); several countries are wrong (Danone
→ Spain, DHL → US, ING → US). The gallery extract above is clean (no duplicates) and is used as is.

**Verification:** prep recomputes every published year‑on‑year change from our own two values and aborts on a
mismatch beyond rounding (±0.5 m for 2000–2019, ±0.05 bn for 2020–2025). All 569 published changes match,
including every 2019 → 2020 join. Renames are resolved through `ALIASES` (Salesforce.com → Salesforce, Banco
Santander → Santander, L'Oréal → L'Oréal Paris, NESCAFÉ → Nescafé, Mastercard → MasterCard). Interbrand marks
YouTube 2022 and MasterCard 2024 as `NEW` although both were ranked the year before — kept as one brand
(`NEW_BUT_RANKED`). GE Aerospace (2025) and Range Rover (2024) are new brands in Interbrand's list and stay
separate from GE and Land Rover.

**Precision:** 2000–2019 in whole US$ millions; 2020–2025 rounded to US$ 0.1 bn (stored as millions, e.g.
470.9 → 470900). The page says so.

**Logos:** not used. Simple Icons (CC0) covers only ~60 % of the top brands and misses Microsoft, Amazon, Mercedes,
Louis Vuitton, Disney, IBM and others — half the bars with a logo would read as an editorial choice. Flags
(already in the kit) mark the home country instead.

**Refresh (a new ranking, usually October):** append the new year's 100 rows to `interbrand-2020-2025.csv`
(rank order, value as shown, change or NEW), add new brands to `brands.csv`, add renames to `ALIASES`, bump
`TO` in `prep.ts`, `LATEST_YEAR` / `DATA_FILE` in `src/viz/global-brands-race/data.ts`, `period` / `retrieved` /
`updated` in `meta.ts`, run prep, add a CHANGELOG line.
