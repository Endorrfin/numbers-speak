// data.ts — births and deaths per day by country, 2026: types, the parser (prep, check:data, browser)
// and pure derivations (rank, net change, deaths per birth, world totals). CHANGED (S3-bdd): new entry.
import { ISO2 } from '../../lib/countries';
import { REGIONS } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { array, fail, finite, oneOf, record, string } from '../../lib/dataset';

export const DATA_FILE = 'per-day-2026.json';

export type PerDayRow = {
  /** ISO 3166-1 alpha-2. */
  code: string;
  region: Region;
  /** Live births per day (UN WPP 2024 estimate for the year, divided by 365). */
  births: number;
  /** Deaths per day, same basis. */
  deaths: number;
  /** Mid-year population. */
  population: number;
};

export type PerDayDataset = {
  year: number;
  unit: 'persons-per-day';
  /** Sorted by births, descending (ties by code). */
  rows: PerDayRow[];
};

/** Display-ready row: everything derived here, never stored. */
export type RankedPerDayRow = PerDayRow & {
  /** Global rank by births per day (1 = most). */
  rank: number;
  /** births − deaths (negative = natural decrease). */
  net: number;
  /** deaths / births; null when there are no births. */
  ratio: number | null;
};

export type WorldSummary = {
  births: number;
  deaths: number;
  net: number;
  /** Per second, for the live clock. */
  birthsPerSecond: number;
  deathsPerSecond: number;
  countries: number;
  /** Countries where deaths exceed births. */
  shrinking: number;
};

const MAX_PER_DAY = 200_000; // India ≈ 63k births/day — a unit mistake (per year) would be ~23M
const MAX_POPULATION = 2e9;
const SECONDS_PER_DAY = 86_400;

/** Validates unknown JSON and returns a typed dataset. Throws DatasetError with a precise path. */
export function parsePerDayDataset(json: unknown, where = DATA_FILE): PerDayDataset {
  const o = record(json, where);
  if (o.unit !== 'persons-per-day') fail(`${where}.unit`, "'persons-per-day' expected");
  const year = finite(o.year, `${where}.year`, 1950, 2100);
  if (!Number.isInteger(year)) fail(`${where}.year`, 'integer expected');

  const seen = new Set<string>();
  let previous = Infinity;
  const rows = array(o.rows, `${where}.rows`, 1).map((raw, i): PerDayRow => {
    const at = `${where}.rows[${i}]`;
    const r = record(raw, at);
    const code = string(r.code, `${at}.code`, ISO2);
    if (seen.has(code)) fail(`${at}.code`, `duplicate code ${code}`);
    seen.add(code);
    const region = oneOf(r.region, REGIONS, `${at}.region`);
    const births = finite(r.births, `${at}.births`, 0, MAX_PER_DAY);
    const deaths = finite(r.deaths, `${at}.deaths`, 0, MAX_PER_DAY);
    const population = finite(r.population, `${at}.population`, 1, MAX_POPULATION);
    if (!Number.isInteger(births) || !Number.isInteger(deaths)) fail(at, 'whole persons per day expected');
    // Plausibility: a country cannot have more births or deaths per year than people.
    if ((births + deaths) * 365 > population) fail(at, 'births + deaths per year exceed the population');
    if (births > previous) fail(`${at}.births`, 'rows must be sorted by births, descending');
    previous = births;
    return { code, region, births, deaths, population };
  });

  return { year, unit: 'persons-per-day', rows };
}

/** Global rank by births (ties share the order of the file), net change and deaths per birth. */
export function rankPerDay(dataset: PerDayDataset): RankedPerDayRow[] {
  return dataset.rows.map((r, i) => ({
    ...r,
    rank: i + 1,
    net: r.births - r.deaths,
    ratio: r.births > 0 ? r.deaths / r.births : null,
  }));
}

/** World totals = the sum of all countries in the file (235 countries and territories). */
export function summarizeWorld(rows: readonly RankedPerDayRow[]): WorldSummary {
  let births = 0;
  let deaths = 0;
  let shrinking = 0;
  for (const r of rows) {
    births += r.births;
    deaths += r.deaths;
    if (r.deaths > r.births) shrinking++;
  }
  return {
    births,
    deaths,
    net: births - deaths,
    birthsPerSecond: births / SECONDS_PER_DAY,
    deathsPerSecond: deaths / SECONDS_PER_DAY,
    countries: rows.length,
    shrinking,
  };
}

/** Counts for the live clock: whole persons after `seconds` at the given daily rates (never negative). */
export function countSince(seconds: number, perDay: number): number {
  if (!(seconds > 0) || !(perDay > 0)) return 0;
  return Math.floor((seconds * perDay) / SECONDS_PER_DAY);
}

/** check:data hook (scripts/check-data.ts): validates every file listed in `meta.data`. */
export function validateDataFile(file: string, json: unknown): void {
  if (file !== DATA_FILE) fail(file, `no parser for this file (expected ${DATA_FILE})`);
  parsePerDayDataset(json, file);
}
