// preview.ts — CHANGED (S3-th): the gallery card preview, built from this entry's own data at build time
// (scripts/gen-previews.ts). Numbers come from the dataset; rows are chosen by rank, never by a country code.
import type { CardPreview, PreviewSource } from '../../catalog/preview';
import { argNum, num, topRows } from '../../catalog/previewKit';
import { DATA_FILE, LATEST_YEAR, groupOf, groupShares, parseBrandDataset, rankYear, type BrandDataset } from './data';

export const previewSource: PreviewSource<BrandDataset> = { file: DATA_FILE, parse: parseBrandDataset };

/** The five most valuable brands of the latest year, coloured by sector group (no flags: home country is
 *  not the story); the key figure is the tech group's share of the whole ranking's value. */
export function preview(dataset: BrandDataset): CardPreview {
  const ranked = rankYear(dataset, LATEST_YEAR);
  const tech = groupShares(dataset, LATEST_YEAR).find((g) => g.group === 'tech');
  if (!tech) throw new Error('global-brands-race preview: no tech group');
  return {
    key: {
      value: num(tech.share, 'pct0'),
      label: { en: 'tech brands’ share of the top {n} value, {year}', uk: 'частка техбрендів у вартості топ-{n}, {year}' },
      args: { n: argNum(ranked.length, 'int'), year: argNum(LATEST_YEAR, 'year') },
    },
    marks: topRows(
      ranked.map((r) => ({
        name: { en: r.brand.name, uk: r.brand.name },
        value: r.value,
        tone: `sector-${groupOf(r.brand)}` as const,
      })),
      5,
      'usd-m-compact',
      0,
    ),
  };
}
