// data.ts — CHANGED (S3-oil): the oil entry's dataset contract — four files, one parser each (prep, check:data and
// the browser use the same code), and the pure derivations the five angles draw.
//
//   consumption.json      EI Statistical Review 2026: oil consumption per country, kb/d, 1965–2025 (+ world)
//   us-imports.json       EIA: U.S. crude oil imports by country of origin, kb/d, 1973–2025 + the latest partial year
//   china-imports.json    China customs (GACC) via UN Comtrade: crude imports (HS 2709) by partner, tonnes + US$, 2024–2025
//   crude-trade-2025.json EI Statistical Review 2026: inter-area crude trade 2025, million tonnes (21 × 15 areas)
//
// Units on the page are thousand barrels a day (kb/d). Tonnes become barrels with the EI's own average factor for
// crude oil (BARRELS_PER_TONNE) and the number of days in the year — the result is marked "≈" wherever it is shown.
import { ISO2 } from '../../lib/countries';
import { REGIONS } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import type { Localized } from '../../catalog/types';
import { array, fail, finite, oneOf, record, string } from '../../lib/dataset';

export const FILES = {
  consumption: 'consumption.json',
  us: 'us-imports.json',
  china: 'china-imports.json',
  trade: 'crude-trade-2025.json',
} as const;
export const DATA_FILES: readonly string[] = Object.values(FILES);

/** EI conversion factor for crude oil (Statistical Review 2026, "Approximate conversion factors"): barrels per tonne. */
export const BARRELS_PER_TONNE = 7.33;

/** Codes kept for areas that no longer exist: no flag, a name from lib/countries.ts. */
export const HISTORIC_CODES: readonly string[] = ['SU', 'AN'];
export const isHistoric = (code: string): boolean => HISTORIC_CODES.includes(code);

export const daysIn = (year: number): number => (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 366 : 365);
/** Tonnes in one year → thousand barrels a day (≈, EI's average factor). */
export const kbdFromTonnes = (tonnes: number, year: number): number => (tonnes * BARRELS_PER_TONNE) / daysIn(year) / 1000;

// Largest single value: the US at ≈ 20,800 kb/d (2005). Ten times above catches unit mistakes, not a real limit.
const MAX_KBD = 200_000;

function code(raw: unknown, at: string, seen: Set<string>): string {
  const c = string(raw, at, ISO2);
  if (seen.has(c)) fail(at, `duplicate code ${c}`);
  seen.add(c);
  return c;
}

function series(raw: unknown, at: string, length: number, allowNull: boolean): (number | null)[] {
  const values = array(raw, at, length);
  if (values.length !== length) fail(at, `${values.length} values, expected ${length}`);
  return values.map((v, i) => (v === null && allowNull ? null : finite(v, `${at}[${i}]`, 0, MAX_KBD)));
}

// ── 1. Consumption (EI) ───────────────────────────────────────────────────────────────────────────

export type ConsumptionRow = {
  /** ISO 3166-1 alpha-2; SU = the USSR (1965–1984, before the EI splits it into its successor states). */
  code: string;
  region: Region;
  /** kb/d per year, index 0 = `from`; null = the EI publishes no value for this area that year. */
  values: (number | null)[];
};

export type ConsumptionDataset = {
  /** Statistical Review edition (one vintage for every year: the EI revises history in each edition). */
  edition: number;
  from: number;
  to: number;
  /** EI "Total World", kb/d — includes the EI's "Other …" areas, so it exceeds the sum of the listed countries. */
  world: number[];
  rows: ConsumptionRow[];
};

export function parseConsumption(json: unknown, where: string = FILES.consumption): ConsumptionDataset {
  const o = record(json, where);
  const edition = finite(o.edition, `${where}.edition`, 2023, 2100);
  const from = finite(o.from, `${where}.from`, 1965, 2100);
  const to = finite(o.to, `${where}.to`, from, 2100);
  const n = to - from + 1;
  const world = series(o.world, `${where}.world`, n, false) as number[];
  const seen = new Set<string>();
  const rows = array(o.rows, `${where}.rows`, 1).map((raw, i) => {
    const at = `${where}.rows[${i}]`;
    const r = record(raw, at);
    const row: ConsumptionRow = {
      code: code(r.code, `${at}.code`, seen),
      region: oneOf(r.region, REGIONS, `${at}.region`),
      values: series(r.values, `${at}.values`, n, true),
    };
    if (row.values.every((v) => v === null)) fail(`${at}.values`, 'no value in any year');
    return row;
  });
  for (let y = 0; y < n; y++) {
    const sum = rows.reduce((s, r) => s + (r.values[y] ?? 0), 0);
    if (sum > world[y]! * 1.001) fail(`${where}.world[${y}]`, `countries add up to ${sum}, more than the world (${world[y]})`);
  }
  return { edition, from, to, world, rows };
}

