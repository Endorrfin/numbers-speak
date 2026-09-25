// previewKit.ts — CHANGED (S3-th): small pure helpers for src/viz/<id>/preview.ts. Imported only by
// preview.ts files and scripts (build time), never by the app shell. Rows are chosen by rank here, so a
// preview never names a country: the leader or the extremes of the data decide what the card shows.
import type { Region } from '../lib/regions';
import type { BarRow, LabelArg, PreviewFormat, PreviewNum, PreviewTone, RowsMarks } from './preview';
import { MAX_FLAGS } from './preview';
import type { Localized } from './types';

export const num = (value: number, format: PreviewFormat): PreviewNum => ({ value, format });
export const argNum = (value: number, format: PreviewFormat): LabelArg => ({ kind: 'num', value, format });
export const argCountry = (code: string): LabelArg => ({ kind: 'country', value: code });
export const argMonth = (year: number, month: number): LabelArg => ({ kind: 'month', value: ym(year, month) });
export const argText = (value: Localized): LabelArg => ({ kind: 'text', value });

export const ym = (year: number, month: number): string => `${year}-${String(month).padStart(2, '0')}`;
export const regionTone = (region: Region): PreviewTone => `region-${region}`;

/** What a ranked item contributes to a bar row. */
export type RowInput = { code?: string; name?: Localized; value: number; tone: PreviewTone };

function toRow(item: RowInput, flag: boolean): BarRow {
  const row: BarRow = { value: item.value, tone: item.tone };
  if (item.code) row.code = item.code;
  if (item.name) row.name = item.name;
  if (flag && item.code) row.flag = true;
  return row;
}

/** The first `n` items (already in rank order); flags on the first `flags` countries. */
export function topRows(ranked: readonly RowInput[], n: number, format: PreviewFormat, flags = MAX_FLAGS): RowsMarks {
  const rows = ranked.slice(0, n).map((r, i) => toRow(r, i < flags));
  return { kind: 'rows', rows, format, domain: [0, Math.max(...rows.map((r) => r.value))] };
}

/**
 * The `n` first and `n` last items (rank order) with a “⋯ N more” gap between them; flags on the two
 * extremes only (first and last). `domain` defaults to 0 … the largest shown value.
 */
export function extremeRows(
  ranked: readonly RowInput[],
  n: number,
  format: PreviewFormat,
  domain?: readonly [number, number],
): RowsMarks {
  if (ranked.length < 2 * n + 1) throw new Error(`extremeRows: ${ranked.length} items, need more than ${2 * n}`);
  const head = ranked.slice(0, n).map((r, i) => toRow(r, i === 0));
  const tail = ranked.slice(-n).map((r, i) => toRow(r, i === n - 1));
  const rows = [...head, ...tail];
  return {
    kind: 'rows',
    rows,
    format,
    domain: domain ?? [0, Math.max(...rows.map((r) => r.value))],
    gap: { after: n, count: ranked.length - 2 * n },
  };
}

/** Whole units per part, summing exactly to `total` (largest remainder, ties in input order); all 0 without data. */
export function wholeParts(shares: readonly number[], total: number): number[] {
  const sum = shares.reduce((s, v) => s + v, 0);
  if (!(sum > 0)) return shares.map(() => 0);
  const exact = shares.map((v) => (v / sum) * total);
  const out = exact.map(Math.floor);
  let left = total - out.reduce((s, v) => s + v, 0);
  const order = exact.map((v, i) => ({ i, rem: v - Math.floor(v) })).sort((a, b) => b.rem - a.rem || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    out[i]! += 1;
    left--;
  }
  return out;
}

/** Index of the largest value (first on ties). */
export function argMax(values: readonly number[]): number {
  let best = 0;
  values.forEach((v, i) => {
    if (v > values[best]!) best = i;
  });
  return best;
}
