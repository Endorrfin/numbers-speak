// data.ts — the births & deaths dataset contract: types, the parser (prep, check:data, browser) and pure
// derivations (natural change, deaths per birth, index 1990 = 100). Derived values are never stored.
import { array, fail, finite, oneOf, record } from '../../lib/dataset';

export const DATA_FILE = 'births-deaths-1990-2025.json';

/**
 * What the registered numbers cover. The territory changed twice, so a fall across a boundary is partly
 * a change of coverage, not only of demography — the page shows every segment as a band with a note.
 *   full            — all of Ukraine (1990–2013)
 *   no-crimea-ordlo — without the AR of Crimea, Sevastopol and the occupied parts of Donetsk and Luhansk oblasts
 *   no-occupied     — without Crimea and the temporarily occupied territories (Ministry of Justice data)
 */
export const COVERAGES = ['full', 'no-crimea-ordlo', 'no-occupied'] as const;
export type Coverage = (typeof COVERAGES)[number];

export type CoverageSegment = { from: number; to: number; coverage: Coverage };

export type YearRow = {
  year: number;
  /** Live births registered in the year, persons. */
  births: number;
  /** Deaths registered in the year, persons. */
  deaths: number;
};

export type BirthsDeathsDataset = {
  unit: 'persons';
  /** Contiguous, in year order, covering every row exactly once. */
  coverage: CoverageSegment[];
  /** Consecutive years, ascending. */
  rows: YearRow[];
};

/** A display-ready row. */
export type DemoRow = YearRow & {
  coverage: Coverage;
  /** births − deaths (negative = natural decrease). */
  net: number;
  /** deaths / births. */
  ratio: number;
  /** births and deaths as % of the first year (first year = 100). */
  birthsIndex: number;
  deathsIndex: number;
};

const MAX_EVENTS = 2_000_000; // Ukraine never registered 1 M births or deaths a year; catches unit slips

export function parseBirthsDeaths(json: unknown, where = DATA_FILE): BirthsDeathsDataset {
  const o = record(json, where);
  if (o.unit !== 'persons') fail(`${where}.unit`, "'persons' expected");

  const rows = array(o.rows, `${where}.rows`, 2).map((raw, i): YearRow => {
    const at = `${where}.rows[${i}]`;
    const r = record(raw, at);
    const year = finite(r.year, `${at}.year`, 1950, 2100);
    const births = finite(r.births, `${at}.births`, 1, MAX_EVENTS);
    const deaths = finite(r.deaths, `${at}.deaths`, 1, MAX_EVENTS);
    for (const [k, v] of [['year', year], ['births', births], ['deaths', deaths]] as const) {
      if (!Number.isInteger(v)) fail(`${at}.${k}`, 'integer expected');
    }
    return { year, births, deaths };
  });
  rows.forEach((r, i) => {
    const prev = rows[i - 1];
    if (prev && r.year !== prev.year + 1) fail(`${where}.rows[${i}].year`, `${prev.year + 1} expected (consecutive years)`);
  });

  const first = rows[0]!.year;
  const last = rows[rows.length - 1]!.year;
  let next = first;
  const coverage = array(o.coverage, `${where}.coverage`, 1).map((raw, i): CoverageSegment => {
    const at = `${where}.coverage[${i}]`;
    const c = record(raw, at);
    const from = finite(c.from, `${at}.from`, first, last);
    const to = finite(c.to, `${at}.to`, from, last);
    if (from !== next) fail(`${at}.from`, `${next} expected (segments are contiguous)`);
    next = to + 1;
    return { from, to, coverage: oneOf(c.coverage, COVERAGES, `${at}.coverage`) };
  });
  if (next !== last + 1) fail(`${where}.coverage`, `segments must end at ${last}`);

  return { unit: 'persons', coverage, rows };
}

export function coverageOf(dataset: BirthsDeathsDataset, year: number): Coverage {
  return dataset.coverage.find((c) => year >= c.from && year <= c.to)?.coverage ?? 'full';
}

export function deriveRows(dataset: BirthsDeathsDataset): DemoRow[] {
  const base = dataset.rows[0]!;
  return dataset.rows.map((r) => ({
    ...r,
    coverage: coverageOf(dataset, r.year),
    net: r.births - r.deaths,
    ratio: r.deaths / r.births,
    birthsIndex: (r.births / base.births) * 100,
    deathsIndex: (r.deaths / base.deaths) * 100,
  }));
}

export type Summary = {
  first: DemoRow;
  last: DemoRow;
  /** Sum of natural decrease over the years with more deaths than births, persons (positive). */
  totalDecrease: number;
  /** First year of the uninterrupted run of natural decrease that lasts to the last year. */
  decreaseSince: number;
  /** The year with the largest natural decrease. */
  worst: DemoRow;
  /** The year with the most deaths. */
  peakDeaths: DemoRow;
};

export function summarize(rows: readonly DemoRow[]): Summary {
  const first = rows[0]!;
  const last = rows[rows.length - 1]!;
  let decreaseSince = last.year;
  for (let i = rows.length - 1; i >= 0 && rows[i]!.net < 0; i--) decreaseSince = rows[i]!.year;
  const totalDecrease = rows.filter((r) => r.net < 0).reduce((s, r) => s - r.net, 0);
  const worst = rows.reduce((a, r) => (r.net < a.net ? r : a));
  const peakDeaths = rows.reduce((a, r) => (r.deaths > a.deaths ? r : a));
  return { first, last, totalDecrease, decreaseSince, worst, peakDeaths };
}

/** check:data hook (scripts/check-data.ts). */
export function validateDataFile(file: string, json: unknown): void {
  if (file !== DATA_FILE) fail(file, `no parser for this file (expected ${DATA_FILE})`);
  parseBirthsDeaths(json, file);
}
