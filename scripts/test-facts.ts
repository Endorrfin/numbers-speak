// test-facts.ts — CHANGED (S3-cp): the country profile ("Ukraine in numbers", #/c/ua). Every src/viz/<id>/facts.ts on
// its REAL data (Ukraine's numbers as the audit of 2026-10-07 found them on the pages), tables against the raw files,
// the contract validator, the "no country picked by code" rule, profile logic (ties, own years, changes, the page a
// row opens), the route and the page counter path, render-time words in both languages and the size budget.
// Run: npm test.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { FactTable } from '../src/catalog/facts';
import { FACT_GROUPS, FACT_ORDER, parseFacts } from '../src/catalog/facts';
import { competitionRows } from '../src/catalog/factKit';
import { formatFact } from '../src/components/country/factFormat';
import { countriesWord, rankingsCount, rankingsIn } from '../src/components/country/text';
import { hitFor } from '../src/lib/analytics';
import { DatasetError } from '../src/lib/dataset';
import { hrefCountry, parseHash } from '../src/lib/hashRouter';
import { groupFacts, positionOf, profileFact, profileOf } from '../src/lib/profile';
import { FACTS_BUDGET_GZIP, FACTS_PATH, factFolders, generateFacts, gzipSize } from './lib/facts';
import { ROOT, VIZ_DIR } from './lib/viz-folders';

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
  } catch (e) {
    console.error(`✖ facts: ${name}\n`, e);
    process.exit(1);
  }
}

const { source, ids } = await generateFacts();
const { tables } = parseFacts(JSON.parse(source));
const byId = (id: string): FactTable => {
  const t = tables.find((x) => x.id === id);
  assert.ok(t, `no table ${id}`);
  return t;
};
const raw = <T>(entry: string, file: string): T => JSON.parse(readFileSync(join(ROOT, 'public/data', entry, file), 'utf8')) as T;
const ua = (id: string) => {
  const f = profileFact(byId(id), 'UA');
  assert.ok(f, `UA missing from ${id}`);
  return f;
};

await test('every FACT_ORDER table is produced once, in order; the file passes the contract and the budget', () => {
  assert.deepEqual(ids, [...FACT_ORDER]);
  assert.equal(new Set(tables.map((t) => t.entry)).size, 10);
  for (const t of tables) assert.ok((FACT_GROUPS as readonly string[]).includes(t.group));
  assert.ok(gzipSize(source) <= FACTS_BUDGET_GZIP, `${gzipSize(source)} B gzip`);
  assert.equal(readFileSync(FACTS_PATH, 'utf8'), source, 'public/data/country-facts.json is stale — npm run gen:facts');
});

await test('Ukraine: the places the pages show (audit 2026-10-07)', () => {
  const expect: Record<string, [rank: number, of: number, value: number]> = {
    'gdp-total': [58, 218, 214.233e9],
    'gdp-per-capita': [136, 218, 5866],
    'gdp-ppp-per-capita': [99, 185, 18905],
    population: [40, 237, 38_980_400],
    'population-density': [149, 234, 67.2864],
    'births-per-day': [82, 235, 663],
    'deaths-per-birth': [1, 224, 2.17647],
    'land-area': [45, 234, 579_320],
    'homicide-rate': [68, 166, 3.77664],
    'numbeo-crime': [68, 148, 46.9],
    'peace-index': [160, 163, 3.184],
    'oil-consumption': [47, 79, 284.8],
    'oil-per-capita': [70, 79, 2.66678],
    'electricity-generation': [36, 211, 111.51],
    'electricity-per-capita': [106, 211, 2.72],
    'electricity-low-carbon': [53, 211, 0.721729],
    'carbon-intensity': [58, 211, 250.47],
    'electricity-access': [94, 214, 100],
  };
  for (const [id, [rank, of, value]] of Object.entries(expect)) {
    const f = ua(id);
    assert.equal(f.rank, rank, `${id} rank`);
    assert.equal(f.of, of, `${id} of`);
    assert.ok(Math.abs(f.value - value) <= Math.abs(value) * 1e-5, `${id} value ${f.value} ≉ ${value}`);
  }
  assert.equal(profileFact(byId('robot-density'), 'UA'), null); // IFR lists 22 economies, Ukraine not among them
});

