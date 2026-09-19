# data-raw / births-deaths-ua

| File | What |
|---|---|
| `births-deaths-1990-2025.csv` | Export of the sheet `birth_and_mortality` from `docs/data/birth_and-mortality/народжуваність та смертність в Укрїні.xlsx` (owner, 2026‑09‑19). Registered live births and deaths per year, persons. Compiled by Slovo i Dilo (22 Jan 2026) from State Statistics Service, Opendatabot and Ministry of Justice data. |
| `prep.ts` | `npm run prep -- births-deaths-ua` → `public/data/births-deaths-ua/births-deaths-1990-2025.json` |

**Corrections:** 2007 births = **472,700** (the sheet first had 427,700 — a digit swap; the source text and
infographic say 472.7 thousand; fixed by the owner in the xlsx on 2026‑09‑19).

**Coverage** (set in `prep.ts`, shown on the page as bands and a note):
1990–2013 — all of Ukraine · 2014–2021 — without the AR of Crimea, Sevastopol and the occupied parts of
Donetsk and Luhansk oblasts · 2022–2025 — without Crimea and the temporarily occupied territories (Ministry
of Justice). Changes across 2014 and 2022 are partly changes of coverage.

**Not used:** the Opendatabot sheet (2016–2026) holds different, partial-year figures — mixing it with the
annual series would distort the chart.

**Add a year:** append a row to the CSV (and to the xlsx), extend the last coverage segment in `prep.ts`,
run prep, bump `period.to`, `updated` and `DATA_FILE` in `meta.ts` / `data.ts`, add a CHANGELOG line.
