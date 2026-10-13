// data.ts — CHANGED (S3-ai1): the AI-models entry's dataset contract — one parser per shipped file (prep, check:data and
// the browser use the same code), the rule that picks the eight companies, and the pure derivations the angles draw.
//
//   releases.json  Epoch AI: language and multimodal models of the eight companies' product lines (angle A, lanes) +
//                  the companies, with the evidence of the rule that put each of them on the page
//   compute.json   Epoch AI: every model since 2017 with a training-compute figure (angle B), + how many models of each
//                  company have one
//   origins.json   Epoch AI: language and multimodal models a year by developer country and access to weights (angle F)
//   arena.json     LMArena text leaderboard, overall: ranks 1–3 of every snapshot the site showed (angle C; the rule's
//                  "days in the top 3")
//   claims.json    CHANGED (S3-ai2): user counts the companies published themselves (angle D), one row per claim
//   lineage.json   CHANGED (S3-ai2): models built on each company's models, with the base each one names (angle E)
//
// The eight companies are not chosen by hand (docs/AI-MODELS-PLAN.md §2): a company is on the page if one of its models
// spent ≥ 30 days in the LMArena top 3, or if ≥ 100 Epoch models descend from its models. `heroCriterion` recomputes it.
import { array, fail, finite, oneOf, record, string } from '../../lib/dataset';

export const FILES = {
  releases: 'releases.json',
  compute: 'compute.json',
  origins: 'origins.json',
  arena: 'arena.json',
  // CHANGED (S3-ai2): angles D and E.
  claims: 'claims.json',
  lineage: 'lineage.json',
} as const;
export const DATA_FILES: readonly string[] = Object.values(FILES);

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[a-z][a-z0-9-]{0,23}$/;
/** First year on the page: Epoch's records are kept from 2017 (the transformer paper; data-raw/ai-models/README.md). */
export const FIRST_YEAR = 2017;
// The largest training run Epoch lists is ≈ 5 × 10^26 FLOP; 10^30 catches unit mistakes, not a real limit.
const MAX_FLOP = 1e30;

const date = (v: unknown, at: string): string => string(v, at, DATE);
const count = (v: unknown, at: string): number => {
  const n = finite(v, at, 0, 1e7);
  if (!Number.isInteger(n)) fail(at, `${n} is not a whole number`);
  return n;
};

// ── Epoch fields → page categories (prep, tests) ──────────────────────────────────────────────────

/** Access to the weights: Epoch's "Model accessibility" in three groups. */
export const ACCESS = ['open', 'closed', 'unknown'] as const;
export type Access = (typeof ACCESS)[number];

/** "Open weights (unrestricted | restricted use | non-commercial)" → open; API, hosted, limited, unreleased → closed. */
export function accessOf(accessibility: string): Access {
  const v = accessibility.trim();
  if (v === '') return 'unknown';
  return v.startsWith('Open weights') ? 'open' : 'closed';
}

/** Developer country, first listed: the United States, China, or another country (none recorded → other). */
export const ORIGINS = ['us', 'cn', 'other'] as const;
export type Origin = (typeof ORIGINS)[number];

export function originOf(countries: string): Origin {
  const first = splitList(countries)[0] ?? '';
  return first === 'United States of America' ? 'us' : first === 'China' ? 'cn' : 'other';
}

