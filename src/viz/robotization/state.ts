// state.ts — the page's URL state (S3-rb): ?region=europe&view=table (pure). 15 rows fit one page, so there is
// no paging. Unknown or malformed values fall back to defaults; defaults are omitted from the URL.
import type { VizParams } from '../../catalog/types';
import { isRegion } from '../../lib/regions';
import type { Region } from '../../lib/regions';

export type View = 'chart' | 'table';
export type RobotState = { region: Region | 'all'; view: View };

export function parseRobotState(params: VizParams): RobotState {
  return {
    region: isRegion(params.region) ? params.region : 'all',
    view: params.view === 'table' ? 'table' : 'chart',
  };
}

export function toRobotParams(state: RobotState): VizParams {
  const out: Record<string, string> = {};
  if (state.region !== 'all') out.region = state.region;
  if (state.view !== 'chart') out.view = state.view;
  return out;
}
