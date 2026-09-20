# data-raw / time-of-life

| File | What |
|---|---|
| `oecd-time-use-2026-total.csv` | Sheet **Total** of `OECD-time-use-database-updates.xlsx` (OECD Time Use Database, update of 30 Apr 2026) — average minutes per day, weekdays and weekends, 35 countries (30 OECD + 5 partner economies). |
| `oecd-time-use-2026-women.csv` | Sheet **Women**, same layout. |
| `oecd-time-use-2026-men.csv` | Sheet **Men**, same layout. |
| `prep.ts` | `npm run prep -- time-of-life` → `public/data/time-of-life/time-use-oecd-2026.json` |

**Source:** <https://www.oecd.org/en/data/datasets/time-use-database.html> → “A more detailed breakdown of daily
activities” → `https://www.oecd.org/content/dam/oecd/en/data/datasets/time-use-database/OECD-time-use-database-updates.xlsx`
(retrieved 2026‑09‑20 through a browser: the agent sandbox cannot reach oecd.org).

**Rows kept** (the rest are derived as residuals): header rows (Country, Survey year, Age of reference) and codes
1, 1.2, 1.3, 1.4, 2, 2.1, 2.2, 2.6, 3, 3.1, 3.2, 4, 4.1, 4.2, 4.3, 4.4, 5, T. Values rounded to 0.01 min; the empty
spacer column between the OECD members and the partner economies is dropped.

**Checksums** (sum of every numeric value from row 4 on, columns 3+): Total 136,496.61 · Men 135,224.85 ·
Women 137,727.50 — recomputed from the workbook and from these CSVs; they match.

**Split into 15 activities** (`prep.ts`): sleep 3.1 · eating 3.2 · personal care = 3 − 3.1 − 3.2 · commute 1.2 ·
study 1.3 + 1.4 · paid work = 1 − commute − study · housework 2.1 · shopping 2.2 · errands 2.6 ·
care & other unpaid = 2 − 2.1 − 2.2 − 2.6 · sports 4.1 · friends & events 4.2 + 4.3 · TV/radio 4.4 ·
other leisure = 4 − 4.1 − 4.2 − 4.3 − 4.4 · other = 5. Values not reported (“..”, “-”, “(see notes)”) are 0, so their
time stays in the residual of the same main category (e.g. Japan's household travel sits in care & other unpaid).

**Update:** download the new workbook, export the three sheets with the same rows, check the column order
(the `ISO` table in `prep.ts`), run prep, bump `release` / `DATA_FILE` and `updated`, add a CHANGELOG line.
