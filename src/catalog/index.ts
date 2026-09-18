// src/catalog/index.ts — the catalog API the shell uses. Manifests are eager (small);
// page bodies stay behind lazy loaders so each visualization is its own chunk.
import { VIZ_LOADERS, VIZ_METAS } from './catalog.generated';
import type { VizMeta } from './types';

export const CATALOG: readonly VizMeta[] = VIZ_METAS;

const BY_ID: ReadonlyMap<string, VizMeta> = new Map(CATALOG.map((m) => [m.id, m]));

export function getViz(id: string): VizMeta | undefined {
  return BY_ID.get(id);
}

export function getVizLoader(id: string) {
  return Object.hasOwn(VIZ_LOADERS, id) ? VIZ_LOADERS[id] : undefined;
}