export const CONSUMPTION_METRICS = ['total', 'per-capita'] as const;
export type ConsumptionMetric = (typeof CONSUMPTION_METRICS)[number];

/** Population on 1 July of the consumption year, by ISO code (the population-by-country entry, joined at runtime). */
export type PopulationLookup = ReadonlyMap<string, number>;

export type RankedConsumer = {
  code: string;
  region: Region;
  /** Rank for the active metric (1 = most); null = no population figure (per capita only). */
  rank: number | null;
  /** Active metric: kb/d, or barrels per person a year; null = not available. */
  value: number | null;
  /** kb/d in the latest year. */
  kbd: number;
  /** Share of world consumption. */
  share: number;
  /** Barrels per person a year; null = no population. */
  perCapita: number | null;
  /** kb/d ten years earlier (null = no value then) and the change since, as a ratio (0.1 = +10 %). */
  before: number | null;
  change: number | null;
};

/** The comparison year of the table's "change" column: ten years before the latest. */
export const changeFrom = (ds: ConsumptionDataset): number => ds.to - 10;

/**
 * Countries in the latest year, ranked by one metric. Total: every country with a value, largest first. Per capita:
 * countries with a population figure first (barrels per person a year), then the rest unranked (table only).
 */
export function rankConsumption(ds: ConsumptionDataset, metric: ConsumptionMetric, population: PopulationLookup | null): RankedConsumer[] {
  const last = ds.to - ds.from;
  const prev = changeFrom(ds) - ds.from;
  const world = ds.world[last]!;
  const days = daysIn(ds.to);
  const base = ds.rows
    .filter((r) => r.values[last] !== null)
    .map((r) => {
      const kbd = r.values[last]!;
      const pop = population?.get(r.code);
      const perCapita = pop ? (kbd * 1000 * days) / pop : null;
      const before = prev >= 0 ? (r.values[prev] ?? null) : null;
      return {
        code: r.code,
        region: r.region,
        kbd,
        share: kbd / world,
        perCapita,
        before,
        change: before ? kbd / before - 1 : null,
      };
    });
  if (metric === 'total') {
    return base.sort((a, b) => b.kbd - a.kbd || a.code.localeCompare(b.code)).map((r, i) => ({ ...r, rank: i + 1, value: r.kbd }));
  }
  const withPop = base.filter((r) => r.perCapita !== null).sort((a, b) => b.perCapita! - a.perCapita! || a.code.localeCompare(b.code));
  const without = base.filter((r) => r.perCapita === null).sort((a, b) => b.kbd - a.kbd);
  return [...withPop.map((r, i) => ({ ...r, rank: i + 1, value: r.perCapita })), ...without.map((r) => ({ ...r, rank: null, value: null }))];
}

/** World barrels per person a year: world kb/d over world population (null = no population). */
export const worldPerCapita = (ds: ConsumptionDataset, worldPopulation: number | null): number | null =>
  worldPopulation ? (ds.world[ds.to - ds.from]! * 1000 * daysIn(ds.to)) / worldPopulation : null;

export type RaceFrameRow = { code: string; value: number };
export type RaceFrame = { time: number; rows: RaceFrameRow[] };

/**
 * Bar-race keyframes over the consumption history: `steps` frames per year, values interpolated linearly between
 * years; an area without a value in a year counts as 0 there (the USSR fades out after 1984, its successor states
 * come in from 1985). Frame i sits at time from + i / steps. Pure.
 */
