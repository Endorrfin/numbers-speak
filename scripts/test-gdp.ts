// test-gdp.ts — the GDP dataset contract, URL state, paging and formatters (pure). Run: npm test.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { DatasetError } from '../src/lib/dataset';
import { countryName, flagUrl } from '../src/lib/countries';
import { formatMultiple, formatShare, formatUsdBillions, formatUsdCompact, formatUsdWhole } from '../src/lib/format';
import { paginate, parsePage } from '../src/lib/paginate';
// CHANGED (S3-gdp): five files (total 2023–2025, per capita 2024–2025), notes, metric + year in the URL.
import { DATA_FILES, YEARS, dataFile, parseGdpDataset, rankGdp, validateDataFile } from '../src/viz/gdp-by-country/data';
import type { GdpDataset } from '../src/viz/gdp-by-country/data';
import meta from '../src/viz/gdp-by-country/meta';
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
    r.map((x) => [x.code, x.rank, x.ratio]),
    [
      ['US', 1, 0.5],
      ['UA', 2, 0.1],
    ],
  );
});
test('validateDataFile refuses unknown files', () => assert.throws(() => validateDataFile('x.json', good())));
test('validateDataFile: the file name pins indicator and year', () => {
  assert.doesNotThrow(() => validateDataFile('gdp-2023.json', good()));
  assert.throws(() => validateDataFile('gdp-2024.json', good()), /does not match the file name/);
  assert.throws(() => validateDataFile('gdp-per-capita-2024.json', { ...good(), year: 2024 }), /indicator/);
});

// ── Notes (values that are not WB figures for the year) ───────────────────────────────────────────
test('accepts a note with a source, an earlier year or both', () => {
  const d = good();
  Object.assign(d.rows[0]!, { note: { source: 'IMF' } });
  Object.assign(d.rows[1]!, { note: { source: 'UN', year: 2021 } });
  assert.deepEqual(parseGdpDataset(d).rows[1]!.note, { source: 'UN', year: 2021 });
});
test('rejects an empty note, an unknown source or a year that is not earlier', () => {
  rejects((d) => Object.assign(d.rows[0]!, { note: {} }), /source or an earlier year/);
  rejects((d) => Object.assign(d.rows[0]!, { note: { source: 'OECD' } }), /source/);
  rejects((d) => Object.assign(d.rows[0]!, { note: { year: 2023 } }), /note\.year/);
});

// ── Per capita ────────────────────────────────────────────────────────────────────────────────────
const pc = () => ({
  indicator: 'NY.GDP.PCAP.CD',
  year: 2024,
  unit: 'USD',
  worldAverage: 10_000,
  rows: [
    { code: 'LU', region: 'europe', value: 140_000 },
    { code: 'UA', region: 'europe', value: 5_000 },
  ],
});
test('per capita: ratio is the multiple of the world average', () =>
  assert.deepEqual(rankGdp(parseGdpDataset(pc())).map((r) => r.ratio), [14, 0.5]));
test('per capita: the average must lie between the extremes', () => {
  assert.throws(() => parseGdpDataset({ ...pc(), worldAverage: 200_000 }), /worldAverage/);
  assert.throws(() => parseGdpDataset({ ...pc(), worldAverage: undefined }), /worldAverage/);
});
test('per capita: a total-sized value is a unit mistake', () =>
  assert.throws(() => parseGdpDataset({ ...pc(), rows: [{ code: 'LU', region: 'europe', value: 9e7 }] }), /outside/));

