// data.ts — the land-area dataset contract: types, the parser (prep, check:data, browser) and pure
// derivations. One file carries both metrics (total area, land area) for every row; the client picks
// which to rank and display by (`Metric`), rather than shipping two files as gdp-by-country does for
// GDP vs GDP per capita — there is no time dimension here, so one file is simpler and keeps the two
// numbers next to each other for the "how much of this country is not land" angle.
import { ISO2 } from '../../lib/countries';
import { REGIONS } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { array, fail, finite, oneOf, record, string } from '../../lib/dataset';

export const METRICS = ['land', 'total'] as const;
export type Metric = (typeof METRICS)[number];

export const SORTS = ['area', 'nonland'] as const;
export type Sort = (typeof SORTS)[number];

export const DATA_FILE = 'land-area.json';
export const DATA_FILES: readonly string[] = [DATA_FILE];

export const NOTE_KINDS = ['recognized-borders', 'definition', 'ice-sheet', 'corrected'] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

export type AreaRow = {
  /** ISO 3166-1 alpha-2. */
  code: string;
  region: Region;
  /** km², land + inland water bodies (Worldometers "Tot. Area"). */
  totalArea: number;
  /** km², total area minus inland water bodies — and, for Greenland, minus its permanent ice sheet. */
  landArea: number;
  /**
   * Why a figure needs a caveat (kept, never silently corrected — CLAUDE.md §4 "keep + mark" convention):
   * - `recognized-borders`: this row's area reflects internationally recognized borders, not the territory
   *   under a state's actual control (Ukraine, Russia — see the page's "About the data").
   * - `definition`: the source's land area exceeds its total area by more than rounding noise, most likely
   *   because the two figures were compiled under different territorial definitions (Norway, Israel,
   *   Afghanistan, Burkina Faso, Sierra Leone). Shown as reported; not independently corrected.
   * - `ice-sheet`: land area excludes a permanent ice sheet, not water (Greenland only).
   * - `corrected`: the source rounds area to whole km², which sends a real, non-zero area to an invalid
   *   0 (Holy See, true area 0.49 km²) — replaced with a precisely sourced figure instead of kept as
   *   reported, because 0 is not a real value here, unlike the `definition` rows above.
   */
  note?: NoteKind;
};

export type AreaDataset = {
  /** Σ totalArea of the listed rows (no independent "world land area" reconciled against them). */
  totalWorld: number;
  /** Σ landArea of the listed rows. */
  landWorld: number;
  /** No fixed sort order — rank is computed at runtime for whichever metric/sort is active. */
  rows: AreaRow[];
};

// An order of magnitude above Russia's total area (17.1M km²) — catches unit mistakes, not a real limit.
const MAX_AREA = 20_000_000;
// A few rows report land area above total area (definitional noise, `note: 'definition'`); allow it,
// but only up to a country-sized amount — a bigger gap would be a unit or parsing mistake, not noise.
const MAX_LAND_OVER_TOTAL = 100_000;

export function metricValue(row: AreaRow, metric: Metric): number {
  return metric === 'land' ? row.landArea : row.totalArea;
}

/**
 * Share of `totalArea` that isn't counted as land — inland water bodies, and Greenland's ice sheet.
 * Negative gaps (rounding noise or a `definition` mismatch) read as 0: a made-up negative share would be
 * worse than an absent one, and clamping keeps `definition`-flagged rows out of a "wettest countries" list
 * without a bespoke exclusion elsewhere.
 */
export function nonLandShare(row: AreaRow): number {
  const gap = row.totalArea - row.landArea;
  return gap > 0 ? gap / row.totalArea : 0;
}

export type RankedAreaRow = AreaRow & {
  rank: number;
  value: number;
  /** Share of the world total for the active metric (0..1). */
  share: number;
  nonLandShare: number;
};

