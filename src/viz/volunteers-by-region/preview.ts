// preview.ts — CHANGED (S3-th): the gallery card preview, built from this entry's own data at build time
// (scripts/gen-previews.ts). Numbers come from the dataset; rows are chosen by rank, never by a country code.
import type { CardPreview, PreviewSource } from '../../catalog/preview';
import { argMonth, argText, num, topRows } from '../../catalog/previewKit';
import type { Localized } from '../../catalog/types';
import { DATA_FILE, REGION_NAME, parseRegions, type RegionDataset } from './data';

export const previewSource: PreviewSource<RegionDataset> = { file: DATA_FILE, parse: parseRegions };

/** 'Kyiv city & Kyiv Oblast' → 'Kyiv', 'Харківська область' → 'Харківська': the first word fits a card row. */
const short = (name: Localized): Localized => ({ en: name.en.split(' ')[0]!, uk: name.uk.split(' ')[0]! });

/** Top five regions (no flags — they are oblasts); the key figure is the leader's share of the registry. */
export function preview(dataset: RegionDataset): CardPreview {
  const ranked = [...dataset.rows].sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
  const total = ranked.reduce((s, r) => s + r.count, 0);
  const first = ranked[0]!;
  const [year, month] = dataset.asOf.split('-').map(Number) as [number, number];
  return {
    key: {
      value: num(first.count / total, 'pct0'),
      label: { en: '{a}: share of registered volunteers, {month}', uk: '{a}: частка зареєстрованих волонтерів, {month}' },
      args: { a: argText(REGION_NAME[first.id]), month: argMonth(year, month) },
    },
    marks: topRows(
      ranked.map((r) => ({ name: short(REGION_NAME[r.id]), value: r.count, tone: 'series-primary' as const })),
      5,
      'int',
    ),
  };
}
