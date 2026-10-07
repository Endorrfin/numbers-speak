// facts.ts — CHANGED (S3-cp): this entry's rankings for the country profile (scripts/gen-facts.ts → country-facts.json).
import type { FactTable, ReadData } from '../../catalog/facts';
import { rowsOf, yearsOf } from '../../catalog/factKit';
import { LATEST_YEAR, YEARS, dataFile, parseGdpDataset, rankGdp, type Metric } from './data';
import meta from './meta';
import { PAGE_SIZE } from './state';

function ranking(read: ReadData, metric: Metric, year: number) {
  const file = dataFile(metric, year);
  return rankGdp(parseGdpDataset(read(meta.id, file), file, metric));
}

function table(read: ReadData, metric: Metric): FactTable {
  const list = ranking(read, metric, LATEST_YEAR);
  const prevYear = LATEST_YEAR - 1;
  const t: FactTable =
    metric === 'total'
      ? {
          id: 'gdp-total',
          entry: meta.id,
          group: 'economy',
          label: { en: 'GDP', uk: 'ВВП' },
          first: { en: '#1 = largest economy', uk: '№1 = найбільший ВВП' },
          format: 'usd-compact',
          year: LATEST_YEAR,
          link: {},
          pageSize: PAGE_SIZE,
          rows: rowsOf(list),
        }
      : {
          id: 'gdp-per-capita',
          entry: meta.id,
          group: 'economy',
          label: { en: 'GDP per person', uk: 'ВВП на людину' },
          first: { en: '#1 = highest', uk: '№1 = найвищий' },
          format: 'usd-whole',
          year: LATEST_YEAR,
          link: { metric: 'per-capita' },
          pageSize: PAGE_SIZE,
          rows: rowsOf(list),
        };
  // A value the source carries from an earlier year (marked "*" on the page) keeps that year.
  const years = yearsOf(list.filter((r) => r.note?.year !== undefined).map((r) => [r.code, r.note!.year!] as const));
  if (years) t.years = years;
  if (YEARS[metric].includes(prevYear)) {
    const listed = new Set(t.rows.map((r) => r[0]));
    const before = ranking(read, metric, prevYear).filter((r) => listed.has(r.code));
    t.prev = { year: prevYear, ranks: Object.fromEntries(before.map((r) => [r.code, r.rank])) };
  }
  return t;
}

export function facts(read: ReadData): FactTable[] {
  return [table(read, 'total'), table(read, 'per-capita')];
}
