// test-oil.ts — CHANGED (S3-oil): the oil entry — four dataset contracts (and their rejections), the derivations the
// five angles draw, the URL state, and the shipped files against their raw copies and against each other.
// Run: npm test.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { csvParse } from 'd3';
import { DatasetError } from '../src/lib/dataset';
import {
  DATA_FILES,
  FILES,
  IMPORTERS,
  chinaSuppliers,
  consumptionYear,
  daysIn,
  kbdFromTonnes,
  parseChinaImports,
  parseConsumption,
  parseTrade,
  parseUsImports,
  raceFrames,
  rankConsumption,
  tradeRows,
  usHistoryLeaders,
  usSuppliers,
  usUnlisted,
  validateDataFile,
  worldPerCapita,
} from '../src/viz/oil/data';
import type { ChinaDataset, ConsumptionDataset, TradeDataset, UsDataset } from '../src/viz/oil/data';
import meta from '../src/viz/oil/meta';
import { parseOilState, switchShow, toOilParams } from '../src/viz/oil/state';

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (e) {
    console.error(`✖ oil: ${name}\n`, e);
    process.exit(1);
  }
}
const rejects = (fn: () => unknown, re: RegExp): void => assert.throws(fn, (e: unknown) => e instanceof DatasetError && re.test(e.message));
const J = (f: string): unknown => JSON.parse(readFileSync(`public/data/oil/${f}`, 'utf8'));

const cons = (): ConsumptionDataset => ({
  edition: 2026,
  from: 2014,
  to: 2016,
  world: [100, 110, 120],
  rows: [
    { code: 'US', region: 'americas', values: [40, 42, 44] },
    { code: 'UA', region: 'europe', values: [10, 8, 6] },
    { code: 'SU', region: 'europe', values: [20, null, null] },
    { code: 'CN', region: 'asia', values: [null, 30, 50] },
  ],
});

test('consumption: a valid file parses; rejections name the path', () => {
  assert.deepEqual(parseConsumption(cons()), cons());
  rejects(() => parseConsumption({ ...cons(), world: [100, 110] }), /\.world: at least 3 item/);
  rejects(() => parseConsumption({ ...cons(), world: [100, 110, 120, 130] }), /\.world: 4 values, expected 3/);
  rejects(() => parseConsumption({ ...cons(), rows: [...cons().rows, { code: 'US', region: 'americas', values: [1, 1, 1] }] }), /duplicate code US/);
  rejects(() => parseConsumption({ ...cons(), rows: [{ code: 'usa', region: 'americas', values: [1, 1, 1] }] }), /rows\[0\]\.code/);
  rejects(() => parseConsumption({ ...cons(), world: [100, 110, 90] }), /countries add up to 100, more than the world/);
  rejects(() => parseConsumption({ ...cons(), rows: [{ code: 'FR', region: 'europe', values: [null, null, null] }] }), /no value in any year/);
});

test('consumption: total ranking, shares, the ten-year change and per-person values', () => {
  const r = rankConsumption(cons(), 'total', new Map([['US', 340_000_000], ['UA', 38_000_000]]));
  assert.deepEqual(r.map((x) => [x.code, x.rank]), [['CN', 1], ['US', 2], ['UA', 3]]); // SU has no value in the latest year
  assert.equal(r[1]!.share, 44 / 120);
  assert.equal(r[1]!.perCapita, (44 * 1000 * daysIn(2016)) / 340_000_000);
  assert.equal(r[0]!.perCapita, null);
  const pc = rankConsumption(cons(), 'per-capita', new Map([['US', 340_000_000], ['UA', 38_000_000]]));
  assert.deepEqual(pc.map((x) => [x.code, x.rank]), [['UA', 1], ['US', 2], ['CN', null]]); // 6 kb/d for 38 M > 44 kb/d for 340 M
  assert.equal(pc[2]!.value, null);
  assert.equal(worldPerCapita(cons(), 8e9), (120 * 1000 * daysIn(2016)) / 8e9);
  assert.equal(worldPerCapita(cons(), null), null);
});