/** Epoch joins several values in one cell with commas ("Google DeepMind,Google"). */
export function splitList(cell: string): string[] {
  return cell
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** A row of Epoch's `all_ai_models.csv` with the fields the entry uses (data-raw/ai-models/epoch-models.csv). */
export type EpochModel = {
  model: string;
  orgs: string[];
  date: string;
  domains: string[];
  country: string;
  access: Access;
  flop: number | null;
  bases: string[];
};

/** Language and multimodal models — the lanes (A) and the counts by country (F). */
export const isLanguageModel = (m: Pick<EpochModel, 'domains'>): boolean => m.domains.includes('Language') || m.domains.includes('Multimodal');

/** One of the eight companies as heroes.csv defines it. */
export type HeroDef = {
  id: string;
  name: string;
  /** Product lines, as the lane is labelled ("GPT · o-series"). */
  lines: string;
  /** The company's `organization` key in the LMArena dataset. */
  arenaOrg: string;
  /** Matches the company's product lines at the start of an Epoch model name (case-insensitive). */
  pattern: RegExp;
  /** Epoch organization names that are this company (Google DeepMind, Google Research…). */
  orgs: string[];
};

/**
 * The company whose product line a model belongs to: its name matches the line AND its organizations include the
 * company — GPT-Neo (EleutherAI) is not OpenAI's, Llama Nemotron (Nvidia) is not Meta's. null = none of the eight.
 */
export function heroOfModel(m: Pick<EpochModel, 'model' | 'orgs'>, heroes: readonly HeroDef[]): string | null {
  for (const h of heroes) {
    if (h.pattern.test(m.model) && m.orgs.some((o) => h.orgs.includes(o))) return h.id;
  }
  return null;
}

/** The company a model's organizations belong to (any of the eight, by organization only), or null. */
export function heroOfOrgs(orgs: readonly string[], heroes: readonly HeroDef[]): string | null {
  return heroes.find((h) => orgs.some((o) => h.orgs.includes(o)))?.id ?? null;
}

// ── Lineage: who builds on whose models (the rule's second test; angle E in S3-ai2) ─────────────────

/**
 * For every model with a recorded base model: the organizations of all its ancestors (base, base of the base…).
 * A base model Epoch does not list (6 names) has no organization and adds nothing. Cycles are ignored.
 */
export function ancestorOrgs(models: readonly EpochModel[]): Array<{ model: EpochModel; orgs: Set<string> }> {
  const byName = new Map<string, EpochModel>();
  for (const m of models) if (!byName.has(m.model)) byName.set(m.model, m);
  const out: Array<{ model: EpochModel; orgs: Set<string> }> = [];
  for (const m of models) {
    if (m.bases.length === 0) continue;
    const orgs = new Set<string>();
    const seen = new Set<string>();
    const stack = [...m.bases];
    while (stack.length) {
      const name = stack.pop()!;
      if (seen.has(name)) continue;
      seen.add(name);
      const base = byName.get(name);
      if (!base) continue;
      for (const o of base.orgs) orgs.add(o);
      stack.push(...base.bases);
    }
    out.push({ model: m, orgs });
  }
  return out;
}

export type Derived = { models: number; orgs: number };

/**
 * Models that descend from a company's models (any ancestor's organization is one of `names`), and how many other
 * organizations made them. A company's own later versions count too (Claude 2.1 on Claude 2).
 */
export function derivedFrom(lineage: ReturnType<typeof ancestorOrgs>, names: readonly string[]): Derived {
  const makers = new Set<string>();
  let models = 0;
  for (const { model, orgs } of lineage) {
    if (![...orgs].some((o) => names.includes(o))) continue;
    models++;
    for (const o of model.orgs) if (!names.includes(o)) makers.add(o);
  }
  return { models, orgs: makers.size };
}

// ── LMArena (arena.json) ──────────────────────────────────────────────────────────────────────────

export const ARENA_CONFIGS = ['text', 'text_style_control'] as const;
export type ArenaConfig = (typeof ARENA_CONFIGS)[number];

export type ArenaEntry = { rank: number; model: string; org: string };
export type ArenaSnapshot = {
  date: string;
  /** Raw board until the style-control switch, style-controlled after (what the site showed). */
  config: ArenaConfig;
  /** Every model ranked 1–3 in this snapshot (ties share a rank). */
  top: ArenaEntry[];
};
export type ArenaDataset = {
  retrieved: string;
  /** The last snapshot's board counts until this day (the day the dataset was read). */
  end: string;
  /** First snapshot drawn from the style-controlled board. */
  switchDate: string;
  snapshots: ArenaSnapshot[];
};

export function parseArena(json: unknown, where: string = FILES.arena): ArenaDataset {
  const o = record(json, where);
  const retrieved = date(o.retrieved, `${where}.retrieved`);
  const end = date(o.end, `${where}.end`);
  const switchDate = date(o.switchDate, `${where}.switchDate`);
  let prev = '';
  const snapshots = array(o.snapshots, `${where}.snapshots`, 2).map((raw, i): ArenaSnapshot => {
    const at = `${where}.snapshots[${i}]`;
    const s = record(raw, at);
    const d = date(s.date, `${at}.date`);
    if (d <= prev) fail(`${at}.date`, `${d} is not after ${prev}`);
    prev = d;
    const config = oneOf(s.config, ARENA_CONFIGS, `${at}.config`);
    if ((config === 'text_style_control') !== d >= switchDate) fail(`${at}.config`, `${config} on ${d} (switch ${switchDate})`);
    const top = array(s.top, `${at}.top`, 3).map((e, k): ArenaEntry => {
      const r = record(e, `${at}.top[${k}]`);
      return {
        rank: finite(r.rank, `${at}.top[${k}].rank`, 1, 3),
        model: string(r.model, `${at}.top[${k}].model`),
        org: string(r.org, `${at}.top[${k}].org`),
      };
    });
    if (top.filter((e) => e.rank === 1).length !== 1) fail(`${at}.top`, 'expected exactly one rank 1');
    return { date: d, config, top };
  });
  if (end < prev) fail(`${where}.end`, `${end} is before the last snapshot ${prev}`);
  return { retrieved, end, switchDate, snapshots };
}

const DAY_MS = 86_400_000;
export const daysBetween = (a: string, b: string): number => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);

/**
 * Days each organization held No. 1 and days it had a model in the top 3: a snapshot's board stands from its date to
 * the next snapshot (the last one until `end`).
 */
