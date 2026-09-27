// test-real-estate-world.ts — CHANGED (S3-re): real-estate-world — the dataset contract (ids, coordinates, Numbeo's
// rank order), the derived measures and rankings, the rank correlation, URL state, the land layer, and the real file
// against the owner's raw Numbeo copies (read here with an independent parser, so a prep bug cannot hide behind its
// own reading). Run: npm test.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { geoEqualEarth } from 'd3';
import { M49_REGION } from '../data-raw/_shared/m49';
import { DatasetError } from '../src/lib/dataset';
import {
  DATA_FILE,
  DATA_FILES,
  LAND_FILE,
  MEASURES,
  allRanks,
  measureValue,
  median,
  parseLand,
  parseRealEstateDataset,
  premium,
  rankBy,
  rankByMeasure,
  rankCorrelation,
  validateDataFile,
} from '../src/viz/real-estate-world/data';
import type { RealEstateDataset } from '../src/viz/real-estate-world/data';
import meta from '../src/viz/real-estate-world/meta';
import { MAX_CITIES, NEIGHBOURS, defaultCities, parseCities, parseRealEstateState, toRealEstateParams } from '../src/viz/real-estate-world/state';

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (e) {
    console.error(`✖ real-estate-world: ${name}\n`, e);
    process.exit(1);
  }
}

const fixture = (): RealEstateDataset => ({
  retrieved: '2026-09-27',
  rows: [
    { id: 'alpha-ch', numbeo: 'Alpha, Switzerland', name: { en: 'Alpha', uk: 'Альфа' }, code: 'CH', region: 'europe', lat: 47, lon: 8, centre: 1000, centreRank: 1, outside: 500, outsideRank: 1, income: 10, incomeRank: 2, mortgage: 90.5, rent: 20, rentOutside: 18 },
    { id: 'beta-jp', numbeo: 'Beta, Japan', name: { en: 'Beta', uk: 'Бета' }, code: 'JP', region: 'asia', lat: 35, lon: 139, centre: 800, centreRank: 2, outside: 400, outsideRank: 2, income: 20, incomeRank: 1 },
    { id: 'gamma-ua', numbeo: 'Gamma, Ukraine', name: { en: 'Gamma', uk: 'Гамма' }, code: 'UA', region: 'europe', lat: 50, lon: 30, centre: 800, centreRank: 3 },
    { id: 'delta-br', numbeo: 'Delta, Brazil', name: { en: 'Delta', uk: 'Дельта' }, code: 'BR', region: 'americas', lat: -23, lon: -46, outside: 300, outsideRank: 3 },
  ],
});
const rejects = (patch: (d: RealEstateDataset) => void, msg: RegExp): void => {
  const d = fixture();
  patch(d);
  assert.throws(() => parseRealEstateDataset(d), (e: unknown) => e instanceof DatasetError && msg.test(e.message));
};
const mutable = (d: RealEstateDataset, i: number) => d.rows[i] as unknown as Record<string, unknown>;

