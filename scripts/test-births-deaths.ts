// test-births-deaths.ts — births & deaths: dataset contract, derivations, URL state, formatters and the
// five chart specs (pure). Run: npm test.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatasetError } from '../src/lib/dataset';
import { DATA_FILE, coverageOf, deriveRows, parseBirthsDeaths, summarize, validateDataFile } from '../src/viz/births-deaths-ua/data';
import { SHOWS, parseDemoState, toDemoParams } from '../src/viz/births-deaths-ua/state';
import {
  buildSpec,
  chartLabel,
  lowestSince,
  millionsUnit,
  percentChange,
  persons,
  ratio,
  thousands,
  thousandsUnit,
} from '../src/viz/births-deaths-ua/specs';
import type { Localized } from '../src/catalog/types';
import { PUBLIC_DATA_DIR } from './lib/viz-folders';

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (e) {
    console.error(`✖ births-deaths: ${name}\n`, e);
    process.exit(1);
  }
}

const good = () => ({
  unit: 'persons',
  coverage: [
    { from: 2000, to: 2001, coverage: 'full' },
    { from: 2002, to: 2002, coverage: 'no-occupied' },
  ],
  rows: [
    { year: 2000, births: 500, deaths: 400 },
    { year: 2001, births: 400, deaths: 600 },
    { year: 2002, births: 200, deaths: 500 },
  ],
});
const rejects = (patch: (d: ReturnType<typeof good>) => void, msg: RegExp): void => {
  const d = good();
  patch(d);
  assert.throws(() => parseBirthsDeaths(d), (e: unknown) => e instanceof DatasetError && msg.test(e.message));
};

// ── Dataset contract ──────────────────────────────────────────────────────────────────────────────
test('parses a valid dataset', () => assert.equal(parseBirthsDeaths(good()).rows.length, 3));
test('rejects a wrong unit', () => rejects((d) => (d.unit = 'thousands'), /unit/));
test('rejects a gap between years', () => rejects((d) => (d.rows[2]!.year = 2003), /consecutive/));
test('rejects a non-integer or string count', () => {
  rejects((d) => (d.rows[0]!.births = 1.5), /integer/);
  rejects((d) => ((d.rows[0] as { births: unknown }).births = '500'), /finite number/);
  rejects((d) => (d.rows[0]!.deaths = 0), /outside/);
});
test('rejects a count in thousands mistaken for persons ×1000', () => rejects((d) => (d.rows[0]!.births = 657_200_000), /outside/));
test('rejects coverage with a hole, an overlap or a short end', () => {
  rejects((d) => (d.coverage[1]!.from = 2003), /outside|contiguous/);
  rejects((d) => (d.coverage[0]!.to = 2002), /contiguous|outside/);
  rejects((d) => d.coverage.pop(), /must end/);
  rejects((d) => ((d.coverage[0] as { coverage: string }).coverage = 'crimea'), /coverage/);
});
test('validateDataFile only accepts its file', () => {
  assert.throws(() => validateDataFile('other.json', good()), DatasetError);
  validateDataFile(DATA_FILE, good());
});

// ── Derivations ───────────────────────────────────────────────────────────────────────────────────
test('deriveRows computes net, ratio, index and coverage', () => {
  const ds = parseBirthsDeaths(good());
  const r = deriveRows(ds);
  assert.deepEqual(r.map((x) => x.net), [100, -200, -300]);
  assert.equal(r[1]!.ratio, 1.5);
  assert.equal(r[2]!.birthsIndex, 40);
  assert.equal(r[2]!.deathsIndex, 125);
  assert.equal(r[2]!.coverage, 'no-occupied');
  assert.equal(coverageOf(ds, 2001), 'full');
});
test('summarize: total decrease, run start, worst year, peak deaths', () => {
  const s = summarize(deriveRows(parseBirthsDeaths(good())));
  assert.equal(s.totalDecrease, 500);
  assert.equal(s.decreaseSince, 2001);
  assert.equal(s.worst.year, 2002);
  assert.equal(s.peakDeaths.year, 2001);
});

