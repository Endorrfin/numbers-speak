/*
 * prep.ts — gpi-2026-ranking.csv → public/data/global-peace-index/gpi-2026.json (S3-rb).
 * Run: `npm run prep -- global-peace-index`.
 *
 * Source: Institute for Economics & Peace, "Global Peace Index 2026: Identifying and measuring the factors that
 * drive peace" (Sydney, June 2026). The CSV is written by `extract-gpi.py` from the report PDF: the ranking table
 * of the map spread (printed pp. 10–11) cross-checked, country by country, against the nine regional tables
 * (score, overall rank) that also give the score change. See README.md for checksums, terms and decisions.
 *
 * Output: ISO 3166-1 alpha-2 codes from the names as printed (CLDR English names + ALIASES below), UN M49 regions
 * from the code, everything else as printed.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvParse } from 'd3';
import { M49_REGION } from '../_shared/m49';
import { DATA_FILE, EDITION, parseGpiDataset } from '../../src/viz/global-peace-index/data';
import type { GpiRow } from '../../src/viz/global-peace-index/data';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, '../../public/data/global-peace-index');
const PUBLISHED = '2026-06'; // "Sydney, June 2026" — the report's citation line
const problems: string[] = [];

// IEP names that differ from the CLDR English names Intl.DisplayNames produces.
const ALIASES: Record<string, string> = {
  'Bosnia and Herzegovina': 'BA',
  "Côte d'Ivoire": 'CI',
  'Democratic Republic of the Congo': 'CD',
  'Kyrgyz Republic': 'KG',
  Myanmar: 'MM',
  Palestine: 'PS',
  'Republic of the Congo': 'CG',
  'The Gambia': 'GM',
  'Trinidad and Tobago': 'TT',
  'United States of America': 'US',
};
const display = new Intl.DisplayNames(['en'], { type: 'region' });
const byName = new Map<string, string>();
for (const c of M49_REGION.keys()) {
  const n = display.of(c);
  if (n) byName.set(n, c);
}

const parsed = csvParse(readFileSync(join(here, `gpi-${EDITION}-ranking.csv`), 'utf8'));
const rows: GpiRow[] = parsed.map((d, i): GpiRow => {
  const name = d.country ?? '';
  const at = `row ${i + 1} (${name})`;
  const code = ALIASES[name] ?? byName.get(name) ?? '';
  if (!code) problems.push(`${at}: no ISO code — add it to ALIASES`);
  const region = M49_REGION.get(code);
  if (code && !region) problems.push(`${at}: ${code} has no M49 region`);
  const row: GpiRow = {
    code,
    region: region ?? 'europe',
    rank: Number(d.rank),
    score: Number(d.score),
    rankChange: Number(d.rank_change),
    scoreChange: Number(d.score_change),
  };
  if (d.tied === 'yes') row.tied = true;
  if (d.regional_rank) row.regionalRank = Number(d.regional_rank);
  return row;
});

if (problems.length) {
  console.error(`✗ prep global-peace-index — ${problems.length} problem(s):\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}

const dataset = { edition: EDITION, published: PUBLISHED, rows };
parseGpiDataset(dataset, DATA_FILE); // fail fast, before writing, on the same parser the site uses
const body = [
  '{',
  `  "edition": ${EDITION},`,
  `  "published": "${PUBLISHED}",`,
  '  "rows": [',
  rows.map((r) => `    ${JSON.stringify(r)}`).join(',\n'),
  '  ]',
  '}',
  '',
].join('\n');
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, DATA_FILE), body);
console.log(`✓ ${DATA_FILE} — ${rows.length} countries, ${rows.filter((r) => r.tied).length} tied.`);
