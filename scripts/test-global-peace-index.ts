// test-global-peace-index.ts — global-peace-index (S3-rb): dataset contract (ranks, ties, scores), ordering,
// summary, URL state, score formatters and the real file against the report's own text. Run: npm test.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatasetError } from '../src/lib/dataset';
import { formatScore, formatScoreChange } from '../src/lib/format';
import { DATA_FILE, gpiSummary, orderGpi, parseGpiDataset, rankLabel, validateDataFile } from '../src/viz/global-peace-index/data';
import type { GpiDataset } from '../src/viz/global-peace-index/data';
import meta from '../src/viz/global-peace-index/meta';
import { parseGpiState, toGpiParams } from '../src/viz/global-peace-index/state';

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (e) {
    console.error(`✖ gpi: ${name}\n`, e);
    process.exit(1);
  }
}

const sample = (): GpiDataset => ({
  edition: 2026,
  published: '2026-06',
  rows: [
    { code: 'IS', region: 'europe', rank: 1, score: 1.161, rankChange: 0, scoreChange: -0.024 },
    { code: 'JM', region: 'americas', rank: 2, tied: true, score: 1.919, rankChange: -1, scoreChange: 0.03 },
    { code: 'RS', region: 'europe', rank: 2, tied: true, score: 1.919, rankChange: 5, scoreChange: -0.003 },
    { code: 'RU', region: 'europe', rank: 4, score: 3.367, rankChange: 0, scoreChange: -0.023 },
  ],
});
const rejects = (mutate: (d: GpiDataset) => void, re: RegExp) => {
  const d = sample();
  mutate(d);
  assert.throws(() => parseGpiDataset(d), re);
};

test('parses a valid dataset with a tie; the rank after a tie skips', () => {
  const d = parseGpiDataset(sample());
  assert.deepEqual(d.rows.map(rankLabel), ['1', '=2', '=2', '4']);
});
test('rejects bad ranks, ties, scores and codes', () => {
  rejects((d) => (d.rows[3]!.rank = 3), /rank/);
  rejects((d) => (d.rows[2]!.score = 1.92), /tied with JM/);
  rejects((d) => delete d.rows[2]!.tied, /rank/);
  rejects((d) => {
    const rs = d.rows[2]!;
    delete rs.tied;
    rs.rank = 3;
    rs.score = 1.92;
  }, /marked tied/);
  rejects((d) => (d.rows[0]!.score = 0.9), /score/);
  rejects((d) => (d.rows[3]!.score = 1.5), /must not decrease/);
  rejects((d) => (d.rows[3]!.code = 'IS'), /duplicate/);
  rejects((d) => (d.rows[0]!.rankChange = 1.5), /integer/);
  rejects((d) => (d.published = 'June 2026'), /published/);
  assert.throws(() => validateDataFile('x.json', sample()), DatasetError);
});
test('orderGpi reverses for least peaceful first; summary counts score changes', () => {
  assert.deepEqual(orderGpi(sample().rows, 'least').map((r) => r.code), ['RU', 'RS', 'JM', 'IS']);
  assert.deepEqual(orderGpi(sample().rows, 'most').map((r) => r.code), ['IS', 'JM', 'RS', 'RU']);
  assert.deepEqual(gpiSummary(sample().rows), { total: 4, improved: 3, deteriorated: 1 });
});
test('state: report order by default, defaults omitted', () => {
  assert.deepEqual(parseGpiState({}), { order: 'most', region: 'all', page: 1, view: 'chart' });
  assert.deepEqual(toGpiParams(parseGpiState({ order: 'x', region: 'y', page: '-1' })), {});
  assert.deepEqual(toGpiParams(parseGpiState({ order: 'least', region: 'europe', page: '3', view: 'table' })), {
    order: 'least',
    region: 'europe',
    page: '3',
    view: 'table',
  });
});
test('score formatters: three decimals, signed changes', () => {
  assert.equal(formatScore(1.81, 'en'), '1.810');
  assert.equal(formatScore(1.81, 'uk'), '1,810');
  assert.equal(formatScoreChange(0.016, 'en'), '+0.016');
  assert.match(formatScoreChange(-0.032, 'en'), /^[-−]0\.032$/);
  assert.equal(formatScoreChange(0, 'en'), '0.000');
});

// ── Real file ─────────────────────────────────────────────────────────────────────────────────────
const real = parseGpiDataset(JSON.parse(readFileSync(`public/data/global-peace-index/${DATA_FILE}`, 'utf8')));
const by = (c: string) => real.rows.find((r) => r.code === c)!;
test('meta lists the file; dated https sources', () => {
  assert.deepEqual(meta.data, [DATA_FILE]);
  assert.ok(meta.sources.every((s) => s.url.startsWith('https://') && /^\d{4}-\d{2}-\d{2}$/.test(s.retrieved)));
});
test('real file matches the report’s text: 163 countries, top and bottom five, 99 worse / 62 better', () => {
  assert.equal(real.rows.length, 163);
  assert.deepEqual(real.rows.slice(0, 5).map((r) => r.code), ['IS', 'NZ', 'CH', 'SI', 'IE']);
  assert.deepEqual(real.rows.slice(-5).map((r) => r.code).reverse(), ['RU', 'SD', 'CD', 'UA', 'IL']);
  const s = gpiSummary(real.rows);
  assert.equal(s.deteriorated, 99);
  assert.equal(s.improved, 62);
  assert.deepEqual([by('PL').rank, by('PL').rankChange], [22, 23], 'Poland rose 23 places to 22nd');
});
test('real file: ties, Ukraine, Russia, the Honduras conflict, regions', () => {
  assert.deepEqual(real.rows.filter((r) => r.tied).map((r) => `${r.code}=${r.rank}`), ['JM=70', 'RS=70', 'HT=142', 'NG=142']);
  assert.deepEqual([by('UA').rank, by('UA').score, by('UA').rankChange, by('UA').scoreChange], [160, 3.184, 2, -0.119]);
  assert.deepEqual([by('RU').rank, by('RU').score, by('RU').region], [163, 3.367, 'europe']);
  assert.deepEqual([by('HN').rank, by('HN').regionalRank, by('KH').rank, by('KH').score], [97, 96, 96, 2.075]);
  assert.equal(real.rows.filter((r) => r.regionalRank !== undefined).length, 1);
  assert.equal(by('HT').region, 'americas');
});

console.log(`✓ gpi — ${passed} tests passed.`);
