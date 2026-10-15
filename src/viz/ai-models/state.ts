// state.ts — CHANGED (S3-ai1): the AI-models page's URL state (pure; unit-tested). One query string for the angles:
//   ?show=timeline|scale|arena|users|lineage|origins   (timeline = default; CHANGED (S3-ai2): arena, users, lineage)
//   timeline: ?company=<id> (highlight one of the eight) · ?from=YYYY-MM · ?to=YYYY-MM (the brushed period)
//   scale · arena · users: ?company=<id>
//   lineage:  ?company=<id> (also opens that company's tree)
//   origins:  ?split=access (default: country)
//   day:      ?on=YYYY-MM-DD (CHANGED (S3-ai4): angle G; default = a year before the end of the data, checked on the page)
//   every angle: ?view=table
// Values are checked for shape here and against the data on the page (an unknown company or a month outside the data
// falls back). Defaults are omitted, so every view has one canonical link.
import type { VizParams } from '../../catalog/types';
import { MONTH, SPLITS } from './data';
import type { Month, Split } from './data';

// CHANGED (S3-ai2): in the order of the tab keys A–F. CHANGED (S3-ai4): + G.
export const SHOWS = ['timeline', 'scale', 'arena', 'users', 'lineage', 'origins', 'day'] as const;
export type Show = (typeof SHOWS)[number];
export type View = 'chart' | 'table';

export type AiState = {
  show: Show;
  /** One of the eight companies (checked against releases.json), or null. */
  company: string | null;
  from: Month | null;
  to: Month | null;
  split: Split;
  /** CHANGED (S3-ai4): the day of angle G (a real calendar day; the range is checked against the data on the page). */
  on: string | null;
  view: View;
};

const COMPANY = /^[a-z][a-z0-9-]{0,23}$/;
const isShow = (v: string | undefined): v is Show => (SHOWS as readonly string[]).includes(v ?? '');
const month = (v: string | undefined): Month | null => (v && MONTH.test(v) ? v : null);
/** A YYYY-MM-DD that names a real day (2025-02-30 does not). */
const day = (v: string | undefined): string | null => {
  if (!v || !/^20\d\d-\d\d-\d\d$/.test(v)) return null;
  const t = Date.parse(`${v}T00:00:00Z`);
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === v ? v : null;
};

export function parseAiState(params: VizParams): AiState {
  return {
    show: isShow(params.show) ? params.show : 'timeline',
    company: COMPANY.test(params.company ?? '') ? params.company! : null,
    from: month(params.from),
    to: month(params.to),
    split: (SPLITS as readonly string[]).includes(params.split ?? '') ? (params.split as Split) : 'country',
    on: day(params.on),
    view: params.view === 'table' ? 'table' : 'chart',
  };
}

type Param = 'company' | 'from' | 'to' | 'split' | 'on';
/** Parameters that belong to an angle; the others are dropped from its link. */
const USES: Record<Show, readonly Param[]> = {
  timeline: ['company', 'from', 'to'],
  scale: ['company'],
  arena: ['company'], // CHANGED (S3-ai2)
  users: ['company'],
  lineage: ['company'],
  origins: ['split'],
  day: ['on'], // CHANGED (S3-ai4)
};

export function toAiParams(state: AiState): VizParams {
  const out: Record<string, string> = {};
  const uses = USES[state.show];
  if (state.show !== 'timeline') out.show = state.show;
  if (uses.includes('company') && state.company) out.company = state.company;
  if (uses.includes('from') && state.from) out.from = state.from;
  if (uses.includes('to') && state.to) out.to = state.to;
  if (uses.includes('split') && state.split !== 'country') out.split = state.split;
  if (uses.includes('on') && state.on) out.on = state.on;
  if (state.view !== 'chart') out.view = state.view;
  return out;
}

/** Switching angles keeps the view and the highlighted company; the period, the split and the day start over. */
export const switchShow = (state: AiState, show: Show): AiState => ({ ...state, show, from: null, to: null, split: 'country', on: null });
