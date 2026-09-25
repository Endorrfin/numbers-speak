// preview.ts — CHANGED (S3-th): the gallery card preview, built from this entry's own data at build time
// (scripts/gen-previews.ts). Numbers come from the dataset; rows are chosen by rank, never by a country code.
import type { CardPreview, PreviewSource } from '../../catalog/preview';
import { argNum, num, wholeParts } from '../../catalog/previewKit';
import {
  AGE_FROM,
  AGE_TO,
  DATA_FILE,
  GROUP_IDS,
  SPAN_YEARS,
  activityRows,
  groupRows,
  oecdAverage,
  parseTimeUse,
  type TimeUseDataset,
} from './data';
import { GROUP_TEXT } from './text';

export const previewSource: PreviewSource<TimeUseDataset> = { file: DATA_FILE, parse: parseTimeUse };

/** 50 squares = the 50 years from 15 to 64 (OECD average, both sexes), coloured by group; key = years asleep. */
export function preview(dataset: TimeUseDataset): CardPreview {
  const rows = activityRows(oecdAverage(dataset).total);
  const sleep = rows.find((r) => r.id === 'sleep');
  if (!sleep) throw new Error('time-of-life preview: no sleep row');
  const groups = groupRows(rows);
  return {
    key: {
      value: num(sleep.years, 'years1'),
      label: { en: 'asleep of the {span} years from {from} to {to}', uk: 'уві сні з {span} років від {from} до {to}' },
      args: { span: argNum(SPAN_YEARS, 'int'), from: argNum(AGE_FROM, 'int'), to: argNum(AGE_TO, 'int') },
    },
    marks: {
      kind: 'grid',
      counts: wholeParts(groups.map((g) => g.years), SPAN_YEARS),
      columns: 10,
      tones: GROUP_IDS.map((g) => `life-${g}` as const),
      legend: GROUP_IDS.map((g) => GROUP_TEXT[g]),
    },
  };
}
