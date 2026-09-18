// data.ts — the GDP dataset contract: types, the parser (prep, check:data, browser) and pure derivations.
import { ISO2 } from '../../lib/countries';
import { REGIONS } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { array, fail, finite, oneOf, record, string } from '../../lib/dataset';

export const DATA_FILE = 'gdp-2023.json';

export type GdpRow = {
  /** ISO 3166-1 alpha-2. */
  code: string;
  region: Region;
  /** GDP in current US$. */
  value: number;
};

export type GdpDataset = {
  indicator: 'NY.GDP.MKTP.CD';
  year: number;
  unit: 'USD';
  /** World Bank "World" aggregate (WLD) for the same year — the denominator of every share. */
  worldTotal: number;
  /** Sorted by value, descending. */
  rows: GdpRow[];
};

/** A derived, display-ready row: rank and share are computed here, never stored. */
export type RankedGdpRow = GdpRow & { rank: number; share: number };

const MAX_GDP = 1e15; // $1,000 tn — an order of magnitude above any economy; catches unit mistakes

/** Validates unknown JSON and returns a typed dataset. Throws DatasetError with a precise path. */
export function parseGdpDataset(json: unknown, where = DATA_FILE): GdpDataset {
  const o = record(json, where);
  if (o.indicator !== 'NY.GDP.MKTP.CD') fail(`${where}.indicator`, "'NY.GDP.MKTP.CD' expected");
  if (o.unit !== 'USD') fail(`${where}.unit`, "'USD' expected");
  const year = finite(o.year, `${where}.year`, 1960, 2100);
  if (!Number.isInteger(year)) fail(`${where}.year`, 'integer expected');
  const worldTotal = finite(o.worldTotal, `${where}.worldTotal`, 1, MAX_GDP * 10);

  const seen = new Set<string>();
  let sum = 0;
  let previous = Infinity;
  const rows = array(o.rows, `${where}.rows`, 1).map((raw, i): GdpRow => {
    const at = `${where}.rows[${i}]`;
    const r = record(raw, at);
    const code = string(r.code, `${at}.code`, ISO2);
    if (seen.has(code)) fail(`${at}.code`, `duplicate code ${code}`);
    seen.add(code);
    const region = oneOf(r.region, REGIONS, `${at}.region`);
    const value = finite(r.value, `${at}.value`, 1, MAX_GDP);
    if (value > previous) fail(`${at}.value`, 'rows must be sorted by value, descending');
    previous = value;
    sum += value;
    return { code, region, value };
  });
  // Economies without data are missing, never extra: the parts cannot exceed the world aggregate.
  if (sum > worldTotal * 1.001) fail(`${where}.rows`, `sum ${sum} exceeds worldTotal ${worldTotal}`);

  return { indicator: 'NY.GDP.MKTP.CD', year, unit: 'USD', worldTotal, rows };
}

/** Global rank (1 = largest) and share of the world total. Rank stays global under a region filter. */
export function rankGdp(dataset: GdpDataset): RankedGdpRow[] {
  return dataset.rows.map((r, i) => ({ ...r, rank: i + 1, share: r.value / dataset.worldTotal }));
}

/** check:data hook (scripts/check-data.ts): validates every file listed in `meta.data`. */
export function validateDataFile(file: string, json: unknown): void {
  if (file !== DATA_FILE) fail(file, `no parser for this file (expected ${DATA_FILE})`);
  parseGdpDataset(json, file);
}
