// state.ts — the page's URL state (S3-rb): ?show=numbeo&region=americas&page=2&view=table (pure).
// Unknown or malformed values fall back to defaults; defaults are omitted from the URL.
import type { VizParams } from '../../catalog/types';
import { isRegion } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { parsePage } from '../../lib/paginate';
import { SHOWS } from './data';
import type { Show } from './data';

export const PAGE_SIZE = 15;
export type View = 'chart' | 'table';
export type CrimeState = { show: Show; region: Region | 'all'; page: number; view: View };

const isShow = (v: string | undefined): v is Show => (SHOWS as readonly string[]).includes(v ?? '');

export function parseCrimeState(params: VizParams): CrimeState {
  return {
    show: isShow(params.show) ? params.show : 'homicide',
    region: isRegion(params.region) ? params.region : 'all',
    page: parsePage(params.page),
    view: params.view === 'table' ? 'table' : 'chart',
  };
}

export function toCrimeParams(state: CrimeState): VizParams {
  const out: Record<string, string> = {};
  if (state.show !== 'homicide') out.show = state.show;
  if (state.region !== 'all') out.region = state.region;
  if (state.page > 1) out.page = String(state.page);
  if (state.view !== 'chart') out.view = state.view;
  return out;
}
