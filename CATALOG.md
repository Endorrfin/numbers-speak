# CATALOG — `numbers-speak`

> The authoritative content plan (the gallery's equivalent of a guide's `CURRICULUM.md`). `CLAUDE.md` §4 holds
> the TypeScript contract; `docs/PLAN.md` holds the reasoning. Keep all three in sync. Language: English, with
> Ukrainian titles next to the English ones.

## A. Taxonomy — tabs, facets, rules

| Tab (EN / UA) | id | Primary entries | Also shown here |
|---|---|---|---|
| All / Усі | — | every visible entry | — |
| New / Нові | `new` | entries whose `added` date is ≤ 30 days old | — |
| Ukraine / Україна | `ukraine` | 7 | — |
| World & people / Світ і люди | `world` | 7 | — |
| Economy & business / Економіка й бізнес | `economy` | 6 | `ua-companies-race` |
| Security & peace / Безпека й мир | `security` | 3 | `air-strikes` |
| Knowledge & life / Знання й життя | `knowledge` | 7 | — |

- **Facets:** chart kind · geography · origin (original / adapted) · language · free‑text search (EN + UA).
- **Rules:** exactly one primary tab (the first item of `rubrics`), any number of secondary ones; a new tab
  appears only with ≥ 4 primary entries or clear growth — otherwise use a tag; tab order follows the owner's
  priority.

## B. Entry contract (summary)

One folder per entry: `src/viz/<id>/meta.ts` (typed `VizMeta`) + `src/viz/<id>/index.tsx` (page body, default
export). `id` is kebab‑case and equals the folder name and the URL slug `#/v/<id>`.

| Status | Meaning | Visible in production |
|---|---|---|
| `draft` | work in progress | no (dev only) |
| `soon` | announced; the page shows a placeholder | yes, with a "Soon" badge |
| `published` | meets the Definition of Done (`PROJECT-BRIEF.md` §9) | yes |

`soon` and `published` entries need at least one https source with a retrieval date (`check:data`).

## C. The 30 entries

Legacy sources are the copies in `_examples/` (the originals stay in `src/D3`). **Status** = current state in
this repo (— = no manifest yet). **Origin:** *own* — own data and design; *adapted* — based on an external
example (licence notice required); *own data + gallery code* — own dataset on adapted code.

