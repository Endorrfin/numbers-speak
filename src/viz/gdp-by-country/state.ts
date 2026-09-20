// state.ts — the page's URL state: ?metric=per-capita&year=2024&region=europe&page=2&view=table (pure; unit-tested).
// Unknown or malformed values fall back to defaults, and defaults are omitted from the URL,
// so every view has exactly one canonical link.
// CHANGED (S3-gdp): `metric` (total | per-capita) and `year`; a year the metric has no file for → the latest.
import type { VizParams } from '../../catalog/types';
import { isRegion } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { parsePage } from '../../lib/paginate';
import { LATEST_YEAR, METRICS, YEARS } from './data';
import type { Metric } from './data';

export const PAGE_SIZE = 15;
export type View = 'chart' | 'table';

export type GdpState = { metric: Metric; year: number; region: Region | 'all'; page: number; view: View };

const isMetric = (v: string | undefined): v is Metric => (METRICS as readonly string[]).includes(v ?? '');

export function parseGdpState(params: VizParams): GdpState {
  const metric = isMetric(params.metric) ? params.metric : 'total';
  const year = YEARS[metric].find((y) => String(y) === params.year) ?? LATEST_YEAR;
  return {
    metric,
    year,
    region: isRegion(params.region) ? params.region : 'all',
    page: parsePage(params.page),
    view: params.view === 'table' ? 'table' : 'chart',
  };
}

export function toGdpParams(state: GdpState): VizParams {
  const out: Record<string, string> = {};
  if (state.metric !== 'total') out.metric = state.metric;
  if (state.year !== LATEST_YEAR && YEARS[state.metric].includes(state.year)) out.year = String(state.year);
  if (state.region !== 'all') out.region = state.region;
  if (state.page > 1) out.page = String(state.page);
  if (state.view !== 'chart') out.view = state.view;
  return out;
}
