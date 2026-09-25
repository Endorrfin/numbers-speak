// data.ts — the air-attacks dataset contract: types, the parsers (prep, check:data, browser) and pure derivations
// (day / week / month buckets, interception rates, the largest reports, per-model totals, civilian harm).
// Derived values are never stored. CHANGED (S3-aa): new entry.
import { array, fail, finite, oneOf, record, string } from '../../lib/dataset';

export const DATA_FILE = 'attacks-2022-2026.json';
export const CIVILIANS_FILE = 'civilians-hrmmu-2023-2026.json';
export const DATA_FILES = [DATA_FILE, CIVILIANS_FILE] as const;

/**
 * Weapon classes. Missiles are grouped by how they fly (the Air Force often reports several models as one
 * number, so exact models are ambiguous but classes are not):
 *   cruise    — Kh-101/555, Kalibr, Iskander-K, Kh-59/69, Kh-35, Banderol
 *   ballistic — Iskander-M, KN-23, S-300/S-400 used against ground targets, Kh-47M2 Kinzhal (aeroballistic)
 *   antiship  — Kh-22/32, P-800 Oniks, 3M22 Zircon (supersonic anti-ship missiles used against land targets)
 *   other     — Kh-31P anti-radiation missiles and missiles whose type was not given
 *   mixed     — one reported number that covers missiles of several classes
 *   drones    — Shahed-type attack drones and decoys (reported together), drones whose type was not given
 */
export const MISSILE_CLASSES = ['cruise', 'ballistic', 'antiship', 'other', 'mixed'] as const;
export type MissileClass = (typeof MISSILE_CLASSES)[number];
export const CLASSES = [...MISSILE_CLASSES, 'drones'] as const;
export type WeaponClass = (typeof CLASSES)[number];
export const isMissileClass = (c: WeaponClass): c is MissileClass => c !== 'drones';

/**
 * Why an item is left out of interception rates:
 *   launched-hidden   — the Air Force stopped giving the number launched (from 10 Aug 2026 for some missile
 *                       types); the stored number is what was reported, a lower bound
 *   destroyed-missing — the number destroyed was not given
 */
export const ITEM_NOTES = ['launched-hidden', 'destroyed-missing'] as const;
export type ItemNote = (typeof ITEM_NOTES)[number];

/** One weapon class within one report. `lost` = "locationally lost" (usually electronic warfare). */
export type Item = { class: WeaponClass; launched: number; destroyed: number; lost: number; note?: ItemNote };

/** One Air Force report (one post, usually one night: 18:00 → 08:00); `date` = the day the attack ended. */
export type Report = { date: string; start: string; end: string; items: Item[] };

/** Launched per model (as the source spells it; combined models joined with " and ") per year. */
export type ModelTotal = { model: string; class: WeaponClass; years: Record<string, number> };

export type AttacksDataset = {
  unit: 'weapons';
  /** First and last report date, YYYY-MM-DD. */
  first: string;
  last: string;
  /** From this date some missile types are reported without the number launched. */
  hiddenFrom: string;
  /** Ascending by date, then start. */
  reports: Report[];
  models: ModelTotal[];
};

export type HarmCount = { killed: number; injured: number };
export type CivilianYear = {
  year: number;
  /** Months covered, 1–12 (2026: 1–8). */
  fromMonth: number;
  toMonth: number;
  total: HarmCount;
  /** Missiles and long-range (loitering) drones — absent when not published for the year. */
  longRange?: HarmCount;
  shortDrones?: HarmCount;
  /** monthly-sum — the breakdown is the sum of the monthly updates (not yet revised in an annual report). */
  note?: 'monthly-sum';
  source: string;
};
export type CiviliansDataset = { unit: 'persons'; years: CivilianYear[] };

// ── Parsers ─────────────────────────────────────────────────────────────────────────────────────────
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const STAMP = /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2})?$/;
const MAX = 2_000; // no report ever listed 2,000 weapons of one class; catches a unit or parsing slip

