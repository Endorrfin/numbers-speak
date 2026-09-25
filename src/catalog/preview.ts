// preview.ts — CHANGED (S3-th): the card-preview contract. Each published entry has
// src/viz/<id>/preview.ts: a pure `preview(dataset) → CardPreview` built from the entry's own parser,
// run at build time by scripts/gen-previews.ts into src/catalog/previews.generated.json (committed).
// The JSON holds numbers, never formatted text: formatting happens at render time
// (components/catalog/previewFormat.ts), so the file does not depend on the build machine's ICU.
// Rules: every number comes from the dataset; rows are chosen by rank (top N / extremes), never by a
// country code typed in preview.ts (scripts/test-previews.ts enforces it); ≤ 3 flags per card.
import { DatasetError, array, finite, isRecord, oneOf, record, string } from '../lib/dataset';
import type { Localized } from './types';

export const PREVIEW_FORMATS = [
  'int',
  'signed-int',
  'pct0',
  'pct1',
  'score',
  'dec2',
  'times',
  'count-compact',
  'usd-compact',
  'usd-m-compact',
  'uah-bn',
  'area-compact',
  'rate1',
  'years1',
  'year',
] as const;
export type PreviewFormat = (typeof PREVIEW_FORMATS)[number];

/** Chart colour tokens a preview may use — rendered as `var(--c-<tone>)`, defined in theme/tokens.css. */
export const PREVIEW_TONES = [
  'region-asia',
  'region-africa',
  'region-americas',
  'region-oceania',
  'region-europe',
  'series-primary',
  'birth',
  'death',
  'air-down',
  'air-through',
  'life-needs',
  'life-duties',
  'life-free',
  'life-other',
  'sector-tech',
  'sector-auto',
  'sector-finance',
  'sector-consumer',
  'sector-fashion',
  'sector-industry',
] as const;
export type PreviewTone = (typeof PREVIEW_TONES)[number];

export const MAX_FLAGS = 3;
export const MAX_ROWS = 6;

export type PreviewNum = { value: number; format: PreviewFormat };

export type LabelArg =
  | { kind: 'num'; value: number; format: PreviewFormat }
  | { kind: 'month'; value: string } // YYYY-MM
  | { kind: 'country'; value: string } // ISO 3166-1 alpha-2
  | { kind: 'text'; value: Localized };

export type KeyFigure = {
  /** One number, or a range drawn as “a – b”. */
  value: PreviewNum | readonly [PreviewNum, PreviewNum];
  /** `{name}` placeholders are filled from `args` at render time. */
  label: Localized;
  args?: Readonly<Record<string, LabelArg>>;
};

export type BarRow = { code?: string; name?: Localized; flag?: true; value: number; tone: PreviewTone };
export type RowsMarks = {
  kind: 'rows';
  rows: readonly BarRow[];
  format: PreviewFormat;
  /** Bars run from domain[0] (0, or an index's own scale minimum) to domain[1]. */
  domain: readonly [number, number];
  /** “⋯ N more” after row `after` (extremes: top rows, gap, bottom rows). */
  gap?: { after: number; count: number };
};
export type ButterflyRow = { code: string; flag?: true; left: number; right: number };
export type ButterflyMarks = {
  kind: 'butterfly';
  rows: readonly ButterflyRow[];
  max: number;
  tones: readonly [PreviewTone, PreviewTone];
  legend: readonly [Localized, Localized];
};
export type SeriesLine = { values: readonly (number | null)[]; tone: PreviewTone; area?: true };
export type SeriesMarks = {
  kind: 'series';
  lines: readonly SeriesLine[];
  max: number;
  /** Axis ends: 'YYYY' or 'YYYY-MM'. */
  from: string;
  to: string;
  peak?: { line: number; index: number };
  legend?: readonly Localized[];
};
export type ColumnsMarks = {
  kind: 'columns';
  /** One stack per column, bottom → top, one value per tone. */
  stacks: readonly (readonly number[])[];
  max: number;
  tones: readonly PreviewTone[];
  legend: readonly Localized[];
  from: string;
  to: string;
  /** Columns drawn lighter: the bucket is incomplete (the data ends inside it). */
  partial?: readonly number[];
};
export type GridMarks = {
  kind: 'grid';
  /** Cells per tone, in order; they fill the grid row by row. */
  counts: readonly number[];
  columns: number;
  tones: readonly PreviewTone[];
  legend: readonly Localized[];
};
export type PreviewMarks = RowsMarks | ButterflyMarks | SeriesMarks | ColumnsMarks | GridMarks;

export type CardPreview = { key: KeyFigure; marks: PreviewMarks };

/** What gen-previews needs from an entry: which data file to read and the entry's own parser. */
export type PreviewSource<T> = { file: string; parse: (json: unknown, where: string) => T };

