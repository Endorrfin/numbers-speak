// specs.ts — pure builders: formatters, the chart specs of the five angles and their accessible labels.
// No React and no DOM, so the numbers every view prints are unit-tested (scripts/test-air-attacks.ts).
// CHANGED (S3-aa): new.
import type { SrRow, SrSpec } from '../../charts/renderStackedRows';
import type { TsBand, TsPanel, TsSpec } from '../../charts/renderTimeSeries';
import type { YearTooltip } from '../../charts/renderYearChart';
import { calendarYearCells, quantizeLevels } from '../../charts/renderCalendarHeatmap'; // CHANGED (S3-aa3): new
import type { ChGrid, ChSpec } from '../../charts/renderCalendarHeatmap';
import { AIR_COLOR, HEAT_COLOR } from '../../charts/palette';
import type { Lang, Localized } from '../../catalog/types';
import { localeOf } from '../../i18n/lang';
import { fill } from '../../i18n/ui';
import { CLASSES, MISSILE_CLASSES, RATE_MIN, harmOf, rate, toMs } from './data';
import type { AttacksDataset, Bucket, CivilianYear, CiviliansDataset, Period, Rank, ReportTotals, Step, Totals, WeaponClass, Who } from './data';
import { CLASS_LABEL, CLASS_SHORT } from './labels';
import type { Mode } from './state';

type T = (v: Localized) => string;

// ── Formatters ──────────────────────────────────────────────────────────────────────────────────────
const nfCache = new Map<string, Intl.NumberFormat>();
function nf(lang: Lang, key: string, o: Intl.NumberFormatOptions): Intl.NumberFormat {
  const id = `${lang}:${key}`;
  let f = nfCache.get(id);
  if (!f) nfCache.set(id, (f = new Intl.NumberFormat(localeOf(lang), o)));
  return f;
}
const dfCache = new Map<string, Intl.DateTimeFormat>();
function df(lang: Lang, key: string, o: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const id = `${lang}:${key}`;
  let f = dfCache.get(id);
  if (!f) dfCache.set(id, (f = new Intl.DateTimeFormat(localeOf(lang), { ...o, timeZone: 'UTC' })));
  return f;
}
const minus = (s: string): string => s.replace(/^-/, '−');

