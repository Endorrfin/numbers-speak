// state.ts — the page's URL state (pure; unit-tested). CHANGED (S3-aa): new.
//   ?show=types&year=2025&step=week&mode=share&rank=drones&who=killed&view=table
// Unknown or malformed values fall back to defaults and defaults are omitted, so every view has one canonical link.
import type { VizParams } from '../../catalog/types';
import { RANKS, STEPS, WHO } from './data';
import type { Period, Rank, Step, Who } from './data';

/** The six angles, in display order; the first is the default. */
export const SHOWS = ['timeline', 'types', 'interception', 'largest', 'civilians', 'calendar'] as const; // CHANGED (S3-aa3): + calendar
export type Show = (typeof SHOWS)[number];
export const MODES = ['count', 'share'] as const;
export type Mode = (typeof MODES)[number];
export type View = 'chart' | 'table';

export type AirState = {
  show: Show;
  period: Period;
  step: Step;
  mode: Mode;
  rank: Rank;
  who: Who;
  view: View;
};

const pick = <T extends string>(v: string | undefined, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(v ?? '') ? (v as T) : fallback;

/** `years` = the calendar years the data covers (a year outside them falls back to 'all'). */
export function parseAirState(params: VizParams, years: readonly number[]): AirState {
  const y = /^\d{4}$/.test(params.year ?? '') ? Number(params.year) : NaN;
  return {
    show: pick(params.show, SHOWS, 'timeline'),
    period: years.includes(y) ? y : 'all',
    step: pick(params.step, STEPS, 'month'),
    mode: pick(params.mode, MODES, 'count'),
    rank: pick(params.rank, RANKS, 'total'),
    who: pick(params.who, WHO, 'all'),
    view: params.view === 'table' ? 'table' : 'chart',
  };
}

export function toAirParams(s: AirState): VizParams {
  const out: Record<string, string> = {};
  if (s.show !== 'timeline') out.show = s.show;
  if (s.period !== 'all') out.year = String(s.period);
  if (s.step !== 'month') out.step = s.step;
  if (s.mode !== 'count') out.mode = s.mode;
  if (s.rank !== 'total') out.rank = s.rank;
  if (s.who !== 'all') out.who = s.who;
  if (s.view !== 'chart') out.view = s.view;
  return out;
}
