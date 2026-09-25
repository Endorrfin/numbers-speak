// data.ts — the global-peace-index dataset contract (S3-rb): types, the parser (prep, check:data, browser) and pure
// derivations. Institute for Economics & Peace, Global Peace Index 2026 (June 2026): 163 countries, overall score
// 1–5 (lower = more peaceful), the rank as printed in the report's ranking table (tied countries share a rank,
// shown "=70"), and the change in rank and score since the prior year as given in the 2026 report. Regions are UN
// M49 continents from the ISO code (the gallery's filter), not IEP's nine regions.
import { ISO2 } from '../../lib/countries';
import { REGIONS } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { array, fail, finite, oneOf, record, string } from '../../lib/dataset';

export const EDITION = 2026;
export const DATA_FILE = `gpi-${EDITION}.json`;
export const DATA_FILES: readonly string[] = [DATA_FILE];
/** The GPI scale: every indicator is scored 1–5, and so is the weighted overall score. */
export const SCORE_MIN = 1;
export const SCORE_MAX = 5;
/** A sanity bound, not a rule: no country can move further than the index has places (163 in 2026). */
const MAX_RANK_CHANGE = 200;

export type GpiRow = {
  /** ISO 3166-1 alpha-2. */
  code: string;
  region: Region;
  /** As printed in the ranking table (1 = most peaceful); tied countries share it. */
  rank: number;
  /** Printed with "=" — shares its rank with the next or previous row. */
  tied?: true;
  /** Overall score, 1–5; lower = more peaceful. */
  score: number;
  /** Places moved since the prior year, as given in the report: + = up (more peaceful), − = down. */
  rankChange: number;
  /** Score change since the prior year, as given in the report's regional tables: − = more peaceful. */
  scoreChange: number;
  /** The rank in the report's regional table and text, when it differs from the ranking table (Honduras). */
  regionalRank?: number;
};

export type GpiDataset = {
  edition: number;
  /** Publication month of the report. */
  published: string;
  /** In the report's order: by rank, ascending. */
  rows: GpiRow[];
};

const int = (v: unknown, where: string, min: number, max: number): number => {
  const n = finite(v, where, min, max);
  if (!Number.isInteger(n)) fail(where, 'integer expected');
  return n;
};

/** Validates unknown JSON and returns a typed dataset. Throws DatasetError with a precise path. */
export function parseGpiDataset(json: unknown, where = DATA_FILE): GpiDataset {
  const o = record(json, where);
  const edition = int(o.edition, `${where}.edition`, 2008, 2100);
  const published = string(o.published, `${where}.published`, /^\d{4}-\d{2}$/);
  const raw = array(o.rows, `${where}.rows`, 1);
  const seen = new Set<string>();
  let previous: GpiRow | undefined;
  const rows = raw.map((item, i): GpiRow => {
    const at = `${where}.rows[${i}]`;
    const r = record(item, at);
    const code = string(r.code, `${at}.code`, ISO2);
    if (seen.has(code)) fail(`${at}.code`, `duplicate code ${code}`);
    seen.add(code);
    const region = oneOf(r.region, REGIONS, `${at}.region`);
    const rank = int(r.rank, `${at}.rank`, 1, raw.length);
    if (r.tied !== undefined && r.tied !== true) fail(`${at}.tied`, 'true or absent expected');
    const tied = r.tied === true;
    const score = finite(r.score, `${at}.score`, SCORE_MIN, SCORE_MAX);
    // Ranks follow the rows (1, 2, 3 …); a tie repeats the rank and the next rank skips (=70, =70, 72).
    const sharesPrevious = tied && previous?.tied === true && previous.rank === rank;
    if (sharesPrevious) {
      if (score !== previous!.score) fail(`${at}.score`, `tied with ${previous!.code} but the score differs`);
    } else if (rank !== i + 1) fail(`${at}.rank`, `${rank} — expected ${i + 1} (rows must be in rank order)`);
    if (previous && score < previous.score) fail(`${at}.score`, 'scores must not decrease down the ranking');
    const rankChange = int(r.rankChange, `${at}.rankChange`, -MAX_RANK_CHANGE, MAX_RANK_CHANGE);
    const scoreChange = finite(r.scoreChange, `${at}.scoreChange`, SCORE_MIN - SCORE_MAX, SCORE_MAX - SCORE_MIN);
    const row: GpiRow = { code, region, rank, score, rankChange, scoreChange };
    if (tied) row.tied = true;
    if (r.regionalRank !== undefined) row.regionalRank = int(r.regionalRank, `${at}.regionalRank`, 1, raw.length);
    previous = row;
    return row;
  });
  for (const [i, r] of rows.entries()) {
    const partner = rows[i - 1]?.rank === r.rank || rows[i + 1]?.rank === r.rank;
    if (r.tied && !partner) fail(`${where}.rows[${i}].tied`, `${r.code} is marked tied but no other row has rank ${r.rank}`);
  }
  return { edition, published, rows };
}

/** check:data hook (scripts/check-data.ts): validates every file listed in `meta.data`. */
export function validateDataFile(file: string, json: unknown): void {
  if (file !== DATA_FILE) fail(file, `no parser for this file (expected ${DATA_FILE})`);
  parseGpiDataset(json, file);
}

export type Order = 'most' | 'least';

/** Rows in display order: the report's (most peaceful first) or reversed (least peaceful first). */
export function orderGpi(rows: readonly GpiRow[], order: Order): GpiRow[] {
  return order === 'most' ? [...rows] : [...rows].reverse();
}

/** "=70" for a tie, "71" otherwise — as the report prints it. */
export function rankLabel(r: Pick<GpiRow, 'rank' | 'tied'>): string {
  return `${r.tied ? '=' : ''}${r.rank}`;
}

/** Headline numbers for the status line: how many countries became more / less peaceful by score. */
export function gpiSummary(rows: readonly GpiRow[]): { total: number; improved: number; deteriorated: number } {
  return {
    total: rows.length,
    improved: rows.filter((r) => r.scoreChange < 0).length,
    deteriorated: rows.filter((r) => r.scoreChange > 0).length,
  };
}
