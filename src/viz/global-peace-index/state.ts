// state.ts — the page's URL state (S3-rb): ?order=least&region=europe&page=2&view=table (pure).
// Unknown or malformed values fall back to defaults; defaults are omitted from the URL.
import type { VizParams } from '../../catalog/types';
import { isRegion } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { focusParam, parseFocus } from '../../lib/focus';
import { parsePage } from '../../lib/paginate';
import type { Order } from './data';

export const PAGE_SIZE = 15;
export type View = 'chart' | 'table';
export type GpiState = { order: Order; region: Region | 'all'; page: number; view: View; focus: string[] | null }; // CHANGED (S3-uf): focus null = default (Ukraine)

export function parseGpiState(params: VizParams): GpiState {
  return {
    order: params.order === 'least' ? 'least' : 'most',
    region: isRegion(params.region) ? params.region : 'all',
    page: parsePage(params.page),
    view: params.view === 'table' ? 'table' : 'chart',
    focus: parseFocus(params.focus), // CHANGED (S3-uf)
  };
}

export function toGpiParams(state: GpiState): VizParams {
  const out: Record<string, string> = {};
  if (state.order !== 'most') out.order = state.order;
  if (state.region !== 'all') out.region = state.region;
  if (state.page > 1) out.page = String(state.page);
  if (state.view !== 'chart') out.view = state.view;
  const focus = focusParam(state.focus); // CHANGED (S3-uf)
  if (focus) out.focus = focus;
  return out;
}
