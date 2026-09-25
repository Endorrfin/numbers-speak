// preview.ts — CHANGED (S3-th): the gallery card preview, built from this entry's own data at build time
// (scripts/gen-previews.ts). Numbers come from the dataset; rows are chosen by rank, never by a country code.
import type { CardPreview, PreviewSource } from '../../catalog/preview';
import { argCountry, num, regionTone, topRows } from '../../catalog/previewKit';
import { DATA_FILE, parsePopDataset, rankPopulation, type PopDataset } from './data';

export const previewSource: PreviewSource<PopDataset> = { file: DATA_FILE, parse: parsePopDataset };

/** Top five by population; the key figure is the two largest countries' share of the world. */
export function preview(dataset: PopDataset): CardPreview {
  const ranked = rankPopulation(dataset, 'population', null);
  const [a, b] = [ranked[0]!, ranked[1]!];
  return {
    key: {
      value: num((a.population + b.population) / dataset.world, 'pct0'),
      label: { en: '{a} + {b}: share of the world population', uk: '{a} + {b}: частка населення світу' },
      args: { a: argCountry(a.code), b: argCountry(b.code) },
    },
    marks: topRows(
      ranked.map((r) => ({ code: r.code, value: r.population, tone: regionTone(r.region) })),
      5,
      'count-compact',
    ),
  };
}