export function raceFrames(ds: ConsumptionDataset, options: { steps: number; top: number; region?: Region | 'all' }): RaceFrame[] {
  const steps = Math.max(1, Math.floor(options.steps));
  const region = options.region ?? 'all';
  const rows = ds.rows.filter((r) => region === 'all' || r.region === region);
  const frames: RaceFrame[] = [];
  const years = ds.to - ds.from + 1;
  for (let y = 0; y < years; y++) {
    const last = y === years - 1;
    for (let s = 0; s < (last ? 1 : steps); s++) {
      const f = s / steps;
      const out: RaceFrameRow[] = [];
      for (const r of rows) {
        const value = (r.values[y] ?? 0) * (1 - f) + (last ? 0 : (r.values[y + 1] ?? 0)) * f;
        if (value > 0) out.push({ code: r.code, value });
      }
      out.sort((a, b) => b.value - a.value || a.code.localeCompare(b.code));
      frames.push({ time: ds.from + y + f, rows: out.slice(0, options.top) });
    }
  }
  return frames;
}

/** One year's ranking (for the race's table view), with each country's share of the world. */
export function consumptionYear(ds: ConsumptionDataset, year: number, region: Region | 'all' = 'all'): Array<{ code: string; region: Region; kbd: number; share: number; rank: number }> {
  const i = year - ds.from;
  const world = ds.world[i] ?? 0;
  return ds.rows
    .filter((r) => r.values[i] !== null && r.values[i] !== undefined)
    .map((r) => ({ code: r.code, region: r.region, kbd: r.values[i]!, share: world ? r.values[i]! / world : 0 }))
    .sort((a, b) => b.kbd - a.kbd || a.code.localeCompare(b.code))
    .map((r, k) => ({ ...r, rank: k + 1 }))
    .filter((r) => region === 'all' || r.region === region);
}

// ── 2. U.S. imports (EIA) ─────────────────────────────────────────────────────────────────────────

export type UsRow = {
  code: string;
  region: Region;
  /** kb/d per year, index 0 = `from`; null = no imports reported from this country that year. */
  values: (number | null)[];
  /** kb/d in the partial year (average of its reported months); null = none. */
  partial: number | null;
};

export type UsDataset = {
  from: number;
  to: number;
  /** EIA total U.S. crude imports, kb/d. */
  total: number[];
  /** The months of the year after `to` that the EIA has published so far (1…11), averaged by days. */
  partial: { year: number; months: number; total: number };
  /** EIA release date of the files, YYYY-MM-DD. */
  release: string;
  rows: UsRow[];
};

export function parseUsImports(json: unknown, where: string = FILES.us): UsDataset {
  const o = record(json, where);
  const from = finite(o.from, `${where}.from`, 1900, 2100);
  const to = finite(o.to, `${where}.to`, from, 2100);
  const n = to - from + 1;
  const total = series(o.total, `${where}.total`, n, false) as number[];
  const p = record(o.partial, `${where}.partial`);
  const partial = {
    year: finite(p.year, `${where}.partial.year`, to + 1, to + 1),
    months: finite(p.months, `${where}.partial.months`, 1, 11),
    total: finite(p.total, `${where}.partial.total`, 0, MAX_KBD),
  };
  const release = string(o.release, `${where}.release`, /^\d{4}-\d{2}-\d{2}$/);
  const seen = new Set<string>();
  const rows = array(o.rows, `${where}.rows`, 1).map((raw, i) => {
    const at = `${where}.rows[${i}]`;
    const r = record(raw, at);
    return {
      code: code(r.code, `${at}.code`, seen),
      region: oneOf(r.region, REGIONS, `${at}.region`),
      values: series(r.values, `${at}.values`, n, true),
      partial: r.partial === null ? null : finite(r.partial, `${at}.partial`, 0, MAX_KBD),
    };
  });
  // The EIA's country series never add up to more than its total (each is rounded to 1 kb/d). Before 1993 the EIA
  // itemises only its main sources, so the total is larger — `unlisted` shows that remainder on the page.
  for (let y = 0; y < n; y++) {
    const sum = rows.reduce((s, r) => s + (r.values[y] ?? 0), 0);
    if (sum - total[y]! > rows.length * 0.5 + 1) fail(`${where}.total[${y}]`, `countries add up to ${sum}, more than the total ${total[y]}`);
  }
  const psum = rows.reduce((s, r) => s + (r.partial ?? 0), 0);
  if (Math.abs(psum - partial.total) > rows.length * 0.5 + 1) fail(`${where}.partial.total`, `countries add up to ${psum}, total ${partial.total}`);
  return { from, to, total, partial, release, rows };
}

