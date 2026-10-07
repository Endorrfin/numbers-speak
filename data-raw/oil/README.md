data-raw / oil

CHANGED (S3-oil, 2026-10-07). Entry #32 `oil` — five angles on four datasets. `npm run prep -- oil` →
`public/data/oil/*.json` (consumption · us-imports · china-imports · crude-trade-2025).

| File | What |
|---|---|
| `ei-2026-oil-consumption.csv` | EI Statistical Review 2026, variable `oilcons_kbd`: one row per area (name, ISO3), one column per year 1965–2025, kb/d to 0.1. Countries, the USSR (`SUN`, 1965–1984) and the EI aggregates (`T-…`, `O-…`, `WLD`). By `extract-ei.py`. |
| `ei-2026-crude-trade-2025.csv` | EI 2026 PDF, "Oil: Inter-area movements 2025 – crude trade" (page 45): from, to, million tonnes, dagger flag (`†` = less than 0.05 → 0.02) + the printed "Total imports" row. By `extract-ei-trade.py`, which fails unless every row and column adds up to its printed total. |
| `eia-crude-imports-annual.csv` | EIA, U.S. crude oil imports by country of origin, kb/d, annual (total 1910–2025, countries 1973–2025). By `extract-eia.py`. |
| `eia-crude-imports-monthly.csv` | The same, monthly, 2025–2026 (the page needs the partial year 2026). |
| `comtrade-china-crude.csv` | China's imports of HS 2709 by partner, 2024 and 2025: M49 code, ISO3, name, net weight (kg), CIF value (US$). By `extract-comtrade.py` from two UN Comtrade API responses. |
| `extract-*.py` | `extract-ei.py` (needs `openpyxl`), `extract-ei-trade.py` (`pymupdf`), `extract-eia.py` (`xlrd`), `extract-comtrade.py` (standard library). Usage in each file's docstring. |
| `prep.ts` | CSV → JSON with ISO2 codes, M49 regions and the cross-checks below. |

## Sources (not committed; sha256)

```
67fd2b7ea9a398c7b2ee228eb6254860734b515333eea463b7b7d2fd174ad416  Statistical Review of World Energy Narrow format.xlsx   (EI 2026, owner download, docs/data/Oil)
35bfcf5f73ed5a31e51d9e5ee49c725afd0bda7e94235e1c794dc84edb34782f  Statistical Review of World Energy.pdf                  (EI 2026, owner download)
d34f6a98236062a8516874e6c32a310686731cead741eb67713fee1dbb930cdf  statistical-review-of-world-energy.pdf                  (EI 2026 via KPMG Australia's mirror — same tables; used for the first audit)
b50e7cb2964e3a73b0ea63838a99d1775cca18545dd702c26083a4488f205d63  EI-Stats-Review-ALL-data.xlsx                           (EI **2025** edition — not used, see decision 1)
c72532f9491a6c5a181023cd18759ce25ff0d975286b8fba075478c2fe0182db  PET_MOVE_IMPCUS_A2_NUS_EPC0_IM0_MBBLPD_A.xls             (EIA annual, release 2026-09-30)
3be74246a1d6882ee792ae3e1ecf3e0cdfe6508f8fa5fca75e13403effd5b8f9  PET_MOVE_IMPCUS_A2_NUS_EPC0_IM0_MBBLPD_M.xls             (EIA monthly, release 2026-09-30)
a023d0b4d53de42b8c209c7e96ccd8443ca5d9c76945dadc0576fcbf85bb9460  comtrade China 2709 M 2024 (JSON response)
68a45c88cd3d2b1ecbc4f77e481f460ce71032c4e502d189640eef6d826a1633  comtrade China 2709 M 2025 (JSON response)
71d82bcde7bdae6c2eb57666efab780d237554fbeb1135034ddde472612ee469  Oil.xlsx                                                (owner's copy of the three Visual Capitalist tables)
```

- **Energy Institute**, *Statistical Review of World Energy 2026* (75th edition, 30 June 2026),
  https://www.energyinst.org/statistical-review/resources-and-data-downloads — energyinst.org answers 403 to the agent;
  the owner downloaded the files. Terms (PDF p. 85): "Publishers are welcome to quote from this Review provided that
  they attribute the source … for extensive reproduction of tables and/or charts, permission must first be obtained"
  (statisticalreview@energyinst.org). S&P Global data is restricted — none of it is used here (hydrogen, SAF prices,
  data centres only).
