// data.ts — CHANGED (S3-el): the electricity entry's dataset contract — five files, one parser each (prep, check:data
// and the browser use the same code), and the pure derivations the seven angles draw.
//
//   countries.json  Ember: every country's latest year up to RANK_YEAR — generation by fuel, demand, per person, CO2
//   world.json      Ember: the world, 2000–2025 — generation by fuel, demand, CO2 intensity
//   race.json       Ember: solar and wind generation per country, 2000 → the race's last year
//   ukraine.json    Ember (European file, from 1990): Ukraine 1990–2022 + Energoatom 2021: generation per nuclear plant
//   access.json     World Bank WDI: share of people with access to electricity and population, per country
//
// Units: TWh (generation, demand), MWh per person, gCO2 per kWh, percent of population. Ember publishes Ukraine
// only up to 2022: since 24 February 2022 Ukraine's grid data are not published (see UKRAINE_GAP in text.ts).
import { ISO2 } from '../../lib/countries';
import { REGIONS } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { array, fail, finite, oneOf, record, string } from '../../lib/dataset';

export const FILES = {
  countries: 'countries.json',
  world: 'world.json',
  race: 'race.json',
  ukraine: 'ukraine.json',
  access: 'access.json',
} as const;
export const DATA_FILES: readonly string[] = Object.values(FILES);

/** Ember's fuels, in the order every `gen` array uses. */
export const FUELS = ['coal', 'gas', 'otherFossil', 'nuclear', 'hydro', 'wind', 'solar', 'bioenergy', 'otherRenewables'] as const;
export type Fuel = (typeof FUELS)[number];

/** Six groups drawn on the page (six validated colours): fossil first, then clean. */
export const GROUPS = ['coal', 'gas', 'nuclear', 'hydro', 'wind', 'solar'] as const;
export type Group = (typeof GROUPS)[number];
/** Fuel → group. "gas" also carries oil and other fossil fuels; "hydro" also bioenergy and other renewables. */
export const GROUP_OF: Record<Fuel, Group> = {
  coal: 'coal',
  gas: 'gas',
  otherFossil: 'gas',
  nuclear: 'nuclear',
  hydro: 'hydro',
  bioenergy: 'hydro',
  otherRenewables: 'hydro',
  wind: 'wind',
  solar: 'solar',
};
export const FOSSIL: readonly Fuel[] = ['coal', 'gas', 'otherFossil'];
export const RENEWABLE: readonly Fuel[] = ['hydro', 'wind', 'solar', 'bioenergy', 'otherRenewables'];

/** Rankings use 2024: Ember's 2025 release covers 91 of 214 countries so far, 2024 covers 196. */
export const RANK_YEAR = 2024;
/** Oldest year a country may still be listed with (marked with its year). 2022 keeps Ukraine's last published year. */
export const OLDEST_YEAR = 2022;

// China, the largest, generated 10,087 TWh in 2024; ten times above catches unit mistakes, not a real limit.
const MAX_TWH = 100_000;

const twh = (v: unknown, at: string): number => finite(v, at, 0, MAX_TWH);
const netTwh = (v: unknown, at: string): number => finite(v, at, -MAX_TWH, MAX_TWH);
const nullable = <T>(v: unknown, read: (v: unknown) => T): T | null => (v === null ? null : read(v));

function code(raw: unknown, at: string, seen: Set<string>): string {
  const c = string(raw, at, ISO2);
  if (seen.has(c)) fail(at, `duplicate code ${c}`);
  seen.add(c);
  return c;
}

function gen(raw: unknown, at: string): number[] {
  const a = array(raw, at, FUELS.length);
  if (a.length !== FUELS.length) fail(at, `${a.length} fuels, expected ${FUELS.length}`);
  return a.map((v, i) => twh(v, `${at}[${i}]`));
}

function series(raw: unknown, at: string, n: number, read: (v: unknown, at: string) => number): number[] {
  const a = array(raw, at, n);
  if (a.length !== n) fail(at, `${a.length} values, expected ${n}`);
  return a.map((v, i) => read(v, `${at}[${i}]`));
}

function nullableSeries(raw: unknown, at: string, n: number, read: (v: unknown, at: string) => number): (number | null)[] {
  const a = array(raw, at, n);
  if (a.length !== n) fail(at, `${a.length} values, expected ${n}`);
  return a.map((v, i) => (v === null ? null : read(v, `${at}[${i}]`)));
}