test('contract: parses a valid dataset, ties allowed', () => assert.equal(parseRealEstateDataset(fixture()).rows.length, 4));
test('contract: rejects a rank gap, a rising value, a value without its rank', () => {
  rejects((d) => (d.rows[2]!.centreRank = 4), /ranks must run/);
  rejects((d) => (d.rows[2]!.centre = 900), /higher than rank/);
  rejects((d) => delete mutable(d, 3).outsideRank, /come together/);
});
test('contract: rejects bad ids and coordinates', () => {
  rejects((d) => (d.rows[0]!.id = 'Alpha-CH'), /does not match/);
  rejects((d) => (d.rows[0]!.id = 'alpha-de'), /must end with -ch/);
  rejects((d) => (d.rows[1]!.id = 'alpha-ch', d.rows[1]!.code = 'CH'), /duplicate id/);
  rejects((d) => (d.rows[0]!.lat = 91), /lat/);
  rejects((d) => delete mutable(d, 0).lon, /lon/);
});
test('contract: rejects duplicates, bad codes, empty names, orphan companions, empty rows, bad dates', () => {
  rejects((d) => (d.rows[1]!.numbeo = 'Alpha, Switzerland'), /duplicate city/);
  rejects((d) => (d.rows[1]!.name = { en: 'Alpha', uk: 'Інша' }, d.rows[1]!.code = 'CH', d.rows[1]!.id = 'beta-ch'), /two cities named/);
  rejects((d) => (d.rows[0]!.code = 'CHE'), /does not match/);
  rejects((d) => (d.rows[0]!.name = { en: 'Alpha', uk: ' ' }), /non-empty/);
  rejects((d) => (d.rows[2]!.mortgage = 50), /needs `income`/);
  rejects((d) => (d.rows[2]!.rentOutside = 50), /needs `income`/);
  rejects((d) => (delete mutable(d, 3).outside, delete mutable(d, 3).outsideRank), /no measure/);
  rejects((d) => (d.retrieved = '27.09.2026'), /retrieved/);
  rejects((d) => (mutable(d, 0).region = 'antarctica'), /region/);
});
test('rankBy: Numbeo order per measure, only cities that have it', () => {
  const d = parseRealEstateDataset(fixture());
  assert.deepEqual(rankBy(d, 'centre').map((c) => [c.row.name.en, c.rank, c.value]), [['Alpha', 1, 1000], ['Beta', 2, 800], ['Gamma', 3, 800]]);
  assert.deepEqual(rankBy(d, 'income').map((c) => c.row.name.en), ['Beta', 'Alpha']);
  assert.deepEqual(rankBy(d, 'outside').map((c) => c.row.name.en), ['Alpha', 'Beta', 'Delta']);
});
test('derived measures: premium, m² a year; rankings of every measure', () => {
  const d = parseRealEstateDataset(fixture());
  assert.equal(premium(d.rows[0]!), 2);
  assert.equal(premium(d.rows[2]!), undefined);
  assert.equal(measureValue(d.rows[0]!, 'm2'), 9);
  assert.equal(measureValue(d.rows[1]!, 'm2'), 4.5);
  assert.equal(measureValue(d.rows[0]!, 'rentOutside'), 18);
  assert.deepEqual(rankByMeasure(d, 'm2').map((c) => [c.row.id, c.rank]), [['alpha-ch', 1], ['beta-jp', 2]]);
  assert.deepEqual(rankByMeasure(d, 'premium').map((c) => c.row.id), ['alpha-ch', 'beta-jp']); // tie 2× → centre rank
  const ranks = allRanks(d);
  assert.deepEqual(Object.keys(ranks).sort(), [...MEASURES].sort());
  assert.deepEqual(ranks.centre.get('gamma-ua'), { rank: 3, total: 3, value: 800 });
  assert.equal(ranks.income.get('gamma-ua'), undefined);
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.throws(() => median([]));
});
test('rank correlation: monotone ±1, ties share ranks, too few pairs → NaN', () => {
  assert.equal(rankCorrelation([1, 2, 3, 4], [10, 20, 30, 1000]), 1);
  assert.equal(rankCorrelation([1, 2, 3, 4], [4, 3, 2, 1]), -1);
  assert.ok(Math.abs(rankCorrelation([1, 1, 2, 3], [1, 1, 2, 3]) - 1) < 1e-12);
  assert.ok(Number.isNaN(rankCorrelation([1, 2], [2, 1])));
  assert.ok(Number.isNaN(rankCorrelation([1, 1, 1], [1, 2, 3])));
});
test('state: defaults omitted, round trip, junk falls back', () => {
  assert.deepEqual(toRealEstateParams(parseRealEstateState({})), {});
  const s = { show: 'centre', measure: 'mortgage', region: 'europe', page: '3', view: 'table', cities: 'kyiv-ua,warsaw-pl', sort: 'inverse' };
  assert.deepEqual(toRealEstateParams(parseRealEstateState(s)), s);
  assert.deepEqual(parseRealEstateState({ show: 'pie', measure: 'gdp', region: 'mars', page: '-2', view: 'map', sort: 'x' }), {
    show: 'ranking',
    measure: 'centre',
    region: 'all',
    page: 1,
    view: 'chart',
    cities: null,
    sort: 'premium',
  });
});
test('state: cities — absent = default, none = empty, junk dropped, unique, at most five', () => {
  assert.equal(parseCities(undefined), null);
  assert.deepEqual(parseCities('none'), []);
  assert.deepEqual(parseCities('kyiv-ua,KYIV,<b>,kyiv-ua,lviv-ua'), ['kyiv-ua', 'lviv-ua']);
  assert.equal(parseCities('a-ua,b-ua,c-ua,d-ua,e-ua,f-ua,g-ua')!.length, MAX_CITIES);
  assert.deepEqual(toRealEstateParams({ ...parseRealEstateState({}), cities: [] }), { cities: 'none' });
  assert.deepEqual(defaultCities(fixture().rows), ['gamma-ua']);
});
test('meta.data lists exactly the parser’s files; unknown files are rejected', () => {
  assert.deepEqual([...meta.data], [...DATA_FILES]);
  assert.throws(() => validateDataFile('other.json', {}), DatasetError);
});
test('land: the parser accepts a frame and rejects anything but a plain path', () => {
  const ok = { source: 'test', width: 1000, height: 439, scale: 188, translate: [500, 245], d: 'M0,0L10,10Z' };
  assert.equal(parseLand(ok).d, 'M0,0L10,10Z');
  assert.throws(() => parseLand({ ...ok, d: 'M0,0<script>' }), DatasetError);
  assert.throws(() => parseLand({ ...ok, translate: [1] }), DatasetError);
  assert.throws(() => parseLand({ ...ok, width: 0 }), DatasetError);
});

