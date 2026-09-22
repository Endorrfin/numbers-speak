/*
 * prep.ts — data_volunteers_by_regions.csv -> public/data/volunteers-by-region/volunteers-by-region-2024.json.
 * Run: `npm run prep -- volunteers-by-region`.
 *
 * Input: Opendatabot's regional breakdown of Ukraine's official volunteer registry (State Tax Service),
 * owner export, as of the article of 5 Dec 2024. See README.md for the Zhytomyr/Zaporizka fix and the
 * Kyiv city+oblast note. Output validated by the same parser the site uses.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvParse } from 'd3';
import { DATA_FILE, parseRegions } from '../../src/viz/volunteers-by-region/data';
import type { RegionId } from '../../src/viz/volunteers-by-region/data';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, '../../public/data/volunteers-by-region');

/** CSV label -> data.ts id. Kept here rather than in the CSV, so the CSV stays a faithful export. */
const ID_OF: Record<string, RegionId> = {
  Odeska: 'odeska',
  Khersonska: 'khersonska',
  Kyivska: 'kyivska',
  Zhytomyr: 'zhytomyrska',
  Sumska: 'sumska',
  Donetska: 'donetska',
  Dnipropetrovska: 'dnipropetrovska',
  Kharkivska: 'kharkivska',
  Luhanska: 'luhanska',
  Poltavska: 'poltavska',
  Zaporizka: 'zaporizka',
  Chernihivska: 'chernihivska',
  Rivnenska: 'rivnenska',
  Chernivetska: 'chernivetska',
  'Ivano-Frankivska': 'ivano-frankivska',
  Khmelnytska: 'khmelnytska',
  Lvivska: 'lvivska',
  Ternopilska: 'ternopilska',
  Zakarpatska: 'zakarpatska',
  Volynska: 'volynska',
  Cherkaska: 'cherkaska',
  Kirovohradska: 'kirovohradska',
  Mykolaivska: 'mykolaivska',
  Vinnytska: 'vinnytska',
  'AR of Crimea': 'crimea',
};

const csv = readFileSync(join(here, 'data_volunteers_by_regions.csv'), 'utf8').replace(/^\uFEFF/, '');
const parsed = csvParse(csv);
const rows = parsed.map((d) => {
  const label = d['Region'] ?? '';
  const id = ID_OF[label];
  if (!id) throw new Error(`prep volunteers-by-region: unmapped region "${label}"`);
  return { id, count: Number(d['volunteers by regions']) };
});
const dataset = parseRegions({ unit: 'people', asOf: '2024-11', rows });

mkdirSync(OUT_DIR, { recursive: true });
const body = [
  '{',
  `  "unit": ${JSON.stringify(dataset.unit)},`,
  `  "asOf": ${JSON.stringify(dataset.asOf)},`,
  '  "rows": [',
  dataset.rows.map((r) => `    ${JSON.stringify(r)}`).join(',\n'),
  '  ]',
  '}',
  '',
].join('\n');
writeFileSync(join(OUT_DIR, DATA_FILE), body);

console.log(`OK prep volunteers-by-region - ${dataset.rows.length} regions, as of ${dataset.asOf}.`);
