/*
 * prep.ts — wb-ppp-per-capita-<year>.csv → public/data/gdp-ppp-per-capita/gdp-ppp-per-capita-<year>.json (S3-rb).
 * Run: `npm run prep -- gdp-ppp-per-capita`.
 *
 * Source: World Bank API, indicator NY.GDP.PCAP.PP.CD (GDP per capita, PPP, current international $), WDI
 * last updated 2026-07-13, read 2026-09-24 through the in-app browser (the sandbox cannot reach the API) and
 * saved as one CSV per year: `iso2,iso3,year,value` — every WB economy with a value for that year plus the
 * "World" (WLD) row (sha256 of each file in README.md).
 *
 * Output: ISO 3166-1 alpha-2 codes, UN M49 regions derived from the code, values as numbers, rows sorted by
 * value; `worldAverage` = the WLD row. The "× world average" multiple is derived by the page (data.ts rankPpp).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvParse } from 'd3';
import { M49_REGION } from '../_shared/m49';
import { INDICATOR, YEARS, dataFile, parsePppDataset } from '../../src/viz/gdp-ppp-per-capita/data';
import type { PppRow } from '../../src/viz/gdp-ppp-per-capita/data';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '../..');
const OUT_DIR = join(ROOT, 'public/data/gdp-ppp-per-capita');

mkdirSync(OUT_DIR, { recursive: true });
for (const year of YEARS) {
  const name = `wb-ppp-per-capita-${year}.csv`;
  const problems: string[] = [];
  const parsed = csvParse(readFileSync(join(here, name), 'utf8'));
  const world = parsed.find((d) => d.iso3 === 'WLD');
  const worldAverage = Number(world?.value);
  if (!(worldAverage > 0)) problems.push('no World (WLD) row');

  const rows: PppRow[] = parsed
    .filter((d) => d.iso3 !== 'WLD')
    .map((d, i): PppRow => {
      const at = `${name} row ${i + 1} (${d.iso3})`;
      if (Number(d.year) !== year) problems.push(`${at}: year ${d.year}, expected ${year}`);
      const code = (d.iso2 ?? '').trim();
      const region = M49_REGION.get(code);
      if (!region) problems.push(`${at}: ${code || '(no ISO2)'} has no M49 region`);
      const value = Number(d.value);
      if (!(value > 0)) problems.push(`${at}: bad value "${d.value}"`);
      return { code, region: region ?? 'europe', value };
    });

  if (problems.length) {
    console.error(`✗ prep gdp-ppp-per-capita ${year} — ${problems.length} problem(s):\n  - ${problems.join('\n  - ')}`);
    process.exit(1);
  }

  const sorted = [...rows].sort((a, b) => b.value - a.value || a.code.localeCompare(b.code));
  const dataset = { indicator: INDICATOR, year, unit: 'international $', worldAverage, rows: sorted };
  const file = dataFile(year);
  parsePppDataset(dataset, file); // fail fast, before writing, on the same parser the site uses
  const body = [
    '{',
    `  "indicator": "${INDICATOR}",`,
    `  "year": ${year},`,
    '  "unit": "international $",',
    `  "worldAverage": ${worldAverage},`,
    '  "rows": [',
    sorted.map((r) => `    ${JSON.stringify(r)}`).join(',\n'),
    '  ]',
    '}',
    '',
  ].join('\n');
  writeFileSync(join(OUT_DIR, file), body);
  console.log(`✓ ${file} — ${sorted.length} economies, world average ${Math.round(worldAverage).toLocaleString('en')}.`);
}