function fuelSeries(raw: unknown, at: string, n: number): Record<Fuel, number[]> {
  const o = record(raw, at);
  return Object.fromEntries(FUELS.map((f) => [f, series(o[f], `${at}.${f}`, n, twh)])) as Record<Fuel, number[]>;
}

export const sum = (values: readonly number[]): number => values.reduce((s, v) => s + v, 0);
const genTotal = (g: readonly number[]): number => sum(g);
const pick = (g: readonly number[], fuels: readonly Fuel[]): number => sum(fuels.map((f) => g[FUELS.indexOf(f)]!));

/** Generation by group (TWh), in GROUPS order. */
export function groupValues(g: readonly number[]): number[] {
  return GROUPS.map((grp) => sum(FUELS.filter((f) => GROUP_OF[f] === grp).map((f) => g[FUELS.indexOf(f)]!)));
}

// ── 1. Countries (Ember, latest year ≤ RANK_YEAR) ─────────────────────────────────────────────────

export type CountryRow = {
  code: string;
  region: Region;
  /** The row's year: RANK_YEAR, or an earlier one (≥ OLDEST_YEAR) when Ember has nothing newer. */
  year: number;
  /** Generation by fuel, TWh, in FUELS order. */
  gen: number[];
  /** Demand (generation + net imports), TWh. */
  demand: number;
  /** Demand per person, MWh. */
  perCapita: number;
  /** Power-sector CO2 per kWh generated, g; null = Ember gives none. */
  co2: number | null;
};

export type WorldYear = { year: number; gen: number[]; demand: number; perCapita: number; co2: number };

export type CountriesDataset = {
  /** Date the Ember file was downloaded (Ember updates it in place, twice a month). */
  retrieved: string;
  rankYear: number;
  world: WorldYear;
  rows: CountryRow[];
};

function worldYear(raw: unknown, at: string): WorldYear {
  const o = record(raw, at);
  return {
    year: finite(o.year, `${at}.year`, 2000, 2100),
    gen: gen(o.gen, `${at}.gen`),
    demand: twh(o.demand, `${at}.demand`),
    perCapita: finite(o.perCapita, `${at}.perCapita`, 0, 1000),
    co2: finite(o.co2, `${at}.co2`, 0, 2000),
  };
}

export function parseCountries(json: unknown, where: string = FILES.countries): CountriesDataset {
  const o = record(json, where);
  const retrieved = string(o.retrieved, `${where}.retrieved`, /^\d{4}-\d{2}-\d{2}$/);
  const rankYear = finite(o.rankYear, `${where}.rankYear`, 2020, 2100);
  const world = worldYear(o.world, `${where}.world`);
  if (world.year !== rankYear) fail(`${where}.world.year`, `${world.year}, expected the rank year ${rankYear}`);
  const seen = new Set<string>();
  const rows = array(o.rows, `${where}.rows`, 1).map((raw, i): CountryRow => {
    const at = `${where}.rows[${i}]`;
    const r = record(raw, at);
    const row: CountryRow = {
      code: code(r.code, `${at}.code`, seen),
      region: oneOf(r.region, REGIONS, `${at}.region`),
      year: finite(r.year, `${at}.year`, OLDEST_YEAR, rankYear),
      gen: gen(r.gen, `${at}.gen`),
      demand: twh(r.demand, `${at}.demand`),
      perCapita: finite(r.perCapita, `${at}.perCapita`, 0, 1000),
      co2: nullable(r.co2, (v) => finite(v, `${at}.co2`, 0, 2000)),
    };
    if (genTotal(row.gen) <= 0) fail(`${at}.gen`, 'no generation');
    return row;
  });
  const listed = sum(rows.filter((r) => r.year === rankYear).map((r) => genTotal(r.gen)));
  if (listed > genTotal(world.gen) * 1.001) fail(`${where}.rows`, `countries add up to ${listed} TWh, more than the world`);
  return { retrieved, rankYear, world, rows };
}

export const PRODUCER_METRICS = ['total', 'per-capita'] as const;
export type ProducerMetric = (typeof PRODUCER_METRICS)[number];

