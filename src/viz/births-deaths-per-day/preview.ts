// preview.ts — CHANGED (S3-th): the gallery card preview, built from this entry's own data at build time
// (scripts/gen-previews.ts). Numbers come from the dataset; rows are chosen by rank, never by a country code.
import type { CardPreview, PreviewSource } from '../../catalog/preview';
import { MAX_FLAGS } from '../../catalog/preview';
import { argCountry, argNum, num } from '../../catalog/previewKit';
import { DATA_FILE, parsePerDayDataset, rankPerDay, type PerDayDataset } from './data';

export const previewSource: PreviewSource<PerDayDataset> = { file: DATA_FILE, parse: parsePerDayDataset };

/**
 * Births ← | → deaths for the five countries with the most births (the page's default order). The key
 * figure is the highest deaths-per-birth ratio of all countries — whichever country that is.
 */
export function preview(dataset: PerDayDataset): CardPreview {
  const ranked = rankPerDay(dataset);
  const top = ranked.slice(0, 5);
  const highest = ranked
    .filter((r) => r.ratio !== null)
    .reduce((a, r) => (r.ratio! > a.ratio! || (r.ratio === a.ratio && r.births > a.births) ? r : a));
  return {
    key: {
      value: num(highest.ratio!, 'dec2'),
      label: { en: '{a}: most deaths per birth of {n} countries', uk: '{a}: найбільше смертей на одне народження серед {n} країн' },
      args: { a: argCountry(highest.code), n: argNum(ranked.length, 'int') },
    },
    marks: {
      kind: 'butterfly',
      rows: top.map((r, i) => (i < MAX_FLAGS ? { code: r.code, flag: true as const, left: r.births, right: r.deaths } : { code: r.code, left: r.births, right: r.deaths })),
      max: Math.max(...top.flatMap((r) => [r.births, r.deaths])),
      tones: ['birth', 'death'],
      legend: [
        { en: 'births per day', uk: 'народжень на день' },
        { en: 'deaths per day', uk: 'смертей на день' },
      ],
    },
  };
}
