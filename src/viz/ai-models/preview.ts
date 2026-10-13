// preview.ts — CHANGED (S3-ai2): the gallery card preview, built from this entry's own data at build time
// (scripts/gen-previews.ts). The key figure is the training-compute trend of every model with a figure (×4.7 a year,
// owner's pick of three candidates); the line is the largest training run of each year, in orders of magnitude above
// the first year's. No company is picked.
import type { CardPreview, PreviewSource } from '../../catalog/preview';
import { argNum, num } from '../../catalog/previewKit';
import { FILES, computeTrend, parseCompute } from './data';
import type { ComputeDataset } from './data';

export const previewSource: PreviewSource<ComputeDataset> = { file: FILES.compute, parse: (json) => parseCompute(json) };

export function preview(dataset: ComputeDataset): CardPreview {
  const trend = computeTrend(dataset.rows);
  const years = [...new Set(dataset.rows.map((r) => Number(r.date.slice(0, 4))))].sort((a, b) => a - b);
  const top = years.map((y) => Math.max(...dataset.rows.filter((r) => Number(r.date.slice(0, 4)) === y).map((r) => Math.log10(r.flop))));
  const line = top.map((v) => v - top[0]!);
  return {
    key: {
      value: num(trend.perYear, 'times1'),
      label: { en: 'a year: training compute, trend of {n} models', uk: 'на рік: обчислення на навчання, тренд {n} моделей' },
      args: { n: argNum(dataset.rows.length, 'int') },
    },
    marks: {
      kind: 'series',
      lines: [{ values: line, tone: 'series-primary', area: true }],
      max: Math.max(...line),
      from: String(years[0]),
      to: String(years.at(-1)),
      legend: [{ en: 'largest training run each year (log)', uk: 'найбільше навчання за рік (лог.)' }],
    },
  };
}
