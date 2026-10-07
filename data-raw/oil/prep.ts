/*
 * prep.ts — CHANGED (S3-oil): data-raw/oil/*.csv → public/data/oil/*.json. Run: `npm run prep -- oil`.
 *
 * Inputs (extracted by the scripts in this folder; sources, licences and sha256 in README.md):
 *   ei-2026-oil-consumption.csv   EI Statistical Review 2026 (narrow format): oil consumption, kb/d, 1965–2025
 *   ei-2026-crude-trade-2025.csv  EI Statistical Review 2026 (PDF): inter-area crude trade 2025, million tonnes
 *   eia-crude-imports-annual.csv  EIA: U.S. crude imports by country of origin, kb/d, annual
 *   eia-crude-imports-monthly.csv EIA: the same, monthly, the last two calendar years
 *   comtrade-china-crude.csv      China customs (GACC) via UN Comtrade: HS 2709 imports by partner, kg + US$
 *
 * Codes: ISO 3166-1 alpha-2 (EI and Comtrade give ISO3 → ISO2 via the WPP location table already in the repo; EIA
 * gives names → the EIA_CODES table below; an unknown name or code fails). Two areas that no longer exist keep a
 * reserved code: SU (USSR, EI rows 1965–1984) and AN (Netherlands Antilles, EIA rows to 2004). Regions: UN M49.
 * Cross-checks that abort the prep: EIA monthly 2025 (averaged by days) = EIA annual 2025; the countries named in
 * both EI's trade table and China's customs (Russia, Saudi Arabia, Iraq, Kuwait, UAE, Canada) agree within 2 %.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvParse } from 'd3';
import { M49_REGION } from '../_shared/m49';
import type { Region } from '../../src/lib/regions';
import {
  EXPORTERS,
  FILES,
  IMPORTERS,
  daysIn,
  parseChinaImports,
  parseConsumption,
  parseTrade,
  parseUsImports,
} from '../../src/viz/oil/data';
import type { ChinaRow, ConsumptionRow, Exporter, Importer, TradeFlow, UsRow } from '../../src/viz/oil/data';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '../..');
const OUT_DIR = join(ROOT, 'public/data/oil');
const problems: string[] = [];
const BOM = new RegExp(`^${String.fromCharCode(0xfeff)}`); // a byte-order mark some exports start with
const read = (f: string) => csvParse(readFileSync(join(here, f), 'utf8').replace(BOM, ''));

const EDITION = 2026;
/** EIA release date of both workbooks (printed by extract-eia.py; README.md). */
const EIA_RELEASE = '2026-09-30';
/** Reserved codes for areas that no longer exist (see lib/countries.ts for their names). */
const HISTORIC_REGION: Record<string, Region> = { SU: 'europe', AN: 'americas' };

function regionOf(code: string, at: string): Region {
  const region = HISTORIC_REGION[code] ?? M49_REGION.get(code);
  if (!region) problems.push(`${at}: ${code} has no M49 region`);
  return region ?? 'europe';
}

const wpp = csvParse(readFileSync(join(here, '../population-by-country/wpp2024-population-2025.csv'), 'utf8'));
const ISO2_OF = new Map<string, string>(wpp.filter((d) => d.iso3 && d.iso2).map((d) => [d.iso3!, d.iso2!]));
ISO2_OF.set('SUN', 'SU');

// ── 1. Consumption ───────────────────────────────────────────────────────────────────────────────
const ei = read('ei-2026-oil-consumption.csv');
const years = (ei.columns ?? []).filter((c) => /^\d{4}$/.test(c)).map(Number);
const from = years[0]!;
const to = years.at(-1)!;
const values = (d: Record<string, string | undefined>): (number | null)[] => years.map((y) => (d[y] ? Number(d[y]) : null));
const worldRow = ei.find((d) => d.iso3 === 'WLD');
if (!worldRow) problems.push('ei-2026-oil-consumption.csv: no WLD row');
const world = worldRow ? (values(worldRow) as number[]) : [];
if (world.some((v) => !(Number(v) > 0))) problems.push('ei-2026-oil-consumption.csv: the world row has a gap');
const consumptionRows: ConsumptionRow[] = [];
for (const d of ei) {
  const iso3 = d.iso3 ?? '';
  if (iso3 === 'WLD' || /^[TO]-/.test(iso3)) continue; // aggregates: Total …, Other …
  const code = ISO2_OF.get(iso3);
  if (!code) {
    problems.push(`ei-2026-oil-consumption.csv: no ISO2 for ${iso3} (${d.name})`);
    continue;
  }
  consumptionRows.push({ code, region: regionOf(code, `EI ${d.name}`), values: values(d) });
}
const consumption = { edition: EDITION, from, to, world, rows: consumptionRows.sort((a, b) => a.code.localeCompare(b.code)) };

