// state.ts — CHANGED (S3-oil): the oil page's URL state (pure; unit-tested). One query string for five angles:
//   ?show=consumption|race|us|china|flows  (consumption = default)
//   consumption: ?metric=per-capita · ?region= · ?page= · ?focus= (lib/focus.ts; absent = Ukraine)
//   race:        ?year=1965…2025 (the frame the race stands on) · ?region=
//   us:          ?year=1973…2025, or the partial year (e.g. 2026) · ?page=
//   china:       ?year=2024|2025 · ?page=
//   flows:       ?side=exporters
//   every angle: ?view=table
// `year` means "the year of this angle"; each angle checks it against its own data and falls back to its latest
// year. Unknown values fall back to defaults and defaults are omitted, so every view has one canonical link.
import type { VizParams } from '../../catalog/types';
import { focusParam, parseFocus } from '../../lib/focus';
import { parsePage } from '../../lib/paginate';
import { isRegion } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { CONSUMPTION_METRICS } from './data';
import type { ConsumptionMetric, TradeSide } from './data';

export const SHOWS = ['consumption', 'race', 'us', 'china', 'flows'] as const;
export type Show = (typeof SHOWS)[number];
export type View = 'chart' | 'table';

export const PAGE_SIZE = 15;

export type OilState = {
  show: Show;
  metric: ConsumptionMetric;
  region: Region | 'all';
  page: number;
  view: View;
  /** null = the angle's default (its latest year). */
  year: number | null;
  side: TradeSide;
  /** null = default (Ukraine), [] = none (lib/focus.ts). */
  focus: string[] | null;
};

const isShow = (v: string | undefined): v is Show => (SHOWS as readonly string[]).includes(v ?? '');
const isMetric = (v: string | undefined): v is ConsumptionMetric => (CONSUMPTION_METRICS as readonly string[]).includes(v ?? '');
const YEAR = /^(19[6-9]\d|20\d\d)$/;

export function parseOilState(params: VizParams): OilState {
  return {
    show: isShow(params.show) ? params.show : 'consumption',
    metric: isMetric(params.metric) ? params.metric : 'total',
    region: isRegion(params.region) ? params.region : 'all',
    page: parsePage(params.page),
    view: params.view === 'table' ? 'table' : 'chart',
    year: YEAR.test(params.year ?? '') ? Number(params.year) : null,
    side: params.side === 'exporters' ? 'exporters' : 'importers',
    focus: parseFocus(params.focus),
  };
}

/** Parameters that belong to an angle; the others are dropped from its link. */
const USES: Record<Show, ReadonlyArray<keyof OilState>> = {
  consumption: ['metric', 'region', 'page', 'focus'],
  race: ['year', 'region'],
  us: ['year', 'page'],
  china: ['year', 'page'],
  flows: ['side'],
};

export function toOilParams(state: OilState): VizParams {
  const out: Record<string, string> = {};
  const uses = USES[state.show];
  if (state.show !== 'consumption') out.show = state.show;
  if (uses.includes('metric') && state.metric !== 'total') out.metric = state.metric;
  if (uses.includes('region') && state.region !== 'all') out.region = state.region;
  if (uses.includes('page') && state.page > 1) out.page = String(state.page);
  if (uses.includes('year') && state.year !== null) out.year = String(state.year);
  if (uses.includes('side') && state.side !== 'importers') out.side = state.side;
  if (uses.includes('focus')) {
    const focus = focusParam(state.focus);
    if (focus) out.focus = focus;
  }
  if (state.view !== 'chart') out.view = state.view;
  return out;
}

/** Switching angles keeps the view and the highlight, and starts the new angle at its defaults. */
export const switchShow = (state: OilState, show: Show): OilState => ({ ...state, show, page: 1, year: null, region: 'all' });
