// src/catalog/index.ts — the catalog API the shell uses. Cards are eager (small);
// page bodies stay behind lazy loaders so each visualization is its own chunk.
// CHANGED (S3-lz): the eager part is the card (VizCard); full manifests load per entry (details.ts).
import { VIZ_CARDS, VIZ_LOADERS, VIZ_META_LOADERS } from './catalog.generated';
import type { VizCard, VizMeta } from './types';

export const CATALOG: readonly VizCard[] = VIZ_CARDS;

const BY_ID: ReadonlyMap<string, VizCard> = new Map(CATALOG.map((m) => [m.id, m]));

export function getViz(id: string): VizCard | undefined {
  return BY_ID.get(id);
}

export function getVizLoader(id: string) {
  return Object.hasOwn(VIZ_LOADERS, id) ? VIZ_LOADERS[id] : undefined;
}

/** CHANGED (S3-lz): the lazy loader of an entry's full manifest (its meta.ts). */
export function getMetaLoader(id: string) {
  return Object.hasOwn(VIZ_META_LOADERS, id) ? VIZ_META_LOADERS[id] : undefined;
}

/** CHANGED (S3-lz): every full manifest, in catalog order — for checks, tests and the SSR smoke, never the shell. */
export async function loadCatalog(): Promise<readonly VizMeta[]> {
  return Promise.all(CATALOG.map(async (card) => (await getMetaLoader(card.id)!()).default));
}
