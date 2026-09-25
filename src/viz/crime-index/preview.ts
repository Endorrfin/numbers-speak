// preview.ts — CHANGED (S3-th): the gallery card preview, built from this entry's own data at build time
// (scripts/gen-previews.ts). Numbers come from the dataset; rows are chosen by rank, never by a country code.
import type { CardPreview, PreviewSource } from '../../catalog/preview';
import { argCountry, num, regionTone, topRows } from '../../catalog/previewKit';
import { HOMICIDE_FILE, parseHomicideDataset, rankHomicide, type HomicideDataset } from './data';

// The page's default tab: official homicide rates (UNODC).
export const previewSource: PreviewSource<HomicideDataset> = { file: HOMICIDE_FILE, parse: parseHomicideDataset };

/** Top five homicide rates; the key figure is the highest rate as a multiple of UNODC's world rate. */
export function preview(dataset: HomicideDataset): CardPreview {
  const ranked = rankHomicide(dataset);
  const first = ranked[0]!;
  return {
    key: {
      value: num(first.value / dataset.worldRate, 'times'),
      label: { en: '{a}: homicide rate vs the world average', uk: '{a}: рівень убивств проти середнього у світі' },
      args: { a: argCountry(first.code) },
    },
    marks: topRows(
      ranked.map((r) => ({ code: r.code, value: r.value, tone: regionTone(r.region) })),
      5,
      'rate1',
    ),
  };
}
