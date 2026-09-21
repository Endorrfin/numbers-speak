// test-global-brands.ts — the brand dataset contract, frames, shares and URL state (pure). Run: npm test.
// CHANGED (S3-br): new.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatasetError } from '../src/lib/dataset';
import {
  DATA_FILE,
  FIRST_YEAR,
  GROUPS,
  LATEST_YEAR,
  SECTORS,
  SECTOR_GROUP,
  buildFrames,
  frameOfYear,
  groupShares,
  parseBrandDataset,
  rankYear,
  validateDataFile,
  yearOfFrame,
} from '../src/viz/global-brands-race/data';
import type { BrandDataset } from '../src/viz/global-brands-race/data';
import meta from '../src/viz/global-brands-race/meta';
import { parseRaceState, toRaceParams } from '../src/viz/global-brands-race/state';
import { PUBLIC_DATA_DIR } from './lib/viz-folders';

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (e) {
    console.error(`✖ global-brands: ${name}\n`, e);
    process.exit(1);
  }
}

const file = join(PUBLIC_DATA_DIR, 'global-brands-race', DATA_FILE);
const raw = JSON.parse(readFileSync(file, 'utf8')) as BrandDataset;
const data = parseBrandDataset(raw);
const clone = (): BrandDataset => JSON.parse(JSON.stringify(raw)) as BrandDataset;
const rejects = (mutate: (d: BrandDataset) => void, pattern: RegExp): void => {
  const d = clone();
  mutate(d);
  assert.throws(() => parseBrandDataset(d), (e: unknown) => e instanceof DatasetError && pattern.test(e.message));
};

test('the shipped file parses: 26 years, 75 brands in 2000 and 100 after', () => {
  assert.equal(data.years.length, LATEST_YEAR - FIRST_YEAR + 1);
  assert.equal(data.years[0]!.entries.length, 75);
  for (const y of data.years.slice(1)) assert.equal(y.entries.length, 100, String(y.year));
  assert.equal(data.brands.length, 195);
});

test('known published values (US$ m) and leaders', () => {
  const at = (year: number, id: string) => data.years.find((y) => y.year === year)!.entries.find((e) => e.id === id);
  assert.deepEqual(data.years[0]!.entries.slice(0, 3).map((e) => e.id), ['coca-cola', 'microsoft', 'ibm']);
  assert.equal(at(2000, 'coca-cola')!.value, 72537);
  assert.equal(at(2019, 'apple')!.value, 234241);
  assert.equal(at(2025, 'apple')!.value, 470900);
  assert.equal(at(2025, 'nvidia')!.value, 43200);
  assert.equal(data.years.at(-1)!.entries[1]!.id, 'microsoft');
});

test('renamed brands are one brand across years', () => {
  const ids = (year: number) => new Set(data.years.find((y) => y.year === year)!.entries.map((e) => e.id));
  for (const id of ['salesforce', 'santander', 'l-oreal-paris', 'nescafe', 'mastercard']) {
    assert.ok(ids(2019).has(id) && ids(2020).has(id), id);
  }
  assert.ok(!data.brands.some((b) => ['salesforce-com', 'banco-santander', 'l-oreal'].includes(b.id)));
});

test('every sector belongs to exactly one group, every group has a sector', () => {
  for (const s of SECTORS) assert.ok(GROUPS.includes(SECTOR_GROUP[s]), s);
  for (const g of GROUPS) assert.ok(SECTORS.some((s) => SECTOR_GROUP[s] === g), g);
});

test('the parser rejects broken files with a precise path', () => {
  rejects((d) => void (d.unit = 'usd-billions' as 'usd-millions'), /unit/);
  rejects((d) => void (d.years[3]!.entries[0]!.value = 1), /rank order/);
  rejects((d) => void (d.years[3]!.entries[5]!.id = 'nobody'), /unknown brand/);
  rejects((d) => void (d.years[3]!.entries[5]!.id = d.years[3]!.entries[4]!.id), /duplicate brand/);
  rejects((d) => void (d.years[3]!.entries[0]!.value = 12.5), /whole US\$ millions|rank order/);
  rejects((d) => void (d.brands[0]!.country = 'usa'), /country/);
  rejects((d) => void (d.brands[0]!.sector = 'crypto' as 'retail'), /sector/);
  rejects((d) => void d.years.splice(4, 1), /consecutive/);
  rejects((d) => void d.brands.push({ id: 'ghost', name: 'Ghost', sector: 'retail', country: 'US' }), /never ranked/);
  assert.throws(() => validateDataFile('other.json', raw), /unexpected data file/);
});

