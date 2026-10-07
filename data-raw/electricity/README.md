data-raw / electricity

CHANGED (S3-el, 2026-10-07). Entry #33 `electricity` — seven angles on five datasets. `npm run prep -- electricity` →
`public/data/electricity/*.json` (countries · world · race · ukraine · access).

| File | What |
|---|---|
| `ember-yearly.csv` | Ember Yearly Electricity Data, every “Country or economy” + World, 2000–2025: generation by nine fuels, total, demand (TWh), demand per person (MWh), CO2 intensity (gCO2/kWh), net imports (TWh). By `extract-ember.py`, which fails unless each year's fuels add up to its total (±0.5 %). |
| `ember-europe-ukraine.csv` | Ember Yearly Electricity Data **Europe** — the same columns for Ukraine, 1990–2022 (the European file starts in 1990, the global one in 2000). By `extract-ember.py`. |
| `wb-access.csv` | World Bank WDI API, 2000–2024, every economy and aggregate: `EG.ELC.ACCS.ZS` (access to electricity, % of population) and `SP.POP.TOTL`. By `extract-wb.py` (standard library; fetches the API itself). |
| `energoatom-2021.csv` | Typed from Energoatom's *Звіт про управління 2021*, p. 49 (“Планові та фактичні показники виробництва…”): generation and supply per plant, GWh, capacity factor; p. 48: generation of Ukraine's power system. `SUNPP_HYDRO` = Oleksandrivska HPP 31.500 + Tashlyk PSP 183.788 GWh, which the report counts inside South Ukraine NPP's 19,027. |
| `extract-*.py` | Usage in each file's docstring; standard library only, run with `python3 -I`. |
| `prep.ts` | CSV → JSON with ISO2 codes, M49 regions and the cross-checks below. |

## Sources (not committed; sha256)

```
259e1095ee8ffeaf0aff37ad557916ae1823a2da13312da50ba4cec6b4574c3b  yearly_full_release_long_format.csv          (Ember, downloaded 2026-10-07, 49 MB)
8fb5c15253adad8d3731932dc68a3a6c5dfe08238ca885cbbe0f39c516f5bff8  europe_yearly_full_release_long_format.csv   (Ember, downloaded 2026-10-07)
44092cb110a7c6a050057971244993dc918fb39a8b81dd309fdeb0049ac6417a  managezvit2021.pdf                           (Energoatom, owner download, docs/data/electricity)
18886a932ef58db0b14be911c6fdedceb4c37898598b212981eaccffb1208944  Енергоатом річний звіт 2021.pdf              (Energoatom, radioactive-waste report 2021 — not used: no output per plant; p. 6 repeats 13,835 MW)
0845cd015ddef643670c93d91334a21800eeecad0cf8d9c03d0326d2c823a26f  ukrstat 05_2024.htm                          (Ukrstat notice of 5 Dec 2024 — the reason quoted on the page)
```

Committed extracts: `ember-yearly.csv` d8e3fa43…, `ember-europe-ukraine.csv` 637dd7c9…, `wb-access.csv` 5ef4acb1…,
`energoatom-2021.csv` 96bde8d6….

- **Ember**, Yearly Electricity Data (global and Europe), https://ember-energy.org/data/yearly-electricity-data/ —
  CC BY 4.0 (“All content is released under a Creative Commons Attribution Licence”). Direct files:
  `https://storage.googleapis.com/emb-prod-bkt-publicdata/public-downloads/yearly_full_release_long_format.csv` and
  `…/europe_yearly_full_release_long_format.csv`. Ember updates them in place twice a month, so the download date is the
  version (the major annual release was 24 Apr 2026). Ember compiles EIA, Eurostat, the Energy Institute, the UN and
  national statistics.
- **World Bank**, WDI, `https://api.worldbank.org/v2/country/all/indicator/<id>?format=json&date=2000:2024` — CC BY 4.0;
  `lastupdated` 2026-07-13 for both indicators. Access figures come from the Tracking SDG 7 report (IEA, IRENA, UNSD,
  World Bank, WHO).
