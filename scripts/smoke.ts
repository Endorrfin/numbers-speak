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
  for (const lang of langs) check('about', h(AboutPage), lang, 1500);
  check('about', h(AboutPage), 'en', 1500, ['Every number has a source']);
  check('about', h(AboutPage), 'uk', 1500, ['Кожне число має джерело']);
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
    check('ready:gdp chart', h(Gdp, { params: {}, setParams: noop }), 'en', 600, ['role="img"', 'Showing 1–15 of 181', 'Americas']);
    check('ready:gdp table', h(Gdp, { params: { view: 'table' }, setParams: noop }), 'en', 5000, ['<table', 'United States', '27,720.7', 'Tuvalu']);
    check('ready:gdp table uk', h(Gdp, { params: { view: 'table' }, setParams: noop }), 'uk', 5000, ['Україна', 'Сполучені Штати']);
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
  }

  // ── Sanity: the language switch took ───────────────────────────────────────────────────────────
  ok(ssr(h(AboutPage), 'en') !== ssr(h(AboutPage), 'uk'), 'EN and UK renders differ (language toggle works)');

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
