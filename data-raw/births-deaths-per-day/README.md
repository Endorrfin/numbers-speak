# data-raw / births-deaths-per-day

| File | What |
|---|---|
| `births-per-day-2026.csv` | Sheet “Born each day in 2026” of the owner's workbook `_examples/Contribution/Demographics/number births per day/files/born each day in 2026.xlsx`, exported 2026‑09‑19: country, rank, births per day, births per hour, 2026 population. Source: [World Population Review — Births per day](https://worldpopulationreview.com/countries/births-per-day), figures derived from UN World Population Prospects 2024. |
| `deaths-per-day-2026.csv` | Sheet “Die Each day in 2026”, same workbook and basis: [World Population Review — Deaths per day](https://worldpopulationreview.com/countries/deaths-per-day). |
| `prep.ts` | `npm run prep -- births-deaths-per-day` → `public/data/births-deaths-per-day/per-day-2026.json` |

**What the numbers are:** UN model estimates for 2026 (annual births or deaths ÷ 365), not registrations.
For Ukraine the UN figure (663 births / 1,443 deaths per day) is higher than registered data (2025: 168.8k
births ≈ 462 per day) — the UN counts the whole territory within internationally recognised borders and
models what registration misses. The page says so and links to `births-deaths-ua`.

**Dropped:** ranks and per‑hour columns (derived on the page), the “Sign” column (`#VALUE!` in the xlsx);
flags come from the ISO code.

**Zero rows:** ten small territories (e.g. Vatican City, Tokelau) have 0 births per day after rounding —
they stay in the data; their “deaths per birth” is shown as “—”.

**Refresh:** export both sheets of the updated workbook to these CSVs (same columns), add any new name to
`ALIASES` in `prep.ts` if prep reports it, run prep, bump `YEAR` / `DATA_FILE` / `period` / `retrieved` /
`updated`, add a CHANGELOG line.
