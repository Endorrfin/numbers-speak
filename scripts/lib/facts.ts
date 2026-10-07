// lib/facts.ts — CHANGED (S3-cp): builds public/data/country-facts.json from src/viz/<id>/facts.ts (published entries).
// Shared by gen-facts (writes), check:catalog (staleness, order, budget) and the tests. Deterministic: tables in
// FACT_ORDER, values rounded to 6 significant digits, one table per line.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import type { FactTable, FactsModule, ReadData } from '../../src/catalog/facts';
import { FACTS_FILE, FACT_ORDER, parseFacts } from '../../src/catalog/facts';
import { PUBLIC_DATA_DIR, listVizFolders } from './viz-folders';

export const FACTS_PATH = join(PUBLIC_DATA_DIR, FACTS_FILE);
/** The file is fetched by the profile page only (never in the initial bundle); the budget keeps it a quick load. */
export const FACTS_BUDGET_GZIP = 48 * 1024;

const sig6 = (v: number): number => (v === 0 ? 0 : Number(v.toPrecision(6)));

/** Reads public/data/<entry>/<file>. */
export const readPublicData: ReadData = (entry, file) => JSON.parse(readFileSync(join(PUBLIC_DATA_DIR, entry, file), 'utf8')) as unknown;

/** Every folder that has a facts.ts, in id order. */
export const factFolders = () => listVizFolders().filter((f) => existsSync(join(f.dir, 'facts.ts')));

/** One entry's tables, validated and rounded. */
export async function buildFacts(id: string, dir: string, read: ReadData = readPublicData): Promise<FactTable[]> {
  const mod = (await import(pathToFileURL(join(dir, 'facts.ts')).href)) as FactsModule;
  const raw = mod.facts(read);
  for (const t of raw) {
    if (t.entry !== id) throw new Error(`src/viz/${id}/facts.ts: table ${t.id} names entry ${t.entry}`);
  }
  const rounded = raw.map((t) => ({ ...t, rows: t.rows.map(([c, r, v]) => [c, r, sig6(v)] as const) }));
  return [...parseFacts({ tables: sortTables(rounded) }, `src/viz/${id}/facts.ts`).tables];
}

const sortTables = (tables: readonly FactTable[]): FactTable[] =>
  [...tables].sort((a, b) => FACT_ORDER.indexOf(a.id) - FACT_ORDER.indexOf(b.id));

/** Fixed key order, so the bytes never depend on how a facts.ts spelled its object. */
function serialize(t: FactTable): string {
  const o: Record<string, unknown> = {
    id: t.id,
    entry: t.entry,
    group: t.group,
    label: { en: t.label.en, uk: t.label.uk },
    first: { en: t.first.en, uk: t.first.uk },
    format: t.format,
    year: t.year,
    link: Object.fromEntries(Object.keys(t.link).sort().map((k) => [k, t.link[k]])),
    pageSize: t.pageSize,
  };
  if (t.years) o.years = Object.fromEntries(Object.keys(t.years).sort().map((k) => [k, t.years![k]]));
  if (t.marked) o.marked = [...t.marked].sort();
  if (t.prev) o.prev = { year: t.prev.year, ranks: Object.fromEntries(Object.keys(t.prev.ranks).sort().map((k) => [k, t.prev!.ranks[k]])) };
  o.rows = t.rows;
  return JSON.stringify(o);
}

export async function generateFacts(): Promise<{ path: string; source: string; ids: string[]; entries: string[] }> {
  const tables: FactTable[] = [];
  const entries: string[] = [];
  for (const { id, dir } of factFolders()) {
    // Only published entries: a `soon` entry's numbers are not shown anywhere yet.
    const meta = (await import(pathToFileURL(join(dir, 'meta.ts')).href)) as { default: { status: string } };
    if (meta.default.status !== 'published') continue;
    tables.push(...(await buildFacts(id, dir)));
    entries.push(id);
  }
  const sorted = sortTables(tables);
  const ids = sorted.map((t) => t.id);
  const missing = FACT_ORDER.filter((id) => !ids.includes(id));
  if (missing.length) throw new Error(`FACT_ORDER lists tables no entry produced: ${missing.join(', ')}`);
  const source = `{"tables":[\n${sorted.map(serialize).join(',\n')}\n]}\n`;
  parseFacts(JSON.parse(source), FACTS_FILE); // the file itself must pass the browser's validator
  return { path: FACTS_PATH, source, ids, entries };
}

export const gzipSize = (source: string): number => gzipSync(Buffer.from(source, 'utf8'), { level: 9 }).length;
