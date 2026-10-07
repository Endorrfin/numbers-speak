// state.ts — CHANGED (S3-el): the electricity page's URL state (pure; unit-tested). One query string for seven angles:
//   ?show=producers|mix|world|race|carbon|access|ukraine  (producers = default)
//   producers: ?metric=per-capita · ?region= · ?page= · ?focus= (lib/focus.ts; absent = Ukraine)
//   mix:       ?order=clean|fossil · ?region= · ?page= · ?focus=
//   race:      ?source=wind · ?year=2000…2025 (the frame the race stands on)
//   carbon:    ?order=dirtiest · ?region= · ?page= · ?focus=
//   access:    ?metric=people · ?region= · ?page= · ?focus=
//   every angle: ?view=table
// `metric` and `order` mean "the measure / order of this angle"; each angle checks them against its own list.
// Unknown values fall back to defaults and defaults are omitted, so every view has one canonical link.
import type { VizParams } from '../../catalog/types';
import { focusParam, parseFocus } from '../../lib/focus';
import { parsePage } from '../../lib/paginate';
import { isRegion } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { ACCESS_METRICS, CARBON_ORDERS, MIX_ORDERS, PRODUCER_METRICS, RACE_SOURCES } from './data';
import type { AccessMetric, CarbonOrder, MixOrder, ProducerMetric, RaceSource } from './data';

export const SHOWS = ['producers', 'mix', 'world', 'race', 'carbon', 'access', 'ukraine'] as const;
export type Show = (typeof SHOWS)[number];
export type View = 'chart' | 'table';

export const PAGE_SIZE = 15;

export type ElectricityState = {
  show: Show;
  /** Raw `metric` / `order`; read through the angle's own getter below. */
  metric: string | null;
  order: string | null;
  region: Region | 'all';
  page: number;
  view: View;
  /** null = the race's last year. */
  year: number | null;
  source: RaceSource;
  /** null = default (Ukraine), [] = none (lib/focus.ts). */
  focus: string[] | null;
};

const isShow = (v: string | undefined): v is Show => (SHOWS as readonly string[]).includes(v ?? '');
const YEAR = /^(19\d\d|20\d\d)$/;
const KEY = /^[a-z-]{1,20}$/;
const of = <T extends string>(list: readonly T[], v: string | null): T => ((list as readonly string[]).includes(v ?? '') ? (v as T) : list[0]!);

export const producerMetric = (s: ElectricityState): ProducerMetric => of(PRODUCER_METRICS, s.metric);
export const accessMetric = (s: ElectricityState): AccessMetric => of(ACCESS_METRICS, s.metric);
export const mixOrder = (s: ElectricityState): MixOrder => of(MIX_ORDERS, s.order);
export const carbonOrder = (s: ElectricityState): CarbonOrder => of(CARBON_ORDERS, s.order);

export function parseElectricityState(params: VizParams): ElectricityState {
  return {
    show: isShow(params.show) ? params.show : 'producers',
    metric: KEY.test(params.metric ?? '') ? params.metric! : null,
    order: KEY.test(params.order ?? '') ? params.order! : null,
    region: isRegion(params.region) ? params.region : 'all',
    page: parsePage(params.page),
    view: params.view === 'table' ? 'table' : 'chart',
    year: YEAR.test(params.year ?? '') ? Number(params.year) : null,
    source: of(RACE_SOURCES, params.source ?? null),
    focus: parseFocus(params.focus),
  };
}

type Param = 'metric' | 'order' | 'region' | 'page' | 'year' | 'source' | 'focus';
/** Parameters that belong to an angle; the others are dropped from its link. */
const USES: Record<Show, readonly Param[]> = {
  producers: ['metric', 'region', 'page', 'focus'],
  mix: ['order', 'region', 'page', 'focus'],
  world: [],
  race: ['source', 'year'],
  carbon: ['order', 'region', 'page', 'focus'],
  access: ['metric', 'region', 'page', 'focus'],
  ukraine: [],
};

/** The angle's metric / order with its default omitted (an unknown value also drops out). */
function angleValue(state: ElectricityState, key: 'metric' | 'order'): string | null {
  const v =
    key === 'metric'
      ? state.show === 'producers'
        ? producerMetric(state)
        : state.show === 'access'
          ? accessMetric(state)
          : null
      : state.show === 'mix'
        ? mixOrder(state)
        : state.show === 'carbon'
          ? carbonOrder(state)
          : null;
  const first = { producers: PRODUCER_METRICS[0], access: ACCESS_METRICS[0], mix: MIX_ORDERS[0], carbon: CARBON_ORDERS[0] } as Record<string, string>;
  return v === null || v === first[state.show] ? null : v;
}

export function toElectricityParams(state: ElectricityState): VizParams {
  const out: Record<string, string> = {};
  const uses = USES[state.show];
  if (state.show !== 'producers') out.show = state.show;
  for (const key of ['metric', 'order'] as const) {
    const v = uses.includes(key) ? angleValue(state, key) : null;
    if (v) out[key] = v;
  }
  if (uses.includes('region') && state.region !== 'all') out.region = state.region;
  if (uses.includes('page') && state.page > 1) out.page = String(state.page);
  if (uses.includes('source') && state.source !== 'solar') out.source = state.source;
  if (uses.includes('year') && state.year !== null) out.year = String(state.year);
  if (uses.includes('focus')) {
    const focus = focusParam(state.focus);
    if (focus) out.focus = focus;
  }
  if (state.view !== 'chart') out.view = state.view;
  return out;
}

/** Switching angles keeps the view and the highlight, and starts the new angle at its defaults. */
export const switchShow = (state: ElectricityState, show: Show): ElectricityState => ({
  ...state,
  show,
  metric: null,
  order: null,
  page: 1,
  year: null,
  region: 'all',
});
