// data.ts — the population-by-country dataset contract (S3-rb): types, the parser (prep, check:data, browser)
// and pure derivations. Population is the only shipped number; density is derived at runtime by joining the
// `land-area` entry's dataset on the ISO code (CATALOG §E Q3: density = population ÷ LAND area, the World
// Bank EN.POP.DNST definition — never a second hand-typed dataset). Rows missing a land area keep a null
// density and a note; tiny areas the source rounds to whole km² are marked approximate.
import { ISO2 } from '../../lib/countries';
import { REGIONS } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { array, fail, finite, oneOf, record, string } from '../../lib/dataset';
import type { AreaDataset } from '../land-area/data';

export const METRICS = ['population', 'density'] as const;
export type Metric = (typeof METRICS)[number];

export const YEAR = 2025;
export const DATA_FILE = `population-${YEAR}.json`;
export const DATA_FILES: readonly string[] = [DATA_FILE];

/** Row notes shipped in the file (from the source). */
export const NOTE_KINDS = ['recognized-borders'] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

/** Density notes, derived at runtime from the join with `land-area`. */
export const DENSITY_NOTES = ['no-area', 'approx-area'] as const;
export type DensityNote = (typeof DENSITY_NOTES)[number];

/**
 * Below this land area (km²) the source's rounding to whole km² moves density by more than 2 %
 * (±0.5 km² ÷ 25 km²), so the density is marked approximate — Monaco's "1 km²" is really ≈ 2 km².
 */
export const APPROX_AREA_BELOW = 25;

export type PopRow = {
  /** ISO 3166-1 alpha-2. */
  code: string;
  region: Region;
  /** Persons on 1 July of `year` (UN WPP 2024, medium variant). */
  population: number;
  /**
   * `recognized-borders`: counted within internationally recognized borders — the UN includes Crimea in
   * Ukraine's figure (WPP footnote "Including Crimea"), not in Russia's; same convention as `land-area`.
   */
  note?: NoteKind;
};

export type PopDataset = {
  year: number;
  /** WPP's "World" row — equals the sum of the 237 rows to rounding (checked by the parser). */
  world: number;
  rows: PopRow[];
};

// India ≈ 1.46 bn; an order of magnitude above catches unit mistakes (thousands vs persons), not a real limit.
const MAX_POP = 5_000_000_000;

function parseRow(raw: unknown, at: string, seen: Set<string>): PopRow {
  const r = record(raw, at);
  const code = string(r.code, `${at}.code`, ISO2);
  if (seen.has(code)) fail(`${at}.code`, `duplicate code ${code}`);
  seen.add(code);
  const region = oneOf(r.region, REGIONS, `${at}.region`);
  const population = finite(r.population, `${at}.population`, 1, MAX_POP);
  if (!Number.isInteger(population)) fail(`${at}.population`, `${population} is not a whole number of persons`);
  const note = r.note === undefined ? undefined : oneOf(r.note, NOTE_KINDS, `${at}.note`);
  return note ? { code, region, population, note } : { code, region, population };
}

/** Validates unknown JSON and returns a typed dataset. Throws DatasetError with a precise path. */
export function parsePopDataset(json: unknown, where = DATA_FILE): PopDataset {
  const o = record(json, where);
  const year = finite(o.year, `${where}.year`, 1950, 2100);
  const world = finite(o.world, `${where}.world`, 1, MAX_POP * 4);
  const seen = new Set<string>();
  const rows = array(o.rows, `${where}.rows`, 1).map((raw, i) => parseRow(raw, `${where}.rows[${i}]`, seen));
  const sum = rows.reduce((s, r) => s + r.population, 0);
  if (Math.abs(sum - world) > world * 0.001) {
    fail(`${where}.world`, `${world} does not match the sum of rows (${sum})`);
  }
  return { year, world, rows };
}

/** check:data hook (scripts/check-data.ts): validates every file listed in `meta.data`. */
export function validateDataFile(file: string, json: unknown): void {
  if (file !== DATA_FILE) fail(file, `no parser for this file (expected ${DATA_FILE})`);
  parsePopDataset(json, file);
}

export type RankedPopRow = PopRow & {
  /** Global rank for the active metric; null = not ranked (no density). */
  rank: number | null;
  /** Value of the active metric; null = no density for this row. */
  value: number | null;
  /** Share of world population (0..1). */
  share: number;
  /** km², from `land-area`; null when that dataset has no row for the code (or is not loaded). */
  landArea: number | null;
  /** Persons per km² of land; null when there is no land area. */
  density: number | null;
  densityNote?: DensityNote;
};

/** Joins every population row with the land-area dataset (null = density not requested or not loaded). */
function withArea(dataset: PopDataset, area: AreaDataset | null): Omit<RankedPopRow, 'rank' | 'value'>[] {
  const byCode = new Map((area?.rows ?? []).map((r) => [r.code, r] as const));
  return dataset.rows.map((r) => {
    const a = byCode.get(r.code);
    const share = r.population / dataset.world;
    if (!a || !(a.landArea > 0)) {
      const none = { ...r, share, landArea: null, density: null };
      return area ? { ...none, densityNote: 'no-area' as const } : none; // no note when density wasn't asked for
    }
    const approx = a.landArea < APPROX_AREA_BELOW && a.note !== 'corrected'; // `corrected` = a precise figure
    const row = { ...r, share, landArea: a.landArea, density: r.population / a.landArea };
    return approx ? { ...row, densityNote: 'approx-area' as const } : row;
  });
}

/**
 * Ranks every row for one metric. Population: all rows, largest first. Density: rows with a density,
 * densest first, then the rows without one (rank null) — they stay in the table, never in the chart.
 */
export function rankPopulation(dataset: PopDataset, metric: Metric, area: AreaDataset | null): RankedPopRow[] {
  const joined = withArea(dataset, area);
  if (metric === 'population') {
    return [...joined]
      .sort((a, b) => b.population - a.population || a.code.localeCompare(b.code))
      .map((r, i) => ({ ...r, rank: i + 1, value: r.population }));
  }
  const withD = joined.filter((r) => r.density !== null).sort((a, b) => b.density! - a.density! || a.code.localeCompare(b.code));
  const without = joined.filter((r) => r.density === null).sort((a, b) => b.population - a.population);
  return [...withD.map((r, i) => ({ ...r, rank: i + 1, value: r.density })), ...without.map((r) => ({ ...r, rank: null, value: null }))];
}

export type DensitySummary = { density: number; population: number; landArea: number; count: number };

/** Σ population ÷ Σ land area over the rows that have both — the world (or a region) as one country. */
export function densityOf(rows: readonly RankedPopRow[]): DensitySummary | null {
  let population = 0;
  let landArea = 0;
  let count = 0;
  for (const r of rows) {
    if (r.landArea === null) continue;
    population += r.population;
    landArea += r.landArea;
    count += 1;
  }
  return landArea > 0 ? { density: population / landArea, population, landArea, count } : null;
}

export type RegionShare = { region: Region; value: number; share: number; count: number };

/** Each region's share of world population — the regional-share strip. */
export function regionShares(dataset: PopDataset): RegionShare[] {
  const byRegion = new Map<Region, { value: number; count: number }>();
  for (const r of dataset.rows) {
    const acc = byRegion.get(r.region) ?? { value: 0, count: 0 };
    acc.value += r.population;
    acc.count += 1;
    byRegion.set(r.region, acc);
  }
  return REGIONS.filter((r) => byRegion.has(r)).map((region) => {
    const acc = byRegion.get(region)!;
    return { region, value: acc.value, share: acc.value / dataset.world, count: acc.count };
  });
}
