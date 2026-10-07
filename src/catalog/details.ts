// details.ts — CHANGED (S3-lz): an entry's full manifest (description, sources, licence, data files, d3 modules)
// loads with its page, once per session. A loaded manifest renders on the first paint, so coming back to a page
// shows no gap; a failed load is not cached, so "Try again" really reloads.
import { useEffect, useState } from 'react';
import { getMetaLoader } from './index';
import type { VizMeta } from './types';

export type DetailsState =
  | { status: 'loading' }
  | { status: 'ready'; meta: VizMeta }
  | { status: 'error'; retry: () => void };

const loaded = new Map<string, VizMeta>();
const pending = new Map<string, Promise<VizMeta>>();

/** Seeds the cache (the SSR smoke renders the panels without a module loader). */
export function primeDetails(meta: VizMeta): void {
  loaded.set(meta.id, meta);
}

export function loadDetails(id: string): Promise<VizMeta> {
  const hit = loaded.get(id);
  if (hit) return Promise.resolve(hit);
  let p = pending.get(id);
  if (!p) {
    const loader = getMetaLoader(id);
    p = (loader ? loader() : Promise.reject(new Error(`No manifest for ${id}`)))
      .then(({ default: meta }) => {
        loaded.set(id, meta);
        return meta;
      })
      .finally(() => pending.delete(id));
    pending.set(id, p);
  }
  return p;
}

const fromCache = (id: string | null): DetailsState => {
  const meta = id === null ? undefined : loaded.get(id);
  return meta ? { status: 'ready', meta } : { status: 'loading' };
};

/** `null` = nothing to load (an unknown or hidden entry renders NotFound). */
export function useDetails(id: string | null): DetailsState {
  const [attempt, setAttempt] = useState(0);
  // The state remembers its id, so another page's manifest is never shown under a new id.
  const [entry, setEntry] = useState<{ id: string | null; state: DetailsState }>(() => ({ id, state: fromCache(id) }));

  useEffect(() => {
    if (id === null) return;
    let active = true;
    setEntry((prev) => (prev.id === id && prev.state.status === 'ready' ? prev : { id, state: fromCache(id) }));
    loadDetails(id).then(
      (meta) => {
        if (active) setEntry({ id, state: { status: 'ready', meta } });
      },
      () => {
        if (active) setEntry({ id, state: { status: 'error', retry: () => setAttempt((n) => n + 1) } });
      },
    );
    return () => {
      active = false;
    };
  }, [id, attempt]);

  return entry.id === id ? entry.state : fromCache(id);
}
