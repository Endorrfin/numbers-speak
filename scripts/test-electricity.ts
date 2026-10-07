// test-electricity.ts — CHANGED (S3-el): the electricity entry — five dataset contracts (and their rejections), the
// derivations the seven angles draw, the URL state, and the shipped files against their raw copies and each other.
// Run: npm test.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { csvParse } from 'd3';
import { DatasetError } from '../src/lib/dataset';
import {
  DATA_FILES,
  FILES,
  FUELS,
  GROUPS,
  OLDEST_YEAR,
  RANK_YEAR,
  groupValues,
  parseAccess,
  parseCountries,
  parseRace,
  parseUkraine,
  parseWorld,
  raceFrames,
  raceYear,
  rankAccess,
  rankCarbon,
  rankMix,
  rankProducers,
  renewablesPassCoal,
  ukraineYears,
  validateDataFile,
  withoutAccess,
  worldMix,
  znppShares,
} from '../src/viz/electricity/data';
import type { AccessDataset, CountriesDataset, RaceDataset, UkraineDataset, WorldDataset } from '../src/viz/electricity/data';
import meta from '../src/viz/electricity/meta';
import { parseElectricityState, switchShow, toElectricityParams } from '../src/viz/electricity/state';

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (e) {
    console.error(`✖ electricity: ${name}\n`, e);
    process.exit(1);
  }
}
const rejects = (fn: () => unknown, re: RegExp): void => assert.throws(fn, (e: unknown) => e instanceof DatasetError && re.test(e.message));
const J = (f: string): unknown => JSON.parse(readFileSync(`public/data/electricity/${f}`, 'utf8'));
const close = (a: number, b: number, eps: number, what = ''): void => assert.ok(Math.abs(a - b) <= eps, `${what} ${a} vs ${b}`);
const gen = (coal: number, gas: number, nuclear: number, hydro: number, wind: number, solar: number): number[] => [coal, gas, 0, nuclear, hydro, wind, solar, 0, 0];

const countries = (): CountriesDataset => ({
  retrieved: '2026-10-07',
  rankYear: 2024,
  world: { year: 2024, gen: gen(400, 300, 100, 150, 50, 50), demand: 1050, perCapita: 3.8, co2: 470 },
  rows: [
    { code: 'CN', region: 'asia', year: 2024, gen: gen(300, 20, 20, 60, 50, 50), demand: 500, perCapita: 6, co2: 550 },
    { code: 'FR', region: 'europe', year: 2024, gen: gen(0, 10, 80, 10, 0, 0), demand: 95, perCapita: 7, co2: 30 },
    { code: 'NO', region: 'europe', year: 2024, gen: gen(0, 0, 0, 100, 0, 0), demand: 100, perCapita: 24, co2: 10 },
    { code: 'UA', region: 'europe', year: 2022, gen: gen(20, 10, 60, 10, 1, 5), demand: 111, perCapita: 2.7, co2: null },
  ],
});

test('countries: a valid file parses; rejections name the path', () => {
  assert.deepEqual(parseCountries(countries()), countries());
  const bad = (patch: (d: CountriesDataset) => void): CountriesDataset => {
    const d = countries();
    patch(d);
    return d;
  };
  rejects(() => parseCountries(bad((d) => (d.rows[0]!.code = 'CHN'))), /rows\[0\]\.code/);
  rejects(() => parseCountries(bad((d) => (d.rows[1]!.code = 'CN'))), /duplicate code CN/);
  rejects(() => parseCountries(bad((d) => (d.rows[0]!.gen = [1, 2, 3]))), /rows\[0\]\.gen: at least 9/);
  rejects(() => parseCountries(bad((d) => (d.rows[0]!.gen = [...d.rows[0]!.gen, 1]))), /10 fuels, expected 9/);
  rejects(() => parseCountries(bad((d) => (d.rows[3]!.year = OLDEST_YEAR - 1))), /rows\[3\]\.year/);
  rejects(() => parseCountries(bad((d) => (d.rows[0]!.gen[0] = -1))), /gen\[0\]/);
  rejects(() => parseCountries(bad((d) => (d.world.year = 2025))), /expected the rank year/);
  rejects(() => parseCountries(bad((d) => (d.rows[0]!.gen[0] = 5000))), /more than the world/);
  rejects(() => parseCountries(bad((d) => (d.rows[2]!.gen = gen(0, 0, 0, 0, 0, 0)))), /no generation/);
  rejects(() => parseCountries(bad((d) => ((d as { retrieved: unknown }).retrieved = 'today'))), /retrieved/);
});

