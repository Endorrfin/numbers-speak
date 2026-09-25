// test-population.ts — population-by-country (S3-rb): dataset contract, density join with land-area, rankings,
// URL state and the real files in public/data. Run: npm test.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatasetError } from '../src/lib/dataset';
import {
  APPROX_AREA_BELOW,
  DATA_FILE,
  DATA_FILES,
  densityOf,
  parsePopDataset,
  rankPopulation,
  regionShares,
  validateDataFile,
} from '../src/viz/population-by-country/data';
import type { PopDataset } from '../src/viz/population-by-country/data';
import { parseAreaDataset } from '../src/viz/land-area/data';
import type { AreaDataset } from '../src/viz/land-area/data';
import meta from '../src/viz/population-by-country/meta';
import { parsePopulationState, toPopulationParams } from '../src/viz/population-by-country/state';

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (e) {
    console.error(`✖ population: ${name}\n`, e);
    process.exit(1);
  }
}

const good = (): PopDataset => ({
  year: 2025,
  world: 1_100,
  rows: [
    { code: 'IN', region: 'asia', population: 1_000 },
    { code: 'UA', region: 'europe', population: 60, note: 'recognized-borders' },
    { code: 'MC', region: 'europe', population: 30 },
    { code: 'XK', region: 'europe', population: 10 },
  ],
});
const area = (): AreaDataset => ({
  totalWorld: 4_601,
  landWorld: 4_101,
  rows: [
    { code: 'IN', region: 'asia', totalArea: 4_000, landArea: 3_500 },
    { code: 'UA', region: 'europe', totalArea: 600, landArea: 600, note: 'recognized-borders' },
    { code: 'MC', region: 'europe', totalArea: 1, landArea: 1 },
  ],
});
const rejects = (patch: (d: PopDataset) => void, msg: RegExp): void => {
  const d = good();
  patch(d);
  assert.throws(() => parsePopDataset(d), (e: unknown) => e instanceof DatasetError && msg.test(e.message));
};

// ── Dataset contract ──────────────────────────────────────────────────────────────────────────────
test('parses a valid dataset', () => assert.equal(parsePopDataset(good()).rows.length, 4));
test('rejects a non-object', () => assert.throws(() => parsePopDataset([]), DatasetError));
test('rejects a lower-case or 3-letter code', () => {
  rejects((d) => (d.rows[0]!.code = 'in'), /rows\[0\]\.code/);
  rejects((d) => (d.rows[0]!.code = 'IND'), /rows\[0\]\.code/);
});
test('rejects a duplicate code', () => rejects((d) => (d.rows[1]!.code = 'IN'), /duplicate/));
test('rejects an unknown region', () => rejects((d) => ((d.rows[1] as { region: unknown }).region = 'America'), /region/));
test('rejects zero, fractional or thousand-scaled population', () => {
  rejects((d) => (d.rows[0]!.population = 0), /outside/);
  rejects((d) => (d.rows[0]!.population = 1000.5), /whole number/);
  rejects((d) => (d.rows[0]!.population = 6e9), /outside/);
});
test('rejects an unknown note', () => rejects((d) => ((d.rows[1] as { note: unknown }).note = 'crimea'), /note/));
test('rejects a world total that is not the sum of rows', () => rejects((d) => (d.world = 2_000), /does not match/));
test('validateDataFile accepts only its own file', () => {
  assert.doesNotThrow(() => validateDataFile(DATA_FILE, good()));
  assert.throws(() => validateDataFile('other.json', good()), DatasetError);
});

