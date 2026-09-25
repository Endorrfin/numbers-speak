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
- **No runtime third‑party requests** — D3 and fonts are bundled; data files are static snapshots. The one
  exception is the anonymous visit counter below.

## Visit statistics

To see how many people open the gallery and which visualizations they read, the site counts page views with
[GoatCounter](https://www.goatcounter.com) — with its own small client (`src/lib/analytics.ts`, ≈ 0.85 kB gzip), not
GoatCounter's script.

- **What is sent:** one request per page you open — the page's route (`/#/`, `/#/t/<tab>`, `/#/v/<id>`,
  `/#/about`, `/#/404`) and its English title, the site you came from (first page only) and your screen width.
  Filters and chart settings (`?region=…`, `?show=…`) are not pages and are never sent.
- **What is not:** no cookies, no identifier stored in your browser, no consent banner or pop‑up. Like any web
  request, it carries your IP address and User‑Agent; GoatCounter uses them only to tell unique visits apart
  (in memory, up to 8 hours) and stores neither ([how](https://www.goatcounter.com/help/sessions)); country,
  region and browser collection are switched off in the site's GoatCounter settings.
- **When nothing is sent:** Do Not Track or Global Privacy Control is on; the browser is automated; the site
  runs anywhere but `endorrfin.github.io` (localhost, a fork, a preview); the dev build.
- **Never in your way:** the request goes after the page is shown, is never retried, and a blocker, being
  offline or GoatCounter being down changes nothing on the page.
- **Owner's own visits:** `#/about?no-count=1` switches counting off in that browser (`?no-count=0` back on).

## Tech

Vite 8 · React 19 · TypeScript 6 (strict) · D3 7.9 · ESLint · GitHub Actions → GitHub Pages.
A tiny hash router (`#/`, `#/t/<tab>`, `#/v/<id>`, `#/about`) with `vite base: './'` works under any
Pages sub‑path.

## Local development

```bash
npm install          # the owner runs this (native macOS binaries)
npm run dev          # regenerates the catalog, copies flags, starts Vite
npm run prep -- <id> # data-raw/<id>/prep.ts → public/data/<id>/ (validated)
npm run verify       # typecheck → lint → check:catalog → check:data → test → smoke → build
npm run preview      # preview the production build
```

## Project layout

```
src/
  catalog/     VizMeta contract · tabs & labels · pure filters · catalog.generated.ts (generated)
  viz/<id>/    meta.ts (manifest) + index.tsx (page body) + data.ts (dataset parser) + state.ts (URL state)
  charts/      reusable D3 renderers (RankedBar) · hooks (width, reduced motion) · palette
  components/  layout · catalog (tabs, filters, cards) · viz (page, about data) · pages
  i18n/ lib/ theme/
scripts/       gen-catalog · check-catalog · check-data · prep · sync-flags · smoke · run-tests + test-*.ts
data-raw/<id>/ raw files + prep.ts (committed, not deployed) · public/data/<id>/ cleaned JSON
docs/PLAN.md   the implementation plan · CATALOG.md the content plan · PROJECT-BRIEF.md · CLAUDE.md
```

## Adding a visualization

Copy the golden entry `src/viz/gdp-by-country/` (data.ts → state.ts → index.tsx) and `data-raw/gdp-by-country/`.

1. Create `src/viz/<id>/meta.ts` (a `defineViz({...})` manifest) and `src/viz/<id>/index.tsx`.
2. Raw files and `prep.ts` in `data-raw/<id>/`; `npm run prep -- <id>` writes `public/data/<id>/`;
   `src/viz/<id>/data.ts` exports `validateDataFile` (checked by `check:data`).
3. `npm run gen:catalog`, then `npm run verify`. Open a PR from `viz/<yyyy-mm>-<id>`.

## Licence

- **Code** — [MIT](LICENSE).
- **Data** keeps the terms of its original sources; every visualization lists its sources and licence.
- **Adapted examples** (e.g. from the D3 gallery) keep their original notice (ISC).
- **Flags** — [flag-icons](https://github.com/lipis/flag-icons) (MIT).

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
- **Жодних сторонніх запитів під час роботи** — D3 і шрифти в бандлі; дані — статичні знімки. Єдиний
  виняток — знеособлений лічильник відвідувань нижче.

## Статистика відвідувань

Щоб бачити, скільки людей відкривають галерею і які візуалізації читають, сайт рахує перегляди сторінок через
[GoatCounter](https://www.goatcounter.com) — власним невеликим клієнтом (`src/lib/analytics.ts`, ≈ 0,85 кБ gzip), а не
скриптом GoatCounter.

- **Що надсилається:** один запит на кожну відкриту сторінку — її маршрут (`/#/`, `/#/t/<tab>`, `/#/v/<id>`,
  `/#/about`, `/#/404`) і англійська назва, сайт, з якого ви прийшли (лише для першої сторінки), і ширина
  екрана. Фільтри й налаштування графіків (`?region=…`, `?show=…`) — не сторінки й ніколи не надсилаються.
- **Чого немає:** cookies, ідентифікаторів у вашому браузері, банерів згоди чи спливних вікон. Як і будь‑який
  вебзапит, він містить вашу IP‑адресу та User‑Agent; GoatCounter використовує їх лише щоб розрізнити
  унікальні візити (у пам’яті, до 8 годин), і не зберігає ні того, ні іншого
  ([як саме](https://www.goatcounter.com/help/sessions)); збір країни, регіону й браузера вимкнено в
  налаштуваннях сайту в GoatCounter.
- **Коли не надсилається нічого:** увімкнено Do Not Track або Global Privacy Control; браузер автоматизований;
  сайт працює не на `endorrfin.github.io` (localhost, форк, прев’ю); dev‑збірка.
- **Не заважає:** запит іде після показу сторінки, ніколи не повторюється, а блокувальник, офлайн чи
  недоступність GoatCounter нічого на сторінці не змінюють.
- **Власні візити власника:** `#/about?no-count=1` вимикає підрахунок у цьому браузері (`?no-count=0` — вмикає).

## Стек і команди

Той самий стек і ті самі команди, що в англомовному блоці (`npm run dev | verify | preview`).
`npm install`, коміти й деплой виконує власник.

## Як додати візуалізацію

Зразок — «золотий» запис `src/viz/gdp-by-country/` (data.ts → state.ts → index.tsx) і `data-raw/gdp-by-country/`.

1. Створіть `src/viz/<id>/meta.ts` (маніфест `defineViz({...})`) і `src/viz/<id>/index.tsx`.
2. Сирі файли й `prep.ts` — у `data-raw/<id>/`; `npm run prep -- <id>` пише `public/data/<id>/`;
   `src/viz/<id>/data.ts` експортує `validateDataFile` (перевіряє `check:data`).
3. `npm run gen:catalog`, потім `npm run verify`. PR — з гілки `viz/<yyyy-mm>-<id>`.

## Ліцензія

- **Код** — [MIT](LICENSE).
- **Дані** — за умовами першоджерел; кожна візуалізація вказує свої джерела й ліцензію.
- **Адаптовані приклади** (напр., з D3 gallery) зберігають оригінальне повідомлення (ISC).
