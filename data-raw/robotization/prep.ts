/*
 * prep.ts — ifr-robot-density-2024.csv → public/data/robotization/robot-density-2024.json (S3-rb).
 * Run: `npm run prep -- robotization`.
 *
 * Source: IFR press release "Robot Density Surges in Europe, Asia, and Americas" (Frankfurt, 8 Apr 2026, World
 * Robotics 2025) and its chart "Robot density in the manufacturing industry 2024" — 22 economies + the world
 * figure, transcribed by hand from the chart (values 1–10, Canada and China cross-checked against the release
 * text). See README.md for the IFR terms and the decisions.
 *
 * Output: ISO 3166-1 alpha-2 codes (IFR's "Chinese Taipei" = TW; "Belgium and Luxembourg" = BE + `with: LU`),
 * UN M49 regions from the code, values as published.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvParse } from 'd3';
import { M49_REGION } from '../_shared/m49';
import { DATA_FILE, YEAR, parseRobotDataset } from '../../src/viz/robotization/data';
import type { RobotRow } from '../../src/viz/robotization/data';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, '../../public/data/robotization');
const problems: string[] = [];
const parsed = csvParse(readFileSync(join(here, `ifr-robot-density-${YEAR}.csv`), 'utf8'));

const worldRow = parsed.find((d) => d.economy_as_published === 'World');
const world = Number(worldRow?.robots_per_10000);
if (!(world > 0)) problems.push('no World row');

const rows: RobotRow[] = parsed
  .filter((d) => d !== worldRow)
  .map((d, i): RobotRow => {
    const at = `row ${i + 1} (${d.economy_as_published})`;
    if (Number(d.rank) !== i + 1) problems.push(`${at}: rank ${d.rank}, expected ${i + 1} — keep IFR's order`);
    const code = (d.iso2 ?? '').trim();
    const also = (d.with_iso2 ?? '').trim();
    const region = M49_REGION.get(code);
    if (!region) problems.push(`${at}: ${code || '(no ISO2)'} has no M49 region`);
    if (also && M49_REGION.get(also) !== region) problems.push(`${at}: ${also} is not in the same region as ${code}`);
    const value = Number(d.robots_per_10000);
    const row: RobotRow = { code, region: region ?? 'europe', value };
    return also ? { code, with: also, region: row.region, value } : row;
  });

if (problems.length) {
  console.error(`✗ prep robotization — ${problems.length} problem(s):\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}

const dataset = { year: YEAR, world, rows };
parseRobotDataset(dataset, DATA_FILE); // fail fast, before writing, on the same parser the site uses
const body = [
  '{',
  `  "year": ${YEAR},`,
  `  "world": ${world},`,
  '  "rows": [',
  rows.map((r) => `    ${JSON.stringify(r)}`).join(',\n'),
  '  ]',
  '}',
  '',
].join('\n');
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, DATA_FILE), body);
console.log(`✓ ${DATA_FILE} — ${rows.length} economies, world ${world}.`);
