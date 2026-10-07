// facts.ts — CHANGED (S3-cp): this entry's rankings for the country profile (scripts/gen-facts.ts → country-facts.json).
import type { FactTable, ReadData } from '../../catalog/facts';
import { markedOf, rowsOf } from '../../catalog/factKit';
import { DATA_FILE as AREA_FILE, parseAreaDataset } from '../land-area/data';
import { DATA_FILE, YEAR, parsePopDataset, rankPopulation } from './data';
import meta from './meta';
import { PAGE_SIZE } from './state';

export function facts(read: ReadData): FactTable[] {
  const pop = parsePopDataset(read(meta.id, DATA_FILE));
  const area = parseAreaDataset(read('land-area', AREA_FILE)); // density joins land area at runtime, as on the page
  const marked = markedOf(pop.rows.filter((r) => r.note === 'recognized-borders').map((r) => r.code));
  const base = { entry: meta.id, group: 'people', year: YEAR, pageSize: PAGE_SIZE } as const;
  const population: FactTable = {
    ...base,
    id: 'population',
    label: { en: 'Population', uk: 'Населення' },
    first: { en: '#1 = largest', uk: '№1 = найбільше' },
    format: 'count-compact',
    link: {},
    rows: rowsOf(rankPopulation(pop, 'population', area)),
  };
  const density: FactTable = {
    ...base,
    id: 'population-density',
    label: { en: 'Population density', uk: 'Густота населення' },
    first: { en: '#1 = most densely populated', uk: '№1 = найщільніше заселена' },
    format: 'density',
    link: { metric: 'density' },
    rows: rowsOf(rankPopulation(pop, 'density', area)),
  };
  for (const t of [population, density]) {
    const m = marked?.filter((c) => t.rows.some((r) => r[0] === c));
    if (m?.length) t.marked = m;
  }
  return [population, density];
}
