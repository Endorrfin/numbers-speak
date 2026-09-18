/*
 * prep.ts — legacy-2023.csv → public/data/gdp-by-country/gdp-2023.json. Run: `npm run prep -- gdp-by-country`.
 *
 * Input: the legacy page's CSV (World Bank WDI, release of 2024-12-16, values for 2023, in US$ billions),
 * with hand-typed names, emoji flags and formatted strings ("27,720.70 ", "26.11%").
 * Output: ISO 3166-1 alpha-2 codes, UN M49 regions derived from the code, values in US$ as numbers.
 * Dropped: the flag column (flags come from the code) and "world share" (derived at runtime).
 * The output is validated by the same parser the site uses; any unmatched name aborts the run.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvParse } from 'd3';
import { M49_REGION } from '../_shared/m49';
import { DATA_FILE, parseGdpDataset } from '../../src/viz/gdp-by-country/data';
import type { GdpDataset, GdpRow } from '../../src/viz/gdp-by-country/data';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '../..');
const OUT_DIR = join(ROOT, 'public/data/gdp-by-country');

/** World Bank "World" (WLD), 2023, US$ — the figure quoted on the legacy page ($106,172 bn). */
const WORLD_TOTAL_2023 = 106_172e9;

// Legacy names that differ from the CLDR English names Intl.DisplayNames produces.
const ALIASES: Record<string, string> = {
  'Russian Federation': 'RU',
  Turkey: 'TR',
  'Czech Republic': 'CZ',
  'Hong Kong': 'HK',
  Macao: 'MO',
  "Côte d'Ivoire": 'CI',
  'DR Congo': 'CD',
  Congo: 'CG',
  'State of Palestine': 'PS',
  Myanmar: 'MM',
  'Cabo Verde': 'CV',
  'Saint Lucia': 'LC',
  'St. Vincent & Grenadines': 'VC',
  'Saint Kitts & Nevis': 'KN',
  'Sao Tome & Principe': 'ST',
  'Bosnia and Herzegovina': 'BA',
  'Trinidad and Tobago': 'TT',
  'Antigua and Barbuda': 'AG',
};

const LEGACY_REGION: Record<string, string> = {
  Africa: 'africa',
  America: 'americas',
  Asia: 'asia',
  Europe: 'europe',
  Oceania: 'oceania',
  'Australia and New Zealand': 'oceania',
};

const display = new Intl.DisplayNames(['en'], { type: 'region' });
const byName = new Map<string, string>();
for (const code of M49_REGION.keys()) {
  const name = display.of(code);
  if (name) byName.set(name, code);
}

const toNumber = (s: string): number => Number(s.replace(/[,\s%]/g, ''));

const csv = readFileSync(join(here, 'legacy-2023.csv'), 'utf8').replace(/^\uFEFF/, '');
const problems: string[] = [];
const regionChanges: string[] = [];
const rows: GdpRow[] = csvParse(csv).map((d, i) => {
  const name = (d.country ?? '').trim();
  const code = ALIASES[name] ?? byName.get(name);
  const billions = toNumber(d.GDP ?? '');
  if (!code) problems.push(`row ${i + 1}: no ISO code for "${name}" — add it to ALIASES`);
  if (!(billions > 0)) problems.push(`row ${i + 1}: bad GDP "${d.GDP}"`);
  const region = code ? M49_REGION.get(code) : undefined;
  if (code && !region) problems.push(`row ${i + 1}: ${code} has no M49 region`);
  const legacy = LEGACY_REGION[(d.region ?? '').trim()];
  if (region && legacy !== region) regionChanges.push(`${name} (${code}): ${d.region} → ${region}`);
  // Billions with two decimals → whole US$ (Math.round removes binary noise such as 27720700000000.004).
  return { code: code ?? '??', region: region ?? 'asia', value: Math.round(billions * 1e9) };
});

if (problems.length) {
  console.error(`✗ prep gdp-by-country — ${problems.length} problem(s):\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}

rows.sort((a, b) => b.value - a.value || a.code.localeCompare(b.code));
const dataset: GdpDataset = parseGdpDataset({
  indicator: 'NY.GDP.MKTP.CD',
  year: 2023,
  unit: 'USD',
  worldTotal: WORLD_TOTAL_2023,
  rows,
});

mkdirSync(OUT_DIR, { recursive: true });
// One row per line: small diffs when the data is refreshed, still compact.
const body = [
  '{',
  `  "indicator": ${JSON.stringify(dataset.indicator)},`,
  `  "year": ${dataset.year},`,
  `  "unit": ${JSON.stringify(dataset.unit)},`,
  `  "worldTotal": ${dataset.worldTotal},`,
  '  "rows": [',
  dataset.rows.map((r) => `    ${JSON.stringify(r)}`).join(',\n'),
  '  ]',
  '}',
  '',
].join('\n');
writeFileSync(join(OUT_DIR, DATA_FILE), body);

const covered = dataset.rows.reduce((s, r) => s + r.value, 0) / dataset.worldTotal;
console.log(`✓ prep gdp-by-country — ${dataset.rows.length} economies, ${(covered * 100).toFixed(2)} % of world GDP.`);
if (regionChanges.length) console.log(`  Regions changed to UN M49:\n  - ${regionChanges.join('\n  - ')}`);
