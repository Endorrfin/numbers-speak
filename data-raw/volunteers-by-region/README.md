# data-raw / volunteers-by-region

| File | What |
|---|---|
| `data_volunteers_by_regions.csv` | Export of Opendatabot's regional breakdown of the official volunteer registry (State Tax Service), owner-provided (2026-09-22). Region -> volunteer count, as of the article of 5 Dec 2024. |
| `prep.ts` | `npm run prep -- volunteers-by-region` -> `public/data/volunteers-by-region/volunteers-by-region-2024.json` |

**Correction (owner, 2026-09-22):** the CSV originally had "Zaporizka" twice (278 and 357). The 278 row is
**Zhytomyr Oblast**, mislabeled in the export — fixed in the CSV; `prep.ts` maps it to `zhytomyrska`.

**Kyiv:** the CSV's "Kyivska" row (2,529) combines Kyiv city and Kyiv Oblast. Opendatabot's article gives
them separately as of Nov 2024 — Kyiv city 1,600 (15.6%) and Kyiv Oblast 896 (8.6%), i.e. 2,496 combined,
close to but not exactly the CSV's 2,529 (different data cut/date). Kept combined here rather than split on
a guessed ratio; the page's id is `kyivska`, labelled "Kyiv city & Kyiv Oblast", with a note.

**AR of Crimea = 0:** not a data gap. The registry is run by Ukraine's State Tax Service and is unreachable
under occupation, so no one there can be officially registered. The page explains this rather than showing
a bare zero with no context.

**Not independently re-verified region by region:** only the top 3 (Kyiv, Kharkiv, Kyiv Oblast) are
individually confirmed against Opendatabot's published article; the other 21 + Crimea come from the owner's
CSV export as-is.

**Source:** Opendatabot — "Реєстр волонтерів виріс у 1,5 рази цьогоріч" (5 Dec 2024), regional breakdown.
https://opendatabot.ua/analytics/volunteers-2024