export function arenaDays(ds: ArenaDataset): { first: Map<string, number>; top3: Map<string, number>; total: number } {
  const first = new Map<string, number>();
  const top3 = new Map<string, number>();
  ds.snapshots.forEach((s, i) => {
    const days = daysBetween(s.date, ds.snapshots[i + 1]?.date ?? ds.end);
    const leader = s.top.find((e) => e.rank === 1)!.org;
    first.set(leader, (first.get(leader) ?? 0) + days);
    for (const org of new Set(s.top.map((e) => e.org))) top3.set(org, (top3.get(org) ?? 0) + days);
  });
  return { first, top3, total: daysBetween(ds.snapshots[0]!.date, ds.end) };
}

// ── The rule (docs/AI-MODELS-PLAN.md §2) ──────────────────────────────────────────────────────────

export const MIN_TOP3_DAYS = 30;
export const MIN_DERIVED = 100;

export type Candidate = { name: string; top3Days: number; derived: number };

/**
 * Every company the two tests can see: LMArena organizations (days in the top 3) and Epoch organizations (models that
 * descend from theirs). A hero is one company under all its names (Google = Google DeepMind + Google Research…);
 * any other organization stands for itself. Sorted by name.
 */
export function candidates(
  arena: ArenaDataset,
  lineage: ReturnType<typeof ancestorOrgs>,
  heroes: readonly HeroDef[],
): Candidate[] {
  const { top3 } = arenaDays(arena);
  const out = new Map<string, Candidate>();
  const get = (name: string): Candidate => {
    const c = out.get(name) ?? { name, top3Days: 0, derived: 0 };
    out.set(name, c);
    return c;
  };
  for (const h of heroes) get(h.id);
  for (const [org, days] of top3) get(heroes.find((h) => h.arenaOrg === org)?.id ?? org).top3Days += days;
  const epochOrgs = new Set(lineage.flatMap(({ orgs }) => [...orgs]));
  for (const org of epochOrgs) if (!heroOfOrgs([org], heroes)) get(org);
  for (const c of out.values()) {
    const hero = heroes.find((h) => h.id === c.name);
    c.derived = derivedFrom(lineage, hero ? hero.orgs : [c.name]).models;
  }
  return [...out.values()].sort((a, b) => (a.name < b.name ? -1 : 1));
}

export const passes = (c: Candidate): boolean => c.top3Days >= MIN_TOP3_DAYS || c.derived >= MIN_DERIVED;

/** Names of the companies the rule puts on the page. */
export const heroCriterion = (list: readonly Candidate[]): string[] => list.filter(passes).map((c) => c.name);

// ── releases.json (angle A) ────────────────────────────────────────────────────────────────────────

export type Hero = {
  id: string;
  name: string;
  lines: string;
  /** Date of the first model on the company's lane. */
  first: string;
  /** Evidence of the rule. */
  top3Days: number;
  derived: number;
  derivedOrgs: number;
};

export type Release = { model: string; hero: string; date: string; access: Access };

export type Rule = {
  arenaFrom: string;
  arenaTo: string;
  minTop3Days: number;
  minDerived: number;
  /** The best company outside the eight on each test. */
  nextTop3: { name: string; days: number };
  nextDerived: { name: string; models: number };
};

export type ReleasesDataset = {
  /** Epoch's own "last updated" date of the CSV. */
  epochUpdated: string;
  retrieved: string;
  /** Latest publication date in Epoch's file: the data run to this day. */
  through: string;
  rule: Rule;
  /** In the order of their first model (the lanes' order). */
  heroes: Hero[];
  /** Sorted by date, then by name. */
  rows: Release[];
};

function heroes(raw: unknown, at: string): Hero[] {
  const seen = new Set<string>();
  let prev = '';
  return array(raw, at, 1).map((h, i): Hero => {
    const a = `${at}[${i}]`;
    const o = record(h, a);
    const id = string(o.id, `${a}.id`, ID);
    if (seen.has(id)) fail(`${a}.id`, `duplicate ${id}`);
    seen.add(id);
    const first = date(o.first, `${a}.first`);
    if (first < prev) fail(`${a}.first`, 'heroes must be in the order of their first model');
    prev = first;
    return {
      id,
      name: string(o.name, `${a}.name`),
      lines: string(o.lines, `${a}.lines`),
      first,
      top3Days: count(o.top3Days, `${a}.top3Days`),
      derived: count(o.derived, `${a}.derived`),
      derivedOrgs: count(o.derivedOrgs, `${a}.derivedOrgs`),
    };
  });
}

function rule(raw: unknown, at: string): Rule {
  const o = record(raw, at);
  const t3 = record(o.nextTop3, `${at}.nextTop3`);
  const dv = record(o.nextDerived, `${at}.nextDerived`);
  return {
    arenaFrom: date(o.arenaFrom, `${at}.arenaFrom`),
    arenaTo: date(o.arenaTo, `${at}.arenaTo`),
    minTop3Days: count(o.minTop3Days, `${at}.minTop3Days`),
    minDerived: count(o.minDerived, `${at}.minDerived`),
    nextTop3: { name: string(t3.name, `${at}.nextTop3.name`), days: count(t3.days, `${at}.nextTop3.days`) },
    nextDerived: { name: string(dv.name, `${at}.nextDerived.name`), models: count(dv.models, `${at}.nextDerived.models`) },
  };
}

