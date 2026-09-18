// Tiny hash router (no router library — CLAUDE.md §2).
// Routes: #/ · #/t/<tab> · #/v/<id> · #/about, each with an optional ?query for filters and chart
// settings. Hash routing + vite base './' works under any GitHub Pages sub-path.
import { useMemo, useSyncExternalStore } from 'react';
import { isTabId } from '../catalog/filter';
import type { TabId } from '../catalog/filter';
import type { VizParams } from '../catalog/types';

export type Route =
  | { name: 'catalog'; tab: TabId }
  | { name: 'viz'; id: string }
  | { name: 'about' }
  | { name: 'notFound' };

export type HashLocation = {
  route: Route;
  params: VizParams;
  /** The path part without the query — changes only on real navigation. */
  path: string;
};

export const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PARAM_KEY = /^[a-z][a-z0-9-]{0,31}$/;
const MAX_PARAM_LENGTH = 200;
const MAX_PARAMS = 20;

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Query string → params. Keys must look like identifiers; overly long values are dropped. */
export function parseParams(query: string): VizParams {
  const out: Record<string, string> = {};
  let count = 0;
  for (const [key, value] of new URLSearchParams(query)) {
    if (count >= MAX_PARAMS) break;
    if (!PARAM_KEY.test(key) || value.length > MAX_PARAM_LENGTH || value === '') continue;
    if (!(key in out)) count++;
    out[key] = value;
  }
  return out;
}

/** Params → query string with stable (sorted) key order, so equal states give equal URLs. */
export function stringifyParams(params: VizParams): string {
  const qs = new URLSearchParams();
  for (const key of Object.keys(params).sort()) {
    const value = params[key];
    if (value !== undefined && value !== '') qs.set(key, value);
  }
  return qs.toString();
}

export function parseHash(raw: string): HashLocation {
  const hash = raw.replace(/^#/, '');
  const q = hash.indexOf('?');
  const pathPart = q === -1 ? hash : hash.slice(0, q);
  const params = parseParams(q === -1 ? '' : hash.slice(q + 1));
  const parts = pathPart.split('/').filter(Boolean).map(safeDecode);
  const path = '/' + parts.join('/');

  const [head, arg] = parts;
  let route: Route = { name: 'notFound' };
  if (parts.length === 0) route = { name: 'catalog', tab: 'all' };
  else if (head === 't' && parts.length === 2 && arg !== undefined && isTabId(arg)) route = { name: 'catalog', tab: arg };
  else if (head === 'v' && parts.length === 2 && arg !== undefined && ID_PATTERN.test(arg)) route = { name: 'viz', id: arg };
  else if (head === 'about' && parts.length === 1) route = { name: 'about' };

  return { route, params, path };
}

function withQuery(path: string, params?: VizParams): string {
  const qs = params ? stringifyParams(params) : '';
  return `#${path}${qs ? `?${qs}` : ''}`;
}

export const hrefCatalog = (tab: TabId = 'all', params?: VizParams): string =>
  withQuery(tab === 'all' ? '/' : `/t/${tab}`, params);
export const hrefViz = (id: string, params?: VizParams): string => withQuery(`/v/${id}`, params);
export const hrefAbout = (): string => '#/about';

/** Real navigation: a new history entry (hashchange fires). */
export function navigate(href: string): void {
  window.location.hash = href.replace(/^#/, '');
}

const HASH_REPLACED = 'numbers-speak:hash-replaced';

/**
 * Replace the query of the current route without a new history entry — for filter and chart
 * settings, so typing in a search box doesn't flood the back button.
 */
export function replaceParams(params: VizParams): void {
  const { path } = parseHash(window.location.hash);
  const next = withQuery(path, params);
  if (next === (window.location.hash || '#/')) return;
  const url = `${window.location.pathname}${window.location.search}${next}`;
  window.history.replaceState(window.history.state, '', url);
  window.dispatchEvent(new Event(HASH_REPLACED));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  window.addEventListener(HASH_REPLACED, onChange);
  return () => {
    window.removeEventListener('hashchange', onChange);
    window.removeEventListener(HASH_REPLACED, onChange);
  };
}

const getHash = (): string => window.location.hash;

export function useHashLocation(): HashLocation {
  const hash = useSyncExternalStore(subscribe, getHash, getHash);
  return useMemo(() => parseHash(hash), [hash]);
}
