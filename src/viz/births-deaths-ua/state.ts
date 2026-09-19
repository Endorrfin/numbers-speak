// state.ts — the page's URL state: ?show=ratio&view=table (pure; unit-tested).
// Unknown values fall back to defaults and defaults are omitted, so every view has one canonical link.
import type { VizParams } from '../../catalog/types';

/** The five angles on the same data, in display order; the first is the default. */
export const SHOWS = ['gap', 'ratio', 'net', 'mirror', 'index'] as const;
export type Show = (typeof SHOWS)[number];
export type View = 'chart' | 'table';

export type DemoState = { show: Show; view: View };

const isShow = (v: string | undefined): v is Show => (SHOWS as readonly string[]).includes(v ?? '');

export function parseDemoState(params: VizParams): DemoState {
  return {
    show: isShow(params.show) ? params.show : 'gap',
    view: params.view === 'table' ? 'table' : 'chart',
  };
}

export function toDemoParams(state: DemoState): VizParams {
  const out: Record<string, string> = {};
  if (state.show !== 'gap') out.show = state.show;
  if (state.view !== 'chart') out.view = state.view;
  return out;
}
