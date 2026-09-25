// preview.ts — CHANGED (S3-th): the gallery card preview, built from this entry's own data at build time
// (scripts/gen-previews.ts). Numbers come from the dataset; rows are chosen by rank, never by a country code.
import type { CardPreview, PreviewSource } from '../../catalog/preview';
import { argCountry, num, regionTone, topRows } from '../../catalog/previewKit';
import { LATEST_YEAR, dataFile, parseGdpDataset, rankGdp, type GdpTotalDataset } from './data';

const FILE = dataFile('total', LATEST_YEAR); // the page's default view: total GDP, latest year

export const previewSource: PreviewSource<GdpTotalDataset> = {
  file: FILE,
  parse: (json, where) => {
    const d = parseGdpDataset(json, where, 'total');
    if (d.indicator !== 'NY.GDP.MKTP.CD') throw new Error(`${where}: total GDP expected`);
    return d;
  },
};

/** Top five economies; the key figure is the two largest economies' share of world GDP. */
export function preview(dataset: GdpTotalDataset): CardPreview {
  const ranked = rankGdp(dataset);
  const [a, b] = [ranked[0]!, ranked[1]!];
  return {
    key: {
      value: num((a.value + b.value) / dataset.worldTotal, 'pct1'),
      label: { en: '{a} + {b}: share of world GDP', uk: '{a} + {b}: частка світового ВВП' },
      args: { a: argCountry(a.code), b: argCountry(b.code) },
    },
    marks: topRows(
      ranked.map((r) => ({ code: r.code, value: r.value, tone: regionTone(r.region) })),
      5,
      'usd-compact',
    ),
  };
}
