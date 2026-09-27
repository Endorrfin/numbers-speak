// data.ts — CHANGED (S3-re): the real-estate-world dataset contract (CATALOG §C #9). One Numbeo snapshot — the
// owner's hand copies of three Numbeo tables (Numbeo's terms forbid automated collection) — joined on Numbeo's
// city label into one row per city, with coordinates for the map. Numbeo ranks three measures itself:
//   centre  — US$ per m² to buy an apartment in the city centre (Numbeo item 100);
//   outside — the same outside the centre (item 101);
//   income  — price-to-income ratio in years, from Numbeo's Property Prices Index: a 90 m² home at the average of
//             the centre and outside prices ÷ yearly net family income (1.5 × the average net salary).
// From the same index: mortgage as % of income and the price-to-rent ratio (centre, outside). Derived at runtime,
// never stored: the centre premium (centre ÷ outside), m² a year of income buys (90 ÷ price-to-income), medians,
// and the ranks of every measure Numbeo does not rank itself.
import type { Localized } from '../../catalog/types';
import { ISO2 } from '../../lib/countries';
import { REGIONS } from '../../lib/regions';
import type { Region } from '../../lib/regions';
import { array, fail, finite, oneOf, record, string } from '../../lib/dataset';

/** The three measures Numbeo ranks (their ranks are stored). */
export const METRICS = ['centre', 'outside', 'income'] as const;
export type Metric = (typeof METRICS)[number];

/** Every measure the page can rank or map; `premium` and `m2` are derived. */
export const MEASURES = ['centre', 'outside', 'premium', 'income', 'm2', 'mortgage', 'rent', 'rentOutside'] as const;
export type Measure = (typeof MEASURES)[number];
export const MEASURE_GROUPS = {
  prices: ['centre', 'outside', 'premium'],
  affordability: ['income', 'm2', 'mortgage'],
  rent: ['rent', 'rentOutside'],
} as const satisfies Record<string, readonly Measure[]>;

/** Numbeo's price-to-income ratio assumes a home of this size (indicators_explained.jsp). */
export const HOME_M2 = 90;

/** The published snapshot; a refresh adds a new file (the month of the owner's copy) and updates meta.data. */
export const DATA_FILE = 'numbeo-2026-09.json';
/** Land outline for the map angle: Natural Earth 1:110m via world-atlas, projected once by prep.ts (Equal Earth). */
export const LAND_FILE = 'land-110m.json';
export const DATA_FILES: readonly string[] = [DATA_FILE, LAND_FILE];

export type CityRow = {
  /** URL-safe identity, `<name>-<iso>` ("kyiv-ua") — used in `?cities=`. */
  id: string;
  /** Numbeo's own label ("Kiev (Kyiv), Ukraine") — the join key of the three tables, kept for traceability. */
  numbeo: string;
  /** Display name: EN from Numbeo's label, UK from Wikidata or reviewed by the owner (data-raw city-names.csv). */
  name: Localized;
  /** ISO 3166-1 alpha-2 of the country or territory (Hong Kong = HK). */
  code: string;
  region: Region;
  /** WGS 84, from Wikidata (P625) or placed by hand where noted in city-names.csv. */
  lat: number;
  lon: number;
  centre?: number;
  centreRank?: number;
  outside?: number;
  outsideRank?: number;
  income?: number;
  incomeRank?: number;
  /** Monthly mortgage payment as % of net family income (20 years, 100 % of the price) — Numbeo's formula. */
  mortgage?: number;
  /** Price-to-rent ratio in the city centre / outside it: years of rent that equal the price. */
  rent?: number;
  rentOutside?: number;
};

export type RealEstateDataset = {
  /** Date of the owner's copy of the Numbeo tables, YYYY-MM-DD. */
  retrieved: string;
  /** One row per city, ordered by centre rank (cities without a centre price last). */
  rows: CityRow[];
};

export const RANK_KEY = { centre: 'centreRank', outside: 'outsideRank', income: 'incomeRank' } as const;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const CITY_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*-[a-z]{2}$/;
const RANGE: Record<Metric, readonly [number, number]> = { centre: [1, 1e6], outside: [1, 1e6], income: [0.1, 1000] };

function localized(v: unknown, where: string): Localized {
  const o = record(v, where);
  return { en: string(o.en, `${where}.en`), uk: string(o.uk, `${where}.uk`) };
}

