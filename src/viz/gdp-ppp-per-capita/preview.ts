// preview.ts — CHANGED (S3-th): the gallery card preview, built from this entry's own data at build time
// (scripts/gen-previews.ts). Numbers come from the dataset; rows are chosen by rank, never by a country code.
import type { CardPreview, PreviewSource } from '../../catalog/preview';
import { argCountry, extremeRows, num, regionTone } from '../../catalog/previewKit';
import { LATEST_YEAR, dataFile, parsePppDataset, rankPpp, type PppDataset } from './data';

export const previewSource: PreviewSource<PppDataset> = { file: dataFile(LATEST_YEAR), parse: parsePppDataset };

/** Two richest and two poorest economies per person; the key figure is the gap between the extremes. */
export function preview(dataset: PppDataset): CardPreview {
  const ranked = rankPpp(dataset);
  const first = ranked[0]!;
  const last = ranked[ranked.length - 1]!;
  return {
    key: {
      value: num(first.value / last.value, 'times'),
      label: { en: '{a} vs {b}: richest and poorest per person', uk: '{a} і {b}: найбагатша й найбідніша на особу' },
      args: { a: argCountry(first.code), b: argCountry(last.code) },
    },
    marks: extremeRows(
      ranked.map((r) => ({ code: r.code, value: r.value, tone: regionTone(r.region) })),
      2,
      'usd-compact',
    ),
  };
}