await test('tables match the raw files, independently of the entry functions', () => {
  const pop = raw<{ rows: Array<{ code: string; population: number }> }>('population-by-country', 'population-2025.json');
  const sorted = [...pop.rows].sort((a, b) => b.population - a.population);
  assert.deepEqual(byId('population').rows.slice(0, 5).map((r) => r[0]), sorted.slice(0, 5).map((r) => r.code));
  assert.equal(byId('population').rows.length, pop.rows.length);
  const gpi = raw<{ rows: Array<{ code: string; rank: number; score: number; rankChange: number }> }>('global-peace-index', 'gpi-2026.json');
  for (const r of gpi.rows) {
    const f = profileFact(byId('peace-index'), r.code)!;
    assert.equal(f.rank, r.rank);
    assert.equal(f.value, r.score);
    assert.equal(f.change?.places, r.rankChange, `${r.code} change`);
  }
  const land = raw<{ rows: Array<{ code: string; landArea: number; note?: string }> }>('land-area', 'land-area.json');
  const biggest = [...land.rows].sort((a, b) => b.landArea - a.landArea)[0]!;
  assert.deepEqual(byId('land-area').rows[0]!.slice(0, 2), [biggest.code, 1]);
  assert.deepEqual([...(byId('land-area').marked ?? [])].sort(), land.rows.filter((r) => r.note === 'recognized-borders').map((r) => r.code).sort());
});

await test('profile: ties, own years, borders, changes since the previous edition', () => {
  const access = ua('electricity-access');
  assert.equal(access.tieTo, 214); // 121 countries at 100 % share ranks 94–214
  assert.equal(access.tieTo! - access.rank, 120);
  for (const id of ['electricity-generation', 'electricity-per-capita', 'electricity-low-carbon', 'carbon-intensity']) {
    assert.equal(ua(id).ownYear, 2022, `${id}: Ukraine's last published year`);
    assert.equal(byId(id).year, 2024);
  }
  assert.equal(ua('homicide-rate').ownYear, 2021);
  assert.equal(ua('gdp-total').ownYear, undefined);
  assert.equal(ua('population').marked, true);
  assert.equal(ua('land-area').marked, true);
  assert.equal(ua('births-per-day').marked, false);
  assert.deepEqual(ua('gdp-total').change, { since: 2024, places: 1 });
  assert.deepEqual(ua('gdp-ppp-per-capita').change, { since: 2024, places: 5 });
  assert.deepEqual(ua('peace-index').change, { since: 2025, places: 2 });
  assert.equal(ua('population').change, undefined);
});

await test('profile: each row opens the page that shows the country (focus only for other countries)', () => {
  assert.deepEqual(ua('gdp-total').link, { page: '4' }); // 58th of 15 per page
  assert.deepEqual(ua('gdp-per-capita').link, { metric: 'per-capita', page: '10' });
  assert.deepEqual(ua('deaths-per-birth').link, { sort: 'ratio' });
  assert.deepEqual(ua('peace-index').link, { page: '11' });
  // A tie lists its countries in code order (as the page does), so the page follows the row, not the shared rank.
  const access = byId('electricity-access');
  const at = access.rows.findIndex((r) => r[0] === 'UA');
  assert.deepEqual(ua('electricity-access').link, { show: 'access', page: String(Math.floor(at / 15) + 1) });
  assert.equal(ua('electricity-access').link.page, '14');
  const pl = profileFact(byId('population'), 'PL')!;
  assert.equal(pl.link.focus, 'pl');
  assert.equal(pl.link.page, String(Math.floor((pl.rank - 1) / 15) + 1));
  const p = profileOf(tables, 'UA');
  assert.equal(p.facts.length, 18);
  assert.deepEqual(p.missing.map((t) => t.id), ['robot-density']);
  assert.deepEqual(groupFacts(p.facts, FACT_GROUPS).map((g) => [g.group, g.facts.length]), [
    ['economy', 3],
    ['people', 4],
    ['land', 1],
    ['security', 3],
    ['energy', 7],
  ]);
  assert.equal(positionOf(1, 235), 0);
  assert.equal(positionOf(235, 235), 1);
  assert.equal(positionOf(1, 1), 0);
});

await test('competition ranks: equal values share the first rank of the run', () => {
  assert.deepEqual(
    competitionRows([
      { code: 'AA', value: 3 },
      { code: 'BB', value: 2 },
      { code: 'CC', value: 2 },
      { code: 'DD', value: 1 },
    ]).map((r) => r[1]),
    [1, 2, 2, 4],
  );
});

