// data.ts — the GDP (PPP) per capita dataset contract (S3-rb): types, the parser (prep, check:data, browser)
// and pure derivations. One file per year from one WDI vintage (World Bank API, updated 2026-07-13). The world
// average is the World Bank's own "World" (WLD) aggregate, stored in the file; the "× world average" multiple is
// derived here, never stored (CATALOG §E Q2 — replaces the legacy typed "world share" column).
import { ISO2 } from '../../lib/countries';
import { REGIONS } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { array, fail, finite, oneOf, record, string } from '../../lib/dataset';

export const INDICATOR = 'NY.GDP.PCAP.PP.CD';

/** Years with a file, ascending. The last one is the default view. */
export const YEARS: readonly number[] = [2023, 2024, 2025];
export const LATEST_YEAR = 2025;

/** Economies the World Bank publishes (WDI country list without aggregates) — the coverage denominator. */
export const WB_ECONOMIES = 217;

export const dataFile = (year: number): string => `gdp-ppp-per-capita-${year}.json`;
export const DATA_FILES: readonly string[] = YEARS.map(dataFile);

export type PppRow = {
  /** ISO 3166-1 alpha-2. */
  code: string;
  region: Region;
  /** GDP per capita, PPP, current international $. */
  value: number;
};

export type PppDataset = {
  indicator: typeof INDICATOR;
  year: number;
  unit: 'international $';
  /** World Bank "World" (WLD) aggregate for the same indicator and year. */
  worldAverage: number;
  /** Sorted by value, descending. */
  rows: PppRow[];
};

/** A derived, display-ready row: rank and multiple are computed here, never stored. */
export type RankedPppRow = PppRow & {
  rank: number;
  /** value ÷ world average (1 = average). */
  ratio: number;
};

const MAX_VALUE = 1e7; // $10 m per person — ~60× Singapore; catches unit mistakes, not a real limit

/** Validates unknown JSON and returns a typed dataset. Throws DatasetError with a precise path. */
export function parsePppDataset(json: unknown, where = 'gdp-ppp-per-capita'): PppDataset {
  const o = record(json, where);
  if (o.indicator !== INDICATOR) fail(`${where}.indicator`, `'${INDICATOR}' expected`);
  if (o.unit !== 'international $') fail(`${where}.unit`, "'international $' expected");
  const year = finite(o.year, `${where}.year`, 1990, 2100);
  if (!Number.isInteger(year)) fail(`${where}.year`, 'integer expected');

  const seen = new Set<string>();
  let previous = Infinity;
  const rows = array(o.rows, `${where}.rows`, 1).map((raw, i): PppRow => {
    const at = `${where}.rows[${i}]`;
    const r = record(raw, at);
    const code = string(r.code, `${at}.code`, ISO2);
    if (seen.has(code)) fail(`${at}.code`, `duplicate code ${code}`);
    seen.add(code);
    const region = oneOf(r.region, REGIONS, `${at}.region`);
    const value = finite(r.value, `${at}.value`, 1, MAX_VALUE);
    if (value > previous) fail(`${at}.value`, 'rows must be sorted by value, descending');
    previous = value;
    return { code, region, value };
  });
  if (rows.length > WB_ECONOMIES) fail(`${where}.rows`, `${rows.length} rows — more than the ${WB_ECONOMIES} WB economies`);
  // An average lies between the extremes; anything else is a unit or join mistake.
  const worldAverage = finite(o.worldAverage, `${where}.worldAverage`, rows.at(-1)!.value, rows[0]!.value);
  return { indicator: INDICATOR, year, unit: 'international $', worldAverage, rows };
}

/** Global rank (1 = highest) and multiple of the world average. Rank stays global under a region filter. */
export function rankPpp(dataset: PppDataset): RankedPppRow[] {
  return dataset.rows.map((r, i) => ({ ...r, rank: i + 1, ratio: r.value / dataset.worldAverage }));
}

/** check:data hook (scripts/check-data.ts): validates every file listed in `meta.data`. */
export function validateDataFile(file: string, json: unknown): void {
  if (!DATA_FILES.includes(file)) fail(file, `no parser for this file (expected one of ${DATA_FILES.join(', ')})`);
  const d = parsePppDataset(json, file);
  if (dataFile(d.year) !== file) fail(`${file}.year`, `${d.year} does not match the file name`);
}
