// state.ts — the page's URL state: ?show=seasonal&view=table (pure). CHANGED (S3-cd): new.
import type { VizParams } from '../../catalog/types';

/** timeline = continuous months, Feb 2022 .. Nov 2025 (default). seasonal = year-over-year, Jan-Dec. */
export const SHOWS = ['timeline', 'seasonal'] as const;
export type Show = (typeof SHOWS)[number];
export type View = 'chart' | 'table';

export type DonState = { show: Show; view: View };

const isShow = (v: string | undefined): v is Show => (SHOWS as readonly string[]).includes(v ?? '');

export function parseDonState(params: VizParams): DonState {
  return {
    show: isShow(params.show) ? params.show : 'timeline',
    view: params.view === 'table' ? 'table' : 'chart',
  };
}

export function toDonParams(state: DonState): VizParams {
  const out: Record<string, string> = {};
  if (state.show !== 'timeline') out.show = state.show;
  if (state.view !== 'chart') out.view = state.view;
  return out;
}
