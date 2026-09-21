// test-air-attacks.ts — air attacks: dataset contracts, buckets, rates, largest reports, models, civilians,
// URL state, labels and the five chart specs (pure; the real dataset). Run: npm test. CHANGED (S3-aa): new.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatasetError } from '../src/lib/dataset';
import {
  CIVILIANS_FILE,
  DATA_FILE,
  MISSILE_CLASSES,
  RATE_MIN,
  STEPS,
  aggregate,
  bucketStart,
  coversAttackData,
  emptyTotals,
  largestReports,
  launchedInMonths,
  modelTotals,
  nextBucket,
  parseAttacks,
  parseCivilians,
  periodRange,
  rate,
  summarize,
  validateDataFile,
  yearsOf,
} from '../src/viz/air-attacks-on-ukraine/data';
import { hasModelLabel, modelLabel } from '../src/viz/air-attacks-on-ukraine/labels';
import { SHOWS, parseAirState, toAirParams } from '../src/viz/air-attacks-on-ukraine/state';
import {
  civiliansSpec,
  compact,
  dateLabel,
  harmParts,
  int,
  interceptionSpec,
  largestSpec,
  monthLabel,
  pct,
  perHundred,
  timelineSpec,
  typesSpec,
} from '../src/viz/air-attacks-on-ukraine/specs';
import type { Localized } from '../src/catalog/types';
import { PUBLIC_DATA_DIR } from './lib/viz-folders';

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (e) {
    console.error(`✖ air-attacks: ${name}\n`, e);
    process.exit(1);
  }
}

const read = (f: string): unknown => JSON.parse(readFileSync(join(PUBLIC_DATA_DIR, 'air-attacks-on-ukraine', f), 'utf8'));
const ds = parseAttacks(read(DATA_FILE));
const civ = parseCivilians(read(CIVILIANS_FILE));
const en = (v: Localized): string => v.en;
const uk = (v: Localized): string => v.uk;

const mini = () => ({
  unit: 'weapons',
  first: '2025-01-01',
  last: '2025-01-03',
  hiddenFrom: '2025-01-03',
  reports: [
    { date: '2025-01-01', start: '2024-12-31 18:00', end: '2025-01-01 08:00', items: [{ class: 'drones', launched: 10, destroyed: 8, lost: 1 }] },
    { date: '2025-01-03', start: '2025-01-03', end: '2025-01-03', items: [{ class: 'cruise', launched: 4, destroyed: 4, note: 'launched-hidden' }] },
  ],
  models: [{ model: 'Shahed-136/131', class: 'drones', years: { '2025': 10 } as Record<string, number> }],
});

test('real dataset: range, reports, notes', () => {
  assert.equal(ds.first, '2022-09-28');
  assert.equal(ds.last, '2026-09-19');
  assert.equal(ds.hiddenFrom, '2026-08-10');
  assert.equal(ds.reports.length, 1236);
  assert.deepEqual(yearsOf(ds), [2022, 2023, 2024, 2025, 2026]);
  const hidden = ds.reports.flatMap((r) => r.items).filter((i) => i.note === 'launched-hidden');
  assert.ok(hidden.length > 0 && hidden.every((i) => i.class !== 'drones'));
});

test('summaries match the prep report (and the page copy)', () => {
  const all = summarize(ds, 'all');
  assert.equal(all.drones.launched, 119_405);
  assert.equal(all.missiles.launched, 7_639);
  assert.equal(all.largest?.report.date, '2025-09-07');
  assert.deepEqual([all.largest?.total, all.largest?.drones, all.largest?.missiles], [823, 810, 13]);
  assert.equal(summarize(ds, 2023).drones.launched, 3_113);
  assert.equal(summarize(ds, 2025).drones.launched, 54_536);
  const d = rate(all.drones)!;
  assert.ok(d > 0.87 && d < 0.88, `drones stopped ${d}`);
  assert.ok(rate(all.byClass.ballistic)! < 0.25 && rate(all.byClass.cruise)! > 0.79);
});

test('buckets conserve every weapon, for every step and period', () => {
  for (const step of STEPS) {
    for (const period of ['all', 2022, 2025, 2026] as const) {
      const bs = aggregate(ds, step, period);
      const s = summarize(ds, period);
      assert.equal(bs.reduce((a, b) => a + b.drones.launched, 0), s.drones.launched, `${step} ${period} drones`);
      assert.equal(bs.reduce((a, b) => a + b.missiles.launched, 0), s.missiles.launched, `${step} ${period} missiles`);
      for (let i = 1; i < bs.length; i++) assert.equal(bs[i]!.start, bs[i - 1]!.end, 'contiguous');
    }
  }
  const months = aggregate(ds, 'month', 'all');
  assert.equal(months.length, 49);
  assert.deepEqual([months[0]!.partial, months[1]!.partial, months[48]!.partial], [true, false, true]);
  assert.equal(aggregate(ds, 'month', 2025).length, 12);
  assert.ok(aggregate(ds, 'month', 2025).every((b) => !b.partial));
});

