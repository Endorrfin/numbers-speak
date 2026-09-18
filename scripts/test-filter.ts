// test-filter.ts — golden tests for catalog filtering (pure functions only). Run: npm test.
import assert from 'node:assert/strict';
import {
  filterCatalog,
  hasActiveFilters,
  isNew,
  parseCatalogQuery,
  tabEntries,
  toCatalogParams,
} from '../src/catalog/filter';
import type { VizMeta } from '../src/catalog/types';

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (e) {
    console.error(`✖ filter: ${name}\n`, e);
    process.exit(1);
  }
}

const base: VizMeta = {
  id: 'x',
  title: { en: 'X', uk: 'Ікс' },
  subtitle: { en: 'Sub', uk: 'Під' },
  description: { en: 'D', uk: 'О' },
  rubrics: ['world'],
  chart: 'ranked-bar',
  geo: 'world',
  tags: [],
  sources: [],
  origin: { kind: 'original' },
  data: [],
  status: 'published',
  added: '2026-01-01',
  updated: '2026-01-01',
};
const viz = (patch: Partial<VizMeta>): VizMeta => ({ ...base, ...patch });

const now = new Date('2026-09-17T12:00:00Z');
const prod = { now, dev: false };

const ITEMS: VizMeta[] = [
  viz({ id: 'gdp', title: { en: 'GDP by country', uk: 'ВВП країн' }, rubrics: ['economy'], tags: ['gdp'] }),
  viz({ id: 'air', rubrics: ['ukraine', 'security'], chart: 'combo', geo: 'ukraine', added: '2026-09-10' }),
  viz({ id: 'crime', rubrics: ['security'], added: '2026-03-01' }),
  viz({ id: 'race', rubrics: ['economy'], chart: 'bar-race', origin: { kind: 'adapted', title: 'Bar chart race', url: 'https://observablehq.com/@d3/bar-chart-race', license: 'ISC' }, status: 'soon' }),
  viz({ id: 'wip', rubrics: ['world'], status: 'draft' }),
];

test('parseCatalogQuery drops invalid values and trims the text', () => {
  const q = parseCatalogQuery('world', { chart: 'pie', geo: 'usa', origin: 'stolen', q: '   ' });
  assert.deepEqual(q, { tab: 'world', chart: undefined, geo: 'usa', origin: undefined, q: undefined });
  assert.equal(parseCatalogQuery('all', { q: 'y'.repeat(200) }).q?.length, 80);
});

test('toCatalogParams omits empty values; hasActiveFilters', () => {
  assert.deepEqual(toCatalogParams({ tab: 'all' }), {});
  assert.deepEqual(toCatalogParams({ tab: 'all', chart: 'line', q: 'gdp' }), { chart: 'line', q: 'gdp' });
  assert.equal(hasActiveFilters({ tab: 'economy' }), false);
  assert.equal(hasActiveFilters({ tab: 'economy', origin: 'adapted' }), true);
});

test('drafts are hidden in production and shown in development', () => {
  assert.equal(tabEntries(ITEMS, 'all', prod).some((m) => m.id === 'wip'), false);
  assert.equal(tabEntries(ITEMS, 'all', { now, dev: true }).some((m) => m.id === 'wip'), true);
});

test('topic tabs include primary and secondary members, primary first', () => {
  assert.deepEqual(
    filterCatalog(ITEMS, { tab: 'security' }, prod).map((m) => m.id),
    ['crime', 'air'],
  );
  assert.deepEqual(
    filterCatalog(ITEMS, { tab: 'economy' }, prod).map((m) => m.id),
    ['gdp', 'race'],
  );
});

test('the New tab keeps entries added within 30 days', () => {
  assert.equal(isNew(viz({ added: '2026-08-18' }), now), true);
  assert.equal(isNew(viz({ added: '2026-08-17' }), now), false);
  assert.equal(isNew(viz({ added: '2026-09-18' }), now), false); // future dates are not "new"
  assert.deepEqual(filterCatalog(ITEMS, { tab: 'new' }, prod).map((m) => m.id), ['air']);
});

test('facets combine with AND', () => {
  assert.deepEqual(filterCatalog(ITEMS, { tab: 'all', chart: 'combo' }, prod).map((m) => m.id), ['air']);
  assert.deepEqual(filterCatalog(ITEMS, { tab: 'all', origin: 'adapted' }, prod).map((m) => m.id), ['race']);
  assert.deepEqual(filterCatalog(ITEMS, { tab: 'economy', geo: 'ukraine' }, prod), []);
});

test('text search matches EN, UA and tags, every word', () => {
  assert.deepEqual(filterCatalog(ITEMS, { tab: 'all', q: 'ввп' }, prod).map((m) => m.id), ['gdp']);
  assert.deepEqual(filterCatalog(ITEMS, { tab: 'all', q: 'GDP country' }, prod).map((m) => m.id), ['gdp']);
  assert.deepEqual(filterCatalog(ITEMS, { tab: 'all', q: 'gdp missing' }, prod), []);
});

test('published entries come before soon ones, newest first', () => {
  assert.deepEqual(
    filterCatalog(ITEMS, { tab: 'all' }, prod).map((m) => m.id),
    ['air', 'crime', 'gdp', 'race'],
  );
});

console.log(`✓ filter — ${passed} tests passed`);
