// useDataset.ts — load + validate a JSON dataset from public/data/<id>/ once per session.
// A failed request is not cached, so "Try again" really refetches. The parser runs before anything
// reaches a chart; a malformed file becomes the error state, never a wrong drawing.
// A dataset that is already loaded renders on the first paint (no "Loading…" flash when you come back).
import { useEffect, useState } from 'react';

export type DatasetState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; error: Error; retry: () => void };

const pending = new Map<string, Promise<unknown>>();
const loaded = new Map<string, unknown>();

/** Relative URL of a data file — works under any GitHub Pages sub-path (vite base './'). */
export const dataUrl = (id: string, file: string): string => `./data/${id}/${file}`;

/** Seeds the cache (SSR smoke and tests render the ready state without a network). */
export function primeDataset(url: string, json: unknown): void {
  loaded.set(url, json);
}

function loadJson(url: string): Promise<unknown> {
  if (loaded.has(url)) return Promise.resolve(loaded.get(url));
  let p = pending.get(url);
  if (!p) {
    p = fetch(url, { credentials: 'omit' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
        const json: unknown = await res.json();
        loaded.set(url, json);
        return json;
      })
      .finally(() => pending.delete(url));
    pending.set(url, p);
  }
  return p;
}

function fromCache<T>(url: string, parse: (json: unknown) => T): DatasetState<T> {
  if (!loaded.has(url)) return { status: 'loading' };
  try {
    return { status: 'ready', data: parse(loaded.get(url)) };
  } catch {
    return { status: 'loading' }; // the effect reports the error
  }
}

// CHANGED (S3-gdp): the state remembers its URL. When the URL changes (a page switching year or metric),
// the previous file is never returned under the new URL: a cached file renders at once, otherwise "Loading…".
export function useDataset<T>(url: string, parse: (json: unknown) => T): DatasetState<T> {
  const [attempt, setAttempt] = useState(0);
  const [entry, setEntry] = useState<{ url: string; state: DatasetState<T> }>(() => ({
    url,
    state: fromCache(url, parse),
  }));

  useEffect(() => {
    let active = true;
    setEntry((prev) =>
      prev.url === url && prev.state.status === 'ready' ? prev : { url, state: fromCache(url, parse) },
    );
    loadJson(url)
      .then((json) => {
        if (active) setEntry({ url, state: { status: 'ready', data: parse(json) } });
      })
      .catch((e: unknown) => {
        if (!active) return;
        const error = e instanceof Error ? e : new Error(String(e));
        if (import.meta.env?.DEV) console.error(error);
        setEntry({ url, state: { status: 'error', error, retry: () => setAttempt((n) => n + 1) } });
      });
    return () => {
      active = false;
    };
  }, [url, parse, attempt]);

  return entry.url === url ? entry.state : fromCache(url, parse);
}
