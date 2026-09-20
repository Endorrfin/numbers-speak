// state.ts — the page's URL state (pure; unit-tested):
//   ?show=day&country=JP&sex=women&unit=hours&measure=unpaid&view=table
// Unknown values fall back to defaults and defaults are omitted, so every view has one canonical link.
import type { VizParams } from '../../catalog/types';
import { MEASURE_IDS, OECD, SEXES } from './data';
import type { MeasureId, Sex } from './data';

/** Six angles, in display order; the first is the default. */
export const SHOWS = ['weeks', 'day', 'ranking', 'groups', 'countries', 'gender'] as const;
export type Show = (typeof SHOWS)[number];

export const UNITS = ['years', 'days', 'hours', 'share'] as const;
export type Unit = (typeof UNITS)[number];

export type View = 'chart' | 'table';

export type LifeState = {
  show: Show;
  /** 'OECD' (the average) or an ISO alpha-2 code present in the dataset. */
  country: string;
  sex: Sex;
  unit: Unit;
  measure: MeasureId;
  view: View;
};

export const DEFAULTS: LifeState = {
  show: 'weeks',
  country: OECD,
  sex: 'total',
  unit: 'years',
  measure: 'free',
  view: 'chart',
};

const pick = <T extends string>(list: readonly T[], v: string | undefined, fallback: T): T =>
  (list as readonly string[]).includes(v ?? '') ? (v as T) : fallback;

/** `countries` = the ISO codes in the dataset; anything else (bad input, a dropped country) → the average. */
export function parseLifeState(params: VizParams, countries: readonly string[]): LifeState {
  const code = (params.country ?? '').toUpperCase();
  return {
    show: pick(SHOWS, params.show, DEFAULTS.show),
    country: countries.includes(code) ? code : OECD,
    sex: pick(SEXES, params.sex, DEFAULTS.sex),
    unit: pick(UNITS, params.unit, DEFAULTS.unit),
    measure: pick(MEASURE_IDS, params.measure, DEFAULTS.measure),
    view: params.view === 'table' ? 'table' : 'chart',
  };
}

/** Settings an angle does not use are dropped from the link (the unit belongs to the ranking only, etc.). */
export function toLifeParams(state: LifeState): VizParams {
  const out: Record<string, string> = {};
  if (state.show !== DEFAULTS.show) out.show = state.show;
  if (state.country !== DEFAULTS.country && usesCountry(state.show)) out.country = state.country;
  if (state.sex !== DEFAULTS.sex && usesSex(state.show)) out.sex = state.sex;
  if (state.unit !== DEFAULTS.unit && state.show === 'ranking') out.unit = state.unit;
  if (state.measure !== DEFAULTS.measure && usesMeasure(state.show)) out.measure = state.measure;
  if (state.view !== DEFAULTS.view) out.view = state.view;
  return out;
}

/** The countries angle highlights the chosen country, so it keeps it; the gender angle shows everyone. */
export const usesCountry = (show: Show): boolean => show !== 'gender';
export const usesSex = (show: Show): boolean => show !== 'gender';
export const usesMeasure = (show: Show): boolean => show === 'countries' || show === 'gender';
