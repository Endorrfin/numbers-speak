// facts.ts — CHANGED (S3-cp): this entry's rankings for the country profile (scripts/gen-facts.ts → country-facts.json).
import type { FactTable, ReadData } from '../../catalog/facts';
import { rowsOf } from '../../catalog/factKit';
import { DATA_FILE as POP_FILE, parsePopDataset } from '../population-by-country/data';
import { FILES, parseConsumption, rankConsumption } from './data';
import meta from './meta';
import { PAGE_SIZE } from './state';

export function facts(read: ReadData): FactTable[] {
  const ds = parseConsumption(read(meta.id, FILES.consumption));
  // Per person joins the population entry's file, as the page does.
  const pop = parsePopDataset(read('population-by-country', POP_FILE));
  const population = new Map(pop.rows.map((r) => [r.code, r.population]));
  const base = { entry: meta.id, group: 'energy', year: ds.to, pageSize: PAGE_SIZE } as const;
  return [
    {
      ...base,
      id: 'oil-consumption',
      label: { en: 'Oil consumption', uk: 'Споживання нафти' },
      first: { en: '#1 = most (the source lists {of} countries)', uk: '№1 = найбільше (у джерелі {of} країн)' },
      format: 'kbd',
      link: {},
      rows: rowsOf(rankConsumption(ds, 'total', null)),
    },
    {
      ...base,
      id: 'oil-per-capita',
      label: { en: 'Oil per person a year', uk: 'Нафта на людину за рік' },
      first: { en: '#1 = most', uk: '№1 = найбільше' },
      format: 'barrels',
      link: { metric: 'per-capita' },
      rows: rowsOf(rankConsumption(ds, 'per-capita', population)),
    },
  ];
}
