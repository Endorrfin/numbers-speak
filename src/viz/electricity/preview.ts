// preview.ts — CHANGED (S3-el): the gallery card preview, built from this entry's own data at build time
// (scripts/gen-previews.ts). Two lines from the world file — coal's and all renewables' share of generation since 2000 —
// and the latest year's renewables share as the key figure, with coal's beside it. No country is picked.
import type { CardPreview, PreviewSource } from '../../catalog/preview';
import { argNum, num } from '../../catalog/previewKit';
import { FILES, GROUPS, parseWorld, worldMix } from './data';
import type { WorldDataset } from './data';

export const previewSource: PreviewSource<WorldDataset> = { file: FILES.world, parse: (json) => parseWorld(json) };

export function preview(dataset: WorldDataset): CardPreview {
  const mix = worldMix(dataset);
  const coal = GROUPS.indexOf('coal');
  const last = mix.at(-1)!;
  const coalLine = mix.map((m) => m.shares[coal]! * 100);
  const renewLine = mix.map((m) => m.renewables * 100);
  return {
    key: {
      value: num(last.renewables, 'pct1'),
      label: { en: 'renewables, {year} — coal {coal}', uk: 'відновлювані, {year} — вугілля {coal}' },
      args: { year: argNum(last.year, 'year'), coal: argNum(last.shares[coal]!, 'pct1') },
    },
    marks: {
      kind: 'series',
      lines: [
        { values: coalLine, tone: 'sector-industry' },
        { values: renewLine, tone: 'sector-consumer' },
      ],
      max: Math.max(...coalLine, ...renewLine),
      from: String(dataset.from),
      to: String(dataset.to),
      legend: [
        { en: 'coal', uk: 'вугілля' },
        { en: 'renewables', uk: 'відновлювані' },
      ],
    },
  };
}
