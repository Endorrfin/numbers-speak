// preview.ts — CHANGED (S3-th): the gallery card preview, built from this entry's own data at build time
// (scripts/gen-previews.ts). Numbers come from the dataset; rows are chosen by rank, never by a country code.
import type { CardPreview, PreviewSource } from '../../catalog/preview';
import { argNum, extremeRows, num, regionTone } from '../../catalog/previewKit';
import { DATA_FILE, SCORE_MAX, SCORE_MIN, orderGpi, parseGpiDataset, type GpiDataset } from './data';

export const previewSource: PreviewSource<GpiDataset> = { file: DATA_FILE, parse: parseGpiDataset };

/** Two most and two least peaceful countries on the index's own 1–5 scale (not from 0). */
export function preview(dataset: GpiDataset): CardPreview {
  const rows = orderGpi(dataset.rows, 'most');
  const first = rows[0]!;
  const last = rows[rows.length - 1]!;
  return {
    key: {
      value: [num(first.score, 'score'), num(last.score, 'score')],
      label: { en: 'most and least peaceful of {n} countries', uk: 'найбільш і найменш мирні з {n} країн' },
      args: { n: argNum(rows.length, 'int') },
    },
    marks: extremeRows(
      rows.map((r) => ({ code: r.code, value: r.score, tone: regionTone(r.region) })),
      2,
      'score',
      [SCORE_MIN, SCORE_MAX],
    ),
  };
}
