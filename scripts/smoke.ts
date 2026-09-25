/*
 * smoke.ts — SSR/render smoke (standard §4.6). `npm run smoke` runs it; CI runs it before build.
 * Renders with react-dom/server, in BOTH languages:
 *   A. every visualization body (through its lazy loader),
 *   B. every catalog tab (with and without filters), the About and 404 pages,
 *   C. every visualization page + an unknown id,
 *   D. the <App/> shell across representative and bogus hashes,
 *   E. every visualization body in its READY state — its data files primed from public/data (S2).
 * D3 runs in effects, which SSR doesn't execute — chart drawing is checked in jsdom
 * (scripts/test-ranked-bar.ts).
 * createElement only (no JSX), so this stays a plain .ts that tsconfig.node.json typechecks.
 */
import { register } from 'node:module';
register('./css-stub-hooks.mjs', import.meta.url);

import { createElement as h } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// ── Minimal browser shim ─────────────────────────────────────────────────────────────────────────
let currentLang: 'en' | 'uk' = 'en';
const g = globalThis as Record<string, unknown>;
const def = (k: string, v: unknown): void => {
  try {
    g[k] = v;
  } catch {
    Object.defineProperty(g, k, { value: v, configurable: true, writable: true });
  }
};
const noop = (): void => {};
def('window', globalThis);
def('localStorage', {
  // Key-aware: the language key returns the pass language; everything else (theme) is unset.
  getItem: (key: string) => (key.endsWith('.lang') ? currentLang : null),
  setItem: noop,
  removeItem: noop,
  clear: noop,
});
def('matchMedia', (q: string) => ({
  matches: false,
  media: q,
  onchange: null,
  addEventListener: noop,
  removeEventListener: noop,
  addListener: noop,
  removeListener: noop,
  dispatchEvent: () => false,
}));
def('document', {
  documentElement: { lang: '', style: {}, setAttribute: noop, getAttribute: () => null },
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementById: () => null,
  addEventListener: noop,
  removeEventListener: noop,
});
def('location', { hash: '', pathname: '/numbers-speak/', search: '', href: 'https://endorrfin.github.io/numbers-speak/' });
def('history', { state: null, replaceState: noop });
def('addEventListener', noop);
def('removeEventListener', noop);

// CHANGED (S3-an): network spies — rendering must never send a request. The page-view counter runs in an
// effect (SSR never runs effects) and counts only on the production host; asserted at the end of main().
const network = { fetch: 0, beacon: 0, image: 0 };
def('fetch', () => {
  network.fetch++;
  return Promise.reject(new Error('no network in the smoke'));
});
if (!g.navigator) def('navigator', {});
Object.defineProperty(g.navigator as object, 'sendBeacon', {
  configurable: true,
  value: () => {
    network.beacon++;
    return true;
  },
});
def('Image', function Image() {
  network.image++;
  return {};
});

// Legacy server APIs log about Suspense when lazy routes suspend — expected; real errors still surface.
const NOISE = ['renderToStaticMarkup', 'renderToString', 'Suspense', 'hydrat', 'renderToPipeableStream'];
const origError = console.error.bind(console);
console.error = (...args: unknown[]): void => {
  if (NOISE.some((n) => String(args[0] ?? '').includes(n))) return;
  origError(...(args as Parameters<typeof origError>));
};

let checks = 0;
let failures = 0;
function ok(cond: boolean, msg: string): void {
  checks++;
  if (!cond) {
    failures++;
    console.error('  ✖ ' + msg);
  }
}