// ── The shipped dataset (numbers the page prints) ─────────────────────────────────────────────────
const shipped = parseBirthsDeaths(JSON.parse(readFileSync(join(PUBLIC_DATA_DIR, 'births-deaths-ua', DATA_FILE), 'utf8')));
const rows = deriveRows(shipped);
const sum = summarize(rows);
test('shipped data: 1990–2025, 2007 corrected to 472,700', () => {
  assert.equal(rows[0]!.year, 1990);
  assert.equal(rows.at(-1)!.year, 2025);
  assert.equal(rows.find((r) => r.year === 2007)!.births, 472_700);
});
test('shipped data: headline numbers', () => {
  assert.equal(sum.last.births, 168_800);
  assert.equal(sum.last.deaths, 485_300);
  assert.equal(ratio(sum.last.ratio, 'en'), '2.88');
  assert.equal(sum.decreaseSince, 1991);
  assert.equal(sum.totalDecrease, 9_289_000);
  assert.equal(sum.worst.year, 2021);
  assert.equal(sum.worst.net, -440_500);
  assert.equal(sum.peakDeaths.year, 1995);
  assert.equal(lowestSince(rows, rows.findIndex((r) => r.year === 2012), 'ratio'), 1992);
});
test('shipped data: coverage segments', () => {
  assert.deepEqual(
    shipped.coverage.map((c) => `${c.from}-${c.to}:${c.coverage}`),
    ['1990-2013:full', '2014-2021:no-crimea-ordlo', '2022-2025:no-occupied'],
  );
});

// ── Formatters ────────────────────────────────────────────────────────────────────────────────────
test('formatters in both languages', () => {
  assert.equal(thousands(168_800, 'en'), '168.8');
  assert.equal(thousands(168_800, 'uk'), '168,8');
  assert.equal(thousandsUnit(-440_500, 'en', true), '−440.5k');
  assert.equal(thousandsUnit(-440_500, 'uk', true), '−440,5 тис.');
  assert.equal(thousandsUnit(27_600, 'en', true), '+27.6k');
  assert.equal(millionsUnit(9_289_000, 'en'), '9.29 million');
  assert.equal(millionsUnit(9_289_000, 'uk'), '9,29 млн');
  assert.equal(percentChange(-0.743, 'en'), '−74%');
  assert.equal(persons(657_200, 'en'), '657,200');
  assert.equal(persons(-440_500, 'uk').replace(/\s/g, ' '), '−440 500');
});

// ── URL state ─────────────────────────────────────────────────────────────────────────────────────
test('state: defaults, round trip, hostile values', () => {
  assert.deepEqual(parseDemoState({}), { show: 'gap', view: 'chart' });
  assert.deepEqual(toDemoParams({ show: 'gap', view: 'chart' }), {});
  for (const show of SHOWS) assert.equal(parseDemoState(toDemoParams({ show, view: 'table' })).show, show);
  assert.deepEqual(parseDemoState({ show: '<script>', view: 'x' }), { show: 'gap', view: 'chart' });
  assert.deepEqual(toDemoParams({ show: 'ratio', view: 'table' }), { show: 'ratio', view: 'table' });
});

// ── Specs ─────────────────────────────────────────────────────────────────────────────────────────
const t = (v: Localized): string => v.en;
const ctx = { dataset: shipped, rows, summary: sum, lang: 'en' as const, t };
test('every angle builds a spec that fits its data', () => {
  for (const show of SHOWS) {
    const spec = buildSpec(show, ctx);
    assert.equal(spec.years.length, 36, show);
    const [lo, hi] = spec.yDomain;
    const series = [...(spec.lines ?? []).flatMap((l) => l.values), ...(spec.bars ?? []).flatMap((b) => b.values)];
    for (const v of series) assert.ok(v >= lo && v <= hi, `${show}: ${v} outside [${lo}, ${hi}]`);
    for (const m of spec.markers ?? []) assert.ok(m.value >= lo && m.value <= hi, `${show}: marker ${m.key}`);
    assert.equal(spec.bands?.length, 2, `${show}: two coverage bands`);
    assert.ok(spec.tooltip?.(0).title === '1990' && spec.tooltip(35).title === '2025**', `${show}: tooltip titles`);
    assert.ok(chartLabel(show, sum, 'en', t).length > 40, `${show}: label`);
    assert.ok(chartLabel(show, sum, 'uk', (v) => v.uk).length > 40, `${show}: uk label`);
  }
});
test('gap: end labels and key notes', () => {
  const spec = buildSpec('gap', ctx);
  assert.deepEqual(spec.markers?.map((m) => m.label), ['485.3', '168.8']);
  assert.ok(spec.notes?.some((n) => n.key && n.lines.join(' ').includes('COVID-19')));
  assert.ok(spec.labels?.some((l) => l.lines.join(' ').includes('9.29 million')));
});
test('ratio, net, index: end labels', () => {
  assert.equal(buildSpec('ratio', ctx).markers?.[0]?.label, '2.88×');
  assert.equal(buildSpec('net', ctx).markers?.[0]?.label, '−316.5');
  assert.deepEqual(buildSpec('index', ctx).markers?.map((m) => m.label), ['−23%', '−74%']);
});
test('net: bar colours follow the sign', () => {
  const bars = buildSpec('net', ctx).bars![0]!;
  assert.equal(bars.color(27.6, 0), 'var(--c-birth)');
  assert.equal(bars.color(-38.1, 1), 'var(--c-death)');
});

console.log(`✓ births-deaths: ${passed} tests passed.`);
