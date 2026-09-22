// data.ts — volunteers-growth dataset: registered volunteers per month, Jan 2022 onward. CHANGED (S3-cd): new.
import { array, fail, finite, record } from '../../lib/dataset';

export const DATA_FILE = 'volunteers-2022-2025.json';

export type MonthRow = { year: number; month: number; count: number };

export type VolunteersDataset = {
  unit: 'people';
  /** Consecutive calendar months, ascending, starting January of the first year. */
  rows: MonthRow[];
};

export function parseVolunteers(json: unknown, where = DATA_FILE): VolunteersDataset {
  const o = record(json, where);
  if (o.unit !== 'people') fail(`${where}.unit`, "'people' expected");
  const rows = array(o.rows, `${where}.rows`, 2).map((raw, i): MonthRow => {
    const at = `${where}.rows[${i}]`;
    const r = record(raw, at);
    const year = finite(r.year, `${at}.year`, 2020, 2100);
    const month = finite(r.month, `${at}.month`, 1, 12);
    const count = finite(r.count, `${at}.count`, 0, 5_000_000);
    for (const [k, v] of [['year', year], ['month', month], ['count', count]] as const) {
      if (!Number.isInteger(v)) fail(`${at}.${k}`, 'integer expected');
    }
    return { year, month, count };
  });
  rows.forEach((r, i) => {
    const prev = rows[i - 1];
    if (!prev) return;
    if (r.year * 12 + r.month !== prev.year * 12 + prev.month + 1) {
      fail(`${where}.rows[${i}]`, 'consecutive months expected');
    }
  });
  return { unit: 'people', rows };
}

/** Full calendar years present in the dataset — the only years fit for the seasonal overlay
 *  (renderYearChart draws a missing value as 0, not a gap, so a partial year cannot go on it). */
export function fullYears(rows: readonly MonthRow[]): number[] {
  const byYear = new Map<number, number>();
  for (const r of rows) byYear.set(r.year, (byYear.get(r.year) ?? 0) + 1);
  return [...byYear.entries()].filter(([, n]) => n === 12).map(([y]) => y).sort((a, b) => a - b);
}

export function validateDataFile(file: string, json: unknown): void {
  if (file !== DATA_FILE) fail(file, `no parser for this file (expected ${DATA_FILE})`);
  parseVolunteers(json, file);
}
