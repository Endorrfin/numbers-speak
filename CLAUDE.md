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
  `check:catalog` fails when it is stale. The shell never imports a page body eagerly.
- **Bilingual at the data layer:** `Localized {en, uk}` everywhere; `check:data` rejects empty strings.
- **Deviation from the guides' Tier‑1 content model:** no `Section → Module → Topic → Block`; the unit is a
  visualization entry (`VizMeta`). Candidate for a "Tier 3 — Visualization gallery" section in `_standard`
  (phase P6).

## 3. Repo layout
```
src/
  main.tsx · App.tsx · vite-env.d.ts
  catalog/     types.ts (VizMeta contract) · rubrics.ts (tabs + facet labels) · index.ts (lookups)
               filter.ts (pure filtering, unit‑tested) · catalog.generated.ts (GENERATED)
  viz/<id>/    meta.ts (manifest) · index.tsx (page body, default export)
  charts/      reusable D3 components (from S2)
  components/  layout/ (TopBar, Footer) · catalog/ (CatalogPage, FilterBar, VizCard)
               viz/ (VizPage, AboutData) · pages/ (AboutPage, NotFound) · AppStateProvider.tsx
  i18n/        lang.ts · LangProvider.tsx · ui.ts
  lib/         hashRouter.ts · appState.ts · format.ts · utils.ts
  theme/       tokens.css · global.css · components.css
public/        favicon.svg · .nojekyll · data/<id>/ (from S2) · thumbs/<id>.webp (from S5)
data-raw/      <id>/ raw files + prep scripts (from S2; committed, not deployed)
scripts/       gen-catalog.ts · check-catalog.ts · check-data.ts · run-tests.ts · test-*.ts · smoke.ts ·
               css-stub-hooks.mjs
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
- Data rules (from S2): numbers as numbers, ISO 3166‑1 alpha‑2 codes (names via `Intl.DisplayNames`, flags
  via `flag-icons`), fixed enums for regions, derived values computed, retrieval dates recorded.

## 5. Catalog
30 entries in 5 tabs — see `CATALOG.md` (authoritative). Waves: P2 golden → P3 MVP (16) → P4 full (30).

## 6. Charts & interactivity
Chart kit (from S2): `RankedBar` · `LineSeries` · `BarRace` · `HierarchyTree` + one‑offs. Every chart:
responsive width (ResizeObserver), `role="img"` + label, keyboard‑operable controls, text‑only tooltips,
`prefers-reduced-motion` → no transitions, all settings mirrored in the URL query.

## 7. Theme / brand
Dark editorial by default, light mode available (`data-theme` on `<html>`, resolved before first paint in
`index.html`). Tokens in `theme/tokens.css`. Fonts: Fraunces (display) · Inter · JetBrains Mono. The chart
palette (incl. a colour‑blind‑safe option) is chosen in S2 — UI accents only until then.

## 8. Internationalization
EN first, UA second; technical terms stay English. `i18n/ui.ts` holds chrome strings; manifests hold entry
strings. Language persists in `localStorage` (`numbers-speak.lang`); theme in `numbers-speak.theme`.

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
  locks). Verify in a scratch copy; build into `dist-sN` if `unlink` is blocked.
- `_examples/` is gitignored — do not import from it at runtime; copy data through `data-raw/` prep scripts.
- `catalog.generated.ts` is committed (typecheck needs it); `predev`/`prebuild` regenerate it; `check:catalog`
  guards staleness. Adding a visualization = new folder + `npm run gen:catalog`.
- The SSR smoke runs under `tsx` (no Vite): keep `import.meta.env` access optional (`import.meta.env?.DEV`).

## 13. Session roadmap
S0 brief/catalog/plan → S1 scaffold + shell → S2 golden `gdp-by-country` + chart core → S3a/b/c MVP waves →
S4a/b/c full migration → S5 customize & share → S6 growth pipeline. Details: `docs/PLAN.md` §A7.

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
