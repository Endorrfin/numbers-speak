// preview.ts — CHANGED (S3-th): the gallery card preview, built from this entry's own data at build time
// (scripts/gen-previews.ts). Numbers come from the dataset; rows are chosen by rank, never by a country code.
import type { CardPreview, PreviewSource } from '../../catalog/preview';
import { argMonth, num, ym } from '../../catalog/previewKit';
import { DATA_FILE, parseVolunteers, type VolunteersDataset } from './data';

export const previewSource: PreviewSource<VolunteersDataset> = { file: DATA_FILE, parse: parseVolunteers };

/** The registry month by month; the key figure is the growth over the last 12 months. */
export function preview(dataset: VolunteersDataset): CardPreview {
  const rows = dataset.rows;
  const last = rows[rows.length - 1]!;
  const yearAgo = rows.find((r) => r.year === last.year - 1 && r.month === last.month);
  if (!yearAgo) throw new Error('volunteers-growth preview: no month a year before the last one');
  const values = rows.map((r) => r.count);
  return {
    key: {
      value: num(last.count - yearAgo.count, 'signed-int'),
      label: { en: 'growth over 12 months · {month}', uk: 'приріст за 12 місяців · {month}' },
      args: { month: argMonth(last.year, last.month) },
    },
    marks: {
      kind: 'series',
      lines: [{ values, tone: 'series-primary', area: true }],
      max: Math.max(...values),
      from: ym(rows[0]!.year, rows[0]!.month),
      to: ym(last.year, last.month),
    },
  };
}