await test('the validator rejects broken tables', () => {
  const good = JSON.parse(source) as { tables: Array<Record<string, unknown>> };
  const first = good.tables[0]!;
  const bad = (patch: Record<string, unknown>, extra: Array<Record<string, unknown>> = []) => ({ tables: [{ ...first, ...patch }, ...extra] });
  const rows = first.rows as unknown[][];
  assert.throws(() => parseFacts(bad({ rows: [rows[0], rows[0]] })), DatasetError); // a country twice
  assert.throws(() => parseFacts(bad({ rows: [['AA', 2, 1]] })), DatasetError); // rank 2 after no rows
  assert.throws(() => parseFacts(bad({ rows: [['AA', 1, 2], ['BB', 2, 1], ['CC', 1, 0]] })), DatasetError); // ranks fall
  assert.throws(() => parseFacts(bad({ rows: [['ukr', 1, 1]] })), DatasetError);
  assert.throws(() => parseFacts(bad({ link: { page: '2' } })), DatasetError); // the profile owns page and focus
  assert.throws(() => parseFacts(bad({ format: 'usd-ish' })), DatasetError);
  assert.throws(() => parseFacts(bad({ id: 'mystery' })), DatasetError);
  assert.throws(() => parseFacts(bad({ marked: ['ZZ'] })), DatasetError); // not a row of the table
  assert.throws(() => parseFacts({ tables: [good.tables[1], good.tables[0]] }), DatasetError); // not in FACT_ORDER
  assert.throws(() => parseFacts({ tables: [first, first] }), DatasetError);
});

await test('facts.ts never picks a country by code; every country-ranking page has a facts.ts', () => {
  for (const { id, dir } of factFolders()) {
    const code = readFileSync(join(dir, 'facts.ts'), 'utf8');
    assert.ok(!/['"`][A-Z]{2}['"`]/.test(code), `src/viz/${id}/facts.ts names a country code`);
  }
  for (const id of readdirSync(VIZ_DIR)) {
    const index = join(VIZ_DIR, id);
    const usesFocus = readdirSync(index).some((f) => f.endsWith('.tsx') && readFileSync(join(index, f), 'utf8').includes('CountryFocus'));
    if (usesFocus) assert.ok(existsSync(join(index, 'facts.ts')), `src/viz/${id} ranks countries but has no facts.ts`);
  }
});

await test('route #/c/<iso> and the page counter path', () => {
  assert.deepEqual(parseHash('#/c/ua').route, { name: 'country', code: 'UA' });
  assert.deepEqual(parseHash('#/c/ukr').route, { name: 'notFound' });
  assert.deepEqual(parseHash('#/c/UA').route, { name: 'notFound' });
  assert.equal(hrefCountry('UA'), '#/c/ua');
  assert.deepEqual(hitFor('/c/ua', () => undefined), { p: '/#/c/ua', t: 'Ukraine in numbers' });
  assert.deepEqual(hitFor('/c/pl', () => undefined), { p: '/#/404', t: 'Not found' }); // no public profile yet
});

await test('render-time words and numbers in both languages', () => {
  assert.equal(rankingsCount(1, 'uk'), '1 рейтинг');
  assert.equal(rankingsCount(3, 'uk'), '3 рейтинги');
  assert.equal(rankingsCount(7, 'uk'), '7 рейтингів');
  assert.equal(rankingsCount(1, 'en'), '1 ranking');
  assert.equal(rankingsCount(18, 'en'), '18 rankings');
  assert.equal(rankingsIn(18, 'uk'), 'рейтингах');
  assert.equal(rankingsIn(21, 'uk'), 'рейтингу');
  assert.equal(countriesWord(120, 'uk'), 'країн');
  assert.equal(countriesWord(22, 'uk'), 'країни');
  assert.equal(countriesWord(1, 'en'), 'country');
  assert.equal(formatFact(100, 'percent', 'en'), '100%');
  assert.match(formatFact(100, 'percent', 'uk'), /^100\s?%$/); // ICU versions differ on the space
  assert.equal(formatFact(2.17647, 'dec2', 'en'), '2.18');
  assert.equal(formatFact(2.17647, 'dec2', 'uk'), '2,18');
  assert.equal(formatFact(3.184, 'score', 'en'), '3.184');
  assert.equal(formatFact(5866, 'usd-whole', 'en'), '$5,866');
  assert.equal(formatFact(214.233e9, 'usd-compact', 'en'), '$214bn'); // en-GB compact words
  assert.equal(formatFact(0.721729, 'share', 'en'), '72.2%');
  for (const t of tables) for (const lang of ['en', 'uk'] as const) assert.ok(!/NaN|undefined/.test(formatFact(t.rows[0]![2], t.format, lang)));
});

console.log(`✓ facts — ${passed} tests passed`);
