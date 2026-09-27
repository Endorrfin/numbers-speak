// state.ts — CHANGED (S3-re): the page's URL state (pure; mirrors population-by-country), e.g.
//   ?show=scatter&measure=mortgage&region=europe&page=2&view=table&cities=kyiv-ua,warsaw-pl&sort=centre
// Unknown or malformed values fall back to defaults, and defaults are omitted from the URL, so every view has
// exactly one canonical link. `cities` absent = the default highlight (Ukrainian cities); `cities=none` = none.
import type { VizParams } from '../../catalog/types';
import { isRegion } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { parsePage } from '../../lib/paginate';
import { CITY_ID, MEASURES } from './data';
import type { Measure } from './data';

export const PAGE_SIZE = 15;
/** Most cities the picker highlights at once (more labels would collide on the scatter and the map). */
export const MAX_CITIES = 5;

/** The page's angles: a ranking of any measure, price vs affordability, a year of income and the mortgage,
 *  the centre vs the outskirts (and rent), the map, and a side-by-side comparison of the highlighted cities. */
export const SHOWS = ['ranking', 'scatter', 'income', 'centre', 'map', 'compare'] as const;
export type Show = (typeof SHOWS)[number];
/** Order of the centre-vs-outside rows: widest gap first, the dearest centre first, or the outskirts dearer. */
export const SORTS = ['premium', 'centre', 'inverse'] as const;
export type Sort = (typeof SORTS)[number];
export type View = 'chart' | 'table';

/** The «Ukraine & neighbours» preset: Kyiv and the capitals of the EU and Moldovan neighbours in the list. */
export const NEIGHBOURS: readonly string[] = ['kyiv-ua', 'warsaw-pl', 'budapest-hu', 'bucharest-ro', 'chisinau-md'];

/** The default highlight: the Ukrainian cities of the dataset, in its order (centre price), at most MAX_CITIES. */
export function defaultCities(rows: ReadonlyArray<{ id: string; code: string }>): string[] {
  return rows.filter((r) => r.code === 'UA').slice(0, MAX_CITIES).map((r) => r.id);
}

export type RealEstateState = {
  show: Show;
  measure: Measure;
  region: Region | 'all';
  page: number;
  view: View;
  /** Highlighted city ids in the order added; null = the default highlight. */
  cities: string[] | null;
  sort: Sort;
};

const includes = <T extends string>(list: readonly T[], v: string | undefined): v is T => (list as readonly string[]).includes(v ?? '');

/** '?cities=kyiv-ua,lviv-ua' → ids (well-formed, unique, at most MAX_CITIES); 'none' → []; absent → null. */
export function parseCities(raw: string | undefined): string[] | null {
  if (raw === undefined) return null;
  if (raw === 'none') return [];
  const ids = raw.split(',').filter((id) => CITY_ID.test(id));
  return [...new Set(ids)].slice(0, MAX_CITIES);
}

export function parseRealEstateState(params: VizParams): RealEstateState {
  return {
    show: includes(SHOWS, params.show) ? params.show : 'ranking',
    measure: includes(MEASURES, params.measure) ? params.measure : 'centre',
    region: isRegion(params.region) ? params.region : 'all',
    page: parsePage(params.page),
    view: params.view === 'table' ? 'table' : 'chart',
    cities: parseCities(params.cities),
    sort: includes(SORTS, params.sort) ? params.sort : 'premium',
  };
}

export function toRealEstateParams(state: RealEstateState): VizParams {
  const out: Record<string, string> = {};
  if (state.show !== 'ranking') out.show = state.show;
  if (state.measure !== 'centre') out.measure = state.measure;
  if (state.region !== 'all') out.region = state.region;
  if (state.page > 1) out.page = String(state.page);
  if (state.view !== 'chart') out.view = state.view;
  if (state.cities) out.cities = state.cities.length ? state.cities.slice(0, MAX_CITIES).join(',') : 'none';
  if (state.sort !== 'premium') out.sort = state.sort;
  return out;
}