// ── the real files against the owner's raw copies ────────────────────────────────────────────────
const real = parseRealEstateDataset(JSON.parse(readFileSync(`public/data/real-estate-world/${DATA_FILE}`, 'utf8')));
const RAW = 'data-raw/real-estate-world';
/** Independent reading of a copied Numbeo table: "rank(.) <tab> label <tab> … values". */
function raw(file: string): { rank: number; label: string; values: number[] }[] {
  return readFileSync(`${RAW}/${file}`, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.split('\t').map((c) => c.trim()).filter((c) => c !== ''))
    .filter((c) => /^\d+\.?$/.test(c[0] ?? '') && c.length >= 3)
    .map((c) => ({ rank: parseInt(c[0]!, 10), label: c[1]!, values: c.slice(2).map((v) => Number(v.replace(/[$,\s]/g, ''))) }));
}
const byLabel = new Map(real.rows.map((r) => [r.numbeo, r]));

test('real: every raw row is in the file with the same rank and value (centre, outside, index + companions)', () => {
  const centre = raw('numbeo-price-centre.txt');
  const outside = raw('numbeo-price-outside.txt');
  const index = raw('numbeo-property-index.txt');
  assert.ok(centre.length >= 450 && outside.length >= 450 && index.length >= 350, `rows: ${centre.length} / ${outside.length} / ${index.length}`);
  for (const r of centre) {
    const c = byLabel.get(r.label);
    assert.ok(c && c.centreRank === r.rank && c.centre === r.values[0], `centre ${r.rank} ${r.label}`);
  }
  for (const r of outside) {
    const c = byLabel.get(r.label);
    assert.ok(c && c.outsideRank === r.rank && c.outside === r.values[0], `outside ${r.rank} ${r.label}`);
  }
  for (const r of index) {
    const c = byLabel.get(r.label);
    assert.ok(
      c && c.incomeRank === r.rank && c.income === r.values[0] && c.rent === r.values[3] && c.rentOutside === r.values[4] && c.mortgage === r.values[5],
      `index ${r.rank} ${r.label}`,
    );
  }
  assert.equal(rankBy(real, 'centre').length, centre.length);
  assert.equal(rankBy(real, 'outside').length, outside.length);
  assert.equal(rankBy(real, 'income').length, index.length);
});
test('real: ISO codes, regions and ids — Hong Kong is HK (not CN), Kyiv is kyiv-ua, regions from M49', () => {
  const hk = real.rows.filter((r) => r.numbeo.startsWith('Hong Kong'));
  assert.ok(hk.length >= 1 && hk.every((r) => r.code === 'HK'), 'Hong Kong → HK');
  const kyiv = real.rows.find((r) => r.numbeo === 'Kiev (Kyiv), Ukraine');
  assert.ok(kyiv && kyiv.id === 'kyiv-ua' && kyiv.code === 'UA' && kyiv.name.en === 'Kyiv' && kyiv.name.uk === 'Київ', 'Kyiv');
  for (const r of real.rows) assert.equal(r.region, M49_REGION.get(r.code), `${r.numbeo}: region`);
  assert.deepEqual(defaultCities(real.rows), ['kyiv-ua', 'lviv-ua', 'odesa-ua', 'dnipro-ua', 'kharkiv-ua']);
  for (const id of NEIGHBOURS) assert.ok(real.rows.some((r) => r.id === id), `preset city ${id}`);
});
test('real: coordinates of known cities (±1°) — a swapped lat/lon or a namesake would fail', () => {
  const at: Record<string, [number, number]> = { 'kyiv-ua': [50.45, 30.52], 'zug-ch': [47.17, 8.52], 'hong-kong-hk': [22.3, 114.17], 'sydney-au': [-33.87, 151.21], 'new-york-us': [40.71, -74.01], 'lagos-ng': [6.45, 3.4] };
  for (const [id, [lat, lon]] of Object.entries(at)) {
    const r = real.rows.find((c) => c.id === id);
    assert.ok(r, `${id} in the file`);
    assert.ok(Math.abs(r.lat - lat) < 1 && Math.abs(r.lon - lon) < 1, `${id}: ${r.lat}, ${r.lon}`);
  }
});
test('real: the land layer parses and every city projects inside its frame', () => {
  const land = parseLand(JSON.parse(readFileSync(`public/data/real-estate-world/${LAND_FILE}`, 'utf8')));
  const p = geoEqualEarth().scale(land.scale).translate(land.translate);
  for (const r of real.rows) {
    const xy = p([r.lon, r.lat]);
    assert.ok(xy && xy[0] >= 0 && xy[0] <= land.width && xy[1] >= 0 && xy[1] <= land.height, `${r.id} outside the map frame`);
  }
});
test('real: a published entry has its headline measure (the city-centre price)', () => {
  assert.ok(meta.status !== 'published' || rankBy(real, 'centre').length >= 450, 'publish only with the centre price table');
});
test('real: names — UK in Cyrillic, EN without it', () => {
  for (const r of real.rows) {
    assert.match(r.name.uk, /[А-ЩЬЮЯЄІЇҐа-щьюяєіїґ]/, `${r.numbeo}: UK name "${r.name.uk}"`);
    assert.doesNotMatch(r.name.en, /[А-Яа-яЄєІіЇїҐґ]/, `${r.numbeo}: EN name "${r.name.en}"`);
  }
});

console.log(`✓ real-estate-world: ${passed} tests passed (${real.rows.length} cities).`);
