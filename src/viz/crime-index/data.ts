// data.ts — the crime-index dataset contract (S3-rb): two measures as sub-tabs, one file each.
// 1. `homicide` — UNODC intentional-homicide victims per 100,000 (official statistics; latest year per country,
//    2015 or later, older years marked). 2. `numbeo` — Numbeo's Crime Index (0–100), a crowd-sourced survey of
//    how people PERCEIVE crime; its Safety Index is 100 − Crime Index and is derived here, never stored.
// Regions are derived from the ISO code at prep time (CATALOG §E Q1: Haiti = Americas).
import { ISO2 } from '../../lib/countries';
import { REGIONS } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { array, fail, finite, oneOf, record, string } from '../../lib/dataset';

export const SHOWS = ['homicide', 'numbeo'] as const;
export type Show = (typeof SHOWS)[number];

export const HOMICIDE_FILE = 'homicide-rate.json';
export const NUMBEO_FILE = 'numbeo-crime-2026-mid.json';
export const FILE_OF: Record<Show, string> = { homicide: HOMICIDE_FILE, numbeo: NUMBEO_FILE };
export const DATA_FILES: readonly string[] = [HOMICIDE_FILE, NUMBEO_FILE];

/** Oldest year a homicide value may come from (older values are dropped at prep, not shown as current). */
export const OLDEST_YEAR = 2015;

export const HOMICIDE_NOTES = ['combined', 'partial-territory'] as const;
export type HomicideNote = (typeof HOMICIDE_NOTES)[number];

export type HomicideRow = {
  code: string;
  region: Region;
  /** Victims of intentional homicide per 100,000 population, in `year`. */
  rate: number;
  /** Number of victims in `year`. */
  victims: number;
  year: number;
  /**
   * `combined`: UNODC reports parts of the country separately (United Kingdom: England and Wales, Scotland,
   * Northern Ireland); combined at prep from their own counts and rates. `partial-territory`: the only recent
   * figure covers part of the country (Iraq: Central Iraq, without the Kurdistan Region).
   */
  note?: HomicideNote;
};

export type HomicideDataset = {
  /** Date of the UNODC data file. */
  edition: string;
  /** Most recent year in the file; rows from earlier years are marked with their year. */
  latestYear: number;
  /** UNODC's world estimate for `latestYear`. */
  worldRate: number;
  /** Sorted by rate, descending. */
  rows: HomicideRow[];
};

export type NumbeoRow = { code: string; region: Region; /** 0–100, higher = more crime perceived. */ crimeIndex: number };

export type NumbeoDataset = {
  edition: string;
  /** Sorted by crime index, descending. */
  rows: NumbeoRow[];
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function code(r: Record<string, unknown>, at: string, seen: Set<string>): string {
  const c = string(r.code, `${at}.code`, ISO2);
  if (seen.has(c)) fail(`${at}.code`, `duplicate code ${c}`);
  seen.add(c);
  return c;
}

/** Validates unknown JSON and returns a typed dataset. Throws DatasetError with a precise path. */
export function parseHomicideDataset(json: unknown, where = HOMICIDE_FILE): HomicideDataset {
  const o = record(json, where);
  const edition = string(o.edition, `${where}.edition`, DATE);
  const latestYear = finite(o.latestYear, `${where}.latestYear`, OLDEST_YEAR, 2100);
  const worldRate = finite(o.worldRate, `${where}.worldRate`, 0.1, 100);
  const seen = new Set<string>();
  let previous = Infinity;
  const rows = array(o.rows, `${where}.rows`, 1).map((raw, i): HomicideRow => {
    const at = `${where}.rows[${i}]`;
    const r = record(raw, at);
    const c = code(r, at, seen);
    const region = oneOf(r.region, REGIONS, `${at}.region`);
    const rate = finite(r.rate, `${at}.rate`, 0, 1000);
    if (rate > previous) fail(`${at}.rate`, 'rows must be sorted by rate, descending');
    previous = rate;
    const victims = finite(r.victims, `${at}.victims`, 0, 1e6);
    if (!Number.isInteger(victims)) fail(`${at}.victims`, 'whole number expected');
    const year = finite(r.year, `${at}.year`, OLDEST_YEAR, latestYear);
    if (!Number.isInteger(year)) fail(`${at}.year`, 'integer expected');
    const note = r.note === undefined ? undefined : oneOf(r.note, HOMICIDE_NOTES, `${at}.note`);
    const row: HomicideRow = { code: c, region, rate, victims, year };
    return note ? { ...row, note } : row;
  });
  return { edition, latestYear, worldRate, rows };
}

export function parseNumbeoDataset(json: unknown, where = NUMBEO_FILE): NumbeoDataset {
  const o = record(json, where);
  const edition = string(o.edition, `${where}.edition`, /^\d{4}( Mid-Year)?$/);
  const seen = new Set<string>();
  let previous = Infinity;
  const rows = array(o.rows, `${where}.rows`, 1).map((raw, i): NumbeoRow => {
    const at = `${where}.rows[${i}]`;
    const r = record(raw, at);
    const c = code(r, at, seen);
    const region = oneOf(r.region, REGIONS, `${at}.region`);
    const crimeIndex = finite(r.crimeIndex, `${at}.crimeIndex`, 0, 100);
    if (crimeIndex > previous) fail(`${at}.crimeIndex`, 'rows must be sorted by crime index, descending');
    previous = crimeIndex;
    return { code: c, region, crimeIndex };
  });
  return { edition, rows };
}

/** check:data hook (scripts/check-data.ts): validates every file listed in `meta.data`. */
export function validateDataFile(file: string, json: unknown): void {
  if (file === HOMICIDE_FILE) parseHomicideDataset(json, file);
  else if (file === NUMBEO_FILE) parseNumbeoDataset(json, file);
  else fail(file, `no parser for this file (expected one of ${DATA_FILES.join(', ')})`);
}

/** One display-ready row for either measure: rank computed here, never stored. */
export type RankedCrimeRow = {
  code: string;
  region: Region;
  rank: number;
  value: number;
  /** Homicide: the year when older than the file's latest year (marked *). */
  olderYear?: number;
  note?: HomicideNote;
  victims?: number;
  /** Numbeo: 100 − crime index. */
  safetyIndex?: number;
};

export function rankHomicide(d: HomicideDataset): RankedCrimeRow[] {
  return d.rows.map((r, i) => {
    const row: RankedCrimeRow = { code: r.code, region: r.region, rank: i + 1, value: r.rate, victims: r.victims };
    if (r.year < d.latestYear) row.olderYear = r.year;
    if (r.note) row.note = r.note;
    return row;
  });
}

export function rankNumbeo(d: NumbeoDataset): RankedCrimeRow[] {
  return d.rows.map((r, i) => ({
    code: r.code,
    region: r.region,
    rank: i + 1,
    value: r.crimeIndex,
    safetyIndex: Math.round((100 - r.crimeIndex) * 10) / 10,
  }));
}
