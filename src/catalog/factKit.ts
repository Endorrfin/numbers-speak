// factKit.ts — CHANGED (S3-cp): helpers for src/viz/<id>/facts.ts (run at build time by scripts/gen-facts.ts).
import type { FactRow } from './facts';

type Ranked = { code: string; rank: number | null; value: number | null };

/** The entry's ranked list → fact rows, in list order; rows without a rank or a value (table-only rows) drop out. */
export function rowsOf(list: readonly Ranked[]): FactRow[] {
  return list.filter((r) => r.rank !== null && r.value !== null).map((r) => [r.code, r.rank!, r.value!] as const);
}

/**
 * Competition ranks for a list already in order ("1, 2, 2, 4"): equal values share the first rank of the run.
 * For lists whose page numbers rows by position only (births-deaths-per-day sorted by deaths per birth).
 */
export function competitionRows(list: readonly { code: string; value: number }[]): FactRow[] {
  let rank = 0;
  return list.map((r, i) => {
    if (i === 0 || r.value !== list[i - 1]!.value) rank = i + 1;
    return [r.code, rank, r.value] as const;
  });
}

/** Codes → their own year, for rows whose figure is older than the ranking's year; undefined when there are none. */
export function yearsOf(entries: readonly (readonly [string, number])[]): Record<string, number> | undefined {
  return entries.length ? Object.fromEntries(entries) : undefined;
}

/** Codes marked "*" (recognized borders); undefined when there are none. */
export const markedOf = (codes: readonly string[]): string[] | undefined => (codes.length ? [...codes] : undefined);
