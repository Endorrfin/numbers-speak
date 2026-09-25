// preview.ts — CHANGED (S3-th): the gallery card preview, built from this entry's own data at build time
// (scripts/gen-previews.ts). Numbers come from the dataset; rows are chosen by rank, never by a country code.
import type { CardPreview, PreviewSource } from '../../catalog/preview';
import { num, regionTone, topRows } from '../../catalog/previewKit';
import { DATA_FILE, parseRobotDataset, rankRobots, type RobotDataset } from './data';

export const previewSource: PreviewSource<RobotDataset> = { file: DATA_FILE, parse: parseRobotDataset };

/** Top five robot densities; the key figure is IFR's world average (the subtitle already names the leader). */
export function preview(dataset: RobotDataset): CardPreview {
  return {
    key: {
      value: num(dataset.world, 'int'),
      label: {
        en: 'robots per 10,000 manufacturing workers — world average',
        uk: 'роботів на 10 000 працівників виробництва — у середньому у світі',
      },
    },
    marks: topRows(
      rankRobots(dataset).map((r) => ({ code: r.code, value: r.value, tone: regionTone(r.region) })),
      5,
      'int',
    ),
  };
}