- **Energoatom** (НАЕК «Енергоатом»), Звіт про управління 2021, https://old.energoatom.com.ua/parts/pdf-file/managezvit2021.pdf
  (the site answers 403 to the agent; the owner downloaded it). Pages: 5 (six ZNPP units), 14 (15 units, 13,835 MW),
  48 (Ukraine 156,577 GWh, Energoatom 55.2 %), 49 (table per plant), 115 (VVER-1000 = 1,000 MW).
- **Why Ukraine stops in 2022** (the text on the page): Ukrstat postponed the energy balance for 2022–2023 (notice of
  5 Dec 2024, https://www.ukrstat.gov.ua/Noviny/kalendarx/2024/12/05_2024.htm) under the Law “Про захист інтересів суб’єктів
  подання звітності та інших документів у період дії воєнного стану або стану війни”: during martial law, and three
  months after it, official statistics whose quality cannot be ensured may not be published. Ukrenergo has not
  published generation by source since 24 Feb 2022 (DiXi Group, energy-map.info, dataset notes) — information on the
  grid is kept from the enemy while it strikes power plants. Ember's 2022 row is the last year with a full breakdown.

## Decisions

1. **Ember as the one source of the electricity figures** (owner, 2026-10-07). OWID's export in `docs/data/electricity`
   (total generation only) is an intermediary and is not used; it served as a cross-check (World 2025 31,772 TWh in
   OWID vs 31,734 in Ember's file of 7 Oct — Ember updated in between).
2. **Rankings on 2024, world totals on 2025** (owner). Ember has 2025 for 91 of 214 countries, 2024 for 196.
   A country whose latest year is 2022 or 2023 stays in the rankings with its year marked “*” (16 territories in 2023,
   Ukraine in 2022) — the gdp-by-country rule for older values. Older rows are left out (Western Sahara, last 2009).
   Lesotho and Niue have no generation in Ember (Lesotho imports, Ember shows its Muela hydro as 0) — not ranked.
3. **Ukraine** (owner): in the rankings with its last published year (2022), and the page says why newer figures are
   not published (above). Its own angle uses the European file from 1990; prep aborts if the two Ember files disagree
   for any year 2000–2022 by more than 1 %.
4. **Six colour groups** from Ember's nine fuels (the validated six-mark palette, `--c-power-*` = `--c-sector-*`):
   coal · gas, oil & other fossil · nuclear · hydro, bioenergy & other renewables · wind · solar. Ember's own
   aggregates (“Gas and Other Fossil”, “Hydro, Bioenergy and Other Renewables”) group them the same way.
5. **The race ends in 2025** only because no country missing from Ember's 2025 file could have entered the top 12
   (prep checks: a missing country's 2024 value × 1.5 must stay below the 12th 2025 value; otherwise the race ends in
   2024). The table of 2025 lists the 91 countries Ember has for that year — the page says so.
6. **Zaporizhzhia NPP**: 2021, the last full year before the occupation (4 Mar 2022): 36,114 GWh = 23.1 % of Ukraine's
   generation (156,577 GWh, the report's own total), 41.9 % of nuclear output; 6,000 of 13,835 MW = 43.4 % of nuclear
   capacity. Energoatom's nuclear output (86,206 GWh without its two hydro plants) matches Ember's 2021 nuclear
   (86.21 TWh) — prep checks within 1 %.
7. **Access**: the World Bank's own aggregates for the world (91.9 %, 2024) and Sub-Saharan Africa (55.1 %), not sums of
   countries; “people without” = (100 − share) × population of the same year and source. A country's latest year
   within five years of 2024 (marked when older).

## Owner steps

- Refresh: download the two Ember files (links above) into a scratch folder, run `python3 -I extract-ember.py <yearly>
  <europe>`, `python3 -I extract-wb.py`, update `EMBER_RETRIEVED` / `WB_UPDATED` in `prep.ts`, then `npm run prep --
  electricity`. When Ember's 2025 coverage grows, consider moving `RANK_YEAR` to 2025.
- When Ukraine publishes its energy balance again (after martial law), replace the 2022 cut-off on the page.
