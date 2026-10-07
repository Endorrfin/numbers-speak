// src/catalog/related.ts — CHANGED (S3-nav): "See also" under a visualization (pure; unit-tested in test-related.ts).
// The author's `related` ids come first, in their order; the block is filled up to RELATED_MAX by a score of shared
// rubrics and shared specific tags. Only published entries are suggested — a "soon" page has no chart yet.
import type { VizCard } from './types';

export const RELATED_MAX = 3;

/** Tags that half the catalog carries: they say nothing about two entries being alike. */
const GENERIC_TAGS: ReadonlySet<string> = new Set(['countries', 'ranking', 'world', 'країни', 'рейтинг']);

/** Shared rubrics weigh 2, shared specific tags 1. */
export function relatedScore(a: VizCard, b: VizCard): number {
  const rubrics = a.rubrics.filter((r) => b.rubrics.includes(r)).length;
  const tags = a.tags.filter((t) => !GENERIC_TAGS.has(t) && b.tags.includes(t)).length;
  return 2 * rubrics + tags;
}

/** Up to RELATED_MAX published entries other than `card`: the author's picks first, then the best scores. */
export function relatedFor(card: VizCard, items: readonly VizCard[], max = RELATED_MAX): VizCard[] {
  const eligible = items.filter((m) => m.status === 'published' && m.id !== card.id);
  const byId = new Map(eligible.map((m) => [m.id, m]));
  const out: VizCard[] = [];
  for (const id of card.related ?? []) {
    const m = byId.get(id);
    if (m && !out.includes(m)) out.push(m);
    if (out.length === max) return out;
  }
  const rest = eligible
    .filter((m) => !out.includes(m))
    .map((m) => ({ m, score: relatedScore(card, m) }))
    // Higher score first; equal scores → the newer entry, then id order (deterministic).
    .sort((x, y) => y.score - x.score || (x.m.added !== y.m.added ? (x.m.added < y.m.added ? 1 : -1) : x.m.id.localeCompare(y.m.id)));
  for (const { m } of rest) {
    if (out.length === max) break;
    out.push(m);
  }
  return out;
}
