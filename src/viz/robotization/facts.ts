// facts.ts — CHANGED (S3-cp): this entry's ranking for the country profile (scripts/gen-facts.ts → country-facts.json).
import type { FactTable, ReadData } from '../../catalog/facts';
import { rowsOf } from '../../catalog/factKit';
import { DATA_FILE, parseRobotDataset, rankRobots } from './data';
import meta from './meta';

export function facts(read: ReadData): FactTable[] {
  const ds = parseRobotDataset(read(meta.id, DATA_FILE));
  return [
    {
      id: 'robot-density',
      entry: meta.id,
      group: 'economy',
      label: { en: 'Industrial robots per 10,000 workers', uk: 'Промислові роботи на 10 тис. працівників' },
      first: { en: '#1 = most robots', uk: '№1 = найбільше роботів' },
      format: 'int',
      year: ds.year,
      link: {},
      pageSize: 1000, // no pager: the page shows the top of the list on one screen
      rows: rowsOf(rankRobots(ds)),
    },
  ];
}