// ── 2. U.S. imports ──────────────────────────────────────────────────────────────────────────────
// EIA series names → ISO2. The three EIA groupings (OPEC, Non-OPEC, Persian Gulf) and the total are not countries.
const EIA_CODES: Record<string, string> = {
  Albania: 'AL', Algeria: 'DZ', Angola: 'AO', Argentina: 'AR', Australia: 'AU', Azerbaijan: 'AZ', 'Bahama Islands': 'BS',
  Bahrain: 'BH', Barbados: 'BB', Belarus: 'BY', Belize: 'BZ', Benin: 'BJ', Bolivia: 'BO', Brazil: 'BR', Brunei: 'BN',
  Cameroon: 'CM', Canada: 'CA', Chad: 'TD', Chile: 'CL', China: 'CN', Colombia: 'CO', 'Congo (Brazzaville)': 'CG',
  'Congo (Kinshasa)': 'CD', Denmark: 'DK', Ecuador: 'EC', Egypt: 'EG', 'Equatorial Guinea': 'GQ', Estonia: 'EE',
  Gabon: 'GA', Georgia: 'GE', Germany: 'DE', Ghana: 'GH', Guatemala: 'GT', Guinea: 'GN', Guyana: 'GY', India: 'IN',
  Indonesia: 'ID', Iran: 'IR', Iraq: 'IQ', Italy: 'IT', "Ivory Coast (Cote d'Ivore)": 'CI', Kazakhstan: 'KZ',
  Kuwait: 'KW', Kyrgyzstan: 'KG', Libya: 'LY', Malaysia: 'MY', Mauritania: 'MR', Mexico: 'MX', Netherlands: 'NL',
  'Netherlands Antilles': 'AN', 'New Zealand': 'NZ', Nigeria: 'NG', Norway: 'NO', Oman: 'OM', Panama: 'PA',
  'Papua New Guinea': 'PG', Peru: 'PE', 'Puerto Rico': 'PR', Qatar: 'QA', Russia: 'RU', 'Saudi Arabia': 'SA',
  Senegal: 'SN', Singapore: 'SG', 'South Africa': 'ZA', 'South Sudan': 'SS', Spain: 'ES', Sweden: 'SE', Syria: 'SY',
  Thailand: 'TH', 'Trinidad and Tobago': 'TT', Tunisia: 'TN', 'United Arab Emirates': 'AE', 'United Kingdom': 'GB',
  Venezuela: 'VE', Vietnam: 'VN', 'Virgin Islands': 'VI', Yemen: 'YE',
};
const EIA_GROUPS = new Set(['OPEC Countries', 'Non-OPEC Countries', 'Persian Gulf Countries']);
const EIA_TOTAL = 'U.S. Imports';

const annual = read('eia-crude-imports-annual.csv');
const monthly = read('eia-crude-imports-monthly.csv');
for (const d of [...annual, ...monthly]) {
  const s = d.series ?? '';
  if (s !== EIA_TOTAL && !EIA_GROUPS.has(s) && !EIA_CODES[s]) problems.push(`EIA: unknown series "${s}" — add it to EIA_CODES`);
}
const countryYears = annual.filter((d) => EIA_CODES[d.series ?? '']).map((d) => Number(d.period));
const usFrom = Math.min(...countryYears);
const usTo = Math.max(...annual.map((d) => Number(d.period)));
const usYears = Array.from({ length: usTo - usFrom + 1 }, (_, i) => usFrom + i);

// Monthly → averages by days, per calendar year: Σ(kb/d × days in month) ÷ Σ days.
const daysInMonth = (y: number, m: number): number => new Date(Date.UTC(y, m, 0)).getUTCDate();
function monthlyAverage(series: string, year: number): { kbd: number | null; months: number } {
  const rows = monthly.filter((d) => d.series === series && d.period!.startsWith(`${year}-`));
  const months = new Set(monthly.filter((d) => d.series === EIA_TOTAL && d.period!.startsWith(`${year}-`)).map((d) => d.period)).size;
  if (!rows.length) return { kbd: null, months };
  let barrels = 0;
  let days = 0;
  for (let m = 1; m <= months; m++) {
    const d = rows.find((r) => r.period === `${year}-${String(m).padStart(2, '0')}`);
    barrels += (d ? Number(d.kbd) : 0) * daysInMonth(year, m);
    days += daysInMonth(year, m);
  }
  return { kbd: Math.round((barrels / days) * 10) / 10, months };
}
const partialYear = usTo + 1;
const partialMonths = monthlyAverage(EIA_TOTAL, partialYear).months;
if (partialMonths < 1 || partialMonths > 11) problems.push(`EIA monthly: ${partialMonths} months of ${partialYear} — expected a partial year`);

