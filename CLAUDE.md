# CLAUDE.md — `numbers-speak`

> **Working guide and source of truth for every session in this repo. Read this file fully before starting
> any session.** Update the *Status / progress log* (§14) at the end of each session.
> Cross‑guide rules: `../_standard/GUIDE-AUTHORING-STANDARD.md` (Tier 1, adapted for a visualization gallery —
> see §2). Upstream commission: `PROJECT-BRIEF.md`. Content plan: `CATALOG.md`. Reasoning: `docs/PLAN.md`.

## 1. Mission
**Numbers Speak / Цифри говорять** — a curated, interactive, bilingual (EN/UA) gallery of D3 data
visualizations about Ukraine and the world. Every entry can be viewed, configured, shared by URL and traced
to its sources. Quality bar: the Definition of Done in `PROJECT-BRIEF.md` §9, the architecture of
`../database guide` / `../english-guide`.

## 2. Stack & key decisions (with why)
- **Vite 8 + React 19 + TypeScript 6 (strict) + D3 7.9 (npm).** Same toolchain as the guides; D3 from npm so
  there are no CDN calls and the code is typed (`@types/d3`).
- **React owns layout and controls; D3 owns everything inside one `<svg>`.** Chart renderers are pure
  functions `render(svg, rows, options) → cleanup` (from S2), called from `useEffect`.
- **No router library** — `src/lib/hashRouter.ts`: `#/` · `#/t/<tab>` · `#/v/<id>` · `#/about`, with a query
  string for filters and chart settings. Hash routing + `vite base: './'` = works under any Pages sub‑path.
- **Catalog = data.** One folder per visualization (`src/viz/<id>/meta.ts` + `index.tsx`).
  `scripts/gen-catalog.ts` writes `src/catalog/catalog.generated.ts` (eager manifests + lazy page loaders);
  `check:catalog` fails when it is stale or when a `published` entry has no CHANGELOG line that links
  `#/v/<id>` (S3‑cl). The shell never imports a page body eagerly.