/** A year of the U.S. view: a calendar year from..to, or `partial` (the latest months). */
export type UsPeriod = number | 'partial';

export type UsSupplier = { code: string; region: Region; kbd: number; share: number; rank: number; before: number | null };

/** Suppliers in one period, largest first, each with its share of the period's total and the year before. */
export function usSuppliers(ds: UsDataset, period: UsPeriod): UsSupplier[] {
  const i = period === 'partial' ? -1 : period - ds.from;
  const total = period === 'partial' ? ds.partial.total : (ds.total[i] ?? 0);
  const prev = period === 'partial' ? ds.to - ds.from : i - 1;
  return ds.rows
    .map((r) => ({ r, kbd: period === 'partial' ? r.partial : (r.values[i] ?? null) }))
    .filter((x): x is { r: UsRow; kbd: number } => x.kbd !== null && x.kbd > 0)
    .sort((a, b) => b.kbd - a.kbd || a.r.code.localeCompare(b.r.code))
    .map((x, k) => ({
      code: x.r.code,
      region: x.r.region,
      kbd: x.kbd,
      share: total ? x.kbd / total : 0,
      rank: k + 1,
      before: prev >= 0 ? (x.r.values[prev] ?? null) : null,
    }));
}

/**
 * Imports the EIA does not attribute to a country in that period: total − Σ countries, kb/d. Up to ≈ 335 kb/d before
 * 1993 (the EIA itemised only its main sources then); rounding noise afterwards, so below 15 kb/d it counts as 0.
 */
export function usUnlisted(ds: UsDataset, period: UsPeriod): number {
  const i = period === 'partial' ? -1 : period - ds.from;
  const total = period === 'partial' ? ds.partial.total : (ds.total[i] ?? 0);
  const sum = ds.rows.reduce((s, r) => s + ((period === 'partial' ? r.partial : r.values[i]) ?? 0), 0);
  const rest = total - sum;
  return rest >= 15 ? rest : 0;
}

/** The suppliers with the highest annual peak over the whole series — the lines of the history chart. Pure. */
export function usHistoryLeaders(ds: UsDataset, n: number): UsRow[] {
  const peak = (r: UsRow): number => Math.max(0, ...r.values.map((v) => v ?? 0));
  return [...ds.rows].sort((a, b) => peak(b) - peak(a) || a.code.localeCompare(b.code)).slice(0, n);
}

// ── 3. China imports (GACC via UN Comtrade) ──────────────────────────────────────────────────────

export type ChinaRow = {
  code: string;
  region: Region;
  /** Net weight, tonnes, per year in `years`; null = no weight reported. */
  tonnes: (number | null)[];
  /** Customs value, US$ (CIF), per year; null = no imports that year. */
  usd: (number | null)[];
};

export type ChinaDataset = {
  years: number[];
  /** Σ partner tonnes per year (the World row of 2025 carries no weight, so the sum is the total). */
  total: number[];
  rows: ChinaRow[];
};

export function parseChinaImports(json: unknown, where: string = FILES.china): ChinaDataset {
  const o = record(json, where);
  const years = array(o.years, `${where}.years`, 1).map((y, i) => finite(y, `${where}.years[${i}]`, 2000, 2100));
  for (let i = 1; i < years.length; i++) if (years[i] !== years[i - 1]! + 1) fail(`${where}.years`, 'consecutive years expected');
  const n = years.length;
  const total = array(o.total, `${where}.total`, n).map((v, i) => finite(v, `${where}.total[${i}]`, 0, 2e9));
  if (total.length !== n) fail(`${where}.total`, `${total.length} values, expected ${n}`);
  const seen = new Set<string>();
  const val = (raw: unknown, at: string): (number | null)[] => {
    const a = array(raw, at, n);
    if (a.length !== n) fail(at, `${a.length} values, expected ${n}`);
    return a.map((v, i) => (v === null ? null : finite(v, `${at}[${i}]`, 0, 2e12)));
  };
  const rows = array(o.rows, `${where}.rows`, 1).map((raw, i) => {
    const at = `${where}.rows[${i}]`;
    const r = record(raw, at);
    return {
      code: code(r.code, `${at}.code`, seen),
      region: oneOf(r.region, REGIONS, `${at}.region`),
      tonnes: val(r.tonnes, `${at}.tonnes`),
      usd: val(r.usd, `${at}.usd`),
    };
  });
  for (let y = 0; y < n; y++) {
    const sum = rows.reduce((s, r) => s + (r.tonnes[y] ?? 0), 0);
    if (Math.abs(sum - total[y]!) > 1) fail(`${where}.total[${y}]`, `partners add up to ${sum}, total ${total[y]}`);
  }
  return { years, total, rows };
}