export type RankedCountry = CountryRow & {
  /** Rank for the active measure (1 = first in the active order). */
  rank: number;
  /** The active measure's value. */
  value: number;
  /** Total generation, TWh. */
  total: number;
  /** Total ÷ world generation in the rank year (a dated row compares its own year with the rank year; shown with “*”). */
  share: number;
  /** Shares of the six groups, 0–1, in GROUPS order. */
  groups: number[];
  /** Fossil and low-carbon (nuclear + renewables) shares, 0–1. */
  fossil: number;
  clean: number;
  /** The row is from an earlier year than the ranking (marked “*” with its year). */
  dated: boolean;
};

function enrich(r: CountryRow, ds: CountriesDataset): Omit<RankedCountry, 'rank' | 'value'> {
  const total = genTotal(r.gen);
  const fossil = pick(r.gen, FOSSIL) / total;
  return {
    ...r,
    total,
    share: total / genTotal(ds.world.gen),
    groups: groupValues(r.gen).map((v) => v / total),
    fossil,
    clean: 1 - fossil,
    dated: r.year !== ds.rankYear,
  };
}

const byValue = (desc: boolean) => (a: { value: number; code: string }, b: { value: number; code: string }) =>
  (desc ? b.value - a.value : a.value - b.value) || a.code.localeCompare(b.code);

/** Sorted, with competition ranks: equal values share the rank of the first of them (121 countries at 100 % access). */
function ranked<T extends { value: number; code: string }>(rows: T[], desc: boolean): (T & { rank: number })[] {
  const sorted = rows.sort(byValue(desc));
  let rank = 0;
  return sorted.map((r, i) => {
    if (i === 0 || r.value !== sorted[i - 1]!.value) rank = i + 1;
    return { ...r, rank };
  });
}

/** Angle A: generation (TWh) or demand per person (MWh), largest first. */
export function rankProducers(ds: CountriesDataset, metric: ProducerMetric): RankedCountry[] {
  return ranked(
    ds.rows.map((r) => {
      const e = enrich(r, ds);
      return { ...e, value: metric === 'total' ? e.total : r.perCapita };
    }),
    true,
  );
}

export const MIX_ORDERS = ['size', 'clean', 'fossil'] as const;
export type MixOrder = (typeof MIX_ORDERS)[number];

/** Angle B: every country's mix; order = generation (largest first), low-carbon share or fossil share (highest first). */
export function rankMix(ds: CountriesDataset, order: MixOrder): RankedCountry[] {
  return ranked(
    ds.rows.map((r) => {
      const e = enrich(r, ds);
      return { ...e, value: order === 'size' ? e.total : order === 'clean' ? e.clean : e.fossil };
    }),
    true,
  );
}

export const CARBON_ORDERS = ['cleanest', 'dirtiest'] as const;
export type CarbonOrder = (typeof CARBON_ORDERS)[number];

/** Angle E: grams of CO2 per kWh, cleanest or dirtiest first; countries without a figure are left out. */
export function rankCarbon(ds: CountriesDataset, order: CarbonOrder): RankedCountry[] {
  return ranked(
    ds.rows.filter((r) => r.co2 !== null).map((r) => ({ ...enrich(r, ds), value: r.co2! })),
    order === 'dirtiest',
  );
}

/** Generation of the world in the rank year, TWh. */
export const worldTotal = (ds: CountriesDataset): number => genTotal(ds.world.gen);

// ── 2. World (Ember, 2000–latest) ─────────────────────────────────────────────────────────────────

export type WorldDataset = {
  retrieved: string;
  from: number;
  to: number;
  gen: Record<Fuel, number[]>;
  demand: number[];
  co2: number[];
};

export function parseWorld(json: unknown, where: string = FILES.world): WorldDataset {
  const o = record(json, where);
  const retrieved = string(o.retrieved, `${where}.retrieved`, /^\d{4}-\d{2}-\d{2}$/);
  const from = finite(o.from, `${where}.from`, 1985, 2100);
  const to = finite(o.to, `${where}.to`, from + 1, 2100);
  const n = to - from + 1;
  return {
    retrieved,
    from,
    to,
    gen: fuelSeries(o.gen, `${where}.gen`, n),
    demand: series(o.demand, `${where}.demand`, n, twh),
    co2: series(o.co2, `${where}.co2`, n, (v, at) => finite(v, at, 0, 2000)),
  };
}