| # | id | Title EN / UA | Tabs | Chart | Component | Legacy source | Lang now | Origin | Wave | Status | Open items |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `gdp-by-country` | GDP by country, 2023 / ВВП країн, 2023 | `economy` | ranked-bar | `RankedBar` | `_examples/Contribution/Demographics/GDP by country` | EN | own | P2 ★ | soon (S1 placeholder) | World Bank named; fallback sample = land‑area values (Q8) |
| 2 | `gdp-ppp-per-capita` | GDP (PPP) per capita, 2023 / ВВП (ПКС) на душу населення, 2023 | `economy` | ranked-bar | `RankedBar` | `_examples/Contribution/Demographics/GDP (PPP) per capita 2023` | EN | own | P3a | — | "world share" 620 % (Q2) |
| 3 | `land-area` | Countries by land area / Країни за площею | `world` | ranked-bar | `RankedBar` | `_examples/Contribution/Demographics/land area` | EN | own | P3a | — | header typo `tatal area`; no source |
| 4 | `population-by-country` | Population by country / Населення країн | `world` | ranked-bar | `RankedBar` | `_examples/Contribution/Demographics/Population density` | EN | own | P3a | — | titled "density" (Q3) |
| 5 | `births-per-day` | Births per day by country / Народжуваність за добу | `world` | ranked-bar | `RankedBar` | `_examples/Contribution/Demographics/number births per day` | EN | own | P3a | — | no source |
| 6 | `crime-index` | Crime index by country, 2025 / Індекс злочинності, 2025 | `security` | ranked-bar | `RankedBar` | `_examples/Contribution/Demographics/Crime index` | EN | own | P3a | — | Haiti → Oceania (Q1); Numbeo? |
| 7 | `global-peace-index` | Global Peace Index, 2024 / Глобальний індекс миру, 2024 | `security` | ranked-bar | `RankedBar` | `_examples/Contribution/Demographics/GPI-162` | EN | own | P3a | — | page title "Crime Index…"; heading says 2024 — confirm source |
| 8 | `robotization` | Industrial robots per 10,000 workers (top 15) / Роботизація виробництва (топ‑15) | `economy` | ranked-bar | `RankedBar` | `_examples/Contribution/Robotization of production` | EN | own | P3a | — | IFR named, no link |
| 9 | `real-estate-world` | Most expensive real estate per m², 2025 / Найдорожча нерухомість за м², 2025 | `economy` | ranked-bar | `RankedBar` | `_examples/Contribution/real estate most expensive` | EN | own | P3a | — | page title "Robotization"; no source |
| 10 | `volunteers-by-region` | Registered volunteers by region, 2024 / Волонтери за областями, 2024 | `ukraine` | ranked-bar | `RankedBar` | `_examples/Contribution/volunteering/volunteers by regions` | EN | own | P3a | — | nested `<html>` titled "Bank Donations Chart"; no source |
| 11 | `air-strikes` | Russian air strikes on Ukraine, 2022–2025 / Російські повітряні удари по Україні, 2022–2025 | `ukraine` + `security` | combo | `ComboBarLine` | `_examples/Contribution/volunteering/air-attacks-on-ua` + `air-attacks-on-ukraine` | EN + UA | own | P3b | — | UN HRMMU named on both pages |
| 12 | `donations` | People donating per month, 2022–2024 / Кількість донатерів щомісяця, 2022–2024 | `ukraine` | line | `LineSeries` | `_examples/Contribution/volunteering/donations` | EN | own | P3b | — | Opendatabot link; nested `<html>` |
| 13 | `volunteers-growth` | Growth of registered volunteers / Динаміка кількості волонтерів | `ukraine` | line | `LineSeries` | `_examples/Contribution/volunteering/volunteers` | EN | own | P3b | — | Opendatabot link; page title "Average number of people donating…"; nested `<html>` |
| 14 | `real-estate-ua` | Real estate prices in 19 Ukrainian cities, 2021–2025 / Ціни на нерухомість у 19 містах України, 2021–2025 | `ukraine` | line | `LineSeries` | `_examples/Contribution/real estate cities of ua` | EN | own | P3b | — | no source |
| 15 | `global-brands-race` | Global brands race, 2000–2025 / Перегони глобальних брендів, 2000–2025 | `economy` | bar-race | `BarRace` | `_examples/d3_collections/Global brands race` + `Interbrands race with scrubber` + `2025 Global brands race` | EN | adapted (D3 gallery "Bar chart race") + own 2020–2025 data | P3c | — | 3 versions → 1 (D5); Interbrand link only in comments |
| 16 | `ua-companies-race` | Ukrainian companies revenue race / Перегони українських компаній за доходом | `ukraine` + `economy` | bar-race | `BarRace` | `_examples/d3_collections/ua_brands` | EN | own data + gallery code | P3c | — | revenue, sparse early years (Q5) |
| 17 | `ua-settlements-tree` | Settlements of Ukraine as a tree / Населені пункти України деревом | `ukraine` | tree | `HierarchyTree` | `_examples/d3_collections/Tree/ua_settlements_eng` + `ua_settlements_ua` | EN + UA | own data + gallery code | P4a | — | one bilingual dataset, per‑region chunks; prep script? (Q7) |
| 18 | `iceland-pyramid` | Iceland population pyramid / Піраміда населення Ісландії | `world` | pyramid | `Pyramid` | `_examples/Contribution/Demographics/population pyramid Iceland` | EN | adapted (bl.ocks‑era code, `px_client.js`) | P4b | — | no source on page; re‑implement on static data (A9) |
| 19 | `iceland-by-age` | Icelandic population by age, 1841–2019 / Населення Ісландії за віком, 1841–2019 | `world` | bar | `Bar` | `_examples/Contribution/Demographics/Icelandic population by age` | EN | adapted (D3 gallery, ISC) | P4b | — | merge with #18? (D5) |
| 20 | `us-population-by-age` | US population by age, 2015 / Населення США за віком, 2015 | `world` | donut | `Donut` | `_examples/d3_collections/Donut chart/population by age in US` | EN | adapted (D3 gallery "Donut chart") | P4b | — | — |
| 21 | `us-population-change` | US population change by state, 2010–2019 / Зміна населення штатів США, 2010–2019 | `world` | lollipop | `Lollipop` | `_examples/d3_collections/Lollipop Chart/population-change-usa` | EN | adapted? (Q9) | P4b | — | — |
| 22 | `chicago-homicides` | Chicago homicides: 100‑day moving average / Вбивства в Чикаго: 100‑денне ковзне середнє | `security` | line | `LineSeries` | `_examples/d3_collections/Moving average of homicides per day` | EN | adapted (D3 gallery "Moving average") | P4b | — | source only in the tab title |
| 23 | `letter-frequency` | Letter frequency with animated transitions / Частота літер з анімованими переходами | `knowledge` | bar | `Bar` | `_examples/d3_collections/Bar chart/alphabet transitions` | EN | adapted (D3 gallery "Bar chart transitions") | P4b | — | — |
| 24 | `walmart-growth` | Walmart's growth / Зростання Walmart | `economy` | map | `MapTimeline` | `_examples/d3_collections/Brands Growth/Walmart’s growth` | EN | adapted (D3 gallery "Walmart's growth") | P4c | — | bundle `us-atlas` from npm |
| 25 | `books` | Books by genre: pages and audio length / Книги за жанрами: сторінки й тривалість аудіо | `knowledge` | grouped-bar | `GroupedBar` | `_examples/Contribution/topic_books_eng` + `topic_books_ua` | EN + UA | own | P4c | — | the EN copy reads a Ukrainian CSV with different headers |
| 26 | `time-of-life` | Time of life by activity / Час життя за видами діяльності | `knowledge` | bar | `Bar` | `_examples/Contribution/topic_time/*` (4 folders) | EN + UA | own | P4c | — | 4 folders, 3 different datasets (Q4); simple + detailed → 1 (D5) |
| 27 | `alphabet-tree` | Ukrainian alphabet tree / Абетка деревом | `knowledge` | tree | `HierarchyTree` | `_examples/d3_collections/Tree/Alhpabet-ua tree` | UA data, EN UI | own data + gallery code | P4a | — | — |
| 28 | `design-patterns-tree` | Design patterns tree / Дерево патернів проєктування | `knowledge` | tree | `HierarchyTree` | `_examples/d3_collections/Tree/Patterns` | EN | own data + gallery code | P4a | — | cross‑link to the DPP guide |
| 29 | `flare-collapsible-tree` | Collapsible tree (flare) / Згортуване дерево (flare) | `knowledge` | tree | `HierarchyTree` | `_examples/d3_collections/Tree/Collapsible tree` | EN | adapted (D3 gallery "Collapsible tree") | P4a | — | — |
| 30 | `flare-indented-tree` | Indented tree (flare) / Дерево з відступами (flare) | `knowledge` | tree | `HierarchyTree` | `_examples/d3_collections/Tree/Indented tree` | EN | adapted (D3 gallery "Indented tree") | P4a | — | — |

