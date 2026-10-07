// facts.ts — CHANGED (S3-cp): this entry's ranking for the country profile (scripts/gen-facts.ts → country-facts.json).
import type { FactTable, ReadData } from '../../catalog/facts';
import { markedOf, rowsOf } from '../../catalog/factKit';
import { DATA_FILE, parseAreaDataset, rankArea } from './data';
import meta from './meta';
import { PAGE_SIZE } from './state';

export function facts(read: ReadData): FactTable[] {
  const ds = parseAreaDataset(read(meta.id, DATA_FILE));
  const t: FactTable = {
    id: 'land-area',
    entry: meta.id,
    group: 'land',
    label: { en: 'Land area', uk: 'Площа суходолу' },
    first: { en: '#1 = largest', uk: '№1 = найбільша' },
    format: 'area-whole',
    year: null,
    link: {},
    pageSize: PAGE_SIZE,
    rows: rowsOf(rankArea(ds, 'land', 'area')),
  };
  const marked = markedOf(ds.rows.filter((r) => r.note === 'recognized-borders').map((r) => r.code));
  if (marked) t.marked = marked;
  return [t];
}