export type WorldMixYear = {
  year: number;
  total: number;
  /** TWh per group, GROUPS order. */
  groups: number[];
  /** Shares 0–1 per group. */
  shares: number[];
  renewables: number;
  fossil: number;
  co2: number;
};

export function worldMix(ds: WorldDataset): WorldMixYear[] {
  return Array.from({ length: ds.to - ds.from + 1 }, (_, i) => {
    const g = FUELS.map((f) => ds.gen[f][i]!);
    const total = genTotal(g);
    const groups = groupValues(g);
    return {
      year: ds.from + i,
      total,
      groups,
      shares: groups.map((v) => v / total),
      renewables: pick(g, RENEWABLE) / total,
      fossil: pick(g, FOSSIL) / total,
      co2: ds.co2[i]!,
    };
  });
}

/** First year in which renewables generated more than coal (null = never). */
export function renewablesPassCoal(mix: readonly WorldMixYear[]): number | null {
  const coal = GROUPS.indexOf('coal');
  return mix.find((m) => m.renewables > m.shares[coal]!)?.year ?? null;
}

// ── 3. Race (Ember, solar and wind per country) ───────────────────────────────────────────────────

export const RACE_SOURCES = ['solar', 'wind'] as const;
export type RaceSource = (typeof RACE_SOURCES)[number];

export type RaceRow = { code: string; region: Region; solar: (number | null)[]; wind: (number | null)[] };
export type RaceDataset = {
  retrieved: string;
  from: number;
  to: number;
  /** Countries Ember has in the last year (the others are null there; prep checks none of them would enter the top). */
  lastYearCountries: number;
  /** World generation per source, TWh, for shares. */
  world: Record<RaceSource, number[]>;
  rows: RaceRow[];
};

export function parseRace(json: unknown, where: string = FILES.race): RaceDataset {
  const o = record(json, where);
  const retrieved = string(o.retrieved, `${where}.retrieved`, /^\d{4}-\d{2}-\d{2}$/);
  const from = finite(o.from, `${where}.from`, 1985, 2100);
  const to = finite(o.to, `${where}.to`, from + 1, 2100);
  const n = to - from + 1;
  const w = record(o.world, `${where}.world`);
  const world = { solar: series(w.solar, `${where}.world.solar`, n, twh), wind: series(w.wind, `${where}.world.wind`, n, twh) };
  const seen = new Set<string>();
  const rows = array(o.rows, `${where}.rows`, 12).map((raw, i): RaceRow => {
    const at = `${where}.rows[${i}]`;
    const r = record(raw, at);
    return {
      code: code(r.code, `${at}.code`, seen),
      region: oneOf(r.region, REGIONS, `${at}.region`),
      solar: nullableSeries(r.solar, `${at}.solar`, n, twh),
      wind: nullableSeries(r.wind, `${at}.wind`, n, twh),
    };
  });
  return { retrieved, from, to, lastYearCountries: finite(o.lastYearCountries, `${where}.lastYearCountries`, 1, 400), world, rows };
}

export type RaceFrameRow = { code: string; value: number };
export type RaceFrame = { time: number; rows: RaceFrameRow[] };

/** Frames of the race: `steps` per year, values interpolated between years, the top `top` rows of each frame. */
export function raceFrames(ds: RaceDataset, source: RaceSource, options: { steps: number; top: number }): RaceFrame[] {
  const steps = Math.max(1, Math.floor(options.steps));
  const frames: RaceFrame[] = [];
  const years = ds.to - ds.from + 1;
  for (let y = 0; y < years; y++) {
    const last = y === years - 1;
    for (let s = 0; s < (last ? 1 : steps); s++) {
      const f = s / steps;
      const out: RaceFrameRow[] = [];
      for (const r of ds.rows) {
        const v = r[source];
        const value = (v[y] ?? 0) * (1 - f) + (last ? 0 : (v[y + 1] ?? 0)) * f;
        if (value > 0) out.push({ code: r.code, value });
      }
      out.sort((a, b) => b.value - a.value || a.code.localeCompare(b.code));
      frames.push({ time: ds.from + y + f, rows: out.slice(0, options.top) });
    }
  }
  return frames;
}

