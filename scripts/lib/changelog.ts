// scripts/lib/changelog.ts — CHANGED (S3-cl): CHANGELOG.md ↔ catalog check, pure and unit-tested
// (scripts/test-changelog.ts). check:catalog fails when a published entry has no line that links it.
import { join } from 'node:path';
import { ROOT } from './viz-folders';

export const CHANGELOG_PATH = join(ROOT, 'CHANGELOG.md');

// A link to a visualization page — `#/v/<id>`, optionally followed by `?query`; ids as in ID_PATTERN.
const VIZ_LINK = /#\/v\/([a-z0-9]+(?:-[a-z0-9]+)*)/g;

/** Every visualization id the changelog links to (`…#/v/<id>` or `…#/v/<id>?…`). */
export function linkedVizIds(changelog: string): Set<string> {
  return new Set(Array.from(changelog.matchAll(VIZ_LINK), (match) => match[1]));
}

/** The ids the changelog never links to, in input order. A bare id in prose does not count. */
export function missingFromChangelog(ids: readonly string[], changelog: string): string[] {
  const linked = linkedVizIds(changelog);
  return ids.filter((id) => !linked.has(id));
}
