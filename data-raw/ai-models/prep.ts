/*
 * prep.ts — CHANGED (S3-ai1): data-raw/ai-models/*.csv → public/data/ai-models/*.json. Run: `npm run prep -- ai-models`.
 *
 * Inputs (sources, licences and sha256 in README.md; read through raw.ts):
 *   epoch-models.csv          extract-epoch.py ← Epoch AI, all_ai_models.csv (CC BY 4.0): models since 2017
 *   lmarena-text-overall.csv  extract-lmarena.py ← LMArena leaderboard-dataset (CC BY 4.0): the board the site showed
 *   heroes.csv                the eight companies: product-line pattern, Epoch organization names, LMArena key
 *
 * Checks that abort the prep: the rule (≥ 30 days in the LMArena top 3, or ≥ 100 models descending from the company's
 * models), recomputed over every organization in both files, names exactly the companies in heroes.csv; days at No. 1
 * add up to the whole span; every company has a lane; F's two splits add up to the same yearly totals; every file
 * passes the page's own parser.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ACCESS,
  FILES,
  FIRST_YEAR,
  MIN_DERIVED,
  MIN_TOP3_DAYS,
  ORIGINS,
  ancestorOrgs,
  arenaDays,
  candidates,
  derivedFrom,
  heroCriterion,
  heroOfModel,
  isLanguageModel,
  originOf,
  parseArena,
  parseCompute,
  parseOrigins,
  parseReleases,
} from '../../src/viz/ai-models/data';
import type { ComputeDataset, OriginsDataset, Release, ReleasesDataset } from '../../src/viz/ai-models/data';
import { ARENA_END, EPOCH_RETRIEVED, EPOCH_UPDATED, readArena, readEpoch, readHeroes } from './raw';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, '../../public/data/ai-models');
const problems: string[] = [];
const byKey = <T extends { date: string; model: string }>(a: T, b: T): number => {
  const ka = `${a.date} ${a.model}`;
  const kb = `${b.date} ${b.model}`;
  return ka < kb ? -1 : ka > kb ? 1 : 0;
};

const heroes = readHeroes();
const epoch = readEpoch();
const arena = readArena();
const through = epoch.reduce((m, r) => (r.date > m ? r.date : m), '');
const head = { epochUpdated: EPOCH_UPDATED, retrieved: EPOCH_RETRIEVED, through };
for (const m of epoch) if (m.date < `${FIRST_YEAR}-01-01`) problems.push(`epoch: ${m.model} is dated ${m.date}, before ${FIRST_YEAR}`);

// ── The rule ──────────────────────────────────────────────────────────────────────────────────────
const lineage = ancestorOrgs(epoch);
const all = candidates(arena, lineage, heroes);
const chosen = heroCriterion(all);
const expected = heroes.map((h) => h.id);
if ([...chosen].sort().join() !== [...expected].sort().join()) {
  problems.push(`rule: the data name ${chosen.join(', ')}; heroes.csv has ${expected.join(', ')}`);
}
const days = arenaDays(arena);
const firstSum = [...days.first.values()].reduce((s, v) => s + v, 0);
if (firstSum !== days.total) problems.push(`arena: days at No. 1 add up to ${firstSum}, the span is ${days.total}`);
const outside = all.filter((c) => !expected.includes(c.name));
const nextTop3 = outside.reduce((a, b) => (b.top3Days > a.top3Days ? b : a));
const nextDerived = outside.reduce((a, b) => (b.derived > a.derived ? b : a));

// ── releases.json (A) ─────────────────────────────────────────────────────────────────────────────
const rows: Release[] = epoch
  .filter(isLanguageModel)
  .map((m) => ({ m, hero: heroOfModel(m, heroes) }))
  .filter((x): x is { m: (typeof epoch)[number]; hero: string } => x.hero !== null)
  .map(({ m, hero }) => ({ model: m.model, hero, date: m.date, access: m.access }))
  .sort(byKey);
const heroRows = heroes
  .map((h) => {
    const first = rows.find((r) => r.hero === h.id)?.date;
    if (!first) problems.push(`releases: ${h.name} has no language or multimodal model on its lane`);
    const d = derivedFrom(lineage, h.orgs);
    return {
      id: h.id,
      name: h.name,
      lines: h.lines,
      first: first ?? '',
      top3Days: days.top3.get(h.arenaOrg) ?? 0,
      derived: d.models,
      derivedOrgs: d.orgs,
    };
  })
  .sort((a, b) => (a.first < b.first ? -1 : a.first > b.first ? 1 : 0));
const releases: ReleasesDataset = {
  ...head,
  rule: {
    arenaFrom: arena.snapshots[0]!.date,
    arenaTo: ARENA_END,
    minTop3Days: MIN_TOP3_DAYS,
    minDerived: MIN_DERIVED,
    nextTop3: { name: nextTop3.name, days: nextTop3.top3Days },
    nextDerived: { name: nextDerived.name, models: nextDerived.derived },
  },
  heroes: heroRows,
  rows,
};

// ── compute.json (B) ──────────────────────────────────────────────────────────────────────────────
const disclosed: ComputeDataset['disclosed'] = {};
for (const h of heroRows) {
  const own = epoch.filter((m) => heroOfModel(m, heroes) === h.id);
  disclosed[h.id] = [own.filter((m) => m.flop !== null).length, own.length];
}
const compute: ComputeDataset = {
  ...head,
  models: epoch.length,
  disclosed,
  rows: epoch
    .filter((m) => m.flop !== null)
    .map((m) => ({ model: m.model, org: m.orgs[0] ?? null, hero: heroOfModel(m, heroes), date: m.date, flop: m.flop! }))
    .sort(byKey),
};

// ── origins.json (F) ──────────────────────────────────────────────────────────────────────────────
const lastYear = Number(through.slice(0, 4));
const years = Array.from({ length: lastYear - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);
const zeros = (): number[] => years.map(() => 0);
const origins: OriginsDataset = {
  ...head,
  years,
  country: Object.fromEntries(ORIGINS.map((k) => [k, zeros()])) as OriginsDataset['country'],
  access: Object.fromEntries(ACCESS.map((k) => [k, zeros()])) as OriginsDataset['access'],
};
for (const m of epoch.filter(isLanguageModel)) {
  const i = Number(m.date.slice(0, 4)) - FIRST_YEAR;
  origins.country[originOf(m.country)][i]!++;
  origins.access[m.access][i]!++;
}

// ── Validate with the page's own parsers, then write ───────────────────────────────────────────────
const out: Array<[string, unknown, (json: unknown) => unknown]> = [
  [FILES.releases, releases, (j) => parseReleases(j)],
  [FILES.compute, compute, (j) => parseCompute(j)],
  [FILES.origins, origins, (j) => parseOrigins(j)],
  [FILES.arena, arena, (j) => parseArena(j)],
];
for (const [file, json, parse] of out) {
  try {
    parse(JSON.parse(JSON.stringify(json)));
  } catch (e) {
    problems.push(`${file}: ${(e as Error).message}`);
  }
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
mkdirSync(OUT_DIR, { recursive: true });
for (const [file, json] of out) {
  writeFileSync(join(OUT_DIR, file), `${JSON.stringify(json)}\n`);
  console.log(`public/data/ai-models/${file}`);
}
const fmt = (h: (typeof heroRows)[number]): string => `${h.name} ${h.first.slice(0, 7)} (top 3 ${h.top3Days} d, derived ${h.derived}/${h.derivedOrgs})`;
console.log(`rule: ${heroRows.map(fmt).join(' · ')}`);
console.log(`next outside: top 3 ${nextTop3.name} ${nextTop3.top3Days} d · derived ${nextDerived.name} ${nextDerived.derived}`);
console.log(
  `releases ${rows.length} · compute ${compute.rows.length} of ${compute.models} · origins ${years[0]}–${lastYear} (through ${through}) · ` +
    `arena ${arena.snapshots.length} snapshots ${arena.snapshots[0]!.date}–${ARENA_END}`,
);