// ── The shipped file ──────────────────────────────────────────────────────────────────────────────
const load = (file: string): GdpDataset => {
  validateDataFile(file, JSON.parse(readFileSync(join(PUBLIC_DATA_DIR, 'gdp-by-country', file), 'utf8')));
  return parseGdpDataset(JSON.parse(readFileSync(join(PUBLIC_DATA_DIR, 'gdp-by-country', file), 'utf8')));
};
const shipped = new Map(DATA_FILES.map((f) => [f, load(f)]));
const get = (f: string): GdpDataset => shipped.get(f)!;
test('meta.data lists exactly the files data.ts knows', () => assert.deepEqual([...meta.data].sort(), [...DATA_FILES].sort()));
test('shipped 2023: 181 economies, US first with a 26.1 % share (legacy page value)', () => {
  const d = get('gdp-2023.json');
  assert.equal(d.rows.length, 181);
  const [us] = rankGdp(d);
  assert.equal(us?.code, 'US');
  assert.equal(Math.round((us?.ratio ?? 0) * 10000) / 100, 26.11);
});
test('shipped 2024/2025: 218 economies; US share matches the source column (26.24 % / 26.0 %)', () => {
  const us24 = rankGdp(get('gdp-2024.json'))[0]!;
  const us25 = rankGdp(get('gdp-2025.json'))[0]!;
  assert.equal(get('gdp-2024.json').rows.length, 218);
  assert.equal(us24.code, 'US');
  assert.ok(Math.abs(us24.ratio - 0.2624) < 0.0005, String(us24.ratio));
  assert.ok(Math.abs(us25.ratio - 0.26) < 0.0005, String(us25.ratio));
});
test('shipped per capita: same economies as the totals; world average ≈ $13.8k (2024) and $14.5k (2025)', () => {
  for (const y of YEARS['per-capita']) {
    const a = get(dataFile('total', y)).rows.map((r) => r.code).sort();
    const b = get(dataFile('per-capita', y)).rows.map((r) => r.code).sort();
    assert.deepEqual(a, b, String(y));
  }
  const avg = (y: number) => {
    const d = get(dataFile('per-capita', y));
    return d.indicator === 'NY.GDP.PCAP.CD' ? d.worldAverage : NaN;
  };
  assert.ok(avg(2024) > 13_000 && avg(2024) < 14_500, String(avg(2024)));
  assert.ok(avg(2025) > 13_500 && avg(2025) < 15_500, String(avg(2025)));
});
test('shipped: marked values keep their notes (Taiwan = IMF, Monaco per capita 2025 = WB 2024)', () => {
  assert.deepEqual(get('gdp-2025.json').rows.find((r) => r.code === 'TW')?.note, { source: 'IMF' });
  assert.deepEqual(get('gdp-per-capita-2025.json').rows.find((r) => r.code === 'MC')?.note, { year: 2024 });
  assert.equal(get('gdp-2025.json').rows.filter((r) => r.note).length, 34);
  assert.equal(get('gdp-2023.json').rows.filter((r) => r.note).length, 0);
});
const allRows = [...shipped.values()].flatMap((d) => d.rows);
test('shipped files: region matches UN M49 for every code (Q1: Haiti → Americas)', () => {
  for (const r of allRows) assert.equal(r.region, M49_REGION.get(r.code), r.code);
  assert.equal(allRows.find((r) => r.code === 'HT')?.region, 'americas');
});
test('shipped files: every code has a flag in flag-icons', () => {
  const require = createRequire(import.meta.url);
  const dir = join(dirname(require.resolve('flag-icons/package.json')), 'flags/4x3');
  for (const r of allRows) assert.ok(existsSync(join(dir, `${r.code.toLowerCase()}.svg`)), r.code);
});
test('shipped files: every code has a real name in both languages', () => {
  for (const r of allRows) {
    assert.notEqual(countryName(r.code, 'en'), r.code, r.code);
    assert.notEqual(countryName(r.code, 'uk'), r.code, r.code);
  }
});

// ── URL state ─────────────────────────────────────────────────────────────────────────────────────
const DEFAULT = { metric: 'total', year: 2025, region: 'all', page: 1, view: 'chart' } as const;
test('state defaults: total GDP, latest year', () => assert.deepEqual(parseGdpState({}), DEFAULT));
test('state parses valid params', () =>
  assert.deepEqual(parseGdpState({ metric: 'per-capita', year: '2024', region: 'europe', page: '3', view: 'table' }), {
    metric: 'per-capita',
    year: 2024,
    region: 'europe',
    page: 3,
    view: 'table',
  }));
test('state ignores junk', () =>
  assert.deepEqual(parseGdpState({ metric: 'ppp', year: '1999', region: '<b>', page: '-2', view: 'pie' }), DEFAULT));
test('a year the metric has no file for falls back to the latest (per capita 2023 → 2025)', () => {
  assert.equal(parseGdpState({ metric: 'per-capita', year: '2023' }).year, 2025);
  assert.equal(parseGdpState({ year: '2023' }).year, 2023);
});
test('defaults are omitted from the URL (one canonical link per view)', () => {
  assert.deepEqual(toGdpParams(DEFAULT), {});
  assert.deepEqual(toGdpParams({ ...DEFAULT, region: 'asia', page: 2, view: 'table' }), { region: 'asia', page: '2', view: 'table' });
  assert.deepEqual(toGdpParams({ ...DEFAULT, metric: 'per-capita', year: 2024 }), { metric: 'per-capita', year: '2024' });
  assert.deepEqual(toGdpParams({ ...DEFAULT, metric: 'per-capita', year: 2023 }), { metric: 'per-capita' });
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
test('per-capita formatters', () => {
  assert.equal(formatUsdWhole(86_170, 'en'), '86,170');
  assert.equal(formatMultiple(6.26, 'en'), '6.3×');
  assert.equal(formatMultiple(0.0157, 'en'), '0.016×');
  assert.equal(formatMultiple(6.26, 'uk'), '6,3×');
});
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
