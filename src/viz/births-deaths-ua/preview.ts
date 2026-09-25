// preview.ts — CHANGED (S3-th): the gallery card preview, built from this entry's own data at build time
// (scripts/gen-previews.ts). Numbers come from the dataset; rows are chosen by rank, never by a country code.
import type { CardPreview, PreviewSource } from '../../catalog/preview';
import { argNum, num } from '../../catalog/previewKit';
import { DATA_FILE, deriveRows, parseBirthsDeaths, type BirthsDeathsDataset } from './data';

export const previewSource: PreviewSource<BirthsDeathsDataset> = { file: DATA_FILE, parse: parseBirthsDeaths };

/** Births and deaths per year as two lines; the key figure is the latest deaths-per-birth ratio. */
export function preview(dataset: BirthsDeathsDataset): CardPreview {
  const rows = deriveRows(dataset);
  const first = rows[0]!;
  const last = rows[rows.length - 1]!;
  return {
    key: {
      value: num(last.ratio, 'dec2'),
      label: { en: 'deaths per birth, {year}', uk: 'смертей на одне народження, {year}' },
      args: { year: argNum(last.year, 'year') },
    },
    marks: {
      kind: 'series',
      lines: [
        { values: rows.map((r) => r.births), tone: 'birth' },
        { values: rows.map((r) => r.deaths), tone: 'death' },
      ],
      max: Math.max(...rows.flatMap((r) => [r.births, r.deaths])),
      from: String(first.year),
      to: String(last.year),
      legend: [
        { en: 'births', uk: 'народження' },
        { en: 'deaths', uk: 'смерті' },
      ],
    },
  };
}