// Check: the monthly file's last full year equals the annual file (to rounding) for the total and every country.
for (const s of [EIA_TOTAL, ...Object.keys(EIA_CODES)]) {
  const a = annual.find((d) => d.series === s && Number(d.period) === usTo);
  const m = monthlyAverage(s, usTo);
  if (!a && !m.kbd) continue;
  if (Math.abs(Number(a?.kbd ?? 0) - (m.kbd ?? 0)) > 1.5) problems.push(`EIA ${s} ${usTo}: annual ${a?.kbd ?? '—'} vs monthly average ${m.kbd ?? '—'}`);
}

const usTotal = usYears.map((y) => Number(annual.find((d) => d.series === EIA_TOTAL && Number(d.period) === y)?.kbd ?? NaN));
if (usTotal.some((v) => !(v >= 0))) problems.push('EIA: the total has a gap');
const usRows: UsRow[] = Object.entries(EIA_CODES)
  .map(([name, code]): UsRow => {
    const vals = usYears.map((y) => {
      const d = annual.find((r) => r.series === name && Number(r.period) === y);
      return d && Number(d.kbd) > 0 ? Number(d.kbd) : null;
    });
    const p = monthlyAverage(name, partialYear).kbd;
    return { code, region: regionOf(code, `EIA ${name}`), values: vals, partial: p && p > 0 ? p : null };
  })
  .filter((r) => r.values.some((v) => v !== null) || r.partial !== null)
  .sort((a, b) => a.code.localeCompare(b.code));
const usImports = {
  from: usFrom,
  to: usTo,
  total: usTotal,
  partial: { year: partialYear, months: partialMonths, total: monthlyAverage(EIA_TOTAL, partialYear).kbd ?? 0 },
  release: EIA_RELEASE,
  rows: usRows,
};

