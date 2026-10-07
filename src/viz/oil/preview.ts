// preview.ts — CHANGED (S3-oil): the gallery card preview, built from this entry's own data at build time
// (scripts/gen-previews.ts). Rows are chosen by rank, never by a country code: the five largest consumers in the
// EI's latest year; the key figure is the two largest consumers' share of the world.
import type { CardPreview, PreviewSource } from '../../catalog/preview';
import { argCountry, num, regionTone, topRows } from '../../catalog/previewKit';
import { FILES, parseConsumption, rankConsumption } from './data';
import type { ConsumptionDataset } from './data';

export const previewSource: PreviewSource<ConsumptionDataset> = { file: FILES.consumption, parse: (json) => parseConsumption(json) };

export function preview(dataset: ConsumptionDataset): CardPreview {
  const ranked = rankConsumption(dataset, 'total', null);
  const [a, b] = [ranked[0]!, ranked[1]!];
  return {
    key: {
      value: num(a.share + b.share, 'pct0'),
      label: { en: '{a} + {b}: share of the world’s oil', uk: '{a} + {b}: частка світової нафти' },
      args: { a: argCountry(a.code), b: argCountry(b.code) },
    },
    // Barrels a day (kb/d × 1000), printed compact: "19.4M".
    marks: topRows(
      ranked.map((r) => ({ code: r.code, value: r.kbd * 1000, tone: regionTone(r.region) })),
      5,
      'count-compact',
    ),
  };
}
