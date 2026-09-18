// test-gdp.ts — the GDP dataset contract, URL state, paging and formatters (pure). Run: npm test.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { DatasetError } from '../src/lib/dataset';
import { countryName, flagUrl } from '../src/lib/countries';
import { formatShare, formatUsdBillions, formatUsdCompact } from '../src/lib/format';
import { paginate, parsePage } from '../src/lib/paginate';
import { DATA_FILE, parseGdpDataset, rankGdp, validateDataFile } from '../src/viz/gdp-by-country/data';
import { parseGdpState, toGdpParams } from '../src/viz/gdp-by-country/state';
import { M49_REGION } from '../data-raw/_shared/m49';
import { PUBLIC_DATA_DIR } from './lib/viz-folders';

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (e) {
    console.error(`✖ gdp: ${name}\n`, e);
    process.exit(1);
  }
}

const good = () => ({
  indicator: 'NY.GDP.MKTP.CD',
  year: 2023,
  unit: 'USD',
  worldTotal: 100,
  rows: [
    { code: 'US', region: 'americas', value: 50 },
    { code: 'UA', region: 'europe', value: 10 },
  ],
});
const rejects = (patch: (d: ReturnType<typeof good>) => void, msg: RegExp): void => {
  const d = good();
  patch(d);
  assert.throws(() => parseGdpDataset(d), (e: unknown) => e instanceof DatasetError && msg.test(e.message));
};

// ── Dataset contract ──────────────────────────────────────────────────────────────────────────────
test('parses a valid dataset', () => assert.equal(parseGdpDataset(good()).rows.length, 2));
test('rejects a non-object', () => assert.throws(() => parseGdpDataset([]), DatasetError));
test('rejects a wrong indicator', () => rejects((d) => (d.indicator = 'SP.POP.TOTL'), /indicator/));
test('rejects a lower-case or 3-letter code', () => {
  rejects((d) => (d.rows[0]!.code = 'us'), /rows\[0\]\.code/);
  rejects((d) => (d.rows[0]!.code = 'USA'), /rows\[0\]\.code/);
});
test('rejects a duplicate code', () => rejects((d) => (d.rows[1]!.code = 'US'), /duplicate/));
test('rejects an unknown region', () => rejects((d) => (d.rows[1]!.region = 'America'), /region/));
test('rejects a string or non-positive value', () => {
  rejects((d) => ((d.rows[0] as { value: unknown }).value = '50'), /finite number/);
  rejects((d) => (d.rows[1]!.value = 0), /outside/);
});
test('rejects unsorted rows', () => rejects((d) => (d.rows[1]!.value = 60), /sorted/));
test('rejects parts that exceed the world total', () => rejects((d) => (d.worldTotal = 55), /exceeds/));
test('rankGdp computes rank and share', () => {
  const r = rankGdp(parseGdpDataset(good()));
  assert.deepEqual(
    r.map((x) => [x.code, x.rank, x.share]),
    [
      ['US', 1, 0.5],
      ['UA', 2, 0.1],
    ],
  );
});
test('validateDataFile refuses unknown files', () => assert.throws(() => validateDataFile('x.json', good())));

// ── The shipped file ──────────────────────────────────────────────────────────────────────────────
const shipped = parseGdpDataset(JSON.parse(readFileSync(join(PUBLIC_DATA_DIR, 'gdp-by-country', DATA_FILE), 'utf8')));
test('shipped file: 181 economies, US first with a 26.1 % share (legacy page value)', () => {
  assert.equal(shipped.rows.length, 181);
  const [us] = rankGdp(shipped);
  assert.equal(us?.code, 'US');
  assert.equal(Math.round((us?.share ?? 0) * 10000) / 100, 26.11);
});
test('shipped file: region matches UN M49 for every code (Q1: Haiti → Americas)', () => {
  for (const r of shipped.rows) assert.equal(r.region, M49_REGION.get(r.code), r.code);
  assert.equal(shipped.rows.find((r) => r.code === 'HT')?.region, 'americas');
});
test('shipped file: every code has a flag in flag-icons', () => {
  const require = createRequire(import.meta.url);
  const dir = join(dirname(require.resolve('flag-icons/package.json')), 'flags/4x3');
  for (const r of shipped.rows) assert.ok(existsSync(join(dir, `${r.code.toLowerCase()}.svg`)), r.code);
});
test('shipped file: every code has a real name in both languages', () => {
  for (const r of shipped.rows) {
    assert.notEqual(countryName(r.code, 'en'), r.code, r.code);
    assert.notEqual(countryName(r.code, 'uk'), r.code, r.code);
  }
});

