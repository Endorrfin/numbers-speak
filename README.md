# Numbers Speak · Цифри говорять

Interactive, bilingual (EN/UA) data visualizations built with **D3.js, React and TypeScript** —
Ukraine and the world in numbers. Every chart can be configured, shared by link and traced to its sources.

**Live:** https://endorrfin.github.io/numbers-speak/
**Author:** Vasyl Krupka · Ukraine
**Status:** S1 — the gallery shell is live; visualizations are being ported (see [CATALOG.md](CATALOG.md)).

---

## What's here

- **A gallery with topic tabs** — Ukraine · World & people · Economy & business · Security & peace ·
  Knowledge & life, plus All and New; filters by chart type, geography and origin; search in both languages.
- **A page per visualization** — the chart with its settings, a shareable URL that keeps those settings,
  and panels "About the data" (description, sources with retrieval dates, licence, data download) and
  "How it's built".
- **Bilingual at the data layer** — every string is `{ en, uk }`; technical terms stay English.
- **No runtime third‑party requests** — D3 and fonts are bundled; data files are static snapshots.

## Tech

Vite 8 · React 19 · TypeScript 6 (strict) · D3 7.9 · ESLint · GitHub Actions → GitHub Pages.
A tiny hash router (`#/`, `#/t/<tab>`, `#/v/<id>`, `#/about`) with `vite base: './'` works under any
Pages sub‑path.

## Local development

```bash
npm install          # the owner runs this (native macOS binaries)
npm run dev          # regenerates the catalog, starts Vite
npm run verify       # typecheck → lint → check:catalog → check:data → test → smoke → build
npm run preview      # preview the production build
```

## Project layout

```
src/
  catalog/     VizMeta contract · tabs & labels · pure filters · catalog.generated.ts (generated)
  viz/<id>/    meta.ts (manifest) + index.tsx (page body) — one folder per visualization
  components/  layout · catalog (tabs, filters, cards) · viz (page, about data) · pages
  i18n/ lib/ theme/
scripts/       gen-catalog · check-catalog · check-data · smoke · run-tests + test-*.ts
docs/PLAN.md   the implementation plan · CATALOG.md the content plan · PROJECT-BRIEF.md · CLAUDE.md
```

## Adding a visualization

1. Create `src/viz/<id>/meta.ts` (a `defineViz({...})` manifest) and `src/viz/<id>/index.tsx`.
2. Put the data in `public/data/<id>/` (raw files and prep scripts in `data-raw/<id>/`).
3. `npm run gen:catalog`, then `npm run verify`. Open a PR from `viz/<yyyy-mm>-<id>`.

## Licence

- **Code** — [MIT](LICENSE).
- **Data** keeps the terms of its original sources; every visualization lists its sources and licence.
- **Adapted examples** (e.g. from the D3 gallery) keep their original notice (ISC).

---

# Цифри говорять · Numbers Speak

Інтерактивні двомовні (EN/UA) візуалізації даних на **D3.js, React і TypeScript** — Україна і світ
у цифрах. Кожен графік можна налаштувати, поділитися ним за посиланням і перевірити його джерела.

**Сайт:** https://endorrfin.github.io/numbers-speak/ · **Автор:** Vasyl Krupka · Україна
**Статус:** S1 — оболонка галереї працює; візуалізації переносяться (див. [CATALOG.md](CATALOG.md)).

## Що тут

- **Галерея з тематичними вкладками** — Україна · Світ і люди · Економіка й бізнес · Безпека й мир ·
  Знання й життя, а також «Усі» та «Нові»; фільтри за типом графіка, географією й походженням; пошук
  обома мовами.
- **Окрема сторінка для кожної візуалізації** — графік із налаштуваннями, посилання, що зберігає ці
  налаштування, і панелі «Про дані» (опис, джерела з датами отримання, ліцензія, завантаження даних) та
  «Як побудовано».
- **Двомовність на рівні даних** — кожен рядок `{ en, uk }`; технічні терміни лишаються англійською.
- **Жодних сторонніх запитів під час роботи** — D3 і шрифти в бандлі; дані — статичні знімки.

## Стек і команди

Той самий стек і ті самі команди, що в англомовному блоці (`npm run dev | verify | preview`).
`npm install`, коміти й деплой виконує власник.

## Як додати візуалізацію

1. Створіть `src/viz/<id>/meta.ts` (маніфест `defineViz({...})`) і `src/viz/<id>/index.tsx`.
2. Покладіть дані в `public/data/<id>/` (сирі файли й скрипти підготовки — у `data-raw/<id>/`).
3. `npm run gen:catalog`, потім `npm run verify`. PR — з гілки `viz/<yyyy-mm>-<id>`.

## Ліцензія

- **Код** — [MIT](LICENSE).
- **Дані** — за умовами першоджерел; кожна візуалізація вказує свої джерела й ліцензію.
- **Адаптовані приклади** (напр., з D3 gallery) зберігають оригінальне повідомлення (ISC).
