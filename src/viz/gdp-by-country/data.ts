// data.ts — the GDP dataset contract: types, the parser (prep, check:data, browser) and pure derivations.
// CHANGED (S3-gdp): two metrics (total GDP, GDP per capita) × several years, one file each; rows may carry a
// `note` when the value is not a World Bank figure for the dataset year (owner decision: keep + mark).
import { ISO2 } from '../../lib/countries';
import { REGIONS } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { array, fail, finite, oneOf, record, string } from '../../lib/dataset';

export const METRICS = ['total', 'per-capita'] as const;
export type Metric = (typeof METRICS)[number];

/** Years with a file, per metric, ascending. The last one is the default view. */
export const YEARS: Readonly<Record<Metric, readonly number[]>> = {
  total: [2023, 2024, 2025],
  'per-capita': [2024, 2025],
};
export const LATEST_YEAR = 2025;

const INDICATOR = { total: 'NY.GDP.MKTP.CD', 'per-capita': 'NY.GDP.PCAP.CD' } as const;
type Indicator = (typeof INDICATOR)[Metric];

export const dataFile = (metric: Metric, year: number): string =>
  metric === 'total' ? `gdp-${year}.json` : `gdp-per-capita-${year}.json`;

/** Every shipped file (meta.data lists the same set; test-gdp keeps them in sync). */
export const DATA_FILES: readonly string[] = METRICS.flatMap((m) => YEARS[m].map((y) => dataFile(m, y)));

export const NOTE_SOURCES = ['IMF', 'UN'] as const;
export type NoteSource = (typeof NOTE_SOURCES)[number];

/**
 * Why a value is not a World Bank figure for the dataset year: another publisher's estimate (`source`),
 * an earlier year (`year`), or both. Absent = World Bank, dataset year.
 */
export type ValueNote = { source?: NoteSource; year?: number };

export type GdpRow = {
  /** ISO 3166-1 alpha-2. */
  code: string;
  region: Region;
  /** Current US$ — total GDP or GDP per capita, by the dataset's indicator. */
  value: number;
  note?: ValueNote;
};

type Common = { year: number; unit: 'USD'; /** Sorted by value, descending. */ rows: GdpRow[] };
export type GdpTotalDataset = Common & {
  indicator: 'NY.GDP.MKTP.CD';
  /** The denominator of every share: WB "World" (2023) or the sum of the listed economies (2024+). */
  worldTotal: number;
};
export type GdpPerCapitaDataset = Common & {
  indicator: 'NY.GDP.PCAP.CD';
  /** Population-weighted world average: Σ GDP ÷ Σ population of the listed economies. */
  worldAverage: number;
};
export type GdpDataset = GdpTotalDataset | GdpPerCapitaDataset;

export const metricOf = (d: GdpDataset): Metric => (d.indicator === 'NY.GDP.MKTP.CD' ? 'total' : 'per-capita');

/** A derived, display-ready row: rank and ratio are computed here, never stored. */
export type RankedGdpRow = GdpRow & {
  rank: number;
  /** Total: share of world GDP (0..1). Per capita: multiple of the world average (1 = average). */
  ratio: number;
};

const MAX_VALUE: Record<Indicator, number> = {
  'NY.GDP.MKTP.CD': 1e15, // $1,000 tn — an order of magnitude above any economy; catches unit mistakes
  'NY.GDP.PCAP.CD': 1e7, // $10 m per person — ~30× Monaco
};

function parseNote(v: unknown, at: string, year: number): ValueNote | undefined {
  if (v === undefined) return undefined;
  const o = record(v, at);
  const note: ValueNote = {};
  if (o.source !== undefined) note.source = oneOf(o.source, NOTE_SOURCES, `${at}.source`);
  if (o.year !== undefined) {
    const y = finite(o.year, `${at}.year`, 1990, year - 1);
    if (!Number.isInteger(y)) fail(`${at}.year`, 'integer expected');
    note.year = y;
  }
  if (!note.source && note.year === undefined) fail(at, 'a note needs a source or an earlier year');
  return note;
}

/**
 * Validates unknown JSON and returns a typed dataset. Throws DatasetError with a precise path.
 * `expected` pins the indicator (the file name decides it), so a per-capita file can never be drawn as totals.
 */
export function parseGdpDataset(json: unknown, where = 'gdp', expected?: Metric): GdpDataset {
  const o = record(json, where);
  const indicator = oneOf(o.indicator, Object.values(INDICATOR), `${where}.indicator`);
  if (expected && indicator !== INDICATOR[expected]) fail(`${where}.indicator`, `'${INDICATOR[expected]}' expected`);
  if (o.unit !== 'USD') fail(`${where}.unit`, "'USD' expected");
  const year = finite(o.year, `${where}.year`, 1960, 2100);
  if (!Number.isInteger(year)) fail(`${where}.year`, 'integer expected');
  const max = MAX_VALUE[indicator];

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
    const value = finite(r.value, `${at}.value`, 1, max);
    if (value > previous) fail(`${at}.value`, 'rows must be sorted by value, descending');
    previous = value;
    sum += value;
    const note = parseNote(r.note, `${at}.note`, year);
    return note ? { code, region, value, note } : { code, region, value };
  });

  if (indicator === 'NY.GDP.MKTP.CD') {
    const worldTotal = finite(o.worldTotal, `${where}.worldTotal`, 1, max * 10);
    // Economies without data are missing, never extra: the parts cannot exceed the world aggregate.
    if (sum > worldTotal * 1.001) fail(`${where}.rows`, `sum ${sum} exceeds worldTotal ${worldTotal}`);
    return { indicator, year, unit: 'USD', worldTotal, rows };
  }
  // An average lies between the extremes; anything else is a unit or join mistake.
  const worldAverage = finite(o.worldAverage, `${where}.worldAverage`, rows.at(-1)!.value, rows[0]!.value);
  return { indicator, year, unit: 'USD', worldAverage, rows };
}

/** Global rank (1 = largest) and ratio to the world. Rank stays global under a region filter. */
export function rankGdp(dataset: GdpDataset): RankedGdpRow[] {
  const denominator = dataset.indicator === 'NY.GDP.MKTP.CD' ? dataset.worldTotal : dataset.worldAverage;
  return dataset.rows.map((r, i) => ({ ...r, rank: i + 1, ratio: r.value / denominator }));
}

/** check:data hook (scripts/check-data.ts): validates every file listed in `meta.data`. */
export function validateDataFile(file: string, json: unknown): void {
  const metric = METRICS.find((m) => YEARS[m].some((y) => dataFile(m, y) === file));
  if (!metric) fail(file, `no parser for this file (expected one of ${DATA_FILES.join(', ')})`);
  const d = parseGdpDataset(json, file, metric);
  if (dataFile(metric, d.year) !== file) fail(`${file}.year`, `${d.year} does not match the file name`);
}
