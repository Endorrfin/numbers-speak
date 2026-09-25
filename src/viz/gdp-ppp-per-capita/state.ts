// state.ts — the page's URL state (S3-rb): ?year=2024&region=europe&page=2&view=table (pure; mirrors
// gdp-by-country). Unknown or malformed values fall back to defaults; defaults are omitted from the URL.
import type { VizParams } from '../../catalog/types';
import { isRegion } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { parsePage } from '../../lib/paginate';
import { LATEST_YEAR, YEARS } from './data';

export const PAGE_SIZE = 15;
export type View = 'chart' | 'table';

export type PppState = { year: number; region: Region | 'all'; page: number; view: View };

export function parsePppState(params: VizParams): PppState {
  return {
    year: YEARS.find((y) => String(y) === params.year) ?? LATEST_YEAR,
    region: isRegion(params.region) ? params.region : 'all',
    page: parsePage(params.page),
    view: params.view === 'table' ? 'table' : 'chart',
  };
}

export function toPppParams(state: PppState): VizParams {
  const out: Record<string, string> = {};
  if (state.year !== LATEST_YEAR && YEARS.includes(state.year)) out.year = String(state.year);
  if (state.region !== 'all') out.region = state.region;
  if (state.page > 1) out.page = String(state.page);
  if (state.view !== 'chart') out.view = state.view;
  return out;
}
