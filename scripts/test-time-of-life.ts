// test-time-of-life.ts — the time-use dataset (S3-tl): parser, residual split, OECD average, lifetime scaling,
// weeks allocation, URL state and formats. Run: npm test.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ACTIVITY_IDS,
  DATA_FILE,
  SPAN_WEEKS,
  activityRows,
  amounts,
  groupRows,
  measureOf,
  minutesFor,
  oecdAverage,
  oecdCount,
  parseTimeUse,
  totalOf,
  validateDataFile,
  weeksOf,
} from '../src/viz/time-of-life/data';
import meta from '../src/viz/time-of-life/meta';
import { DEFAULTS, SHOWS, parseLifeState, toLifeParams } from '../src/viz/time-of-life/state';
import { fmtDuration, fmtDurationSigned, fmtYears } from '../src/viz/time-of-life/text';

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (e) {
    console.error(`✖ time-of-life: ${name}\n`, e);
    process.exit(1);
  }
}

const json: unknown = JSON.parse(readFileSync(`public/data/time-of-life/${DATA_FILE}`, 'utf8'));
const ds = parseTimeUse(json);
const avg = oecdAverage(ds);
const near = (a: number, b: number, eps = 0.01): boolean => Math.abs(a - b) <= eps;

test('the shipped file parses: 35 countries, 30 OECD, 3 sexes × 15 activities', () => {
  assert.equal(ds.countries.length, 35);
  assert.equal(oecdCount(ds), 30);
  assert.equal(new Set(ds.countries.map((c) => c.code)).size, 35);
  assert.equal(ds.countries.find((c) => c.code === 'JP')?.surveyYear, '2021');
  assert.equal(ds.countries.find((c) => c.code === 'IT')?.surveyYear, '2013/14'); // "2013/2014" normalised
});

test('meta ships exactly the parsed file', () => {
  assert.deepEqual([...meta.data], [DATA_FILE]);
  assert.doesNotThrow(() => validateDataFile(DATA_FILE, json));
  assert.throws(() => validateDataFile('other.json', json));
});

test('every day sums to 1,440 min ± 1 and the OECD main categories survive the split', () => {
  for (const c of ds.countries) for (const s of ['total', 'women', 'men'] as const) assert.ok(near(totalOf(c.minutes[s]), 1440, 1));
  // Sheet values (Total): Austria paid 265.64 · unpaid 187.97 · personal 667.66 · leisure 306.87.
  const at = ds.countries.find((c) => c.code === 'AT')!.minutes.total;
  assert.ok(near(measureOf(at, 'paid'), 265.64));
  assert.ok(near(measureOf(at, 'unpaid'), 187.97));
  assert.ok(near(measureOf(at, 'needs'), 667.66));
  assert.ok(near(measureOf(at, 'free'), 306.87));
  // Japan: travel for household activities is "(see notes)" → 0, its time stays in care & other unpaid.
  const jp = ds.countries.find((c) => c.code === 'JP')!.minutes.total;
  assert.equal(jp.errands, 0);
  assert.ok(near(measureOf(jp, 'unpaid'), 125));
});

test('the parser rejects broken files', () => {
  const bad = (patch: (d: { countries: Array<Record<string, unknown>> }) => void): void => {
    const copy = JSON.parse(JSON.stringify(json)) as { countries: Array<Record<string, unknown>> };
    patch(copy);
    assert.throws(() => parseTimeUse(copy));
  };
  bad((d) => (d.countries[0]!.code = 'Australia'));
  bad((d) => (d.countries[1]!.code = d.countries[0]!.code));
  bad((d) => ((d.countries[0]!.minutes as Record<string, Record<string, number>>).total!.sleep = 900)); // day ≠ 1440
  bad((d) => ((d.countries[0]!.minutes as Record<string, Record<string, unknown>>).women!.tv = '120'));
  bad((d) => delete (d.countries[0]!.minutes as Record<string, unknown>).men);
});

