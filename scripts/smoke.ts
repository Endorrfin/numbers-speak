/*
 * smoke.ts — SSR/render smoke (standard §4.6). `npm run smoke` runs it; CI runs it before build.
 * Renders with react-dom/server, in BOTH languages:
 *   A. every visualization body (through its lazy loader),
 *   B. every catalog tab (with and without filters), the About and 404 pages,
 *   C. every visualization page + an unknown id,
 *   D. the <App/> shell across representative and bogus hashes.
 * D3 runs in effects, which SSR doesn't execute — chart drawing gets its own jsdom checks from S2.
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
    for (const lang of langs) check(`body:${meta.id}`, h(Body, { params: {}, setParams: noop }), lang, 80);
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
