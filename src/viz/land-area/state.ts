// state.ts — the page's URL state: ?metric=total&region=europe&sort=nonland&page=2&view=table (pure;
// mirrors gdp-by-country's state.ts). Unknown or malformed values fall back to defaults, and defaults are
// omitted from the URL, so every view has exactly one canonical link.
// `sort=nonland` only makes sense for the land metric (it explains why land < total); switching to the
// total metric resets it, same as bdd2's filter/sort interaction.
import type { VizParams } from '../../catalog/types';
import { isRegion } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { parsePage } from '../../lib/paginate';
import { METRICS, SORTS } from './data';
import type { Metric, Sort } from './data';

export const PAGE_SIZE = 15;
export type View = 'chart' | 'table';

export type LandAreaState = { metric: Metric; region: Region | 'all'; sort: Sort; page: number; view: View };

const isMetric = (v: string | undefined): v is Metric => (METRICS as readonly string[]).includes(v ?? '');
const isSort = (v: string | undefined): v is Sort => (SORTS as readonly string[]).includes(v ?? '');

export function parseLandAreaState(params: VizParams): LandAreaState {
  const metric = isMetric(params.metric) ? params.metric : 'land';
  const sort = metric === 'land' && isSort(params.sort) ? params.sort : 'area';
  return {
    metric,
    region: isRegion(params.region) ? params.region : 'all',
    sort,
    page: parsePage(params.page),
    view: params.view === 'table' ? 'table' : 'chart',
  };
}

export function toLandAreaParams(state: LandAreaState): VizParams {
  const out: Record<string, string> = {};
  if (state.metric !== 'land') out.metric = state.metric;
  if (state.metric === 'land' && state.sort !== 'area') out.sort = state.sort;
  if (state.region !== 'all') out.region = state.region;
  if (state.page > 1) out.page = String(state.page);
  if (state.view !== 'chart') out.view = state.view;
  return out;
}