export type ChinaSupplier = {
  code: string;
  region: Region;
  tonnes: number;
  /** ≈ kb/d (tonnes × 7.33 ÷ days). */
  kbd: number;
  share: number;
  usd: number | null;
  /** US$ per barrel (≈): customs value over the converted volume; null = no value. */
  usdPerBarrel: number | null;
  rank: number;
  /** Tonnes in the previous year (null = none / first year) and the change since (ratio). */
  before: number | null;
  change: number | null;
};

export function chinaSuppliers(ds: ChinaDataset, year: number): ChinaSupplier[] {
  const i = ds.years.indexOf(year);
  if (i < 0) return [];
  const total = ds.total[i]!;
  return ds.rows
    .filter((r) => (r.tonnes[i] ?? 0) > 0)
    .map((r) => {
      const tonnes = r.tonnes[i]!;
      const usd = r.usd[i] ?? null;
      const before = i > 0 ? (r.tonnes[i - 1] ?? null) : null;
      return {
        code: r.code,
        region: r.region,
        tonnes,
        kbd: kbdFromTonnes(tonnes, year),
        share: tonnes / total,
        usd,
        usdPerBarrel: usd ? usd / (tonnes * BARRELS_PER_TONNE) : null,
        before,
        change: before ? tonnes / before - 1 : null,
      };
    })
    .sort((a, b) => b.tonnes - a.tonnes || a.code.localeCompare(b.code))
    .map((r, k) => ({ ...r, rank: k + 1 }));
}

// ── 4. Inter-area crude trade (EI) ───────────────────────────────────────────────────────────────

/** The EI's exporting areas (rows of its table), in its order. */
export const EXPORTERS = [
  'canada', 'mexico', 'us', 'latin-america', 'europe', 'russia', 'other-cis', 'iraq', 'kuwait', 'saudi-arabia', 'uae',
  'other-middle-east', 'north-africa', 'west-africa', 'east-south-africa', 'australasia', 'china', 'india', 'japan',
  'singapore', 'other-asia-pacific',
] as const;
export type Exporter = (typeof EXPORTERS)[number];

/** The EI's importing areas (columns of its table), in its order. */
export const IMPORTERS = [
  'canada', 'mexico', 'us', 'latin-america', 'europe', 'russia', 'other-cis', 'middle-east', 'africa', 'australasia',
  'china', 'india', 'japan', 'singapore', 'other-asia-pacific',
] as const;
export type Importer = (typeof IMPORTERS)[number];

export const AREA_LABELS: Record<Exporter | Importer, Localized> = {
  canada: { en: 'Canada', uk: 'Канада' },
  mexico: { en: 'Mexico', uk: 'Мексика' },
  us: { en: 'US', uk: 'США' },
  'latin-america': { en: 'S. & Cent. America', uk: 'Південна й Центральна Америка' },
  europe: { en: 'Europe', uk: 'Європа' },
  russia: { en: 'Russia', uk: 'Росія' },
  'other-cis': { en: 'Other CIS', uk: 'Інші країни СНД' },
  iraq: { en: 'Iraq', uk: 'Ірак' },
  kuwait: { en: 'Kuwait', uk: 'Кувейт' },
  'saudi-arabia': { en: 'Saudi Arabia', uk: 'Саудівська Аравія' },
  uae: { en: 'UAE', uk: 'ОАЕ' },
  'other-middle-east': { en: 'Other Middle East', uk: 'Інший Близький Схід' },
  'middle-east': { en: 'Middle East', uk: 'Близький Схід' },
  'north-africa': { en: 'North Africa', uk: 'Північна Африка' },
  'west-africa': { en: 'West Africa', uk: 'Західна Африка' },
  'east-south-africa': { en: 'East & S. Africa', uk: 'Східна й Південна Африка' },
  africa: { en: 'Africa', uk: 'Африка' },
  australasia: { en: 'Australasia', uk: 'Австралазія' },
  china: { en: 'China', uk: 'Китай' },
  india: { en: 'India', uk: 'Індія' },
  japan: { en: 'Japan', uk: 'Японія' },
  singapore: { en: 'Singapore', uk: 'Сінгапур' },
  'other-asia-pacific': { en: 'Other Asia Pacific', uk: 'Інша Азія й Океанія' },
};

