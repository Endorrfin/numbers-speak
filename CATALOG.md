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
| 1 | `gdp-by-country` | GDP by country, 2023–2025 / ВВП країн, 2023–2025 | `economy` | ranked-bar | `RankedBar` | `_examples/Contribution/Demographics/GDP by country` | EN | own | P2 ★ | **published** (S2; 2024–2025 + per capita S3‑gdp) | sub‑tabs GDP · GDP per capita × year (`?metric=per-capita&year=2024`); WB WDI July 2026 via Worldometers; IMF/UN/earlier‑year values marked * |
| 2 | `gdp-ppp-per-capita` | GDP (PPP) per capita, 2023 / ВВП (ПКС) на душу населення, 2023 | `economy` | ranked-bar | `RankedBar` | `_examples/Contribution/Demographics/GDP (PPP) per capita 2023` | EN | own | P3a | — | "world share" 620 % (Q2) |
| 3 | `land-area` | Land area by country / Площа країн світу | `world` | ranked-bar | `RankedBar` | `_examples/Contribution/Demographics/land area` | EN + UA | own | session 2026-09-22 | **published** (session 2026-09-22) | two metrics (total + land, `?metric=`), regional-share strip, "by non-land share" sort (land only); borders = internationally recognized (Ukraine incl. Crimea + Russian-occupied territories, Russia excl. — both marked *, see `data-raw/land-area/README.md`); 5 rows marked `definition` (source land area > total area, kept not corrected); Greenland marked `ice-sheet`; Worldometers not independently verified |
| 4 | `population-by-country` | Population by country / Населення країн | `world` | ranked-bar | `RankedBar` | `_examples/Contribution/Demographics/Population density` | EN | own | P3a | — | titled "density" (Q3) |
| 5 | `births-deaths-per-day` | Born and died per day, 2026 / Народжуються й помирають щодня, 2026 | `world` + `ukraine` | butterfly | `Butterfly` (+ live world clock, region chips, “deaths > births” filter, 3 sort keys) | `_examples/Contribution/Demographics/number births per day` (xlsx: births + deaths sheets) | EN + UA | own | S3‑bdd (priority, out of wave; replaces births‑only `births-per-day`) | **published** (S3‑bdd) | UN WPP 2024 estimates via World Population Review — for Ukraine they differ from registered data (note + link to #31) |
| 6 | `crime-index` | Crime index by country, 2025 / Індекс злочинності, 2025 | `security` | ranked-bar | `RankedBar` | `_examples/Contribution/Demographics/Crime index` | EN | own | P3a | — | Haiti → Oceania (Q1); Numbeo? |
| 7 | `global-peace-index` | Global Peace Index, 2024 / Глобальний індекс миру, 2024 | `security` | ranked-bar | `RankedBar` | `_examples/Contribution/Demographics/GPI-162` | EN | own | P3a | — | page title "Crime Index…"; heading says 2024 — confirm source |
| 8 | `robotization` | Industrial robots per 10,000 workers (top 15) / Роботизація виробництва (топ‑15) | `economy` | ranked-bar | `RankedBar` | `_examples/Contribution/Robotization of production` | EN | own | P3a | — | IFR named, no link |
| 9 | `real-estate-world` | Most expensive real estate per m², 2025 / Найдорожча нерухомість за м², 2025 | `economy` | ranked-bar | `RankedBar` | `_examples/Contribution/real estate most expensive` | EN | own | P3a | — | page title "Robotization"; no source |
| 10 | `volunteers-by-region` | Registered volunteers by region, 2024 / Волонтери за областями, 2024 | `ukraine` | ranked-bar | `RankedBar` | `_examples/Contribution/volunteering/volunteers by regions` | EN + UA | own | S3-cd | **published** (S3-cd) | owner-corrected CSV (Zhytomyr mislabelled as a Zaporizka duplicate); Kyiv city + oblast kept combined (source reports them separately but this export doesn't split them — noted on page); AR of Crimea = 0, explained on page (registry unreachable under occupation), not hidden |
| 11 | `air-attacks-on-ukraine` (was `air-strikes`) | Russian missile and drone attacks on Ukraine, 2022–2026 / Російські ракетні й дронові атаки на Україну, 2022–2026 | `ukraine` + `security` (tag `war`) | bar | `TimeSeries` (day · week · month buckets, stacked panels, textures, gapped lines) + `StackedRows` + `CalendarHeatmap` (new, S3‑aa3 — Monday‑start day grid, quantile shading); 6 angles: launched & stopped · missiles by class + model ranking · interception rate · largest attacks · civilians (HRMMU) · calendar heatmap of daily launches | `_examples/Contribution/volunteering/air-attacks-on-ua` + `air-attacks-on-ukraine` (legacy data replaced) | EN + UA | own | S3‑aa (priority, out of wave) | **published** (S3‑aa) | Air Force reports via Kaggle (P. Ivaniuk, CC BY‑NC‑SA 4.0 → derived JSON under the same licence); national reports only; long-range weapons only; from 10 Aug 2026 launch counts withheld for some missiles; HRMMU weapon breakdown only 2025 + 2026 (monthly sum); legacy casualty lines were all-weapon totals — dropped |
| 12 | `donations` | Wartime donations, 2022–2025 / Пожертви воєнного часу, 2022–2025 | `ukraine` | line | `TimeSeries` + `YearChart` (timeline/seasonal sub-tabs) + 2 reference tables | `_examples/Contribution/volunteering/donations` | EN + UA | own | S3-cd | **published** (S3-cd) | re-scoped from the person-count metric (stopped Nov 2024, unextendable) to monobank monthly UAH totals (owner export to Nov 2025) + major-funds and Nova Poshta logistics angles unlocked by owner's new files; old metric kept as one context KPI only |
| 13 | `volunteers-growth` | Growth of registered volunteers, 2022–2025 / Динаміка кількості волонтерів, 2022–2025 | `ukraine` | line | `TimeSeries` + `YearChart` (timeline/seasonal sub-tabs) | `_examples/Contribution/volunteering/volunteers` | EN + UA | own | S3-cd | **published** (S3-cd) | extended to Nov 2025 via owner-supplied export (was stuck at Nov 2024); seasonal overlay limited to full calendar years (2022–2024) |
| 14 | `real-estate-ua` | Real estate prices in 19 Ukrainian cities, 2021–2025 / Ціни на нерухомість у 19 містах України, 2021–2025 | `ukraine` | line | `LineSeries` | `_examples/Contribution/real estate cities of ua` | EN | own | P3b | — | no source |
| 15 | `global-brands-race` | Global brands race, 2000–2025 / Перегони глобальних брендів, 2000–2025 | `economy` | bar-race | `BarRace` (new) + `Strip` (share by sector group) | `_examples/d3_collections/Global brands race` + `Interbrands race with scrubber` + `2025 Global brands race` | EN + UA | adapted (D3 gallery "Bar chart race", ISC) + Interbrand data | S3‑br (P3c) | **published** (S3‑br) | 2000–2019 from the gallery's Interbrand extract; 2020–2025 transcribed from interbrand.com and cross‑checked against every published YoY change; 22 Interbrand sectors → 6 colour groups; flags, no logos (see CLAUDE.md §14 S3‑br) |
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
| 26 | `time-of-life` | Human life in numbers / Людське життя в цифрах | `knowledge` | waffle | `Waffle` + `Strip` (new) · `RankedBar` · `Butterfly` (6 angles: weeks · day · ranking · needs/duties/free · countries · women vs men) | `_examples/Contribution/topic_time/*` (4 folders) — data **replaced** by the OECD Time Use Database | EN + UA | own | S3‑tl (priority, out of wave) | **published** (S3‑tl) | legacy sets (74–74.5 y, overlapping categories, no source) dropped (Q4); OECD surveys cover ages 15–64 → the page scales one day to 50 years; Ukraine not in the database |
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
| Q4 | `time-of-life` | **Superseded (S3‑tl, owner):** the legacy sets are not used (unsourced, categories overlap — sickness overlaps sleep, smoking covers smokers only — so no honest part‑to‑whole). The entry is rebuilt from the **OECD Time Use Database** (minutes per average day, 15 mutually exclusive activities, sums to 1,440) scaled to the 50 years from 15 to 64. | No |
| Q5 | `ua-companies-race` | **Limit to 2020–2024** (23 companies every year — no sparse years that distort a race) and title it a **revenue race (₴ M)**. The 85 unsourced rows are checked against Opendatabot at port time; rows that cannot be verified are dropped, not guessed. | Yes — until verified |
| Q6 | most entries | Every entry gets its publisher's canonical https URL at port time; `retrieved` = the date of the legacy snapshot when data is ported as is, or the download date when refreshed. Working assumptions to confirm at port: crime index = Numbeo (2025), GPI = Institute for Economics & Peace, GPI 2024. | Per entry (`check:data` enforces a source) |
| Q7 | `ua-settlements-tree` | Label the column **"Population, 2001 census"**. The old script is not needed: a new `data-raw/ua-settlements-tree/prep.ts` builds one bilingual dataset from `ukr-25.csv` / `ua-25.csv`. | No |
| Q8 | `gdp-by-country` | **Done:** fallback sample dropped; a failed or malformed file shows an error state with "Try again" (never a wrong chart). | — |
| Q9 | `us-population-change` | Re‑implement on the chart kit (origin `original`, no third‑party code kept); data from the **US Census Bureau Vintage 2019 state estimates (NST‑EST2019)**, values verified at port. | No (verify at port) |

## F. Totals

31 entries · 5 topic tabs · 12 chart kinds · by wave: P2 1 · P3 14 · P4 13 · priority 3 (`births-deaths-ua`, `time-of-life`,
`births-deaths-per-day` — CHANGED (S3‑bdd): #5 moved out of P3a) ·
by component: `RankedBar` 9 · `Butterfly` 1 · `LineSeries` 4 · `BarRace` 2 · `HierarchyTree` 5 · `YearChart` 1 · `Waffle` 1 (CHANGED (S3‑tl), was `Bar`) · others 8 ·
by origin: own 17 · own data + gallery code 4 · adapted 10.

`YearChart` (S3‑bd, `src/charts/renderYearChart.ts`) draws lines, gap fills, areas, bars and mirrored bars over
consecutive years from a declarative spec — the planned `LineSeries` entries (#12–#14, #22) should reuse it
rather than add a second line renderer.

`Butterfly` (S3‑bdd, `src/charts/renderButterfly.ts`) draws back‑to‑back bars of two quantities in one unit on a
shared scale, with tinted and outlined rows — reusable for any "A vs B per country" entry (e.g. imports vs
exports, a population pyramid by country).

CHANGED (S3‑tl): `Waffle` (`src/charts/renderWaffle.ts`) draws a unit grid — N cells per row, blocks laid end to
end, direct labels beside the grid on wide screens — and `Strip` (`src/charts/renderStrip.ts`) one 100 % bar cut
into parts with labels below. Both fit any "whole split into parts" entry (a budget, a day, a population).
