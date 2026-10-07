// test-focus.ts — S3-uf: «Ukraine in focus». Pure focus state (lib/focus.ts), the Finder's jump (position → page,
// region kept or reset) on the real datasets of every country ranking, and a guard: every page with a Pager and a
// RankedBar whose data has Ukraine shows a Finder. The rendered picker, Finder, tile and table rows are checked in
// the SSR smoke (EN + UK); the drawn accent band in test-ranked-bar / Playwright. Run: npm test.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { HOME_CODE, MAX_FOCUS, focusJump, focusParam, idListParam, normalizeFocus, parseFocus, parseIdList, resolveFocus } from '../src/lib/focus';
import { paginate } from '../src/lib/paginate';
import * as gdp from '../src/viz/gdp-by-country/data';
import * as ppp from '../src/viz/gdp-ppp-per-capita/data';
import * as pop from '../src/viz/population-by-country/data';
import * as land from '../src/viz/land-area/data';
import * as crime from '../src/viz/crime-index/data';
import * as gpi from '../src/viz/global-peace-index/data';
import * as rob from '../src/viz/robotization/data';
import { parseGdpState, toGdpParams } from '../src/viz/gdp-by-country/state';
import { parseGpiState, toGpiParams } from '../src/viz/global-peace-index/state';
import { parseCities, toRealEstateParams, parseRealEstateState } from '../src/viz/real-estate-world/state';

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (e) {
    console.error(`✖ focus: ${name}\n`, e);
    process.exit(1);
  }
}
const J = (id: string, f: string): unknown => JSON.parse(readFileSync(`public/data/${id}/${f}`, 'utf8'));
type Row = { code: string; region: string };
const SIZE = 15;

test('parseFocus: lower-case codes in the URL → upper-case, unique, at most 3; none → []; absent → null', () => {
  assert.equal(parseFocus(undefined), null);
  assert.deepEqual(parseFocus('none'), []);
  assert.deepEqual(parseFocus('ua,pl'), ['UA', 'PL']);
  assert.deepEqual(parseFocus('UA,pl'), ['UA', 'PL']);
  assert.deepEqual(parseFocus('ua,ua,pl'), ['UA', 'PL']);
  assert.deepEqual(parseFocus('ua,pl,de,fr'), ['UA', 'PL', 'DE']);
  assert.equal(MAX_FOCUS, 3);
  assert.deepEqual(parseFocus('<script>,u,ukr,1a,'), []);
  assert.deepEqual(parseFocus(''), []);
});

test('focusParam / normalizeFocus: the default stays out of the URL; [] → none; order kept', () => {
  assert.equal(focusParam(null), undefined);
  assert.equal(focusParam([]), 'none');
  assert.equal(focusParam(['PL', 'UA']), 'pl,ua');
  assert.equal(normalizeFocus(['UA']), null);
  assert.deepEqual(normalizeFocus(['PL']), ['PL']);
  assert.deepEqual(normalizeFocus(['UA', 'PL']), ['UA', 'PL']);
  assert.deepEqual(normalizeFocus([]), []);
  for (const raw of [undefined, 'none', 'ua,pl', 'pl']) assert.equal(focusParam(parseFocus(raw)), raw);
});

test('page state: focus round-trips through the URL (gdp, gpi) and the default is omitted', () => {
  assert.deepEqual(toGdpParams(parseGdpState({})), {});
  assert.deepEqual(toGdpParams(parseGdpState({ focus: 'ua,pl', page: '4' })), { focus: 'ua,pl', page: '4' });
  assert.deepEqual(toGpiParams(parseGpiState({ focus: 'none' })), { focus: 'none' });
});

test('resolveFocus: default = Ukraine when the list has it, nothing when it does not (robotization)', () => {
  assert.deepEqual(resolveFocus(null, (c) => c === HOME_CODE), ['UA']);
  assert.deepEqual(resolveFocus(null, () => false), []);
  assert.deepEqual(resolveFocus([], () => true), []);
  assert.deepEqual(resolveFocus(['PL'], () => true), ['PL']);
  const robots = rob.rankRobots(rob.parseRobotDataset(J('robotization', rob.DATA_FILE)));
  assert.deepEqual(resolveFocus(null, (c) => robots.some((r) => r.code === c)), [], 'IFR lists no Ukraine → no button');
});

test('real-estate cities: the shared id list parser keeps S3-re behaviour', () => {
  assert.equal(parseCities(undefined), null);
  assert.deepEqual(parseCities('none'), []);
  assert.deepEqual(parseCities('kyiv-ua,kyiv-ua,BAD,lviv-ua'), ['kyiv-ua', 'lviv-ua']);
  assert.equal(parseIdList('a,b,c', /^[a-z]$/, 2)?.join(), 'a,b');
  assert.equal(idListParam(['a', 'b', 'c'], 2), 'a,b');
  assert.deepEqual(toRealEstateParams(parseRealEstateState({ cities: 'none' })), { cities: 'none' });
});

