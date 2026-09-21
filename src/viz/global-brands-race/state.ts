// state.ts — the page's URL state: ?year=2012&group=auto&view=table (pure; unit-tested). CHANGED (S3-br): new.
// Unknown or malformed values fall back to defaults, and defaults are omitted from the URL, so every view has
// exactly one canonical link. The race position between years (and playback) is page state, not URL state:
// the link keeps the whole year the race stopped at.
import type { VizParams } from '../../catalog/types';
import { FIRST_YEAR, GROUPS, LATEST_YEAR } from './data';
import type { Group } from './data';

export type View = 'chart' | 'table';
export type RaceState = { year: number; group: Group | 'all'; view: View };

const isGroup = (v: string | undefined): v is Group => (GROUPS as readonly string[]).includes(v ?? '');

export function parseRaceState(params: VizParams): RaceState {
  const y = /^\d{4}$/.test(params.year ?? '') ? Number(params.year) : NaN;
  return {
    year: y >= FIRST_YEAR && y <= LATEST_YEAR ? y : LATEST_YEAR,
    group: isGroup(params.group) ? params.group : 'all',
    view: params.view === 'table' ? 'table' : 'chart',
  };
}

export function toRaceParams(state: RaceState): VizParams {
  const out: Record<string, string> = {};
  if (state.year !== LATEST_YEAR) out.year = String(state.year);
  if (state.group !== 'all') out.group = state.group;
  if (state.view !== 'chart') out.view = state.view;
  return out;
}
