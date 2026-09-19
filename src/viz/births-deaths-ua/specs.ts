// specs.ts — pure builders: formatters, the five chart specs (one per angle) and their accessible labels.
// No React and no DOM, so the numbers every view prints are unit-tested (scripts/test-births-deaths.ts).
import type { YearBand, YearChartSpec, YearNote, YearTooltip } from '../../charts/renderYearChart';
import { DEMO_COLOR } from '../../charts/palette';
import type { Lang, Localized } from '../../catalog/types';
import { localeOf } from '../../i18n/lang';
import { fill } from '../../i18n/ui';
import type { BirthsDeathsDataset, Coverage, DemoRow, Summary } from './data';
import type { Show } from './state';

// ── Formatters ────────────────────────────────────────────────────────────────────────────────────
const cache = new Map<string, Intl.NumberFormat>();
function nf(lang: Lang, key: string, o: Intl.NumberFormatOptions): Intl.NumberFormat {
  const id = `${lang}:${key}`;
  let f = cache.get(id);
  if (!f) cache.set(id, (f = new Intl.NumberFormat(localeOf(lang), o)));
  return f;
}
/** Typographic minus instead of the hyphen Intl prints. */
const minus = (s: string): string => s.replace(/^-/, '−');

/** 168_800 → '168.8' / '168,8' (thousands, one decimal). `signed` adds + / −. */
export function thousands(persons: number, lang: Lang, signed = false): string {
  const f = nf(lang, signed ? 'k1s' : 'k1', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: signed ? 'exceptZero' : 'auto',
  });
  return minus(f.format(persons / 1000));
}
/** 168_800 → '168.8k' / '168,8 тис.' */
export function thousandsUnit(persons: number, lang: Lang, signed = false): string {
  const n = thousands(persons, lang, signed);
  return lang === 'uk' ? `${n} тис.` : `${n}k`;
}
/** 9_289_000 → '9.29 million' / '9,29 млн' */
export function millionsUnit(persons: number, lang: Lang): string {
  const n = nf(lang, 'm2', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(persons / 1e6);
  return lang === 'uk' ? `${n} млн` : `${n} million`;
}
/** 2.875 → '2.88' / '2,88' */
export function ratio(value: number, lang: Lang): string {
  return nf(lang, 'r2', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}
/** −0.743 → '−74%' */
export function percentChange(change: number, lang: Lang): string {
  return minus(nf(lang, 'pct0s', { style: 'percent', maximumFractionDigits: 0, signDisplay: 'exceptZero' }).format(change));
}
/** Exact persons for the table: 657200 → '657,200' / '657 200'. */
export function persons(value: number, lang: Lang): string {
  return minus(nf(lang, 'int', { maximumFractionDigits: 0 }).format(value));
}
const tick0 = (v: number, lang: Lang, signed = false): string =>
  minus(nf(lang, signed ? 't0s' : 't0', { maximumFractionDigits: 1, signDisplay: signed ? 'exceptZero' : 'auto' }).format(v));

/** '*' / '**' after a year, by coverage. */
export const COVERAGE_MARK: Readonly<Record<Coverage, string>> = { full: '', 'no-crimea-ordlo': '*', 'no-occupied': '**' };

// ── Strings used inside charts ────────────────────────────────────────────────────────────────────
type T = (v: Localized) => string;
const s = {
  bandOrdlo: { en: '* excl. Crimea, Donbas', uk: '* без Криму й ОРДЛО' },
  bandOccupied: { en: '** excl. occupied', uk: '** без ТОТ' },
  unitK: { en: 'thousand people', uk: 'тис. осіб' },
  unitRatio: { en: 'deaths per birth', uk: 'смертей на 1 народження' },
  unitNet: { en: 'thousand people, births − deaths', uk: 'тис. осіб, народження − смерті' },
  unitIndex: { en: 'index, 1990 = 100', uk: 'індекс, 1990 = 100' },
  births: { en: 'Births', uk: 'Народження' },
  deaths: { en: 'Deaths', uk: 'Смерті' },
  net: { en: 'Natural change', uk: 'Природний приріст' },
  perBirth: { en: 'Deaths per birth', uk: 'Смертей на 1 народж.' },
  birthsIndex: { en: 'Births, 1990 = 100', uk: 'Народження, 1990 = 100' },
  deathsIndex: { en: 'Deaths, 1990 = 100', uk: 'Смерті, 1990 = 100' },
  gapLabel: { en: 'natural decrease', uk: 'природне скорочення' },
  gapTotal: { en: '−{total} in {from}–{to}', uk: '−{total} за {from}–{to}' },
  peakDeaths: { en: '{year} · deaths peak {value}', uk: '{year} · пік смертей {value}' },
  crossing: { en: ['{year}: the last year with', 'more births than deaths'], uk: ['{year} — останній рік, коли', 'народжень було більше'] },
  covid: { en: ['2021 · COVID-19', '{value} deaths'], uk: ['2021 · COVID-19', '{value} смертей'] },
  invasion: { en: ['2022 · full-scale', 'invasion'], uk: ['2022 · повномасштабне', 'вторгнення'] },
  balance: { en: '1 : 1 — balance', uk: '1 : 1 — рівновага' },
  stillGrowth: { en: ['{year} · {value}', 'still natural growth'], uk: ['{year} · {value}', 'ще природний приріст'] },
  lowestSince: { en: ['{year} · {value}', 'lowest since {since}'], uk: ['{year} · {value}', 'найнижче з {since}'] },
  plain: { en: '{year} · {value}', uk: '{year} · {value}' },
  covidRatio: { en: '2021 · COVID-19 · {value}', uk: '2021 · COVID-19 · {value}' },
  up: { en: '▲ births', uk: '▲ народження' },
  down: { en: '▼ deaths', uk: '▼ смерті' },
  level: { en: '1990 level = 100', uk: 'рівень 1990 = 100' },
  deathsPeakIdx: { en: '{year} · deaths {value}', uk: '{year} · смерті {value}' },
  birthsLowIdx: { en: ['{year} · births {change}', 'vs 1990'], uk: ['{year} · народжень {change}', 'від 1990'] },
} as const;

const lines = (v: { en: readonly string[]; uk: readonly string[] }, lang: Lang, values: Record<string, string | number>): string[] =>
  v[lang].map((l) => fill(l, values));

export function bandsOf(dataset: BirthsDeathsDataset, t: T): YearBand[] {
  return dataset.coverage
    .filter((c) => c.coverage !== 'full')
    .map((c) => ({
      from: c.from,
      to: c.to,
      level: c.coverage === 'no-occupied' ? 2 : 1,
      label: t(c.coverage === 'no-occupied' ? s.bandOccupied : s.bandOrdlo),
      shortLabel: COVERAGE_MARK[c.coverage],
    }));
}

export function tooltipOf(row: DemoRow, lang: Lang, t: T): YearTooltip {
  return {
    title: `${row.year}${COVERAGE_MARK[row.coverage]}`,
    lines: [
      { label: t(s.births), value: thousandsUnit(row.births, lang), color: DEMO_COLOR.births },
      { label: t(s.deaths), value: thousandsUnit(row.deaths, lang), color: DEMO_COLOR.deaths },
      { label: t(s.net), value: thousandsUnit(row.net, lang, true) },
      { label: t(s.perBirth), value: ratio(row.ratio, lang) },
    ],
  };
}

/** Upper bound for a 0-based axis: the next multiple of `step` above max, plus one step of headroom. */
export const niceMax = (max: number, step: number): number => Math.ceil(max / step) * step + step;

/** The latest earlier year whose value is at or below the given year's (for "lowest since"). */
export function lowestSince(rows: readonly DemoRow[], index: number, key: 'ratio'): number | null {
  for (let i = index - 1; i >= 0; i--) if (rows[i]![key] <= rows[index]![key]) return rows[i]!.year;
  return null;
}

export type SpecContext = {
  dataset: BirthsDeathsDataset;
  rows: readonly DemoRow[];
  summary: Summary;
  lang: Lang;
  t: T;
};

export function buildSpec(show: Show, ctx: SpecContext): YearChartSpec {
  const { dataset, rows, summary, lang, t } = ctx;
  const years = rows.map((r) => r.year);
  const at = (year: number): number => years.indexOf(year);
  const lastI = rows.length - 1;
  const { first, last } = summary;
  const common = {
    years,
    bands: bandsOf(dataset, t),
    xTicks: [1990, 1995, 2000, 2005, 2010, 2014, 2018, 2022, 2025].filter((y) => years.includes(y)),
    xTicksNarrow: [1990, 2000, 2010, 2022].filter((y) => years.includes(y)),
    tooltip: (i: number) => tooltipOf(rows[i]!, lang, t),
  };
  const k = (v: number): number => v / 1000;
  const note = (year: number, value: number, text: string[], dx: number, dy: number, anchor: YearNote['anchor'], key = false): YearNote[] =>
    at(year) < 0 ? [] : [{ index: at(year), value, lines: text, dx, dy, anchor, key }];

  switch (show) {
    case 'gap': {
      const top = niceMax(k(summary.peakDeaths.deaths), 50);
      const mid = rows[at(2003)] ?? rows[Math.floor(rows.length / 2)]!;
      const lastGrowth = rows.filter((r) => r.net > 0).at(-1);
      return {
        ...common,
        yDomain: [0, top],
        yFormat: (v) => tick0(v, lang),
        yLabel: t(s.unitK),
        gaps: [
          { key: 'gap', a: rows.map((r) => k(r.births)), b: rows.map((r) => k(r.deaths)), fillAbove: DEMO_COLOR.deathsSoft, fillBelow: DEMO_COLOR.birthsSoft },
        ],
        lines: [
          { key: 'deaths', values: rows.map((r) => k(r.deaths)), color: DEMO_COLOR.deaths, width: 3 },
          { key: 'births', values: rows.map((r) => k(r.births)), color: DEMO_COLOR.births, width: 3 },
        ],
        labels: [
          { year: mid.year, value: k((mid.births + mid.deaths) / 2) + 12, lines: [t(s.gapLabel)], strong: true },
          {
            year: mid.year,
            value: k((mid.births + mid.deaths) / 2) - 26,
            lines: [fill(t(s.gapTotal), { total: millionsUnit(summary.totalDecrease, lang), from: summary.decreaseSince, to: last.year })],
            wideOnly: true,
          },
        ],
        notes: [
          ...note(summary.peakDeaths.year, k(summary.peakDeaths.deaths), [fill(t(s.peakDeaths), { year: summary.peakDeaths.year, value: thousandsUnit(summary.peakDeaths.deaths, lang) })], 0, -22, 'middle'),
          ...(lastGrowth ? note(lastGrowth.year, k(lastGrowth.births), lines(s.crossing, lang, { year: lastGrowth.year }), 36, 118, 'start') : []),
          ...note(2021, k(rows[at(2021)]?.deaths ?? 0), lines(s.covid, lang, { value: thousandsUnit(rows[at(2021)]?.deaths ?? 0, lang) }), -26, -34, 'end', true),
          ...note(2022, k(rows[at(2022)]?.births ?? 0), lines(s.invasion, lang, {}), -30, 34, 'end', true),
        ],
        markers: [
          { key: 'deaths', index: lastI, value: k(last.deaths), color: DEMO_COLOR.deaths, label: thousands(last.deaths, lang) },
          { key: 'births', index: lastI, value: k(last.births), color: DEMO_COLOR.births, label: thousands(last.births, lang) },
        ],
        hoverPoints: (i) => [
          { value: k(rows[i]!.deaths), color: DEMO_COLOR.deaths },
          { value: k(rows[i]!.births), color: DEMO_COLOR.births },
        ],
      };
    }
    case 'ratio': {
      const maxR = Math.max(...rows.map((r) => r.ratio));
      const i2012 = at(2012);
      const since = i2012 >= 0 ? lowestSince(rows, i2012, 'ratio') : null;
      const peak2001 = rows[at(2001)];
      return {
        ...common,
        yDomain: [0, Math.ceil(maxR * 2) / 2 + 0.2],
        yFormat: (v) => `${tick0(v, lang)}×`,
        yLabel: t(s.unitRatio),
        areas: [{ key: 'excess', top: rows.map((r) => Math.max(1, r.ratio)), bottom: 1, fill: DEMO_COLOR.deathsSoft }],
        rules: [{ value: 1, label: t(s.balance), labelAt: 'end', labelSide: 'below', color: 'var(--tx2)' }],
        lines: [{ key: 'ratio', values: rows.map((r) => r.ratio), color: DEMO_COLOR.deaths, width: 3 }],
        notes: [
          ...(first.net > 0 ? note(first.year, first.ratio, lines(s.stillGrowth, lang, { year: first.year, value: ratio(first.ratio, lang) }), 8, 40, 'start') : []),
          ...(peak2001 ? note(2001, peak2001.ratio, [fill(t(s.plain), { year: 2001, value: ratio(peak2001.ratio, lang) })], 0, -24, 'middle') : []),
          ...(i2012 >= 0 && since ? note(2012, rows[i2012]!.ratio, lines(s.lowestSince, lang, { year: 2012, value: ratio(rows[i2012]!.ratio, lang), since }), 0, 34, 'middle') : []),
          ...note(2021, rows[at(2021)]?.ratio ?? 0, [fill(t(s.covidRatio), { value: ratio(rows[at(2021)]?.ratio ?? 0, lang) })], -20, -30, 'end', true),
        ],
        markers: [{ key: 'ratio', index: lastI, value: last.ratio, color: DEMO_COLOR.deaths, label: `${ratio(last.ratio, lang)}×` }],
        hoverPoints: (i) => [{ value: rows[i]!.ratio, color: DEMO_COLOR.deaths }],
      };
    }
    case 'net': {
      const worst = k(summary.worst.net);
      const best = Math.max(0, ...rows.map((r) => k(r.net)));
      return {
        ...common,
        yDomain: [Math.floor(worst / 40) * 40 - 40, Math.max(40, Math.ceil(best / 20) * 20 + 20)],
        yFormat: (v) => tick0(v, lang, true),
        yLabel: t(s.unitNet),
        bars: [{ key: 'net', values: rows.map((r) => k(r.net)), color: (v) => (v > 0 ? DEMO_COLOR.births : DEMO_COLOR.deaths) }],
        rules: [{ value: 0, color: 'var(--tx2)' }],
        labels: [
          {
            year: 2004,
            value: worst - 8,
            lines: [fill(t(s.gapTotal), { total: millionsUnit(summary.totalDecrease, lang), from: summary.decreaseSince, to: last.year })],
            strong: true,
            wideOnly: true,
          },
        ],
        notes: [
          ...(first.net > 0 ? note(first.year, k(first.net), [fill(t(s.plain), { year: first.year, value: thousands(first.net, lang, true) })], 8, -16, 'start', true) : []),
          ...note(summary.worst.year, worst, [fill(t(s.plain), { year: summary.worst.year, value: thousandsUnit(summary.worst.net, lang, true) })], -12, 20, 'end', true),
        ],
        markers: [{ key: 'net', index: lastI, value: k(last.net), color: DEMO_COLOR.deaths, label: thousands(last.net, lang, true) }],
        hoverPoints: (i) => [{ value: k(rows[i]!.net), color: rows[i]!.net > 0 ? DEMO_COLOR.births : DEMO_COLOR.deaths }],
      };
    }
    case 'mirror': {
      const topB = niceMax(k(Math.max(...rows.map((r) => r.births))), 100) - 100;
      const topD = niceMax(k(summary.peakDeaths.deaths), 50);
      return {
        ...common,
        yDomain: [-topD, topB + 50],
        yFormat: (v) => tick0(Math.abs(v), lang),
        yTicks: 6,
        yLabel: t(s.unitK),
        bars: [
          { key: 'births', values: rows.map((r) => k(r.births)), color: () => DEMO_COLOR.births },
          { key: 'deaths', values: rows.map((r) => -k(r.deaths)), color: () => DEMO_COLOR.deaths },
        ],
        rules: [{ value: 0, color: 'var(--surface)', width: 2 }],
        labels: [
          { year: 2003, value: topB - 10, lines: [t(s.up)], strong: true },
          { year: 2003, value: -topD + 12, lines: [t(s.down)], strong: true },
        ],
        notes: [...note(first.year, k(first.births), [fill(t(s.plain), { year: first.year, value: thousands(first.births, lang) })], 10, -14, 'start')],
        markers: [
          { key: 'births', index: lastI, value: k(last.births), color: DEMO_COLOR.births, label: thousands(last.births, lang), labelDy: -6 },
          { key: 'deaths', index: lastI, value: -k(last.deaths), color: DEMO_COLOR.deaths, label: thousands(last.deaths, lang), labelDy: 10 },
        ],
        hoverPoints: (i) => [
          { value: k(rows[i]!.births), color: DEMO_COLOR.births },
          { value: -k(rows[i]!.deaths), color: DEMO_COLOR.deaths },
        ],
      };
    }
    case 'index': {
      const maxI = Math.max(...rows.map((r) => Math.max(r.birthsIndex, r.deathsIndex)));
      const peak = summary.peakDeaths;
      const lowB = rows[at(2001)];
      return {
        ...common,
        yDomain: [0, Math.ceil(maxI / 10) * 10 + 10],
        yFormat: (v) => tick0(v, lang),
        yLabel: t(s.unitIndex),
        gaps: [
          { key: 'idx', a: rows.map((r) => r.birthsIndex), b: rows.map((r) => r.deathsIndex), fillAbove: 'var(--chart-hover)', fillBelow: 'var(--chart-hover)' },
        ],
        rules: [{ value: 100, label: t(s.level), labelAt: 'end', labelSide: 'above', color: 'var(--tx2)' }],
        lines: [
          { key: 'deaths', values: rows.map((r) => r.deathsIndex), color: DEMO_COLOR.deaths, width: 3 },
          { key: 'births', values: rows.map((r) => r.birthsIndex), color: DEMO_COLOR.births, width: 3 },
        ],
        notes: [
          ...note(peak.year, peak.deathsIndex, [fill(t(s.deathsPeakIdx), { year: peak.year, value: Math.round(peak.deathsIndex) })], 0, -18, 'middle'),
          ...(lowB ? note(2001, lowB.birthsIndex, lines(s.birthsLowIdx, lang, { year: 2001, change: percentChange(lowB.birthsIndex / 100 - 1, lang) }), 0, 36, 'middle') : []),
        ],
        markers: [
          { key: 'deaths', index: lastI, value: last.deathsIndex, color: DEMO_COLOR.deaths, label: percentChange(last.deathsIndex / 100 - 1, lang) },
          { key: 'births', index: lastI, value: last.birthsIndex, color: DEMO_COLOR.births, label: percentChange(last.birthsIndex / 100 - 1, lang) },
        ],
        hoverPoints: (i) => [
          { value: rows[i]!.deathsIndex, color: DEMO_COLOR.deaths },
          { value: rows[i]!.birthsIndex, color: DEMO_COLOR.births },
        ],
      };
    }
  }
}

// ── Accessible chart labels (role="img"): the view in one sentence, with its key numbers ──────────
const labelTpl: Readonly<Record<Show, Localized>> = {
  gap: {
    en: 'Line chart, {from}–{to}: births fell from {b0} to {b1}, deaths from {d0} to {d1}; the gap between them since {since} is natural decrease, {total} in total. The table view lists every year.',
    uk: 'Лінійний графік, {from}–{to}: народження впали з {b0} до {b1}, смерті — з {d0} до {d1}; розрив між ними з {since} року — природне скорочення, разом {total}. Таблиця містить усі роки.',
  },
  ratio: {
    en: 'Line chart: deaths per birth, {r0} in {from} and {r1} in {to}. The table view lists every year.',
    uk: 'Лінійний графік: смертей на одне народження — {r0} у {from} і {r1} у {to}. Таблиця містить усі роки.',
  },
  net: {
    en: 'Bar chart of natural change (births minus deaths): {n0} in {from}, the largest decrease {worst} in {worstYear}, {n1} in {to}. The table view lists every year.',
    uk: 'Стовпчикова діаграма природного приросту (народження мінус смерті): {n0} у {from}, найбільше скорочення {worst} у {worstYear}, {n1} у {to}. Таблиця містить усі роки.',
  },
  mirror: {
    en: 'Mirrored bars: births up, from {b0} in {from} to {b1} in {to}; deaths down, from {d0} to {d1}. The table view lists every year.',
    uk: 'Дзеркальні стовпці: народження вгору — з {b0} у {from} до {b1} у {to}; смерті вниз — з {d0} до {d1}. Таблиця містить усі роки.',
  },
  index: {
    en: 'Line chart, index {from} = 100: in {to} births are at {bi}, deaths at {di}. The table view lists every year.',
    uk: 'Лінійний графік, індекс {from} = 100: у {to} народження — {bi}, смерті — {di}. Таблиця містить усі роки.',
  },
};

export function chartLabel(show: Show, summary: Summary, lang: Lang, t: T): string {
  const { first, last, worst } = summary;
  return fill(t(labelTpl[show]), {
    from: first.year,
    to: last.year,
    since: summary.decreaseSince,
    b0: thousandsUnit(first.births, lang),
    b1: thousandsUnit(last.births, lang),
    d0: thousandsUnit(first.deaths, lang),
    d1: thousandsUnit(last.deaths, lang),
    total: millionsUnit(summary.totalDecrease, lang),
    r0: ratio(first.ratio, lang),
    r1: ratio(last.ratio, lang),
    n0: thousandsUnit(first.net, lang, true),
    n1: thousandsUnit(last.net, lang, true),
    worst: thousandsUnit(worst.net, lang, true),
    worstYear: worst.year,
    bi: Math.round(last.birthsIndex),
    di: Math.round(last.deathsIndex),
  });
}
