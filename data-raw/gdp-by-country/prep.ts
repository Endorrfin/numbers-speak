/*
 * prep.ts — raw GDP files → public/data/gdp-by-country/*.json. Run: `npm run prep -- gdp-by-country`.
 *
 * 1. legacy-2023.csv → gdp-2023.json (unchanged since S2): the legacy page's CSV (World Bank WDI, release of
 *    2024-12-16, values for 2023, in US$ billions) with hand-typed names, emoji flags and formatted strings.
 * 2. CHANGED (S3-gdp): wb-gdp-<year>.csv + wb-gdp-per-capita-<year>.csv → gdp-<year>.json +
 *    gdp-per-capita-<year>.json for 2024 and 2025. The CSVs are the "World Bank" sheets of the owner's
 *    workbooks (Worldometers ← WB WDI, July 2026 update), exported as-is (see README.md). A value label such
 *    as "$801.5 billion (IMF)" or "$21,668 (2021)" is not a WB figure for that year → kept, with a `note`.
 *    worldTotal = Σ listed economies (Worldometers' own share denominator; cross-checked below);
 *    worldAverage = Σ GDP ÷ Σ population, population = GDP ÷ GDP per capita (both from the GDP sheet).
 *
 * Output: ISO 3166-1 alpha-2 codes, UN M49 regions derived from the code, values in US$ as numbers.
 * Every file is validated by the same parser the site uses; an unmatched name or a bad value aborts the run.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvParse } from 'd3';
import { M49_REGION } from '../_shared/m49';
import { dataFile, parseGdpDataset } from '../../src/viz/gdp-by-country/data';
import type { GdpDataset, GdpRow, NoteSource, ValueNote } from '../../src/viz/gdp-by-country/data';
import type { Region } from '../../src/lib/regions';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '../..');
const OUT_DIR = join(ROOT, 'public/data/gdp-by-country');

/** World Bank "World" (WLD), 2023, US$ — the figure quoted on the legacy page ($106,172 bn). */
const WORLD_TOTAL_2023 = 106_172e9;
const NEW_YEARS = [2024, 2025] as const;

// Source names that differ from the CLDR English names Intl.DisplayNames produces (legacy CSV + Worldometers).
const ALIASES: Record<string, string> = {
  'Russian Federation': 'RU',
  Turkey: 'TR',
  'Czech Republic': 'CZ',
  'Czech Republic (Czechia)': 'CZ',
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
  'Faeroe Islands': 'FO',
  'Saint Martin': 'MF',
  'Turks and Caicos': 'TC',
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

const problems: string[] = [];
const toNumber = (s: string): number => Number(s.replace(/[,\s%$]/g, ''));
const readCsv = (file: string) => csvParse(readFileSync(join(here, file), 'utf8').replace(/^\uFEFF/, ''));

function lookup(name: string, at: string): { code: string; region: Region } {
  const code = ALIASES[name] ?? byName.get(name);
  if (!code) problems.push(`${at}: no ISO code for "${name}" — add it to ALIASES`);
  const region = code ? M49_REGION.get(code) : undefined;
  if (code && !region) problems.push(`${at}: ${code} has no M49 region`);
  return { code: code ?? '??', region: region ?? 'asia' };
}

/** "$649.21 million (2021)" / "$801.5 billion (IMF)" / "$38,627 (UN, 2023)" → note; "(WB)" alone is no note. */
function noteOf(label: string, year: number, at: string): ValueNote | undefined {
  const m = /\(([^)]*)\)\s*$/.exec(label);
  if (!m) return undefined;
  const note: ValueNote = {};
  for (const part of m[1]!.split(',').map((s) => s.trim())) {
    if (part === 'IMF' || part === 'UN') note.source = part satisfies NoteSource;
    else if (/^\d{4}$/.test(part) && Number(part) < year) note.year = Number(part);
    else if (part !== 'WB') problems.push(`${at}: unknown note "${part}" in "${label}"`);
  }
  return note.source || note.year !== undefined ? note : undefined;
}

const sortRows = (rows: GdpRow[]): GdpRow[] =>
  rows.sort((a, b) => b.value - a.value || a.code.localeCompare(b.code));

function write(dataset: GdpDataset): void {
  const file = dataFile(dataset.indicator === 'NY.GDP.MKTP.CD' ? 'total' : 'per-capita', dataset.year);
  const parsed = parseGdpDataset(dataset, file);
  const reference =
    parsed.indicator === 'NY.GDP.MKTP.CD'
      ? `  "worldTotal": ${parsed.worldTotal},`
      : `  "worldAverage": ${parsed.worldAverage},`;
  // One row per line: small diffs when the data is refreshed, still compact.
  const body = [
    '{',
    `  "indicator": ${JSON.stringify(parsed.indicator)},`,
    `  "year": ${parsed.year},`,
    `  "unit": ${JSON.stringify(parsed.unit)},`,
    reference,
    '  "rows": [',
    parsed.rows.map((r) => `    ${JSON.stringify(r)}`).join(',\n'),
    '  ]',
    '}',
    '',
  ].join('\n');
  writeFileSync(join(OUT_DIR, file), body);
  const notes = parsed.rows.filter((r) => r.note).length;
  console.log(`✓ ${file} — ${parsed.rows.length} economies, ${notes} marked values.`);
}

