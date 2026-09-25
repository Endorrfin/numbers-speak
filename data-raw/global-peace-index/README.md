# data-raw / global-peace-index

| File | What |
|---|---|
| `extract-gpi.py` | Report PDF → CSV with poppler's `pdftotext -layout` (stdlib Python, no other dependency). Reads the ranking table (PDF pages 12–13 = printed pp. 10–11) and the nine regional tables (PDF pages 17–27) and fails unless every one of the 163 countries is found in both with the same score and rank (one documented exception, below). |
| `gpi-2026-ranking.csv` | `rank,tied,country,score,rank_change,score_change,regional_rank` — names and numbers as printed; `rank_change` + = places up (more peaceful), − = down, 0 = "↔"; `score_change` from the regional tables (− = more peaceful). |
| `prep.ts` | `npm run prep -- global-peace-index` → `public/data/global-peace-index/gpi-2026.json` |

Re-extract (owner step, needs poppler — `brew install poppler`):
`python3 data-raw/global-peace-index/extract-gpi.py docs/data/Global-Peace-Index-2026-Report.pdf data-raw/global-peace-index/gpi-2026-ranking.csv`
(run with pdftotext 22.02.0 in S3‑rb).

## Source

**Institute for Economics & Peace (IEP)** — *Global Peace Index 2026: Identifying and measuring the factors that
drive peace*, Sydney, June 2026. Available from https://www.visionofhumanity.org/resources/ — PDF
https://www.visionofhumanity.org/wp-content/uploads/2026/06/Global-Peace-Index-2026-Report.pdf (125 pages,
11,640,675 bytes; owner download 2026-09-24, kept in `docs/data/`, not committed).

```
879c371e8d27e345c4909ebac7956e51a5729b65817ac30c0f41ba29725f79f3  Global-Peace-Index-2026-Report.pdf (IEP, not committed)
acb10105150669c2fcbd0d67fba6978669ff0ba72c868462093b0fd45b1228a4  gpi-2026-ranking.csv (163 rows)
```

**Terms** (https://www.visionofhumanity.org/terms/, read 2026-09-25): §9.5 — no republishing of IEP's services
"without the prior written permission" of IEP, except "materials … which are freely available for re-use";
§12.5 — IEP's maps "may be used for educational and non-commercial purposes, with appropriate acknowledgment of
IEP". The ranking table is part of the report's map spread (pp. 10–11). **Owner decision (S3‑rb): build without
writing to IEP**, on §12.5 — a non-commercial portfolio gallery, the report's own citation line on the page, a link
to the report. If IEP objects, remove the entry (its folder, data and CHANGELOG line).

## Decisions (S3‑rb)

1. **All 163 countries**, in the report's order (1 = most peaceful), with an order switch (`?order=least`); 15
   rows per page, region filter, table — the crime-index pattern.
2. **Ranks as printed**: tied countries (same three-decimal score) share a rank shown "=70"; the next rank skips
   (Jamaica / Serbia =70 → Argentina 72; Haiti / Nigeria =142 → Iran 144).
3. **Honduras** — the report disagrees with itself: both Cambodia and Honduras score 2.075; the ranking table
   prints 96 Cambodia · 97 Honduras (no "="), while the Latin America regional table (p. 22) and the text
   ("Honduras, ranked 96th globally") give 96. The ranking table is kept (it is the only table with every rank and
   its rank change is counted from 97); `regionalRank: 96` is stored and the page notes the conflict (*).
4. **Changes** are those the 2026 report prints: rank change on the map spread, score change in the regional
   tables. IEP recalculates past years with revised data, so they compare with the prior year *as recalculated*,
   not necessarily with the 2025 edition. Check: 99 countries with a worse score, 62 better, 2 unchanged — the
   executive summary's "99 deteriorated in peacefulness and 62 improved".
5. **Regions** are UN M49 continents from the ISO code (`data-raw/_shared/m49.ts`), like every ranking in the
   gallery — not IEP's nine regions (e.g. Russia is in Europe, Türkiye in Asia).
6. **Names → ISO 3166-1 alpha-2**: CLDR English names plus `ALIASES` in `prep.ts` ("The Gambia", "Kyrgyz
   Republic", "Republic of the Congo" = CG, "Democratic Republic of the Congo" = CD, "Palestine" = PS, …).