test('race: frames per year, interpolation, areas fade in and out', () => {
  const f = raceFrames(cons(), { steps: 4, top: 3 });
  assert.equal(f.length, 2 * 4 + 1);
  assert.equal(f[2]!.time, 2014.5);
  assert.equal(f[2]!.rows.find((r) => r.code === 'US')!.value, 41);
  assert.equal(f[2]!.rows.find((r) => r.code === 'SU')!.value, 10); // halfway to 0
  assert.ok(!f[4]!.rows.some((r) => r.code === 'SU'));
  assert.deepEqual(f.at(-1)!.rows.map((r) => r.code), ['CN', 'US', 'UA']);
  assert.ok(raceFrames(cons(), { steps: 1, top: 9, region: 'asia' }).every((x) => x.rows.every((r) => r.code === 'CN')));
  assert.deepEqual(consumptionYear(cons(), 2014).map((r) => [r.code, r.rank]), [['US', 1], ['SU', 2], ['UA', 3]]);
});

const usd = (): UsDataset => ({
  from: 2023,
  to: 2024,
  total: [100, 90],
  partial: { year: 2025, months: 3, total: 80 },
  release: '2025-04-30',
  rows: [
    { code: 'CA', region: 'americas', values: [60, 60], partial: 55 },
    { code: 'MX', region: 'americas', values: [20, 25], partial: 25 },
    { code: 'SA', region: 'asia', values: [null, 5], partial: null },
  ],
});

test('US imports: contract, suppliers by period, the unitemised remainder', () => {
  assert.deepEqual(parseUsImports(usd()), usd());
  rejects(() => parseUsImports({ ...usd(), total: [10, 90] }), /more than the total/);
  rejects(() => parseUsImports({ ...usd(), partial: { year: 2026, months: 3, total: 80 } }), /partial\.year/);
  const s = usSuppliers(usd(), 2024);
  assert.deepEqual(s.map((r) => [r.code, r.rank, r.before]), [['CA', 1, 60], ['MX', 2, 20], ['SA', 3, null]]);
  assert.equal(s[0]!.share, 60 / 90);
  assert.deepEqual(usSuppliers(usd(), 'partial').map((r) => [r.code, r.before]), [['CA', 60], ['MX', 25]]);
  assert.equal(usUnlisted(usd(), 2023), 20); // 100 − 80
  assert.equal(usUnlisted(usd(), 2024), 0); // 90 − 90
  assert.deepEqual(usHistoryLeaders(usd(), 2).map((r) => r.code), ['CA', 'MX']);
});

const china = (): ChinaDataset => ({
  years: [2024, 2025],
  total: [3_000_000, 2_000_000],
  rows: [
    { code: 'RU', region: 'europe', tonnes: [2_000_000, 1_000_000], usd: [1e9, 5e8] },
    { code: 'SA', region: 'asia', tonnes: [1_000_000, 1_000_000], usd: [6e8, 6e8] },
    { code: 'TR', region: 'asia', tonnes: [null, null], usd: [null, 700] },
  ],
});

test('China imports: contract, tonnes → barrels a day, value per barrel', () => {
  assert.deepEqual(parseChinaImports(china()), china());
  rejects(() => parseChinaImports({ ...china(), total: [3_000_000, 9] }), /partners add up to 2000000/);
  rejects(() => parseChinaImports({ ...china(), years: [2024, 2026] }), /consecutive years/);
  assert.equal(kbdFromTonnes(1_000_000, 2025), 7.33e6 / 365 / 1000);
  assert.equal(kbdFromTonnes(1_000_000, 2024), 7.33e6 / 366 / 1000);
  const s = chinaSuppliers(china(), 2025);
  assert.deepEqual(s.map((r) => [r.code, r.rank]), [['RU', 1], ['SA', 2]]); // equal tonnes → by code; TR has no weight
  assert.equal(s[0]!.change, -0.5);
  assert.equal(s[1]!.usdPerBarrel, 6e8 / (1_000_000 * 7.33));
  assert.deepEqual(chinaSuppliers(china(), 2030), []);
});

