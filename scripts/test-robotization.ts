// test-robotization.ts — robotization (S3-rb): dataset contract, ranking, top 15, URL state and the real file.
// Run: npm test.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatasetError } from '../src/lib/dataset';
import { DATA_FILE, DATA_FILES, TOP, parseRobotDataset, rankRobots, topRobots, validateDataFile } from '../src/viz/robotization/data';
import type { RobotDataset } from '../src/viz/robotization/data';
import meta from '../src/viz/robotization/meta';
import { parseRobotState, toRobotParams } from '../src/viz/robotization/state';

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (e) {
    console.error(`✖ robotization: ${name}\n`, e);
    process.exit(1);
  }
}

const codes = ['KR', 'SG', 'DE', 'JP', 'SE', 'DK', 'SI', 'US', 'TW', 'CH', 'NL', 'AT', 'CA', 'IT', 'BE', 'CZ'];
const good = (): RobotDataset => ({
  year: 2024,
  world: 132,
  rows: codes.map((code, i) => ({
    code,
    region: code === 'KR' || code === 'SG' || code === 'JP' || code === 'TW' ? 'asia' : code === 'US' || code === 'CA' ? 'americas' : 'europe',
    value: 1_600 - i * 100,
    ...(code === 'BE' ? { with: 'LU' } : {}),
  })),
});
const rejects = (patch: (d: RobotDataset) => void, msg: RegExp): void => {
  const d = good();
  patch(d);
  assert.throws(() => parseRobotDataset(d), (e: unknown) => e instanceof DatasetError && msg.test(e.message));
};

test('parses a valid dataset', () => assert.equal(parseRobotDataset(good()).rows.length, 16));
test('rejects fewer rows than the top shown', () => rejects((d) => (d.rows = d.rows.slice(0, TOP - 1)), /rows/));
test('rejects a duplicate code, also through `with`', () => {
  rejects((d) => (d.rows[1]!.code = 'KR'), /duplicate/);
  rejects((d) => (d.rows[14]!.with = 'KR'), /duplicate/);
  rejects((d) => (d.rows[14]!.with = 'lux'), /with/);
});
test('rejects unsorted, fractional or out-of-range values', () => {
  rejects((d) => (d.rows[3]!.value = 5_000), /sorted/);
  rejects((d) => (d.rows[3]!.value = 1_250.5), /whole/);
  rejects((d) => (d.rows[0]!.value = 20_000), /outside/);
});
test('rejects a world figure above the leader', () => rejects((d) => (d.world = 2_000), /above the highest/));
test('validateDataFile accepts only its own file', () => {
  assert.doesNotThrow(() => validateDataFile(DATA_FILE, good()));
  assert.throws(() => validateDataFile('x.json', good()), DatasetError);
});
test('rankRobots: rank in published order, × world; topRobots keeps 15', () => {
  const r = rankRobots(good());
  assert.equal(r[0]!.rank, 1);
  assert.equal(r[0]!.ratio, 1_600 / 132);
  assert.equal(topRobots(good()).length, TOP);
  assert.equal(topRobots(good()).at(-1)!.with, 'LU');
});
test('state: defaults omitted; unknown values fall back', () => {
  assert.deepEqual(parseRobotState({}), { region: 'all', view: 'chart' });
  assert.deepEqual(toRobotParams(parseRobotState({ region: 'x', view: 'y' })), {});
  assert.deepEqual(toRobotParams(parseRobotState({ region: 'asia', view: 'table' })), { region: 'asia', view: 'table' });
});

// ── Real file ─────────────────────────────────────────────────────────────────────────────────────
test('meta.data ↔ DATA_FILES; published with dated https sources', () => {
  assert.deepEqual([...meta.data], [...DATA_FILES]);
  assert.equal(meta.status, 'published');
  assert.ok(meta.sources.every((s) => s.url.startsWith('https://') && /^\d{4}-\d{2}-\d{2}$/.test(s.retrieved)));
});
test('real file: IFR WR 2025 — 22 economies, world 132, Korea 1,220 (9.2×), top 15 ends with Belgium + Luxembourg', () => {
  const d = parseRobotDataset(JSON.parse(readFileSync(`public/data/robotization/${DATA_FILE}`, 'utf8')));
  assert.equal(d.year, 2024);
  assert.equal(d.world, 132);
  assert.equal(d.rows.length, 22);
  const top = topRobots(d);
  assert.deepEqual(top.slice(0, 4).map((r) => [r.code, r.value]), [['KR', 1220], ['SG', 818], ['DE', 449], ['JP', 446]]);
  assert.equal(Math.round(top[0]!.ratio * 10) / 10, 9.2);
  assert.deepEqual([top[14]!.code, top[14]!.with, top[14]!.value], ['BE', 'LU', 232]);
  assert.equal(top.filter((r) => r.region === 'europe').length, 9);
  const cn = rankRobots(d).find((r) => r.code === 'CN')!;
  assert.deepEqual([cn.rank, cn.value], [22, 166]);
  assert.ok(!top.some((r) => r.code === 'CN'));
});

console.log(`✓ robotization — ${passed} tests passed.`);
