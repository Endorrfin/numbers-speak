// src/catalog/filter.ts — pure catalog filtering (unit-tested in scripts/test-filter.ts).
// No React, no DOM: the same logic runs in the browser, the smoke and the tests.
import { CHART_KINDS, GEOS, RUBRIC_IDS } from './types';
import type { ChartKind, Geo, RubricId, VizMeta, VizParams } from './types';

export const NEW_WINDOW_DAYS = 30;
const DAY_MS = 86_400_000;

export type TabId = 'all' | 'new' | RubricId;
export const TAB_IDS: readonly TabId[] = ['all', 'new', ...RUBRIC_IDS];

export type OriginFilter = 'original' | 'adapted';

export type CatalogQuery = {
  tab: TabId;
  chart?: ChartKind;
  geo?: Geo;
  origin?: OriginFilter;
  q?: string;
};

export function isTabId(value: string): value is TabId {
  return (TAB_IDS as readonly string[]).includes(value);
}

const pickEnum = <T extends string>(values: readonly T[], raw: string | undefined): T | undefined =>
  raw !== undefined && (values as readonly string[]).includes(raw) ? (raw as T) : undefined;

/** Query string → typed query. Unknown or invalid values are dropped, never trusted. */
export function parseCatalogQuery(tab: TabId, params: VizParams): CatalogQuery {
  const q = params.q?.trim().slice(0, 80);
  return {
    tab,
    chart: pickEnum(CHART_KINDS, params.chart),
    geo: pickEnum(GEOS, params.geo),
    origin: pickEnum<OriginFilter>(['original', 'adapted'], params.origin),
    q: q ? q : undefined,
  };
}

/** Typed query → query string params (empty values omitted; the tab lives in the path). */
export function toCatalogParams(query: CatalogQuery): Record<string, string> {
  const out: Record<string, string> = {};
  if (query.chart) out.chart = query.chart;
  if (query.geo) out.geo = query.geo;
  if (query.origin) out.origin = query.origin;
  if (query.q) out.q = query.q;
  return out;
}

export function hasActiveFilters(query: CatalogQuery): boolean {
  return Boolean(query.chart || query.geo || query.origin || query.q);
}

export function isVisible(meta: VizMeta, dev: boolean): boolean {
  return meta.status !== 'draft' || dev;
}

/** "New" = added 0…30 calendar days ago (UTC dates, so the hour of the visit doesn't matter). */
export function isNew(meta: VizMeta, now: Date): boolean {
  const added = Date.parse(`${meta.added}T00:00:00Z`);
  if (Number.isNaN(added)) return false;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days = Math.round((today - added) / DAY_MS);
  return days >= 0 && days <= NEW_WINDOW_DAYS;
}

export function inTab(meta: VizMeta, tab: TabId, now: Date): boolean {
  if (tab === 'all') return true;
  if (tab === 'new') return isNew(meta, now);
  return meta.rubrics.includes(tab);
}

/** Every whitespace-separated word must occur in the id, the EN/UA titles/subtitles or the tags. */
export function matchesText(meta: VizMeta, text: string): boolean {
  const words = text.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = [meta.id, meta.title.en, meta.title.uk, meta.subtitle.en, meta.subtitle.uk, ...meta.tags]
    .join(' ')
    .toLowerCase();
  return words.every((w) => hay.includes(w));
}

const STATUS_RANK: Readonly<Record<VizMeta['status'], number>> = { published: 0, soon: 1, draft: 2 };

function compareFor(tab: TabId) {
  return (a: VizMeta, b: VizMeta): number => {
    if (tab !== 'all' && tab !== 'new') {
      const pa = a.rubrics[0] === tab ? 0 : 1;
      const pb = b.rubrics[0] === tab ? 0 : 1;
      if (pa !== pb) return pa - pb; // primary members before secondary ones
    }
    const byStatus = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (byStatus !== 0) return byStatus; // published before soon
    if (a.added !== b.added) return a.added < b.added ? 1 : -1; // newest first
    return a.id.localeCompare(b.id);
  };
}

export type FilterOptions = { now: Date; dev: boolean };

/** Entries visible in a tab, before facet filters (used for tab counts and facet options). */
export function tabEntries(items: readonly VizMeta[], tab: TabId, opts: FilterOptions): VizMeta[] {
  return items.filter((m) => isVisible(m, opts.dev) && inTab(m, tab, opts.now));
}

export function filterCatalog(items: readonly VizMeta[], query: CatalogQuery, opts: FilterOptions): VizMeta[] {
  return tabEntries(items, query.tab, opts)
    .filter((m) => !query.chart || m.chart === query.chart)
    .filter((m) => !query.geo || m.geo === query.geo)
    .filter((m) => !query.origin || m.origin.kind === query.origin)
    .filter((m) => matchesText(m, query.q ?? ''))
    .sort(compareFor(query.tab));
}