- **EIA**, U.S. Imports by Country of Origin, https://www.eia.gov/dnav/pet/pet_move_impcus_a2_nus_epc0_im0_mbblpd_a.htm
  — U.S. government work, public domain. Downloaded with curl on 2026-10-07.
- **UN Comtrade** public preview API, `https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=156&period=<year>&cmdCode=2709&flowCode=M`
  (one year per call) — the figures China's General Administration of Customs reports. Fetched 2026-10-07. The
  Comtrade usage agreement requires written permission for re-dissemination (comtrade@un.org); its re-dissemination
  policy allows "few tables or graphs" in publications and waives the fee for free visualizations. The page shows one
  table of China's partners for two years.

## How the Visual Capitalist tables were verified (`Oil.xlsx`)

All three (1–3 Sep 2025) cite the EI Statistical Review 2025 (data 2024):
- top 25 consumers: 25 of 25 rows equal the EI 2025 table "Oil: consumption in thousands of barrels per day" (value to
  0.1 million b/d and share);
- U.S. and China imports: every row equals the EI 2025 inter-area matrix (million tonnes) × one factor ≈ 20.05 kb/d per
  Mt (7.33 barrels a tonne ÷ 365.6), i.e. the EI's own kb/d table; U.S. totals 6,596 kb/d, China 11.1 M b/d.
- The EIA's own series agree with the EI's U.S. figures within 0.3 % (Canada 4,062 vs 4,072 in 2024). China's
  customs agree with the EI's named suppliers to 0.1 Mt — the EI builds on GACC — except that the EI moves the oil
  customs record as Malaysian into "Other Middle East" (its origin).

## Decisions

1. **One edition (2026) for every year.** The EI revises history in every edition: Ukraine's 2024 consumption is 206
   kb/d in the 2025 edition and 286 in 2026 (2020–2023 revised up too). The owner's `EI-Stats-Review-ALL-data.xlsx`
   turned out to be the 2025 edition (its contents sheet says so), so consumption comes from the 2026 narrow-format
   file and the 2025 trade matrix from the 2026 PDF (the 2026 workbook was not available).
2. **Countries only, aggregates out.** The EI lists 79 countries one by one (94.5 % of world consumption in 2025); the
   rest are in its "Other …" areas, which the page states. The world total is the EI's own (`WLD`).
3. **The USSR stays as one row 1965–1984** (`SU`, region Europe, no flag) — the EI starts Russia, Ukraine and the other
   successor states in 1985; Croatia, Slovenia and North Macedonia start in 1990.
4. **U.S. imports: EIA, by country of origin**, 1973 onwards (the first year with countries). Before 1993 the EIA
   itemises only its main sources (up to 335 kb/d unattributed) — shown as "not itemised by the EIA". The partial year
   is the average of its published months weighted by days (Jan–Jul 2026). Netherlands Antilles keeps the retired code
   `AN` (no flag).
5. **China imports: customs as recorded** (owner): "Malaysia" stays Malaysia; the page explains the relabelling
   (CGEP Columbia, Kpler) and shows the EI's "Other Middle East" figure next to it. Tonnes → barrels a day with the
   EI's factor (7.33 barrels a tonne) and the days of the year, marked ≈. Türkiye 2025 has a value but no weight (US$
   679) — left out of the volumes.
6. **Trade between areas** keeps the EI's million tonnes in the table; bars use ≈ kb/d like the rest of the page. Six
   colour groups per side (sector palette: five validated hues + the neutral for "other areas").

## Cross-checks in `prep.ts` (the prep stops on any failure)

- EIA monthly 2025, averaged by days, equals the EIA annual 2025 for the total and every country (±1.5 kb/d).
- China's customs vs the EI matrix for Russia, Saudi Arabia, Iraq, Kuwait, UAE, Canada (±2 % or 0.3 Mt).
- EIA 2025 imports from Canada vs the EI cell Canada → US × 7.33 ÷ 365 (±3 %; actual difference < 1 %).
- Every output file goes through the same parser the site uses (`src/viz/oil/data.ts`).

## Refresh

EIA: monthly (download both .xls, run `extract-eia.py`, prep). China: once a year when GACC's December data reach
Comtrade (add the year's response to `extract-comtrade.py`'s arguments). EI: every June/July — a new edition replaces
the whole consumption file and the trade table (never mix editions).