const trade = (): TradeDataset => {
  const importTotals = Object.fromEntries(IMPORTERS.map((k) => [k, 0])) as TradeDataset['importTotals'];
  importTotals.china = 30;
  importTotals.us = 21.02;
  return {
    year: 2025,
    edition: 2026,
    flows: [
      { from: 'russia', to: 'china', mt: 10 },
      { from: 'saudi-arabia', to: 'china', mt: 20 },
      { from: 'canada', to: 'us', mt: 21 },
      { from: 'europe', to: 'us', mt: 0.02, small: true },
    ],
    importTotals,
    world: 51.02,
  };
};

test('trade: contract, rows by side, six groups that add up', () => {
  assert.deepEqual(parseTrade(trade()), trade());
  rejects(() => parseTrade({ ...trade(), world: 60 }), /importers add up to 51\.02, world 60/);
  rejects(() => parseTrade({ ...trade(), flows: [...trade().flows, { from: 'russia', to: 'china', mt: 1 }] }), /duplicate flow russia → china/);
  rejects(() => parseTrade({ ...trade(), importTotals: { ...trade().importTotals, china: 40 } }), /importTotals\.china: flows add up to 30/);
  const imp = tradeRows(trade(), 'importers');
  assert.deepEqual(imp.map((r) => [r.area, r.mt]), [['china', 30], ['us', 21.02]]);
  assert.deepEqual(imp[0]!.segments.filter((s) => s.mt).map((s) => [s.group, s.mt]), [['middle-east', 20], ['russia', 10]]);
  const exp = tradeRows(trade(), 'exporters', 1);
  assert.deepEqual(exp.map((r) => r.area), ['canada', 'saudi-arabia', 'russia']); // europe (0.02 Mt) below the minimum
  for (const r of [...imp, ...exp]) assert.ok(Math.abs(r.segments.reduce((s, g) => s + g.mt, 0) - r.mt) < 1e-9);
});

test('state: defaults omitted, per-angle parameters, hostile values fall back', () => {
  const d = parseOilState({});
  assert.deepEqual(toOilParams(d), {});
  assert.deepEqual(toOilParams(parseOilState({ metric: 'per-capita', region: 'asia', page: '2', focus: 'pl,ua' })), {
    metric: 'per-capita',
    region: 'asia',
    page: '2',
    focus: 'pl,ua',
  });
  // A year or a side means nothing on the consumption angle — dropped from its link.
  assert.deepEqual(toOilParams(parseOilState({ year: '1990', side: 'exporters' })), {});
  assert.deepEqual(toOilParams(parseOilState({ show: 'race', year: '1990', page: '3' })), { show: 'race', year: '1990' });
  assert.deepEqual(toOilParams(parseOilState({ show: 'flows', side: 'exporters', view: 'table' })), { show: 'flows', side: 'exporters', view: 'table' });
  const hostile = parseOilState({ show: '<script>', metric: 'x', year: '19', side: 'both', view: 'pie', region: 'mars' });
  assert.deepEqual(toOilParams(hostile), {});
  const sw = switchShow(parseOilState({ show: 'us', year: '1980', page: '2', view: 'table' }), 'china');
  assert.deepEqual(toOilParams(sw), { show: 'china', view: 'table' });
});

test('shipped files: meta.data, every file validates, headline numbers', () => {
  assert.deepEqual([...meta.data].sort(), [...DATA_FILES].sort());
  for (const f of DATA_FILES) validateDataFile(f, J(f));
  rejects(() => validateDataFile('oil.json', {}), /no parser/);
  const c = parseConsumption(J(FILES.consumption));
  assert.equal(c.edition, 2026);
  assert.deepEqual([c.from, c.to], [1965, 2025]);
  assert.equal(c.world.at(-1), 103_038.7); // EI 2026 PDF, p. 36: Total World 103,039
  const ranked = rankConsumption(c, 'total', null);
  assert.equal(ranked.length, 79);
  assert.deepEqual(ranked.slice(0, 3).map((r) => [r.code, Math.round(r.kbd)]), [['US', 19_404], ['CN', 17_360], ['IN', 5_642]]);
  const ua = ranked.find((r) => r.code === 'UA')!;
  assert.deepEqual([ua.rank, Math.round(ua.kbd)], [47, 285]);
  const su = c.rows.find((r) => r.code === 'SU')!;
  assert.equal(su.values.findLastIndex((v) => v !== null) + c.from, 1984);
  assert.equal(c.rows.find((r) => r.code === 'RU')!.values.findIndex((v) => v !== null) + c.from, 1985);
});