// ── URL state ─────────────────────────────────────────────────────────────────────────────────────
test('state defaults', () => assert.deepEqual(parseGdpState({}), { region: 'all', page: 1, view: 'chart' }));
test('state parses valid params', () =>
  assert.deepEqual(parseGdpState({ region: 'europe', page: '3', view: 'table' }), {
    region: 'europe',
    page: 3,
    view: 'table',
  }));
test('state ignores junk', () =>
  assert.deepEqual(parseGdpState({ region: '<b>', page: '-2', view: 'pie' }), { region: 'all', page: 1, view: 'chart' }));
test('defaults are omitted from the URL (one canonical link per view)', () => {
  assert.deepEqual(toGdpParams({ region: 'all', page: 1, view: 'chart' }), {});
  assert.deepEqual(toGdpParams({ region: 'asia', page: 2, view: 'table' }), { region: 'asia', page: '2', view: 'table' });
});
test('parsePage accepts 1..9999 only', () => {
  for (const bad of [undefined, '', '0', '-1', '2.5', 'abc', '1e3', '01', '99999']) assert.equal(parsePage(bad), 1, String(bad));
  assert.equal(parsePage('12'), 12);
});

// ── Paging ────────────────────────────────────────────────────────────────────────────────────────
const nums = Array.from({ length: 181 }, (_, i) => i + 1);
test('paginate: first, middle and last pages', () => {
  assert.deepEqual({ ...paginate(nums, 1, 15), items: undefined }, { items: undefined, page: 1, pages: 13, from: 1, to: 15, total: 181 });
  assert.deepEqual(paginate(nums, 13, 15).items, [181]);
  assert.equal(paginate(nums, 13, 15).from, 181);
});
test('paginate clamps out-of-range pages', () => {
  assert.equal(paginate(nums, 99, 15).page, 13);
  assert.equal(paginate(nums, 0, 15).page, 1);
});
test('paginate: empty list', () => assert.deepEqual(paginate([], 3, 15), { items: [], page: 1, pages: 1, from: 0, to: 0, total: 0 }));

// ── Formatting & names ────────────────────────────────────────────────────────────────────────────
test('compact USD in both languages', () => {
  assert.equal(formatUsdCompact(27_720_700_000_000, 'en'), '$27.7tn');
  assert.match(formatUsdCompact(27_720_700_000_000, 'uk'), /^27,7\s?трлн\s?\$$/);
});
test('billions for tables', () => assert.equal(formatUsdBillions(27_720_700_000_000, 'en'), '27,720.7'));
test('shares never round to a bare 0 %', () => {
  assert.equal(formatShare(0.2611, 'en'), '26.1%');
  assert.equal(formatShare(0.0000565, 'en'), '0.0057%');
});
test('short editorial names override long CLDR names', () => {
  assert.equal(countryName('CD', 'en'), 'DR Congo');
  assert.equal(countryName('UA', 'uk'), 'Україна');
  assert.equal(countryName('??', 'en'), '??');
});
test('flag URLs only for valid codes', () => {
  assert.equal(flagUrl('UA'), './flags/4x3/ua.svg');
  assert.equal(flagUrl('../x'), undefined);
});

console.log(`✓ gdp: ${passed} tests passed.`);