// ── Validation (gen-previews, check:catalog, tests) ────────────────────────────────────────────────
const ISO2 = /^[A-Z]{2}$/;
const PERIOD = /^\d{4}(-(0[1-9]|1[0-2]))?$/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

function localized(v: unknown, where: string): Localized {
  const o = record(v, where);
  return { en: string(o.en, `${where}.en`), uk: string(o.uk, `${where}.uk`) };
}
const tone = (v: unknown, where: string): PreviewTone => oneOf(v, PREVIEW_TONES, where);
const format = (v: unknown, where: string): PreviewFormat => oneOf(v, PREVIEW_FORMATS, where);
const tones = (v: unknown, where: string): PreviewTone[] => array(v, where, 1).map((t, i) => tone(t, `${where}[${i}]`));
const legend = (v: unknown, where: string): Localized[] => array(v, where, 1).map((l, i) => localized(l, `${where}[${i}]`));

function previewNum(v: unknown, where: string): PreviewNum {
  const o = record(v, where);
  return { value: finite(o.value, `${where}.value`), format: format(o.format, `${where}.format`) };
}

function labelArg(v: unknown, where: string): LabelArg {
  const o = record(v, where);
  const kind = oneOf(o.kind, ['num', 'month', 'country', 'text'] as const, `${where}.kind`);
  if (kind === 'num') return { kind, value: finite(o.value, `${where}.value`), format: format(o.format, `${where}.format`) };
  if (kind === 'month') return { kind, value: string(o.value, `${where}.value`, MONTH) };
  if (kind === 'country') return { kind, value: string(o.value, `${where}.value`, ISO2) };
  return { kind, value: localized(o.value, `${where}.value`) };
}

function keyFigure(v: unknown, where: string): KeyFigure {
  const o = record(v, where);
  const value = Array.isArray(o.value)
    ? (() => {
        const a = array(o.value, `${where}.value`, 2);
        if (a.length !== 2) throw new DatasetError(`${where}.value: a range has exactly two numbers`);
        return [previewNum(a[0], `${where}.value[0]`), previewNum(a[1], `${where}.value[1]`)] as const;
      })()
    : previewNum(o.value, `${where}.value`);
  const label = localized(o.label, `${where}.label`);
  const out: KeyFigure = { value, label };
  if (o.args !== undefined) {
    const args: Record<string, LabelArg> = {};
    for (const [k, a] of Object.entries(record(o.args, `${where}.args`))) args[k] = labelArg(a, `${where}.args.${k}`);
    for (const text of [label.en, label.uk]) {
      for (const m of text.matchAll(/\{(\w+)\}/g)) {
        if (!(m[1]! in args)) throw new DatasetError(`${where}.label: {${m[1]}} has no arg`);
      }
    }
    out.args = args;
  }
  return out;
}

function checkFlags(codes: ReadonlyArray<{ flag?: unknown; code?: unknown }>, where: string): void {
  const n = codes.filter((r) => r.flag === true).length;
  if (n > MAX_FLAGS) throw new DatasetError(`${where}: ${n} flags, at most ${MAX_FLAGS}`);
  codes.forEach((r, i) => {
    if (r.flag !== undefined && (r.flag !== true || typeof r.code !== 'string' || !ISO2.test(r.code))) {
      throw new DatasetError(`${where}[${i}]: a flag needs an ISO2 code`);
    }
  });
}