test('focusJump: page in the filtered list when the region keeps the row; region reset otherwise; null when absent', () => {
  const all: Row[] = Array.from({ length: 40 }, (_, i) => ({ code: `C${i}`, region: i % 2 ? 'europe' : 'asia' }));
  const europe = all.filter((r) => r.region === 'europe');
  const keyOf = (r: Row): string => r.code;
  assert.deepEqual(focusJump('C31', { all, filtered: europe, keyOf, region: 'europe', size: SIZE }), { region: 'europe', page: 2 });
  assert.deepEqual(focusJump('C30', { all, filtered: europe, keyOf, region: 'europe', size: SIZE }), { region: 'all', page: 3 });
  assert.deepEqual(focusJump('C0', { all, filtered: all, keyOf, region: 'all', size: SIZE }), { region: 'all', page: 1 });
  assert.deepEqual(focusJump('C14', { all, filtered: all, keyOf, region: 'all', size: SIZE }), { region: 'all', page: 1 });
  assert.deepEqual(focusJump('C15', { all, filtered: all, keyOf, region: 'all', size: SIZE }), { region: 'all', page: 2 });
  assert.equal(focusJump('XX', { all, filtered: europe, keyOf, region: 'europe', size: SIZE }), null);
});

// Every list the six pages page through (tab × year × order × sort), in chart order.
const area = land.parseAreaDataset(J('land-area', land.DATA_FILE));
const popData = pop.parsePopDataset(J('population-by-country', pop.DATA_FILE));
const gpiRows = gpi.parseGpiDataset(J('global-peace-index', gpi.DATA_FILE)).rows;
const LISTS: Array<[string, readonly Row[]]> = [
  ...gdp.METRICS.flatMap((m) => gdp.YEARS[m].map((y): [string, readonly Row[]] => [`gdp ${m} ${y}`, gdp.rankGdp(gdp.parseGdpDataset(J('gdp-by-country', gdp.dataFile(m, y))))])),
  ...ppp.YEARS.map((y): [string, readonly Row[]] => [`ppp ${y}`, ppp.rankPpp(ppp.parsePppDataset(J('gdp-ppp-per-capita', ppp.dataFile(y))))]),
  ...pop.METRICS.map((m): [string, readonly Row[]] => [`population ${m}`, pop.rankPopulation(popData, m, area).filter((r) => r.value !== null)]),
  ['land land area', land.rankArea(area, 'land', 'area')],
  ['land land nonland', land.rankArea(area, 'land', 'nonland')],
  ['land total area', land.rankArea(area, 'total', 'area')],
  ['crime homicide', crime.rankHomicide(crime.parseHomicideDataset(J('crime-index', crime.HOMICIDE_FILE)))],
  ['crime numbeo', crime.rankNumbeo(crime.parseNumbeoDataset(J('crime-index', crime.NUMBEO_FILE)))],
  ['gpi most', gpi.orderGpi(gpiRows, 'most')],
  ['gpi least', gpi.orderGpi(gpiRows, 'least')],
];

test('real data: Ukraine is in every list of the six pages, and the jump opens a page that shows it', () => {
  assert.equal(LISTS.length, 17);
  for (const [name, all] of LISTS) {
    const keyOf = (r: Row): string => r.code;
    assert.ok(all.some((r) => r.code === 'UA'), `${name}: Ukraine missing`);
    for (const region of ['all', 'europe', 'asia'] as const) {
      const filtered = region === 'all' ? all : all.filter((r) => r.region === region);
      const to = focusJump('UA', { all, filtered, keyOf, region, size: SIZE });
      assert.ok(to, `${name} ${region}`);
      assert.equal(to.region, region === 'asia' ? 'all' : region, `${name} ${region}: region`);
      const list = to.region === 'all' ? all : filtered;
      assert.ok(paginate(list, to.page, SIZE).items.some((r) => r.code === 'UA'), `${name} ${region}: page ${to.page} lacks Ukraine`);
    }
  }
});

test('guard: every page with a Pager and a RankedBar whose data has Ukraine shows a Finder', () => {
  const guarded: string[] = [];
  for (const id of readdirSync('src/viz')) {
    if (!existsSync(`src/viz/${id}/index.tsx`)) continue;
    const src = readdirSync(`src/viz/${id}`)
      .filter((f) => f.endsWith('.tsx'))
      .map((f) => readFileSync(`src/viz/${id}/${f}`, 'utf8'))
      .join('\n');
    if (!src.includes('<Pager') || !src.includes('<RankedBar')) continue;
    const dir = `public/data/${id}`;
    const hasUa = existsSync(dir) && readdirSync(dir).some((f) => f.endsWith('.json') && /"code":\s*"UA"/.test(readFileSync(`${dir}/${f}`, 'utf8')));
    if (!hasUa) continue;
    guarded.push(id);
    assert.match(src, /<CountryFocus\b|<Finder\b/, `${id}: no Finder`);
    assert.match(src, /emphasis: hi\.has\(/, `${id}: rows never emphasised`);
    assert.match(src, /'is-home'/, `${id}: no is-home table row`);
  }
  assert.deepEqual(guarded.sort(), [
    'crime-index',
    'gdp-by-country',
    'gdp-ppp-per-capita',
    'global-peace-index',
    'land-area',
    'oil', // CHANGED (S3-oil)
    'population-by-country',
    'real-estate-world',
  ]);
});

console.log(`✓ focus: ${passed} tests passed.`);
process.exit(0);
