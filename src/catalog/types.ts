// src/catalog/types.ts — the catalog contract (CLAUDE.md §4).
// Every visualization folder `src/viz/<id>/` exports one `VizMeta` from `meta.ts`
// and a default page body (`VizBodyProps`) from `index.tsx`.

export type Lang = 'en' | 'uk';
export type Localized = { en: string; uk: string };

/** Topic tabs (CATALOG.md §A). The order here is the display order. */
export const RUBRIC_IDS = ['ukraine', 'world', 'economy', 'security', 'knowledge'] as const;
export type RubricId = (typeof RUBRIC_IDS)[number];

export const CHART_KINDS = [
  'ranked-bar',
  'bar-race',
  'tree',
  'line',
  'combo',
  'bar',
  'grouped-bar',
  'pyramid',
  'donut',
  'lollipop',
  'map',
  'waffle', // CHANGED (S3-tl)
] as const;
export type ChartKind = (typeof CHART_KINDS)[number];

export const GEOS = ['ukraine', 'world', 'usa', 'iceland', 'none'] as const;
export type Geo = (typeof GEOS)[number];

/** draft = dev only · soon = announced, placeholder page · published = meets the Definition of Done. */
export const STATUSES = ['draft', 'soon', 'published'] as const;
export type VizStatus = (typeof STATUSES)[number];

export type Source = {
  title: string;
  /** https only (check:data). */
  url: string;
  /** When the data was retrieved, YYYY-MM-DD. */
  retrieved: string;
};

export type Origin =
  | { kind: 'original' }
  | { kind: 'adapted'; title: string; url: string; license: string };

export type VizMeta = {
  /** kebab-case; equals the folder name and the URL slug `#/v/<id>`. */
  id: string;
  title: Localized;
  subtitle: Localized;
  /** Plain text; blank lines separate paragraphs. */
  description: Localized;
  /** Non-empty; the first item is the primary tab. */
  rubrics: readonly [RubricId, ...RubricId[]];
  chart: ChartKind;
  geo: Geo;
  period?: { from: number; to: number };
  /** Lower-case search keywords (English). */
  tags: readonly string[];
  sources: readonly Source[];
  origin: Origin;
  /** Files served from `public/data/<id>/`. */
  data: readonly string[];
  status: VizStatus;
  /** YYYY-MM-DD; drives the "New" tab (≤ 30 days). */
  added: string;
  /** YYYY-MM-DD; ≥ added. */
  updated: string;
  /** D3 modules used, for the "How it's built" panel. */
  d3Modules?: readonly string[];
};

/** Query-string state of a page (filters, chart settings). */
export type VizParams = Readonly<Record<string, string>>;

/** Props every visualization page body receives. `setParams` replaces the URL query (no history entry). */
export type VizBodyProps = {
  params: VizParams;
  setParams: (next: VizParams) => void;
};

/** Identity helper: gives manifests full type-checking with a readable call site. */
export function defineViz(meta: VizMeta): VizMeta {
  return meta;
}
