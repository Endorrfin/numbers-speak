# data-raw / volunteers-growth

| File | What |
|---|---|
| `volunteers-2022-2025.csv` | Opendatabot's monthly count of registered volunteers (State Tax Service register), owner export (2026-09-22), Jan 2022 - Nov 2025. |
| `prep.ts` | `npm run prep -- volunteers-growth` -> `public/data/volunteers-growth/volunteers-2022-2025.json` |

**Supersedes** the earlier CSV (`data_number_of_volunteers.csv`, stopped at Nov 2024) - the owner supplied a
fresher export reaching Nov 2025, so the "can we show 2025?" open question from planning is resolved: yes.

**Seasonal overlay (year vs year, Jan-Dec):** only full calendar years can go on it - `renderYearChart` draws
a missing month as 0, not a gap. 2022, 2023 and 2024 are complete; 2025 is partial (through November) and is
shown on the timeline view instead. See `fullYears()` in `data.ts`.

**Source:** Opendatabot - "Реєстр волонтерів виріс у 1,5 рази цьогоріч" (5 Dec 2024) for methodology;
the owner's export carries the series forward to Nov 2025.
https://opendatabot.ua/analytics/volunteers-2024