// ── 3. China imports ─────────────────────────────────────────────────────────────────────────────
const ct = read('comtrade-china-crude.csv');
const chinaYears = [...new Set(ct.map((d) => Number(d.year)))].sort((a, b) => a - b);
const byCode = new Map<string, ChinaRow>();
for (const d of ct) {
  const iso3 = d.partner_iso3 ?? '';
  const code = ISO2_OF.get(iso3);
  if (!code) {
    problems.push(`comtrade-china-crude.csv: no ISO2 for ${iso3} (${d.partner_name})`);
    continue;
  }
  const i = chinaYears.indexOf(Number(d.year));
  const row = byCode.get(code) ?? {
    code,
    region: regionOf(code, `Comtrade ${d.partner_name}`),
    tonnes: chinaYears.map(() => null),
    usd: chinaYears.map(() => null),
  };
  row.tonnes[i] = d.net_weight_kg ? Math.round(Number(d.net_weight_kg) / 1000) : null;
  row.usd[i] = Number(d.value_usd) || null;
  byCode.set(code, row);
}
const chinaRows = [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
const chinaTotal = chinaYears.map((_, i) => chinaRows.reduce((s, r) => s + (r.tonnes[i] ?? 0), 0));
const china = { years: chinaYears, total: chinaTotal, rows: chinaRows };

// ── 4. Inter-area crude trade ────────────────────────────────────────────────────────────────────
const AREA_ID: Record<string, Exporter | Importer> = {
  Canada: 'canada', Mexico: 'mexico', US: 'us', 'S. & Cent. America': 'latin-america', Europe: 'europe',
  'Russian Federation': 'russia', 'Other CIS': 'other-cis', Iraq: 'iraq', Kuwait: 'kuwait', 'Saudi Arabia': 'saudi-arabia',
  UAE: 'uae', 'Other Middle East': 'other-middle-east', 'Middle East': 'middle-east', 'North Africa': 'north-africa',
  'West Africa': 'west-africa', 'East & S. Africa': 'east-south-africa', Africa: 'africa', Australasia: 'australasia',
  China: 'china', India: 'india', Japan: 'japan', Singapore: 'singapore', 'Other Asia Pacific': 'other-asia-pacific',
};
const tr = read('ei-2026-crude-trade-2025.csv');
const flows: TradeFlow[] = [];
const importTotals = {} as Record<Importer, number>;
let tradeWorld = 0;
for (const d of tr) {
  if (d.from === 'Total imports') {
    if (d.to === 'Total') tradeWorld = Number(d.mt);
    else importTotals[AREA_ID[d.to!] as Importer] = d.dagger === '1' ? 0 : Number(d.mt);
    continue;
  }
  const f = AREA_ID[d.from!];
  const t = AREA_ID[d.to!];
  if (!f || !(EXPORTERS as readonly string[]).includes(f)) problems.push(`trade: unknown exporter "${d.from}"`);
  if (!t || !(IMPORTERS as readonly string[]).includes(t)) problems.push(`trade: unknown importer "${d.to}"`);
  const flow: TradeFlow = { from: f as Exporter, to: t as Importer, mt: Number(d.mt) };
  flows.push(d.dagger === '1' ? { ...flow, small: true } : flow);
}
// A "†" import total (Russia) is below 0.05 Mt: the sum of its † cells stands in for it.
for (const k of IMPORTERS) if (importTotals[k] === 0) importTotals[k] = Math.round(flows.filter((f) => f.to === k).reduce((s, f) => s + f.mt, 0) * 100) / 100;
const trade = { year: 2025, edition: EDITION, flows, importTotals, world: tradeWorld };

// Cross-check: China's customs and the EI's table name the same six suppliers — they must agree (EI uses GACC).
const tradeYear = trade.year;
const ci = chinaYears.indexOf(tradeYear);
for (const [code, area] of [['RU', 'russia'], ['SA', 'saudi-arabia'], ['IQ', 'iraq'], ['KW', 'kuwait'], ['AE', 'uae'], ['CA', 'canada']] as const) {
  const customs = (byCode.get(code)?.tonnes[ci] ?? 0) / 1e6;
  const eiMt = flows.find((f) => f.from === area && f.to === 'china')?.mt ?? 0;
  if (ci < 0 || Math.abs(customs - eiMt) > Math.max(0.3, eiMt * 0.02)) problems.push(`China ${code} ${tradeYear}: customs ${customs.toFixed(1)} Mt vs EI ${eiMt} Mt`);
}
// Cross-check: the EIA's 2025 imports from Canada ≈ the EI's Canada → US cell converted with the EI factor (±3 %).
{
  const ca = usRows.find((r) => r.code === 'CA')?.values[tradeYear - usFrom] ?? 0;
  const eiCa = ((flows.find((f) => f.from === 'canada' && f.to === 'us')?.mt ?? 0) * 1e6 * 7.33) / daysIn(tradeYear) / 1000;
  if (Math.abs(ca - eiCa) > ca * 0.03) problems.push(`US ← Canada ${tradeYear}: EIA ${ca} kb/d vs EI ≈ ${eiCa.toFixed(0)} kb/d`);
}

if (problems.length) {
  console.error(`✗ prep oil — ${problems.length} problem(s):\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}

// Fail fast on the same parsers the site uses, then write one row per line (readable diffs).
parseConsumption(consumption);
parseUsImports(usImports);
parseChinaImports(china);
parseTrade(trade);

function write(file: string, head: Record<string, unknown>, listKey: string, list: readonly unknown[]): void {
  const lines = Object.entries(head).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`);
  const body = ['{', ...lines, `  ${JSON.stringify(listKey)}: [`, list.map((r) => `    ${JSON.stringify(r)}`).join(',\n'), '  ]', '}', ''].join('\n');
  writeFileSync(join(OUT_DIR, file), body);
}
mkdirSync(OUT_DIR, { recursive: true });
write(FILES.consumption, { edition: EDITION, from, to, world }, 'rows', consumption.rows);
write(FILES.us, { from: usFrom, to: usTo, total: usTotal, partial: usImports.partial, release: EIA_RELEASE }, 'rows', usRows);
write(FILES.china, { years: chinaYears, total: chinaTotal }, 'rows', chinaRows);
write(FILES.trade, { year: trade.year, edition: EDITION, importTotals, world: tradeWorld }, 'flows', flows);

console.log(
  `✓ oil — consumption: ${consumption.rows.length} areas ${from}–${to}, world ${world.at(-1)} kb/d · US: ${usRows.length} suppliers ` +
    `${usFrom}–${usTo} + ${partialYear} (${partialMonths} months) · China: ${chinaRows.length} partners ${chinaYears.join(', ')} · ` +
    `trade ${trade.year}: ${flows.length} flows, ${tradeWorld} Mt.`,
);
