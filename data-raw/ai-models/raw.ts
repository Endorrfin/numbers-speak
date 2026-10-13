/*
 * raw.ts — CHANGED (S3-ai1): reads the committed extracts of data-raw/ai-models/ into the page's types. Shared by
 * prep.ts and scripts/test-ai-models.ts, so the test recomputes everything from the same rows the prep used.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvParse } from 'd3';
import { ARENA_CONFIGS, METRICS, QUALIFIERS, accessOf, splitList } from '../../src/viz/ai-models/data';
import type { ArenaDataset, ArenaSnapshot, Claim, ClaimsDataset, EpochModel, HeroDef, Metric, Qualifier } from '../../src/viz/ai-models/data';

const here = dirname(fileURLToPath(import.meta.url));
const read = (file: string) => csvParse(readFileSync(join(here, file), 'utf8'));

/** Epoch's own "last updated" date of all_ai_models.csv, and the day it was downloaded (README.md). */
export const EPOCH_UPDATED = '2026-10-08';
export const EPOCH_RETRIEVED = '2026-10-13';
/** The day the LMArena parquet files were read: the last snapshot's board counts until then (README.md decision 4). */
export const ARENA_END = '2026-10-13';
/** Style control became the site's default on 16 May 2025 (extract-lmarena.py). */
export const ARENA_SWITCH = '2025-05-16';

export function readHeroes(): HeroDef[] {
  return read('heroes.csv').map((d) => ({
    id: d.id!,
    name: d.name!,
    lines: d.lines!,
    arenaOrg: d.arena_org!,
    pattern: new RegExp(d.epoch_model_regex!, 'i'),
    orgs: d.epoch_orgs!.split('|'),
  }));
}

export function readEpoch(): EpochModel[] {
  return read('epoch-models.csv').map((d) => {
    const flop = d['Training compute (FLOP)'] ? Number(d['Training compute (FLOP)']) : null;
    return {
      model: d.Model!.trim(),
      orgs: splitList(d.Organization ?? ''),
      date: d['Publication date']!,
      domains: splitList(d.Domain ?? ''),
      country: d['Country (of organization)'] ?? '',
      access: accessOf(d['Model accessibility'] ?? ''),
      flop: flop !== null && Number.isFinite(flop) && flop > 0 ? flop : null,
      bases: splitList(d['Base model'] ?? ''),
    };
  });
}

export function readArena(): ArenaDataset {
  const byDate = new Map<string, ArenaSnapshot>();
  for (const d of read('lmarena-text-overall.csv')) {
    const date = d.date!;
    const config = d.config as (typeof ARENA_CONFIGS)[number];
    if (!ARENA_CONFIGS.includes(config)) throw new Error(`lmarena: unknown config ${d.config} on ${date}`);
    const snap = byDate.get(date) ?? { date, config, top: [] };
    if (snap.config !== config) throw new Error(`lmarena: two configs on ${date}`);
    byDate.set(date, snap);
    const rank = Number(d.rank);
    if (rank <= 3) snap.top.push({ rank, model: d.model_name!, org: d.organization! });
  }
  const snapshots = [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  for (const s of snapshots) s.top.sort((a, b) => a.rank - b.rank || (a.model < b.model ? -1 : 1));
  return { retrieved: ARENA_END, end: ARENA_END, switchDate: ARENA_SWITCH, snapshots };
}

/**
 * CHANGED (S3-ai2): user-claims.csv → claims.json. A claim belongs to one of the eight when its company has the hero's
 * name (Microsoft does not); rows are sorted by product, then date. Unknown metric / qualifier fail here.
 */
export function readClaims(heroes: readonly HeroDef[]): ClaimsDataset {
  const claims = read('user-claims.csv').map((d): Claim => {
    const metric = d.metric as Metric;
    const qualifier = d.qualifier as Qualifier;
    if (!METRICS.includes(metric)) throw new Error(`user-claims: unknown metric ${d.metric}`);
    if (!QUALIFIERS.includes(qualifier)) throw new Error(`user-claims: unknown qualifier ${d.qualifier}`);
    return {
      asOf: d.as_of!,
      published: d.published!,
      product: d.product!,
      company: d.company!,
      hero: heroes.find((h) => h.name === d.company)?.id ?? null,
      value: Number(d.value),
      qualifier,
      metric,
      url: d.source_url!,
      quote: d.quote!,
      retrieved: d.retrieved!,
    };
  });
  claims.sort((a, b) => (a.product < b.product ? -1 : a.product > b.product ? 1 : a.asOf < b.asOf ? -1 : a.asOf > b.asOf ? 1 : 0));
  const retrieved = claims.reduce((m, c) => (c.retrieved > m ? c.retrieved : m), '');
  return { retrieved, claims };
}
