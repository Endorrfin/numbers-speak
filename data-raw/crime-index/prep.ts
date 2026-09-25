/*
 * prep.ts — crime-index raw files → public/data/crime-index/*.json (S3-rb). Run: `npm run prep -- crime-index`.
 *
 * 1. unodc-homicide-latest.csv → homicide-rate.json. Source: UNODC Data Portal, "Intentional homicide" data file
 *    (data_cts_intentional_homicide.xlsx, dated 12 Jul 2026), read in the in-app browser: indicator "Victims of
 *    intentional homicide", Dimension/Category/Sex/Age = Total, the latest year with a rate per country, 2015 or
 *    later, with the victim count of the same year; plus UNODC's world estimate (row WLD, sheet
 *    data_cts_homicide_reg_estimates). ISO3 → ISO2 via the WPP location table already in the repo.
 * 2. numbeo-crime-2026-mid.txt → numbeo-crime-2026-mid.json. Source: Numbeo "Crime Index by Country 2026
 *    Mid-Year", copied by hand by the owner (Numbeo's terms forbid automated collection). Skipped, with a
 *    warning, while the file is absent.
 * See README.md for sha256 checksums and decisions.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvParse } from 'd3';
import { M49_REGION } from '../_shared/m49';
import { HOMICIDE_FILE, NUMBEO_FILE, OLDEST_YEAR, parseHomicideDataset, parseNumbeoDataset } from '../../src/viz/crime-index/data';
import type { HomicideRow, NumbeoRow } from '../../src/viz/crime-index/data';
import type { Region } from '../../src/lib/regions';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, '../../public/data/crime-index');
const EDITION = '2026-07-12'; // date printed in the UNODC data file
const problems: string[] = [];

function regionOf(code: string, at: string): Region {
  const region = M49_REGION.get(code);
  if (!region) problems.push(`${at}: ${code || '(no ISO2)'} has no M49 region`);
  return region ?? 'europe';
}

// ── 1. UNODC homicide ─────────────────────────────────────────────────────────────────────────────
const wpp = csvParse(readFileSync(join(here, '../population-by-country/wpp2024-population-2025.csv'), 'utf8'));
const iso2Of = new Map(wpp.filter((d) => d.iso3 && d.iso2).map((d) => [d.iso3!, d.iso2!] as const));
const unodc = csvParse(readFileSync(join(here, 'unodc-homicide-latest.csv'), 'utf8'));
const world = unodc.find((d) => d.iso3 === 'WLD');
const worldRate = Number(world?.rate);
const latestYear = Number(world?.year);
if (!(worldRate > 0)) problems.push('unodc-homicide-latest.csv: no WLD row');

// UNODC reports the United Kingdom as three jurisdictions; combined from their own figures when all three
// share a year: rate = Σ victims ÷ Σ (victims ÷ rate × 100,000) — each part's population is implied by its data.
const UK_PARTS = ['GBR_E_W', 'GBR_S', 'GBR_NI'];
// Iraq's only recent figure covers Central Iraq (without the Kurdistan Region): kept and marked.
const PARTIAL: Record<string, string> = { IRQ_C: 'IQ' };

const rows: HomicideRow[] = [];
const uk = unodc.filter((d) => UK_PARTS.includes(d.iso3 ?? ''));
if (uk.length === UK_PARTS.length && new Set(uk.map((d) => d.year)).size === 1) {
  const victims = uk.reduce((s, d) => s + Number(d.victims), 0);
  const population = uk.reduce((s, d) => s + (Number(d.victims) / Number(d.rate)) * 1e5, 0);
  if (!(population > 0) || uk.some((d) => !(Number(d.rate) > 0))) problems.push('UK parts: cannot derive population');
  rows.push({ code: 'GB', region: regionOf('GB', 'UK'), rate: (victims / population) * 1e5, victims, year: Number(uk[0]!.year), note: 'combined' });
} else if (uk.length) problems.push(`UK parts: expected ${UK_PARTS.join(', ')} for one year — revisit the combination`);

for (const d of unodc) {
  const iso3 = d.iso3 ?? '';
  if (iso3 === 'WLD' || UK_PARTS.includes(iso3)) continue;
  const at = `unodc-homicide-latest.csv ${iso3}`;
  const code = PARTIAL[iso3] ?? iso2Of.get(iso3) ?? '';
  if (!code) {
    problems.push(`${at}: no ISO2 for ${iso3} — add it to PARTIAL or check the WPP table`);
    continue;
  }
  const year = Number(d.year);
  if (!(year >= OLDEST_YEAR)) problems.push(`${at}: year ${d.year} is older than ${OLDEST_YEAR}`);
  // UNODC publishes a few modelled counts with decimals (French Guiana 2020: 38.69901) — rounded to whole persons.
  const row: HomicideRow = { code, region: regionOf(code, at), rate: Number(d.rate), victims: Math.round(Number(d.victims)), year };
  rows.push(PARTIAL[iso3] ? { ...row, note: 'partial-territory' } : row);
}

// ── 2. Numbeo (owner's copy; optional until provided) ────────────────────────────────────────────
const NUMBEO_TXT = join(here, 'numbeo-crime-2026-mid.txt');
// Numbeo names that differ from the CLDR English names Intl.DisplayNames produces.
const NUMBEO_ALIASES: Record<string, string> = {
  'Bosnia And Herzegovina': 'BA',
  'Trinidad And Tobago': 'TT',
  'Congo (Kinshasa)': 'CD',
  'Congo (Brazzaville)': 'CG',
  'Ivory Coast': 'CI',
  Kosovo: 'XK',
  'Kosovo (Disputed Territory)': 'XK',
  'Hong Kong (China)': 'HK',
  'Macao (China)': 'MO',
  Palestine: 'PS',
  Myanmar: 'MM',
  Turkey: 'TR',
  Czech: 'CZ',
  'Czech Republic': 'CZ',
  'North Macedonia': 'MK',
  'United States': 'US',
  'United Kingdom': 'GB',
  'Isle Of Man': 'IM',
  'Antigua And Barbuda': 'AG',
  'Saint Kitts And Nevis': 'KN',
  'Saint Vincent And The Grenadines': 'VC',
  'Sao Tome And Principe': 'ST',
  'Cabo Verde': 'CV',
  'Cape Verde': 'CV',
  'Curacao': 'CW',
  'Taiwan': 'TW',
  'South Korea': 'KR',
  'North Korea': 'KP',
};
const display = new Intl.DisplayNames(['en'], { type: 'region' });
const byName = new Map<string, string>();
for (const c of M49_REGION.keys()) {
  const n = display.of(c);
  if (n) byName.set(n, c);
}
let numbeo: NumbeoRow[] | null = null;
if (existsSync(NUMBEO_TXT)) {
  numbeo = [];
  const lines = readFileSync(NUMBEO_TXT, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
  for (const line of lines) {
    const cells = line.split('\t').map((c) => c.trim()).filter(Boolean);
    if (cells.length < 3 || !/^\d+$/.test(cells[0]!)) continue; // header, blank or wrapped lines
    const [, name, crime, safety] = cells;
    const at = `numbeo-crime-2026-mid.txt "${name}"`;
    const code = NUMBEO_ALIASES[name!] ?? byName.get(name!) ?? '';
    if (!code) {
      problems.push(`${at}: no ISO code — add it to NUMBEO_ALIASES`);
      continue;
    }
    const crimeIndex = Number(crime);
    if (safety !== undefined && Math.abs(100 - crimeIndex - Number(safety)) > 0.11) {
      problems.push(`${at}: safety ${safety} ≠ 100 − crime ${crime} — the page derives safety, revisit`);
    }
    numbeo.push({ code, region: regionOf(code, at), crimeIndex });
  }
  if (numbeo.length < 100) problems.push(`numbeo-crime-2026-mid.txt: only ${numbeo.length} rows parsed`);
}

if (problems.length) {
  console.error(`✗ prep crime-index — ${problems.length} problem(s):\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
const sorted = [...rows].sort((a, b) => b.rate - a.rate || a.code.localeCompare(b.code));
const hom = { edition: EDITION, latestYear, worldRate, rows: sorted };
parseHomicideDataset(hom, HOMICIDE_FILE); // fail fast on the same parser the site uses
writeFileSync(
  join(OUT_DIR, HOMICIDE_FILE),
  ['{', `  "edition": "${EDITION}",`, `  "latestYear": ${latestYear},`, `  "worldRate": ${worldRate},`, '  "rows": [',
    sorted.map((r) => `    ${JSON.stringify(r)}`).join(',\n'), '  ]', '}', ''].join('\n'),
);
console.log(`✓ ${HOMICIDE_FILE} — ${sorted.length} countries and territories, ${sorted.filter((r) => r.year < latestYear).length} with an older year.`);

if (numbeo) {
  const ns = [...numbeo].sort((a, b) => b.crimeIndex - a.crimeIndex || a.code.localeCompare(b.code));
  const nd = { edition: '2026 Mid-Year', rows: ns };
  parseNumbeoDataset(nd, NUMBEO_FILE);
  writeFileSync(
    join(OUT_DIR, NUMBEO_FILE),
    ['{', '  "edition": "2026 Mid-Year",', '  "rows": [', ns.map((r) => `    ${JSON.stringify(r)}`).join(',\n'), '  ]', '}', ''].join('\n'),
  );
  console.log(`✓ ${NUMBEO_FILE} — ${ns.length} countries.`);
} else console.warn(`! ${NUMBEO_FILE} skipped — owner step: save Numbeo's table as data-raw/crime-index/numbeo-crime-2026-mid.txt`);