test('calendar helpers: Monday weeks, month roll-over, period clamp', () => {
  assert.equal(bucketStart('2025-09-07', 'week'), '2025-09-01'); // Sunday → Monday
  assert.equal(bucketStart('2025-09-01', 'week'), '2025-09-01');
  assert.equal(bucketStart('2025-09-07', 'month'), '2025-09-01');
  assert.equal(nextBucket('2025-12-01', 'month'), '2026-01-01');
  assert.equal(nextBucket('2024-02-28', 'day'), '2024-02-29');
  assert.deepEqual(periodRange(ds, 2022), { from: '2022-09-28', to: '2022-12-31' });
  assert.deepEqual(periodRange(ds, 2026), { from: '2026-01-01', to: '2026-09-19' });
});

test('rates: stopped = shot down + lost over rated items; hidden items stay out', () => {
  const small = parseAttacks(mini());
  const s = summarize(small, 'all');
  assert.equal(rate(s.drones), 0.9);
  assert.equal(s.missiles.launched, 4); // counted…
  assert.equal(rate(s.missiles), null); // …but not rated
  assert.equal(rate(emptyTotals()), null);
  assert.equal(rate(s.drones, RATE_MIN), 0.9);
  assert.equal(rate(s.drones, 11), null);
});

test('largest reports: by total, missiles or drones; ties keep the earlier date', () => {
  assert.deepEqual(
    largestReports(ds, 'all', 'drones', 2).map((r) => [r.report.date, r.drones]),
    [['2025-09-07', 810], ['2026-05-13', 753]],
  );
  assert.deepEqual(largestReports(ds, 'all', 'missiles', 1).map((r) => [r.report.date, r.missiles]), [['2024-08-26', 127]]);
  const y22 = largestReports(ds, 2022, 'total', 15);
  assert.ok(y22.every((r) => r.report.date.startsWith('2022')));
  for (let i = 1; i < y22.length; i++) assert.ok(y22[i - 1]!.total >= y22[i]!.total);
});

test('models: totals per period add up to the class totals; every model has a label', () => {
  for (const p of ['all', 2024] as const) {
    const sum = modelTotals(ds, p, MISSILE_CLASSES).reduce((a, m) => a + m.launched, 0);
    assert.equal(sum, summarize(ds, p).missiles.launched);
  }
  assert.equal(modelTotals(ds, 'all')[0]!.model, 'Shahed-136/131');
  for (const m of ds.models) assert.ok(hasModelLabel(m.model), `no label for ${m.model}`);
  assert.equal(modelLabel('X-101/X-555 and Kalibr', 'en'), 'Kh-101/Kh-555 + Kalibr');
  assert.equal(modelLabel('X-101/X-555 and Kalibr', 'uk'), 'Х-101/Х-555 + «Калібр»');
});

test('parsers reject broken files', () => {
  const bad = (patch: (o: ReturnType<typeof mini>) => void): void => {
    const o = mini();
    patch(o);
    assert.throws(() => parseAttacks(o), DatasetError);
  };
  bad((o) => ((o as { unit: string }).unit = 'units'));
  bad((o) => ((o.reports[0]!.items[0] as { lost: number }).lost = 5)); // 8 + 5 > 10
  bad((o) => o.reports.reverse()); // unsorted
  bad((o) => (o.reports[0]!.date = '2025-02-30'));
  bad((o) => ((o.reports[0]!.items[0] as { class: string }).class = 'bombs'));
  bad((o) => (o.reports[0]!.end = '2025-01-02 08:00')); // date ≠ end date
  bad((o) => (o.models[0]!.years = { '2019': 1 }));
  assert.throws(() => validateDataFile('other.json', mini()), DatasetError);
  assert.throws(
    () =>
      parseCivilians({
        unit: 'persons',
        years: [{ year: 2025, fromMonth: 1, toMonth: 12, total: { killed: 1, injured: 1 }, longRange: { killed: 2, injured: 0 }, source: 'https://x.org' }],
      }),
    DatasetError,
  );
});

test('civilians: parts, shares, per 100 weapons', () => {
  assert.deepEqual(civ.years.map((y) => y.year), [2023, 2024, 2025, 2026]);
  const [y23, y24, y25, y26] = civ.years;
  assert.equal(harmParts(y23!, 'all').restKind, 'all');
  assert.equal(harmParts(y24!, 'all').restKind, 'notBroken');
  const p25 = harmParts(y25!, 'all');
  assert.equal(p25.restKind, 'other');
  assert.equal(p25.total, 14_656);
  assert.equal(pct(p25.longRange! / p25.total, 'en'), '35%');
  assert.equal(harmParts(y25!, 'killed').longRange, 682);
  assert.ok(coversAttackData(ds, y26!) && coversAttackData(ds, y25!));
  const l25 = launchedInMonths(ds, 2025, 1, 12).launched;
  assert.equal(l25, summarize(ds, 2025).drones.launched + summarize(ds, 2025).missiles.launched);
  assert.equal(Math.round(perHundred(y25!, l25)!), 9);
  assert.equal(perHundred(y23!, 1000), null);
});

