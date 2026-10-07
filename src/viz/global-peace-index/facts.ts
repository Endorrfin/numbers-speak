// facts.ts — CHANGED (S3-cp): this entry's ranking for the country profile (scripts/gen-facts.ts → country-facts.json).
import type { FactTable, ReadData } from '../../catalog/facts';
import { DATA_FILE, EDITION, orderGpi, parseGpiDataset } from './data';
import meta from './meta';
import { PAGE_SIZE } from './state';

export function facts(read: ReadData): FactTable[] {
  const rows = orderGpi(parseGpiDataset(read(meta.id, DATA_FILE)).rows, 'most');
  return [
    {
      id: 'peace-index',
      entry: meta.id,
      group: 'security',
      label: { en: 'Global Peace Index', uk: 'Global Peace Index' },
      first: { en: '#1 = most peaceful', uk: '№1 = наймирніша країна' },
      format: 'score',
      year: EDITION,
      link: {},
      pageSize: PAGE_SIZE,
      rows: rows.map((r) => [r.code, r.rank, r.score] as const),
      // The report gives places moved since the prior edition (+ = up), so the earlier rank is rank + change.
      prev: { year: EDITION - 1, ranks: Object.fromEntries(rows.map((r) => [r.code, r.rank + r.rankChange])) },
    },
  ];
}