const count = (v: unknown, where: string, max = MAX): number => {
  const n = finite(v, where, 0, max);
  if (!Number.isInteger(n)) fail(where, 'integer expected');
  return n;
};
const date = (v: unknown, where: string): string => {
  const s = string(v, where, DATE);
  const ms = Date.parse(`${s}T00:00:00Z`);
  if (Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== s) fail(where, `'${s}' is not a calendar date`);
  return s;
};

export function parseAttacks(json: unknown, where = DATA_FILE): AttacksDataset {
  const o = record(json, where);
  if (o.unit !== 'weapons') fail(`${where}.unit`, "'weapons' expected");
  const first = date(o.first, `${where}.first`);
  const last = date(o.last, `${where}.last`);
  const hiddenFrom = date(o.hiddenFrom, `${where}.hiddenFrom`);
  if (first > last) fail(where, 'first > last');

  let prev = '';
  const reports = array(o.reports, `${where}.reports`, 1).map((raw, i): Report => {
    const at = `${where}.reports[${i}]`;
    const r = record(raw, at);
    const d = date(r.date, `${at}.date`);
    if (d < first || d > last) fail(`${at}.date`, `${d} is outside ${first}…${last}`);
    const start = string(r.start, `${at}.start`, STAMP);
    const end = string(r.end, `${at}.end`, STAMP);
    if (end.slice(0, 10) !== d) fail(`${at}.date`, 'must equal the date of `end`');
    if (start > end) fail(at, 'start after end');
    const key = `${d} ${start}`;
    if (key < prev) fail(at, 'reports must be sorted by date, then start');
    prev = key;
    const items = array(r.items, `${at}.items`, 1).map((rawItem, j): Item => {
      const ia = `${at}.items[${j}]`;
      const it = record(rawItem, ia);
      const launched = count(it.launched, `${ia}.launched`);
      const destroyed = count(it.destroyed, `${ia}.destroyed`);
      const lost = it.lost === undefined ? 0 : count(it.lost, `${ia}.lost`);
      if (destroyed + lost > launched) fail(ia, 'destroyed + lost exceed launched');
      const item: Item = { class: oneOf(it.class, CLASSES, `${ia}.class`), launched, destroyed, lost };
      if (it.note !== undefined) item.note = oneOf(it.note, ITEM_NOTES, `${ia}.note`);
      return item;
    });
    return { date: d, start, end, items };
  });

  const y0 = Number(first.slice(0, 4));
  const y1 = Number(last.slice(0, 4));
  const models = array(o.models, `${where}.models`, 1).map((raw, i): ModelTotal => {
    const at = `${where}.models[${i}]`;
    const m = record(raw, at);
    const years = record(m.years, `${at}.years`);
    const out: Record<string, number> = {};
    for (const [y, v] of Object.entries(years)) {
      if (!/^\d{4}$/.test(y) || Number(y) < y0 || Number(y) > y1) fail(`${at}.years`, `year ${y} out of range`);
      out[y] = count(v, `${at}.years.${y}`, 1_000_000);
    }
    return { model: string(m.model, `${at}.model`), class: oneOf(m.class, CLASSES, `${at}.class`), years: out };
  });
  return { unit: 'weapons', first, last, hiddenFrom, reports, models };
}

const harm = (v: unknown, where: string): HarmCount => {
  const o = record(v, where);
  return { killed: count(o.killed, `${where}.killed`, 1e6), injured: count(o.injured, `${where}.injured`, 1e6) };
};