function header(o: Record<string, unknown>, where: string): { epochUpdated: string; retrieved: string; through: string } {
  return {
    epochUpdated: date(o.epochUpdated, `${where}.epochUpdated`),
    retrieved: date(o.retrieved, `${where}.retrieved`),
    through: date(o.through, `${where}.through`),
  };
}

export function parseReleases(json: unknown, where: string = FILES.releases): ReleasesDataset {
  const o = record(json, where);
  const head = header(o, where);
  const list = heroes(o.heroes, `${where}.heroes`);
  const ids = list.map((h) => h.id);
  let prev = '';
  const rows = array(o.rows, `${where}.rows`, 1).map((raw, i): Release => {
    const at = `${where}.rows[${i}]`;
    const r = record(raw, at);
    const d = date(r.date, `${at}.date`);
    const model = string(r.model, `${at}.model`);
    const key = `${d} ${model}`;
    if (key < prev) fail(at, 'rows must be sorted by date, then name');
    prev = key;
    if (d < `${FIRST_YEAR}-01-01` || d > head.through) fail(`${at}.date`, `${d} is outside ${FIRST_YEAR}…${head.through}`);
    return { model, hero: oneOf(r.hero, ids, `${at}.hero`), date: d, access: oneOf(r.access, ACCESS, `${at}.access`) };
  });
  for (const h of list) {
    const firstRow = rows.find((r) => r.hero === h.id);
    if (firstRow?.date !== h.first) fail(`${where}.heroes.${h.id}.first`, `${h.first} is not the date of its first model (${firstRow?.date})`);
  }
  return { ...head, rule: rule(o.rule, `${where}.rule`), heroes: list, rows };
}

/** A highlight that names none of the eight companies is no highlight. */
export const knownCompany = (list: readonly Pick<Hero, 'id'>[], id: string | null): string | null => (id && list.some((h) => h.id === id) ? id : null);

// ── Months and periods (angle A's brush and selects) ────────────────────────────────────────────────

