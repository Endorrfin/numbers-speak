# data-raw / robotization

| File | What |
|---|---|
| `ifr-robot-density-2024.csv` | `rank,economy_as_published,iso2,with_iso2,robots_per_10000` — the 22 economies of IFR's chart in IFR's order, plus the World row. Transcribed by hand from the chart image. |
| `prep.ts` | `npm run prep -- robotization` → `public/data/robotization/robot-density-2024.json` |

```
ec696068a387d8bef7398d6f3b26347c327d056a9816fdd5982f66f8303a6795  ifr-robot-density-2024.csv
53bef312957b80a7093da1d2fdd96e2b34afd3f83f22bd253e74a80fc83f7dfd  Graph_robot_density_by_country_worldwide_2024.jpg (IFR, 71,630 bytes, not committed)
```

## Source

International Federation of Robotics, press release **"Robot Density Surges in Europe, Asia, and Americas"**,
Frankfurt, 8 Apr 2026 — World Robotics 2025, data for 2024:
https://ifr.org/ifr-press-releases/news/robot-density-surges-in-europe-asia-and-americas, and its chart
https://ifr.org/downloads/press_docs/Graph_robot_density_by_country_worldwide_2024.jpg (read 2026-09-24 through the
in-app browser). Values 1–10, Canada (241), China (166) and the world (132) are also stated in the release text
and match; values 11–22 come from the chart only.

**Edition check (2026-09-24):** World Robotics 2026 was released today (press release "Five Million Robots now
Operate in Factories Globally") with installations and stock for 2025, but no robot density; IFR publishes density
separately months later. WR 2025 is therefore the latest density edition. Refresh when IFR's next density release
appears.

**Terms:** World Robotics Terms of Usage (VDMA Verlag, 6 Jun 2022, §5(2) non-scientific use — owner's copy
`docs/data/vdma_500_worldrobot.pdf`): "Reprint of single figures … generally allowed", "full tables … generally
prohibited", source to be credited. This entry reuses one publicly released chart with credit and links; nothing
from the licensed report.

## Decisions (S3-rb)

1. **Top 15** (owner), from the 22 published economies — the true world ranks 1–15 (IFR: China "22nd worldwide").
   All 22 rows are kept in the JSON so China's position can be stated from data, not typed.
2. **Belgium and Luxembourg = one row** (owner): IFR reports them jointly; `code: "BE"` (flag, region) +
   `with: "LU"`, labelled "Belgium & Luxembourg" and marked *.
3. **"× world average"** (owner) = value ÷ IFR's world figure 132, derived on the page.
4. IFR's "Chinese Taipei" = `TW` (name from `Intl.DisplayNames`: Taiwan); "Rep. of Korea" = `KR`.
5. The legacy page (15 rows, WR 2024 figures for 2023, "Germary"/"Sweets" typos, Mexico in, the Netherlands and
   Austria out) is not reused.
