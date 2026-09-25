/*
 * prep.ts — wpp2024-population-2025.csv → public/data/population-by-country/population-2025.json (S3-rb).
 * Run: `npm run prep -- population-by-country`.
 *
 * Source: UN World Population Prospects 2024, file GEN/01/REV1 "Demographic indicators … (COMPACT)", sheet
 * "Medium variant", Year 2025 — extracted by extract-wpp.py (the 26 MB workbook itself is not committed; its
 * URL and sha256 are in README.md). The CSV already carries WPP's own ISO2 code per row, so no name matching.
 *
 * Output: ISO 3166-1 alpha-2 codes, UN M49 regions derived from the code (data-raw/_shared/m49.ts), whole
 * persons (WPP publishes thousands with 3 decimals = persons). Density is NOT computed here — the page
 * derives it at runtime from the `land-area` entry (CATALOG §E Q3), so the two datasets never drift apart.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvParse } from 'd3';
import { M49_REGION } from '../_shared/m49';
import { DATA_FILE, YEAR, parsePopDataset } from '../../src/viz/population-by-country/data';
import type { PopRow } from '../../src/viz/population-by-country/data';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '../..');
const OUT_DIR = join(ROOT, 'public/data/population-by-country');

// Same convention as land-area (internationally recognized borders): WPP counts Crimea in Ukraine
// (its footnote 15, "Including Crimea"), not in Russia — both rows say so on the page.
const RECOGNIZED_BORDERS = new Set(['UA', 'RU']);

const problems: string[] = [];
const csv = readFileSync(join(here, `wpp2024-population-${YEAR}.csv`), 'utf8').replace(/^\uFEFF/, '');
const parsed = csvParse(csv);
if (parsed.some((d) => Number(d.year) !== YEAR)) problems.push(`the CSV holds a year other than ${YEAR}`);

const worldRow = parsed.find((d) => d.type === 'World');
const world = worldRow ? Math.round(Number(worldRow.pop_jul_thousands) * 1000) : NaN;
if (!(world > 0)) problems.push('no World row');

const rows: PopRow[] = parsed
  .filter((d) => d.type === 'Country/Area')
  .map((d, i): PopRow => {
    const at = `wpp2024-population-${YEAR}.csv country row ${i + 1} (${d.name})`;
    const code = (d.iso2 ?? '').trim();
    const region = M49_REGION.get(code);
    if (!region) problems.push(`${at}: ${code || '(no ISO2)'} has no M49 region`);
    const population = Math.round(Number(d.pop_jul_thousands) * 1000);
    if (!(population > 0)) problems.push(`${at}: bad pop_jul_thousands "${d.pop_jul_thousands}"`);
    const row: PopRow = { code, region: region ?? 'europe', population };
    return RECOGNIZED_BORDERS.has(code) ? { ...row, note: 'recognized-borders' } : row;
  });

// Guard the one WPP footnote the page relies on: Ukraine's figure must still say it includes Crimea.
const ua = parsed.find((d) => d.iso2 === 'UA');
const notes = csvParse(readFileSync(join(here, 'wpp2024-notes.csv'), 'utf8'));
const uaNotes = (ua?.notes ?? '').split(/\D+/).filter(Boolean);
if (!notes.some((n) => uaNotes.includes(n.note ?? '') && /Crimea/.test(n.text ?? ''))) {
  problems.push('Ukraine row no longer carries the WPP "Including Crimea" footnote — revisit the recognized-borders note');
}

if (problems.length) {
  console.error(`✗ prep population-by-country — ${problems.length} problem(s):\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}

const sorted = [...rows].sort((a, b) => b.population - a.population || a.code.localeCompare(b.code));
const dataset = { year: YEAR, world, rows: sorted };
parsePopDataset(dataset, DATA_FILE); // fail fast, before writing, on the same parser the site uses

const body = [
  '{',
  `  "year": ${YEAR},`,
  `  "world": ${world},`,
  '  "rows": [',
  sorted.map((r) => `    ${JSON.stringify(r)}`).join(',\n'),
  '  ]',
  '}',
  '',
].join('\n');

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, DATA_FILE), body);
console.log(`✓ ${DATA_FILE} — ${sorted.length} countries and territories, world ${world.toLocaleString('en')}.`);