## D. Build order

1. **S1 — scaffold + shell** (P1): catalog, tabs, filters, cards, visualization page skeleton; `gdp-by-country`
   announced as `soon`.
2. **S2 — golden visualization** (P2): `gdp-by-country` on `RankedBar` → `published`.
3. **S3a / S3b / S3c — MVP waves** (P3): 9 ranked bars · 4 Ukraine entries · 2 bar races → 16 entries.
4. **S4a / S4b / S4c — full migration** (P4): 5 trees · 6 one‑offs · map, books, time of life → 30 entries.
5. **S5 — customize & inform** (P5), **S6 — growth pipeline** (P6).

## E. Open data questions (block publication of the entries they affect)

| Q | Entry | Question |
|---|---|---|
| Q1 | `crime-index` | Haiti is in region "Oceania"; other datasets put the Americas under "America". Intended? |
| Q2 | `gdp-ppp-per-capita` | "world share" = 620 % for Singapore — is it "% of the world average"? |
| Q3 | `population-by-country` | Folder and titles say "density", the data is population. Show population, density or both? |
| Q4 | `time-of-life` | Four folders hold three different datasets (totals 74.0 / 74.5 / 74.1 years). Which is canonical, and what is the source? |
| Q5 | `ua-companies-race` | `value` is revenue (₴ M); 85 of 133 rows have no source; early years are sparse. Limit to 2020–2024 and call it a revenue race? |
| Q6 | most entries | 30 of 38 legacy pages show no source. Provide a URL + retrieval date per dataset (crime index: Numbeo? GPI: which edition?). |
| Q7 | `ua-settlements-tree` | Which script built `data_*.json` from the CSVs? Label `Population_2001` as "2001 census"? |
| Q8 | `gdp-by-country` | OK to drop the fallback sample (it holds land‑area values) and show an error state instead? |
| Q9 | `us-population-change` | Which example or source is the lollipop chart based on? |

## F. Totals

30 entries · 5 topic tabs · 11 chart kinds · by wave: P2 1 · P3 15 · P4 14 · by component: `RankedBar` 10 ·
`LineSeries` 4 · `BarRace` 2 · `HierarchyTree` 5 · others 9 · by origin: own 16 · own data + gallery code 4 ·
adapted 10.
