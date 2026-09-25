// state.ts — the page's URL state (S3-rb): ?metric=density&region=europe&page=2&view=table (pure; mirrors
// land-area's state.ts). Unknown or malformed values fall back to defaults, and defaults are omitted from the
// URL, so every view has exactly one canonical link.
import type { VizParams } from '../../catalog/types';
import { isRegion } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { parsePage } from '../../lib/paginate';
import { METRICS } from './data';
import type { Metric } from './data';

export const PAGE_SIZE = 15;
export type View = 'chart' | 'table';

export type PopulationState = { metric: Metric; region: Region | 'all'; page: number; view: View };

const isMetric = (v: string | undefined): v is Metric => (METRICS as readonly string[]).includes(v ?? '');

export function parsePopulationState(params: VizParams): PopulationState {
  return {
    metric: isMetric(params.metric) ? params.metric : 'population',
    region: isRegion(params.region) ? params.region : 'all',
    page: parsePage(params.page),
    view: params.view === 'table' ? 'table' : 'chart',
  };
}

export function toPopulationParams(state: PopulationState): VizParams {
  const out: Record<string, string> = {};
  if (state.metric !== 'population') out.metric = state.metric;
  if (state.region !== 'all') out.region = state.region;
  if (state.page > 1) out.page = String(state.page);
  if (state.view !== 'chart') out.view = state.view;
  return out;
}
