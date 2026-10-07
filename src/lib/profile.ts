// profile.ts — CHANGED (S3-cp): one country's place in every fact table (pure; unit-tested in test-facts.ts).
// The page "Ukraine in numbers" (#/c/ua) renders this; the tables come from public/data/country-facts.json.
import type { FactGroup, FactTable } from '../catalog/facts';
import type { VizParams } from '../catalog/types';
import { HOME_CODE } from './home';

export type ProfileFact = {
  table: FactTable;
  rank: number;
  /** Rows in the ranking. */
  of: number;
  /** Last rank of a tie (rank … tieTo share one value); undefined when the country holds its rank alone. */
  tieTo?: number;
  value: number;
  /** The figure's own year when it differs from the ranking's year (the source's latest for this country). */
  ownYear?: number;
  /** "*" — internationally recognized borders, as on the entry's page. */
  marked: boolean;
  /** Places moved since the previous edition: + = towards #1. */
  change?: { since: number; places: number };
  /** Parameters that open the entry on the page with this country, highlighted. */
  link: VizParams;
};

export type Profile = {
  code: string;
  facts: ProfileFact[];
  /** Tables that do not list the country at all. */
  missing: FactTable[];
};

/** Rows that share `rank` (a competition-rank tie). */
const tieSize = (t: FactTable, rank: number): number => t.rows.reduce((n, r) => n + (r[1] === rank ? 1 : 0), 0);

export function profileFact(t: FactTable, code: string): ProfileFact | null {
  const index = t.rows.findIndex((r) => r[0] === code);
  if (index < 0) return null;
  const [, rank, value] = t.rows[index]!;
  const size = tieSize(t, rank);
  const link: Record<string, string> = { ...t.link };
  const page = Math.floor(index / t.pageSize) + 1;
  if (page > 1) link.page = String(page);
  if (code !== HOME_CODE) link.focus = code.toLowerCase(); // Ukraine is every ranking's default focus
  const fact: ProfileFact = { table: t, rank, of: t.rows.length, value, marked: t.marked?.includes(code) ?? false, link };
  if (size > 1) fact.tieTo = rank + size - 1;
  const own = t.years?.[code];
  if (own !== undefined && own !== t.year) fact.ownYear = own;
  const before = t.prev?.ranks[code];
  if (t.prev && before !== undefined) fact.change = { since: t.prev.year, places: before - rank };
  return fact;
}

export function profileOf(tables: readonly FactTable[], code: string): Profile {
  const facts: ProfileFact[] = [];
  const missing: FactTable[] = [];
  for (const t of tables) {
    const f = profileFact(t, code);
    if (f) facts.push(f);
    else missing.push(t);
  }
  return { code, facts, missing };
}

/** Facts grouped by section, sections in FACT_GROUPS order, empty sections dropped. */
export function groupFacts(facts: readonly ProfileFact[], groups: readonly FactGroup[]): Array<{ group: FactGroup; facts: ProfileFact[] }> {
  return groups.map((group) => ({ group, facts: facts.filter((f) => f.table.group === group) })).filter((g) => g.facts.length > 0);
}

/** Position on a 1…N line, 0–1 (a one-row ranking sits at 0). */
export const positionOf = (rank: number, of: number): number => (of > 1 ? (rank - 1) / (of - 1) : 0);
