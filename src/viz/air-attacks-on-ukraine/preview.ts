// preview.ts — CHANGED (S3-th): the gallery card preview, built from this entry's own data at build time
// (scripts/gen-previews.ts). Numbers come from the dataset; rows are chosen by rank, never by a country code.
import type { CardPreview, PreviewSource } from '../../catalog/preview';
import { num } from '../../catalog/previewKit';
import { DATA_FILE, aggregate, parseAttacks, type AttacksDataset } from './data';

export const previewSource: PreviewSource<AttacksDataset> = { file: DATA_FILE, parse: parseAttacks };

/**
 * Monthly columns: shot down or suppressed (incl. locationally lost — one measure, as on the page) under
 * not intercepted; incomplete months lighter. The key figure is every weapon launched in the dataset.
 */
export function preview(dataset: AttacksDataset): CardPreview {
  const buckets = aggregate(dataset, 'month', 'all');
  const stacks = buckets.map((b) => {
    const launched = b.missiles.launched + b.drones.launched;
    const stopped = b.missiles.destroyed + b.missiles.lost + b.drones.destroyed + b.drones.lost;
    return [stopped, Math.max(0, launched - stopped)];
  });
  const total = buckets.reduce((s, b) => s + b.missiles.launched + b.drones.launched, 0);
  const partial = buckets.flatMap((b, i) => (b.partial ? [i] : []));
  return {
    key: {
      value: num(total, 'int'),
      label: { en: 'missiles and drones launched', uk: 'ракет і дронів запущено' },
    },
    marks: {
      kind: 'columns',
      stacks,
      max: Math.max(...stacks.map((s) => s[0]! + s[1]!)),
      tones: ['air-down', 'air-through'],
      legend: [
        { en: 'shot down or suppressed', uk: 'збито або придушено' },
        { en: 'not intercepted', uk: 'не перехоплено' },
      ],
      from: buckets[0]!.start.slice(0, 7),
      to: buckets[buckets.length - 1]!.start.slice(0, 7),
      partial,
    },
  };
}