/** 'YYYY-MM'. */
export type Month = string;
export const MONTH = /^(20\d\d)-(0[1-9]|1[0-2])$/;
export const monthOf = (iso: string): Month => iso.slice(0, 7);
export const monthIndex = (m: Month): number => Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7)) - 1;
export const monthAt = (index: number): Month => `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
/** First millisecond of the month (UTC). */
export const monthStartMs = (m: Month): number => Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1);
/** First millisecond after the month. */
export const monthEndMs = (m: Month): number => monthStartMs(monthAt(monthIndex(m) + 1));
/** The month a moment falls in. */
export const monthOfMs = (ms: number): Month => new Date(ms).toISOString().slice(0, 7);

/** Every month from `from` to `to`, inclusive. */
export function monthsBetween(from: Month, to: Month): Month[] {
  const out: Month[] = [];
  for (let i = monthIndex(from); i <= monthIndex(to); i++) out.push(monthAt(i));
  return out;
}

export type Period = { from: Month; to: Month };

/** The whole span of the data: January of the first year to the month of the last record. */
export const fullPeriod = (ds: Pick<ReleasesDataset, 'through'>): Period => ({ from: `${FIRST_YEAR}-01`, to: monthOf(ds.through) });

/** A requested period clipped to the data and put in order; a missing end takes the data's end. */
export function resolvePeriod(full: Period, from: Month | null, to: Month | null): Period {
  const lo = monthIndex(full.from);
  const hi = monthIndex(full.to);
  const clip = (m: Month | null, fallback: number): number => (m === null ? fallback : Math.min(hi, Math.max(lo, monthIndex(m))));
  const a = clip(from, lo);
  const b = clip(to, hi);
  return { from: monthAt(Math.min(a, b)), to: monthAt(Math.max(a, b)) };
}

export const isFull = (p: Period, full: Period): boolean => p.from === full.from && p.to === full.to;
/** Length of a period in months (a single month = 1). */
export const periodMonths = (p: Period): number => monthIndex(p.to) - monthIndex(p.from) + 1;

export const inPeriod = (iso: string, p: Period): boolean => {
  const m = monthOf(iso);
  return m >= p.from && m <= p.to;
};

export type LaneSummary = { hero: Hero; models: Release[]; open: number };

/** Each company's releases in the period (lanes order). */
export function laneSummaries(ds: ReleasesDataset, p: Period): LaneSummary[] {
  return ds.heroes.map((hero) => {
    const models = ds.rows.filter((r) => r.hero === hero.id && inPeriod(r.date, p));
    return { hero, models, open: models.filter((r) => r.access === 'open').length };
  });
}

// ── compute.json (angle B) ─────────────────────────────────────────────────────────────────────────

export type ComputeRow = {
  model: string;
  /** First listed organization; null = Epoch records none (2 models). */
  org: string | null;
  /** One of the eight (the same rule as the lanes, any domain), or null. */
  hero: string | null;
  date: string;
  /** Training compute, floating-point operations. */
  flop: number;
};

export type ComputeDataset = {
  epochUpdated: string;
  retrieved: string;
  through: string;
  /** All models Epoch lists since 2017 (with a figure or not). */
  models: number;
  /** Per company: [models with a compute figure, all its models] — closed labs rarely disclose. */
  disclosed: Record<string, [number, number]>;
  /** Sorted by date, then by name. */
  rows: ComputeRow[];
};

export function parseCompute(json: unknown, where: string = FILES.compute): ComputeDataset {
  const o = record(json, where);
  const head = header(o, where);
  const models = count(o.models, `${where}.models`);
  const d = record(o.disclosed, `${where}.disclosed`);
  const disclosed: Record<string, [number, number]> = {};
  for (const [id, v] of Object.entries(d)) {
    string(id, `${where}.disclosed key`, ID);
    const pair = array(v, `${where}.disclosed.${id}`, 2);
    const known = count(pair[0], `${where}.disclosed.${id}[0]`);
    const total = count(pair[1], `${where}.disclosed.${id}[1]`);
    if (known > total) fail(`${where}.disclosed.${id}`, `${known} of ${total}`);
    disclosed[id] = [known, total];
  }
  const ids = Object.keys(disclosed);
  let prev = '';
  const rows = array(o.rows, `${where}.rows`, 1).map((raw, i): ComputeRow => {
    const at = `${where}.rows[${i}]`;
    const r = record(raw, at);
    const dt = date(r.date, `${at}.date`);
    const model = string(r.model, `${at}.model`);
    const key = `${dt} ${model}`;
    if (key < prev) fail(at, 'rows must be sorted by date, then name');
    prev = key;
    if (dt < `${FIRST_YEAR}-01-01` || dt > head.through) fail(`${at}.date`, `${dt} is outside ${FIRST_YEAR}…${head.through}`);
    return {
      model,
      org: r.org === null ? null : string(r.org, `${at}.org`),
      hero: r.hero === null ? null : oneOf(r.hero, ids, `${at}.hero`),
      date: dt,
      flop: finite(r.flop, `${at}.flop`, 1, MAX_FLOP),
    };
  });
  if (rows.length > models) fail(`${where}.models`, `${models} is fewer than the rows with a figure (${rows.length})`);
  return { ...head, models, disclosed, rows };
}

/** 2024-07-02 → 2024.5: the year plus the share of it that has passed (UTC). */
export function decimalYear(iso: string): number {
  const y = Number(iso.slice(0, 4));
  const start = Date.UTC(y, 0, 1);
  const next = Date.UTC(y + 1, 0, 1);
  return y + (Date.parse(`${iso}T00:00:00Z`) - start) / (next - start);
}

export type Trend = { slope: number; intercept: number; perYear: number };

/** Least-squares line of log10(FLOP) on the decimal year; perYear = the growth factor a year (10^slope). */
export function computeTrend(rows: readonly Pick<ComputeRow, 'date' | 'flop'>[]): Trend {
  const xs = rows.map((r) => decimalYear(r.date));
  const ys = rows.map((r) => Math.log10(r.flop));
  const n = xs.length;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i]! - mx) * (ys[i]! - my);
    sxx += (xs[i]! - mx) ** 2;
  }
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx, perYear: 10 ** slope };
}

/** The largest training run (the first one listed on a tie). */
export const largest = (rows: readonly ComputeRow[]): ComputeRow => rows.reduce((a, b) => (b.flop > a.flop ? b : a));

// ── origins.json (angle F) ─────────────────────────────────────────────────────────────────────────

export const SPLITS = ['country', 'access'] as const;
export type Split = (typeof SPLITS)[number];
export const SEGMENTS: { country: readonly Origin[]; access: readonly Access[] } = { country: ORIGINS, access: ACCESS };

export type OriginsDataset = {
  epochUpdated: string;
  retrieved: string;
  through: string;
  years: number[];
  /** Language and multimodal models a year, by the developer's country (first listed). */
  country: Record<Origin, number[]>;
  /** The same models by access to the weights. */
  access: Record<Access, number[]>;
};

function yearCounts<K extends string>(raw: unknown, at: string, keys: readonly K[], n: number): Record<K, number[]> {
  const o = record(raw, at);
  return Object.fromEntries(
    keys.map((k) => {
      const a = array(o[k], `${at}.${k}`, n);
      if (a.length !== n) fail(`${at}.${k}`, `${a.length} values, expected ${n}`);
      return [k, a.map((v, i) => count(v, `${at}.${k}[${i}]`))];
    }),
  ) as Record<K, number[]>;
}

export function parseOrigins(json: unknown, where: string = FILES.origins): OriginsDataset {
  const o = record(json, where);
  const head = header(o, where);
  const years = array(o.years, `${where}.years`, 2).map((v, i) => finite(v, `${where}.years[${i}]`, FIRST_YEAR, 2100));
  years.forEach((y, i) => {
    if (i > 0 && y !== years[i - 1]! + 1) fail(`${where}.years`, 'years must be consecutive');
  });
  if (years[0] !== FIRST_YEAR) fail(`${where}.years`, `must start in ${FIRST_YEAR}`);
  if (years.at(-1) !== Number(head.through.slice(0, 4))) fail(`${where}.years`, `must end in the year of ${head.through}`);
  const country = yearCounts(o.country, `${where}.country`, ORIGINS, years.length);
  const access = yearCounts(o.access, `${where}.access`, ACCESS, years.length);
  years.forEach((y, i) => {
    const a = ORIGINS.reduce((s, k) => s + country[k][i]!, 0);
    const b = ACCESS.reduce((s, k) => s + access[k][i]!, 0);
    if (a !== b) fail(`${where}`, `${y}: ${a} models by country, ${b} by access`);
  });
  return { ...head, years, country, access };
}

/** Models in a year (any split adds up to the same total). */
export const yearTotal = (ds: OriginsDataset, i: number): number => ORIGINS.reduce((s, k) => s + ds.country[k][i]!, 0);

/** The last year is partial when the data stop before 31 December. */
export const partialYear = (ds: Pick<OriginsDataset, 'through'>): boolean => !ds.through.endsWith('-12-31');

// ── CHANGED (S3-ai2): LMArena No. 1 runs (angle C) ──────────────────────────────────────────────────

/** A stretch of consecutive snapshots with the same model at No. 1 (to = the next leader's first day). */
export type ArenaRun = { from: string; to: string; model: string; org: string; days: number };

export function arenaRuns(ds: ArenaDataset): ArenaRun[] {
  const out: ArenaRun[] = [];
  ds.snapshots.forEach((s, i) => {
    const leader = s.top.find((e) => e.rank === 1)!;
    const to = ds.snapshots[i + 1]?.date ?? ds.end;
    const last = out.at(-1);
    if (last && last.model === leader.model && last.org === leader.org) {
      last.to = to;
      last.days = daysBetween(last.from, to);
    } else out.push({ from: s.date, to, model: leader.model, org: leader.org, days: daysBetween(s.date, to) });
  });
  return out;
}

/** Stretches in which an organization had at least one model in the top 3 (merged across snapshots). */
export function top3Spans(ds: ArenaDataset, org: string): Array<{ from: string; to: string }> {
  const out: Array<{ from: string; to: string }> = [];
  ds.snapshots.forEach((s, i) => {
    if (!s.top.some((e) => e.org === org)) return;
    const to = ds.snapshots[i + 1]?.date ?? ds.end;
    const last = out.at(-1);
    if (last && last.to === s.date) last.to = to;
    else out.push({ from: s.date, to });
  });
  return out;
}

export type ArenaLeader = { org: string; first: number; top3: number; runs: ArenaRun[] };

/** Every organization that held No. 1: its days at No. 1, days in the top 3 and its runs — most days first. */
export function arenaLeaders(ds: ArenaDataset): ArenaLeader[] {
  const days = arenaDays(ds);
  const runs = arenaRuns(ds);
  return [...days.first]
    .map(([org, first]) => ({ org, first, top3: days.top3.get(org) ?? 0, runs: runs.filter((r) => r.org === org) }))
    .sort((a, b) => b.first - a.first || (a.org < b.org ? -1 : 1));
}

// ── CHANGED (S3-ai2): claims.json (angle D) ──────────────────────────────────────────────────────────

/** What a company counts. Never joined across metrics: a weekly user is not a monthly user. */
export const METRICS = ['weekly_active', 'monthly_active', 'monthly_in_apps', 'monthly_family', 'monthly_incl_x'] as const;
export type Metric = (typeof METRICS)[number];
/** The chart's mark for a metric: ● weekly, ■ monthly in the product's own app, ▲ monthly inside other products. */
export type MetricShape = 'circle' | 'square' | 'triangle';
export const METRIC_SHAPE: Record<Metric, MetricShape> = {
  weekly_active: 'circle',
  monthly_active: 'square',
  monthly_in_apps: 'triangle',
  monthly_family: 'triangle',
  monthly_incl_x: 'triangle',
};
/** How the company phrased the number: "700 million" · "more than 800 million" · "almost a billion" · "approximately". */
export const QUALIFIERS = ['exact', 'more_than', 'almost', 'about'] as const;
export type Qualifier = (typeof QUALIFIERS)[number];

export type Claim = {
  /** The day the figure refers to. */
  asOf: string;
  /** Publication date (YYYY-MM-DD, or YYYY-MM when the filing gives a month only). */
  published: string;
  product: string;
  /** The company as it names itself (Microsoft is not one of the eight). */
  company: string;
  /** One of the eight, or null. */
  hero: string | null;
  value: number;
  qualifier: Qualifier;
  metric: Metric;
  /** First-party page (https). */
  url: string;
  /** The company's own sentence, verbatim. */
  quote: string;
  retrieved: string;
};

export type ClaimsDataset = {
  retrieved: string;
  /** Sorted by product, then by the day the figure refers to. */
  claims: Claim[];
};

const PUBLISHED = /^\d{4}-\d{2}(-\d{2})?$/;
const PRODUCT = /^[a-z][a-z0-9-]{0,23}$/;

export function parseClaims(json: unknown, where: string = FILES.claims): ClaimsDataset {
  const o = record(json, where);
  const retrieved = date(o.retrieved, `${where}.retrieved`);
  let prev = '';
  const claims = array(o.claims, `${where}.claims`, 1).map((raw, i): Claim => {
    const at = `${where}.claims[${i}]`;
    const c = record(raw, at);
    const asOf = date(c.asOf, `${at}.asOf`);
    const product = string(c.product, `${at}.product`, PRODUCT);
    const key = `${product} ${asOf}`;
    if (key < prev) fail(at, 'claims must be sorted by product, then date');
    prev = key;
    const published = string(c.published, `${at}.published`, PUBLISHED);
    if (published.slice(0, 7) < asOf.slice(0, 7)) fail(`${at}.published`, `${published} is before the figure's date ${asOf}`);
    const url = string(c.url, `${at}.url`, /^https:\/\/[^\s]+$/);
    const value = finite(c.value, `${at}.value`, 1e6, 1e10);
    return {
      asOf,
      published,
      product,
      company: string(c.company, `${at}.company`),
      hero: c.hero === null ? null : string(c.hero, `${at}.hero`, ID),
      value,
      qualifier: oneOf(c.qualifier, QUALIFIERS, `${at}.qualifier`),
      metric: oneOf(c.metric, METRICS, `${at}.metric`),
      url,
      quote: string(c.quote, `${at}.quote`),
      retrieved: date(c.retrieved, `${at}.retrieved`),
    };
  });
  return { retrieved, claims };
}

