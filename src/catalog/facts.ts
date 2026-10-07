// facts.ts — CHANGED (S3-cp): the country-facts contract behind "Ukraine in numbers" (#/c/ua).
// Each entry with a country ranking has src/viz/<id>/facts.ts: a pure `facts(read) → FactTable[]` built from the
// entry's own parsers and ranking functions, run at build time by scripts/gen-facts.ts into
// public/data/country-facts.json (committed, loaded lazily by the profile page only). The file holds every
// country, numbers and format ids only — text is formatted at render time, like the card previews (S3-th).
import { DatasetError, array, finite, oneOf, record, string } from '../lib/dataset';
import type { Localized } from './types';

export const FACTS_FILE = 'country-facts.json';
/** Served next to the entry folders: ./data/country-facts.json. */
export const FACTS_URL = `./data/${FACTS_FILE}`;

/** Sections of the profile page, in page order. */
export const FACT_GROUPS = ['economy', 'people', 'land', 'security', 'energy'] as const;
export type FactGroup = (typeof FACT_GROUPS)[number];

/**
 * Every table id in page order. A table missing here fails gen:facts — placing a new fact on the page is a
 * deliberate choice, not an accident of folder order.
 */
export const FACT_ORDER = [
  'gdp-total',
  'gdp-per-capita',
  'gdp-ppp-per-capita',
  'robot-density',
  'population',
  'population-density',
  'births-per-day',
  'deaths-per-birth',
  'land-area',
  'homicide-rate',
  'numbeo-crime',
  'peace-index',
  'oil-consumption',
  'oil-per-capita',
  'electricity-generation',
  'electricity-per-capita',
  'electricity-low-carbon',
  'carbon-intensity',
  'electricity-access',
] as const;
export type FactId = (typeof FACT_ORDER)[number];

export const FACT_FORMATS = [
  'usd-compact', // $214bn
  'usd-whole', // $5,866
  'count-compact', // 38.98M
  'density', // 67/km²
  'int', // 663
  'dec2', // 2.18
  'area-whole', // 579,320 km²
  'rate2', // 3.78
  'index1', // 46.9
  'score', // 3.184
  'kbd', // 285K b/d
  'barrels', // 2.7 bbl
  'twh', // 111.5 TWh
  'mwh', // 2.7 MWh
  'share', // 0.722 → 72.2%
  'percent', // 100 → 100% (the value is already in percent)
  'g-kwh', // 250 g/kWh
] as const;
export type FactFormat = (typeof FACT_FORMATS)[number];

/** [ISO 3166-1 alpha-2, rank as the entry shows it (ties share it), value]. Rows are in the entry's list order. */
export type FactRow = readonly [code: string, rank: number, value: number];

export type FactTable = {
  id: FactId;
  /** The entry whose page shows this ranking (and whose functions computed it). */
  entry: string;
  group: FactGroup;
  label: Localized;
  /** What rank 1 means: "#1 = largest economy". */
  first: Localized;
  format: FactFormat;
  /** The ranking's year; null when the source has none (land area). */
  year: number | null;
  /** Page parameters that open this ranking (defaults omitted); the profile adds `page` and `focus`. */
  link: Readonly<Record<string, string>>;
  /** The entry's rows per page — the profile opens the page that shows the country. */
  pageSize: number;
  rows: readonly FactRow[];
  /** Countries whose figure is from another year than `year` (the source's latest for that country). */
  years?: Readonly<Record<string, number>>;
  /** Countries shown with "*" on the entry's page: internationally recognized borders. */
  marked?: readonly string[];
  /** Ranks in the source's previous edition, for "▲2 since 2024". */
  prev?: { year: number; ranks: Readonly<Record<string, number>> };
};

export type FactsFile = { tables: readonly FactTable[] };

/** What an entry's facts.ts reads: one JSON file of any entry (its own, or a joined one such as land area). */
export type ReadData = (entry: string, file: string) => unknown;
/** The module shape of src/viz/<id>/facts.ts. */
export type FactsModule = { facts: (read: ReadData) => FactTable[] };

// ── Validation (gen:facts, check:catalog, tests and the browser) ───────────────────────────────────
const ISO2 = /^[A-Z]{2}$/;
const ENTRY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PARAM_KEY = /^[a-z][a-z0-9-]{0,31}$/;

