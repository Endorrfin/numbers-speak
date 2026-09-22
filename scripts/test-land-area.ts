// test-land-area.ts — the land-area dataset contract, rankings and URL state (pure). Run: npm test.
// Written 2026-09-22; not executed locally (this environment's tsx/esbuild is built for a different
// platform than this sandbox — see the session's own report). Run `npm test` to confirm before `verify`.
import assert from 'node:assert/strict';
import { DatasetError } from '../src/lib/dataset';
import {
  DATA_FILE,
  DATA_FILES,
  metricValue,
  nonLandShare,
  parseAreaDataset,
  rankArea,
  regionShares,
  validateDataFile,
} from '../src/viz/land-area/data';
import type { AreaDataset } from '../src/viz/land-area/data';
import meta from '../src/viz/land-area/meta';
import { parseLandAreaState, toLandAreaParams } from '../src/viz/land-area/state';

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (e) {
    console.error(`✖ land-area: ${name}\n`, e);
    process.exit(1);
  }
}

const good = (): AreaDataset => ({
  totalWorld: 130,
  landWorld: 118,
  rows: [
    { code: 'US', region: 'americas', totalArea: 100, landArea: 90 },
    { code: 'UA', region: 'europe', totalArea: 30, landArea: 28, note: 'recognized-borders' },
  ],
});
const rejects = (patch: (d: AreaDataset) => void, msg: RegExp): void => {
  const d = good();
  patch(d);
  assert.throws(() => parseAreaDataset(d), (e: unknown) => e instanceof DatasetError && msg.test(e.message));
};

// ── Dataset contract ──────────────────────────────────────────────────────────────────────────────
test('parses a valid dataset', () => assert.equal(parseAreaDataset(good()).rows.length, 2));
test('rejects a non-object', () => assert.throws(() => parseAreaDataset([]), DatasetError));
test('rejects a lower-case or 3-letter code', () => {
  rejects((d) => (d.rows[0]!.code = 'us'), /rows\[0\]\.code/);
  rejects((d) => (d.rows[0]!.code = 'USA'), /rows\[0\]\.code/);
});
test('rejects a duplicate code', () => rejects((d) => (d.rows[1]!.code = 'US'), /duplicate/));
test('rejects an unknown region', () => rejects((d) => ((d.rows[1] as { region: unknown }).region = 'America'), /region/));
test('rejects a non-positive total area', () => rejects((d) => (d.rows[0]!.totalArea = 0), /outside/));
test('rejects a negative land area', () => rejects((d) => (d.rows[0]!.landArea = -1), /outside/));
test('rejects land area wildly larger than total area', () =>
  rejects((d) => (d.rows[0]!.landArea = d.rows[0]!.totalArea + 200_000), /exceeds totalArea/));
test('allows a small land-over-total gap, kept as reported (rounding noise or a definition mismatch)', () => {
  const d: AreaDataset = { totalWorld: 100, landWorld: 105, rows: [{ code: 'QA', region: 'asia', totalArea: 100, landArea: 105 }] };
  assert.doesNotThrow(() => parseAreaDataset(d));
});
test('rejects an unknown note', () => rejects((d) => ((d.rows[0] as { note: unknown }).note = 'disputed'), /note/));
test('accepts every documented note kind, including corrected', () => {
  for (const note of ['recognized-borders', 'definition', 'ice-sheet', 'corrected'] as const) {
    const d = good();
    d.rows[0]!.note = note;
    assert.doesNotThrow(() => parseAreaDataset(d));
  }
});
test('rejects totalWorld that does not match the sum of rows', () => rejects((d) => (d.totalWorld = 999), /totalWorld/));
test('rejects landWorld that does not match the sum of rows', () => rejects((d) => (d.landWorld = 999), /landWorld/));

// ── validateDataFile ──────────────────────────────────────────────────────────────────────────────
test('validateDataFile accepts the real file name', () => assert.doesNotThrow(() => validateDataFile(DATA_FILE, good())));
test('validateDataFile rejects any other name', () => assert.throws(() => validateDataFile('land-area-2.json', good()), DatasetError));

// ── Derived values ────────────────────────────────────────────────────────────────────────────────
test('metricValue reads the field the metric names', () => {
  const row = good().rows[0]!;
  assert.equal(metricValue(row, 'total'), 100);
  assert.equal(metricValue(row, 'land'), 90);
});
test('nonLandShare is the water/ice share of total area', () => {
  assert.equal(nonLandShare({ code: 'US', region: 'americas', totalArea: 100, landArea: 90 }), 0.1);
});
test('nonLandShare clamps a negative gap to 0 (definition mismatch or rounding noise, never a fabricated share)', () => {
  assert.equal(nonLandShare({ code: 'NO', region: 'europe', totalArea: 100, landArea: 110 }), 0);
});