/** Ranks every row for one metric/sort combination. Rank is the row's position in this list. */
export function rankArea(dataset: AreaDataset, metric: Metric, sort: Sort): RankedAreaRow[] {
  const worldTotal = metric === 'land' ? dataset.landWorld : dataset.totalWorld;
  const withValue = dataset.rows.map((r) => ({
    ...r,
    value: metricValue(r, metric),
    share: metricValue(r, metric) / worldTotal,
    nonLandShare: nonLandShare(r),
  }));
  const key = sort === 'nonland' ? (r: (typeof withValue)[number]) => r.nonLandShare : (r: (typeof withValue)[number]) => r.value;
  const sorted = [...withValue].sort((a, b) => key(b) - key(a) || a.code.localeCompare(b.code));
  return sorted.map((r, i) => ({ ...r, rank: i + 1 }));
}

export type RegionShare = { region: Region; value: number; share: number; count: number };

/** Each region's share of the world total for one metric — the regional-share strip. */
export function regionShares(dataset: AreaDataset, metric: Metric): RegionShare[] {
  const worldTotal = metric === 'land' ? dataset.landWorld : dataset.totalWorld;
  const byRegion = new Map<Region, { value: number; count: number }>();
  for (const r of dataset.rows) {
    const v = metricValue(r, metric);
    const acc = byRegion.get(r.region) ?? { value: 0, count: 0 };
    acc.value += v;
    acc.count += 1;
    byRegion.set(r.region, acc);
  }
  return REGIONS.filter((r) => byRegion.has(r)).map((region) => {
    const acc = byRegion.get(region)!;
    return { region, value: acc.value, share: acc.value / worldTotal, count: acc.count };
  });
}

function parseRow(raw: unknown, at: string, seen: Set<string>): AreaRow {
  const r = record(raw, at);
  const code = string(r.code, `${at}.code`, ISO2);
  if (seen.has(code)) fail(`${at}.code`, `duplicate code ${code}`);
  seen.add(code);
  const region = oneOf(r.region, REGIONS, `${at}.region`);
  const totalArea = finite(r.totalArea, `${at}.totalArea`, 0.1, MAX_AREA);
  const landArea = finite(r.landArea, `${at}.landArea`, 0, MAX_AREA);
  if (landArea - totalArea > MAX_LAND_OVER_TOTAL) {
    fail(`${at}.landArea`, `${landArea} exceeds totalArea ${totalArea} by more than ${MAX_LAND_OVER_TOTAL}`);
  }
  const note = r.note === undefined ? undefined : oneOf(r.note, NOTE_KINDS, `${at}.note`);
  return note ? { code, region, totalArea, landArea, note } : { code, region, totalArea, landArea };
}

/** Validates unknown JSON and returns a typed dataset. Throws DatasetError with a precise path. */
export function parseAreaDataset(json: unknown, where = DATA_FILE): AreaDataset {
  const o = record(json, where);
  const totalWorld = finite(o.totalWorld, `${where}.totalWorld`, 1, MAX_AREA * 20);
  const landWorld = finite(o.landWorld, `${where}.landWorld`, 1, MAX_AREA * 20);
  const seen = new Set<string>();
  const rows = array(o.rows, `${where}.rows`, 1).map((raw, i) => parseRow(raw, `${where}.rows[${i}]`, seen));
  const totalSum = rows.reduce((s, r) => s + r.totalArea, 0);
  const landSum = rows.reduce((s, r) => s + r.landArea, 0);
  if (Math.abs(totalSum - totalWorld) > totalWorld * 0.001) {
    fail(`${where}.totalWorld`, `${totalWorld} does not match the sum of rows (${Math.round(totalSum)})`);
  }
  if (Math.abs(landSum - landWorld) > landWorld * 0.001) {
    fail(`${where}.landWorld`, `${landWorld} does not match the sum of rows (${Math.round(landSum)})`);
  }
  return { totalWorld, landWorld, rows };
}

/** check:data hook (scripts/check-data.ts): validates every file listed in `meta.data`. */
export function validateDataFile(file: string, json: unknown): void {
  if (file !== DATA_FILE) fail(file, `no parser for this file (expected ${DATA_FILE})`);
  parseAreaDataset(json, file);
}
