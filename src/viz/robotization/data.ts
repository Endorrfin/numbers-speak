// data.ts — the robotization dataset contract (S3-rb): types, the parser (prep, check:data, browser) and pure
// derivations. IFR World Robotics 2025 (data for 2024): robot density = operational industrial robots per 10,000
// employees in manufacturing, for the 22 economies of IFR's published chart, plus IFR's world figure. The page
// shows the top 15; ranks, "× world average" and the context notes are derived here, never stored.
import { ISO2 } from '../../lib/countries';
import { REGIONS } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { array, fail, finite, oneOf, record, string } from '../../lib/dataset';

export const YEAR = 2024;
export const TOP = 15;
export const DATA_FILE = `robot-density-${YEAR}.json`;
export const DATA_FILES: readonly string[] = [DATA_FILE];

export type RobotRow = {
  /** ISO 3166-1 alpha-2 — for a joint entry, the first economy (its flag and region). */
  code: string;
  /** A second economy IFR reports together with `code` (Belgium and Luxembourg). */
  with?: string;
  region: Region;
  /** Robots per 10,000 employees in manufacturing. */
  value: number;
};

export type RobotDataset = {
  year: number;
  /** IFR's world average for the same year. */
  world: number;
  /** As published, sorted by value, descending (ties keep IFR's order). */
  rows: RobotRow[];
};

export type RankedRobotRow = RobotRow & { rank: number; ratio: number };

const MAX_DENSITY = 10_000; // one robot per worker; catches unit mistakes, not a real limit

/** Validates unknown JSON and returns a typed dataset. Throws DatasetError with a precise path. */
export function parseRobotDataset(json: unknown, where = DATA_FILE): RobotDataset {
  const o = record(json, where);
  const year = finite(o.year, `${where}.year`, 2000, 2100);
  const world = finite(o.world, `${where}.world`, 1, MAX_DENSITY);
  const seen = new Set<string>();
  let previous = Infinity;
  const rows = array(o.rows, `${where}.rows`, TOP).map((raw, i): RobotRow => {
    const at = `${where}.rows[${i}]`;
    const r = record(raw, at);
    const code = string(r.code, `${at}.code`, ISO2);
    const also = r.with === undefined ? undefined : string(r.with, `${at}.with`, ISO2);
    for (const c of [code, also]) {
      if (c === undefined) continue;
      if (seen.has(c)) fail(`${at}.code`, `duplicate code ${c}`);
      seen.add(c);
    }
    const region = oneOf(r.region, REGIONS, `${at}.region`);
    const value = finite(r.value, `${at}.value`, 1, MAX_DENSITY);
    if (!Number.isInteger(value)) fail(`${at}.value`, 'IFR publishes whole robots per 10,000 employees');
    if (value > previous) fail(`${at}.value`, 'rows must be sorted by value, descending');
    previous = value;
    return also ? { code, with: also, region, value } : { code, region, value };
  });
  if (world > rows[0]!.value) fail(`${where}.world`, `${world} is above the highest economy`);
  return { year, world, rows };
}

/** check:data hook (scripts/check-data.ts): validates every file listed in `meta.data`. */
export function validateDataFile(file: string, json: unknown): void {
  if (file !== DATA_FILE) fail(file, `no parser for this file (expected ${DATA_FILE})`);
  parseRobotDataset(json, file);
}

/** Every published row ranked (1 = highest; ties share IFR's order) with its multiple of the world figure. */
export function rankRobots(dataset: RobotDataset): RankedRobotRow[] {
  return dataset.rows.map((r, i) => ({ ...r, rank: i + 1, ratio: r.value / dataset.world }));
}

/** The top `TOP` rows — what the chart and table show. */
export function topRobots(dataset: RobotDataset): RankedRobotRow[] {
  return rankRobots(dataset).slice(0, TOP);
}
