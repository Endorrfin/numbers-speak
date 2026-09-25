# data-raw / gdp-ppp-per-capita

| File | What |
|---|---|
| `wb-ppp-per-capita-2023.csv` · `-2024.csv` · `-2025.csv` | `iso2,iso3,year,value` — every World Bank economy with a value for that year, plus the "World" (WLD) row. |
| `prep.ts` | `npm run prep -- gdp-ppp-per-capita` → `public/data/gdp-ppp-per-capita/gdp-ppp-per-capita-<year>.json` |

## Source

World Bank, World Development Indicators — **GDP per capita, PPP (current international $)**, `NY.GDP.PCAP.PP.CD`
(PPPs from the International Comparison Program), WDI last updated **2026-07-13**, licence **CC BY 4.0**.
Read on 2026-09-24 from `https://api.worldbank.org/v2/country/all/indicator/NY.GDP.PCAP.PP.CD?format=json&date=2023:2025&per_page=20000`
through the in-app browser (the sandbox and the owner's VM egress block api.worldbank.org); economies = the WB
country list without aggregates (`region.id != "NA"`), ISO2 from that list. Files as saved:

```
3e3cab917bd336c5fe8cfc63dff28352f5675c647eeb29214f8fef82970c68ab  wb-ppp-per-capita-2023.csv   (197 economies + WLD)
be34e7b93d05d902867a1b33c932611d12e855acf6b8b64e43cda847f06d744b  wb-ppp-per-capita-2024.csv   (195 + WLD)
1d6cda64dca4a3f348b2ecd1197f49b05560b8e0f4888bd3111f06f46f37abe3  wb-ppp-per-capita-2025.csv   (185 + WLD)
```

Refresh (owner step while the sandbox is blocked): open that URL in a browser, keep economies with a value,
write the same four columns sorted by value, re-run prep.

## Decisions (S3-rb)

1. **Three years from one vintage** (owner: ok) — 2023 · 2024 · 2025 as year sub-tabs, default 2025. The legacy
   page (2023, WDI 16 Dec 2024, 181 rows) is **not** reused: its values come from an older vintage (Singapore
   141,553 then vs 144,728 now — ICP/PPP revisions), and mixing vintages across years would fake growth.
2. **World average = the WB "World" (WLD) aggregate** (owner: ok; CATALOG §E Q2) — 23,382 / 24,544 / 25,704.
   Not Σ ÷ Σ of the listed economies: the WB aggregate includes its own imputations for economies without
   data, so it does not move when coverage changes between years. The legacy "world share 620 %" implied
   ≈ 22,830 for 2023 (older vintage). "× world average" = value ÷ WLD, derived on the page.
3. **The legacy nominal column is dropped** — nominal GDP per capita is already an angle of `gdp-by-country`.
4. **No fill-ins**: an economy without a WB value for the year is absent from that year (no IMF/earlier-year
   substitutes, unlike `gdp-by-country`): 197 → 195 → 185 of the 217 WB economies. Taiwan is never in WB data.
5. Regions from ISO via `data-raw/_shared/m49.ts`; names and flags via `src/lib/countries.ts`.
