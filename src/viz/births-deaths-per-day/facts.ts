// facts.ts — CHANGED (S3-cp): this entry's rankings for the country profile (scripts/gen-facts.ts → country-facts.json).
import type { FactTable, ReadData } from '../../catalog/facts';
import { competitionRows } from '../../catalog/factKit';
import { DATA_FILE, applyView, parsePerDayDataset, rankPerDay } from './data';
import meta from './meta';
import { PAGE_SIZE } from './state';

export function facts(read: ReadData): FactTable[] {
  const ds = parsePerDayDataset(read(meta.id, DATA_FILE));
  const ranked = rankPerDay(ds);
  const base = { entry: meta.id, group: 'people', year: ds.year, pageSize: PAGE_SIZE } as const;
  // The page's own orders: births ↓ (default) and deaths per birth ↓ (?sort=ratio), all regions.
  const byRatio = applyView(ranked, { region: 'all', onlyShrinking: false, sort: 'ratio' }).filter((r) => r.ratio !== null);
  return [
    {
      ...base,
      id: 'births-per-day',
      label: { en: 'Births per day', uk: 'Народжень на день' },
      first: { en: '#1 = most', uk: '№1 = найбільше' },
      format: 'int',
      link: {},
      rows: ranked.map((r) => [r.code, r.rank, r.births] as const),
    },
    {
      ...base,
      id: 'deaths-per-birth',
      label: { en: 'Deaths per birth', uk: 'Смертей на одне народження' },
      first: { en: '#1 = most deaths per birth', uk: '№1 = найбільше смертей на народження' },
      format: 'dec2',
      link: { sort: 'ratio' },
      rows: competitionRows(byRatio.map((r) => ({ code: r.code, value: r.ratio! }))),
    },
  ];
}