/** Ranks run 1…N without gaps or repeats, and values never rise from one rank to the next (ties allowed). */
function checkOrder(rows: readonly CityRow[], m: Metric, where: string): void {
  const key = RANK_KEY[m];
  const ordered = rows.filter((r) => r[m] !== undefined).sort((a, b) => a[key]! - b[key]!);
  ordered.forEach((r, i) => {
    if (r[key] !== i + 1) fail(`${where}.${m}`, `ranks must run 1…${ordered.length} without gaps or repeats (${r.numbeo}: ${r[key]} at position ${i + 1})`);
    if (i > 0 && r[m]! > ordered[i - 1]![m]!) fail(`${where}.${m}`, `rank ${i + 1} (${r.numbeo}) is higher than rank ${i}`);
  });
}

/** Validates unknown JSON and returns a typed dataset. Throws DatasetError with a precise path. */
export function parseRealEstateDataset(json: unknown, where = DATA_FILE): RealEstateDataset {
  const o = record(json, where);
  const retrieved = string(o.retrieved, `${where}.retrieved`, DATE);
  const labels = new Set<string>();
  const ids = new Set<string>();
  const names = new Set<string>();
  const rows = array(o.rows, `${where}.rows`, 1).map((raw, i): CityRow => {
    const at = `${where}.rows[${i}]`;
    const r = record(raw, at);
    const id = string(r.id, `${at}.id`, CITY_ID);
    if (ids.has(id)) fail(`${at}.id`, `duplicate id "${id}"`);
    ids.add(id);
    const numbeo = string(r.numbeo, `${at}.numbeo`);
    if (labels.has(numbeo)) fail(`${at}.numbeo`, `duplicate city "${numbeo}"`);
    labels.add(numbeo);
    const name = localized(r.name, `${at}.name`);
    const code = string(r.code, `${at}.code`, ISO2);
    if (!id.endsWith(`-${code.toLowerCase()}`)) fail(`${at}.id`, `"${id}" must end with -${code.toLowerCase()}`);
    for (const lang of ['en', 'uk'] as const) {
      const key = `${lang}:${code}:${name[lang]}`;
      if (names.has(key)) fail(`${at}.name.${lang}`, `two cities named "${name[lang]}" in ${code} — disambiguate the name`);
      names.add(key);
    }
    const row: CityRow = {
      id,
      numbeo,
      name,
      code,
      region: oneOf(r.region, REGIONS, `${at}.region`),
      lat: finite(r.lat, `${at}.lat`, -90, 90),
      lon: finite(r.lon, `${at}.lon`, -180, 180),
    };
    for (const m of METRICS) {
      const key = RANK_KEY[m];
      if (r[m] === undefined && r[key] === undefined) continue;
      if (r[m] === undefined || r[key] === undefined) fail(`${at}.${m}`, 'a value and its rank come together');
      row[m] = finite(r[m], `${at}.${m}`, RANGE[m][0], RANGE[m][1]);
      const rank = finite(r[key], `${at}.${key}`, 1, 1e5);
      if (!Number.isInteger(rank)) fail(`${at}.${key}`, 'integer expected');
      row[key] = rank;
    }
    for (const k of ['mortgage', 'rent', 'rentOutside'] as const) {
      if (r[k] === undefined) continue;
      if (row.income === undefined) fail(`${at}.${k}`, 'comes from the Property Prices Index, so it needs `income`');
      row[k] = finite(r[k], `${at}.${k}`, 0.1, k === 'mortgage' ? 1e5 : 1000);
    }
    if (row.centre === undefined && row.outside === undefined && row.income === undefined) fail(at, 'no measure');
    return row;
  });
  for (const m of METRICS) checkOrder(rows, m, where);
  return { retrieved, rows };
}

/**
 * The land layer of the map: one SVG path in a fixed frame (`width` × `height`) plus the Equal Earth parameters
 * that produced it, so the page projects city coordinates into the same frame. prep.ts writes it from the
 * world-atlas TopoJSON (Antarctica dropped — no city in the list lies south of 60° S).
 */
export type LandLayer = { source: string; width: number; height: number; scale: number; translate: [number, number]; d: string };

const PATH = /^[MLZ0-9.,-]+$/;

export function parseLand(json: unknown, where = LAND_FILE): LandLayer {
  const o = record(json, where);
  const translate = array(o.translate, `${where}.translate`, 2);
  if (translate.length !== 2) fail(`${where}.translate`, 'two numbers expected');
  const d = string(o.d, `${where}.d`, PATH);
  if (d.length > 200_000) fail(`${where}.d`, 'path longer than 200 000 characters');
  return {
    source: string(o.source, `${where}.source`),
    width: finite(o.width, `${where}.width`, 100, 10_000),
    height: finite(o.height, `${where}.height`, 50, 10_000),
    scale: finite(o.scale, `${where}.scale`, 1, 1e5),
    translate: [finite(translate[0], `${where}.translate[0]`, -1e5, 1e5), finite(translate[1], `${where}.translate[1]`, -1e5, 1e5)],
    d,
  };
}

