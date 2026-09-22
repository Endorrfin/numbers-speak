/*
 * prep.ts — four CSVs -> public/data/donations/donations-2022-2025.json.
 * Run: `npm run prep -- donations`.
 *
 * Inputs (owner exports, 2026-09-22 unless noted):
 *  - monobank-2022-2025.csv    monthly sum raised via monobank donation jars, bn UAH, Feb 2022 - Nov 2025
 *                              (opendatabot.ua/analytics/donats-2025)
 *  - major-funds-2022-2025.csv annual totals, bn UAH, for United24 / Come Back Alive / Prytula Foundation,
 *                              2022-2024 + 11 months of 2025 (opendatabot.ua/analytics/donates-in-war-2024)
 *  - nova-poshta-2022-2024.csv annual humanitarian parcels + tonnage carried by Nova Poshta, 2022-2024
 *  - legacy-donors-2022-2024.csv  the person-count series this page replaces as the primary metric (stops
 *                              Nov 2024, can't extend) - kept only for one context KPI, not plotted.
 * Output validated by the same parser the site uses.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvParse } from 'd3';
import { DATA_FILE, parseDonations } from '../../src/viz/donations/data';
import type { FundId } from '../../src/viz/donations/data';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, '../../public/data/donations');
const read = (name: string): string => readFileSync(join(here, name), 'utf8').replace(/^\uFEFF/, '');

// monthly monobank amounts
const monthly = csvParse(read('monobank-2022-2025.csv')).map((d) => {
  const dt = d['DateTime'] ?? '';
  const [y, m] = dt.slice(0, 7).split('-').map(Number);
  return { year: y!, month: m!, amount: Number(d['Сума, млрд грн']) };
});

// three major funds, annual (+ partial 2025)
const FUND_COLUMN: Record<FundId, string> = { united24: 'United24', cba: 'Повернись живим', prytula: 'Фонд Притули' };
const fundsCsv = csvParse(read('major-funds-2022-2025.csv'));
const funds = (Object.keys(FUND_COLUMN) as FundId[]).map((id) => {
  const byYear: Record<string, number> = {};
  for (const row of fundsCsv) {
    const cat = row['Category'] ?? '';
    const year = cat.startsWith('11') ? '2025' : cat;
    byYear[year] = Number(row[FUND_COLUMN[id]]);
  }
  return { id, byYear };
});

// Nova Poshta humanitarian logistics, annual
const aid = csvParse(read('nova-poshta-2022-2024.csv')).map((d) => ({
  year: Number(d['Category']),
  parcels: Number(d['Кількість посилок']),
  tonnes: Number(d['Тонн вантажу']),
}));

// legacy person-count series — last point only, for one context KPI
const legacyRows = csvParse(read('legacy-donors-2022-2024.csv'));
const legacyLast = legacyRows[legacyRows.length - 1]!;
const [ly, lm] = (legacyLast['DateTime'] ?? '').split(' ')[0]!.split('.').map(Number);
const legacyDonors = {
  year: ly!,
  month: lm!,
  count: Number(legacyLast['Average number of people donating to the bank']),
};

const dataset = parseDonations({
  unit: 'uah_billion',
  monthly,
  funds,
  fundsPartialYear: 2025,
  fundsPartialMonths: 11,
  aid,
  legacyDonors,
});

mkdirSync(OUT_DIR, { recursive: true });
const body = [
  '{',
  `  "unit": ${JSON.stringify(dataset.unit)},`,
  '  "monthly": [',
  dataset.monthly.map((r) => `    ${JSON.stringify(r)}`).join(',\n'),
  '  ],',
  '  "funds": [',
  dataset.funds.map((f) => `    ${JSON.stringify(f)}`).join(',\n'),
  '  ],',
  `  "fundsPartialYear": ${dataset.fundsPartialYear},`,
  `  "fundsPartialMonths": ${dataset.fundsPartialMonths},`,
  '  "aid": [',
  dataset.aid.map((a) => `    ${JSON.stringify(a)}`).join(',\n'),
  '  ],',
  `  "legacyDonors": ${JSON.stringify(dataset.legacyDonors)}`,
  '}',
  '',
].join('\n');
writeFileSync(join(OUT_DIR, DATA_FILE), body);

const last = dataset.monthly[dataset.monthly.length - 1]!;
console.log(`OK prep donations - ${dataset.monthly.length} months; last: ${last.year}-${String(last.month).padStart(2, '0')} = ${last.amount} bn UAH.`);
