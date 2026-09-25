# PROJECT BRIEF — `numbers-speak`

> The upstream commission for this repository (guides standard §3.5). Language: English (meta‑doc).
> Refilled from `../_standard/templates/tier1-spa/PROJECT-BRIEF.md` for a **visualization gallery** rather than
> a curriculum guide. `CLAUDE.md` is the living contract derived from this brief; `CATALOG.md` holds the
> content plan; `docs/PLAN.md` holds the reasoning (options, risks, estimates).
>
> **How to read it (agent):** §5 (locked decisions) and §10 (decision rights) are authoritative — do **not**
> re‑ask anything answered here. Decisions D1–D10 were accepted by the owner on 2026‑09‑17.

---

## 0. TL;DR — the one‑paragraph commission

Build **Numbers Speak / Цифри говорять** — a curated, **interactive, bilingual (EN/UA) gallery of D3 data
visualizations** about Ukraine and the world. Port the ~30 legacy vanilla D3 pages (now in `_examples/`) into
one **Vite 8 + React 19 + TypeScript 6 (strict)** static site with **D3 7.9 from npm**: a manifest‑driven
catalog (topic tabs, facet filters, search) and a page per visualization that lets the reader **view,
configure, share and understand** it (settings encoded in the URL, sources, licence, data download, "how
it's built"). Deploy to GitHub Pages via Actions. Work **plan‑first**, golden quality, verify every session;
after the migration, add **1–4 visualizations per month** through a repeatable pipeline.

## 1. Goal & why
- Turn scattered D3 experiments into **one coherent, trustworthy product**: every chart cites its sources,
  works on a phone, in both languages, with a stable link to any configured view.
- A **public portfolio piece** that shows D3 craft inside a typed React codebase, next to the ten existing
  guide sites (and on the portfolio landing `endorrfin.github.io`).
- A **home for new data stories** — the catalog must stay easy to extend for years.

## 2. Audience & outcomes
- **Primary:** curious readers in Ukraine and abroad (EN/UA). **Secondary:** engineers and recruiters who
  want to see how the charts are built.
- **After a visit, a reader can:** find a chart by topic or type; change its settings (filters, sorting,
  units, time); share the exact view by URL; check where the numbers come from; download the data.
- **Success = correctness of data + clarity of the chart + learning UX**, then completeness and polish.
  Speed last.

## 3. References & quality bar
- **Architecture bar:** `../database guide` and `../english-guide` (Tier‑1 standard: typed SSOT, lazy
  chunks, generated indexes, verify gate, bilingual model).
- **Craft bar:** the D3 gallery on Observable (clear encodings, transitions with object constancy).
- **"Golden" for one visualization** = the Definition of Done in §9: complete bilingual manifest, sourced
  and validated data, responsive and accessible chart, settings in the URL, card preview + share page,
  `verify` green.

## 4. Scope
- **In:** the 30 catalog entries in `CATALOG.md` (38 legacy folders after merging EN/UA copies and
  superseded versions); the catalog shell; a reusable chart kit; the data prep pipeline (`data-raw/` →
  `public/data/`); share pages; the monthly "add a visualization" pipeline.
- **Out:** the learning exercises (`_examples/_removed`, `_examples/bar-chart-population`,
  `_examples/d3.html`); any backend, accounts, analytics or tracking; runtime requests to third‑party
  hosts; live data feeds (snapshots only).
- **Explicit exception (owner, 2026‑09‑25, S3‑an):** anonymous page counts with **GoatCounter** — one request
  per real navigation (the route path and its English title; the external referrer on the first view; the
  screen width) to `numbers-speak.goatcounter.com`, sent after the page is shown, only on the production host.
  No third‑party script, no cookies, no identifiers, no consent banner; nothing is sent for Do Not Track,
  Global Privacy Control, automated browsers or the owner's opt‑out; any failure is silent. Settings in the
  query are never counted as pages. Everything else in **Out** stays out (no tracking beyond page counts, no
  other third‑party host).
- **Weighting:** original Ukrainian content first (air strikes, volunteering, real estate, companies,
  settlements), then world rankings, then adapted gallery pieces.

## 5. Locked decisions — DO NOT re‑ask
| Topic | Decision |
|---|---|
| **Name / URL** | Repo = package = Pages path = `numbers-speak` → `https://endorrfin.github.io/numbers-speak/` (D1). |
| **Location** | `src/guides/numbers-speak/`; legacy pages copied to `_examples/` (gitignored); `src/D3` stays the read‑only original (D2). |
| **Stack** | Vite 8 + React 19 + TypeScript 6 (strict) + D3 7.9 (npm) + `@types/d3`. No router library — hash router. No runtime third‑party requests (D3) — except the GoatCounter page counter (§4, S3‑an). |
| **Content model** | One folder per visualization, `src/viz/<id>/`: `meta.ts` (typed `VizMeta` manifest, the SSOT) + `index.tsx` (the page body). `scripts/gen-catalog.ts` generates `src/catalog/catalog.generated.ts`; `check:catalog` fails on a stale index. |
| **Taxonomy** | 5 topic tabs (`ukraine`, `world`, `economy`, `security`, `knowledge`) + "All" + "New" (≤ 30 days). One primary tab, any number of secondary ones; facets: chart kind, geography, origin, language (D4). |
| **Merges** | 5 EN/UA pairs → 1 entry each; 3 brand‑race versions → one 2000–2025 entry; simple + detailed time of life → 1 (D5). |
| **Language** | Bilingual EN/UA with a runtime toggle; every human‑readable string is `Localized {en, uk}`; technical terms stay English; EN first, UA second. |
| **Data** | Static snapshots with source URL + retrieval date; cleaned at prep time (numbers as numbers, ISO codes, enums, computed derived values); raw files + prep scripts in `data-raw/` (committed, not deployed) (D9). |
| **Attribution** | Adapted examples are published with their licence notice and a link; the Iceland pyramid is re‑implemented (D6). |
| **Theme** | Dark editorial by default with a light mode; fonts Fraunces · Inter · JetBrains Mono. The chart palette is chosen in S2 (colour‑blind‑safe option required). |
| **Deploy** | GitHub Pages via Actions: PRs run the verify gate; pushes to `main` build and deploy. `vite base: './'` + hash routing; static share pages `/v/<id>/` for link previews (P5). |
| **Golden visualization** | `gdp-by-country` on the reusable `RankedBar` component (S2). |
| **MVP** | 16 entries (phases P0–P3); target date open (D8). |
| **Legacy** | `Endorrfin/js-24` (`D3/`) stays as an archive; its README will point to this site (D7). |
| **Cross‑links** | After the MVP: a card on the portfolio landing; links to related guides (D10). |
| **Tooling** | Node 22 LTS; TS strict + `noUnusedLocals/Parameters`; ESLint flat config; `npm run verify` green before every merge. |

## 6. Constraints & non‑negotiables
- **Correctness mandate.** Every published number has a source with a retrieval date. Web‑verify
  version‑ and date‑sensitive facts. The open data questions in `CATALOG.md` §E block publication of the
  entries they affect.
- **Content lives only in `src/viz/*` and `public/data/*`** — never hand‑edit generated files or `dist/`.
- **Accessibility:** keyboard‑operable controls, visible focus, `role="img"` + label on charts,
  `prefers-reduced-motion` fallback for every animation, contrast‑checked palette.
- **Security:** never build HTML from data (`.text()`, not `.html()`); no third‑party requests at runtime
  (sole exception: the GoatCounter page counter, §4 — a beacon, no third‑party code in the page);
  no secrets in the repo; Dependabot on for npm and Actions.
- **Licences:** code MIT; data under its sources' terms; adapted code keeps its notice.
- **Sandbox gotchas:** agent sessions never run git against the live repo and never `npm install` in it
  (native macOS binaries); verification happens in a scratch copy; the owner commits, pushes and deploys.

## 7. Deliverables
The site (primary) · bilingual `README.md` · `CLAUDE.md` (current) · `CATALOG.md` (current) ·
`docs/PLAN.md` (reasoning) · `CHANGELOG.md` (from the first published visualization).

## 8. Working agreement
- **Plan → approve → build.** Big steps get a short plan the owner signs off before implementation.
- **Cadence:** one phase or one wave per session, golden quality; speed is not a priority.
- **Verify every session:** `npm run verify` + a fact spot‑check.
- **The 8 working rules:** (1) specific, not generic; (2) brief "why"; (3) describe the change + why before
  doing it; (4) mark edits `// CHANGED (SN):`; (5) lint‑aware; (6) reliability, security, best practice
  first; (7) ask when unclear; (8) don't just agree — challenge wrong or partial reasoning.
- **Branches:** `sN-short-topic` for phases; `viz/<yyyy-mm>-<id>` for monthly additions.
  **Commit titles:** `📊 Numbers Speak SN: <what>` + a short description. The owner commits.
- **Session summary:** (1) what was done; (2) branch + commit title + description; (3) challenges/questions.

## 9. Definition of Done
- **Per visualization:** manifest complete in EN and UA; ≥ 1 https source with a retrieval date; origin and
  licence; dataset passes its schema; responsive at 360 / 768 / 1280 px; keyboard‑operable controls,
  visible focus, chart label, reduced‑motion fallback; text‑only tooltips; state in the URL; card preview
  (`preview.ts`, S3‑th) and share page; `verify` green.
- **Per session:** the session's scope meets the above + verification run + summary + `CLAUDE.md` log.
- **Project:** 30 entries published; shared settings, export, search and share pages (P5); the monthly
  pipeline (P6); linked from the portfolio landing.

## 10. Decision rights
- **Decide yourself:** component structure and naming; micro‑UX and copy; chart details within the locked
  palette; verification details; order of entries inside a wave.
- **Ask the owner first:** adding or dropping entries or tabs; changing stack, theme or language policy;
  anything that changes published URLs or breaks the manifest contract; publishing an entry with an open
  data question; spending money; destructive or irreversible actions.

## 11. Clarifying questions — answered (2026‑09‑17)
Reader → curious public in EN/UA + engineers · Public portfolio → yes · Success → trustworthy, clear,
shareable charts · Boundaries → §4 · Seed → the legacy pages in `_examples/`, go beyond them · Depth → one
well‑explained chart per entry · Fact freshness → retrieval dates, yearly refresh · Interactivity →
settings per chart + shared settings · Languages → EN/UA · Theme → dark editorial + light ·
Stack/hosting → §5 · Cadence → quality over speed; 1–4 new entries per month after the migration ·
Verification → `npm run verify` · Where content is edited → `src/viz/*`, `public/data/*`, `data-raw/*` ·
Decision rights → §10 · Environment → owner runs npm/git on macOS.

## 12. How to start a session (bootstrap ritual)
1. Read `CLAUDE.md` fully, then the relevant rows of `CATALOG.md`, then the existing `src/viz/*` and
   `src/charts/*` patterns.
2. Confirm the session's target (phase or wave) and restate the plan briefly.
3. Build to the golden bar; verify data against its source; fill `sources` with retrieval dates.
4. Verify: `npm run verify` in a scratch copy (never `npm install` or git in the live folder).
5. Update the `CLAUDE.md` status log and deliver the 3‑part session summary.
