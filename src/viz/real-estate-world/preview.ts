// preview.ts — CHANGED (S3-re): the gallery card preview, built from this entry's own data at build time
// (scripts/gen-previews.ts). Numbers come from the dataset; rows are chosen by rank, never by a country code.
import type { CardPreview, PreviewSource } from '../../catalog/preview';
import { argText, num, regionTone, topRows } from '../../catalog/previewKit';
import { DATA_FILE, parseRealEstateDataset, rankBy, type RealEstateDataset } from './data';

// The page's default tab: the price per m² in the city centre.
export const previewSource: PreviewSource<RealEstateDataset> = { file: DATA_FILE, parse: parseRealEstateDataset };

/** Top five city centres (city names, flags on the first three); the key figure is the most expensive centre as a
 *  multiple of the cheapest one in Numbeo's list. While the price tables are not in the file yet (draft), the card
 *  falls back to years of income, so the generator never fails on a draft. */
export function preview(dataset: RealEstateDataset): CardPreview {
  const centre = rankBy(dataset, 'centre');
  if (centre.length > 1) {
    const first = centre[0]!;
    const last = centre[centre.length - 1]!;
    return {
      key: {
        value: num(first.value / last.value, 'times'),
        label: { en: '{a} vs {b}: a square metre in the city centre', uk: '{a} і {b}: квадратний метр у центрі' },
        args: { a: argText(first.row.name), b: argText(last.row.name) },
      },
      marks: topRows(
        centre.map((c) => ({ code: c.row.code, name: c.row.name, value: c.value, tone: regionTone(c.row.region) })),
        5,
        'usd-compact',
      ),
    };
  }
  const income = rankBy(dataset, 'income');
  const first = income[0]!;
  return {
    key: {
      value: num(first.value, 'years1'),
      label: { en: '{a}: a 90 m² home in years of income', uk: '{a}: житло 90 м² у роках доходу' },
      args: { a: argText(first.row.name) },
    },
    marks: topRows(
      income.map((c) => ({ code: c.row.code, name: c.row.name, value: c.value, tone: regionTone(c.row.region) })),
      5,
      'rate1',
    ),
  };
}