export type TradeFlow = {
  from: Exporter;
  to: Importer;
  /** Million tonnes; the EI prints "†" (less than 0.05) for some cells — kept as 0.02 with `small`. */
  mt: number;
  small?: true;
};

export type TradeDataset = {
  year: number;
  edition: number;
  flows: TradeFlow[];
  /** The EI's printed "Total imports" per importing area, million tonnes, and the world total. */
  importTotals: Record<Importer, number>;
  world: number;
};

/** Sums of one-decimal cells in messages: 51.019999999999996 → 51.02. */
const round2 = (v: number): number => Math.round(v * 100) / 100;

export function parseTrade(json: unknown, where: string = FILES.trade): TradeDataset {
  const o = record(json, where);
  const year = finite(o.year, `${where}.year`, 2000, 2100);
  const edition = finite(o.edition, `${where}.edition`, year, year + 2);
  const world = finite(o.world, `${where}.world`, 1, 10_000);
  const seen = new Set<string>();
  const flows = array(o.flows, `${where}.flows`, 1).map((raw, i): TradeFlow => {
    const at = `${where}.flows[${i}]`;
    const r = record(raw, at);
    const from = oneOf(r.from, EXPORTERS, `${at}.from`);
    const to = oneOf(r.to, IMPORTERS, `${at}.to`);
    if (seen.has(`${from}>${to}`)) fail(at, `duplicate flow ${from} → ${to}`);
    seen.add(`${from}>${to}`);
    const mt = finite(r.mt, `${at}.mt`, 0.01, 10_000);
    if (r.small !== undefined && r.small !== true) fail(`${at}.small`, 'true or absent');
    return r.small ? { from, to, mt, small: true } : { from, to, mt };
  });
  const t = record(o.importTotals, `${where}.importTotals`);
  const importTotals = Object.fromEntries(IMPORTERS.map((k) => [k, finite(t[k], `${where}.importTotals.${k}`, 0, 10_000)])) as Record<Importer, number>;
  for (const k of IMPORTERS) {
    const cells = flows.filter((f) => f.to === k);
    const sum = cells.reduce((s, f) => s + f.mt, 0);
    if (Math.abs(sum - importTotals[k]) > 0.05 * cells.length + 0.06) fail(`${where}.importTotals.${k}`, `flows add up to ${round2(sum)}, printed ${importTotals[k]}`);
  }
  const sumTotals = IMPORTERS.reduce((s, k) => s + importTotals[k], 0);
  if (Math.abs(sumTotals - world) > 0.5) fail(`${where}.world`, `importers add up to ${round2(sumTotals)}, world ${world}`);
  return { year, edition, flows, importTotals, world };
}

/** Six colour groups of supplying areas (importers view) — few enough to tell apart, each named on the page. */
export const SOURCE_GROUPS = ['middle-east', 'russia', 'north-america', 'latin-america', 'africa', 'other'] as const;
export type SourceGroup = (typeof SOURCE_GROUPS)[number];
export const SOURCE_GROUP: Record<Exporter, SourceGroup> = {
  iraq: 'middle-east',
  kuwait: 'middle-east',
  'saudi-arabia': 'middle-east',
  uae: 'middle-east',
  'other-middle-east': 'middle-east',
  russia: 'russia',
  canada: 'north-america',
  mexico: 'north-america',
  us: 'north-america',
  'latin-america': 'latin-america',
  'north-africa': 'africa',
  'west-africa': 'africa',
  'east-south-africa': 'africa',
  europe: 'other',
  'other-cis': 'other',
  australasia: 'other',
  china: 'other',
  india: 'other',
  japan: 'other',
  singapore: 'other',
  'other-asia-pacific': 'other',
};

