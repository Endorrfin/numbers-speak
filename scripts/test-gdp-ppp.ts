// test-gdp-ppp.ts — gdp-ppp-per-capita (S3-rb): dataset contract, ranking + "× world average", URL state and
// the real files in public/data. Run: npm test.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatasetError } from '../src/lib/dataset';
import {
  DATA_FILES,
  INDICATOR,
  LATEST_YEAR,
  WB_ECONOMIES,
  YEARS,
  dataFile,
  parsePppDataset,
  rankPpp,
  validateDataFile,
} from '../src/viz/gdp-ppp-per-capita/data';
import type { PppDataset } from '../src/viz/gdp-ppp-per-capita/data';
import meta from '../src/viz/gdp-ppp-per-capita/meta';
import { parsePppState, toPppParams } from '../src/viz/gdp-ppp-per-capita/state';

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (e) {
    console.error(`✖ gdp-ppp: ${name}\n`, e);
    process.exit(1);
  }
}

const good = (): PppDataset => ({
  indicator: INDICATOR,
  year: 2025,
  unit: 'international $',
  worldAverage: 25_000,
  rows: [
    { code: 'SG', region: 'asia', value: 160_000 },
    { code: 'UA', region: 'europe', value: 19_000 },
    { code: 'BI', region: 'africa', value: 1_250 },
  ],
});
const rejects = (patch: (d: PppDataset) => void, msg: RegExp): void => {
  const d = good();
  patch(d);
  assert.throws(() => parsePppDataset(d), (e: unknown) => e instanceof DatasetError && msg.test(e.message));
};

test('parses a valid dataset', () => assert.equal(parsePppDataset(good()).rows.length, 3));
test('rejects another indicator or unit', () => {
  rejects((d) => ((d as { indicator: string }).indicator = 'NY.GDP.PCAP.CD'), /indicator/);
  rejects((d) => ((d as { unit: string }).unit = 'USD'), /unit/);
});
test('rejects bad codes, duplicates and regions', () => {
  rejects((d) => (d.rows[0]!.code = 'SGP'), /rows\[0\]\.code/);
  rejects((d) => (d.rows[1]!.code = 'SG'), /duplicate/);
  rejects((d) => ((d.rows[1] as { region: unknown }).region = 'Europe'), /region/);
});
test('rejects unsorted rows and a non-positive value', () => {
  rejects((d) => (d.rows[1]!.value = 200_000), /sorted/);
  rejects((d) => (d.rows[2]!.value = 0), /outside/);
});
test('rejects a world average outside the extremes', () => {
  rejects((d) => (d.worldAverage = 500), /worldAverage/);
  rejects((d) => (d.worldAverage = 300_000), /worldAverage/);
});
test('validateDataFile: file name ↔ year', () => {
  assert.doesNotThrow(() => validateDataFile('gdp-ppp-per-capita-2025.json', good()));
  assert.throws(() => validateDataFile('gdp-ppp-per-capita-2024.json', good()), /does not match/);
  assert.throws(() => validateDataFile('other.json', good()), DatasetError);
});
test('rankPpp: rank and multiple of the world average', () => {
  const r = rankPpp(good());
  assert.deepEqual(r.map((x) => x.rank), [1, 2, 3]);
  assert.equal(r[0]!.ratio, 160_000 / 25_000);
  assert.equal(r[1]!.ratio, 19_000 / 25_000);
});
test('state: default = latest year, defaults omitted, unknown year → latest', () => {
  const d = parsePppState({});
  assert.deepEqual(d, { year: LATEST_YEAR, region: 'all', page: 1, view: 'chart' });
  assert.deepEqual(toPppParams(d), {});
  assert.equal(parsePppState({ year: '2019' }).year, LATEST_YEAR);
  assert.deepEqual(toPppParams(parsePppState({ year: '2023', region: 'asia', view: 'table' })), {
    year: '2023',
    region: 'asia',
    view: 'table',
  });
});

// ── Real files ────────────────────────────────────────────────────────────────────────────────────
test('meta.data ↔ DATA_FILES; published with a dated https source', () => {
  assert.deepEqual([...meta.data], [...DATA_FILES]);
  assert.equal(meta.status, 'published');
  assert.ok(meta.sources.every((s) => s.url.startsWith('https://') && /^\d{4}-\d{2}-\d{2}$/.test(s.retrieved)));
});
const real = Object.fromEntries(
  YEARS.map((y) => [y, parsePppDataset(JSON.parse(readFileSync(`public/data/gdp-ppp-per-capita/${dataFile(y)}`, 'utf8')), dataFile(y))]),
) as Record<number, PppDataset>;
test('real files: one vintage, WB World aggregate, coverage 197 → 195 → 185 of 217', () => {
  assert.deepEqual(YEARS.map((y) => real[y]!.rows.length), [197, 195, 185]);
  assert.deepEqual(YEARS.map((y) => Math.round(real[y]!.worldAverage)), [23_382, 24_544, 25_704]);
  assert.ok(YEARS.every((y) => real[y]!.rows.length <= WB_ECONOMIES));
  assert.ok(YEARS.every((y) => !real[y]!.rows.some((r) => r.code === 'TW')), 'Taiwan is not in WB data');
});
test('real 2025: Singapore first at 6.4×, Burundi last, Ukraine 0.74×, Haiti in the Americas', () => {
  const r = rankPpp(real[2025]!);
  assert.equal(r[0]!.code, 'SG');
  assert.equal(Math.round(r[0]!.ratio * 10) / 10, 6.4);
  assert.equal(r.at(-1)!.code, 'BI');
  const ua = r.find((x) => x.code === 'UA')!;
  assert.equal(Math.round(ua.value), 18_905);
  assert.equal(Math.round(ua.ratio * 100) / 100, 0.74);
  assert.equal(r.find((x) => x.code === 'HT')!.region, 'americas');
  assert.equal(r.filter((x) => x.ratio > 1).length, 80);
});

console.log(`✓ gdp-ppp — ${passed} tests passed.`);
