// data.ts — donations dataset: monthly monobank jars, three major funds by year, humanitarian logistics.
// CHANGED (S3-cd): new.
import { array, fail, finite, record, string } from '../../lib/dataset';

export const DATA_FILE = 'donations-2022-2025.json';

export type MonthRow = { year: number; month: number; amount: number };

export const FUND_IDS = ['united24', 'cba', 'prytula'] as const;
export type FundId = (typeof FUND_IDS)[number];
export type FundRow = { id: FundId; byYear: Record<string, number> };

export type AidRow = { year: number; parcels: number; tonnes: number };

export type LegacyDonors = { year: number; month: number; count: number };

export type DonationsDataset = {
  /** Monobank jars, billion UAH per month. */
  unit: 'uah_billion';
  /** Consecutive months, ascending, starting Feb 2022. */
  monthly: MonthRow[];
  /** Three major funds' annual totals, billion UAH. */
  funds: FundRow[];
  /** The year among `funds` that is not yet complete (its total covers `fundsPartialMonths` months only). */
  fundsPartialYear: number;
  fundsPartialMonths: number;
  /** Nova Poshta humanitarian shipments, full calendar years. */
  aid: AidRow[];
  /** Context only, not plotted: the last point of the person-count series this page replaces (can't extend
   *  to 2025 — see README). */
  legacyDonors: LegacyDonors;
};

function parseMonthly(raw: unknown, where: string): MonthRow[] {
  const rows = array(raw, where, 2).map((r, i): MonthRow => {
    const at = `${where}[${i}]`;
    const o = record(r, at);
    const year = finite(o.year, `${at}.year`, 2020, 2100);
    const month = finite(o.month, `${at}.month`, 1, 12);
    const amount = finite(o.amount, `${at}.amount`, 0, 100);
    if (!Number.isInteger(year) || !Number.isInteger(month)) fail(at, 'integer year/month expected');
    return { year, month, amount };
  });
  rows.forEach((r, i) => {
    const prev = rows[i - 1];
    if (prev && r.year * 12 + r.month !== prev.year * 12 + prev.month + 1) {
      fail(`${where}[${i}]`, 'consecutive months expected');
    }
  });
  return rows;
}

export function parseDonations(json: unknown, where = DATA_FILE): DonationsDataset {
  const o = record(json, where);
  if (o.unit !== 'uah_billion') fail(`${where}.unit`, "'uah_billion' expected");
  const monthly = parseMonthly(o.monthly, `${where}.monthly`);

  const fundIds = new Set<string>();
  const funds = array(o.funds, `${where}.funds`, FUND_IDS.length).map((raw, i): FundRow => {
    const at = `${where}.funds[${i}]`;
    const f = record(raw, at);
    const id = string(f.id, `${at}.id`);
    if (!(FUND_IDS as readonly string[]).includes(id)) fail(`${at}.id`, `unknown fund '${id}'`);
    if (fundIds.has(id)) fail(`${at}.id`, `duplicate fund '${id}'`);
    fundIds.add(id);
    const byYear = record(f.byYear, `${at}.byYear`);
    const out: Record<string, number> = {};
    for (const [y, v] of Object.entries(byYear)) out[y] = finite(v, `${at}.byYear.${y}`, 0, 200);
    return { id: id as FundId, byYear: out };
  });
  for (const id of FUND_IDS) if (!fundIds.has(id)) fail(`${where}.funds`, `missing fund '${id}'`);

  const fundsPartialYear = finite(o.fundsPartialYear, `${where}.fundsPartialYear`, 2020, 2100);
  const fundsPartialMonths = finite(o.fundsPartialMonths, `${where}.fundsPartialMonths`, 1, 11);

  const aid = array(o.aid, `${where}.aid`, 1).map((raw, i): AidRow => {
    const at = `${where}.aid[${i}]`;
    const a = record(raw, at);
    return {
      year: finite(a.year, `${at}.year`, 2020, 2100),
      parcels: finite(a.parcels, `${at}.parcels`, 0, 100_000_000),
      tonnes: finite(a.tonnes, `${at}.tonnes`, 0, 10_000_000),
    };
  });

  const ld = record(o.legacyDonors, `${where}.legacyDonors`);
  const legacyDonors: LegacyDonors = {
    year: finite(ld.year, `${where}.legacyDonors.year`, 2020, 2100),
    month: finite(ld.month, `${where}.legacyDonors.month`, 1, 12),
    count: finite(ld.count, `${where}.legacyDonors.count`, 0, 100_000_000),
  };

  return { unit: 'uah_billion', monthly, funds, fundsPartialYear, fundsPartialMonths, aid, legacyDonors };
}

/** Full calendar years present in `monthly` — the only years fit for the seasonal overlay (see
 *  volunteers-growth/data.ts for why: renderYearChart draws a missing month as 0, not a gap). */
export function fullYears(rows: readonly MonthRow[]): number[] {
  const byYear = new Map<number, number>();
  for (const r of rows) byYear.set(r.year, (byYear.get(r.year) ?? 0) + 1);
  return [...byYear.entries()].filter(([, n]) => n === 12).map(([y]) => y).sort((a, b) => a - b);
}

/** Display names kept out of the JSON (CLAUDE.md §4: numbers as numbers). */
export const FUND_NAME: Record<FundId, { en: string; uk: string }> = {
  united24: { en: 'United24', uk: 'United24' },
  cba: { en: 'Come Back Alive', uk: '«Повернись живим»' },
  prytula: { en: 'Serhiy Prytula Foundation', uk: 'Фонд Сергія Притули' },
};

export function validateDataFile(file: string, json: unknown): void {
  if (file !== DATA_FILE) fail(file, `no parser for this file (expected ${DATA_FILE})`);
  parseDonations(json, file);
}
