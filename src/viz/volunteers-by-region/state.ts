// state.ts — the page's URL state: ?view=table (pure). CHANGED (S3-cd): new.
import type { VizParams } from '../../catalog/types';

export type View = 'chart' | 'table';
export type ViewState = { view: View };

export function parseViewState(params: VizParams): ViewState {
  return { view: params.view === 'table' ? 'table' : 'chart' };
}

export function toViewParams(state: ViewState): VizParams {
  const out: Record<string, string> = {};
  if (state.view !== 'chart') out.view = state.view;
  return out;
}