/** One year's ranking for one source (the race's table view). */
export function raceYear(ds: RaceDataset, source: RaceSource, year: number): Array<{ code: string; region: Region; value: number; share: number; rank: number }> {
  const i = year - ds.from;
  const world = ds.world[source][i] ?? 0;
  return ds.rows
    .filter((r) => (r[source][i] ?? 0) > 0)
    .map((r) => ({ code: r.code, region: r.region, value: r[source][i]!, share: world ? r[source][i]! / world : 0 }))
    .sort((a, b) => b.value - a.value || a.code.localeCompare(b.code))
    .map((r, k) => ({ ...r, rank: k + 1 }));
}

// ── 4. Ukraine (Ember Europe 1990–2022 + Energoatom 2021) ─────────────────────────────────────────

export const NPP_IDS = ['ZNPP', 'RNPP', 'SUNPP', 'KhNPP'] as const;
export type NppId = (typeof NPP_IDS)[number];

export type NuclearYear = {
  year: number;
  /** Generation per plant, GWh (Energoatom, “Звіт про управління”, table on p. 49). */
  plants: Record<NppId, number>;
  /** Energoatom's whole output, GWh (incl. its two hydro plants). */
  energoatom: number;
  /** Generation of Ukraine's power system, GWh (same report, p. 48). */
  ukraine: number;
  /** Installed capacity, MW: Zaporizhzhia (six VVER-1000 units) and all of Ukraine's nuclear plants. */
  znppMw: number;
  nuclearMw: number;
};

export type UkraineDataset = {
  retrieved: string;
  from: number;
  to: number;
  gen: Record<Fuel, number[]>;
  demand: number[];
  netImports: number[];
  perCapita: number[];
  nuclear: NuclearYear;
};

export function parseUkraine(json: unknown, where: string = FILES.ukraine): UkraineDataset {
  const o = record(json, where);
  const retrieved = string(o.retrieved, `${where}.retrieved`, /^\d{4}-\d{2}-\d{2}$/);
  const from = finite(o.from, `${where}.from`, 1985, 2100);
  const to = finite(o.to, `${where}.to`, from + 1, 2100);
  const n = to - from + 1;
  const nu = record(o.nuclear, `${where}.nuclear`);
  const at = `${where}.nuclear`;
  const plantsRaw = record(nu.plants, `${at}.plants`);
  const nuclear: NuclearYear = {
    year: finite(nu.year, `${at}.year`, from, to),
    plants: Object.fromEntries(NPP_IDS.map((id) => [id, finite(plantsRaw[id], `${at}.plants.${id}`, 0, 100_000)])) as Record<NppId, number>,
    energoatom: finite(nu.energoatom, `${at}.energoatom`, 0, 200_000),
    ukraine: finite(nu.ukraine, `${at}.ukraine`, 0, 500_000),
    znppMw: finite(nu.znppMw, `${at}.znppMw`, 0, 20_000),
    nuclearMw: finite(nu.nuclearMw, `${at}.nuclearMw`, 0, 30_000),
  };
  const plants = sum(NPP_IDS.map((id) => nuclear.plants[id]));
  if (plants > nuclear.energoatom || nuclear.energoatom > nuclear.ukraine) fail(at, 'plants ≤ Energoatom ≤ Ukraine expected');
  if (nuclear.znppMw > nuclear.nuclearMw) fail(at, 'Zaporizhzhia capacity exceeds the nuclear total');
  return {
    retrieved,
    from,
    to,
    gen: fuelSeries(o.gen, `${where}.gen`, n),
    demand: series(o.demand, `${where}.demand`, n, twh),
    netImports: series(o.netImports, `${where}.netImports`, n, netTwh),
    perCapita: series(o.perCapita, `${where}.perCapita`, n, (v, a) => finite(v, a, 0, 100)),
    nuclear,
  };
}

export type UkraineYear = {
  year: number;
  total: number;
  groups: number[];
  shares: number[];
  demand: number;
  netImports: number;
  perCapita: number;
  nuclearShare: number;
};

export function ukraineYears(ds: UkraineDataset): UkraineYear[] {
  const nuc = GROUPS.indexOf('nuclear');
  return Array.from({ length: ds.to - ds.from + 1 }, (_, i) => {
    const g = FUELS.map((f) => ds.gen[f][i]!);
    const total = genTotal(g);
    const groups = groupValues(g);
    return {
      year: ds.from + i,
      total,
      groups,
      shares: groups.map((v) => v / total),
      demand: ds.demand[i]!,
      netImports: ds.netImports[i]!,
      perCapita: ds.perCapita[i]!,
      nuclearShare: groups[nuc]! / total,
    };
  });
}

