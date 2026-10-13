// state.ts — CHANGED (S3-ai1): the AI-models page's URL state (pure; unit-tested). One query string for the angles:
//   ?show=timeline|scale|origins   (timeline = default; arena, users and lineage arrive in S3-ai2)
//   timeline: ?company=<id> (highlight one of the eight) · ?from=YYYY-MM · ?to=YYYY-MM (the brushed period)
//   scale:    ?company=<id>
//   origins:  ?split=access (default: country)
//   every angle: ?view=table
// Values are checked for shape here and against the data on the page (an unknown company or a month outside the data
// falls back). Defaults are omitted, so every view has one canonical link.
import type { VizParams } from '../../catalog/types';
import { MONTH, SPLITS } from './data';
import type { Month, Split } from './data';

export const SHOWS = ['timeline', 'scale', 'origins'] as const;
export type Show = (typeof SHOWS)[number];
export type View = 'chart' | 'table';

export type AiState = {
  show: Show;
  /** One of the eight companies (checked against releases.json), or null. */
  company: string | null;
  from: Month | null;
  to: Month | null;
  split: Split;
  view: View;
};

const COMPANY = /^[a-z][a-z0-9-]{0,23}$/;
const isShow = (v: string | undefined): v is Show => (SHOWS as readonly string[]).includes(v ?? '');
const month = (v: string | undefined): Month | null => (v && MONTH.test(v) ? v : null);

export function parseAiState(params: VizParams): AiState {
  return {
    show: isShow(params.show) ? params.show : 'timeline',
    company: COMPANY.test(params.company ?? '') ? params.company! : null,
    from: month(params.from),
    to: month(params.to),
    split: (SPLITS as readonly string[]).includes(params.split ?? '') ? (params.split as Split) : 'country',
    view: params.view === 'table' ? 'table' : 'chart',
  };
}

type Param = 'company' | 'from' | 'to' | 'split';
/** Parameters that belong to an angle; the others are dropped from its link. */
const USES: Record<Show, readonly Param[]> = {
  timeline: ['company', 'from', 'to'],
  scale: ['company'],
  origins: ['split'],
};

export function toAiParams(state: AiState): VizParams {
  const out: Record<string, string> = {};
  const uses = USES[state.show];
  if (state.show !== 'timeline') out.show = state.show;
  if (uses.includes('company') && state.company) out.company = state.company;
  if (uses.includes('from') && state.from) out.from = state.from;
  if (uses.includes('to') && state.to) out.to = state.to;
  if (uses.includes('split') && state.split !== 'country') out.split = state.split;
  if (state.view !== 'chart') out.view = state.view;
  return out;
}

/** Switching angles keeps the view and the highlighted company; the period and the split start over. */
export const switchShow = (state: AiState, show: Show): AiState => ({ ...state, show, from: null, to: null, split: 'country' });