export type ClaimSeries = { key: string; product: string; metric: Metric; hero: string | null; company: string; claims: Claim[] };

/** One line per product AND metric — the only points a line may join. */
export function claimSeries(ds: ClaimsDataset): ClaimSeries[] {
  const out = new Map<string, ClaimSeries>();
  for (const c of ds.claims) {
    const key = `${c.product}:${c.metric}`;
    const s = out.get(key) ?? { key, product: c.product, metric: c.metric, hero: c.hero, company: c.company, claims: [] };
    s.claims.push(c);
    out.set(key, s);
  }
  return [...out.values()];
}

/** Companies of the eight with no first-party user count in the file (in the lanes' order). */
export const silentCompanies = (heroes: readonly Pick<Hero, 'id' | 'name'>[], ds: ClaimsDataset): string[] =>
  heroes.filter((h) => !ds.claims.some((c) => c.hero === h.id)).map((h) => h.name);

// ── CHANGED (S3-ai2): lineage.json (angle E) ─────────────────────────────────────────────────────────

/**
 * A model in a company's family tree: `parent` = the base model it names that leads to the company (null = the
 * company's own model at the root). Derived models are the nodes with a parent — the rule's count.
 */
export type LineageNode = { model: string; org: string | null; date: string; parent: string | null };

