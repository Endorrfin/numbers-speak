// dayState.ts — CHANGED (S3-ai4): angle G "Then and now" — what the files showed on one day, next to the latest figure of
// each file. Pure and unit-tested (scripts/test-ai-models.ts checks every figure against the files a second way). Nothing
// is interpolated: each "then" is the last row dated on or before the day. Imported only by day.tsx, so it stays in that
// lazy chunk (not insights.ts — that one is in the main chunk; the events come from data.ts).
import { FIRST_YEAR, MANUAL_EVENTS, arenaFirsts, arenaRuns, claimSeries, daysBetween } from './data';
import type { ArenaDataset, ArenaRun, Claim, ClaimSeries, ClaimsDataset, ComputeRow, Hero, ReleasesDataset } from './data';

/** The first day the angle offers (the page's period starts in 2017). */
export const DAY_FIRST = `${FIRST_YEAR}-01-01`;

/** The last day: the later of the LMArena and Epoch files' ends. */
export const dayLast = (arena: Pick<ArenaDataset, 'end'>, releases: Pick<ReleasesDataset, 'through'>): string =>
  arena.end > releases.through ? arena.end : releases.through;

/** The same day `years` years earlier (29 Feb → 28 Feb). */
export function yearsBefore(iso: string, years: number): string {
  const y = Number(iso.slice(0, 4)) - years;
  const m = Number(iso.slice(5, 7)) - 1;
  const lastOfMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(Number(iso.slice(8, 10)), lastOfMonth))).toISOString().slice(0, 10);
}

/** The default day (no `?on=`): a year before the end of the data — every row has a figure then. */
export const defaultDay = (last: string): string => yearsBefore(last, 1);

/** The day the page shows: the URL's day when it falls inside the data, else the default. */
export const resolveDay = (on: string | null, last: string): string => (on && on >= DAY_FIRST && on <= last ? on : defaultDay(last));

/** Shifts a day by whole days (the range slider counts days from DAY_FIRST). */
export const addDays = (iso: string, n: number): string => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export type DayPreset =
  | { kind: 'years'; date: string; years: number }
  | { kind: 'manual'; date: string; key: string }
  | { kind: 'first'; date: string; org: string; model: string };

/** Jumps: one and two years before the end, then the timeline's events (angle A) — sorted by date, one per day. */
export function dayPresets(arena: ArenaDataset, last: string): DayPreset[] {
  const list: DayPreset[] = [
    { kind: 'years', date: yearsBefore(last, 1), years: 1 },
    { kind: 'years', date: yearsBefore(last, 2), years: 2 },
    ...MANUAL_EVENTS.map((e): DayPreset => ({ kind: 'manual', date: e.date, key: e.key })),
    ...arenaFirsts(arena).map((f): DayPreset => ({ kind: 'first', date: f.date, org: f.org, model: f.model })),
  ];
  const seen = new Set<string>();
  return list
    .filter((p) => p.date >= DAY_FIRST && p.date <= last)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .filter((p) => (seen.has(p.date) ? false : (seen.add(p.date), true)));
}

/** No. 1 on a day: the run of the last snapshot on or before it, and how many days in a row by then (the day counts). */
export type DayLeader = { run: ArenaRun; inRow: number };

export function leaderOn(runs: readonly ArenaRun[], day: string): DayLeader | null {
  const run = runs.filter((r) => r.from <= day).at(-1);
  return run ? { run, inRow: daysBetween(run.from, day) + 1 } : null;
}

/** The leader at the end of the data and its days at No. 1 so far (as angle C counts them). */
export const leaderNow = (arena: ArenaDataset): DayLeader => {
  const run = arenaRuns(arena).at(-1)!;
  return { run, inRow: daysBetween(run.from, arena.end) };
};

export type DayModels = { then: number; now: number; byCompany: Array<{ hero: Hero; then: number; now: number }> };

/** Models on the lanes released on or before the day, per company (in the lanes' order) and in all. */
export function modelsOn(ds: ReleasesDataset, day: string): DayModels {
  const byCompany = ds.heroes.map((hero) => {
    const own = ds.rows.filter((r) => r.hero === hero.id);
    return { hero, then: own.filter((r) => r.date <= day).length, now: own.length };
  });
  return { then: byCompany.reduce((s, c) => s + c.then, 0), now: ds.rows.length, byCompany };
}

/** The record for the largest training run on a day (null before the first figure). */
export const recordOn = (records: readonly ComputeRow[], day: string): ComputeRow | null => records.filter((r) => r.date <= day).at(-1) ?? null;

export type DayClaims = { series: ClaimSeries; then: Claim | null; now: Claim };

/** Per product AND measure (never joined across measures): the last figure on or before the day, and the latest. */
export function claimsOn(ds: ClaimsDataset, day: string): DayClaims[] {
  return claimSeries(ds).map((series) => {
    const sorted = [...series.claims].sort((a, b) => (a.asOf < b.asOf ? -1 : a.asOf > b.asOf ? 1 : 0));
    return { series, then: sorted.filter((c) => c.asOf <= day).at(-1) ?? null, now: sorted.at(-1)! };
  });
}

/** The first day any company published a user count (the "no count yet" note). */
export const firstClaimDay = (ds: ClaimsDataset): string => ds.claims.reduce((m, c) => (c.asOf < m ? c.asOf : m), ds.claims[0]!.asOf);

/** "Did you know" counts: what happened after the day. */
export type DayAfter = { models: number; records: number; changes: number; beforeArena: boolean };

export function afterDay(models: DayModels, records: readonly ComputeRow[], runs: readonly ArenaRun[], day: string): DayAfter {
  let changes = 0;
  for (let i = 1; i < runs.length; i++) if (runs[i]!.from > day && runs[i]!.org !== runs[i - 1]!.org) changes++;
  return {
    models: models.now - models.then,
    records: records.filter((r) => r.date > day).length,
    changes,
    beforeArena: runs.length > 0 && day < runs[0]!.from,
  };
}
