/*
 * prep.ts — Interbrand Best Global Brands 2000–2025 → public/data/global-brands-race/brands-2000-2025.json.
 * Run: `npm run prep -- global-brands-race`.  CHANGED (S3-br): new dataset.
 *
 * Inputs (see README.md):
 *   interbrand-2000-2019.csv — date,name,category,value (US$ m): the widely used Interbrand extract behind the
 *                              D3 gallery "Bar chart race" (legacy copy in _examples; checked, no duplicates);
 *   interbrand-2020-2025.csv — year,rank,brand,value_bn,change: the 2020–2025 rankings as published on
 *                              interbrand.com (value in US$ bn, one decimal; change vs the previous year or NEW);
 *   brands.csv               — name,sector,country: one row per brand (sector = Interbrand's, country = ISO 3166-1).
 * Checks that abort the run: an unknown brand or sector, a rank that is not 1…n, a value out of order, and —
 * the strongest one — every published "change" must match our own two values within rounding, which proves
 * the 2020–2025 transcription and the 2019→2020 join (renames resolved through ALIASES).
 * The output is validated by the same parser the site uses.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvParse } from 'd3';
import { DATA_FILE, SECTORS, parseBrandDataset } from '../../src/viz/global-brands-race/data';
import type { Brand, BrandDataset, Sector, YearRanking } from '../../src/viz/global-brands-race/data';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, '../../public/data/global-brands-race');
const FROM = 2000;
const TO = 2025;

/** Older spellings → the name in brands.csv (Interbrand's latest spelling). */
const ALIASES: Record<string, string> = {
  'Salesforce.com': 'Salesforce',
  'Banco Santander': 'Santander',
  "L'Oréal": "L'Oréal Paris",
  NESCAFÉ: 'Nescafé',
  Mastercard: 'MasterCard',
};
/** Interbrand marks these NEW although the brand was ranked the year before (a respelling); kept as one brand. */
const NEW_BUT_RANKED = new Set(['2022:YouTube', '2024:MasterCard']);

const problems: string[] = [];
const read = (file: string) => csvParse(readFileSync(join(here, file), 'utf8').replace(/^\uFEFF/, ''));
const canon = (name: string): string => ALIASES[name.trim()] ?? name.trim();

export function slug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const sectorKey = (label: string): Sector | undefined => {
  const key = slug(label).replace(/-and-/g, '-') as Sector;
  return (SECTORS as readonly string[]).includes(key) ? key : undefined;
};

// ── Brands ──────────────────────────────────────────────────────────────────────────────────────
const brandByName = new Map<string, Brand>();
for (const [i, d] of read('brands.csv').entries()) {
  const name = (d.name ?? '').trim();
  const sector = sectorKey(d.sector ?? '');
  const country = (d.country ?? '').trim();
  if (!sector) problems.push(`brands.csv row ${i + 2}: unknown sector "${d.sector}"`);
  if (!/^[A-Z]{2}$/.test(country)) problems.push(`brands.csv row ${i + 2}: bad country "${country}"`);
  if (brandByName.has(name)) problems.push(`brands.csv row ${i + 2}: duplicate "${name}"`);
  brandByName.set(name, { id: slug(name), name, sector: sector ?? 'diversified', country });
}

// ── Values: year → name → US$ m (error = half the last published digit) ─────────────────────────
type Cell = { value: number; err: number };
const values = new Map<number, Map<string, Cell>>();
const order = new Map<number, string[]>();
const put = (year: number, name: string, cell: Cell, where: string): void => {
  if (!brandByName.has(name)) problems.push(`${where}: "${name}" is not in brands.csv`);
  const m = values.get(year) ?? new Map<string, Cell>();
  if (m.has(name)) problems.push(`${where}: "${name}" twice in ${year}`);
  m.set(name, cell);
  values.set(year, m);
  order.set(year, [...(order.get(year) ?? []), name]);
};

for (const [i, d] of read('interbrand-2000-2019.csv').entries()) {
  const where = `interbrand-2000-2019.csv row ${i + 2}`;
  const year = Number((d.date ?? '').slice(0, 4));
  const name = canon(d.name ?? '');
  const value = Number(d.value);
  if (!(year >= FROM && year <= 2019) || !Number.isInteger(value) || value <= 0) problems.push(`${where}: bad row`);
  // The legacy category must agree with brands.csv — the sector has one source of truth.
  const b = brandByName.get(name);
  if (b && sectorKey(d.category ?? '') !== b.sector) problems.push(`${where}: sector of "${name}" differs from brands.csv`);
  put(year, name, { value, err: 0.5 }, where);
}

type Published = { year: number; name: string; change: string };
const published: Published[] = [];
for (const [i, d] of read('interbrand-2020-2025.csv').entries()) {
  const where = `interbrand-2020-2025.csv row ${i + 2}`;
  const year = Number(d.year);
  const name = canon(d.brand ?? '');
  const bn = Number(d.value_bn);
  const rank = Number(d.rank);
  if (!(year >= 2020 && year <= TO) || !(bn > 0)) problems.push(`${where}: bad row`);
  if (rank !== (order.get(year)?.length ?? 0) + 1) problems.push(`${where}: rank ${rank} out of sequence`);
  put(year, name, { value: Math.round(bn * 1000), err: 50 }, where);
  published.push({ year, name, change: (d.change ?? '').trim() });
}

// ── The published change must match our values (within rounding of both years) ───────────────────
let verified = 0;
for (const p of published) {
  const cur = values.get(p.year)!.get(p.name)!;
  const prev = values.get(p.year - 1)?.get(p.name);
  if (p.change === 'NEW') {
    if (prev && !NEW_BUT_RANKED.has(`${p.year}:${p.name}`)) problems.push(`${p.year} ${p.name}: NEW but ranked in ${p.year - 1}`);
    continue;
  }
  if (!prev) {
    problems.push(`${p.year} ${p.name}: change ${p.change} but not ranked in ${p.year - 1} (missing alias?)`);
    continue;
  }
  const c = Number(p.change) / 100;
  const lo = (cur.value - cur.err) / (prev.value + prev.err) - 1 - 0.0005;
  const hi = (cur.value + cur.err) / (prev.value - prev.err) - 1 + 0.0005;
  if (!(c >= lo && c <= hi)) problems.push(`${p.year} ${p.name}: published ${p.change}% ≠ ${prev.value} → ${cur.value}`);
  else verified++;
}

if (problems.length) {
  console.error(`✗ prep global-brands-race — ${problems.length} problem(s):`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}

// ── Output ──────────────────────────────────────────────────────────────────────────────────────
const years: YearRanking[] = [];
for (let year = FROM; year <= TO; year++) {
  const m = values.get(year)!;
  years.push({
    year,
    entries: order.get(year)!.map((name) => ({ id: brandByName.get(name)!.id, value: m.get(name)!.value })),
  });
}
const used = new Set(years.flatMap((y) => y.entries.map((e) => e.id)));
const brands = [...brandByName.values()].filter((b) => used.has(b.id)).sort((a, b) => a.id.localeCompare(b.id));
const dataset: BrandDataset = { unit: 'usd-millions', from: FROM, to: TO, brands, years };
parseBrandDataset(JSON.parse(JSON.stringify(dataset)));

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, DATA_FILE), JSON.stringify(dataset) + '\n');
const rows = years.reduce((s, y) => s + y.entries.length, 0);
console.log(`✓ ${DATA_FILE}: ${brands.length} brands, ${years.length} years, ${rows} rankings; ${verified} published year-on-year changes match.`);
