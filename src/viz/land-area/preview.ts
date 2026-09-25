// preview.ts — CHANGED (S3-th): the gallery card preview, built from this entry's own data at build time
// (scripts/gen-previews.ts). Numbers come from the dataset; rows are chosen by rank, never by a country code.
import type { CardPreview, PreviewSource } from '../../catalog/preview';
import { argCountry, num, regionTone, topRows } from '../../catalog/previewKit';
import { DATA_FILE, parseAreaDataset, rankArea, type AreaDataset } from './data';

export const previewSource: PreviewSource<AreaDataset> = { file: DATA_FILE, parse: parseAreaDataset };

/** Top five by land area (the page's default metric); the key figure is the largest country's share. */
export function preview(dataset: AreaDataset): CardPreview {
  const ranked = rankArea(dataset, 'land', 'area');
  const first = ranked[0]!;
  return {
    key: {
      value: num(first.share, 'pct1'),
      label: { en: "{a}: share of the world's land", uk: '{a}: частка суходолу світу' },
      args: { a: argCountry(first.code) },
    },
    marks: topRows(
      ranked.map((r) => ({ code: r.code, value: r.value, tone: regionTone(r.region) })),
      5,
      'area-compact',
    ),
  };
}