async function main(): Promise<void> {
  const { LangProvider } = await import('../src/i18n/LangProvider');
  const { AppStateProvider } = await import('../src/components/AppStateProvider');
  const { App } = await import('../src/App');
  const { CatalogPage } = await import('../src/components/catalog/CatalogPage');
  const { VizPage } = await import('../src/components/viz/VizPage');
  const { AboutPage } = await import('../src/components/pages/AboutPage');
  const { NotFound } = await import('../src/components/pages/NotFound');
  const { CATALOG, getVizLoader } = await import('../src/catalog');
  const { TAB_IDS } = await import('../src/catalog/filter');

  const langs = ['en', 'uk'] as const;

  function ssr(el: ReactNode, lang: 'en' | 'uk'): string {
    currentLang = lang;
    return renderToStaticMarkup(h(LangProvider, null, h(AppStateProvider, null, el)));
  }

  function check(label: string, el: ReactNode, lang: 'en' | 'uk', min: number, includes: string[] = []): string {
    let html = '';
    try {
      html = ssr(el, lang);
    } catch (e) {
      ok(false, `${label} [${lang}] threw: ${(e as Error).message}`);
      return html;
    }
    ok(html.length >= min, `${label} [${lang}] renders (${html.length} ≥ ${min} chars)`);
    for (const s of includes) ok(html.includes(s), `${label} [${lang}] contains "${s}"`);
    return html;
  }

  // ── A: every visualization body, through its lazy loader ───────────────────────────────────────
  for (const meta of CATALOG) {
    const loader = getVizLoader(meta.id);
    ok(Boolean(loader), `loader exists for ${meta.id}`);
    if (!loader) continue;
    const Body = (await loader()).default as ComponentType<{ params: object; setParams: () => void }>;
    ok(typeof Body === 'function', `${meta.id}: default export is a component`);
    // CHANGED (S2): before its data loads, a body shows its loading state (short, but not empty).
    for (const lang of langs) check(`body:${meta.id}`, h(Body, { params: {}, setParams: noop }), lang, 30);
  }

  // ── B: catalog tabs, About, 404 ────────────────────────────────────────────────────────────────
  const first = CATALOG[0];
  for (const tab of TAB_IDS) {
    for (const lang of langs) check(`catalog:${tab}`, h(CatalogPage, { tab, params: {} }), lang, 800);
  }
  if (first) {
    check('catalog:all', h(CatalogPage, { tab: 'all', params: {} }), 'en', 800, [first.title.en, `#/v/${first.id}`]);
    check('catalog:all', h(CatalogPage, { tab: 'all', params: {} }), 'uk', 800, [first.title.uk]);
    check('catalog:search-hit', h(CatalogPage, { tab: 'all', params: { q: first.title.en.split(' ')[0] } }), 'en', 800, [first.title.en]);
  }
  check('catalog:search-miss', h(CatalogPage, { tab: 'all', params: { q: 'zzzz-no-match' } }), 'en', 500, ['Clear filters']);
  check('catalog:bad-params', h(CatalogPage, { tab: 'world', params: { chart: 'pie', origin: '<script>' } }), 'en', 500);

  // CHANGED (S3-th): card previews — every published card shows its data preview with the key figure in the
  // page language and at most three flags; an entry without a preview falls back to the chart-kind glyph.
  const { getPreview } = await import('../src/catalog/previews');
  const { formatKeyValue } = await import('../src/components/catalog/previewFormat');
  const { VizCard } = await import('../src/components/catalog/VizCard');
  const published = CATALOG.filter((m) => m.status === 'published');
  for (const lang of langs) {
    const html = check('catalog:previews', h(CatalogPage, { tab: 'all', params: {} }), lang, 800);
    const count = (html.match(/class="cp"/g) ?? []).length;
    ok(count === published.length, `catalog:previews [${lang}] ${count} previews for ${published.length} published entries`);
    for (const m of published) {
      const p = getPreview(m.id);
      ok(Boolean(p), `a preview exists for ${m.id}`);
      if (p) ok(html.includes(formatKeyValue(p.key, lang)), `catalog:previews [${lang}] shows the key figure of ${m.id}`);
    }
    ok(html.includes('flags/4x3/in.svg'), `catalog:previews [${lang}] draws flags`);
  }
  if (first) {
    const fallback = check('card:fallback', h(VizCard, { meta: { ...first, id: 'no-preview-entry' }, isNew: false }), 'en', 100, [
      'class="glyph"',
    ]);
    ok(!fallback.includes('class="cp"'), 'card:fallback shows no preview');
  }
  for (const lang of langs) check('about', h(AboutPage), lang, 1500);
  check('about', h(AboutPage), 'en', 1500, ['Every number has a source']);
  check('about', h(AboutPage), 'uk', 1500, ['Кожне число має джерело']);
  // CHANGED (S3-an): the statistics panel in both languages; the owner's opt-out line only with ?no-count=1.
  check('about:stats', h(AboutPage), 'en', 1500, ['Anonymous visit counts', 'GoatCounter', 'Global Privacy Control']);
  check('about:stats', h(AboutPage), 'uk', 1500, ['Знеособлена статистика', 'GoatCounter', 'Global Privacy Control']);
  ok(!ssr(h(AboutPage), 'en').includes('Visits from this browser'), 'about: no opt-out line for visitors');
  check('about:no-count', h(AboutPage, { params: { 'no-count': '1' } }), 'en', 1500, ['Visits from this browser are not counted']);
  check('about:no-count', h(AboutPage, { params: { 'no-count': '1' } }), 'uk', 1500, ['Візити з цього браузера не рахуються']);
  ok(!ssr(h(AboutPage, { params: { 'no-count': '0' } }), 'en').includes('Visits from this browser'), 'about: ?no-count=0 hides the line');
  for (const lang of langs) check('notFound', h(NotFound), lang, 150);

  // ── C: every visualization page + an unknown id ───────────────────────────────────────────────
  for (const meta of CATALOG) {
    check(`viz:${meta.id}`, h(VizPage, { id: meta.id, params: {} }), 'en', 1200, [meta.title.en, 'About the data']);
    check(`viz:${meta.id}`, h(VizPage, { id: meta.id, params: {} }), 'uk', 1200, [meta.title.uk, 'Про дані']);
  }
  check('viz:unknown', h(VizPage, { id: 'does-not-exist', params: {} }), 'en', 150, ['There is no visualization']);

  // ── D: the app shell and the hash router ───────────────────────────────────────────────────────
  const loc = g.location as { hash: string };
  const hashes = ['', '#/', '#/t/ukraine', '#/t/new?q=gdp', '#/about', '#/t/bogus', '#/nope/deeper', '#/v/NOT_VALID'];
  if (first) hashes.push(`#/v/${first.id}`, `#/v/${first.id}?page=2`);
  for (const hash of hashes) {
    loc.hash = hash;
    for (const lang of langs) check(`App ${hash || '(empty)'}`, h(App), lang, 600);
  }
  loc.hash = '#/t/bogus';
  check('App 404', h(App), 'en', 600, ['Page not found']);
  loc.hash = '';

  // ── E: every body in its ready state (data primed from public/data) ─────────────────────────────
  // CHANGED (S2): renders controls, legend and table with the real dataset, and hostile params.
  const { readFileSync } = await import('node:fs');
  const { primeDataset, dataUrl } = await import('../src/lib/useDataset');
  for (const meta of CATALOG) {
    if (meta.data.length === 0) continue;
    for (const file of meta.data) {
      primeDataset(dataUrl(meta.id, file), JSON.parse(readFileSync(`public/data/${meta.id}/${file}`, 'utf8')));
    }
    const Body = (await getVizLoader(meta.id)!()).default as ComponentType<{ params: object; setParams: () => void }>;
    const variants: Array<Record<string, string>> = [
      {},
      { view: 'table' },
      { region: 'europe', page: '2' },
      { region: '<script>', page: '999', view: 'x' },
    ];
    for (const params of variants) {
      for (const lang of langs) {
        const html = check(`ready:${meta.id} ${JSON.stringify(params)}`, h(Body, { params, setParams: noop }), lang, 600);
        ok(!html.includes('<script>'), `ready:${meta.id} [${lang}] never echoes params as markup`);
      }
    }
  }
  if (CATALOG.some((m) => m.id === 'gdp-by-country')) {
    const { default: Gdp } = await import('../src/viz/gdp-by-country/index');
    // CHANGED (S3-gdp): default = total GDP 2025; per-capita and 2023 views; marked values.
    check('ready:gdp chart', h(Gdp, { params: {}, setParams: noop }), 'en', 600, ['role="img"', 'Showing 1–15 of 218', 'Americas', 'GDP per capita', '2023']);
    check('ready:gdp table', h(Gdp, { params: { view: 'table' }, setParams: noop }), 'en', 5000, ['<table', 'United States', '30,769.7', 'Tuvalu', 'IMF estimate']);
    check('ready:gdp 2023 table', h(Gdp, { params: { year: '2023', view: 'table' }, setParams: noop }), 'en', 5000, ['27,720.7', '181 rows']);
    check('ready:gdp table uk', h(Gdp, { params: { view: 'table' }, setParams: noop }), 'uk', 5000, ['Україна', 'Сполучені Штати', 'оцінка МВФ']);
    const pcChart = check('ready:gdp per capita', h(Gdp, { params: { metric: 'per-capita' }, setParams: noop }), 'en', 600, ['World average GDP per capita, 2025', 'Monaco']);
    ok(!pcChart.includes('>2023<'), 'ready:gdp per capita offers no 2023 year');
    check('ready:gdp per capita table uk', h(Gdp, { params: { metric: 'per-capita', year: '2024', view: 'table' }, setParams: noop }), 'uk', 5000, ['Люксембург', '× світового середнього']);
    const europe = check('ready:gdp europe', h(Gdp, { params: { region: 'europe', view: 'table' }, setParams: noop }), 'en', 2000, ['Germany']);
    ok(!europe.includes('United States'), 'ready:gdp europe filter excludes the Americas');
  }

  // CHANGED (S3-bd): births & deaths — every angle, the table and both languages with the real dataset.
  if (CATALOG.some((m) => m.id === 'births-deaths-ua')) {
    const { default: Bd } = await import('../src/viz/births-deaths-ua/index');
    const { SHOWS } = await import('../src/viz/births-deaths-ua/state');
    check('ready:births-deaths chart', h(Bd, { params: {}, setParams: noop }), 'en', 1500, [
      'role="img"',
      '168.8k',
      '485.3k',
      '2.88×',
      '9.29 million',
      'The gap',
      'Deaths per birth',
      'Coverage changed',
    ]);
    check('ready:births-deaths uk', h(Bd, { params: {}, setParams: noop }), 'uk', 1500, ['168,8 тис.', 'Розрив', 'Облік змінювався']);
    for (const show of SHOWS) {
      for (const lang of langs) {
        const html = check(`ready:births-deaths ${show}`, h(Bd, { params: { show }, setParams: noop }), lang, 1500, ['role="img"']);
        ok(html.includes('class="is-on"'), `ready:births-deaths ${show} [${lang}] marks the active angle`);
      }
    }
    check('ready:births-deaths table', h(Bd, { params: { view: 'table' }, setParams: noop }), 'en', 3000, [
      '<table',
      '657,200',
      '472,700',
      '2014*',
      '2025**',
      '−440,500',
    ]);
  }

  // CHANGED (S3-bdd): born & died per day — clock, KPIs, chart, table, filters and both languages.
  if (CATALOG.some((m) => m.id === 'births-deaths-per-day')) {
    const { default: Pd } = await import('../src/viz/births-deaths-per-day/index');
    check('ready:per-day chart', h(Pd, { params: {}, setParams: noop }), 'en', 1500, [
      'role="img"',
      'role="timer"',
      'Since you opened this page',
      'Pause',
      '362,714',
      '174,194',
      '+188,520',
      '2.18×',
      'Showing 1–15 of 235',
      'Find Ukraine',
      'UN estimates',
    ]);
    check('ready:per-day uk', h(Pd, { params: {}, setParams: noop }), 'uk', 1500, [
      'Відколи ви відкрили цю сторінку',
      '362\u00a0714',
      'Знайти: Україна',
      '2,18×',
    ]);
    check('ready:per-day table', h(Pd, { params: { view: 'table' }, setParams: noop }), 'en', 5000, [
      '<table',
      'India',
      '62,939',
      'Ukraine',
      '−780',
      'is-home',
      '—',
    ]);
    const africa = check('ready:per-day africa', h(Pd, { params: { region: 'africa', view: 'table' }, setParams: noop }), 'en', 2000, ['Nigeria']);
    ok(!africa.includes('>India<') && !africa.includes(' India<'), 'ready:per-day africa filter excludes Asia');
    const asia = check('ready:per-day asia', h(Pd, { params: { region: 'asia' }, setParams: noop }), 'en', 1000);
    ok(!asia.includes('Find Ukraine'), 'ready:per-day hides "Find Ukraine" when Ukraine is filtered out');
    // CHANGED (S3-bdd2): region chips, the "deaths > births" filter and the sort keys.
    const chips = check('ready:per-day chips', h(Pd, { params: {}, setParams: noop }), 'en', 1500, [
      'aria-pressed="true"',
      'Deaths &gt; births (47)',
      'Sort',
    ]);
    ok(chips.includes('Africa') && chips.includes('Oceania'), 'ready:per-day offers every region in one click');
    const shrinking = check(
      'ready:per-day shrinking',
      h(Pd, { params: { only: 'shrinking', sort: 'ratio' }, setParams: noop }),
      'en',
      1500,
      ['47 countries and territories where more people die than are born', 'Ukraine'],
    );
    ok(!shrinking.includes('>1  India<') && !shrinking.includes('1  India'), 'ready:per-day shrinking drops growing countries');
    check('ready:per-day sort net', h(Pd, { params: { sort: 'net', view: 'table' }, setParams: noop }), 'en', 5000, ['China']);
    check('ready:per-day shrinking uk', h(Pd, { params: { only: 'shrinking' }, setParams: noop }), 'uk', 1500, [
      'Смертей більше (47)',
    ]);
  }

  // CHANGED (S3-tl): human life in numbers — every angle, both tables, filters and both languages.
  if (CATALOG.some((m) => m.id === 'time-of-life')) {
    const { default: Tl } = await import('../src/viz/time-of-life/index');
    const { SHOWS } = await import('../src/viz/time-of-life/state');
    check('ready:time-of-life chart', h(Tl, { params: {}, setParams: noop }), 'en', 1500, [
      'role="img"',
      '17.6 years',
      '10.2 years',
      'Life in weeks',
      'OECD average (30 countries)',
      'Women vs men',
      'Ukraine has no national time-use survey',
    ]);
    check('ready:time-of-life uk', h(Tl, { params: {}, setParams: noop }), 'uk', 1500, ['17,6 року', 'Життя в тижнях', 'Середнє по OECD (30 країн)']);
    for (const show of SHOWS) {
      for (const lang of langs) {
        const html = check(`ready:time-of-life ${show}`, h(Tl, { params: { show }, setParams: noop }), lang, 1500, ['role="img"']);
        ok(html.includes('class="is-on"'), `ready:time-of-life ${show} [${lang}] marks the active angle`);
      }
    }
    check('ready:time-of-life table', h(Tl, { params: { view: 'table' }, setParams: noop }), 'en', 3000, ['<table', 'Sleep', '2,600', 'Total', '17.56']);
    check('ready:time-of-life japan women', h(Tl, { params: { country: 'JP', sex: 'women', show: 'ranking', unit: 'hours' }, setParams: noop }), 'en', 1500, ['Japan · 2021', 'Women']);
    check('ready:time-of-life countries table', h(Tl, { params: { show: 'countries', measure: 'unpaid', view: 'table' }, setParams: noop }), 'en', 3000, ['<table', 'Japan', 'Mexico', 'Women − men']);
    const gender = check('ready:time-of-life gender', h(Tl, { params: { show: 'gender', measure: 'unpaid', country: 'JP' }, setParams: noop }), 'en', 1500, ['Unpaid work (OECD category)']);
    ok(!gender.includes('Japan · 2021'), 'ready:time-of-life gender hides the country picker');
  }

  // CHANGED (S3-br): global brands race — player, groups, table, strip, URL year, EN + UK.
  if (CATALOG.some((m) => m.id === 'global-brands-race')) {
    const { default: Br } = await import('../src/viz/global-brands-race/index');
    check('ready:brands chart', h(Br, { params: {}, setParams: noop }), 'en', 1500, [
      'role="img"',
      'type="range"',
      'Replay',
      '2025 · #1 Apple, $471bn · 100 brands ranked',
      'Technology &amp; media',
      'Share of the ranking',
    ]);
    check('ready:brands 2000', h(Br, { params: { year: '2000' }, setParams: noop }), 'en', 1500, ['Play', '#1 Coca-Cola', '75 brands ranked']);
    check('ready:brands uk', h(Br, { params: { year: '2010' }, setParams: noop }), 'uk', 1500, ['Відтворити', 'Технології й медіа', '№1 Coca-Cola']);
    check('ready:brands table', h(Br, { params: { view: 'table' }, setParams: noop }), 'en', 5000, [
      '<table',
      'Apple',
      '470.9',
      '−3.7%',
      'BlackRock',
      'new',
      'United States',
    ]);
    check('ready:brands table 2000', h(Br, { params: { view: 'table', year: '2000' }, setParams: noop }), 'en', 3000, ['72.5', 'Coca-Cola']);
    const auto = check('ready:brands auto table', h(Br, { params: { group: 'auto', view: 'table' }, setParams: noop }), 'en', 2000, ['Toyota', 'in Automotive']);
    ok(!auto.includes('>Apple<'), 'ready:brands group filter hides other groups');
    check('ready:brands table uk', h(Br, { params: { view: 'table' }, setParams: noop }), 'uk', 5000, ['Сполучені Штати', 'Технології', 'новий']);
  }

  // CHANGED (S3-aa): air attacks — every angle in EN + UK, KPIs, every table, a single year.
  if (CATALOG.some((m) => m.id === 'air-attacks-on-ukraine')) {
    const { default: Aa } = await import('../src/viz/air-attacks-on-ukraine/index');
    const { SHOWS: AA_SHOWS } = await import('../src/viz/air-attacks-on-ukraine/state');
    check('ready:air chart', h(Aa, { params: {}, setParams: noop }), 'en', 1500, [
      'role="img"',
      '119,405',
      '7,639',
      '87%',
      '61%',
      '823',
      'Launched and stopped',
      'Locationally lost (reported separately)',
      'How the numbers are counted',
    ]);
    check('ready:air uk', h(Aa, { params: {}, setParams: noop }), 'uk', 1500, ['Запущено й зупинено', 'Як пораховано числа', 'Збито або придушено']);
    for (const show of AA_SHOWS) {
      for (const lang of langs) {
        const html = check(`ready:air ${show}`, h(Aa, { params: { show }, setParams: noop }), lang, 1500, ['role="img"']);
        ok(html.includes('class="is-on"'), `ready:air ${show} [${lang}] marks the active angle`);
      }
    }
    check('ready:air 2025', h(Aa, { params: { year: '2025' }, setParams: noop }), 'en', 1500, ['54,536', 'In 2025']);
    check('ready:air week', h(Aa, { params: { step: 'week', year: '2026' }, setParams: noop }), 'en', 1500, ['per week']);
    check('ready:air timeline table', h(Aa, { params: { view: 'table' }, setParams: noop }), 'en', 5000, ['<table', 'September 2022 · partial', 'May 2026']);
    const types = check('ready:air types table', h(Aa, { params: { show: 'types', view: 'table' }, setParams: noop }), 'en', 3000, ['<table', 'Kh-101/Kh-555', 'Kalibr', 'Iskander-M']);
    ok(!types.includes('Shahed-136/131 &amp; decoys'), 'ready:air types table lists missiles only');
    check('ready:air types share', h(Aa, { params: { show: 'types', mode: 'share' }, setParams: noop }), 'en', 1500, ['Missiles by model']);
    check('ready:air rates table', h(Aa, { params: { show: 'interception', view: 'table' }, setParams: noop }), 'en', 2000, ['<table', 'Cruise missiles', 'All years']);
    check('ready:air largest table', h(Aa, { params: { show: 'largest', view: 'table' }, setParams: noop }), 'en', 2000, ['<table', '823', '17:00–09:30']);
    check('ready:air largest missiles', h(Aa, { params: { show: 'largest', rank: 'missiles' }, setParams: noop }), 'en', 1500, ['127']);
    check('ready:air civilians table', h(Aa, { params: { show: 'civilians', view: 'table' }, setParams: noop }), 'en', 2000, ['<table', '2,514', 'not published', '2026 (Jan–Aug)']);
    check('ready:air civilians uk', h(Aa, { params: { show: 'civilians', who: 'killed' }, setParams: noop }), 'uk', 1500, ['Далекобійні ракети й дрони']);
  }

  // ── Sanity: the language switch took ───────────────────────────────────────────────────────────
  // CHANGED (S3-rb): population by country — population and density metrics, table, region filter, EN + UK.
  if (CATALOG.some((m) => m.id === 'population-by-country')) {
    const { default: Pop } = await import('../src/viz/population-by-country/index');
    check('ready:population chart', h(Pop, { params: {}, setParams: noop }), 'en', 1500, [
      'role="img"',
      'Showing 1–15 of 237',
      'World population, 2025: 8.23bn',
      'Share of world population by region',
      '56.8%',
      'Density',
    ]);
    check('ready:population uk', h(Pop, { params: {}, setParams: noop }), 'uk', 1500, ['8,23\u00a0млрд', 'Щільність', 'Частка населення світу']);
    check('ready:population table', h(Pop, { params: { view: 'table' }, setParams: noop }), 'en', 5000, [
      '<table',
      '1,463,865,525',
      'Ukraine',
      '38,980,376*',
      'the UN includes Crimea',
      '237 rows',
    ]);
    const dens = check('ready:population density', h(Pop, { params: { metric: 'density' }, setParams: noop }), 'en', 1500, [
      'Showing 1–15 of 234',
      'Monaco',
      'World: 63/km²',
      'Land area by country',
      'Densest',
      'Sparsest',
    ]);
    ok(!dens.includes('Share of world population by region'), 'ready:population density has no share strip');
    check('ready:population density table', h(Pop, { params: { metric: 'density', view: 'table' }, setParams: noop }), 'en', 5000, [
      'Kosovo',
      'No land-area figure',
      'approximate',
      'People per km²',
    ]);
    check('ready:population density uk', h(Pop, { params: { metric: 'density', view: 'table' }, setParams: noop }), 'uk', 5000, ['Осіб на км²', 'Косово']);
    const europe = check('ready:population europe', h(Pop, { params: { region: 'europe', view: 'table' }, setParams: noop }), 'en', 2000, ['Germany']);
    ok(!europe.includes(' India</th>'), 'ready:population europe filter excludes Asia (the global KPI still names India)');
  }

  // CHANGED (S3-rb): GDP (PPP) per capita — three years, "× world average", table, region filter, EN + UK.
  if (CATALOG.some((m) => m.id === 'gdp-ppp-per-capita')) {
    const { default: Ppp } = await import('../src/viz/gdp-ppp-per-capita/index');
    check('ready:ppp chart', h(Ppp, { params: {}, setParams: noop }), 'en', 1500, [
      'role="img"',
      'Showing 1–15 of 185',
      'World average, 2025: $25,704',
      'Singapore',
      '130.9×',
      '80 / 185',
      'GDP by country',
    ]);
    check('ready:ppp uk', h(Ppp, { params: {}, setParams: noop }), 'uk', 1500, ['Світове середнє', 'Сінгапур', 'ПКС']);
    check('ready:ppp 2023 table', h(Ppp, { params: { year: '2023', view: 'table' }, setParams: noop }), 'en', 5000, [
      '<table',
      '197 rows',
      'Luxembourg',
      '152,596',
      'Ukraine',
      '0.76×',
    ]);
    const africa = check('ready:ppp africa', h(Ppp, { params: { region: 'africa', view: 'table' }, setParams: noop }), 'en', 2000, ['Burundi']);
    ok(!africa.includes(' Singapore</th>'), 'ready:ppp africa filter excludes Asia');
  }

  // CHANGED (S3-rb): robotization — top 15, joint Belgium & Luxembourg row, table, region filter, EN + UK.
  if (CATALOG.some((m) => m.id === 'robotization')) {
    const { default: Rb } = await import('../src/viz/robotization/index');
    check('ready:robots chart', h(Rb, { params: {}, setParams: noop }), 'en', 1500, [
      'role="img"',
      'Top 15 of the 22 economies',
      '9.2×',
      '9 / 15',
      'rank 22 of 22',
    ]);
    check('ready:robots uk', h(Rb, { params: {}, setParams: noop }), 'uk', 1500, ['Світове середнє', 'Бельгію й Люксембург']);
    const table = check('ready:robots table', h(Rb, { params: { view: 'table' }, setParams: noop }), 'en', 3000, [
      '<table',
      'South Korea',
      '1,220',
      'Belgium &amp; Luxembourg',
      '232*',
      'Taiwan',
    ]);
    ok(!table.includes(' China</th>'), 'ready:robots table shows the top 15 only (China is 22nd)');
    check('ready:robots table uk', h(Rb, { params: { view: 'table' }, setParams: noop }), 'uk', 3000, ['Бельгія і Люксембург', 'Південна Корея']);
    const asia = check('ready:robots asia', h(Rb, { params: { region: 'asia', view: 'table' }, setParams: noop }), 'en', 1500, ['Singapore']);
    ok(!asia.includes(' Germany</th>'), 'ready:robots asia filter excludes Europe');
  }

  // CHANGED (S3-rb): crime index — UNODC homicide rate (+ Numbeo when its file ships), table, filter, EN + UK.
  if (CATALOG.some((m) => m.id === 'crime-index')) {
    const { default: Cr } = await import('../src/viz/crime-index/index');
    const { default: crMeta } = await import('../src/viz/crime-index/meta');
    for (const file of crMeta.data) {
      primeDataset(dataUrl('crime-index', file), JSON.parse(readFileSync(`public/data/crime-index/${file}`, 'utf8')));
    }
    check('ready:crime chart', h(Cr, { params: {}, setParams: noop }), 'en', 1500, [
      'role="img"',
      'Showing 1–15 of 166',
      '>166</option>', // CHANGED (S3-fx): a last page of one row is one number, not "166–166"
      'World estimate, 2024: 5.1 per 100,000',
      'War deaths are not intentional homicides',
    ]);
    check('ready:crime uk', h(Cr, { params: {}, setParams: noop }), 'uk', 1500, ['Світова оцінка', 'на 100 000']);
    check('ready:crime table', h(Cr, { params: { view: 'table' }, setParams: noop }), 'en', 5000, [
      '<table',
      'Haiti',
      '7,574',
      'United Kingdom',
      'combined here',
      'Central Iraq only',
      'latest UNODC figure is for 2021',
    ]);
    const americas = check('ready:crime americas', h(Cr, { params: { region: 'americas', view: 'table' }, setParams: noop }), 'en', 2000, ['Haiti']);
    ok(!americas.includes(' Germany</th>'), 'ready:crime americas filter excludes Europe (Haiti is in the Americas)');
    if (crMeta.data.length > 1) {
      // CHANGED (S3-rb): Numbeo shipped — both tabs, its chart, its table order and the UK strings.
      check('ready:crime tabs', h(Cr, { params: {}, setParams: noop }), 'en', 1500, ['Homicide rate (UNODC)', 'Crime Index (Numbeo)']);
      check('ready:crime numbeo chart', h(Cr, { params: { show: 'numbeo' }, setParams: noop }), 'en', 1500, [
        'Showing 1–15 of 148',
        'Highest: Papua New Guinea, 80.8',
        'Numbeo 2026 Mid-Year',
        'Data © Numbeo',
      ]);
      const nt = check('ready:crime numbeo', h(Cr, { params: { show: 'numbeo', view: 'table' }, setParams: noop }), 'en', 3000, ['Safety Index', 'Numbeo', 'Andorra', '19.2']);
      ok(nt.indexOf('Jamaica') < nt.indexOf('Guyana'), 'ready:crime numbeo keeps Numbeo’s order for equal indexes (Jamaica before Guyana)');
      check('ready:crime numbeo uk', h(Cr, { params: { show: 'numbeo' }, setParams: noop }), 'uk', 1500, ['Індекс злочинності (Numbeo)', 'Дані © Numbeo']);
    } else {
      const fallback = check('ready:crime numbeo pending', h(Cr, { params: { show: 'numbeo' }, setParams: noop }), 'en', 1500, ['World estimate']);
      ok(!fallback.includes('Crime Index (Numbeo)'), 'ready:crime hides the Numbeo tab while its file is not shipped');
    }
  }

  // CHANGED (S3-rb): Global Peace Index 2026 — both orders, ties, the Honduras note, table, filter, EN + UK.
  if (CATALOG.some((m) => m.id === 'global-peace-index')) {
    const { default: Gp } = await import('../src/viz/global-peace-index/index');
    const { default: gpMeta } = await import('../src/viz/global-peace-index/meta');
    for (const file of gpMeta.data) {
      primeDataset(dataUrl('global-peace-index', file), JSON.parse(readFileSync(`public/data/global-peace-index/${file}`, 'utf8')));
    }
    check('ready:gpi chart', h(Gp, { params: {}, setParams: noop }), 'en', 1500, [
      'role="img"',
      'Showing 1–15 of 163',
      'First: 1 Iceland, 1.161',
      '99 countries became less peaceful, 62 more peaceful',
      'Most peaceful first',
      'educational, non-commercial purposes',
    ]);
    check('ready:gpi least', h(Gp, { params: { order: 'least' }, setParams: noop }), 'en', 1500, ['First: 163 Russia, 3.367']);
    check('ready:gpi uk', h(Gp, { params: {}, setParams: noop }), 'uk', 1500, ['Спершу наймирніші', 'Нижчий бал = мирніше', 'Ісландія']);
    const table = check('ready:gpi table', h(Gp, { params: { view: 'table' }, setParams: noop }), 'en', 5000, [
      '<table',
      '=70',
      '=142',
      'Ukraine',
      '3.184',
      '▲2',
      'rank 96, level with Cambodia (2.075)',
      '2.075*',
    ]);
    ok(table.indexOf('Iceland') < table.indexOf('Russia'), 'ready:gpi table in the report order by default');
    const europe = check('ready:gpi europe', h(Gp, { params: { region: 'europe', order: 'least', view: 'table' }, setParams: noop }), 'en', 2000, ['Russia', 'Ukraine']);
    ok(!europe.includes(' Japan</th>'), 'ready:gpi europe filter excludes Asia');
    ok(europe.indexOf('Russia') < europe.indexOf('Iceland'), 'ready:gpi least-peaceful order puts Russia before Iceland');
    // CHANGED (S3-fx): the shared Pager (sized from its longest label) and the "bars start at 1" wording.
    // The axis title itself is drawn by D3 in an effect — covered by the jsdom test (test-ranked-bar.ts).
    check('ready:gpi pager', h(Gp, { params: {}, setParams: noop }), 'en', 1500, [
      'class="field field-pager"',
      'style="--pager-ch:7"',
      '>1–15</option>',
      '>151–163</option>',
      'aria-label="Previous rows" disabled=""',
      '(1–5, lower = more peaceful; bars start at 1)',
    ]);
    check('ready:gpi pager last', h(Gp, { params: { page: '11' }, setParams: noop }), 'en', 1500, [
      'Showing 151–163 of 163',
      'aria-label="Next rows" disabled=""',
      '<option value="11" selected="">151–163</option>',
    ]);
    check('ready:gpi pager uk', h(Gp, { params: {}, setParams: noop }), 'uk', 1500, [
      '>Рядки</label>',
      'aria-label="Попередні рядки"',
      '(1–5, нижчий = мирніше; стовпці від 1)',
    ]);
    ok(!table.includes('field-pager'), 'ready:gpi table view has no pager');
  }

  ok(ssr(h(AboutPage), 'en') !== ssr(h(AboutPage), 'uk'), 'EN and UK renders differ (language toggle works)');
  // CHANGED (S3-an): every page above rendered without a single request (fetch · sendBeacon · Image).
  ok(network.fetch + network.beacon + network.image === 0, `no request during render (${JSON.stringify(network)})`);

  console.log('— SSR / render smoke —');
  console.log(`  ${CATALOG.length} visualization(s) · ${TAB_IDS.length} tabs · ${hashes.length} hashes · EN + UK`);
  console.log(`  ${checks} checks total`);
  if (failures > 0) {
    console.error(`\n✖ ${failures} smoke failure(s).`);
    process.exit(1);
  }
  console.log('\n✓ All SSR/render smoke checks passed.');
}

main().catch((e) => {
  console.error('smoke crashed:', e);
  process.exit(1);
});
