// insights.ts — CHANGED (S3-ai3): the numbers behind the headline sentence and "Did you know" facts of angles A · B · F
// and the events on the timeline (C · D · E keep theirs in views.ts, so they stay in their lazy chunks). Pure and unit-tested (scripts/test-ai-models.ts recomputes every figure from the files): each
// fact is a rule over the data, never a picked model or a typed number, so a data refresh updates the sentence. The
// words live next to the markup in each angle; the wording rule holds (counts, dates and ratios — no judgements).
import type { Localized } from '../../catalog/types';
import { arenaRuns, monthOf, partialYear, yearTotal } from './data';
import type { ArenaDataset, ComputeRow, OriginsDataset, Release } from './data';

// ── Events (angle A) ─────────────────────────────────────────────────────────────────────────────────

/** A dated moment with a first-party source (owner decision, S3-ai3: only with a link to the company's own page). */
export type ManualEvent = { date: string; key: string; title: Localized; url: string; quote: string; retrieved: string };

export const MANUAL_EVENTS: readonly ManualEvent[] = [
  {
    date: '2022-11-30',
    key: 'chatgpt-launch',
    title: { en: 'ChatGPT launched (OpenAI)', uk: 'Запуск ChatGPT (OpenAI)' },
    url: 'https://openai.com/index/chatgpt/',
    quote: 'We’ve trained a model called ChatGPT which interacts in a conversational way.',
    retrieved: '2026-10-15',
  },
];

/**
 * The first day each company's model was No. 1 on the board. The company at No. 1 in the first snapshot is left out:
 * that day is where the series starts (the first snapshot with GPT-4), not a day it took the lead.
 */
export function arenaFirsts(ds: ArenaDataset): Array<{ org: string; date: string; model: string }> {
  const start = ds.snapshots[0]!.date;
  const seen = new Set<string>();
  const out: Array<{ org: string; date: string; model: string }> = [];
  for (const r of arenaRuns(ds)) {
    if (seen.has(r.org)) continue;
    seen.add(r.org);
    if (r.from !== start) out.push({ org: r.org, date: r.from, model: r.model });
  }
  return out;
}

// ── A ────────────────────────────────────────────────────────────────────────────────────────────────

/** The month with the most models (earliest of equal months), or null for none. */
export function busiestMonth(rows: readonly Pick<Release, 'date'>[]): { month: string; n: number } | null {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(monthOf(r.date), (counts.get(monthOf(r.date)) ?? 0) + 1);
  let best: { month: string; n: number } | null = null;
  for (const [month, n] of [...counts].sort((a, b) => (a[0] < b[0] ? -1 : 1))) if (!best || n > best.n) best = { month, n };
  return best;
}

/** Models dated in the last `years` calendar years of the data (the last one may be partial). */
export function recentShare(rows: readonly Pick<Release, 'date'>[], through: string, years: number): { from: number; n: number; total: number } {
  const from = Number(through.slice(0, 4)) - years + 1;
  return { from, n: rows.filter((r) => Number(r.date.slice(0, 4)) >= from).length, total: rows.length };
}

// ── B ────────────────────────────────────────────────────────────────────────────────────────────────

const byFlop = (a: ComputeRow, b: ComputeRow): ComputeRow => (b.flop > a.flop ? b : a);
const SECONDS_A_YEAR = 365.25 * 86_400;

/** The largest training run of a year, or null. */
export const largestOfYear = (rows: readonly ComputeRow[], year: number): ComputeRow | null =>
  rows.filter((r) => Number(r.date.slice(0, 4)) === year).reduce<ComputeRow | null>((a, b) => (a ? byFlop(a, b) : b), null);

/**
 * The first model of the eight companies with a compute figure against the largest run: the ratio, and how long the
 * largest would take at the speed that did the first in one second.
 */
export function firstVsLargest(rows: readonly ComputeRow[]): { first: ComputeRow; top: ComputeRow; ratio: number; years: number } {
  const first = rows.filter((r) => r.hero !== null).reduce((a, b) => (b.date < a.date || (b.date === a.date && b.flop > a.flop) ? b : a));
  const top = rows.reduce(byFlop);
  const ratio = top.flop / first.flop;
  return { first, top, ratio, years: ratio / SECONDS_A_YEAR };
}

// ── F ────────────────────────────────────────────────────────────────────────────────────────────────

/** The complete year whose count grew most against the year before (ratio), or null. */
export function biggestJump(ds: OriginsDataset): { year: number; before: number; after: number; ratio: number } | null {
  const last = partialYear(ds) ? ds.years.length - 2 : ds.years.length - 1;
  let best: { year: number; before: number; after: number; ratio: number } | null = null;
  for (let i = 1; i <= last; i++) {
    const before = yearTotal(ds, i - 1);
    const after = yearTotal(ds, i);
    if (before > 0 && (!best || after / before > best.ratio)) best = { year: ds.years[i]!, before, after, ratio: after / before };
  }
  return best;
}

/** The first year in which more than half of the models recorded had open weights, or null. */
export function firstOpenMajority(ds: OriginsDataset): { year: number; share: number } | null {
  for (let i = 0; i < ds.years.length; i++) {
    const total = yearTotal(ds, i);
    if (total > 0 && ds.access.open[i]! / total > 0.5) return { year: ds.years[i]!, share: ds.access.open[i]! / total };
  }
  return null;
}