// ── Rankings and the density join ─────────────────────────────────────────────────────────────────
test('population: all rows ranked, largest first, share of world', () => {
  const r = rankPopulation(good(), 'population', null);
  assert.deepEqual(r.map((x) => x.code), ['IN', 'UA', 'MC', 'XK']);
  assert.deepEqual(r.map((x) => x.rank), [1, 2, 3, 4]);
  assert.equal(r[0]!.share, 1_000 / 1_100);
  assert.ok(r.every((x) => x.densityNote === undefined), 'no density notes when density was not asked for');
});
test('density = population ÷ LAND area; densest first; rows without area unranked and last', () => {
  const r = rankPopulation(good(), 'density', area());
  assert.deepEqual(r.map((x) => x.code), ['MC', 'IN', 'UA', 'XK']);
  assert.equal(r[0]!.density, 30);
  assert.equal(r[1]!.density, 1_000 / 3_500);
  assert.deepEqual(r.map((x) => x.rank), [1, 2, 3, null]);
  assert.equal(r[3]!.value, null);
  assert.equal(r[3]!.densityNote, 'no-area');
});
test(`density is marked approximate below ${APPROX_AREA_BELOW} km², except a corrected (precise) area`, () => {
  const r = rankPopulation(good(), 'density', area());
  assert.equal(r.find((x) => x.code === 'MC')!.densityNote, 'approx-area');
  assert.equal(r.find((x) => x.code === 'IN')!.densityNote, undefined);
  const a = area();
  a.rows[2] = { ...a.rows[2]!, landArea: 0.49, totalArea: 0.49, note: 'corrected' };
  assert.equal(rankPopulation(good(), 'density', a).find((x) => x.code === 'MC')!.densityNote, undefined);
});
test('densityOf = Σ population ÷ Σ land area over rows with an area', () => {
  const d = densityOf(rankPopulation(good(), 'density', area()))!;
  assert.equal(d.count, 3);
  assert.equal(d.density, 1_090 / 4_101);
  assert.equal(densityOf(rankPopulation(good(), 'population', null)), null);
});
test('regionShares sum to 1', () => {
  const s = regionShares(good());
  assert.equal(Math.round(s.reduce((a, g) => a + g.share, 0) * 1e9) / 1e9, 1);
});

// ── URL state ─────────────────────────────────────────────────────────────────────────────────────
test('state: defaults omitted, unknown values fall back', () => {
  const d = parsePopulationState({});
  assert.deepEqual(d, { metric: 'population', region: 'all', page: 1, view: 'chart' });
  assert.deepEqual(toPopulationParams(d), {});
  assert.deepEqual(parsePopulationState({ metric: 'x', region: '<b>', page: '-3', view: 'y' }), d);
  const s = parsePopulationState({ metric: 'density', region: 'europe', page: '2', view: 'table' });
  assert.deepEqual(toPopulationParams(s), { metric: 'density', region: 'europe', page: '2', view: 'table' });
});

// ── Real files ────────────────────────────────────────────────────────────────────────────────────
const real = parsePopDataset(JSON.parse(readFileSync(`public/data/population-by-country/${DATA_FILE}`, 'utf8')));
const realArea = parseAreaDataset(JSON.parse(readFileSync('public/data/land-area/land-area.json', 'utf8')));
test('meta.data ↔ DATA_FILES; published with a dated https source', () => {
  assert.deepEqual([...meta.data], [...DATA_FILES]);
  assert.equal(meta.status, 'published');
  assert.ok(meta.sources.every((s) => s.url.startsWith('https://') && /^\d{4}-\d{2}-\d{2}$/.test(s.retrieved)));
});
test('real file: 237 rows, WPP 2024 world 8,231,613,070, India first, Ukraine 38,980,376 marked', () => {
  assert.equal(real.year, 2025);
  assert.equal(real.rows.length, 237);
  assert.equal(real.world, 8_231_613_070);
  const r = rankPopulation(real, 'population', null);
  assert.deepEqual(r.slice(0, 3).map((x) => x.code), ['IN', 'CN', 'US']);
  assert.equal(r[0]!.population, 1_463_865_525);
  const ua = r.find((x) => x.code === 'UA')!;
  assert.equal(ua.population, 38_980_376);
  assert.equal(ua.note, 'recognized-borders');
  assert.equal(r.find((x) => x.code === 'RU')!.note, 'recognized-borders');
  assert.equal(r.find((x) => x.code === 'HT')!.region, 'americas'); // CATALOG §E Q1
});
test('real join: 234 densities, Guernsey / Jersey / Kosovo without; Monaco approximate; world ≈ WPP 63.1/km²', () => {
  const r = rankPopulation(real, 'density', realArea);
  assert.equal(r.filter((x) => x.rank !== null).length, 234);
  assert.deepEqual(r.filter((x) => x.rank === null).map((x) => x.code).sort(), ['GG', 'JE', 'XK']);
  assert.equal(r[0]!.code, 'MC');
  assert.equal(r[0]!.densityNote, 'approx-area');
  assert.equal(r.find((x) => x.code === 'VA')!.densityNote, undefined); // corrected, precise 0.49 km²
  assert.equal(r.at(-4)!.code, 'GL'); // sparsest ranked row: Greenland (ice sheet is not land)
  const w = densityOf(r)!;
  assert.ok(Math.abs(w.density - 63.124) / 63.124 < 0.01, `world density ${w.density} within 1 % of WPP's 63.124`);
});

console.log(`✓ population — ${passed} tests passed.`);
