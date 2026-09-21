// test-births-deaths-per-day.ts — the per-day dataset contract, derivations, clock maths and URL state.
// CHANGED (S3-bdd): new. Run: npm test.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DATA_FILE,
  applyView,
  countSince,
  parsePerDayDataset,
  rankPerDay,
  summarizeWorld,
  validateDataFile,
} from '../src/viz/births-deaths-per-day/data';
import { PAGE_SIZE, pageOf, parsePerDayState, toPerDayParams } from '../src/viz/births-deaths-per-day/state';

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (e) {
    console.error(`✖ births-deaths-per-day: ${name}\n`, e);
    process.exit(1);
  }
}

const json = JSON.parse(readFileSync(`public/data/births-deaths-per-day/${DATA_FILE}`, 'utf8')) as unknown;
const ds = parsePerDayDataset(json);
const ranked = rankPerDay(ds);
const world = summarizeWorld(ranked);
const row = (code: string, births: number, deaths: number, population = 1e6) => ({
  code,
  region: 'europe',
  births,
  deaths,
  population,
});
const good = { year: 2026, unit: 'persons-per-day', rows: [row('IN', 10, 5), row('UA', 2, 4)] };

test('the real file parses: 235 countries, 2026, sorted by births', () => {
  assert.equal(ds.year, 2026);
  assert.equal(ds.rows.length, 235);
  assert.equal(ds.rows[0]!.code, 'IN');
  for (let i = 1; i < ds.rows.length; i++) assert.ok(ds.rows[i - 1]!.births >= ds.rows[i]!.births);
  validateDataFile(DATA_FILE, json);
});

test('world totals match the source workbook', () => {
  assert.equal(world.births, 362_714);
  assert.equal(world.deaths, 174_194);
  assert.equal(world.net, 188_520);
  assert.equal(world.shrinking, 47);
  assert.ok(Math.abs(world.birthsPerSecond - 4.198) < 0.001);
});

test('Ukraine: 663 births, 1,443 deaths, 2.18 deaths per birth', () => {
  const ua = ranked.find((r) => r.code === 'UA')!;
  assert.equal(ua.births, 663);
  assert.equal(ua.deaths, 1443);
  assert.equal(ua.net, -780);
  assert.equal(ua.ratio!.toFixed(2), '2.18');
  assert.equal(ua.region, 'europe');
});

test('ranks are global and 1-based; zero births → ratio null', () => {
  assert.deepEqual(ranked.slice(0, 3).map((r) => r.rank), [1, 2, 3]);
  const va = ranked.find((r) => r.code === 'VA')!;
  assert.equal(va.births, 0);
  assert.equal(va.ratio, null);
});

test('parser rejects bad files with a precise path', () => {
  assert.doesNotThrow(() => parsePerDayDataset(good));
  const bad = (patch: object, re: RegExp): void => assert.throws(() => parsePerDayDataset({ ...good, ...patch }), re);
  bad({ unit: 'per-year' }, /unit/);
  bad({ rows: [row('IN', 1, 1), row('UA', 2, 1)] }, /sorted by births/);
  bad({ rows: [row('IN', 2, 1), row('IN', 1, 1)] }, /duplicate code IN/);
  bad({ rows: [row('ind', 2, 1)] }, /rows\[0\]\.code/);
  bad({ rows: [row('IN', 1.5, 1)] }, /whole persons/);
  bad({ rows: [row('IN', 250_000, 1, 2e9)] }, /births/);
  bad({ rows: [row('IN', 100, 100, 1000)] }, /exceed the population/);
  bad({ rows: [{ ...row('IN', 2, 1), region: 'mars' }] }, /region/);
  assert.throws(() => validateDataFile('other.json', good), /no parser/);
});

test('countSince: whole persons, never negative, linear in time', () => {
  assert.equal(countSince(0, world.births), 0);
  assert.equal(countSince(-5, world.births), 0);
  assert.equal(countSince(Number.NaN, world.births), 0);
  assert.equal(countSince(86_400, world.births), world.births);
  assert.equal(countSince(10, world.births), 41); // 4.198/s × 10 s
  assert.equal(countSince(60, world.deaths), 120); // 2.016/s × 60 s
});

test('URL state: defaults omitted, junk falls back, round-trips', () => {
  assert.deepEqual(parsePerDayState({}), { region: 'all', only: 'all', sort: 'births', page: 1, view: 'chart' });
  assert.deepEqual(toPerDayParams(parsePerDayState({})), {});
  const s = parsePerDayState({ region: 'africa', only: 'shrinking', sort: 'net', page: '3', view: 'table' });
  assert.deepEqual(toPerDayParams(s), { region: 'africa', only: 'shrinking', sort: 'net', page: '3', view: 'table' });
  assert.deepEqual(parsePerDayState({ region: '<x>', only: 'yes', sort: 'alpha', page: '-1', view: 'pie' }), {
    region: 'all',
    only: 'all',
    sort: 'births',
    page: 1,
    view: 'chart',
  });
});

// CHANGED (S3-bdd2): region chips, the "deaths > births" filter and the three sort keys.
const view = (o: Partial<Parameters<typeof applyView>[1]>) =>
  applyView(ranked, { region: 'all', onlyShrinking: false, sort: 'births', ...o });

test('applyView: region filter keeps the global rank and only that region', () => {
  const europe = view({ region: 'europe' });
  assert.ok(europe.every((r) => r.region === 'europe'));
  assert.equal(europe.length, ranked.filter((r) => r.region === 'europe').length);
  assert.equal(europe[0]!.code, 'RU');
  assert.ok(europe[0]!.rank > 1, 'rank stays global');
});

test('applyView: the shrinking filter keeps exactly the 47 countries where deaths > births', () => {
  const only = view({ onlyShrinking: true, sort: 'ratio' });
  assert.equal(only.length, world.shrinking);
  assert.ok(only.every((r) => r.deaths > r.births));
  assert.equal(only[0]!.code, 'UA', 'Ukraine has the highest deaths per birth');
  for (let i = 1; i < only.length; i++) assert.ok(only[i - 1]!.ratio! >= only[i]!.ratio!, 'descending');
});

test('applyView: sort keys order as documented and combine with the filters', () => {
  const births = view({});
  assert.equal(births[0]!.code, 'IN');
  const net = view({ sort: 'net' });
  assert.equal(net[0]!.code, 'CN', 'biggest daily loss first');
  assert.ok(net[0]!.net < 0);
  const ratio = view({ sort: 'ratio' });
  assert.equal(ratio.at(-1)!.ratio, null, 'countries without births go last');
  const europeShrinking = view({ region: 'europe', onlyShrinking: true, sort: 'net' });
  assert.ok(europeShrinking.every((r) => r.region === 'europe' && r.deaths > r.births));
  assert.ok(europeShrinking.length > 0 && europeShrinking.length < world.shrinking);
});

test('applyView is pure: it never reorders or mutates the input', () => {
  const before = ranked.map((r) => r.code);
  view({ sort: 'net' });
  assert.deepEqual(ranked.map((r) => r.code), before);
});

test('pageOf finds Ukraine in the full and the Europe-filtered lists', () => {
  const p = pageOf(ranked, 'UA')!;
  const i = ranked.findIndex((r) => r.code === 'UA');
  assert.equal(p, Math.floor(i / PAGE_SIZE) + 1);
  const europe = ranked.filter((r) => r.region === 'europe');
  assert.ok(pageOf(europe, 'UA')! >= 1);
  assert.equal(pageOf(ranked.filter((r) => r.region === 'asia'), 'UA'), null);
});

console.log(`✓ births-deaths-per-day — ${passed} tests passed.`);