export function parseCivilians(json: unknown, where = CIVILIANS_FILE): CiviliansDataset {
  const o = record(json, where);
  if (o.unit !== 'persons') fail(`${where}.unit`, "'persons' expected");
  let prev = 0;
  const years = array(o.years, `${where}.years`, 1).map((raw, i): CivilianYear => {
    const at = `${where}.years[${i}]`;
    const r = record(raw, at);
    const year = count(r.year, `${at}.year`, 2100);
    if (year <= prev) fail(`${at}.year`, 'years must be ascending');
    prev = year;
    const fromMonth = count(r.fromMonth, `${at}.fromMonth`, 12);
    const toMonth = count(r.toMonth, `${at}.toMonth`, 12);
    if (fromMonth < 1 || toMonth < fromMonth) fail(at, 'months must be 1…12 and ascending');
    const total = harm(r.total, `${at}.total`);
    const out: CivilianYear = { year, fromMonth, toMonth, total, source: string(r.source, `${at}.source`, /^https:\/\//) };
    if (r.longRange !== undefined) out.longRange = harm(r.longRange, `${at}.longRange`);
    if (r.shortDrones !== undefined) out.shortDrones = harm(r.shortDrones, `${at}.shortDrones`);
    for (const k of ['killed', 'injured'] as const) {
      if ((out.longRange?.[k] ?? 0) + (out.shortDrones?.[k] ?? 0) > total[k]) fail(at, `parts exceed the total (${k})`);
    }
    if (r.note !== undefined) out.note = oneOf(r.note, ['monthly-sum'] as const, `${at}.note`);
    return out;
  });
  return { unit: 'persons', years };
}

/** check:data hook (scripts/check-data.ts). */
export function validateDataFile(file: string, json: unknown): void {
  if (file === DATA_FILE) parseAttacks(json, file);
  else if (file === CIVILIANS_FILE) parseCivilians(json, file);
  else fail(file, `no parser for this file (expected ${DATA_FILES.join(' or ')})`);
}

// ── Dates and buckets ───────────────────────────────────────────────────────────────────────────────
export const STEPS = ['month', 'week', 'day'] as const;
export type Step = (typeof STEPS)[number];

const DAY = 86_400_000;
export const toMs = (d: string): number => Date.parse(`${d}T00:00:00Z`);
export const toDate = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** First day of the bucket that holds `d` (weeks start on Monday). */
export function bucketStart(d: string, step: Step): string {
  if (step === 'day') return d;
  if (step === 'month') return `${d.slice(0, 7)}-01`;
  const ms = toMs(d);
  const dow = (new Date(ms).getUTCDay() + 6) % 7; // Monday = 0
  return toDate(ms - dow * DAY);
}

/** First day of the next bucket. */
export function nextBucket(start: string, step: Step): string {
  if (step === 'day') return toDate(toMs(start) + DAY);
  if (step === 'week') return toDate(toMs(start) + 7 * DAY);
  const y = Number(start.slice(0, 4));
  const m = Number(start.slice(5, 7));
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
}

export type Totals = {
  launched: number;
  destroyed: number;
  lost: number;
  /** The part used for interception rates (items without a note). */
  ratedLaunched: number;
  ratedDestroyed: number;
  ratedLost: number;
};
export const emptyTotals = (): Totals => ({ launched: 0, destroyed: 0, lost: 0, ratedLaunched: 0, ratedDestroyed: 0, ratedLost: 0 });

export function addItem(t: Totals, it: Item): void {
  t.launched += it.launched;
  t.destroyed += it.destroyed;
  t.lost += it.lost;
  if (!it.note) {
    t.ratedLaunched += it.launched;
    t.ratedDestroyed += it.destroyed;
    t.ratedLost += it.lost;
  }
}

export function sumTotals(list: readonly Totals[]): Totals {
  const out = emptyTotals();
  for (const t of list) {
    out.launched += t.launched;
    out.destroyed += t.destroyed;
    out.lost += t.lost;
    out.ratedLaunched += t.ratedLaunched;
    out.ratedDestroyed += t.ratedDestroyed;
    out.ratedLost += t.ratedLost;
  }
  return out;
}

export type Bucket = {
  /** First day, YYYY-MM-DD. */
  start: string;
  /** First day of the next bucket (exclusive). */
  end: string;
  /** The bucket reaches outside the period or the data (first or last month, week…). */
  partial: boolean;
  byClass: Record<WeaponClass, Totals>;
  missiles: Totals;
  drones: Totals;
};

/** 'all' or a calendar year. */
export type Period = 'all' | number;

export function periodRange(ds: Pick<AttacksDataset, 'first' | 'last'>, period: Period): { from: string; to: string } {
  if (period === 'all') return { from: ds.first, to: ds.last };
  const from = `${period}-01-01` < ds.first ? ds.first : `${period}-01-01`;
  const to = `${period}-12-31` > ds.last ? ds.last : `${period}-12-31`;
  return { from, to };
}

export const yearsOf = (ds: Pick<AttacksDataset, 'first' | 'last'>): number[] => {
  const out: number[] = [];
  for (let y = Number(ds.first.slice(0, 4)); y <= Number(ds.last.slice(0, 4)); y++) out.push(y);
  return out;
};

export const reportsIn = (ds: AttacksDataset, from: string, to: string): Report[] =>
  ds.reports.filter((r) => r.date >= from && r.date <= to);

/** Contiguous buckets over the period (empty ones included, so gaps show as gaps, not as missing bars). */
export function aggregate(ds: AttacksDataset, step: Step, period: Period): Bucket[] {
  const { from, to } = periodRange(ds, period);
  const buckets: Bucket[] = [];
  const index = new Map<string, Bucket>();
  for (let s = bucketStart(from, step); s <= to; s = nextBucket(s, step)) {
    const end = nextBucket(s, step);
    const byClass = Object.fromEntries(CLASSES.map((c) => [c, emptyTotals()])) as Record<WeaponClass, Totals>;
    const b: Bucket = { start: s, end, partial: s < from || toDate(toMs(end) - DAY) > to, byClass, missiles: emptyTotals(), drones: emptyTotals() };
    buckets.push(b);
    index.set(s, b);
  }
  for (const r of reportsIn(ds, from, to)) {
    const b = index.get(bucketStart(r.date, step));
    if (!b) continue;
    for (const it of r.items) {
      addItem(b.byClass[it.class], it);
      addItem(isMissileClass(it.class) ? b.missiles : b.drones, it);
    }
  }
  return buckets;
}

// ── Rates ───────────────────────────────────────────────────────────────────────────────────────────
/**
 * Share stopped = (shot down + locationally lost) / launched, over rated items. One measure on purpose: from
 * Jul 2024 to Jul 2025 the Air Force gave "locationally lost" (electronic warfare) as a separate number, from
 * Aug 2025 it reports "shot down or suppressed" as one — only the sum compares across the whole period.
 * null when fewer than `min` rated weapons (too few for a stable share).
 */
export function rate(t: Totals, min = 1): number | null {
  if (t.ratedLaunched < Math.max(1, min)) return null;
  return (t.ratedDestroyed + t.ratedLost) / t.ratedLaunched;
}

/** Months with fewer rated weapons of a class get no point on the interception chart. */
export const RATE_MIN = 10;

// ── Reports ─────────────────────────────────────────────────────────────────────────────────────────
export type ReportTotals = {
  report: Report;
  byClass: Record<WeaponClass, number>;
  missiles: number;
  drones: number;
  total: number;
  destroyed: number;
  /** CHANGED (S3-aa fix): locationally lost (reported separately Jul 2024 – Jul 2025). */
  lost: number;
  /** CHANGED (S3-aa fix): shot down or suppressed = destroyed + lost — the one measure of angles A and C. */
  stopped: number;
  /**
   * CHANGED (S3-aa fix): `rate()` of the report — (destroyed + lost) / launched over rated items only, exactly
   * like angle C; null when no item is rated (e.g. launched numbers withheld from 10 Aug 2026).
   */
  stoppedShare: number | null;
};

export function reportTotals(report: Report): ReportTotals {
  const byClass = Object.fromEntries(CLASSES.map((c) => [c, 0])) as Record<WeaponClass, number>;
  const totals = emptyTotals(); // CHANGED (S3-aa fix): the same accumulator as the buckets of A and C
  for (const it of report.items) {
    byClass[it.class] += it.launched;
    addItem(totals, it);
  }
  const drones = byClass.drones;
  const missiles = MISSILE_CLASSES.reduce((s, c) => s + byClass[c], 0);
  return {
    report,
    byClass,
    missiles,
    drones,
    total: missiles + drones,
    destroyed: totals.destroyed,
    lost: totals.lost,
    stopped: totals.destroyed + totals.lost,
    stoppedShare: rate(totals),
  };
}

export const RANKS = ['total', 'missiles', 'drones'] as const;
export type Rank = (typeof RANKS)[number];

/** The `n` largest reports of the period by the chosen measure; ties → the earlier report first. */
export function largestReports(ds: AttacksDataset, period: Period, rank: Rank, n: number): ReportTotals[] {
  const { from, to } = periodRange(ds, period);
  return reportsIn(ds, from, to)
    .map(reportTotals)
    .filter((r) => r[rank] > 0)
    .sort((a, b) => b[rank] - a[rank] || (a.report.date < b.report.date ? -1 : a.report.date > b.report.date ? 1 : 0))
    .slice(0, n);
}

// ── Models ──────────────────────────────────────────────────────────────────────────────────────────
export type ModelRow = { model: string; class: WeaponClass; launched: number };

/** Launched per model over the period (years), largest first; zero rows dropped. */
export function modelTotals(ds: AttacksDataset, period: Period, classes: readonly WeaponClass[] = CLASSES): ModelRow[] {
  return ds.models
    .filter((m) => classes.includes(m.class))
    .map((m) => ({
      model: m.model,
      class: m.class,
      launched: period === 'all' ? Object.values(m.years).reduce((s, v) => s + v, 0) : (m.years[String(period)] ?? 0),
    }))
    .filter((m) => m.launched > 0)
    .sort((a, b) => b.launched - a.launched || a.model.localeCompare(b.model));
}

// ── Summary (KPI row) ───────────────────────────────────────────────────────────────────────────────
export type Summary = {
  from: string;
  to: string;
  missiles: Totals;
  drones: Totals;
  byClass: Record<WeaponClass, Totals>;
  largest: ReportTotals | null;
  /** Nights / days with at least one report. */
  days: number;
};

export function summarize(ds: AttacksDataset, period: Period): Summary {
  const { from, to } = periodRange(ds, period);
  const list = reportsIn(ds, from, to);
  const byClass = Object.fromEntries(CLASSES.map((c) => [c, emptyTotals()])) as Record<WeaponClass, Totals>;
  const missiles = emptyTotals();
  const drones = emptyTotals();
  const days = new Set<string>();
  for (const r of list) {
    days.add(r.date);
    for (const it of r.items) {
      addItem(byClass[it.class], it);
      addItem(isMissileClass(it.class) ? missiles : drones, it);
    }
  }
  const largest = largestReports(ds, period, 'total', 1)[0] ?? null;
  return { from, to, missiles, drones, byClass, largest, days: days.size };
}

// ── Civilians ───────────────────────────────────────────────────────────────────────────────────────
export const WHO = ['all', 'killed', 'injured'] as const;
export type Who = (typeof WHO)[number];

export const harmOf = (h: HarmCount | undefined, who: Who): number | undefined =>
  h === undefined ? undefined : who === 'all' ? h.killed + h.injured : h[who];

/** Weapons launched in the months a civilian row covers (for "casualties per 100 weapons"). */
export function launchedInMonths(ds: AttacksDataset, year: number, fromMonth: number, toMonth: number): Totals {
  const from = `${year}-${String(fromMonth).padStart(2, '0')}-01`;
  const to = `${year}-${String(toMonth).padStart(2, '0')}-31`;
  const t = emptyTotals();
  for (const r of reportsIn(ds, from, to)) for (const it of r.items) addItem(t, it);
  return t;
}

/** The civilian row covers months the attack data does not (e.g. 2022 before 28 Sep) — no per-weapon ratio then. */
export const coversAttackData = (ds: AttacksDataset, c: CivilianYear): boolean =>
  `${c.year}-${String(c.fromMonth).padStart(2, '0')}-01` >= ds.first.slice(0, 8) + '01' &&
  `${c.year}-${String(c.toMonth).padStart(2, '0')}-01` <= ds.last.slice(0, 8) + '01';