/** Zaporizhzhia's share of Ukraine's generation and of its nuclear output in the report's year. */
export function znppShares(n: NuclearYear): { ofUkraine: number; ofNuclear: number; ofCapacity: number; otherNuclear: number } {
  const nuclear = sum(NPP_IDS.map((id) => n.plants[id]));
  return {
    ofUkraine: n.plants.ZNPP / n.ukraine,
    ofNuclear: n.plants.ZNPP / nuclear,
    ofCapacity: n.znppMw / n.nuclearMw,
    otherNuclear: nuclear - n.plants.ZNPP,
  };
}

// ── 5. Access (World Bank) ────────────────────────────────────────────────────────────────────────

export type AccessRow = {
  code: string;
  region: Region;
  year: number;
  /** Share of the population with access to electricity, percent. */
  access: number;
  population: number;
  /** The same share in `firstYear`; null = no value then. */
  first: number | null;
};

export type AccessAggregate = { access: number; population: number };

export type AccessDataset = {
  /** WDI update date. */
  updated: string;
  year: number;
  firstYear: number;
  world: AccessAggregate;
  /** World Bank aggregate "Sub-Saharan Africa". */
  ssa: AccessAggregate;
  rows: AccessRow[];
};

function aggregate(raw: unknown, at: string): AccessAggregate {
  const o = record(raw, at);
  return { access: finite(o.access, `${at}.access`, 0, 100), population: finite(o.population, `${at}.population`, 1, 2e10) };
}

export function parseAccess(json: unknown, where: string = FILES.access): AccessDataset {
  const o = record(json, where);
  const updated = string(o.updated, `${where}.updated`, /^\d{4}-\d{2}-\d{2}$/);
  const year = finite(o.year, `${where}.year`, 2000, 2100);
  const firstYear = finite(o.firstYear, `${where}.firstYear`, 1990, year - 1);
  const seen = new Set<string>();
  const rows = array(o.rows, `${where}.rows`, 1).map((raw, i): AccessRow => {
    const at = `${where}.rows[${i}]`;
    const r = record(raw, at);
    return {
      code: code(r.code, `${at}.code`, seen),
      region: oneOf(r.region, REGIONS, `${at}.region`),
      year: finite(r.year, `${at}.year`, year - 4, year),
      access: finite(r.access, `${at}.access`, 0, 100),
      population: finite(r.population, `${at}.population`, 1, 2e9),
      first: nullable(r.first, (v) => finite(v, `${at}.first`, 0, 100)),
    };
  });
  return { updated, year, firstYear, world: aggregate(o.world, `${where}.world`), ssa: aggregate(o.ssa, `${where}.ssa`), rows };
}

export const ACCESS_METRICS = ['share', 'people'] as const;
export type AccessMetric = (typeof ACCESS_METRICS)[number];

export type RankedAccess = AccessRow & { rank: number; value: number; without: number; dated: boolean };

/** People without access to electricity. */
export const withoutAccess = (r: { access: number; population: number }): number => ((100 - r.access) / 100) * r.population;

/**
 * Angle F: share — lowest access first (countries at 100 % share the last ranks, in code order);
 * people — the most people without electricity first (countries with nobody left out are not ranked).
 */
export function rankAccess(ds: AccessDataset, metric: AccessMetric): RankedAccess[] {
  const rows = ds.rows.map((r) => ({ ...r, without: withoutAccess(r), dated: r.year !== ds.year }));
  if (metric === 'share') return ranked(rows.map((r) => ({ ...r, value: r.access })), false);
  return ranked(rows.filter((r) => r.without > 0).map((r) => ({ ...r, value: r.without })), true);
}

// ── check:data ────────────────────────────────────────────────────────────────────────────────────

/** Validates one shipped file with the parser the page uses (scripts/check-data.ts). */
export function validateDataFile(file: string, json: unknown): void {
  if (file === FILES.countries) parseCountries(json, file);
  else if (file === FILES.world) parseWorld(json, file);
  else if (file === FILES.race) parseRace(json, file);
  else if (file === FILES.ukraine) parseUkraine(json, file);
  else if (file === FILES.access) parseAccess(json, file);
  else fail(file, `no parser for this file (expected one of ${DATA_FILES.join(', ')})`);
}
