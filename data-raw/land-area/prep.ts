/*
 * prep.ts — countries-by-area.csv → public/data/land-area/land-area.json. Run: `npm run prep -- land-area`.
 *
 * Source: data-raw/land-area/countries-by-area.csv, a plain export of the owner's workbook
 * `_examples/Contribution/Demographics/land area/files/Lagest countries in the world.xlsx`
 * (sheet "Countries_ranked_by_area"), itself compiled by Worldometers. See README.md for the full
 * source note and the three data decisions this script encodes:
 *
 * 1. Borders (owner decision: internationally recognized borders): Ukraine's row already includes Crimea
 *    and the territories Russia occupied from 2022 (matches Wikipedia's "List of countries and dependencies
 *    by area", which documents this explicitly for the same figure); Russia's row does not include them.
 *    Both get `note: 'recognized-borders'` — the page explains this once, not per row.
 * 2. Data quality: 27 of 234 rows report land area > total area (impossible; a rounding or definitional
 *    inconsistency in the source). Most are within a few km² (island rounding noise) and are left alone.
 *    Five are large enough to matter (see DEFINITION_MISMATCH below) and get `note: 'definition'` — kept,
 *    not corrected, per the project's "keep + mark" convention (CLAUDE.md §4, gdp-by-country notes).
 * 3. Greenland's land area (410,450 km² vs a total of 2,166,086 km²) excludes its permanent ice sheet,
 *    not water bodies — `note: 'ice-sheet'` says so on the page instead of reading as a data error.
 * 4. The source rounds area to whole km², which sends Holy See's real 0.49 km² to an invalid 0 (caught
 *    by `npm run prep` — row 234 failed validation outright). Replaced via AREA_OVERRIDE with a cited
 *    figure, marked `note: 'corrected'` — unlike §2, a literal 0 isn't a value worth keeping as reported.
 *
 * Output: ISO 3166-1 alpha-2 codes, UN M49 regions derived from the code, values in km² as numbers.
 * An unmatched country name aborts the run (add it to ALIASES).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvParse } from 'd3';
import { M49_REGION } from '../_shared/m49';
import { DATA_FILE, parseAreaDataset } from '../../src/viz/land-area/data';
import type { AreaRow, NoteKind } from '../../src/viz/land-area/data';
import type { Region } from '../../src/lib/regions';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '../..');
const OUT_DIR = join(ROOT, 'public/data/land-area');

// Rows where the source's land area exceeds its total area by more than rounding noise on a small
// territory (threshold: 100 km²) — see README.md "Data quality". The other 22 negative-gap rows are
// all ≤ 62 km² (e.g. Guadeloupe −62, Qatar −24) and are left unmarked; nonLandShare() in data.ts
// clamps any negative gap to 0 regardless, so they never show a fabricated share.
const DEFINITION_MISMATCH = new Set(['NO', 'IL', 'AF', 'BF', 'SL']);

// The source rounds area to whole km², which sends Vatican City's real 0.49 km² to an invalid 0 (the
// only row this happens to: countries-by-area.csv row 234). A literal 0 is not a real area to keep and
// mark like the DEFINITION_MISMATCH rows — it fails validation outright — so it is replaced with a
// cited figure. Applied only when the source value is actually invalid (< 0.1), so a future re-export
// that fixes the rounding is used as-is instead of being silently overridden forever.
const AREA_OVERRIDE: Record<string, { totalArea: number; landArea: number }> = {
  VA: { totalArea: 0.49, landArea: 0.49 }, // en.wikipedia.org/wiki/Vatican_City infobox, retrieved 2026-09-22
};

// Source names that differ from the CLDR English names Intl.DisplayNames produces (Worldometers naming;
// several confirmed already in data-raw/gdp-by-country/prep.ts, which draws on the same source style).
const ALIASES: Record<string, string> = {
  'DR Congo': 'CD',
  Congo: 'CG',
  Myanmar: 'MM',
  Turkey: 'TR',
  "Côte d'Ivoire": 'CI',
  Czechia: 'CZ',
  'Bosnia and Herzegovina': 'BA',
  'Republic of North Macedonia': 'MK',
  'State of Palestine': 'PS',
  'Brunei Darussalam': 'BN',
  'Trinidad and Tobago': 'TT',
  'Cabo Verde': 'CV',
  'Faeroe Islands': 'FO',
  'China, Hong Kong SAR': 'HK',
  'China, Macao SAR': 'MO',
  'Sao Tome and Principe': 'ST',
  'Turks and Caicos Islands': 'TC',
  Micronesia: 'FM',
  'Saint Lucia': 'LC',
  'Antigua and Barbuda': 'AG',
  'Saint Helena': 'SH',
  'Saint Vincent and the Grenadines': 'VC',
  'United States Virgin Islands': 'VI',
  'Saint Kitts and Nevis': 'KN',
  'Saint Pierre and Miquelon': 'PM',
  'Wallis and Futuna Islands': 'WF',
  'Saint Martin': 'MF',
  'Saint Barthélemy': 'BL',
  'Holy See': 'VA',
  Eswatini: 'SZ',
  'Timor-Leste': 'TL',
};

const display = new Intl.DisplayNames(['en'], { type: 'region' });
const byName = new Map<string, string>();
for (const code of M49_REGION.keys()) {
  const name = display.of(code);
  if (name) byName.set(name, code);
}

const problems: string[] = [];

function lookup(name: string, at: string): { code: string; region: Region } {
  const code = ALIASES[name] ?? byName.get(name);
  if (!code) problems.push(`${at}: no ISO code for "${name}" — add it to ALIASES`);
  const region = code ? M49_REGION.get(code) : undefined;
  if (code && !region) problems.push(`${at}: ${code} has no M49 region`);
  return { code: code ?? '??', region: region ?? 'europe' };
}

const csv = readFileSync(join(here, 'countries-by-area.csv'), 'utf8').replace(/^\uFEFF/, '');
const rows: AreaRow[] = csvParse(csv).map((d, i): AreaRow => {
  const at = `countries-by-area.csv row ${i + 1}`;
  const name = (d.country ?? '').trim();
  const { code, region } = lookup(name, at);
  const rawTotal = Number(d.total_area_km2);
  const rawLand = Number(d.land_area_km2);
  const override = AREA_OVERRIDE[code];
  const invalid = !(rawTotal >= 0.1) || !(rawLand >= 0);
  const totalArea = invalid && override ? override.totalArea : rawTotal;
  const landArea = invalid && override ? override.landArea : rawLand;
  if (!(totalArea >= 0.1)) problems.push(`${at}: bad total_area_km2 "${d.total_area_km2}"`);
  if (!(landArea >= 0)) problems.push(`${at}: bad land_area_km2 "${d.land_area_km2}"`);

  let note: NoteKind | undefined;
  if (code === 'UA' || code === 'RU') note = 'recognized-borders';
  else if (code === 'GL') note = 'ice-sheet';
  else if (DEFINITION_MISMATCH.has(code)) note = 'definition';
  else if (invalid && override) note = 'corrected';

  return note ? { code, region, totalArea, landArea, note } : { code, region, totalArea, landArea };
});

// Every row flagged for a definitional mismatch must actually show one (guards against the source being
// re-exported with the gap fixed, which would make the note stale and confusing).
for (const r of rows) {
  if (r.note === 'definition' && r.landArea <= r.totalArea) {
    problems.push(`${r.code}: marked 'definition' but landArea no longer exceeds totalArea — remove the flag`);
  }
}

// Every AREA_OVERRIDE entry must still be in use, on a row that still needs it (guards a stale or
// mistyped entry going unnoticed — e.g. the source finally ships a real, non-zero figure).
const overriddenCodes = new Set(rows.filter((r) => r.note === 'corrected').map((r) => r.code));
for (const code of Object.keys(AREA_OVERRIDE)) {
  if (!overriddenCodes.has(code)) problems.push(`AREA_OVERRIDE.${code}: no longer needed — the source now has a valid value`);
}

if (problems.length) {
  console.error(`✗ prep land-area — ${problems.length} problem(s):\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}

const sorted = [...rows].sort((a, b) => b.totalArea - a.totalArea || a.code.localeCompare(b.code));
const totalWorld = Math.round(sorted.reduce((s, r) => s + r.totalArea, 0));
const landWorld = Math.round(sorted.reduce((s, r) => s + r.landArea, 0));

const dataset = { totalWorld, landWorld, rows: sorted };
parseAreaDataset(dataset, DATA_FILE); // fail fast, before writing, on the same parser the site uses

const body = [
  '{',
  `  "totalWorld": ${totalWorld},`,
  `  "landWorld": ${landWorld},`,
  '  "rows": [',
  sorted.map((r) => `    ${JSON.stringify(r)}`).join(',\n'),
  '  ]',
  '}',
  '',
].join('\n');

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, DATA_FILE), body);
const marked = sorted.filter((r) => r.note).length;
console.log(`✓ ${DATA_FILE} — ${sorted.length} countries and territories, ${marked} marked rows.`);