function marks(v: unknown, where: string): PreviewMarks {
  const o = record(v, where);
  const kind = oneOf(o.kind, ['rows', 'butterfly', 'series', 'columns', 'grid'] as const, `${where}.kind`);
  if (kind === 'rows') {
    const raw = array(o.rows, `${where}.rows`, 1);
    if (raw.length > MAX_ROWS) throw new DatasetError(`${where}.rows: at most ${MAX_ROWS}`);
    const rows = raw.map((r, i): BarRow => {
      const w = `${where}.rows[${i}]`;
      const x = record(r, w);
      const row: BarRow = { value: finite(x.value, `${w}.value`), tone: tone(x.tone, `${w}.tone`) };
      if (x.code !== undefined) row.code = string(x.code, `${w}.code`, ISO2);
      if (x.name !== undefined) row.name = localized(x.name, `${w}.name`);
      if (!row.code && !row.name) throw new DatasetError(`${w}: a code or a name is required`);
      if (x.flag !== undefined) row.flag = true;
      return row;
    });
    checkFlags(raw.map((r) => (isRecord(r) ? r : {})), `${where}.rows`);
    const d = array(o.domain, `${where}.domain`, 2);
    const domain = [finite(d[0], `${where}.domain[0]`), finite(d[1], `${where}.domain[1]`)] as const;
    if (!(domain[1] > domain[0])) throw new DatasetError(`${where}.domain: max must exceed min`);
    const out: RowsMarks = { kind, rows, format: format(o.format, `${where}.format`), domain };
    if (o.gap !== undefined) {
      const g = record(o.gap, `${where}.gap`);
      out.gap = { after: finite(g.after, `${where}.gap.after`, 1, rows.length - 1), count: finite(g.count, `${where}.gap.count`, 1) };
    }
    return out;
  }
  if (kind === 'butterfly') {
    const raw = array(o.rows, `${where}.rows`, 1);
    if (raw.length > MAX_ROWS) throw new DatasetError(`${where}.rows: at most ${MAX_ROWS}`);
    const rows = raw.map((r, i): ButterflyRow => {
      const w = `${where}.rows[${i}]`;
      const x = record(r, w);
      const row: ButterflyRow = { code: string(x.code, `${w}.code`, ISO2), left: finite(x.left, `${w}.left`, 0), right: finite(x.right, `${w}.right`, 0) };
      if (x.flag !== undefined) row.flag = true;
      return row;
    });
    checkFlags(raw.map((r) => (isRecord(r) ? r : {})), `${where}.rows`);
    const t = tones(o.tones, `${where}.tones`);
    const l = legend(o.legend, `${where}.legend`);
    if (t.length !== 2 || l.length !== 2) throw new DatasetError(`${where}: two tones and two legend labels`);
    return { kind, rows, max: finite(o.max, `${where}.max`, Number.MIN_VALUE), tones: [t[0]!, t[1]!], legend: [l[0]!, l[1]!] };
  }
  if (kind === 'series') {
    const lines = array(o.lines, `${where}.lines`, 1).map((l, i) => {
      const w = `${where}.lines[${i}]`;
      const x = record(l, w);
      const values = array(x.values, `${w}.values`, 2).map((n, j) => (n === null ? null : finite(n, `${w}.values[${j}]`, 0)));
      const line: SeriesLine = { values, tone: tone(x.tone, `${w}.tone`) };
      if (x.area !== undefined) line.area = true;
      return line;
    });
    const out: SeriesMarks = {
      kind,
      lines,
      max: finite(o.max, `${where}.max`, Number.MIN_VALUE),
      from: string(o.from, `${where}.from`, PERIOD),
      to: string(o.to, `${where}.to`, PERIOD),
    };
    if (o.peak !== undefined) {
      const p = record(o.peak, `${where}.peak`);
      const line = finite(p.line, `${where}.peak.line`, 0, lines.length - 1);
      out.peak = { line, index: finite(p.index, `${where}.peak.index`, 0, lines[line]!.values.length - 1) };
    }
    if (o.legend !== undefined) out.legend = legend(o.legend, `${where}.legend`);
    return out;
  }
  if (kind === 'columns') {
    const t = tones(o.tones, `${where}.tones`);
    const stacks = array(o.stacks, `${where}.stacks`, 2).map((s, i) => {
      const a = array(s, `${where}.stacks[${i}]`, t.length);
      if (a.length !== t.length) throw new DatasetError(`${where}.stacks[${i}]: one value per tone`);
      return a.map((n, j) => finite(n, `${where}.stacks[${i}][${j}]`, 0));
    });
    const out: ColumnsMarks = {
      kind,
      stacks,
      max: finite(o.max, `${where}.max`, Number.MIN_VALUE),
      tones: t,
      legend: legend(o.legend, `${where}.legend`),
      from: string(o.from, `${where}.from`, PERIOD),
      to: string(o.to, `${where}.to`, PERIOD),
    };
    if (out.legend.length !== t.length) throw new DatasetError(`${where}.legend: one label per tone`);
    if (o.partial !== undefined) {
      out.partial = array(o.partial, `${where}.partial`).map((n, i) => finite(n, `${where}.partial[${i}]`, 0, stacks.length - 1));
    }
    return out;
  }
  const t = tones(o.tones, `${where}.tones`);
  const counts = array(o.counts, `${where}.counts`, 1).map((n, i) => finite(n, `${where}.counts[${i}]`, 0));
  const l = legend(o.legend, `${where}.legend`);
  if (counts.length !== t.length || l.length !== t.length) throw new DatasetError(`${where}: one count and label per tone`);
  if (counts.some((n) => !Number.isInteger(n))) throw new DatasetError(`${where}.counts: whole cells expected`);
  return { kind, counts, columns: finite(o.columns, `${where}.columns`, 1, 50), tones: t, legend: l };
}

/** Validates one preview (unknown JSON → typed). Throws DatasetError with a precise path. */
export function parseCardPreview(json: unknown, where = 'preview'): CardPreview {
  const o = record(json, where);
  return { key: keyFigure(o.key, `${where}.key`), marks: marks(o.marks, `${where}.marks`) };
}