export type LineageHero = {
  id: string;
  /** Models descending from the company's models (as releases.json's `derived`). */
  derived: number;
  /** Other organizations among their makers. */
  orgs: number;
  /** Derived models by publication year (the dataset's `years`). */
  byYear: number[];
  /** Roots first (by name), then the derived models by date, then name. */
  nodes: LineageNode[];
};

export type LineageDataset = { epochUpdated: string; retrieved: string; through: string; years: number[]; heroes: LineageHero[] };

/**
 * A company's tree from the Epoch rows: every model whose base-model chain leads to one of `names` (ancestorOrgs),
 * hung under the first base that leads there; roots are the company's own models those chains start from.
 */
export function lineageTree(models: readonly EpochModel[], names: readonly string[], years: readonly number[]): Omit<LineageHero, 'id'> {
  const lineage = ancestorOrgs(models);
  const byName = new Map<string, EpochModel>();
  for (const m of models) if (!byName.has(m.model)) byName.set(m.model, m);
  const derived = lineage.filter(({ orgs }) => [...orgs].some((o) => names.includes(o))).map(({ model }) => model);
  const derivedNames = new Set(derived.map((m) => m.model));
  const own = (n: string): boolean => (byName.get(n)?.orgs ?? []).some((o) => names.includes(o));
  const roots = new Set<string>();
  const nodes: LineageNode[] = derived.map((m) => {
    const parent = m.bases.find((b) => derivedNames.has(b) || own(b)) ?? m.bases[0]!;
    if (!derivedNames.has(parent)) roots.add(parent);
    return { model: m.model, org: m.orgs[0] ?? null, date: m.date, parent };
  });
  const makers = new Set<string>();
  for (const m of derived) for (const o of m.orgs) if (!names.includes(o)) makers.add(o);
  const byYear = years.map((y) => derived.filter((m) => Number(m.date.slice(0, 4)) === y).length);
  const rootNodes: LineageNode[] = [...roots].sort().map((r) => {
    const m = byName.get(r);
    return { model: r, org: m?.orgs[0] ?? null, date: m?.date ?? '', parent: null };
  });
  const sorted = nodes.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.model < b.model ? -1 : a.model > b.model ? 1 : 0));
  return { derived: derived.length, orgs: makers.size, byYear, nodes: [...rootNodes, ...sorted] };
}