/** 119405 → '119,405' / '119 405'. */
export const int = (v: number, lang: Lang): string => minus(nf(lang, 'int', { maximumFractionDigits: 0 }).format(v));
/** 0.875 → '88%' / '88 %'. */
export const pct = (r: number, lang: Lang, digits = 0): string =>
  nf(lang, `pct${digits}`, { style: 'percent', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(r);
/** 9.08 → '9.1' / '9,1'. */
export const dec1 = (v: number, lang: Lang): string => nf(lang, 'd1', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v);
/** Axis ticks: 8000 → '8k' / '8 тис.' */
export function compact(v: number, lang: Lang): string {
  if (Math.abs(v) < 1000) return int(v, lang);
  const n = nf(lang, 'k', { maximumFractionDigits: 1 }).format(v / 1000);
  return lang === 'uk' ? `${n} тис.` : `${n}k`;
}
/** '2025-09-07' → '7 Sep 2025' / '7 вер. 2025' */
export const dateLabel = (d: string, lang: Lang): string =>
  df(lang, 'd', { day: 'numeric', month: 'short', year: 'numeric' }).format(toMs(d)).replace(/\s?р\.$/, '');
/** '2025-07-01' → 'July 2025' / 'липень 2025' */
export const monthLabel = (d: string, lang: Lang): string =>
  df(lang, 'm', { month: 'long', year: 'numeric' }).format(toMs(d)).replace(/\s?р\.$/, '');
/** '2025-07-01' → 'Jul 2025' / 'лип. 2025' */
export const monthShort = (d: string, lang: Lang): string =>
  df(lang, 'ms', { month: 'short', year: 'numeric' }).format(toMs(d)).replace(/\s?р\.$/, '');
const monthOnly = (ms: number, lang: Lang): string => df(lang, 'mo', { month: 'short' }).format(ms);
/** '2025-09-06 17:00' → '17:00'; a date without time → ''. */
const timeOf = (stamp: string): string => stamp.slice(11, 16);

// ── Strings used inside charts ──────────────────────────────────────────────────────────────────────
export const s = {
  down: { en: 'Shot down or suppressed', uk: 'Збито або подавлено' },
  lost: { en: 'Locationally lost (reported separately)', uk: 'Локаційно втрачено (окремим числом)' },
  lostShort: { en: 'Locationally lost', uk: 'Локаційно втрачено' },
  through: { en: 'Not intercepted', uk: 'Не перехоплено' },
  launched: { en: 'Launched', uk: 'Запущено' },
  missiles: { en: 'Missiles', uk: 'Ракети' },
  drones: { en: 'Drones', uk: 'Дрони' },
  total: { en: 'Total', uk: 'Разом' },
  partial: { en: 'partial', uk: 'неповний' },
  hiddenBand: { en: '* some launches not reported', uk: '* частину пусків не повідомлено' },
  missilesPer: { en: 'Missiles launched per {step}', uk: 'Ракети, запущено за {step}' },
  dronesPer: { en: 'Drones launched per {step}', uk: 'Дрони, запущено за {step}' },
  classesPer: { en: 'Missiles launched per {step}, by class', uk: 'Ракети, запущено за {step}, за класами' },
  classesShare: { en: 'Share of missiles launched, by class', uk: 'Частка запущених ракет за класами' },
  rateTitle: { en: 'Shot down or suppressed, % of launched, per month', uk: 'Збито або подавлено, % від запущених, за місяць' },
  peak: { en: 'Peak: {n}', uk: 'Пік: {n}' },
  weekOf: { en: 'Week of {date}', uk: 'Тиждень від {date}' },
  tooFew: { en: 'fewer than {n}', uk: 'менше {n}' },
  harmTitle: { en: 'Civilians killed and injured per year', uk: 'Цивільні: загиблі й поранені за рік' },
  harmKilled: { en: 'Civilians killed per year', uk: 'Цивільні загиблі за рік' },
  harmInjured: { en: 'Civilians injured per year', uk: 'Цивільні поранені за рік' },
  longRange: { en: 'Long-range missiles & drones', uk: 'Далекобійні ракети й дрони' },
  shortDrones: { en: 'Short-range drones', uk: 'Дрони малої дальності' },
  otherHarm: { en: 'Other weapons', uk: 'Інша зброя' },
  notBroken: { en: 'Other weapons or not broken down', uk: 'Інша зброя або без розбивки' },
  allWeapons: { en: 'All weapons (no breakdown published)', uk: 'Уся зброя (розбивку не опубліковано)' },
  perHundred: { en: 'Long-range casualties per 100 weapons launched', uk: 'Жертв далекобійних ударів на 100 запущених' },
  months: { en: 'Jan–{m}', uk: 'січ.–{m}' },
  killed: { en: 'Killed', uk: 'Загиблі' },
  injured: { en: 'Injured', uk: 'Поранені' },
  killedInjured: { en: 'Killed and injured', uk: 'Загиблі й поранені' },
  fewer: { en: 'Fewer', uk: 'Менше' }, // CHANGED (S3-aa3): calendar scale legend
  more: { en: 'More', uk: 'Більше' },
} as const;

export const STEP_UNIT: Readonly<Record<Step, Localized>> = {
  month: { en: 'month', uk: 'місяць' },
  week: { en: 'week', uk: 'тиждень' },
  day: { en: 'day', uk: 'добу' },
};

export function bucketLabel(b: Bucket, step: Step, lang: Lang, t: T): string {
  const base =
    step === 'month' ? monthLabel(b.start, lang) : step === 'week' ? fill(t(s.weekOf), { date: dateLabel(b.start, lang) }) : dateLabel(b.start, lang);
  return b.partial ? `${base} · ${t(s.partial)}` : base;
}

// ── Shared axis ─────────────────────────────────────────────────────────────────────────────────────
const spansOf = (buckets: readonly Bucket[]) => buckets.map((b) => ({ start: toMs(b.start), end: toMs(b.end) }));

function timeTicks(buckets: readonly Bucket[], period: Period, lang: Lang): Pick<TsSpec, 'xTicks' | 'xTicksNarrow' | 'xFormat'> {
  if (buckets.length === 0) return { xTicks: [], xFormat: () => '' };
  const from = toMs(buckets[0]!.start);
  const to = toMs(buckets[buckets.length - 1]!.end);
  if (period === 'all') {
    const ticks: number[] = [];
    for (let y = new Date(from).getUTCFullYear() + 1; Date.UTC(y, 0, 1) < to; y++) ticks.push(Date.UTC(y, 0, 1));
    return { xTicks: ticks, xFormat: (ms) => String(new Date(ms).getUTCFullYear()) };
  }
  const months: number[] = [];
  for (let m = 0; m < 12; m++) {
    const ms = Date.UTC(period, m, 1);
    if (ms >= from && ms < to) months.push(ms);
  }
  return {
    xTicks: months,
    xTicksNarrow: months.filter((ms) => new Date(ms).getUTCMonth() % 3 === 0),
    xFormat: (ms) => monthOnly(ms, lang),
  };
}

// ── A · Timeline: launched → shot down / lost / not intercepted, missiles and drones ──────────────────
const through = (t: Totals): number => Math.max(0, t.launched - t.destroyed - t.lost);

function statusPanel(key: 'missiles' | 'drones', buckets: readonly Bucket[], step: Step, lang: Lang, t: T): TsPanel {
  const get = (b: Bucket): Totals => b[key];
  let peak = -1;
  buckets.forEach((b, i) => {
    if (peak < 0 || get(b).launched > get(buckets[peak]!).launched) peak = i;
  });
  const pb = buckets[peak];
  const notes =
    pb && get(pb).launched > 0
      ? [{ index: peak, value: get(pb).launched, key: true, lines: [fill(t(s.peak), { n: int(get(pb).launched, lang) }), step === 'month' ? monthShort(pb.start, lang) : dateLabel(pb.start, lang)] }]
      : [];
  return {
    key,
    title: fill(t(key === 'missiles' ? s.missilesPer : s.dronesPer), { step: t(STEP_UNIT[step]) }),
    yFormat: (v) => compact(v, lang),
    stacks: [
      { key: 'down', color: AIR_COLOR.down, values: buckets.map((b) => get(b).destroyed) },
      { key: 'lost', color: AIR_COLOR.down, texture: 'hatch', values: buckets.map((b) => get(b).lost) },
      { key: 'through', color: AIR_COLOR.through, values: buckets.map((b) => through(get(b))) },
    ],
    notes,
  };
}

function hiddenBand(ds: AttacksDataset, buckets: readonly Bucket[], t: T): TsBand[] {
  const last = buckets[buckets.length - 1];
  const first = buckets[0];
  if (!first || !last || ds.hiddenFrom >= last.end || ds.hiddenFrom < first.start) return [];
  return [{ start: toMs(ds.hiddenFrom), end: toMs(last.end), label: t(s.hiddenBand), shortLabel: '*', panels: ['missiles'] }];
}

function statusLines(label: string, x: Totals, lang: Lang, t: T): YearTooltip['lines'] {
  const lines: { label: string; value: string; color?: string }[] = [
    { label: `${label} · ${t(s.launched).toLowerCase()}`, value: int(x.launched, lang) },
    { label: t(s.down), value: int(x.destroyed, lang), color: AIR_COLOR.down },
  ];
  if (x.lost > 0) lines.push({ label: t(s.lostShort), value: int(x.lost, lang) });
  lines.push({ label: t(s.through), value: int(through(x), lang), color: AIR_COLOR.through });
  return lines;
}

export function timelineSpec(ds: AttacksDataset, buckets: readonly Bucket[], step: Step, period: Period, lang: Lang, t: T): TsSpec {
  return {
    spans: spansOf(buckets),
    partial: buckets.map((b) => b.partial),
    panels: [statusPanel('missiles', buckets, step, lang, t), statusPanel('drones', buckets, step, lang, t)],
    bands: hiddenBand(ds, buckets, t),
    ...timeTicks(buckets, period, lang),
    tooltip: (i) => {
      const b = buckets[i]!;
      return {
        title: bucketLabel(b, step, lang, t),
        lines: [...statusLines(t(s.missiles), b.missiles, lang, t), ...statusLines(t(s.drones), b.drones, lang, t)],
      };
    },
  };
}

// ── B · Types: missiles by class ────────────────────────────────────────────────────────────────────
export function typesSpec(ds: AttacksDataset, buckets: readonly Bucket[], step: Step, period: Period, mode: Mode, lang: Lang, t: T): TsSpec {
  const share = mode === 'share';
  const values = (c: WeaponClass): number[] =>
    buckets.map((b) => {
      const v = b.byClass[c].launched;
      return share ? (b.missiles.launched > 0 ? v / b.missiles.launched : 0) : v;
    });
  return {
    spans: spansOf(buckets),
    partial: buckets.map((b) => b.partial),
    panels: [
      {
        key: 'missiles',
        title: share ? t(s.classesShare) : fill(t(s.classesPer), { step: t(STEP_UNIT[step]) }),
        yFormat: (v) => (share ? pct(v, lang) : compact(v, lang)),
        yMax: share ? 1 : undefined,
        stacks: MISSILE_CLASSES.map((c) => ({ key: c, color: AIR_COLOR[c], values: values(c) })),
      },
    ],
    bands: hiddenBand(ds, buckets, t),
    ...timeTicks(buckets, period, lang),
    tooltip: (i) => {
      const b = buckets[i]!;
      const total = b.missiles.launched;
      return {
        title: bucketLabel(b, step, lang, t),
        lines: [
          ...MISSILE_CLASSES.filter((c) => b.byClass[c].launched > 0)
            .reverse()
            .map((c) => ({
              label: t(CLASS_SHORT[c]),
              value: `${int(b.byClass[c].launched, lang)} · ${pct(b.byClass[c].launched / total, lang)}`,
              color: AIR_COLOR[c],
            })),
          { label: t(s.total), value: int(total, lang) },
        ],
      };
    },
  };
}

// ── C · Interception: share stopped per month, by class ─────────────────────────────────────────────
export const RATE_CLASSES = ['cruise', 'ballistic', 'antiship', 'drones'] as const satisfies readonly WeaponClass[];

export function interceptionSpec(buckets: readonly Bucket[], period: Period, lang: Lang, t: T): TsSpec {
  return {
    spans: spansOf(buckets),
    partial: buckets.map((b) => b.partial),
    panels: [
      {
        key: 'rate',
        title: t(s.rateTitle),
        yFormat: (v) => pct(v, lang),
        yMax: 1,
        lines: RATE_CLASSES.map((c) => ({ key: c, color: AIR_COLOR[c], values: buckets.map((b) => rate(b.byClass[c], RATE_MIN)) })),
      },
    ],
    ...timeTicks(buckets, period, lang),
    tooltip: (i) => {
      const b = buckets[i]!;
      return {
        title: bucketLabel(b, 'month', lang, t),
        lines: RATE_CLASSES.map((c) => {
          const r = rate(b.byClass[c], RATE_MIN);
          const n = b.byClass[c].ratedLaunched;
          return {
            label: t(CLASS_SHORT[c]),
            value: r === null ? (n === 0 ? '—' : fill(t(s.tooFew), { n: RATE_MIN })) : `${pct(r, lang)} · ${int(n, lang)}`,
            color: AIR_COLOR[c],
          };
        }),
      };
    },
  };
}

// ── D · Largest reports ─────────────────────────────────────────────────────────────────────────────
export function windowLabel(r: ReportTotals['report']): string {
  const a = timeOf(r.start);
  const b = timeOf(r.end);
  return a && b ? `${a}–${b}` : '';
}

const rankClasses = (rank: Rank): readonly WeaponClass[] =>
  rank === 'drones' ? ['drones'] : rank === 'missiles' ? MISSILE_CLASSES : CLASSES;

export function largestSpec(list: readonly ReportTotals[], rank: Rank, lang: Lang, t: T): SrSpec {
  return {
    rows: list.map((r): SrRow => {
      const win = windowLabel(r.report);
      return {
        key: `${r.report.date} ${r.report.start}`,
        label: dateLabel(r.report.date, lang),
        sublabel: win || undefined,
        segments: rankClasses(rank).map((c) => ({ key: c, value: r.byClass[c], color: AIR_COLOR[c] })),
        valueLabel: int(r[rank], lang),
        tooltip: {
          title: `${dateLabel(r.report.date, lang)}${win ? ` · ${win}` : ''}`,
          lines: [
            ...CLASSES.filter((c) => r.byClass[c] > 0).map((c) => ({ label: t(CLASS_SHORT[c]), value: int(r.byClass[c], lang), color: AIR_COLOR[c] })),
            { label: t(s.total), value: int(r.total, lang) },
            { label: t(s.down), value: `${int(r.destroyed, lang)} · ${pct(r.total > 0 ? r.destroyed / r.total : 0, lang)}` },
          ],
        },
      };
    }),
  };
}

// ── E · Civilians (HRMMU) ───────────────────────────────────────────────────────────────────────────
export type HarmParts = { longRange?: number; shortDrones?: number; rest: number; total: number; restKind: 'other' | 'notBroken' | 'all' };

export function harmParts(c: CivilianYear, who: Who): HarmParts {
  const total = harmOf(c.total, who) ?? 0;
  const longRange = harmOf(c.longRange, who);
  const shortDrones = harmOf(c.shortDrones, who);
  const rest = total - (longRange ?? 0) - (shortDrones ?? 0);
  const restKind = longRange !== undefined && shortDrones !== undefined ? 'other' : longRange === undefined && shortDrones === undefined ? 'all' : 'notBroken';
  return { longRange, shortDrones, rest, total, restKind };
}

export function civilianSpan(c: CivilianYear): { start: number; end: number } {
  return { start: Date.UTC(c.year, c.fromMonth - 1, 1), end: Date.UTC(c.year, c.toMonth, 1) };
}

export function monthsLabel(c: CivilianYear, lang: Lang, t: T): string {
  if (c.fromMonth === 1 && c.toMonth === 12) return String(c.year);
  return `${c.year} (${fill(t(s.months), { m: monthOnly(Date.UTC(c.year, c.toMonth - 1, 1), lang) })})`;
}

export function civiliansSpec(civ: CiviliansDataset, who: Who, lang: Lang, t: T): TsSpec {
  const rows = civ.years;
  const parts = rows.map((c) => harmParts(c, who));
  const spans = rows.map(civilianSpan);
  const restLabel = (p: HarmParts): string => t(p.restKind === 'other' ? s.otherHarm : p.restKind === 'all' ? s.allWeapons : s.notBroken);
  return {
    spans,
    partial: rows.map((c) => c.toMonth - c.fromMonth < 11),
    panels: [
      {
        key: 'harm',
        title: t(who === 'killed' ? s.harmKilled : who === 'injured' ? s.harmInjured : s.harmTitle),
        yFormat: (v) => compact(v, lang),
        stacks: [
          { key: 'longRange', color: AIR_COLOR.through, values: parts.map((p) => p.longRange ?? 0) },
          { key: 'shortDrones', color: AIR_COLOR.harmShort, values: parts.map((p) => p.shortDrones ?? 0) },
          { key: 'rest', color: AIR_COLOR.harmOther, values: parts.map((p) => p.rest) },
        ],
        notes: parts.flatMap((p, i) =>
          p.longRange !== undefined && p.total > 0 ? [{ index: i, value: p.total, key: true, lines: [pct(p.longRange / p.total, lang)] }] : [],
        ),
      },
    ],
    xTicks: spans.map((sp) => (sp.start + sp.end) / 2),
    xFormat: (ms) => {
      const i = spans.findIndex((sp) => ms >= sp.start && ms < sp.end);
      const c = rows[i];
      return c ? (c.toMonth - c.fromMonth < 11 ? `${c.year}*` : String(c.year)) : '';
    },
    tooltip: (i) => {
      const c = rows[i]!;
      const p = parts[i]!;
      const lines: { label: string; value: string; color?: string }[] = [{ label: t(s.total), value: int(p.total, lang) }];
      if (p.longRange !== undefined) lines.push({ label: t(s.longRange), value: `${int(p.longRange, lang)} · ${pct(p.longRange / p.total, lang)}`, color: AIR_COLOR.through });
      if (p.shortDrones !== undefined) lines.push({ label: t(s.shortDrones), value: `${int(p.shortDrones, lang)} · ${pct(p.shortDrones / p.total, lang)}`, color: AIR_COLOR.harmShort });
      lines.push({ label: restLabel(p), value: int(p.rest, lang), color: AIR_COLOR.harmOther });
      return { title: monthsLabel(c, lang, t), lines };
    },
  };
}

/** Long-range casualties (killed + injured) per 100 long-range weapons launched, or null. */
export function perHundred(c: CivilianYear, launched: number): number | null {
  if (!c.longRange || launched <= 0) return null;
  return ((c.longRange.killed + c.longRange.injured) / launched) * 100;
}

export const classLabel = (c: WeaponClass, t: T): string => t(CLASS_LABEL[c]);

// ── F · Calendar heatmap: one square per day, shaded by a quantile of the chosen metric ───────────────
export function calendarSpec(buckets: readonly Bucket[], rank: Rank, lang: Lang, t: T): ChSpec {
  const valueOf = (b: Bucket): number =>
    rank === 'missiles' ? b.missiles.launched : rank === 'drones' ? b.drones.launched : b.missiles.launched + b.drones.launched;
  const byDate = new Map(buckets.map((b) => [b.start, b]));
  const levelOf = quantizeLevels(buckets.map(valueOf), HEAT_COLOR.length - 1);
  const years = Array.from(new Set(buckets.map((b) => Number(b.start.slice(0, 4))))).sort((a, b) => a - b);
  const grids: ChGrid[] = years.map((year) => {
    const { cells, cols } = calendarYearCells(
      year,
      (date) => {
        const b = byDate.get(date);
        return b ? valueOf(b) : 0;
      },
      levelOf,
    );
    const monthCols = new Map<string, number>();
    for (const c of cells) {
      const key = c.date.slice(0, 7);
      if (!monthCols.has(key)) monthCols.set(key, c.col);
    }
    return {
      year,
      label: String(year),
      cols,
      cells,
      months: Array.from(monthCols.entries()).map(([key, col]) => ({ col, label: monthOnly(toMs(`${key}-01`), lang) })),
    };
  });
  return {
    grids,
    levelColors: [...HEAT_COLOR],
    scaleLabel: { less: t(s.fewer), more: t(s.more) },
    tooltip: (cell) => {
      const b = byDate.get(cell.date);
      return {
        title: dateLabel(cell.date, lang),
        lines: [
          { label: t(s.missiles), value: int(b?.missiles.launched ?? 0, lang) },
          { label: t(s.drones), value: int(b?.drones.launched ?? 0, lang) },
        ],
      };
    },
  };
}
