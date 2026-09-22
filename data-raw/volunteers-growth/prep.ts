/*
 * prep.ts — volunteers-2022-2025.csv -> public/data/volunteers-growth/volunteers-2022-2025.json.
 * Run: `npm run prep -- volunteers-growth`.
 *
 * Input: Opendatabot's monthly count of registered volunteers (State Tax Service register), owner export
 * covering Jan 2022 - Nov 2025 (2026-09-22) - supersedes the earlier CSV that stopped at Nov 2024.
 * Output validated by the same parser the site uses.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvParse } from 'd3';
import { DATA_FILE, parseVolunteers } from '../../src/viz/volunteers-growth/data';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, '../../public/data/volunteers-growth');

const csv = readFileSync(join(here, 'volunteers-2022-2025.csv'), 'utf8').replace(/^\uFEFF/, '');
const rows = csvParse(csv).map((d) => {
  const dt = d['DateTime'] ?? '';
  const [y, m] = dt.slice(0, 7).split('-').map(Number);
  return { year: y!, month: m!, count: Number(d['Кількість волонтерів']) };
});
const dataset = parseVolunteers({ unit: 'people', rows });

mkdirSync(OUT_DIR, { recursive: true });
const body = [
  '{',
  `  "unit": ${JSON.stringify(dataset.unit)},`,
  '  "rows": [',
  dataset.rows.map((r) => `    ${JSON.stringify(r)}`).join(',\n'),
  '  ]',
  '}',
  '',
].join('\n');
writeFileSync(join(OUT_DIR, DATA_FILE), body);

const last = dataset.rows[dataset.rows.length - 1]!;
console.log(`OK prep volunteers-growth - ${dataset.rows.length} months; last: ${last.year}-${String(last.month).padStart(2, '0')} = ${last.count}.`);