export function parseLineage(json: unknown, where: string = FILES.lineage): LineageDataset {
  const o = record(json, where);
  const head = header(o, where);
  const years = array(o.years, `${where}.years`, 2).map((v, i) => finite(v, `${where}.years[${i}]`, FIRST_YEAR, 2100));
  if (years[0] !== FIRST_YEAR || years.some((y, i) => i > 0 && y !== years[i - 1]! + 1)) fail(`${where}.years`, `must run year by year from ${FIRST_YEAR}`);
  if (years.at(-1) !== Number(head.through.slice(0, 4))) fail(`${where}.years`, `must end in the year of ${head.through}`);
  const seen = new Set<string>();
  const list = array(o.heroes, `${where}.heroes`, 1).map((raw, i): LineageHero => {
    const at = `${where}.heroes[${i}]`;
    const h = record(raw, at);
    const id = string(h.id, `${at}.id`, ID);
    if (seen.has(id)) fail(`${at}.id`, `duplicate ${id}`);
    seen.add(id);
    const derived = count(h.derived, `${at}.derived`);
    const byYear = array(h.byYear, `${at}.byYear`, years.length).map((v, k) => count(v, `${at}.byYear[${k}]`));
    if (byYear.length !== years.length) fail(`${at}.byYear`, `${byYear.length} values, expected ${years.length}`);
    const nodes = array(h.nodes, `${at}.nodes`).map((n, k): LineageNode => {
      const a = `${at}.nodes[${k}]`;
      const r = record(n, a);
      const parent = r.parent === null ? null : string(r.parent, `${a}.parent`);
      return {
        model: string(r.model, `${a}.model`),
        org: r.org === null ? null : string(r.org, `${a}.org`),
        // A root Epoch does not list has no date.
        date: parent === null && r.date === '' ? '' : date(r.date, `${a}.date`),
        parent,
      };
    });
    const names = new Set(nodes.map((n) => n.model));
    nodes.forEach((n, k) => {
      if (n.parent !== null && !names.has(n.parent)) fail(`${at}.nodes[${k}].parent`, `${n.parent} is not in the tree`);
    });
    const withParent = nodes.filter((n) => n.parent !== null).length;
    if (withParent !== derived) fail(`${at}.derived`, `${derived}, but ${withParent} models have a parent`);
    if (byYear.reduce((s, v) => s + v, 0) !== derived) fail(`${at}.byYear`, `adds up to ${byYear.reduce((s, v) => s + v, 0)}, not ${derived}`);
    return { id, derived, orgs: count(h.orgs, `${at}.orgs`), byYear, nodes };
  });
  return { ...head, years, heroes: list };
}

/** A tree node for the page: the model, its maker, its date, and every model built on it. */
export type FamilyNode = { model: string; org: string | null; date: string; children: FamilyNode[]; /** Descendants at any depth. */ size: number };

/** The company's models that others built on, each with its descendants (biggest families first). Cycles are cut. */
export function familyTrees(h: LineageHero): FamilyNode[] {
  const kids = new Map<string, LineageNode[]>();
  for (const n of h.nodes) if (n.parent !== null) kids.set(n.parent, [...(kids.get(n.parent) ?? []), n]);
  const seen = new Set<string>();
  const build = (n: LineageNode): FamilyNode => {
    seen.add(n.model);
    const children = (kids.get(n.model) ?? []).filter((c) => !seen.has(c.model)).map(build);
    children.sort((a, b) => b.size - a.size || (a.model < b.model ? -1 : 1));
    return { model: n.model, org: n.org, date: n.date, children, size: children.reduce((s, c) => s + 1 + c.size, 0) };
  };
  return h.nodes
    .filter((n) => n.parent === null)
    .map(build)
    .sort((a, b) => b.size - a.size || (a.model < b.model ? -1 : 1));
}

// ── check:data ────────────────────────────────────────────────────────────────────────────────────

/** Validates one shipped file with the parser the page uses (scripts/check-data.ts). */
export function validateDataFile(file: string, json: unknown): void {
  if (file === FILES.releases) parseReleases(json, file);
  else if (file === FILES.compute) parseCompute(json, file);
  else if (file === FILES.origins) parseOrigins(json, file);
  else if (file === FILES.arena) parseArena(json, file);
  else if (file === FILES.claims) parseClaims(json, file); // CHANGED (S3-ai2)
  else if (file === FILES.lineage) parseLineage(json, file);
  else fail(file, `no parser for this file (expected one of ${DATA_FILES.join(', ')})`);
}