- **Card previews are data too (S3‑th).** `src/viz/<id>/preview.ts` = pure `preview(dataset) → CardPreview`
  (contract + validator `src/catalog/preview.ts`, helpers `previewKit.ts`), run at build time by
  `scripts/gen-previews.ts` into `src/catalog/previews.generated.json` (committed; numbers + format ids only,
  text formatted at render time, so the file does not depend on the build machine's ICU). `check:catalog`
  fails when it is stale, when a published entry has no preview, or over 12 kB gzip (now 3.4 kB). Rows are
  chosen by rank (top N / extremes), never by a country code — a test rejects `'UA'`‑style literals in
  `preview.ts`; ≤ 3 flags per card. No preview → the card falls back to `ChartGlyph`.
- **Bilingual at the data layer:** `Localized {en, uk}` everywhere; `check:data` rejects empty strings.
- **Anonymous page counts (S3‑an) — the one runtime third party.** `src/lib/analytics.ts` (own client, not
  GoatCounter's count.js — that counts `location.pathname`, has no DNT/GPC check, logs warnings, can `alert()`):
  `App` calls `trackPageview(path)` in an effect keyed on the router **path** (a query‑only change is never a
  page), the request goes at idle time (`requestIdleCallback`, else a 1 s timeout; waits out a prerender) as one
  `sendBeacon` POST to `GOATCOUNTER_COUNT_URL` (`lib/links.ts`, site code `numbers-speak`, public), a detached
  pixel only if the beacon is not queued; no retries, every failure silent. Sent: `p` (`/#/`, `/#/t/<tab>`,
  `/#/v/<id>`, `/#/about`, `/#/404` — unknown id or a draft outside dev = 404), `t` (EN title), `r` (external
  referrer, first view only), `s` (screen width), `rnd`; never `q`. Not counted: dev, any host but `COUNT_HOSTS`
  (`endorrfin.github.io`, https — so localhost, LAN, forks and previews never count), `navigator.webdriver`,
  `headless`/`jsdom` UA, DNT, GPC, the owner flag `#/about?no-count=1` (`=0` clears; About shows a line only in
  that browser). Stays in the initial chunk (≈ 0.85 kB gzip): a lazy `analytics-*.js` chunk could be ad‑blocked →
  `vite:preloadError` → `chunkReload` would reload the visitor's page.
- **Deviation from the guides' Tier‑1 content model:** no `Section → Module → Topic → Block`; the unit is a
  visualization entry (`VizMeta`). Candidate for a "Tier 3 — Visualization gallery" section in `_standard`
  (phase P6).

## 3. Repo layout
```
src/
  main.tsx · App.tsx · vite-env.d.ts
  catalog/     types.ts (VizMeta contract) · rubrics.ts (tabs + facet labels) · index.ts (lookups)
               filter.ts (pure filtering, unit‑tested) · catalog.generated.ts (GENERATED)
               preview.ts (CardPreview contract + validator) · previewKit.ts (build‑time helpers) ·
               previews.ts (lookup) · previews.generated.json (GENERATED, S3‑th)
  viz/<id>/    meta.ts (manifest) · index.tsx (page body, default export) · data.ts (types, parser,
               validateDataFile) · state.ts (URL state ↔ params) · preview.ts (card preview, S3‑th)
  charts/      renderRankedBar.ts (pure renderer) · RankedBar.tsx (wrapper) · renderYearChart.ts ·
               YearChart.tsx (S3‑bd) ·
               renderButterfly.ts · Butterfly.tsx (S3‑bdd) · renderWaffle.ts · Waffle.tsx · renderStrip.ts · Strip.tsx ·
               tooltip.ts (S3‑tl) · renderBarRace.ts · BarRace.tsx (S3‑br) · renderTimeSeries.ts · TimeSeries.tsx ·
               renderStackedRows.ts · StackedRows.tsx (S3‑aa) · hooks.ts · palette.ts
  components/  layout/ (TopBar, Footer) · catalog/ (CatalogPage, FilterBar, VizCard, CardPreview + previewFormat — S3‑th)
               viz/ (VizPage, AboutData) · pages/ (AboutPage, NotFound) · AppStateProvider.tsx
  i18n/        lang.ts · LangProvider.tsx · ui.ts
  lib/         hashRouter.ts · appState.ts · format.ts · utils.ts · countries.ts (ISO → name, flag URL) ·
               regions.ts (M49 enum) · dataset.ts (validators) · useDataset.ts · paginate.ts ·
               analytics.ts (GoatCounter page counts, S3‑an) · links.ts (external URLs + counter endpoint)
  theme/       tokens.css · global.css · components.css
public/        favicon.svg · .nojekyll · data/<id>/*.json · flags/ (GENERATED by sync:flags, gitignored) ·
               og/<id>.webp (OG share images, S5 — gallery cards use data previews, S3‑th)
data-raw/      <id>/ raw files + prep.ts + README.md · _shared/m49.ts (committed, not deployed)
scripts/       gen-catalog.ts · gen-previews.ts (S3‑th) · check-catalog.ts · check-data.ts · prep.ts · sync-flags.ts · run-tests.ts ·
               test-*.ts (incl. jsdom render tests) · smoke.ts · css-stub-hooks.mjs ·
               lib/ (viz-folders.ts · changelog.ts — the CHANGELOG check, S3‑cl · previews.ts — build/round/budget, S3‑th)
_examples/     legacy D3 pages being ported (gitignored — never committed)
.github/       workflows/deploy.yml · dependabot.yml
```

## 4. Content / data model (the contract)
`src/catalog/types.ts` is authoritative. Summary:
- `VizMeta`: `id` (kebab = folder = slug) · `title` / `subtitle` / `description` (`Localized`) ·
  `rubrics` (non‑empty; first = primary tab) · `chart` (`ChartKind`) · `geo` · `period?` · `tags` ·
  `languages` (languages the legacy data/labels exist in) · `sources[]` (`title`, https `url`, `retrieved`
  YYYY‑MM‑DD) · `origin` (`original` or `adapted` with title/url/licence) · `data[]` (files under
  `public/data/<id>/`) · `status` (`draft` | `soon` | `published`) · `added` / `updated` (YYYY‑MM‑DD) ·
  `d3Modules?` (for "How it's built").
- Visibility: `draft` only in dev; `soon` and `published` everywhere. "New" = `added` ≤ 30 days ago.
- Data rules: numbers as numbers, ISO 3166‑1 alpha‑2 codes (names via `Intl.DisplayNames` + short
  overrides in `lib/countries.ts`; flags from `flag-icons` copied to `public/flags/`), regions = UN M49 enum
  derived from the code at prep time, derived values (rank, share) computed at runtime, retrieval dates
  recorded. One parser per dataset (`data.ts`) runs in prep, `check:data` and the browser.

## 5. Catalog
31 entries in 5 tabs — see `CATALOG.md` (authoritative). Waves: P2 golden → P3 MVP (16) → P4 full (30);
`births-deaths-ua` (#31, S3‑bd) and `births-deaths-per-day` (#5, S3‑bdd) shipped out of wave as priorities.

## 6. Charts & interactivity
Chart kit: `RankedBar` (S2) · `YearChart` (S3‑bd: lines, gap fills, areas, bars, mirrored bars, period bands,
notes over consecutive years — the `LineSeries` slot) · `Butterfly` (S3‑bdd: back‑to‑back bars, one shared
scale, tinted/outlined rows) · `Waffle` (S3‑tl: unit grid, blocks end to end, direct labels) · `Strip` (S3‑tl:
one 100 % bar, labels below) · `BarRace` (S3‑br: one frame per call, keyed rows slide in/out from below the
last slot, fixed layout for the whole race, big year ticker; the page owns the clock — Play/Pause, year slider,
‹ › year steps) · `TimeSeries` (S3‑aa: calendar buckets — day · week · month · year — on a UTC time scale, stacked
panels sharing the time axis instead of a second y‑axis, stacked segments with an optional hatch texture, partial
buckets drawn lighter, bands per panel, lines with null gaps, one hover layer across panels) · `StackedRows` (S3‑aa:
ranked horizontal bars split into segments, date + sub‑label column) · `HierarchyTree` + one‑offs. Every chart:
responsive width (ResizeObserver; labels stack above bars < 560 px), `role="img"` + a label that states the
view, keyboard‑operable controls, a **table view** (the keyboard / screen‑reader path; tooltips are
pointer‑only, text‑only), `prefers-reduced-motion` → no transitions, all settings in the URL query with
defaults omitted. Renderer contract: `render(svg, rows, options) → cleanup`, joined by key, idempotent.

## 7. Theme / brand
Dark editorial by default, light mode available (`data-theme` on `<html>`, resolved before first paint in
`index.html`). Tokens in `theme/tokens.css`. Fonts: Fraunces (display) · Inter · JetBrains Mono. Chart
colours are CSS variables (`--c-region-*`, `--chart-*`) per theme. The region palette is validated
**all‑pairs** for colour‑vision deficiency in both themes (`charts/palette.ts`), so there is no separate
"colour‑blind" setting; text never wears a data colour.

## 8. Internationalization
EN first, UA second; technical terms stay English. `i18n/ui.ts` holds chrome strings; manifests hold entry
strings. Language persists in `localStorage` (`numbers-speak.lang`); theme in `numbers-speak.theme` (both are
written on first load, not only on a toggle). `numbers-speak.no-count` exists only in the owner's browser (S3‑an).

## 9. Deliverables
The site · bilingual `README.md` · this file · `CATALOG.md` · `PROJECT-BRIEF.md` · `docs/PLAN.md` ·
`CHANGELOG.md` (from the first published entry).

## 10. Conventions
- TypeScript strict + `noUnusedLocals/Parameters`, `verbatimModuleSyntax`, `erasableSyntaxOnly`; ESLint clean.
- Content only in `src/viz/*`, `public/data/*`, `data-raw/*`; never hand‑edit `catalog.generated.ts` or `dist/`.
- Mark in‑code edits `// CHANGED (SN):`.
- **User working rules:** (1) specific, not generic; (2) brief "why"; (3) describe the change + why before
  doing it; (4) `// CHANGED:` markers; (5) lint‑aware; (6) reliability/security/best practice first;
  (7) ask when unclear; (8) don't just agree — challenge.
- **Session summary:** (1) what was done; (2) branch (`sN-short-topic`, later `viz/<yyyy-mm>-<id>`) +
  commit title `📊 Numbers Speak SN: …` + description; (3) challenges/questions. The owner commits.

## 11. Deploy
`.github/workflows/deploy.yml`: on pull requests → typecheck → lint → check:catalog → check:data → test →
smoke → build (no deploy); on push to `main` → the same gates, then upload `dist` and deploy to Pages.
Current action majors (Node 20 is removed from GitHub‑hosted runners on 2026‑09‑23). Dependabot keeps npm and Actions
current. **Agent sessions never push.**

## 12. Gotchas / constraints
- Never `npm install` or run git in the live folder from the agent sandbox (native macOS binaries, `.git`
  locks — even a plain `git status` leaves `.git/index.lock` behind — S3‑aa3 and S3‑rb both did). Verify in a scratch copy;
  build into `dist-sN` if `unlink` is blocked. For a change list, rsync the repo *with* `.git` to a scratch folder
  and run `git status` there.
- Device shell: every call runs in its own PID namespace — a `nohup … &` job dies when the call returns. Run
  `npm ci` in the foreground (≈ 3 s with the npm cache; `timeout 170`).
- `_examples/` is gitignored — do not import from it at runtime; copy data through `data-raw/` prep scripts.
  `vite.config.ts` limits the dependency scan to `index.html` (legacy HTML there broke `npm run dev`).
- **Case-insensitive file systems** (the owner's Mac): two modules in one folder must never differ only in
  case (`RankedBar.tsx` + `rankedBar.ts` broke `tsc` on macOS while Linux CI passed). Renderers are named
  `render<Chart>.ts`; `scripts/test-filenames.ts` enforces the rule.
- The agent sandbox cannot reach api.worldbank.org; data refreshes are owner steps (see `data-raw/<id>/README.md`).
- `catalog.generated.ts` is committed (typecheck needs it); `predev`/`prebuild` regenerate it; `check:catalog`
  guards staleness. Adding a visualization = new folder + `npm run gen:catalog`.
- `previews.generated.json` likewise (S3‑th): regenerated automatically by `npm run prep` (after a successful
  prep), `verify` (first step, together with `gen:catalog`), `predev` and `prebuild` — commit it together with the
  data. CI runs the gates step by step (not `verify`), so a JSON left uncommitted still fails `check:catalog` there
  (only a hand edit of `public/data` committed without prep or verify can reach CI stale). It is imported by the
  shell, so it counts against the initial bundle (budget 12 kB gzip).
- Playwright cannot download a browser in the device VM; screenshots of a scratch build go through the cloud
  sandbox (tar the build into the gitignored `dist-*/`, stage it, serve it there).
- The SSR smoke runs under `tsx` (no Vite): keep `import.meta.env` access optional (`import.meta.env?.DEV`).
- The device bridge rejects very long commands (`spawn E2BIG`): write big files in parts (`cat >` then `cat >>`).
- `Intl` month abbreviations differ between ICU versions (`Sep` / `Sept` in en‑GB): tests match both.
- **Page counter in tests (S3‑an):** headless Chromium sends `HeadlessChrome` in its UA and
  `navigator.webdriver = true`, so the built site never counts under Playwright — an e2e check of the counter
  needs a desktop `userAgent` in the context + `webdriver` overridden to false, and the site served under
  `https://endorrfin.github.io/numbers-speak/` (Playwright `route` → `dist/`), since other hosts never count.
  A blocked or failed beacon still makes Chrome log `Failed to load resource: net::ERR_…` — the browser's
  network log, not a page error; the page itself raises nothing.
- A custom domain for the site = add it to `COUNT_HOSTS` (`lib/links.ts`), or nothing is counted there.

## 13. Session roadmap
S0 brief/catalog/plan → S1 scaffold + shell → S2 golden `gdp-by-country` + chart core → S3a/b/c MVP waves →
S4a/b/c full migration → S5 customize & share → S6 growth pipeline. Details: `docs/PLAN.md` §A7.

**S3‑th (2026‑09‑25):** gallery cards got data‑driven previews; S5 keeps Playwright webp only for OG images.
**S3‑an (2026‑09‑25):** anonymous page counts with GoatCounter — the one runtime third party (PROJECT‑BRIEF §4).

**Backlog (owner‑approved 2026‑09‑25, not scheduled yet):**
1. `RankedBar` optional baseline — bars from the scale minimum instead of 0 (GPI's scale is 1–5: page 1, scores
   1.16–1.54, looks flat from 0). An opt‑in option on the shared core + jsdom tests; ranked entries keep 0 unless
   they opt in. ≈ 1–1.5 h.
2. Phone pager — the page `<select>` ("1–15") is clipped at 390 px on every paged ranking (crime-index,
   global-peace-index, gdp-by-country, …): shorter labels or a wider control. ≈ 20 min.

## 14. Status / progress log
- **S0** (2026‑09‑17) — repo named `numbers-speak`; decisions D1–D10 accepted; `PROJECT-BRIEF.md`,
  `CATALOG.md`, this file and `docs/PLAN.md` v0.2 written; legacy D3 copy moved to `_examples/`.
  Branch `s0-brief`. Open: data questions Q1–Q9 (`CATALOG.md` §E), MVP date.
- **S1** (2026‑09‑18) — scaffold + catalog shell: Vite 8 / React 19 / TS 6 strict / D3 7.9 (+ `@types/d3`),
  hash router with query state, catalog generator (`gen:catalog` / `check:catalog`), `check:data`, tabs,
  filters, cards, visualization page (chart slot · share link · About the data · How it's built), About,
  404, EN/UA toggle, dark/light theme, self-hosted fonts, CI with PR checks + Dependabot.
  `gdp-by-country` announced as `soon` with a placeholder body. `verify` green (typecheck · lint ·
  check:catalog · check:data · 15 unit tests · 67 smoke checks · build); initial JS 11 kB gzip +
  react-vendor 68 kB gzip. Branch `s1-scaffold-shell`.
  Open: Fraunces has no Cyrillic — Ukrainian headings fall back to a system serif (owner decision needed);
  chart palette and jsdom render checks land in S2.
- **S2** (2026‑09‑18) — golden visualization `gdp-by-country` **published** + chart core. `RankedBar`
  (pure renderer + wrapper, keyed join, animated paging, reduced motion, text tooltips, stacked phone layout,
  4 px data‑end bars), width / reduced‑motion hooks, CVD‑validated region palette (both themes), ISO names and
  flags (`flag-icons`, `sync:flags`), Intl formatters, `useDataset` (cache, retry, error state), paging + URL
  state (`region`, `page`, `view`), legend filter, table view. Data: `data-raw/gdp-by-country/prep.ts`
  (legacy CSV → ISO + M49 → 181 rows JSON; 12 region fixes). `check:data` validates datasets through each
  entry's `data.ts`; smoke renders ready states with real data; jsdom render tests. §E Q1–Q9 decided
  (`CATALOG.md`). `npm run dev` scan error fixed. `verify` green: 4 test files (53 tests) · 98 smoke checks ·
  gdp chunk 6.6 kB gzip, d3‑vendor 17.4 kB gzip. Branch `s2-golden-ranked-bar`.
  Post‑S2 fix: renderer renamed `rankedBar.ts` → `renderRankedBar.ts` (case collision with `RankedBar.tsx`
  broke `tsc` on macOS) + `test-filenames.ts` guard.
  Decided: Fraunces fallback to a system serif for Ukrainian headings is accepted (owner, 2026‑09‑18).
  **Backlog (later, owner‑approved):** refresh `gdp-by-country` to the latest WDI year (2024/2025) — done in S3‑gdp.
- **S3‑bd** (2026‑09‑19) — priority entry `births-deaths-ua` **published** (CATALOG #31): births vs deaths in
  Ukraine, 1990–2025, in five angles chosen by sub‑tabs (`?show=gap|ratio|net|mirror|index`, A = gap is the
  default, B = deaths per birth second) + table view; KPI row; coverage bands (2014–2021*, 2022–2025**) and a
  coverage note on every angle. New chart core `YearChart` (`renderYearChart.ts`, declarative spec; jsdom tests),
  `--c-birth` / `--c-death` tokens validated for CVD in both themes, `data-raw/births-deaths-ua/` (CSV export of
  the owner's sheet → prep → JSON with coverage segments; 2007 births corrected to 472,700 by the owner).
  Decided: one entry with sub‑tabs, not a new top‑level tab (CATALOG §A: a tab needs ≥ 4 primary entries).
  Tests: `test-births-deaths.ts` (18), `test-year-chart.ts` (6); smoke covers every angle in EN + UK.
  Branch `viz/2026-09-births-deaths-ua`.
  Open: primary source is a secondary compilation (Slovo i Dilo); stat.gov.ua datasets are linked but are
  not consolidated 1990–2025 — replace when an official consolidated table is found.
- **S3‑bdd** (2026‑09‑19) — priority entry `births-deaths-per-day` **published** (CATALOG #5, replaces the planned
  births‑only `births-per-day`; owner decision): live world clock since page open (4.2 births / 2.0 deaths per
  second, Pause button — WCAG 2.2.2, `role="timer"`), per‑day split bar, KPI row (world births, deaths, net,
  47 shrinking countries, Ukraine 2.18 deaths per birth), new chart core `Butterfly` (`renderButterfly.ts`,
  births ← | country | → deaths on one scale, rows with deaths > births tinted, Ukraine outlined, phone layout),
  sorted by births (owner decision, no sub‑tabs), region filter, paging, "Find Ukraine", table view with net and
  deaths per birth. Data: owner xlsx (World Population Review ← UN WPP 2024) → two CSVs → `prep.ts` → 235 rows.
  Tests: `test-butterfly.ts` (8), `test-births-deaths-per-day.ts` (8); smoke covers EN + UK, table, filters.
  Branch `viz/2026-09-births-deaths-per-day`.
  Open: source is a secondary publisher of UN WPP (licence/terms of World Population Review not verified; UN WPP
  itself is CC BY 3.0 IGO) — switch to the UN WPP download when the sandbox/owner can fetch it; UN figures for
  Ukraine differ from registered data (noted on the page).
- **S3‑gdp** (2026‑09‑20) — `gdp-by-country` extended: title "GDP by country, 2023–2025"; sub‑tabs **GDP · GDP per
  capita** (`?metric=per-capita`) × year (`?year=2023|2024|2025`, per capita 2024–2025; default = total 2025; a
  year the metric lacks → latest). Data: owner workbooks (Worldometers ← WB WDI July 2026) → WB sheets exported
  to `wb-gdp-<year>.csv` / `wb-gdp-per-capita-<year>.csv` → `prep.ts` → 4 new JSON files (218 economies each);
  2023 file unchanged. Owner decisions: **World Bank** sheets (not IMF, no source toggle); values that are
  IMF/UN estimates or an earlier year are **kept + marked** (`note {source?, year?}` → `*`, tooltip line, table
  "Note" column; 20 rows in 2024, 34 in 2025); **one entry with sub‑tabs** (not a separate per‑capita entry).
  worldTotal 2024+ = Σ listed economies (Worldometers' share denominator, US share cross‑checked);
  worldAverage = Σ GDP ÷ Σ population (≈ $13.8k 2024, $14.5k 2025) → "× world average" column.
  Shared changes: `useDataset` never returns the previous file under a new URL (year switch); `formatUsdWhole`,
  `formatMultiple`; `test-filenames` counts importable extensions only (owner's `X.txt` + `X.xlsx` pair).
  Tests: `test-gdp.ts` 40 (notes, per capita, file‑name pinning, meta.data ↔ DATA_FILES); smoke covers
  total/per capita, 2023/2024/2025, EN + UK. `verify` green; gdp chunk 5.2 kB gzip.
  Branch `viz/2026-09-gdp-2024-2025`.
  Open: Worldometers is a secondary route (terms not verified) — switch to the WB API when the owner can fetch
  it; 2023 is an older WB vintage (Dec 2024) than 2024–2025 (Jul 2026) — noted on the page; `gdp-ppp-per-capita`
  (#2, PPP) stays a separate planned entry.
- **S3‑tl** (2026‑09‑20) — priority entry `time-of-life` **published** (CATALOG #26) as **“Human life in numbers /
  Людське життя в цифрах”** (owner's title): the OECD average day scaled to the 50 years from 15 to 64, six
  angles by sub‑tabs (`?show=weeks|day|ranking|groups|countries|gender`, weeks = default) × country (`?country=JP`,
  default = unweighted OECD‑30 average) × sex (`?sex=women|men`) × unit (ranking: `?unit=years|days|hours|share`) ×
  measure (countries/gender: `?measure=unpaid…`) + table view. Owner decisions: **OECD data, not the legacy sets**
  (unsourced, overlapping categories — Q4 superseded); primary tab `knowledge`; no emoji in labels.
  Data: OECD Time Use Database workbook (update 30 Apr 2026, sheets Total/Men/Women) — fetched through the
  in‑app browser (sandbox and VM egress block oecd.org), kept rows exported to three CSVs in
  `data-raw/time-of-life/` with checksums → `prep.ts` → 15 mutually exclusive activities per country and sex
  (unreported sub‑activities → residual of the same OECD category, so main categories match the sheet).
  New chart core `Waffle` + `Strip` (+ shared `tooltip.ts`), chart kind `waffle` (label + glyph), tokens
  `--c-life-needs/duties/free/other` and `--c-women/--c-men` validated with the dataviz script (both themes).
  Formats via Intl units (Ukrainian plurals: “17,6 року”; EN durations narrow “8h 26m”, UK short “8 год 26 хв”).
  Tests: `test-time-of-life.ts` (10), `test-waffle-strip.ts` (7); smoke covers every angle in EN + UK, both tables.
  Branch `viz/2026-09-time-of-life`.
  Open: Ukraine has no survey in the database (said on the page); surveys span 1998–2024; the OECD average is
  our unweighted mean; childhood and 65+ not covered — a “your remaining weeks” calculator stays for S5.
- **S3‑bdd2** (2026‑09‑21) — `births-deaths-per-day` follow‑up (owner requests) + a site‑wide fix.
  (1) **Regions in one click**: the region `<select>` became a chip row (`legend-item`, `aria-pressed`, region
  swatches) with an "All regions" chip. (2) **New filter** `?only=shrinking` — the 47 countries where deaths
  outnumber births; the KPI tile "47 of 235" is the button that toggles it (and clears it), and the row tint
  and its legend entry switch off while the filter is on (every row would carry it). (3) **Sort** `?sort=births|
  ratio|net` — births ↓ (default) · deaths per birth ↓ · natural change ascending ("biggest loss first");
  turning the filter on switches to `ratio`, turning it off restores `births`. Filter + sort live in `data.ts`
  as the pure `applyView(rows, {region, onlyShrinking, sort})`. (4) **Own chart kind** `butterfly` (label
  "Butterfly bars / Дзеркальні стовпці" + card glyph), so the gallery card and the Chart facet no longer look
  like `gdp-by-country`; `meta.chart` updated.
  Site‑wide: **stale‑deploy recovery** — a tab opened before a deploy asked for chunk files the new build no
  longer has ("Failed to fetch dynamically imported module" in the console, "This chart failed to load" on the
  page). `src/lib/chunkReload.ts` listens for Vite's `vite:preloadError` and reloads once (guarded by
  `sessionStorage`, 30 s window, no reload when storage is blocked); the error boundary also offers a
  "Reload the page" button. The second console error the owner saw (`reportAllChanges` / `startTime`) comes
  from an injected script (React DevTools / a web‑vitals extension), not from this site.
  Tests: `test-chunk-reload.ts` (4), `test-births-deaths-per-day.ts` 8 → 12 (applyView: regions, filter, three
  orders, purity); smoke covers the chips, the filter and the sort keys in EN + UK. `verify` green.
  Branch `viz/2026-09-births-deaths-per-day-filters`.
  Open: the sort control is a `<select>` — if more angles appear it should become sub‑tabs like #31/#26.
- **S3‑br** (2026‑09‑21) — `global-brands-race` **published** (CATALOG #15; the three legacy brand races merged, D5):
  Interbrand Best Global Brands 2000–2025 as a bar chart race — top 12, Play / Pause / Replay (inline SVG icons,
  no emoji), year slider over 8 frames per year (1.6 s per year), ‹ › year steps, big year ticker; six sector-group
  chips = legend + filter (`?group=tech|auto|finance|consumer|fashion|industry`), `?year=` (default 2025, the race
  position between years stays page state, only the whole year reaches the URL — on pause, at the end, on a jump
  or scrub), table view for any year (rank, sector, country + flag, value, YoY change / “new”), and a `Strip` with
  each group's share of the ranking's total (tech 47 % in 2000 → 63 % in 2025). Reduced motion → one frame per
  year, no tweening. New chart core `BarRace` (`renderBarRace.ts`, jsdom tests); tokens `--c-sector-*` = the five
  validated region hues under sector names + a neutral for industry (dataviz validator, six marks all‑pairs: dark
  CVD ΔE 11.3 / normal 15.0; light 12.2 / 17.2).
  Data: 2000–2019 from the gallery's Interbrand extract (the legacy `interbrand.csv` is corrupt — 22 brands in
  2020–2024, Ford filed as “Citi”); 2020–2025 transcribed from interbrand.com (sandbox egress blocks the site —
  read through the fetch tool) into `data-raw/global-brands-race/`; prep recomputes all 569 published YoY changes
  and aborts on a mismatch (0 mismatches); 5 renames aliased; 22 Interbrand sectors → 6 colour groups.
  Owner decision needed: logos — skipped (Simple Icons covers ~60 % of the top brands, misses Microsoft, Amazon,
  Mercedes…); flags mark the home country instead.
  Tests: `test-global-brands.ts` (11), `test-bar-race.ts` (7); smoke covers chart / 2000 / table / group / EN + UK.
  `verify` green; chunk 8.7 kB gzip. Branch `viz/2026-09-global-brands-race`.
  Open: brand home countries are editorial (HQ); Interbrand's terms for reuse of the ranking not verified (PLAN
  “Data terms”) — the page attributes and links every year; speed control and a “highlight one brand” search are
  candidates for S5.
- **S3‑aa** (2026‑09‑21) — priority entry `air-attacks-on-ukraine` **published** (CATALOG #11, replaces `air-strikes`):
  Russian missile and drone attacks on Ukraine, 28 Sep 2022 – 19 Sep 2026, five angles by sub‑tabs
  (`?show=timeline|types|interception|largest|civilians`) × year (`?year=2022…2026`) × step (`?step=month|week|day`)
  × mode (`?mode=share`) × rank (`?rank=missiles|drones`) × people (`?who=killed|injured`) + table view for every angle;
  KPI row per period. Owner decisions: Kaggle dataset (P. Ivaniuk, CC BY‑NC‑SA 4.0 — derived JSON under the same
  licence, code MIT); tag `war`, no new tab until the 4th war entry; v1 = timeline + types + interception + largest +
  civilians (calendar heatmap → backlog); strict style, no emoji.
  Data: `data-raw/air-attacks-on-ukraine/` (CSV unchanged + sha256, `prep.ts`, HRMMU CSV) → 1,236 reports, 52 models.
  Rules found in the data: national reports only (regional commands overlap — 1,742 rows); long-range weapons only
  (tactical/recon drones and guided bombs out); one report = one Air Force post per day (drones and missiles of one
  night carry different windows); `hidden` (from 10 Aug 2026) → `launched-hidden`, out of rates; interception is ONE
  measure — shot down + suppressed + locationally lost — because "lost" was a separate number only Jul 2024 – Jul 2025.
  Legacy page's casualty lines were HRMMU all‑weapon totals plotted against weapon counts on a second axis — dropped.
  New chart cores `TimeSeries` + `StackedRows` (jsdom tests); tokens `--c-air-*` (status = the validated birth/death
  pair + hatch texture; classes = the six validated sector marks) and `--c-harm-*` (two neutrals).
  Tests: `test-air-attacks.ts` (13 groups), `test-time-series.ts` (6); smoke covers every angle in EN + UK and every
  table. `verify` green; chunk 19.8 kB gzip. Branch `viz/2026-09-air-attacks-on-ukraine`.
  Open: HRMMU weapon breakdown is annual only for 2025 (2026 = sum of monthly updates, revised later); the Air Force
  withholds some missile counts from 10 Aug 2026 (lower bounds); calendar heatmap and a map by oblast → backlog;
  monthly refresh is an owner step (Kaggle login).
- **S3‑aa2** (2026‑09‑21) — owner review of S3‑aa, site‑wide layout fixes. (1) Segmented groups overlapped
  ("Period" under "Step"): `.controls .field` caps fields at 16rem and `.field-auto` inherited the cap → `.field-auto`
  uncapped, segmented labels `nowrap`, groups wrap on phones; controls 2.25rem high. (2) Visualization pages use a
  narrower column `--content-viz: 1000px` (gallery stays 1180px). (3) Page title `clamp(1.4rem, …, 2rem)` +
  `text-wrap: balance` — every current title fits one line at 1000px. (4) Compact head: the New/Soon badge moved
  into the breadcrumb row (`.viz-top` in `VizPage.tsx`), tighter spacing, lower KPI tiles and sub‑tabs, smaller
  status line and intro (rules scoped to `.viz`, end of `components.css`). (5) Bundle: the claim that
  `d3-time-format` sat in the page chunk was wrong — `manualChunks` already sends every `d3-*` to `d3-vendor`; the
  19.8 kB gzip chunk is the page's own code (index 17 kB · copy 11 kB · specs 9 kB · new chart cores 10 kB raw).
  No change: the chart cores move to a shared chunk by themselves once a second page imports them.
  `verify` green. Branch `viz/2026-09-air-attacks-on-ukraine` (same PR) or `s3aa2-compact-layout`.
  Backlog (owner): calendar heatmap of days (maybe later), map by oblast.
- **S3‑cd** (2026‑09‑22) — three volunteering/donations entries published (CATALOG #10, #12, #13 —
  the three legacy `Contribution/volunteering/*` pages, out of wave). The two line-chart entries share a new
  pattern: `TimeSeries` for a continuous monthly line + `YearChart` for a year‑over‑year seasonal
  overlay, switched by `?show=timeline|seasonal` (default timeline) and `?view=chart|table`.
  `renderYearChart` got one small, backward‑compatible addition — `xFormat?: (v: number) => string` on
  `YearChartSpec`, for month‑indexed (1–12) axis labels — instead of a new chart core (own earlier
  read of the code was wrong: its docstring already anticipated “donations, volunteers” as a reuse
  case). It can't draw a null gap — a missing month renders as 0 — so the seasonal view is restricted to
  complete calendar years via a `fullYears()` helper in each entry's `data.ts`. New palette aliases
  `--c-series-primary`/`-1..4` (5 tokens, reusing the validated `--c-region-*` hues) as `SERIES_COLOR` in
  `palette.ts` — no new CVD validation needed.
  - `volunteers-by-region` (#10): registered volunteers by oblast, Nov 2024, `RankedBar`. Owner corrections
    from planning: the id `278` is Zhytomyr, not a duplicate Zaporizka row (owner fixed the source CSV before
    this session; `prep.ts` maps it accordingly); Kyiv city + oblast stay combined (the source page lists them
    separately but this export doesn't — noted on the page, not guessed at); AR of Crimea = 0 is explained
    on the page (registry run by Ukraine's State Tax Service, unreachable under occupation) rather than hidden
    or left as a bare, unexplained number.
  - `volunteers-growth` (#13): registered volunteers, Jan 2022 – Nov 2025 (320 → 11,792, ×37). Owner
    supplied a fresher export reaching Nov 2025 — the CATALOG‑listed data stopped Nov 2024, and per the
    owner an entry that couldn't reach 2025–2026 wasn't worth building. Seasonal overlay: 2022–2024
    (complete years); 2025 (partial, through Nov) stays on the timeline only.
  - `donations` (#12): re‑scoped from the CATALOG's original metric (average people donating/month —
    stops Nov 2024, no way to extend) to monobank's monthly UAH totals (owner export, Feb 2022 – Nov 2025;
    UAH 112.7 bn total, peak UAH 4.71 bn in Dec 2023, 2025 pace down to ~UAH 2.95 bn/mo from 2024's ~3.6).
    Two reference tables below the chart, from owner‑supplied files the CATALOG entry didn't have: three
    major funds' annual totals (United24 / Come Back Alive / Prytula Foundation — UAH 105.9 bn combined in
    the first 11 months of 2025 alone, more than their combined 2022–2024 total) and Nova Poshta's
    humanitarian logistics (247,727 → 1.9 M parcels, 2022 → 2024). The old person‑count series survives
    as one context KPI only (its last point, Nov 2024: 2,029,928) — not as a plotted series.
    No preview/screenshots taken this session (owner runs the dev server locally and reviews there); `npm run
  prep -- <id>` (×3) / `gen:catalog` / `check:data` / `test` / `verify` are owner steps, not run from here.
    Branch `viz/2026-09-volunteering-contribution` (all three, one PR).
    Open: a map of volunteer organizations/people was floated by the owner as a possible future angle — not
    built (recommendation only, no source lined up yet); owner review of the rendered pages is pending.
- **S3‑la** (2026‑09‑22; logged retroactively in S3‑cl — its code markers read `CHANGED (session 2026-09-22)`) —
  `land-area` **published** (CATALOG #3, P3a; replaces the legacy `Demographics/land area` page): land area and
  total area of 234 countries and territories as sub‑tabs (`?metric=land|total`, land = default) on `RankedBar`,
  a `Strip` with each region's share, table view and — for land only — a "By non‑land share" sort
  (`?sort=nonland`) by how much of a country is water or ice. Data: Worldometers (retrieved 2026‑09‑19) →
  `data-raw/land-area/prep.ts` → `public/data/land-area/land-area.json`. Decisions (`data-raw/land-area/README.md`):
  internationally recognized borders — the source's Ukraine row (603,500 / land 579,320 km²) already includes
  Crimea and the territories occupied since 2022, Russia's excludes them (both `recognized-borders` *, checked
  against Wikipedia 2026‑09‑22); 5 rows whose land area exceeds total area by more than rounding are kept +
  marked `definition`, not corrected; Greenland's land area excludes the ice sheet (`ice-sheet`); the Holy See,
  rounded to 0 km² in the source, gets the cited figure (`AREA_OVERRIDE`, `corrected`); world totals = Σ of the
  234 rows. Status went `draft` → `published` in the same session (drafts are dev-only, so the production smoke
  rendered NotFound). Tests: `test-land-area.ts` (29); smoke 6 checks. Branch `viz/2026-09-land-area`.
  Open: Worldometers not independently verified (secondary route, like #1/#15).
- **S3‑aa3** (2026‑09‑24) — `air-attacks-on-ukraine` gets a sixth angle, calendar heatmap (CATALOG #11,
  `?show=calendar`, key **F**): one square per day since 28 Sep 2022, shaded by a quantile of the day's
  launches — Monday‑start week columns, one grid per calendar year, "Fewer → More" legend, hover tooltip +
  table view. Reuses the existing `rank` state (`total|missiles|drones`, already wired for the "largest"
  angle) as the colour metric — no new URL parameter. New chart core `renderCalendarHeatmap.ts` +
  `CalendarHeatmap.tsx` (day buckets from `aggregate(ds,'day',period)`; quantile breakpoints over positive
  values only, so a few record nights don't wash out ordinary days). `HEAT_COLOR` (5 steps, `--c-heat-0..4`
  in `tokens.css`): one‑hue sequential ramp, dataviz skill's `--ordinal` check (not the categorical six,
  which doesn't apply to a magnitude ramp) — both themes `ALL CHECKS PASS` (monotone L, adjacent ΔL ≈
  0.067–0.071, light‑end contrast 2.16:1 → top step ≈4.98:1; level 4's hex matches the existing
  `--c-air-through`, so the ramp reads as "this hue = attack intensity" across the whole page). `.ch-*`
  rules in `components.css`.
  Tests: `test-calendar-heatmap.ts` (8 groups — Monday‑start grid math, quantile levels, layout never
  overflows at any width, draw/hover/cleanup/redraw, safety); `test-air-attacks.ts` +1 group (`calendarSpec`
  against the real dataset — grid years match `yearsOf`, full calendar‑year cell counts incl. leap years,
  the known 7 Sep 2025 report (823) lands on the right cell, the busiest *day* — 24 Mar 2026 at 980, several
  reports that day — quantizes to the top level, tooltip formatting).
  `typecheck` + `lint` green. `test` and `build` could **not** be run this session: this shell is a Linux VM
  and `node_modules` only has `@esbuild/darwin-arm64` (installed natively on the owner's Mac) — `vite build`
  and `tsx` (which `npm test` uses) both need `@esbuild/linux-arm64` there. Not a code issue — run `npm run
  verify` locally before merging.
  Branch (proposed) `viz/2026-09-air-attacks-on-ukraine-calendar-heatmap` (agent sessions never commit or
  push — owner commits). Commit (proposed): `🔢 Numbers Speak S3-aa3: air-attacks-on-ukraine calendar
  heatmap (angle F, ?show=calendar)`.
  Open: map by oblast — investigated this session (owner asked), still backlog, owner decision to leave it.
  `target_main` in the raw Kaggle CSV covers only 86 of 2,410 kept (national) rows (3.6%, mixing city and
  oblast names, typos, and free-text multi-oblast values with no way to split `launched` between them); the
  1,742 regional-command rows S3‑aa already dropped for overlapping national totals are worse (6/1,742,
  0.3%) and only cleanly identify 5 broad reporting zones (PvK South/East/West/Centre + Kharkiv oblast
  admin), not the oblast actually hit. HRMMU civilians has no regional field either. Not buildable from data
  already in the repo without misrepresenting ~4% coverage as the picture — needs a different source (ISW,
  HRMMU's narrative reports) first.
  This session also left two stray
  files the device sandbox couldn't remove itself (no delete permission there) — an empty
  `src/viz/air-attacks-on-ukraine/.tmp-marker` and a stale `.git/index.lock` from a `git status` call; both
  are safe to `rm` (the lock file before your next git command, if it's still there).
- **S3‑cl** (2026‑09‑24) — CHANGELOG sync + guard (owner request). `CHANGELOG.md` gained the lines missing
  since 2026‑09‑21: 2026‑09‑22 — `land-area`, `donations`, `volunteers-growth`, `volunteers-by-region` (New);
  2026‑09‑24 — `air-attacks-on-ukraine` calendar heatmap (Updated, deep link `?show=calendar`); every number
  re-checked against `public/data`. `check:catalog` now also fails when a `published` entry has no CHANGELOG line
  linking `#/v/<id>` (`scripts/lib/changelog.ts`, pure; a bare id in prose does not count; the staleness and
  CHANGELOG failures are reported in one run) + `scripts/test-changelog.ts` (4). §14 gained the missing
  `land-area` entry (S3‑la). The stray `src/viz/air-attacks-on-ukraine/.tmp-marker` (S3‑aa3) was already gone;
  no `.git/index.lock` either. Verified in a scratch copy outside the live folder (`npm ci` on Linux arm64):
  typecheck · lint · check:catalog (green; red with both messages when a link is removed and the generated
  file is stale) · check:data (10 published, 15 files) · test 19 files (incl. S3‑aa3's never-run
  `air-attacks` + `calendar-heatmap`) · smoke 622 checks · build — all green. Branch (proposed)
  `s3cl-changelog-sync`.
  Follow‑up (owner request, same session): `air-attacks-on-ukraine` `meta.updated` 2026‑09‑21 → 2026‑09‑24
  (the heatmap's date); `land-area` UA description: «щит» had been typed with a Latin "it" — fixed; a scan of every
  `src` string for Latin letters inside Cyrillic words found no other case. The November 2024 volunteer count gap
  is **not an error**: Opendatabot's article (5 Dec 2024) gives 10,454 registered "at the end of November 2024" —
  exactly the regional CSV's sum shown on `volunteers-by-region`; `volunteers-growth` shows 10,466 for 2024‑11
  from the owner's later export (a different cut). Pages unchanged. Re‑verified in a fresh scratch copy:
  typecheck · lint · check:catalog · check:data · test (19 files) · smoke · build — green.
  Open (owner decisions): an optional one‑line note on `volunteers-growth` about that cut difference; extending
  `check:catalog` so an entry's latest CHANGELOG date must be ≥ its `meta.updated` (≈ 30 min).
- **S3‑rb** (2026‑09‑24) — P3a ranked bars on the existing `RankedBar` core (no new chart core). Step 1 = data audit
  (device shell and sandbox egress block every source → official data read through the in‑app browser: WB API,
  IEP PDFs via pdf.js, IFR, Numbeo terms; owner put WPP / GPI / IFR‑terms files in `docs/data/`).
  - `population-by-country` **published** (CATALOG #4): UN WPP 2024 compact workbook (owner download, sha256 in
    README) → `extract-wpp.py` (sheet "Medium variant", 2025, 237 countries/areas + World) → `prep.ts` → 237 rows,
    world 8,231,613,070. Owner decisions: year **2025** (2026 still in progress — WPP 2025 is itself a projection,
    said on the page); density as a metric sub‑tab (`?metric=density`) = population ÷ land area, **joined at
    runtime** with `public/data/land-area/land-area.json` (no copied areas; Q3) — 234 of 237, Guernsey/Jersey/Kosovo
    null + note; land < 25 km² marked approximate (source rounds to whole km²: Monaco "1 km²"); UA/RU marked
    `recognized-borders` (WPP counts Crimea in Ukraine; prep aborts if that footnote disappears). World density
    63.3/km² vs WPP's 63.1. Shared: `formatCountCompact/Tick`, `formatDensity/Tick` (`/км²` in UK) in `format.ts`.
    Tests: `test-population.ts` (18, incl. the real join); smoke 18 checks (both metrics, tables, filter, EN + UK).
    `verify` green in a scratch copy (20 test files · 685 smoke checks · build; chunk 6.4 kB gzip).
    Branch (proposed) `viz/2026-09-population-by-country`.
    Open: Monaco's 1 km² and Gibraltar's land > total are `land-area` (Worldometers) issues — fixing them there
    fixes the density automatically.
  - `gdp-ppp-per-capita` **published** (CATALOG #2): WB API `NY.GDP.PCAP.PP.CD` (WDI 2026‑07‑13) read through the
    in‑app browser → `wb-ppp-per-capita-<year>.csv` ×3 (sha256 in README, matched against the browser's own hash) →
    `prep.ts` → one JSON per year, 197/195/185 of 217 economies. Owner decisions: 2023 · 2024 · 2025 year sub‑tabs
    from **one vintage** (legacy Dec‑2024 values not reused — PPP revisions would fake growth); world average =
    **WB World (WLD) aggregate** (23,382 / 24,544 / 25,704), "× world average" derived in `rankPpp`; legacy typed
    "world share" and nominal column dropped; no fill‑ins for missing economies (Taiwan never in WB data). KPIs:
    world average · economies above it (80/185) · highest ÷ lowest (Singapore ÷ Burundi 130.9×).
    Tests: `test-gdp-ppp.ts` (11); smoke 11 checks. `verify` green (21 test files · 733 smoke checks · build; chunk
    4.5 kB gzip). Branch (proposed) `viz/2026-09-gdp-ppp-per-capita`.
  - `robotization` **published** (CATALOG #8): IFR World Robotics 2025 (data 2024) — press release 8 Apr 2026 + its
    chart of 22 economies, transcribed to `ifr-robot-density-2024.csv` (top 10, Canada, China, world 132 match the
    release text; image sha256 in README) → `prep.ts` → 22 rows + world. WR 2026 (released 2026‑09‑24) has no density
    yet. IFR terms (`docs/data/vdma_500_worldrobot.pdf` §5(2)): single figures with credit allowed, full tables not.
    Owner decisions: top 15; Belgium & Luxembourg one row (`code: BE` + `with: LU`, *); "× world average".
    China (largest stock) 22nd with 166 — stated from data. No paging (15 rows), region filter + table.
    Tests: `test-robotization.ts` (10); smoke 8 checks. `verify` green (22 test files · 782 smoke checks · build;
    chunk 4.0 kB gzip). Branch (proposed) `viz/2026-09-robotization`.
  - `crime-index` **published** (CATALOG #6; 2026‑09‑25): owner decision — both measures as sub‑tabs. UNODC tab done:
    `data_cts_intentional_homicide.xlsx` (12 Jul 2026, sha256 in README) parsed in the in‑app browser (SheetJS) →
    `unodc-homicide-latest.csv` (latest year with a rate, ≥ 2015, + counts, + WLD 5.14 for 2024) → `prep.ts` →
    `homicide-rate.json`, 166 rows (95 for 2024, older marked with year). UK = E&W + Scotland + NI combined as
    Σ victims ÷ Σ(victims ÷ rate) (all 2023); Iraq = Central Iraq only (`partial-territory`); fractional modelled
    counts rounded; ISO3 → ISO2 via the WPP table. Numbeo tab coded (parser, derived Safety = 100 − Crime, prep
    aborts on mismatch, name aliases) but **not shipped**: Numbeo's terms forbid automated collection → owner copies
    the table to `data-raw/crime-index/numbeo-crime-2026-mid.txt`; the tab appears once `numbeo-crime-2026-mid.json`
    is added to `meta.data` (`AVAILABLE` in index.tsx). `soon`, not `draft`: a draft fails the production smoke.
    Tests: `test-crime.ts` (8); smoke 12 checks. `verify` green (23 test files · 830 smoke checks · build).
    **Close‑out (2026‑09‑25):** the owner's copy landed in `docs/data/` → copied verbatim to
    `data-raw/crime-index/numbeo-crime-2026-mid.txt` (sha256 7914a9fe…, 148 rows) → prep → 148 countries, every
    name/value/rank checked against the copy. Fixes: alias "Us Virgin Islands" → VI; equal indexes keep Numbeo's
    rank (was ISO order, which swapped Jamaica 9th / Guyana 10th at 67.4). File added to `meta.data` → tab on,
    `published`, CHANGELOG line (UK 123rd by homicide rate vs 60th by perceived crime). Tests 9 (real Numbeo file
    unconditional); smoke: both tabs, Numbeo chart, table order, UK.
  - `global-peace-index` **published** (CATALOG #7; 2026‑09‑25). Owner: "build fully, no letter to IEP". IEP
    terms (visionofhumanity.org/terms): §9.5 republishing needs written permission unless material is freely
    available for re‑use; §12.5 maps — educational, non‑commercial use with acknowledgement; the ranking table sits
    on the map spread → built on §12.5, the report's citation line + link on the page; if IEP objects, remove the
    entry. Data: `extract-gpi.py` (poppler `pdftotext -layout`, stdlib) reads the ranking table (PDF pp. 12–13)
    AND the nine regional tables (pp. 17–27) and fails unless all 163 countries match on score + rank → CSV
    (rank, tie, score, rank change, score change) → `prep.ts` (CLDR names + 10 aliases, M49 regions) →
    `gpi-2026.json`. The report contradicts itself once: Cambodia and Honduras both 2.075, ranking table 96 / 97,
    regional table + text Honduras 96 → kept as printed, `regionalRank: 96` + a page note. Check against the
    executive summary: 99 worse / 62 better (derived from score change) — matches. Page: 163 rows, 15 per page,
    order switch `?order=least`, region filter, table (score · score change · ▲/▼ places), ties "=70".
    Shared: `formatScore` / `formatScoreChange` in `format.ts`. Tests: `test-global-peace-index.ts` (8, incl. the
    report's top/bottom five, ties, Ukraine 160 ▲2 −0.119); smoke: both orders, UK, table, region filter.
  `verify` green in a scratch copy (24 test files · 898 smoke checks · build; GPI chunk 5.1 kB gzip); screenshots
  (desktop, phone, table, Numbeo tab) checked with Playwright on the built site — no console errors.
  Owner (2026‑09‑25): IEP §9.5 — no letter; the entry is non‑commercial with a source link, removed if IEP asks;
  the Honduras conflict kept as printed — OK. The `RankedBar` baseline and the phone pager went to the §13 backlog.
  Owner feedback: gallery cards all look alike — the card image is one `ChartGlyph` per chart kind, so 8 of 15
  cards show the same bars and 3 the same line; thumbnails were planned only for S5 (Playwright webp). Proposed: data‑driven card
  previews as the next session — done in S3‑th.
- **S3‑th** (2026‑09‑25) — gallery card previews from real data (owner feedback in S3‑rb: 8 of 15 cards showed the same
  ranked‑bar glyph, 3 the same line). Mockup first (4 cards × dark/light × EN/UA), approved with one change: no row
  is picked because it is Ukraine or Russia — only by rank (GPI card: IS, NZ ⋯ 159 more ⋯ SD, RU, flags on the two
  extremes). Owner decisions: key figure = owner's pick from 2–3 candidates per entry (the value is computed); a
  candidate that repeats the card subtitle is dropped; flags only on country rankings, ≤ 3; marks wear the entry's own
  chart palette (regions, sectors, air, births/deaths, life groups, series‑primary), no new tokens.
  Picks: GPI 1.161–3.367 · population 35 % (India + China) · GDP 42.5 % (US + China) · PPP 131× (Singapore vs
  Burundi) · land 12.6 % (Russia) · crime 20× (Turks & Caicos vs world) · robots 132 (world) · births/deaths per
  day 2.18 (Ukraine — highest of 235, a data extreme) · births‑deaths‑ua 2.88 (2025) · donations UAH 4.71 bn (Dec
  2023) · volunteers‑growth +1,326 in 12 months · volunteers‑by‑region 24 % (Kyiv) · brands 63 % tech · time of life
  17.6 years asleep · air attacks 127,044 launched.
  Built: contract + validator `src/catalog/preview.ts` (5 mark kinds: rows · butterfly · series · columns · grid;
  15 formats; 20 whitelisted tone tokens → `var(--c-<tone>)`), `previewKit.ts` (topRows · extremeRows · wholeParts),
  15 × `src/viz/<id>/preview.ts` on each entry's own parser and derivations (rankGdp, orderGpi, aggregate, groupShares,
  oecdAverage…), `scripts/gen-previews.ts` + `scripts/lib/previews.ts` (deterministic JSON; drawn‑only marks rounded
  to 3 significant digits, printed numbers to 6), `CardPreview.tsx` (SVG marks, HTML text, lazy flags, `aria-hidden`
  inside the card) + `previewFormat.ts` (Intl via `lib/format.ts`; fixed month tables), `VizCard` fallback to
  `ChartGlyph`, `.cp-*` styles, `gen:previews` in predev/prebuild, `check:catalog` staleness + coverage + budget.
  Size: previews 3.4 kB gzip; initial `index` chunk 33.7 → 39.4 kB gzip as Vite reports it (JSON + component), CSS +0.5 kB gzip.
  Tests: `test-previews.ts` (14: every preview on real data, validator rejections, the no‑country‑literal rule,
  both‑language formatting, tokens exist, determinism + budget); smoke: 15 previews per language with each key
  figure, flags drawn, glyph fallback. `verify` green in a scratch copy (25 test files · 967 smoke checks · build);
  Playwright screenshots of the built catalog at 1280 (dark, light, UK) and 390 (dark EN, light UK): 15 previews,
  no broken flags, no horizontal scroll, no overflowing preview, no console errors.
  Docs: PLAN v0.4 (DoD “thumbnail” → “card preview”; P5 keeps webp for OG only), PROJECT‑BRIEF §9, CATALOG §B.
  Follow‑up (owner, same session): no manual regeneration step — `verify` starts with `gen:catalog && gen:previews`
  (CI still runs `check:catalog` without generating, so staleness stays a CI failure) and `npm run prep -- <id>`
  runs `gen:previews` after a successful prep.
  Branch (proposed) `s3-th-card-previews`. Left in the live folder: `dist-s3th/site.tgz` (gitignored build used for
  the screenshots) — safe to delete.
  Open: the preview is decorative (`aria-hidden`) — the key figure is not announced by screen readers; a visually
  hidden sentence per card is a candidate for the S5 accessibility pass.
- **S3‑an** (2026‑09‑25) — anonymous page counts with GoatCounter (owner: see how many people open the gallery and
  which entries), under the rule "zero inconvenience for visitors". Audit (goatcounter.com docs + source, same day):
  `/count` takes `p t r e q s b rnd`, answers a 43‑byte GIF with `Access-Control-Allow-Origin: *` and no `Set-Cookie`,
  and accepts the POST that `sendBeacon` makes (count.js itself sends it that way, img as fallback); bots are filtered
  server‑side (`isbot`); sessions = site + UA + IP in memory for 8 h, IP/UA never stored. count.js v5 (9 Jun 2025)
  is ISC (the server is EUPL‑1.2), but it counts `pathname + search` (our routes are in the hash), has no DNT/GPC
  check, `console.warn`s, `alert()`s on `#toggle-goatcounter` and repeats the referrer on every SPA count → own client.
  Owner decisions: site code `numbers-speak` (dedicated site, paths `/#/…`); About line, dashboard private; DNT and
  GPC respected; opt‑out flag + "Ignore IPs" in the dashboard. Own decision, stated to the owner: count only on
  `COUNT_HOSTS` (`endorrfin.github.io`, https) instead of a localhost/LAN blocklist — a fork deployed elsewhere would
  otherwise count into this dashboard.
  Built: `src/lib/analytics.ts` (pure `hitFor` · `skipReason` · `externalReferrer` · `countUrl` · `send` ·
  `applyOptOut` / `storedOptOut` · `createTracker`; browser wiring `trackPageview`), constants in `lib/links.ts`, two
  effects in `App.tsx` (opt‑out flag first, then the page view keyed on `path`); About: a full‑width panel "Anonymous
  visit counts / Знеособлена статистика" under the four principle cards (a fifth card left an orphan in the 4‑column
  grid) + the owner‑only "not counted" line in it (`AboutPage` takes optional `params`).
  Size: initial `index` chunk 39.38 → 40.21 kB gzip as Vite reports it (+0.83 kB; `gzip -9` 39,024 → 39,850 B, raw +2,043 B) —
  within the 1 kB budget.
  Tests: `test-analytics.ts` (21 — route → path incl. 404s and query‑only variants, every skip rule, request URL,
  transport fallback, opt‑out, one view per navigation, referrer on the first view only, deferred send, silence on
  throw, SSR no‑op, jsdom on the production URL with a browser UA → one beacon per navigation after idle, jsdom's own
  UA and localhost → no request); smoke: the About panel EN + UK, the opt‑out line only with `?no-count=1`, and a
  network spy — 0 fetch / sendBeacon / Image across every render. `verify` green in a scratch copy (26 test files ·
  982 smoke checks · build).
  Playwright on the built site (Chromium 1194, served under the production URL through `route`): a visitor → one
  POST beacon per navigation (8 for 8, incl. Back), the first sent after first contentful paint, `p`/`t`/`r`/`s`
  correct, settings changes not counted, 0 cookies, localStorage = the pre‑existing lang/theme keys only, 0 page
  errors, 0 console messages; DNT · GPC · webdriver · HeadlessChrome UA · 127.0.0.1 → 0 requests; opt‑out → 0 requests
  (incl. the visit that sets it and a reload), `=0` → counted again; counter blocked / offline / HTTP 500 → one attempt
  per navigation, no retry, 0 page errors, UI intact — Chrome still prints one "Failed to load resource" network line
  per failed request (the browser's log, not the page's).
  Docs: PROJECT‑BRIEF §4 explicit exception (+ §5, §6), PLAN v0.5 (A4/B4, A9/B9), README EN/UA "Visit statistics",
  CHANGELOG line, this file §2/§3/§8/§12/§13. Browser‑check script: `scripts/_e2e-analytics.mjs` (gitignored; needs
  Playwright + Chromium — run from the cloud sandbox). Branch (proposed) `s3-an-goatcounter`.
  Owner steps: register the site `numbers-speak` on goatcounter.com; in its settings add your IPs to "Ignore IPs";
  open `#/about?no-count=1` on every own browser/device; after the deploy, check the first visits in the dashboard.
  Owner (2026‑09‑25): site `numbers-speak` registered; GoatCounter Settings → "Data collection": **User‑Agent,
  Country, Region off** (Sessions, Referrer, Size stay on; Language, Individual pageviews off by default) — so
  About/README say IP and User‑Agent serve only to tell unique visits apart (in memory, ≤ 8 h). Turning any of
  them back on = update both texts. GoatCounter's `<script … count.js>` snippet is **not** added (our client
  replaces it; both = double counts). Dashboard path links = site "Domain" + path, so
  with paths `/#/…` a plain `endorrfin.github.io` domain opens the portfolio landing, not the gallery.
  Open: only Chromium was driven end to end (Safari's no‑`requestIdleCallback` path is covered in jsdom); ad blockers
  that list goatcounter.com make the numbers a lower bound; the shell writes the lang/theme preferences on first load
  (pre‑existing, not identifiers).
