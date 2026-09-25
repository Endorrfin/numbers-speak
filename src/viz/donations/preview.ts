// preview.ts — CHANGED (S3-th): the gallery card preview, built from this entry's own data at build time
// (scripts/gen-previews.ts). Numbers come from the dataset; rows are chosen by rank, never by a country code.
import type { CardPreview, PreviewSource } from '../../catalog/preview';
import { argMax, argMonth, num, ym } from '../../catalog/previewKit';
import { DATA_FILE, parseDonations, type DonationsDataset } from './data';

export const previewSource: PreviewSource<DonationsDataset> = { file: DATA_FILE, parse: parseDonations };

/** The monthly line; the key figure is the record month (the subtitle already gives the total). */
export function preview(dataset: DonationsDataset): CardPreview {
  const m = dataset.monthly;
  const values = m.map((r) => r.amount);
  const peak = argMax(values);
  const top = m[peak]!;
  return {
    key: {
      value: num(top.amount, 'uah-bn'),
      label: { en: 'record month · {month}', uk: 'рекордний місяць · {month}' },
      args: { month: argMonth(top.year, top.month) },
    },
    marks: {
      kind: 'series',
      lines: [{ values, tone: 'series-primary', area: true }],
      max: values[peak]!,
      from: ym(m[0]!.year, m[0]!.month),
      to: ym(m[m.length - 1]!.year, m[m.length - 1]!.month),
      peak: { line: 0, index: peak },
    },
  };
}