test('URL state: defaults omitted, hostile values fall back, round trip', () => {
  const years = yearsOf(ds);
  assert.deepEqual(toAirParams(parseAirState({}, years)), {});
  const hostile = parseAirState({ show: '<script>', year: '1999', step: 'hour', mode: 'x', rank: 'y', who: 'z', view: 'x' }, years);
  assert.deepEqual(toAirParams(hostile), {});
  const full = { show: 'types', year: '2025', step: 'week', mode: 'share', rank: 'drones', who: 'killed', view: 'table' };
  assert.deepEqual(toAirParams(parseAirState(full, years)), full);
  assert.equal(SHOWS[0], 'timeline');
});

test('formatters (EN + UK)', () => {
  assert.equal(int(119_405, 'en'), '119,405');
  assert.equal(int(119_405, 'uk').replace(/\s/g, ' '), '119 405');
  assert.equal(compact(8150, 'en'), '8.2k');
  assert.equal(compact(8000, 'uk'), '8 тис.');
  assert.match(dateLabel('2025-09-07', 'en'), /^7 Sept? 2025$/); // ICU versions differ: Sep / Sept
  assert.ok(!dateLabel('2025-09-07', 'uk').endsWith('р.'));
  assert.equal(monthLabel('2026-05-01', 'en'), 'May 2026');
});

test('spec A: two panels, three stacks that add up to launched; hidden band only when in view', () => {
  const bs = aggregate(ds, 'month', 'all');
  const spec = timelineSpec(ds, bs, 'month', 'all', 'en', en);
  assert.deepEqual(spec.panels.map((p) => p.key), ['missiles', 'drones']);
  const drones = spec.panels[1]!;
  bs.forEach((b, i) => {
    const sum = drones.stacks!.reduce((a, s) => a + s.values[i]!, 0);
    assert.equal(sum, b.drones.launched);
  });
  assert.equal(drones.stacks![1]!.texture, 'hatch');
  assert.equal(drones.notes![0]!.lines[0], 'Peak: 8,150');
  assert.equal(spec.bands!.length, 1);
  assert.deepEqual(spec.bands![0]!.panels, ['missiles']);
  assert.equal(timelineSpec(ds, aggregate(ds, 'month', 2025), 'month', 2025, 'en', en).bands!.length, 0);
  assert.deepEqual(spec.xTicks.map((ms) => spec.xFormat(ms)), ['2023', '2024', '2025', '2026']);
  const y = timelineSpec(ds, aggregate(ds, 'week', 2025), 'week', 2025, 'uk', uk);
  assert.equal(y.xTicks.length, 12);
  assert.equal(y.panels[0]!.title, 'Ракети, запущено за тиждень');
  assert.match(y.tooltip!(0).title, /^Тиждень від/);
});

test('spec B–E: shares sum to 1, rates need ≥ RATE_MIN, largest rows, civilians spans', () => {
  const bs = aggregate(ds, 'month', 2024);
  const share = typesSpec(ds, bs, 'month', 2024, 'share', 'en', en).panels[0]!;
  bs.forEach((b, i) => {
    if (b.missiles.launched === 0) return;
    const sum = share.stacks!.reduce((a, st) => a + st.values[i]!, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9);
  });
  const ic = interceptionSpec(aggregate(ds, 'month', 'all'), 'all', 'en', en).panels[0]!;
  const anti = ic.lines!.find((l) => l.key === 'antiship')!;
  assert.ok(anti.values.some((v) => v === null) && anti.values.some((v) => v !== null));
  const ls = largestSpec(largestReports(ds, 'all', 'total', 15), 'total', 'en', en);
  assert.equal(ls.rows.length, 15);
  assert.match(ls.rows[0]!.label, /^7 Sept? 2025$/);
  assert.equal(ls.rows[0]!.sublabel, '17:00–09:30');
  assert.equal(ls.rows[0]!.valueLabel, '823');
  const drOnly = largestSpec(largestReports(ds, 'all', 'drones', 3), 'drones', 'en', en);
  assert.ok(drOnly.rows.every((r) => r.segments.length === 1 && r.segments[0]!.key === 'drones'));
  const cs = civiliansSpec(civ, 'all', 'en', en);
  assert.equal(cs.spans.length, 4);
  assert.equal(new Date(cs.spans[3]!.end).toISOString().slice(0, 10), '2026-09-01');
  assert.deepEqual(cs.partial, [false, false, false, true]);
  assert.deepEqual(cs.panels[0]!.notes!.map((n) => n.index), [2, 3]);
  assert.equal(cs.xFormat(cs.xTicks[3]!), '2026*');
});

console.log(`✓ air-attacks — ${passed} test groups passed.`);