test('rankings: producers, per person, mix shares, carbon (no null), competition ranks', () => {
  const ds = countries();
  const total = rankProducers(ds, 'total');
  assert.deepEqual(total.map((r) => r.code), ['CN', 'UA', 'FR', 'NO']);
  assert.deepEqual(total.map((r) => r.rank), [1, 2, 3, 3]); // FR and NO both generate 100 TWh
  assert.equal(total[1]!.dated, true);
  close(total[0]!.share, 500 / 1050, 1e-12, 'China share');
  close(total[0]!.fossil, 320 / 500, 1e-12, 'China fossil');
  for (const r of total) close(r.groups.reduce((s, v) => s + v, 0), 1, 1e-12, `${r.code} groups`);
  assert.deepEqual(rankProducers(ds, 'per-capita').map((r) => r.code), ['NO', 'FR', 'CN', 'UA']);
  assert.deepEqual(rankMix(ds, 'clean').map((r) => r.code), ['NO', 'FR', 'UA', 'CN']);
  assert.deepEqual(rankMix(ds, 'fossil').map((r) => r.code), ['CN', 'UA', 'FR', 'NO']);
  assert.deepEqual(rankCarbon(ds, 'cleanest').map((r) => r.code), ['NO', 'FR', 'CN']);
  assert.deepEqual(rankCarbon(ds, 'dirtiest').map((r) => r.code), ['CN', 'FR', 'NO']);
  assert.deepEqual(groupValues(gen(1, 2, 3, 4, 5, 6)), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(groupValues([1, 2, 3, 4, 5, 6, 7, 8, 9]), [1, 5, 4, 5 + 8 + 9, 6, 7]);
});

const world = (): WorldDataset => ({
  retrieved: '2026-10-07',
  from: 2023,
  to: 2025,
  gen: Object.fromEntries(FUELS.map((f) => [f, f === 'coal' ? [40, 36, 33] : f === 'hydro' ? [15, 15, 15] : f === 'solar' ? [5, 9, 13] : f === 'wind' ? [8, 9, 10] : f === 'gas' ? [32, 31, 29] : [0, 0, 0]])) as WorldDataset['gen'],
  demand: [100, 100, 100],
  co2: [480, 470, 460],
});

test('world: mix shares, renewables pass coal, rejections', () => {
  assert.deepEqual(parseWorld(world()), world());
  const mix = worldMix(world());
  for (const m of mix) close(m.shares.reduce((s, v) => s + v, 0), 1, 1e-12);
  close(mix[2]!.renewables, 38 / 100, 1e-12);
  assert.equal(renewablesPassCoal(mix), 2025); // 2024: 33 vs 36; 2025: 38 vs 33
  rejects(() => parseWorld({ ...world(), co2: [1, 2] }), /co2/);
  rejects(() => parseWorld({ ...world(), to: 2023 }), /to/);
});

const race = (): RaceDataset => ({
  retrieved: '2026-10-07',
  from: 2023,
  to: 2024,
  lastYearCountries: 12,
  world: { solar: [100, 200], wind: [100, 120] },
  rows: Array.from({ length: 13 }, (_, i) => ({
    code: String.fromCharCode(65 + i) + 'A',
    region: 'asia' as const,
    solar: [i, i === 12 ? null : i * 2],
    wind: [1, 1],
  })),
});

test('race: frames interpolate, keep the top 12, end on the last year; one year’s table', () => {
  const ds = race();
  assert.deepEqual(parseRace(ds), ds);
  const frames = raceFrames(ds, 'solar', { steps: 4, top: 12 });
  assert.equal(frames.length, 5);
  assert.equal(frames.at(-1)!.time, 2024);
  assert.ok(frames.every((f) => f.rows.length <= 12));
  assert.equal(frames[0]!.rows[0]!.code, 'MA'); // 12 in 2023
  close(frames[2]!.rows.find((r) => r.code === 'LA')!.value, (11 + 22) / 2, 1e-12);
  assert.ok(!frames.at(-1)!.rows.some((r) => r.code === 'MA'), 'null in the last year = not in the frame');
  const y = raceYear(ds, 'solar', 2024);
  assert.equal(y[0]!.code, 'LA');
  close(y[0]!.share, 22 / 200, 1e-12);
  rejects(() => parseRace({ ...ds, rows: ds.rows.slice(0, 5) }), /at least 12/);
});

const ukraine = (): UkraineDataset => ({
  retrieved: '2026-10-07',
  from: 2020,
  to: 2022,
  gen: Object.fromEntries(FUELS.map((f) => [f, f === 'nuclear' ? [76, 86, 62] : f === 'coal' ? [40, 40, 23] : [10, 10, 10]])) as UkraineDataset['gen'],
  demand: [150, 154, 111],
  netImports: [-3, -2, 0.1],
  perCapita: [3.4, 3.5, 2.7],
  nuclear: { year: 2021, plants: { ZNPP: 36114, RNPP: 18270, SUNPP: 18812, KhNPP: 13010 }, energoatom: 86422, ukraine: 156577, znppMw: 6000, nuclearMw: 13835 },
});

test('ukraine: years, nuclear share, Zaporizhzhia shares, rejections', () => {
  assert.deepEqual(parseUkraine(ukraine()), ukraine());
  const years = ukraineYears(ukraine());
  close(years[1]!.nuclearShare, 86 / (86 + 40 + 70), 1e-12);
  const z = znppShares(ukraine().nuclear);
  close(z.ofUkraine, 36114 / 156577, 1e-12);
  close(z.ofNuclear, 36114 / 86206, 1e-12);
  close(z.ofCapacity, 6000 / 13835, 1e-12);
  assert.equal(z.otherNuclear, 50092);
  const d = ukraine();
  d.nuclear.energoatom = 1000;
  rejects(() => parseUkraine(d), /plants ≤ Energoatom ≤ Ukraine/);
  const e = ukraine();
  e.nuclear.znppMw = 20000;
  rejects(() => parseUkraine(e), /znppMw|exceeds/);
});

const access = (): AccessDataset => ({
  updated: '2026-07-13',
  year: 2024,
  firstYear: 2000,
  world: { access: 90, population: 8e9 },
  ssa: { access: 50, population: 1.2e9 },
  rows: [
    { code: 'SS', region: 'africa', year: 2024, access: 5, population: 12e6, first: null },
    { code: 'NG', region: 'africa', year: 2024, access: 60, population: 230e6, first: 40 },
    { code: 'UA', region: 'europe', year: 2024, access: 100, population: 38e6, first: 100 },
    { code: 'PL', region: 'europe', year: 2024, access: 100, population: 37e6, first: 100 },
    { code: 'ER', region: 'africa', year: 2021, access: 55, population: 3.5e6, first: 30 },
  ],
});

test('access: share lowest first with shared ranks, people without, rejections', () => {
  assert.deepEqual(parseAccess(access()), access());
  const share = rankAccess(access(), 'share');
  assert.deepEqual(share.map((r) => r.code), ['SS', 'ER', 'NG', 'PL', 'UA']);
  assert.deepEqual(share.map((r) => r.rank), [1, 2, 3, 4, 4]);
  assert.equal(share[1]!.dated, true);
  const people = rankAccess(access(), 'people');
  assert.deepEqual(people.map((r) => r.code), ['NG', 'SS', 'ER']); // nobody without = not ranked
  close(people[0]!.value, 0.4 * 230e6, 1);
  close(withoutAccess(access().world), 0.8e9, 1);
  rejects(() => parseAccess({ ...access(), rows: [{ ...access().rows[0]!, access: 101 }] }), /access/);
  rejects(() => parseAccess({ ...access(), rows: [{ ...access().rows[0]!, year: 2010 }] }), /year/);
});

test('state: defaults omitted, values per angle, unknowns dropped, switching resets', () => {
  const s = parseElectricityState({});
  assert.deepEqual(toElectricityParams(s), {});
  assert.deepEqual(toElectricityParams(parseElectricityState({ metric: 'per-capita', region: 'asia', page: '3', focus: 'pl,ua' })), {
    metric: 'per-capita',
    region: 'asia',
    page: '3',
    focus: 'pl,ua',
  });
  // metric of another angle, unknown values and parameters the angle does not use drop out.
  assert.deepEqual(toElectricityParams(parseElectricityState({ show: 'mix', metric: 'per-capita', order: 'clean', source: 'wind' })), { show: 'mix', order: 'clean' });
  assert.deepEqual(toElectricityParams(parseElectricityState({ show: 'carbon', order: 'size' })), { show: 'carbon' });
  assert.deepEqual(toElectricityParams(parseElectricityState({ show: 'access', metric: 'people', view: 'table' })), { show: 'access', metric: 'people', view: 'table' });
  assert.deepEqual(toElectricityParams(parseElectricityState({ show: 'race', source: 'wind', year: '2010', region: 'asia' })), { show: 'race', source: 'wind', year: '2010' });
  assert.deepEqual(toElectricityParams(parseElectricityState({ show: 'world', page: '2', focus: 'pl' })), { show: 'world' });
  assert.deepEqual(toElectricityParams(parseElectricityState({ show: 'nope', metric: '<b>', year: '3000x', source: 'coal' })), {});
  const switched = switchShow(parseElectricityState({ metric: 'per-capita', page: '4', region: 'asia', view: 'table', focus: 'pl' }), 'carbon');
  assert.deepEqual(toElectricityParams(switched), { show: 'carbon', view: 'table', focus: 'pl' });
});

// ── The shipped files ───────────────────────────────────────────────────────────────────────────────
const C = parseCountries(J(FILES.countries));
const W = parseWorld(J(FILES.world));
const R = parseRace(J(FILES.race));
const U = parseUkraine(J(FILES.ukraine));
const A = parseAccess(J(FILES.access));

test('shipped files: every one validates; meta.data lists exactly them', () => {
  for (const f of DATA_FILES) validateDataFile(f, J(f));
  assert.deepEqual([...meta.data].sort(), [...DATA_FILES].sort());
  rejects(() => validateDataFile('other.json', {}), /no parser/);
});

test('countries.json = ember-yearly.csv (independent read), Ukraine 2022, world 2024', () => {
  const raw = csvParse(readFileSync('data-raw/electricity/ember-yearly.csv', 'utf8'));
  const wpp = csvParse(readFileSync('data-raw/population-by-country/wpp2024-population-2025.csv', 'utf8'));
  const iso3 = new Map(wpp.filter((d) => d.iso2).map((d) => [d.iso2!, d.iso3!]));
  assert.equal(C.rankYear, RANK_YEAR);
  for (const r of C.rows) {
    const d = raw.find((x) => x.iso3 === iso3.get(r.code) && Number(x.year) === r.year);
    assert.ok(d, `${r.code} ${r.year} not in the raw file`);
    close(r.gen.reduce((s, v) => s + v, 0), Number(d.total), Math.max(0.06, Number(d.total) * 0.005), `${r.code} total`);
    close(r.gen[FUELS.indexOf('solar')]!, Number(d.solar), 1e-9, `${r.code} solar`);
    assert.ok(!raw.some((x) => x.iso3 === d.iso3 && Number(x.year) > r.year && Number(x.year) <= RANK_YEAR), `${r.code}: a newer year exists`);
  }
  const ua = C.rows.find((r) => r.code === 'UA')!;
  assert.equal(ua.year, 2022);
  close(ua.gen.reduce((s, v) => s + v, 0), 111.51, 0.02, 'Ukraine 2022');
  assert.equal(C.rows.filter((r) => r.year === RANK_YEAR).length, 195);
  close(C.world.gen.reduce((s, v) => s + v, 0), 30912.5, 0.1, 'world 2024');
  assert.deepEqual(rankProducers(C, 'total').slice(0, 3).map((r) => r.code), ['CN', 'US', 'IN']);
  assert.equal(rankProducers(C, 'per-capita')[0]!.code, 'IS');
});

test('world.json: 2000–2025, renewables passed coal in 2025, solar passed wind in 2025', () => {
  assert.equal(W.from, 2000);
  assert.equal(W.to, 2025);
  const mix = worldMix(W);
  assert.equal(renewablesPassCoal(mix), 2025);
  const last = mix.at(-1)!;
  close(last.renewables, 0.3377, 0.0005, 'renewables 2025');
  close(last.shares[GROUPS.indexOf('coal')]!, 0.3306, 0.0005, 'coal 2025');
  const solar = GROUPS.indexOf('solar');
  const wind = GROUPS.indexOf('wind');
  assert.equal(mix.find((m) => m.groups[solar]! > m.groups[wind]!)?.year, 2025);
});

test('race.json: ends in 2025 and no country missing that year could reach the top 12', () => {
  assert.equal(R.to, 2025);
  const raw = csvParse(readFileSync('data-raw/electricity/ember-yearly.csv', 'utf8')).filter((d) => d.iso3 !== 'WLD');
  assert.equal(new Set(raw.filter((d) => d.year === '2025').map((d) => d.iso3)).size, R.lastYearCountries);
  for (const src of ['solar', 'wind'] as const) {
    const cut = raceYear(R, src, 2025)[11]!.value;
    const has2025 = new Set(raw.filter((d) => d.year === '2025').map((d) => d.iso3));
    for (const d of raw.filter((x) => x.year === '2024' && !has2025.has(x.iso3!))) {
      assert.ok(Number(d[src]) * 1.5 < cut, `${src}: ${d.iso3} (2024: ${d[src]}) could have reached the top 12`);
    }
  }
  assert.deepEqual(raceYear(R, 'solar', 2025).slice(0, 2).map((r) => r.code), ['CN', 'US']);
});

test('ukraine.json: 1990–2022, both Ember files agree, Energoatom = Ember nuclear 2021', () => {
  assert.equal(U.from, 1990);
  assert.equal(U.to, 2022);
  const years = ukraineYears(U);
  close(years[0]!.total, 300.72, 0.01, '1990');
  close(years.at(-1)!.total, 111.51, 0.01, '2022');
  const global = csvParse(readFileSync('data-raw/electricity/ember-yearly.csv', 'utf8')).filter((d) => d.iso3 === 'UKR');
  for (const g of global) {
    const y = years.find((x) => x.year === Number(g.year))!;
    close(y.total, Number(g.total), Math.max(0.1, Number(g.total) * 0.01), `Ukraine ${g.year}`);
  }
  const nuclear2021 = Object.values(U.nuclear.plants).reduce((s, v) => s + v, 0) / 1000;
  close(nuclear2021, years.find((y) => y.year === 2021)!.groups[GROUPS.indexOf('nuclear')]!, 0.9, 'nuclear 2021');
  close(znppShares(U.nuclear).ofUkraine, 0.2306, 0.0005, 'ZNPP share');
});

test('access.json: 2024, World Bank aggregates, Ukraine 100 %, no dated rows yet', () => {
  assert.equal(A.year, 2024);
  close(A.world.access, 91.93, 0.01, 'world');
  close(withoutAccess(A.world) / 1e6, 657, 1, 'people without (millions)');
  assert.equal(A.rows.find((r) => r.code === 'UA')?.access, 100);
  assert.deepEqual(rankAccess(A, 'share').slice(0, 2).map((r) => r.code), ['SS', 'TD']);
  assert.deepEqual(rankAccess(A, 'people').slice(0, 2).map((r) => r.code), ['NG', 'CD']);
});

console.log(`✓ electricity: ${passed} tests passed.`);
process.exit(0);
