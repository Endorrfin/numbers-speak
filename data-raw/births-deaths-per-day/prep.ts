/*
 * prep.ts — births-per-day-2026.csv + deaths-per-day-2026.csv → public/data/births-deaths-per-day/per-day-2026.json.
 * Run: `npm run prep -- births-deaths-per-day`.  CHANGED (S3-bdd): new dataset.
 *
 * Input: the two sheets of the owner's workbook "born each day in 2026.xlsx" (World Population Review, figures
 * derived from UN World Population Prospects 2024), exported to CSV: country name, rank, per day, per hour,
 * population. Output: ISO 3166-1 alpha-2 codes, UN M49 regions derived from the code, births, deaths and
 * population as numbers. Dropped: ranks and per-hour columns (derived at runtime), the broken "Sign" column.
 * The two sheets are joined by name; a country missing from either sheet, an unmatched name or a population
 * mismatch aborts the run. The output is validated by the same parser the site uses.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvParse } from 'd3';
import { M49_REGION } from '../_shared/m49';
import { DATA_FILE, parsePerDayDataset } from '../../src/viz/births-deaths-per-day/data';
import type { PerDayDataset, PerDayRow } from '../../src/viz/births-deaths-per-day/data';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '../..');
const OUT_DIR = join(ROOT, 'public/data/births-deaths-per-day');
const YEAR = 2026;

// World Population Review names that differ from the CLDR English names Intl.DisplayNames produces.
const ALIASES: Record<string, string> = {
  'DR Congo': 'CD',
  'Republic of the Congo': 'CG',
  'Ivory Coast': 'CI',
  "Cote d'Ivoire": 'CI',
  Turkey: 'TR',
  Myanmar: 'MM',
  Palestine: 'PS',
  'Hong Kong': 'HK',
  Macau: 'MO',
  'Cape Verde': 'CV',
  'Sao Tome and Principe': 'ST',
  'Vatican City': 'VA',
  'Saint Helena Ascension and Tristan da Cunha': 'SH',
  'Saint Barthelemy': 'BL',
  Curacao: 'CW',
  Reunion: 'RE',
  'United States Virgin Islands': 'VI',
  Micronesia: 'FM',
  'Timor-Leste': 'TL',
  'Bosnia and Herzegovina': 'BA',
  'Trinidad and Tobago': 'TT',
  'Antigua and Barbuda': 'AG',
  'Saint Kitts and Nevis': 'KN',
  'Saint Vincent and the Grenadines': 'VC',
  'Wallis and Futuna': 'WF',
  'Turks and Caicos Islands': 'TC',
  'Saint Martin': 'MF',
  'Sint Maarten': 'SX',
  'Saint Pierre and Miquelon': 'PM',
  'Falkland Islands': 'FK',
  'Northern Mariana Islands': 'MP',
  'Western Sahara': 'EH',
  'Saint Lucia': 'LC',
};

const display = new Intl.DisplayNames(['en'], { type: 'region' });
const byName = new Map<string, string>();
for (const code of M49_REGION.keys()) {
  const name = display.of(code);
  if (name) byName.set(name, code);
}

type Raw = { code: string; perDay: number; population: number };
const problems: string[] = [];

function readSheet(file: string, column: string): Map<string, Raw> {
  const csv = readFileSync(join(here, file), 'utf8').replace(/^\uFEFF/, '');
  const out = new Map<string, Raw>();
  csvParse(csv).forEach((d, i) => {
    const name = (d.country ?? '').trim();
    const code = ALIASES[name] ?? byName.get(name);
    const perDay = Number(d[column]);
    const population = Number(d.population_2026);
    if (!code) problems.push(`${file} row ${i + 1}: no ISO code for "${name}" — add it to ALIASES`);
    else if (!M49_REGION.has(code)) problems.push(`${file} row ${i + 1}: ${code} has no M49 region`);
    if (!Number.isInteger(perDay) || perDay < 0) problems.push(`${file} row ${i + 1}: bad ${column} "${d[column]}"`);
    if (!(population > 0)) problems.push(`${file} row ${i + 1}: bad population "${d.population_2026}"`);
    if (code && out.has(code)) problems.push(`${file} row ${i + 1}: duplicate ${code} ("${name}")`);
    if (code) out.set(code, { code, perDay, population });
  });
  return out;
}

const births = readSheet('births-per-day-2026.csv', 'births_per_day');
const deaths = readSheet('deaths-per-day-2026.csv', 'deaths_per_day');

const rows: PerDayRow[] = [];
for (const [code, b] of births) {
  const d = deaths.get(code);
  if (!d) {
    problems.push(`${code}: in the births sheet only`);
    continue;
  }
  if (d.population !== b.population) problems.push(`${code}: population differs between sheets`);
  rows.push({ code, region: M49_REGION.get(code) ?? 'asia', births: b.perDay, deaths: d.perDay, population: b.population });
}
for (const code of deaths.keys()) if (!births.has(code)) problems.push(`${code}: in the deaths sheet only`);

if (problems.length) {
  console.error(`✗ prep births-deaths-per-day — ${problems.length} problem(s):\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}

rows.sort((a, b) => b.births - a.births || a.code.localeCompare(b.code));
const dataset: PerDayDataset = parsePerDayDataset({ year: YEAR, unit: 'persons-per-day', rows });

mkdirSync(OUT_DIR, { recursive: true });
// One row per line: small diffs when the data is refreshed, still compact.
const body = [
  '{',
  `  "year": ${dataset.year},`,
  `  "unit": ${JSON.stringify(dataset.unit)},`,
  '  "rows": [',
  dataset.rows.map((r) => `    ${JSON.stringify(r)}`).join(',\n'),
  '  ]',
  '}',
  '',
].join('\n');
writeFileSync(join(OUT_DIR, DATA_FILE), body);

const sum = (k: 'births' | 'deaths'): number => dataset.rows.reduce((s, r) => s + r[k], 0);
console.log(
  `✓ prep births-deaths-per-day — ${dataset.rows.length} countries, ${sum('births')} births and ${sum('deaths')} deaths per day.`,
);