test('rankYear: global ranks, change vs the previous year, group filter keeps global ranks', () => {
  const r = rankYear(data, 2025);
  assert.equal(r[0]!.brand.name, 'Apple');
  assert.ok(Math.abs(r[0]!.change! - (470900 / 488900 - 1)) < 1e-12);
  assert.equal(rankYear(data, 2000)[0]!.change, null);
  const auto = rankYear(data, 2025, 'auto');
  assert.ok(auto.every((x) => SECTOR_GROUP[x.brand.sector] === 'auto'));
  assert.equal(auto[0]!.brand.name, 'Toyota');
  assert.equal(auto[0]!.rank, 6);
  assert.deepEqual(rankYear(data, 1999), []);
  const newcomer = r.find((x) => x.brand.id === 'blackrock')!;
  assert.equal(newcomer.change, null);
});

test('buildFrames: count, times, top-N, order, interpolation, group', () => {
  const frames = buildFrames(data, { steps: 4, top: 12 });
  assert.equal(frames.length, (LATEST_YEAR - FIRST_YEAR) * 4 + 1);
  assert.equal(frames[0]!.time, FIRST_YEAR);
  assert.equal(frames.at(-1)!.time, LATEST_YEAR);
  assert.equal(frames[2]!.time, FIRST_YEAR + 0.5);
  for (const f of frames) {
    assert.ok(f.rows.length <= 12);
    for (let i = 1; i < f.rows.length; i++) assert.ok(f.rows[i - 1]!.value >= f.rows[i]!.value);
  }
  // Frames at whole years equal the ranking; halfway is the mean of both years.
  assert.deepEqual(frames.at(-1)!.rows.map((r) => r.id), rankYear(data, 2025).slice(0, 12).map((r) => r.brand.id));
  const cc = (i: number) => frames[i]!.rows.find((r) => r.id === 'coca-cola')!.value;
  const v2000 = rankYear(data, 2000)[0]!.value;
  const v2001 = rankYear(data, 2001).find((r) => r.brand.id === 'coca-cola')!.value;
  assert.equal(cc(2), (v2000 + v2001) / 2);
  const auto = buildFrames(data, { steps: 1, top: 5, group: 'auto' });
  assert.equal(auto.length, LATEST_YEAR - FIRST_YEAR + 1);
  assert.ok(auto.every((f) => f.rows.every((r) => data.brands.find((b) => b.id === r.id)!.sector === 'automotive')));
});

test('frame ↔ year helpers', () => {
  assert.equal(frameOfYear(2000, 2000, 8), 0);
  assert.equal(frameOfYear(2025, 2000, 8), 200);
  assert.equal(yearOfFrame(3, 2000, 8), 2000);
  assert.equal(yearOfFrame(4, 2000, 8), 2001);
  assert.equal(yearOfFrame(200, 2000, 8), 2025);
});

test('groupShares add up to 1 and match the story (tech 47 % → 63 %)', () => {
  for (const year of [2000, 2025]) {
    const s = groupShares(data, year);
    assert.ok(Math.abs(s.reduce((a, g) => a + g.share, 0) - 1) < 1e-9);
    assert.equal(s.reduce((a, g) => a + g.count, 0), year === 2000 ? 75 : 100);
  }
  assert.equal(Math.round(groupShares(data, 2000).find((g) => g.group === 'tech')!.share * 100), 47);
  assert.equal(Math.round(groupShares(data, 2025).find((g) => g.group === 'tech')!.share * 100), 63);
  // The description's claim: the top four hold 42 % of the 2025 total.
  const r = rankYear(data, 2025);
  const total = r.reduce((a, x) => a + x.value, 0);
  assert.equal(Math.round((r.slice(0, 4).reduce((a, x) => a + x.value, 0) / total) * 100), 42);
});

test('URL state: defaults omitted, junk falls back, round trip', () => {
  assert.deepEqual(parseRaceState({}), { year: LATEST_YEAR, group: 'all', view: 'chart' });
  assert.deepEqual(toRaceParams(parseRaceState({})), {});
  assert.deepEqual(parseRaceState({ year: '1999', group: 'crypto', view: 'x' }), parseRaceState({}));
  assert.equal(parseRaceState({ year: '2012.5' }).year, LATEST_YEAR);
  assert.equal(parseRaceState({ year: '<script>' }).year, LATEST_YEAR);
  const s = { year: 2008, group: 'finance' as const, view: 'table' as const };
  assert.deepEqual(toRaceParams(s), { year: '2008', group: 'finance', view: 'table' });
  assert.deepEqual(parseRaceState(toRaceParams(s)), s);
});

test('manifest ↔ data: file list, period, sources', () => {
  assert.deepEqual([...meta.data], [DATA_FILE]);
  assert.deepEqual(meta.period, { from: FIRST_YEAR, to: LATEST_YEAR });
  assert.ok(existsSync(file));
  assert.ok(meta.sources.some((s) => s.url.startsWith('https://interbrand.com/')));
});

console.log(`✓ global-brands — ${passed} tests passed.`);