// ── 1. Legacy 2023 ─────────────────────────────────────────────────────────────────────────────────
const regionChanges: string[] = [];
const legacy: GdpRow[] = readCsv('legacy-2023.csv').map((d, i) => {
  const name = (d.country ?? '').trim();
  const { code, region } = lookup(name, `legacy-2023.csv row ${i + 1}`);
  const billions = toNumber(d.GDP ?? '');
  if (!(billions > 0)) problems.push(`legacy-2023.csv row ${i + 1}: bad GDP "${d.GDP}"`);
  const old = LEGACY_REGION[(d.region ?? '').trim()];
  if (code !== '??' && old !== region) regionChanges.push(`${name} (${code}): ${d.region} → ${region}`);
  // Billions with two decimals → whole US$ (Math.round removes binary noise such as 27720700000000.004).
  return { code, region, value: Math.round(billions * 1e9) };
});

// ── 2. World Bank sheets, 2024 and 2025 ────────────────────────────────────────────────────────────
type Built = { total: GdpDataset; perCapita: GdpDataset };
function buildYear(year: number): Built {
  const gdpFile = `wb-gdp-${year}.csv`;
  const pcFile = `wb-gdp-per-capita-${year}.csv`;
  let gdpSum = 0;
  let population = 0;
  const totals: GdpRow[] = readCsv(gdpFile).map((d, i) => {
    const at = `${gdpFile} row ${i + 1}`;
    const { code, region } = lookup((d.country ?? '').trim(), at);
    const value = Number(d.gdp_usd);
    const perCapita = Number(d.gdp_per_capita_usd);
    if (!(value > 0)) problems.push(`${at}: bad gdp_usd "${d.gdp_usd}"`);
    if (!(perCapita > 0)) problems.push(`${at}: bad gdp_per_capita_usd "${d.gdp_per_capita_usd}"`);
    gdpSum += value;
    population += value / perCapita;
    const note = noteOf(d.gdp_label ?? '', year, at);
    if (d.rank === '—' && !note) problems.push(`${at}: unranked in the source but no note — check the label`);
    return note ? { code, region, value: Math.round(value), note } : { code, region, value: Math.round(value) };
  });

  const perCapita: GdpRow[] = readCsv(pcFile).map((d, i) => {
    const at = `${pcFile} row ${i + 1}`;
    const { code, region } = lookup((d.country ?? '').trim(), at);
    const label = d.per_capita ?? '';
    const value = toNumber(label.replace(/\(.*\)\s*$/, ''));
    if (!(value > 0)) problems.push(`${at}: bad per_capita "${label}"`);
    const note = noteOf(label, year, at);
    return note ? { code, region, value, note } : { code, region, value };
  });

  // The two sheets must describe the same economies.
  const a = new Set(totals.map((r) => r.code));
  const b = new Set(perCapita.map((r) => r.code));
  for (const c of a) if (!b.has(c)) problems.push(`${year}: ${c} is in ${gdpFile} but not in ${pcFile}`);
  for (const c of b) if (!a.has(c)) problems.push(`${year}: ${c} is in ${pcFile} but not in ${gdpFile}`);

  const worldTotal = Math.round(gdpSum);
  const worldAverage = Math.round(gdpSum / population);
  return {
    total: { indicator: 'NY.GDP.MKTP.CD', year, unit: 'USD', worldTotal, rows: sortRows(totals) },
    perCapita: { indicator: 'NY.GDP.PCAP.CD', year, unit: 'USD', worldAverage, rows: sortRows(perCapita) },
  };
}
const built = NEW_YEARS.map(buildYear);

// Cross-check: Worldometers' "Share of World GDP" for the US implies the same denominator (±0.1 %).
for (const [i, year] of NEW_YEARS.entries()) {
  const us = readCsv(`wb-gdp-${year}.csv`).find((d) => d.country === 'United States');
  const t = built[i]!.total;
  if (us && t.indicator === 'NY.GDP.MKTP.CD') {
    const us0 = t.rows.find((r) => r.code === 'US')!;
    const share = us0.value / t.worldTotal;
    if (year === 2024 && Math.abs(share - 0.2624) > 0.0005) problems.push(`2024: US share ${share} ≠ 0.2624`);
    if (year === 2025 && Math.abs(share - 0.26) > 0.0005) problems.push(`2025: US share ${share} ≠ 0.26`);
  }
}

if (problems.length) {
  console.error(`✗ prep gdp-by-country — ${problems.length} problem(s):\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
write({ indicator: 'NY.GDP.MKTP.CD', year: 2023, unit: 'USD', worldTotal: WORLD_TOTAL_2023, rows: sortRows(legacy) });
for (const b of built) {
  write(b.total);
  write(b.perCapita);
}
if (regionChanges.length) console.log(`  2023 regions changed to UN M49:\n  - ${regionChanges.join('\n  - ')}`);