/** Six colour groups of buying areas (exporters view). */
export const DEST_GROUPS = ['china', 'india', 'europe', 'us', 'other-asia', 'other'] as const;
export type DestGroup = (typeof DEST_GROUPS)[number];
export const DEST_GROUP: Record<Importer, DestGroup> = {
  china: 'china',
  india: 'india',
  europe: 'europe',
  us: 'us',
  japan: 'other-asia',
  singapore: 'other-asia',
  'other-asia-pacific': 'other-asia',
  australasia: 'other-asia',
  canada: 'other',
  mexico: 'other',
  'latin-america': 'other',
  russia: 'other',
  'other-cis': 'other',
  'middle-east': 'other',
  africa: 'other',
};

export const SOURCE_GROUP_LABELS: Record<SourceGroup, Localized> = {
  'middle-east': { en: 'Middle East', uk: 'Близький Схід' },
  russia: { en: 'Russia', uk: 'Росія' },
  'north-america': { en: 'North America', uk: 'Північна Америка' },
  'latin-america': { en: 'S. & Cent. America', uk: 'Південна й Центральна Америка' },
  africa: { en: 'Africa', uk: 'Африка' },
  other: { en: 'Other areas', uk: 'Інші регіони' },
};
export const DEST_GROUP_LABELS: Record<DestGroup, Localized> = {
  china: { en: 'China', uk: 'Китай' },
  india: { en: 'India', uk: 'Індія' },
  europe: { en: 'Europe', uk: 'Європа' },
  us: { en: 'US', uk: 'США' },
  'other-asia': { en: 'Other Asia Pacific', uk: 'Інша Азія й Океанія' },
  other: { en: 'Other areas', uk: 'Інші регіони' },
};

export type TradeSide = 'importers' | 'exporters';

export type TradePart = { area: Exporter | Importer; mt: number; small: boolean };
export type TradeSegment = { group: SourceGroup | DestGroup; mt: number; parts: TradePart[] };
export type TradeRow = { area: Exporter | Importer; mt: number; share: number; segments: TradeSegment[] };

/**
 * Importers view: each importing area with its supply split into the six source groups (largest area first).
 * Exporters view: each exporting area split by the six buyer groups. Areas below `min` million tonnes are left out
 * (they are listed in the table). Shares are of world trade. Pure.
 */
export function tradeRows(ds: TradeDataset, side: TradeSide, min = 0): TradeRow[] {
  const areas: readonly (Exporter | Importer)[] = side === 'importers' ? IMPORTERS : EXPORTERS;
  const groups: readonly string[] = side === 'importers' ? SOURCE_GROUPS : DEST_GROUPS;
  const out: TradeRow[] = [];
  for (const area of areas) {
    const cells = ds.flows.filter((f) => (side === 'importers' ? f.to === area : f.from === area));
    const mt = cells.reduce((s, f) => s + f.mt, 0);
    if (mt < min || mt === 0) continue;
    const segments = groups.map((group) => {
      const parts = cells
        .filter((f) => (side === 'importers' ? SOURCE_GROUP[f.from] : DEST_GROUP[f.to]) === group)
        .map((f) => ({ area: side === 'importers' ? f.from : f.to, mt: f.mt, small: Boolean(f.small) }))
        .sort((a, b) => b.mt - a.mt);
      return { group: group as SourceGroup | DestGroup, mt: parts.reduce((s, p) => s + p.mt, 0), parts };
    });
    out.push({ area, mt, share: mt / ds.world, segments });
  }
  return out.sort((a, b) => b.mt - a.mt || a.area.localeCompare(b.area));
}

/** One cell of the trade table (million tonnes; 0 = no flow). */
export const flowMt = (ds: TradeDataset, from: Exporter, to: Importer): number => ds.flows.find((f) => f.from === from && f.to === to)?.mt ?? 0;

// ── check:data ───────────────────────────────────────────────────────────────────────────────────

/** check:data hook (scripts/check-data.ts): validates every file listed in `meta.data` with its own parser. */
export function validateDataFile(file: string, json: unknown): void {
  if (file === FILES.consumption) parseConsumption(json, file);
  else if (file === FILES.us) parseUsImports(json, file);
  else if (file === FILES.china) parseChinaImports(json, file);
  else if (file === FILES.trade) parseTrade(json, file);
  else fail(file, `no parser for this file (expected one of ${DATA_FILES.join(', ')})`);
}
