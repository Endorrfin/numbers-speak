// facts.ts — CHANGED (S3-cp): this entry's ranking for the country profile (scripts/gen-facts.ts → country-facts.json).
import type { FactTable, ReadData } from '../../catalog/facts';
import { rowsOf } from '../../catalog/factKit';
import { LATEST_YEAR, YEARS, dataFile, parsePppDataset, rankPpp } from './data';
import meta from './meta';
import { PAGE_SIZE } from './state';

const ranking = (read: ReadData, year: number) => rankPpp(parsePppDataset(read(meta.id, dataFile(year)), dataFile(year)));

export function facts(read: ReadData): FactTable[] {
  const rows = rowsOf(ranking(read, LATEST_YEAR));
  const t: FactTable = {
    id: 'gdp-ppp-per-capita',
    entry: meta.id,
    group: 'economy',
    label: { en: 'GDP per person, PPP', uk: 'ВВП на людину за ПКС' },
    first: { en: '#1 = highest', uk: '№1 = найвищий' },
    format: 'usd-whole',
    year: LATEST_YEAR,
    link: {},
    pageSize: PAGE_SIZE,
    rows,
  };
  const prevYear = LATEST_YEAR - 1;
  if (YEARS.includes(prevYear)) {
    const listed = new Set(rows.map((r) => r[0]));
    t.prev = { year: prevYear, ranks: Object.fromEntries(ranking(read, prevYear).filter((r) => listed.has(r.code)).map((r) => [r.code, r.rank])) };
  }
  return [t];
}
