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

## C. The 31 entries

Legacy sources are the copies in `_examples/` (the originals stay in `src/D3`). **Status** = current state in
this repo (— = no manifest yet). **Origin:** *own* — own data and design; *adapted* — based on an external
example (licence notice required); *own data + gallery code* — own dataset on adapted code.

| # | id | Title EN / UA | Tabs | Chart | Component | Legacy source | Lang now | Origin | Wave | Status | Open items |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `gdp-by-country` | GDP by country, 2023 / ВВП країн, 2023 | `economy` | ranked-bar | `RankedBar` | `_examples/Contribution/Demographics/GDP by country` | EN | own | P2 ★ | **published** (S2) | refresh to 2024/2025 values is an owner step (`data-raw/gdp-by-country/README.md`) |
| 2 | `gdp-ppp-per-capita` | GDP (PPP) per capita, 2023 / ВВП (ПКС) на душу населення, 2023 | `economy` | ranked-bar | `RankedBar` | `_examples/Contribution/Demographics/GDP (PPP) per capita 2023` | EN | own | P3a | — | "world share" 620 % (Q2) |
| 3 | `land-area` | Countries by land area / Країни за площею | `world` | ranked-bar | `RankedBar` | `_examples/Contribution/Demographics/land area` | EN | own | P3a | — | header typo `tatal area`; no source |
| 4 | `population-by-country` | Population by country / Населення країн | `world` | ranked-bar | `RankedBar` | `_examples/Contribution/Demographics/Population density` | EN | own | P3a | — | titled "density" (Q3) |
| 5 | `births-deaths-per-day` | Born and died per day, 2026 / Народжуються й помирають щодня, 2026 | `world` + `ukraine` | ranked-bar | `Butterfly` (+ live world clock) | `_examples/Contribution/Demographics/number births per day` (xlsx: births + deaths sheets) | EN + UA | own | S3‑bdd (priority, out of wave; replaces births‑only `births-per-day`) | **published** (S3‑bdd) | UN WPP 2024 estimates via World Population Review — for Ukraine they differ from registered data (note + link to #31) |
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
| 31 | `births-deaths-ua` | Births and deaths in Ukraine, 1990–2025 / Народжуваність і смертність в Україні, 1990–2025 | `ukraine` | line | `YearChart` (5 angles: gap · deaths per birth · natural change · mirrored bars · index) | owner sheet `docs/data/birth_and-mortality` (Slovo i Dilo compilation) | EN + UA | own | S3‑bd (priority, out of wave) | **published** (S3‑bd) | primary series is a secondary compilation (State Statistics Service / Ministry of Justice publish no consolidated 1990–2025 table); coverage changes in 2014 and 2022 shown as bands + note |

## D. Build order

1. **S1 — scaffold + shell** (P1): catalog, tabs, filters, cards, visualization page skeleton; `gdp-by-country`
   announced as `soon`.
2. **S2 — golden visualization** (P2): `gdp-by-country` on `RankedBar` → `published`.
3. **S3a / S3b / S3c — MVP waves** (P3): 9 ranked bars · 4 Ukraine entries · 2 bar races → 16 entries.
4. **S4a / S4b / S4c — full migration** (P4): 5 trees · 6 one‑offs · map, books, time of life → 30 entries.
5. **S5 — customize & inform** (P5), **S6 — growth pipeline** (P6).

## E. Data questions — decisions (S2, 2026‑09‑18)

The owner delegated these decisions (S2). Rule applied throughout: **a number is published only with a named
source; anything derivable is derived at prep time; anything not verifiable is labelled or held back.**

| Q | Entry | Decision | Still blocks publication? |
|---|---|---|---|
| Q1 | `crime-index` | Regions are **derived from the ISO code (UN M49 continents, `data-raw/_shared/m49.ts`)**, never hand‑typed → Haiti = Americas. The same bug existed in the GDP data (11 Caribbean countries + Brunei in "Oceania") and is fixed there. | No |
| Q2 | `gdp-ppp-per-capita` | It is **% of the world average** (Singapore ≈ 6.2 × world). Recompute at prep time as `value / world average` and show it as "6.2 × world average"; do not ship the typed column. Confirm the world average figure against the WB `WLD` row when porting. | No (verify at port) |
| Q3 | `population-by-country` | **Population** (that is what the data holds); entry titled "Population by country". Density is a later metric toggle, derived by joining `land-area` on ISO codes — not a second hand‑typed dataset. | No |
| Q4 | `time-of-life` | No dataset is published without a source. If none is found, the entry ships **labelled "Illustrative estimate (author's calculation)"** with the method stated, using the 15‑activity / 74.5‑year set (2 of the 4 folders agree on it); the 17‑activity set becomes the "detailed" view only if its totals reconcile. | Yes — until a source or the illustrative label + method |
| Q5 | `ua-companies-race` | **Limit to 2020–2024** (23 companies every year — no sparse years that distort a race) and title it a **revenue race (₴ M)**. The 85 unsourced rows are checked against Opendatabot at port time; rows that cannot be verified are dropped, not guessed. | Yes — until verified |
| Q6 | most entries | Every entry gets its publisher's canonical https URL at port time; `retrieved` = the date of the legacy snapshot when data is ported as is, or the download date when refreshed. Working assumptions to confirm at port: crime index = Numbeo (2025), GPI = Institute for Economics & Peace, GPI 2024. | Per entry (`check:data` enforces a source) |
| Q7 | `ua-settlements-tree` | Label the column **"Population, 2001 census"**. The old script is not needed: a new `data-raw/ua-settlements-tree/prep.ts` builds one bilingual dataset from `ukr-25.csv` / `ua-25.csv`. | No |
| Q8 | `gdp-by-country` | **Done:** fallback sample dropped; a failed or malformed file shows an error state with "Try again" (never a wrong chart). | — |
| Q9 | `us-population-change` | Re‑implement on the chart kit (origin `original`, no third‑party code kept); data from the **US Census Bureau Vintage 2019 state estimates (NST‑EST2019)**, values verified at port. | No (verify at port) |

## F. Totals

31 entries · 5 topic tabs · 11 chart kinds · by wave: P2 1 · P3 14 · P4 14 · priority 2 (`births-deaths-ua`,
`births-deaths-per-day` — CHANGED (S3‑bdd): #5 moved out of P3a) ·
by component: `RankedBar` 9 · `Butterfly` 1 · `LineSeries` 4 · `BarRace` 2 · `HierarchyTree` 5 · `YearChart` 1 · others 9 ·
by origin: own 17 · own data + gallery code 4 · adapted 10.

`YearChart` (S3‑bd, `src/charts/renderYearChart.ts`) draws lines, gap fills, areas, bars and mirrored bars over
consecutive years from a declarative spec — the planned `LineSeries` entries (#12–#14, #22) should reuse it
rather than add a second line renderer.

`Butterfly` (S3‑bdd, `src/charts/renderButterfly.ts`) draws back‑to‑back bars of two quantities in one unit on a
shared scale, with tinted and outlined rows — reusable for any "A vs B per country" entry (e.g. imports vs
exports, a population pyramid by country).
