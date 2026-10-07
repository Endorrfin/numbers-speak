// test-related.ts — CHANGED (S3-nav): "See also" (src/catalog/related.ts). Run: npm test.
// Pure picking rules on small fixtures, then the real catalog: every published page gets three published entries,
// the author's picks first and in order.
import assert from 'node:assert/strict';
import { CATALOG } from '../src/catalog';
import { RELATED_MAX, relatedFor, relatedScore } from '../src/catalog/related';
import type { VizCard } from '../src/catalog/types';

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
  } catch (e) {
    console.error(`✖ related: ${name}\n`, e);
    process.exit(1);
  }
}

const card = (id: string, over: Partial<VizCard> = {}): VizCard => ({
  id,
  title: { en: id, uk: id },
  subtitle: { en: id, uk: id },
  rubrics: ['world'],
  chart: 'ranked-bar',
  geo: 'world',
  tags: [],
  origin: { kind: 'original' },
  status: 'published',
  added: '2026-01-01',
  updated: '2026-01-01',
  ...over,
});
const ids = (cards: readonly VizCard[]) => cards.map((c) => c.id);

await test('the author picks come first, in order; the rest is filled by score', () => {
  const a = card('a', { rubrics: ['economy'], tags: ['oil'], related: ['z', 'y'] });
  const items = [a, card('y'), card('z'), card('b', { rubrics: ['economy'], tags: ['oil'] }), card('c', { rubrics: ['economy'] })];
  assert.deepEqual(ids(relatedFor(a, items)), ['z', 'y', 'b']);
  assert.deepEqual(ids(relatedFor({ ...a, related: undefined }, items)), ['b', 'c', 'y']);
});

await test('never itself, never a draft or a "soon" page, never twice; unknown picks are skipped', () => {
  const a = card('a', { related: ['a', 'gone', 'd', 's', 'p', 'p'] });
  const items = [a, card('d', { status: 'draft' }), card('s', { status: 'soon' }), card('p'), card('q'), card('r')];
  const got = ids(relatedFor(a, items));
  assert.deepEqual(got, ['p', 'q', 'r']);
});

await test('generic tags (countries, ranking, world) do not make two entries alike', () => {
  const a = card('a', { rubrics: ['economy'], tags: ['countries', 'ranking', 'world', 'країни', 'рейтинг'] });
  assert.equal(relatedScore(a, card('b', { rubrics: ['security'], tags: ['countries', 'ranking', 'world', 'країни', 'рейтинг'] })), 0);
  assert.equal(relatedScore(a, card('c', { rubrics: ['economy'], tags: ['ranking'] })), 2);
  assert.equal(relatedScore(card('x', { tags: ['oil', 'energy'] }), card('y', { rubrics: ['economy'], tags: ['oil', 'energy'] })), 2);
});

await test('equal scores: the newer entry first, then id order — the same list on every run', () => {
  const a = card('a');
  const items = [a, card('m', { added: '2026-02-01' }), card('k'), card('b'), card('n', { added: '2026-03-01' })];
  assert.deepEqual(ids(relatedFor(a, items)), ['n', 'm', 'b']);
  assert.deepEqual(ids(relatedFor(a, [...items].reverse())), ['n', 'm', 'b']);
});

await test('fewer candidates than the limit → as many as there are; none → empty', () => {
  const a = card('a');
  assert.deepEqual(ids(relatedFor(a, [a, card('b')])), ['b']);
  assert.deepEqual(relatedFor(a, [a]), []);
});

await test('the real catalog: every published page gets three published entries, the author picks first', () => {
  const published = CATALOG.filter((m) => m.status === 'published');
  assert.ok(published.length >= 4);
  for (const m of published) {
    const got = relatedFor(m, CATALOG);
    assert.equal(got.length, RELATED_MAX, m.id);
    assert.ok(got.every((r) => r.status === 'published' && r.id !== m.id), m.id);
    assert.equal(new Set(ids(got)).size, got.length, m.id);
    if (m.related) assert.deepEqual(ids(got).slice(0, m.related.length), [...m.related], `${m.id}: picks kept, in order`);
  }
});

await test('the real catalog: every published entry is suggested somewhere (no orphan pages)', () => {
  const published = CATALOG.filter((m) => m.status === 'published');
  const suggested = new Set(published.flatMap((m) => ids(relatedFor(m, CATALOG))));
  const orphans = published.filter((m) => !suggested.has(m.id)).map((m) => m.id);
  assert.deepEqual(orphans, []);
});

console.log(`✓ related: ${passed} tests`);