test('shipped files: equal the raw copies (independent CSV read)', () => {
  const c = parseConsumption(J(FILES.consumption));
  const raw = csvParse(readFileSync('data-raw/oil/ei-2026-oil-consumption.csv', 'utf8'));
  const row = (iso3: string) => raw.find((d) => d.iso3 === iso3)!;
  for (const [iso3, code] of [['USA', 'US'], ['UKR', 'UA'], ['CHN', 'CN'], ['SUN', 'SU'], ['TWN', 'TW']] as const) {
    const values = c.rows.find((r) => r.code === code)!.values;
    for (let y = c.from; y <= c.to; y++) {
      const v = row(iso3)[y];
      assert.equal(values[y - c.from], v ? Number(v) : null, `${code} ${y}`);
    }
  }
  assert.equal(Number(row('WLD')['2025']), c.world.at(-1));
  const u = parseUsImports(J(FILES.us));
  const eia = csvParse(readFileSync('data-raw/oil/eia-crude-imports-annual.csv', 'utf8'));
  const ca = (y: number) => Number(eia.find((d) => d.series === 'Canada' && d.period === String(y))!.kbd);
  assert.equal(u.rows.find((r) => r.code === 'CA')!.values[2025 - u.from], ca(2025));
  assert.equal(u.rows.find((r) => r.code === 'CA')!.values[1973 - u.from], ca(1973));
  const cn = parseChinaImports(J(FILES.china));
  const ct = csvParse(readFileSync('data-raw/oil/comtrade-china-crude.csv', 'utf8'));
  const ru = ct.find((d) => d.year === '2025' && d.partner_iso3 === 'RUS')!;
  assert.equal(cn.rows.find((r) => r.code === 'RU')!.tonnes[1], Math.round(Number(ru.net_weight_kg) / 1000));
});

test('shipped files: the sources agree where they overlap', () => {
  const cn = parseChinaImports(J(FILES.china));
  const tr = parseTrade(J(FILES.trade));
  const u = parseUsImports(J(FILES.us));
  // China's customs and the EI trade table: the six suppliers both name (EI builds on GACC).
  for (const [code, area] of [['RU', 'russia'], ['SA', 'saudi-arabia'], ['IQ', 'iraq'], ['KW', 'kuwait'], ['AE', 'uae'], ['CA', 'canada']] as const) {
    const customs = cn.rows.find((r) => r.code === code)!.tonnes[cn.years.indexOf(tr.year)]! / 1e6;
    const ei = tr.flows.find((f) => f.from === area && f.to === 'china')!.mt;
    assert.ok(Math.abs(customs - ei) <= Math.max(0.3, ei * 0.02), `${code}: customs ${customs} vs EI ${ei}`);
  }
  // Customs total ≈ the EI's "Total imports" into China (581.2 Mt) and GACC's published 578 Mt.
  assert.ok(Math.abs(cn.total[1]! / 1e6 - tr.importTotals.china) / tr.importTotals.china < 0.01);
  // EIA vs EI for U.S. imports from Canada, converted with the EI factor.
  const eia = u.rows.find((r) => r.code === 'CA')!.values[tr.year - u.from]!;
  const ei = kbdFromTonnes(tr.flows.find((f) => f.from === 'canada' && f.to === 'us')!.mt * 1e6, tr.year);
  assert.ok(Math.abs(eia - ei) / eia < 0.01, `Canada → US: EIA ${eia} vs EI ≈ ${ei}`);
  // Before 1993 the EIA itemises only its main sources; from then on the countries add up to the total.
  assert.ok(usUnlisted(u, 1980) > 100);
  for (let y = 1995; y <= u.to; y++) assert.ok(usUnlisted(u, y) < 15, `${y}`);
  assert.equal(u.partial.year, u.to + 1);
});

console.log(`✓ oil — ${passed} tests passed.`);
process.exit(0);
