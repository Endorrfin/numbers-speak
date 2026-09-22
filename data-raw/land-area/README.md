# data-raw / land-area

| File | What |
|---|---|
| `countries-by-area.csv` | `country,total_area_km2,land_area_km2` for 234 countries and territories — a plain re-export of the "Countries_ranked_by_area" sheet in the owner's workbook `_examples/Contribution/Demographics/land area/files/Lagest countries in the world.xlsx`, itself compiled by Worldometers. Replaces the legacy `_examples/.../land area/files/data.csv`, which only had a single, mistyped "tatal area" column and no separate land-area figure. |
| `prep.ts` | `npm run prep -- land-area` → `public/data/land-area/land-area.json` |

**What prep does:** names → ISO 3166-1 alpha-2 (Intl.DisplayNames + an alias table; an unmatched name
aborts); region derived from the code (UN M49, `data-raw/_shared/m49.ts`); values kept in km² as reported.

## Decisions

**1. Two metrics, not one.** The legacy page only had "total area" (land + inland water), mistyped in its
CSV header, and CATALOG's open item for this entry was "header typo `tatal area`; no source". The owner's
workbook has both **total area** and **land area** (total minus inland water, and — for Greenland — minus
its permanent ice sheet), so the page ships both as a `?metric=land|total` sub-tab (land is the default,
matching the entry's title) instead of carrying the ambiguous single figure forward.

**2. Borders: internationally recognized, not de facto control (owner decision).** Checked against
Wikipedia's "List of countries and dependencies by area" (2026-09-22): Ukraine's total area in that list is
603,550 km², with a footnote — *"Includes Crimea (26,945 km²) and other territories annexed by Russia but
internationally recognized as part of Ukraine."* Our source's Ukraine row (603,500 / land 579,320) is the
same figure to rounding, so **no change was needed** — it already reflects recognized borders, not the
government-controlled area. Russia's row (17,098,242 km², a figure that has been stable for decades) does
**not** include those same territories, and gets no equivalent footnote anywhere in the sources checked.
Both rows are marked `note: 'recognized-borders'`; the page explains the asymmetry once, in "About the
data", rather than writing a different note per row — the same "explained, not hidden" approach already
used for Crimea's 0 registered volunteers in `volunteers-by-region`.

Not revisited for this entry (kept as the source has them, each already close to how most public area
lists — UN Statistics Division included — treat it): Western Sahara as its own row, separate from Morocco
(non-self-governing territory); Taiwan as its own row (standard statistical practice, has its own ISO code);
Kosovo has no separate row (counted within Serbia, as Serbia does at the UN); Nagorno-Karabakh counted
within Azerbaijan; Kashmir counted within India/Pakistan's own totals. A deeper pass over all 234 rows for
every border dispute was judged out of scope for this release.

**3. Data quality: land area exceeding total area.** 27 of the 234 rows have `land_area_km2 >
total_area_km2` in the source — impossible by definition (total = land + water). 22 are ≤ 62 km² (e.g.
Guadeloupe −62, Qatar −24, Lesotho −5) — island-scale rounding noise, left unmarked; `nonLandShare()` in
`src/viz/land-area/data.ts` clamps any negative gap to 0, so they never produce a fabricated "water share".
Five are large enough to be a real definitional mismatch rather than rounding, and are kept + marked
`note: 'definition'` (not corrected — neither figure was independently re-verified):

| Country | Total (km²) | Land (km²) | Gap |
|---|---:|---:|---:|
| Norway | 323,802 | 365,268 | −41,466 (13 %) — likely Svalbard/Jan Mayen included in one figure, not the other |
| Israel | 20,770 | 21,640 | −870 |
| Burkina Faso | 272,967 | 273,600 | −633 |
| Afghanistan | 652,230 | 652,860 | −630 |
| Sierra Leone | 71,740 | 72,180 | −440 |

**4. Greenland's ice sheet.** Land area 410,450 km² vs total 2,166,086 km² (81 % gap) is the largest on the
list by far — and correct, not a bug: this source's "land area" for Greenland is its ice-free area; the
~1.76 million km² permanent ice sheet is excluded the way inland water is for every other country.
`note: 'ice-sheet'` says so on the page and in the tooltip.

**5. Holy See rounded to 0.** The source rounds area to whole km², which sends Vatican City's real area
(0.49 km², official infobox figure — no inland water, so land = total) to an invalid `0` — caught by
`npm run prep` on the first real run (`row 234: bad total_area_km2 "0"`). A literal 0 isn't a value to
keep and mark like the `definition` rows above (it fails validation outright, and reads as "no country
here"), so `prep.ts` replaces it with the cited figure via `AREA_OVERRIDE`, marked `note: 'corrected'`.
The override only fires when the source value is actually invalid, so a future re-export that fixes the
rounding is used as-is — `prep.ts` fails the build if `AREA_OVERRIDE` ever stops being needed, so a stale
override can't go unnoticed.

**6. World totals** (`totalWorld`, `landWorld`) are the sum of the 234 listed rows, not an independently
sourced figure for the whole Earth — the same convention `gdp-by-country` uses for 2024–2025 (sum of the
listed economies, not a reconciled external total).

**Not verified:** Worldometers is a secondary compiler (methodology not published in detail); replace with
UN Statistics Division or national-statistics figures when the owner can fetch them, the same open item
`gdp-by-country` and `global-brands-race` carry for their own secondary sources.

**Licence:** data terms follow Worldometers' own (not verified — see above); code MIT.
