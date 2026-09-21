// state.ts — the page's URL state: ?region=europe&page=2&view=table (pure; unit-tested). CHANGED (S3-bdd): new.
// Unknown or malformed values fall back to defaults, and defaults are omitted from the URL,
// so every view has exactly one canonical link.
import type { VizParams } from '../../catalog/types';
import { isRegion } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { parsePage } from '../../lib/paginate';
import { SORTS } from './data';
import type { Sort } from './data';

export const PAGE_SIZE = 15;
export type View = 'chart' | 'table';

// CHANGED (S3-bdd2): `only` (the 47 shrinking countries) and `sort` joined the URL state.
export type PerDayState = {
  region: Region | 'all';
  /** 'shrinking' = only countries where deaths exceed births. */
  only: 'all' | 'shrinking';
  sort: Sort;
  page: number;
  view: View;
};

const isSort = (v: string | undefined): v is Sort => (SORTS as readonly string[]).includes(v ?? '');

export function parsePerDayState(params: VizParams): PerDayState {
  return {
    region: isRegion(params.region) ? params.region : 'all',
    only: params.only === 'shrinking' ? 'shrinking' : 'all',
    sort: isSort(params.sort) ? params.sort : 'births',
    page: parsePage(params.page),
    view: params.view === 'table' ? 'table' : 'chart',
  };
}

export function toPerDayParams(state: PerDayState): VizParams {
  const out: Record<string, string> = {};
  if (state.region !== 'all') out.region = state.region;
  if (state.only !== 'all') out.only = state.only;
  if (state.sort !== 'births') out.sort = state.sort;
  if (state.page > 1) out.page = String(state.page);
  if (state.view !== 'chart') out.view = state.view;
  return out;
}

/** 1-based page that contains `code` in `rows` (the filtered, ranked list); null when absent. */
export function pageOf(rows: readonly { code: string }[], code: string, size = PAGE_SIZE): number | null {
  const i = rows.findIndex((r) => r.code === code);
  return i < 0 ? null : Math.floor(i / size) + 1;
}
