// state.ts — the page's URL state: ?region=europe&page=2&view=table (pure; unit-tested).
// Unknown or malformed values fall back to defaults, and defaults are omitted from the URL,
// so every view has exactly one canonical link.
import type { VizParams } from '../../catalog/types';
import { isRegion } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { parsePage } from '../../lib/paginate';

export const PAGE_SIZE = 15;
export type View = 'chart' | 'table';

export type GdpState = { region: Region | 'all'; page: number; view: View };

export function parseGdpState(params: VizParams): GdpState {
  return {
    region: isRegion(params.region) ? params.region : 'all',
    page: parsePage(params.page),
    view: params.view === 'table' ? 'table' : 'chart',
  };
}

export function toGdpParams(state: GdpState): VizParams {
  const out: Record<string, string> = {};
  if (state.region !== 'all') out.region = state.region;
  if (state.page > 1) out.page = String(state.page);
  if (state.view !== 'chart') out.view = state.view;
  return out;
}