function localized(v: unknown, where: string): Localized {
  const o = record(v, where);
  return { en: string(o.en, `${where}.en`), uk: string(o.uk, `${where}.uk`) };
}

function codeMap(v: unknown, where: string, min: number, max: number, codes: ReadonlySet<string>): Record<string, number> {
  const o = record(v, where);
  const out: Record<string, number> = {};
  for (const [code, n] of Object.entries(o)) {
    if (!codes.has(code)) throw new DatasetError(`${where}.${code}: not a row of this table`);
    out[code] = finite(n, `${where}.${code}`, min, max);
  }
  return out;
}

function table(v: unknown, where: string): FactTable {
  const o = record(v, where);
  const id = oneOf(o.id, FACT_ORDER, `${where}.id`);
  const at = `${where}(${id})`;
  const rows = array(o.rows, `${at}.rows`, 1).map((r, i): FactRow => {
    const t = array(r, `${at}.rows[${i}]`, 3);
    if (t.length !== 3) throw new DatasetError(`${at}.rows[${i}]: [code, rank, value] expected`);
    return [string(t[0], `${at}.rows[${i}][0]`, ISO2), finite(t[1], `${at}.rows[${i}][1]`, 1, 10_000), finite(t[2], `${at}.rows[${i}][2]`)];
  });
  const codes = new Set(rows.map((r) => r[0]));
  if (codes.size !== rows.length) throw new DatasetError(`${at}.rows: a country appears twice`);
  // Ranks never fall along the list and never exceed the row number (ties share the first rank of the run).
  rows.forEach(([, rank], i) => {
    if (rank > i + 1) throw new DatasetError(`${at}.rows[${i}]: rank ${rank} after only ${i} rows`);
    if (i > 0 && rank < rows[i - 1]![1]) throw new DatasetError(`${at}.rows[${i}]: ranks must not fall`);
  });
  const link = record(o.link, `${at}.link`);
  const out: FactTable = {
    id,
    entry: string(o.entry, `${at}.entry`, ENTRY),
    group: oneOf(o.group, FACT_GROUPS, `${at}.group`),
    label: localized(o.label, `${at}.label`),
    first: localized(o.first, `${at}.first`),
    format: oneOf(o.format, FACT_FORMATS, `${at}.format`),
    year: o.year === null ? null : finite(o.year, `${at}.year`, 1900, 2100),
    link: Object.fromEntries(
      Object.entries(link).map(([k, val]) => {
        if (!PARAM_KEY.test(k) || k === 'page' || k === 'focus') throw new DatasetError(`${at}.link.${k}: not allowed`);
        return [k, string(val, `${at}.link.${k}`, /^[a-z0-9-]{1,32}$/)];
      }),
    ),
    pageSize: finite(o.pageSize, `${at}.pageSize`, 1, 1000),
    rows,
  };
  if (o.years !== undefined) out.years = codeMap(o.years, `${at}.years`, 1900, 2100, codes);
  if (o.marked !== undefined) {
    out.marked = array(o.marked, `${at}.marked`, 1).map((c, i) => {
      const code = string(c, `${at}.marked[${i}]`, ISO2);
      if (!codes.has(code)) throw new DatasetError(`${at}.marked[${i}]: not a row of this table`);
      return code;
    });
  }
  if (o.prev !== undefined) {
    const p = record(o.prev, `${at}.prev`);
    out.prev = { year: finite(p.year, `${at}.prev.year`, 1900, 2100), ranks: codeMap(p.ranks, `${at}.prev.ranks`, 1, 10_000, codes) };
  }
  return out;
}

/** Validates unknown JSON (the generated file, or one entry's output) and returns typed tables in FACT_ORDER. */
export function parseFacts(json: unknown, where = FACTS_FILE): FactsFile {
  const o = record(json, where);
  const tables = array(o.tables, `${where}.tables`, 1).map((t, i) => table(t, `${where}.tables[${i}]`));
  const ids = tables.map((t) => t.id);
  if (new Set(ids).size !== ids.length) throw new DatasetError(`${where}.tables: a table id appears twice`);
  const order = ids.map((id) => FACT_ORDER.indexOf(id));
  if (order.some((n, i) => i > 0 && n < order[i - 1]!)) throw new DatasetError(`${where}.tables: not in FACT_ORDER`);
  return { tables };
}
