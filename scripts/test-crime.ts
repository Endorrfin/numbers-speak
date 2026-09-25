// test-crime.ts — crime-index (S3-rb): both dataset contracts, rankings, derived safety index, URL state and the
// real files in public/data. Run: npm test.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { DatasetError } from '../src/lib/dataset';
import {
  HOMICIDE_FILE,
  NUMBEO_FILE,
  OLDEST_YEAR,
  parseHomicideDataset,
  parseNumbeoDataset,
  rankHomicide,
  rankNumbeo,
  validateDataFile,
} from '../src/viz/crime-index/data';
import type { HomicideDataset, NumbeoDataset } from '../src/viz/crime-index/data';
import meta from '../src/viz/crime-index/meta';
import { parseCrimeState, toCrimeParams } from '../src/viz/crime-index/state';

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (e) {
    console.error(`✖ crime: ${name}\n`, e);
    process.exit(1);
  }
}

const hom = (): HomicideDataset => ({
  edition: '2026-07-12',
  latestYear: 2024,
  worldRate: 5,
  rows: [
    { code: 'HT', region: 'americas', rate: 64.3, victims: 7_500, year: 2024 },
    { code: 'IQ', region: 'asia', rate: 15.4, victims: 5_459, year: 2021, note: 'partial-territory' },
    { code: 'GB', region: 'europe', rate: 0.93, victims: 640, year: 2023, note: 'combined' },
  ],
});
const num = (): NumbeoDataset => ({
  edition: '2026 Mid-Year',
  rows: [
    { code: 'PG', region: 'oceania', crimeIndex: 80.8 },
    { code: 'UA', region: 'europe', crimeIndex: 46.9 },
  ],
});
const rejectsH = (patch: (d: HomicideDataset) => void, msg: RegExp): void => {
  const d = hom();
  patch(d);
  assert.throws(() => parseHomicideDataset(d), (e: unknown) => e instanceof DatasetError && msg.test(e.message));
};

test('homicide: parses a valid dataset', () => assert.equal(parseHomicideDataset(hom()).rows.length, 3));
test('homicide: rejects unsorted rates, a fractional count, a too-old or future year, an unknown note', () => {
  rejectsH((d) => (d.rows[2]!.rate = 99), /sorted/);
  rejectsH((d) => (d.rows[0]!.victims = 1.5), /whole/);
  rejectsH((d) => (d.rows[0]!.year = OLDEST_YEAR - 1), /year/);
  rejectsH((d) => (d.rows[0]!.year = 2025), /year/);
  rejectsH((d) => ((d.rows[0] as { note: unknown }).note = 'estimate'), /note/);
  rejectsH((d) => (d.edition = '12/07/2026'), /edition/);
});
test('numbeo: parses; rejects out-of-range or unsorted index, duplicates', () => {
  assert.equal(parseNumbeoDataset(num()).rows.length, 2);
  const bad = num();
  bad.rows[0]!.crimeIndex = 101;
  assert.throws(() => parseNumbeoDataset(bad), /crimeIndex/);
  const uns = num();
  uns.rows[1]!.crimeIndex = 90;
  assert.throws(() => parseNumbeoDataset(uns), /sorted/);
  const dup = num();
  dup.rows[1]!.code = 'PG';
  assert.throws(() => parseNumbeoDataset(dup), /duplicate/);
});
test('validateDataFile routes by file name', () => {
  assert.doesNotThrow(() => validateDataFile(HOMICIDE_FILE, hom()));
  assert.doesNotThrow(() => validateDataFile(NUMBEO_FILE, num()));
  assert.throws(() => validateDataFile('x.json', hom()), DatasetError);
});
test('rankHomicide marks rows older than the latest year; rankNumbeo derives safety = 100 − crime', () => {
  const h = rankHomicide(hom());
  assert.deepEqual(h.map((r) => [r.rank, r.olderYear]), [[1, undefined], [2, 2021], [3, 2023]]);
  assert.equal(h[1]!.note, 'partial-territory');
  const n = rankNumbeo(num());
  assert.equal(n[0]!.safetyIndex, 19.2);
  assert.equal(n[1]!.safetyIndex, 53.1);
});
test('state: homicide by default, defaults omitted', () => {
  assert.deepEqual(parseCrimeState({}), { show: 'homicide', region: 'all', page: 1, view: 'chart' });
  assert.deepEqual(toCrimeParams(parseCrimeState({ show: 'x', region: 'y', page: '0' })), {});
  assert.deepEqual(toCrimeParams(parseCrimeState({ show: 'numbeo', region: 'americas', page: '2', view: 'table' })), {
    show: 'numbeo',
    region: 'americas',
    page: '2',
    view: 'table',
  });
});

// ── Real files ────────────────────────────────────────────────────────────────────────────────────
test('meta: every listed file exists and parses; dated https sources', () => {
  assert.ok(meta.data.length >= 1);
  for (const f of meta.data) assert.doesNotThrow(() => validateDataFile(f, JSON.parse(readFileSync(`public/data/crime-index/${f}`, 'utf8'))));
  assert.ok(meta.sources.every((s) => s.url.startsWith('https://') && /^\d{4}-\d{2}-\d{2}$/.test(s.retrieved)));
});
test('real homicide file: UNODC 2024 world estimate, Haiti in the Americas, UK combined, Iraq partial, Ukraine 2021', () => {
  const d = parseHomicideDataset(JSON.parse(readFileSync(`public/data/crime-index/${HOMICIDE_FILE}`, 'utf8')));
  assert.equal(d.latestYear, 2024);
  assert.equal(Math.round(d.worldRate * 100) / 100, 5.14);
  const r = rankHomicide(d);
  const by = (c: string) => r.find((x) => x.code === c)!;
  assert.equal(by('HT').region, 'americas');
  assert.equal(by('GB').note, 'combined');
  assert.ok(by('GB').value > 0.5 && by('GB').value < 1.1, `UK combined ${by('GB').value} lies between its parts`);
  assert.equal(by('IQ').note, 'partial-territory');
  assert.equal(by('UA').olderYear, 2021);
  assert.ok(r.every((x) => /^[A-Z]{2}$/.test(x.code)));
});
// CHANGED (S3-rb): the owner's Numbeo copy shipped — the file is listed in meta.data and checked unconditionally.
test('real Numbeo file: listed, 148 countries in Numbeo’s order, Haiti in the Americas, safety derived', () => {
  assert.ok(meta.data.includes(NUMBEO_FILE));
  assert.ok(existsSync(`public/data/crime-index/${NUMBEO_FILE}`));
  const d = parseNumbeoDataset(JSON.parse(readFileSync(`public/data/crime-index/${NUMBEO_FILE}`, 'utf8')));
  assert.equal(d.edition, '2026 Mid-Year');
  assert.equal(d.rows.length, 148);
  const r = rankNumbeo(d);
  assert.deepEqual([r[0]!.code, r[0]!.value, r[0]!.safetyIndex], ['PG', 80.8, 19.2]);
  assert.deepEqual([r.at(-1)!.code, r.at(-1)!.value], ['AD', 13.5]);
  const rank = (c: string) => r.find((x) => x.code === c)?.rank;
  assert.deepEqual([rank('JM'), rank('GY')], [9, 10], 'equal indexes keep Numbeo’s order');
  assert.equal(d.rows.find((x) => x.code === 'HT')?.region, 'americas');
  assert.equal(d.rows.find((x) => x.code === 'UA')?.crimeIndex, 46.9);
});

console.log(`✓ crime — ${passed} tests passed.`);