test('OECD average: unweighted mean of the 30 members; ~17.6 years of sleep, ~10.2 free', () => {
  const members = ds.countries.filter((c) => c.oecd);
  const sleep = members.reduce((s, c) => s + c.minutes.total.sleep, 0) / members.length;
  assert.ok(near(avg.total.sleep, sleep, 1e-9));
  const rows = activityRows(avg.total);
  const g = groupRows(rows);
  assert.ok(near(rows.find((r) => r.id === 'sleep')!.years, 17.56, 0.01));
  assert.ok(near(g.find((x) => x.id === 'free')!.years, 10.18, 0.01));
  assert.ok(near(g.reduce((s, x) => s + x.years, 0), 50, 1e-9));
  assert.equal(minutesFor(ds, 'ZZ', 'total', avg), avg.total); // unknown code → average
});

test('lifetime scaling: a full day is 50 years, 18,262.5 days', () => {
  const a = amounts(1440);
  assert.equal(a.years, 50);
  assert.equal(a.days, 18262.5);
  assert.equal(a.hours, 438300);
  assert.equal(amounts(720).share, 0.5);
});

test('weeks: whole squares that always sum to 2,600', () => {
  for (const c of ds.countries) {
    for (const s of ['total', 'women', 'men'] as const) {
      const w = weeksOf(activityRows(c.minutes[s]));
      assert.equal(w.reduce((sum, x) => sum + x.weeks, 0), SPAN_WEEKS);
      assert.ok(w.every((x) => Number.isInteger(x.weeks) && x.weeks >= 0));
    }
  }
});

test('display rows cover every stored activity once', () => {
  const rows = activityRows(avg.total);
  assert.equal(rows.length, 14);
  assert.ok(near(rows.reduce((s, r) => s + r.minutes, 0), totalOf(avg.total), 1e-9));
  assert.equal(ACTIVITY_IDS.length, 15);
});

test('URL state: defaults omitted, bad values fall back, unused settings dropped', () => {
  const codes = ds.countries.map((c) => c.code);
  assert.deepEqual(parseLifeState({}, codes), DEFAULTS);
  assert.deepEqual(toLifeParams(DEFAULTS), {});
  const s = parseLifeState({ show: 'ranking', country: 'jp', sex: 'women', unit: 'hours', view: 'table' }, codes);
  assert.equal(s.country, 'JP');
  assert.deepEqual(toLifeParams(s), { show: 'ranking', country: 'JP', sex: 'women', unit: 'hours', view: 'table' });
  const bad = parseLifeState({ show: '<x>', country: 'UA', sex: 'x', unit: 'weeks', measure: 'nope' }, codes);
  assert.deepEqual(bad, DEFAULTS); // Ukraine is not in the database → the average
  // The unit belongs to the ranking only; the gender angle keeps the measure but not country/sex.
  assert.deepEqual(toLifeParams({ ...DEFAULTS, unit: 'days' }), {});
  assert.deepEqual(toLifeParams({ ...DEFAULTS, show: 'gender', country: 'JP', sex: 'men', measure: 'unpaid' }), {
    show: 'gender',
    measure: 'unpaid',
  });
  assert.equal(SHOWS[0], 'weeks');
});

test('formats: Intl units and Ukrainian plurals', () => {
  assert.equal(fmtYears(17.56, 'en'), '17.6 years');
  assert.equal(fmtYears(17.56, 'uk'), '17,6 року');
  assert.equal(fmtYears(5, 'uk', 0), '5 років');
  assert.equal(fmtDuration(505.8, 'en'), '8h 26m');
  assert.equal(fmtDuration(60, 'en'), '1h');
  assert.equal(fmtDuration(40, 'en'), '40m');
  assert.equal(fmtDurationSigned(-12.2, 'en'), '−12m');
  assert.ok(fmtDuration(505.8, 'uk').includes('год'));
});

console.log(`✓ time-of-life: ${passed} tests passed`);
