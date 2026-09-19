/*
 * prep.ts — births-deaths-1990-2025.csv → public/data/births-deaths-ua/births-deaths-1990-2025.json.
 * Run: `npm run prep -- births-deaths-ua`.
 *
 * Input: the owner's sheet `birth_and_mortality` (docs/data/birth_and-mortality/*.xlsx), exported as CSV —
 * registered live births and deaths per year, persons, as compiled by Slovo i Dilo (22 Jan 2026) from
 * State Statistics Service, Opendatabot and Ministry of Justice data.
 * Output: numbers as integers plus the coverage segments (territory covered by the registration data).
 * The output is validated by the same parser the site uses.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvParse } from 'd3';
import { DATA_FILE, parseBirthsDeaths } from '../../src/viz/births-deaths-ua/data';
import type { CoverageSegment } from '../../src/viz/births-deaths-ua/data';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, '../../public/data/births-deaths-ua');

/** Footnotes of the source infographic (* and **) and the Ministry of Justice note for 2022+. */
const COVERAGE: CoverageSegment[] = [
  { from: 1990, to: 2013, coverage: 'full' },
  { from: 2014, to: 2021, coverage: 'no-crimea-ordlo' },
  { from: 2022, to: 2025, coverage: 'no-occupied' },
];

const csv = readFileSync(join(here, 'births-deaths-1990-2025.csv'), 'utf8').replace(/^\uFEFF/, '');
const rows = csvParse(csv).map((d) => ({ year: Number(d.year), births: Number(d.births), deaths: Number(d.deaths) }));
const dataset = parseBirthsDeaths({ unit: 'persons', coverage: COVERAGE, rows });

mkdirSync(OUT_DIR, { recursive: true });
// One row per line: small diffs when a new year is added.
const body = [
  '{',
  `  "unit": ${JSON.stringify(dataset.unit)},`,
  '  "coverage": [',
  dataset.coverage.map((c) => `    ${JSON.stringify(c)}`).join(',\n'),
  '  ],',
  '  "rows": [',
  dataset.rows.map((r) => `    ${JSON.stringify(r)}`).join(',\n'),
  '  ]',
  '}',
  '',
].join('\n');
writeFileSync(join(OUT_DIR, DATA_FILE), body);

const last = dataset.rows[dataset.rows.length - 1]!;
console.log(
  `✓ prep births-deaths-ua — ${dataset.rows.length} years (${dataset.rows[0]!.year}–${last.year}); ` +
    `${last.year}: ${last.births} births, ${last.deaths} deaths.`,
);