// ── Ranking ───────────────────────────────────────────────────────────────────────────────────────
test('rankArea ranks by the chosen metric, largest first', () => {
  const ranked = rankArea(good(), 'total', 'area');
  assert.deepEqual(ranked.map((r) => r.code), ['US', 'UA']);
  assert.equal(ranked[0]!.rank, 1);
  assert.equal(ranked[0]!.share, 100 / 130);
});
test('rankArea by land can reorder rows the total metric does not', () => {
  const d: AreaDataset = {
    totalWorld: 100,
    landWorld: 100,
    rows: [
      { code: 'AA', region: 'africa', totalArea: 60, landArea: 20 }, // mostly water
      { code: 'BB', region: 'africa', totalArea: 40, landArea: 80 },
    ],
  };
  assert.deepEqual(rankArea(d, 'total', 'area').map((r) => r.code), ['AA', 'BB']);
  assert.deepEqual(rankArea(d, 'land', 'area').map((r) => r.code), ['BB', 'AA']);
});
test('rankArea sort=nonland ranks by non-land share, not by size', () => {
  const d: AreaDataset = {
    totalWorld: 400,
    landWorld: 290,
    rows: [
      { code: 'AA', region: 'africa', totalArea: 300, landArea: 270 }, // 10% non-land, larger
      { code: 'BB', region: 'africa', totalArea: 100, landArea: 20 }, // 80% non-land, smaller — e.g. Greenland
    ],
  };
  assert.deepEqual(rankArea(d, 'land', 'area').map((r) => r.code), ['AA', 'BB']);
  assert.deepEqual(rankArea(d, 'land', 'nonland').map((r) => r.code), ['BB', 'AA']);
});
test('rankArea ties break by code', () => {
  const d: AreaDataset = {
    totalWorld: 20,
    landWorld: 20,
    rows: [
      { code: 'ZZ', region: 'africa', totalArea: 10, landArea: 10 },
      { code: 'AA', region: 'africa', totalArea: 10, landArea: 10 },
    ],
  };
  assert.deepEqual(rankArea(d, 'total', 'area').map((r) => r.code), ['AA', 'ZZ']);
});

// ── Regional share ────────────────────────────────────────────────────────────────────────────────
test('regionShares sums each region and shares add to 1', () => {
  const shares = regionShares(good(), 'total');
  assert.equal(shares.length, 2);
  const total = shares.reduce((s, r) => s + r.share, 0);
  assert.ok(Math.abs(total - 1) < 1e-9);
  const americas = shares.find((r) => r.region === 'americas')!;
  assert.equal(americas.value, 100);
  assert.equal(americas.count, 1);
});

// ── URL state ─────────────────────────────────────────────────────────────────────────────────────
test('state defaults to land metric, area sort, chart view', () => {
  const s = parseLandAreaState({});
  assert.equal(s.metric, 'land');
  assert.equal(s.sort, 'area');
  assert.equal(s.region, 'all');
  assert.equal(s.page, 1);
  assert.equal(s.view, 'chart');
});
test('sort=nonland is dropped when the metric is total', () => {
  assert.equal(parseLandAreaState({ metric: 'total', sort: 'nonland' }).sort, 'area');
});
test('an unknown metric or sort falls back to the default', () => {
  assert.equal(parseLandAreaState({ metric: 'gdp' }).metric, 'land');
  assert.equal(parseLandAreaState({ sort: 'random' }).sort, 'area');
});
test('toLandAreaParams omits defaults and round-trips', () => {
  assert.deepEqual(toLandAreaParams(parseLandAreaState({})), {});
  const s = parseLandAreaState({ sort: 'nonland', region: 'europe', page: '2', view: 'table' });
  const params = toLandAreaParams(s);
  assert.deepEqual(params, { sort: 'nonland', region: 'europe', page: '2', view: 'table' });
  assert.deepEqual(parseLandAreaState(params), s);
});

// ── meta.ts ───────────────────────────────────────────────────────────────────────────────────────
test('meta.data matches DATA_FILES', () => assert.deepEqual([...meta.data].sort(), [...DATA_FILES].sort()));
test('meta.id matches the folder', () => assert.equal(meta.id, 'land-area'));

console.log(`✓ land-area: ${passed} test(s) passed.`);
