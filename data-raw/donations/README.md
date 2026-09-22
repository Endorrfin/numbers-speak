# data-raw / donations

| File | What |
|---|---|
| `monobank-2022-2025.csv` | Monthly total raised via monobank donation jars, billion UAH, owner export (2026-09-22), Feb 2022 - Nov 2025. |
| `major-funds-2022-2025.csv` | Annual totals, billion UAH, for United24 / Come Back Alive / Serhiy Prytula Foundation, 2022-2024 plus the first 11 months of 2025 (row label `"11 місяців 2025"`, mapped to year `2025` in `prep.ts`). |
| `nova-poshta-2022-2024.csv` | Nova Poshta humanitarian logistics, annual: parcel count and tonnage, 2022-2024. |
| `legacy-donors-2022-2024.csv` | The average-number-of-people-donating-per-month series this page used to lead with. Stops Nov 2024 and can't be extended - kept for one context KPI only (its last point), not plotted. |
| `prep.ts` | `npm run prep -- donations` -> `public/data/donations/donations-2022-2025.json` |

**Re-scoped from a person-count metric to a money metric.** The catalog originally tracked "people donating
per month" (`legacy-donors-2022-2024.csv`), which stops at November 2024 with no way to extend it to
2025-2026 - per the owner, that alone makes the metric uninteresting to chart. The owner's newer export adds
a continuous monthly UAH total (monobank jars, through Nov 2025) that resolves this, plus two angles that
weren't available before: a three-fund comparison and Nova Poshta's humanitarian shipment volumes. The old
series survives only as a single context KPI (its final point, Nov 2024) - not as the page's primary series.

**Seasonal overlay (year vs year, Jan-Dec):** only full calendar years can go on it - `renderYearChart` draws
a missing month as 0, not a gap. 2023 and 2024 are complete; 2022 starts in February and 2025 stops in
November, so both stay on the timeline view only. See `fullYears()` in `data.ts`.

**Funds table, 2025 column:** `major-funds-2022-2025.csv` gives 2025 as 11 months, not a full year (row
label `"11 місяців 2025"`). `prep.ts` maps that row to year `2025` and records the partial month count
(`fundsPartialYear` / `fundsPartialMonths` in the JSON) so the page can label the column honestly instead of
implying a full year.

**Source:** Opendatabot analytics -
https://opendatabot.ua/analytics/donats-2025 (monobank monthly totals, methodology) and
https://opendatabot.ua/analytics/donates-in-war-2024 (major funds, Nova Poshta); the owner's exports carry
both forward to Nov 2025 / through 2025 respectively.