/** check:data hook (scripts/check-data.ts): validates every file listed in `meta.data`. */
export function validateDataFile(file: string, json: unknown): void {
  if (file === LAND_FILE) parseLand(json, file); // CHANGED (S3-re)
  else if (DATA_FILES.includes(file)) parseRealEstateDataset(json, file);
  else fail(file, `no parser for this file (expected one of ${DATA_FILES.join(', ')})`);
}

/** One city in one ranking: the rank, the value, the row for everything else. */
export type RankedCity = { row: CityRow; rank: number; value: number };

/** The cities Numbeo ranks by `m`, in its rank order (1 = highest value). */
export function rankBy(d: RealEstateDataset, m: Metric): RankedCity[] {
  const key = RANK_KEY[m];
  return d.rows
    .filter((r) => r[m] !== undefined)
    .map((r) => ({ row: r, rank: r[key]!, value: r[m]! }))
    .sort((a, b) => a.rank - b.rank);
}

/** How many times a square metre in the centre costs more than outside it (derived, never stored). */
export function premium(r: CityRow): number | undefined {
  return r.centre !== undefined && r.outside !== undefined && r.outside > 0 ? r.centre / r.outside : undefined;
}

/** A city's value for any measure (undefined when its table does not list the city). */
export function measureValue(r: CityRow, m: Measure): number | undefined {
  switch (m) {
    case 'premium':
      return premium(r);
    case 'm2':
      return r.income === undefined ? undefined : HOME_M2 / r.income;
    default:
      return r[m];
  }
}

/**
 * Highest first. Numbeo's own ranks for the measures it ranks; the rest are ranked here, ties broken by Numbeo's
 * order in the table the value comes from (property index, then the centre-price table), so ranks are stable.
 */
export function rankByMeasure(d: RealEstateDataset, m: Measure): RankedCity[] {
  if (m === 'centre' || m === 'outside' || m === 'income') return rankBy(d, m);
  const tie = (r: CityRow): number => (m === 'premium' ? (r.centreRank ?? 1e6) : (r.incomeRank ?? 1e6));
  return d.rows
    .flatMap((r) => {
      const v = measureValue(r, m);
      return v === undefined ? [] : [{ row: r, value: v }];
    })
    .sort((a, b) => b.value - a.value || tie(a.row) - tie(b.row))
    .map((c, i) => ({ ...c, rank: i + 1 }));
}

/** A city's place in one measure's ranking. */
export type RankInfo = { rank: number; total: number; value: number };

/** Every measure's ranking at once, keyed by city id — for tooltips and the comparison cards. */
export function allRanks(d: RealEstateDataset): Record<Measure, ReadonlyMap<string, RankInfo>> {
  const out = {} as Record<Measure, ReadonlyMap<string, RankInfo>>;
  for (const m of MEASURES) {
    const ranked = rankByMeasure(d, m);
    out[m] = new Map(ranked.map((c) => [c.row.id, { rank: c.rank, total: ranked.length, value: c.value }]));
  }
  return out;
}

/** Median of a non-empty list (mean of the two middle values for an even count). */
export function median(values: readonly number[]): number {
  if (values.length === 0) throw new Error('median of an empty list');
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** Ranks 1…n of a list (ties share their mean rank) — for the rank correlation. */
function ranks(values: readonly number[]): number[] {
  const order = values.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const out = new Array<number>(values.length);
  for (let i = 0; i < order.length; ) {
    let j = i;
    while (j + 1 < order.length && order[j + 1]![0] === order[i]![0]) j++;
    for (let k = i; k <= j; k++) out[order[k]![1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return out;
}

/** Spearman's rank correlation of paired values (−1…1); NaN for fewer than 3 pairs or a constant list. */
export function rankCorrelation(xs: readonly number[], ys: readonly number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return NaN;
  const rx = ranks(xs.slice(0, n));
  const ry = ranks(ys.slice(0, n));
  const mean = (n + 1) / 2;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const a = rx[i]! - mean;
    const b = ry[i]! - mean;
    sxy += a * b;
    sxx += a * a;
    syy += b * b;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : NaN;
}
