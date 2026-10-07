/*
 * prep.ts — CHANGED (S3-el): data-raw/electricity/*.csv → public/data/electricity/*.json. Run: `npm run prep -- electricity`.
 *
 * Inputs (sources, licences and sha256 in README.md):
 *   ember-yearly.csv          extract-ember.py ← Ember Yearly Electricity Data (CC BY 4.0): countries + World, 2000–2025
 *   ember-europe-ukraine.csv  extract-ember.py ← Ember Yearly Electricity Data Europe: Ukraine 1990–2022
 *   wb-access.csv             extract-wb.py ← World Bank WDI API (CC BY 4.0): access to electricity + population
 *   energoatom-2021.csv       typed from Energoatom's “Звіт про управління 2021”, pp. 48–49 (generation per plant)
 *
 * Codes: ISO3 → ISO 3166-1 alpha-2 via the WPP location table already in the repo (an unknown code fails);
 * regions: UN M49. Checks that abort the prep: Ukraine's years in the European file agree with the global file
 * (2000–2022, within 1 %); Energoatom's plants add up to its total and its nuclear output matches Ember's 2021 nuclear
 * generation within 1 %; the race ends in a year only if no country missing from that year would have reached its
 * top 12 (it ends a year earlier otherwise); every listed year's fuels add up to the world.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvParse } from 'd3';
import type { DSVRowString } from 'd3';
import { M49_REGION } from '../_shared/m49';
import type { Region } from '../../src/lib/regions';
import {
  FILES,
  FUELS,
  NPP_IDS,
  OLDEST_YEAR,
  RACE_SOURCES,
  RANK_YEAR,
  parseAccess,
  parseCountries,
  parseRace,
  parseUkraine,
  parseWorld,
} from '../../src/viz/electricity/data';
import type { AccessRow, CountryRow, Fuel, NppId, RaceRow, RaceSource } from '../../src/viz/electricity/data';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '../..');
const OUT_DIR = join(ROOT, 'public/data/electricity');
const problems: string[] = [];
const read = (f: string) => csvParse(readFileSync(join(here, f), 'utf8'));

/** Date the Ember files were downloaded (README.md); Ember updates them in place. */
const EMBER_RETRIEVED = '2026-10-07';
/** WDI `lastupdated` of both indicators (printed by extract-wb.py). */
const WB_UPDATED = '2026-07-13';
const RACE_SLOTS = 12;
const COLUMN: Record<Fuel, string> = {
  coal: 'coal',
  gas: 'gas',
  otherFossil: 'other_fossil',
  nuclear: 'nuclear',
  hydro: 'hydro',
  wind: 'wind',
  solar: 'solar',
  bioenergy: 'bioenergy',
  otherRenewables: 'other_renewables',
};

const wpp = csvParse(readFileSync(join(here, '../population-by-country/wpp2024-population-2025.csv'), 'utf8'));
const ISO2_OF = new Map<string, string>(wpp.filter((d) => d.iso3 && d.iso2).map((d) => [d.iso3!, d.iso2!]));

function regionOf(code: string, at: string): Region {
  const region = M49_REGION.get(code);
  if (!region) problems.push(`${at}: ${code} has no M49 region`);
  return region ?? 'europe';
}

const n = (v: string | undefined): number | null => (v === undefined || v === '' ? null : Number(v));
const r2 = (v: number): number => Math.round(v * 100) / 100;
const fuels = (d: DSVRowString): number[] => FUELS.map((f) => n(d[COLUMN[f]]) ?? 0);

// ── Ember, global file ───────────────────────────────────────────────────────────────────────────
const ember = read('ember-yearly.csv');
const byArea = new Map<string, Map<number, DSVRowString>>();
for (const d of ember) {
  const years = byArea.get(d.iso3!) ?? new Map<number, DSVRowString>();
  years.set(Number(d.year), d);
  byArea.set(d.iso3!, years);
}
const worldYears = byArea.get('WLD');
if (!worldYears) throw new Error('ember-yearly.csv: no World rows');
const allYears = [...worldYears.keys()].sort((a, b) => a - b);
const from = allYears[0]!;
const to = allYears.at(-1)!;
if (allYears.length !== to - from + 1) problems.push('ember-yearly.csv: the World has a gap year');

// 1. countries.json — each country's latest year ≤ RANK_YEAR, if it is ≥ OLDEST_YEAR.
const countryRows: CountryRow[] = [];
const skipped: string[] = [];
for (const [iso3, years] of byArea) {
  if (iso3 === 'WLD') continue;
  const code = ISO2_OF.get(iso3);
  if (!code) {
    problems.push(`ember-yearly.csv: no ISO2 for ${iso3}`);
    continue;
  }
  const year = Math.max(...[...years.keys()].filter((y) => y <= RANK_YEAR));
  if (!(year >= OLDEST_YEAR)) {
    skipped.push(`${iso3} (last ${year})`);
    continue;
  }
  const d = years.get(year)!;
  const gen = fuels(d);
  if (gen.reduce((s, v) => s + v, 0) <= 0) {
    skipped.push(`${iso3} (no generation)`);
    continue;
  }
  countryRows.push({
    code,
    region: regionOf(code, `Ember ${d.area}`),
    year,
    gen,
    demand: n(d.demand) ?? 0,
    perCapita: n(d.demand_pc) ?? 0,
    co2: n(d.co2_intensity),
  });
}
const ua = countryRows.find((r) => r.code === 'UA');
if (!ua || ua.year !== 2022) problems.push(`Ukraine: expected its last Ember year 2022, got ${ua?.year}`);
const w = worldYears.get(RANK_YEAR)!;
const countries = {
  retrieved: EMBER_RETRIEVED,
  rankYear: RANK_YEAR,
  world: { year: RANK_YEAR, gen: fuels(w), demand: n(w.demand)!, perCapita: n(w.demand_pc)!, co2: n(w.co2_intensity)! },
  rows: countryRows.sort((a, b) => a.code.localeCompare(b.code)),
};

// 2. world.json
const span = Array.from({ length: to - from + 1 }, (_, i) => from + i);
const world = {
  retrieved: EMBER_RETRIEVED,
  from,
  to,
  gen: Object.fromEntries(FUELS.map((f) => [f, span.map((y) => n(worldYears.get(y)![COLUMN[f]]) ?? 0)])),
  demand: span.map((y) => n(worldYears.get(y)!.demand)!),
  co2: span.map((y) => n(worldYears.get(y)!.co2_intensity)!),
};

// 3. race.json — every country with any solar or wind; the last year only if nobody missing from it would enter the top.
function raceEnd(): number {
  for (const src of RACE_SOURCES) {
    const col = COLUMN[src];
    const present: number[] = [];
    const missing: Array<{ iso3: string; before: number }> = [];
    for (const [iso3, years] of byArea) {
      if (iso3 === 'WLD') continue;
      const last = years.get(to);
      if (last) present.push(n(last[col]) ?? 0);
      else missing.push({ iso3, before: n(years.get(to - 1)?.[col]) ?? 0 });
    }
    const cut = present.sort((a, b) => b - a)[RACE_SLOTS - 1] ?? 0;
    // A missing country stays out only if its previous year is well below the cut (growth < 1.5× is assumed).
    const risky = missing.filter((m) => m.before * 1.5 >= cut);
    if (risky.length) {
      console.warn(`race: ${src} ${to} — ${risky.map((m) => m.iso3).join(', ')} missing and could reach the top ${RACE_SLOTS}; the race ends in ${to - 1}`);
      return to - 1;
    }
  }
  return to;
}
const raceTo = raceEnd();
const raceSpan = span.filter((y) => y <= raceTo);
const raceRows: RaceRow[] = [];
for (const [iso3, years] of byArea) {
  if (iso3 === 'WLD') continue;
  const code = ISO2_OF.get(iso3);
  if (!code) continue; // reported above
  const series = (src: RaceSource) => raceSpan.map((y) => n(years.get(y)?.[COLUMN[src]]));
  const row: RaceRow = { code, region: regionOf(code, `Ember ${iso3}`), solar: series('solar'), wind: series('wind') };
  if ([...row.solar, ...row.wind].some((v) => (v ?? 0) > 0)) raceRows.push(row);
}
const race = {
  retrieved: EMBER_RETRIEVED,
  from,
  to: raceTo,
  lastYearCountries: [...byArea.entries()].filter(([iso3, years]) => iso3 !== 'WLD' && years.has(raceTo)).length,
  world: { solar: raceSpan.map((y) => n(worldYears.get(y)!.solar)!), wind: raceSpan.map((y) => n(worldYears.get(y)!.wind)!) },
  rows: raceRows.sort((a, b) => a.code.localeCompare(b.code)),
};

// ── 4. ukraine.json — Ember's European file (from 1990) + Energoatom 2021 ─────────────────────────
const eu = read('ember-europe-ukraine.csv').sort((a, b) => Number(a.year) - Number(b.year));
const uFrom = Number(eu[0]!.year);
const uTo = Number(eu.at(-1)!.year);
if (eu.length !== uTo - uFrom + 1) problems.push('ember-europe-ukraine.csv: a gap year');
const uaGlobal = byArea.get('UKR')!;
for (const d of eu) {
  const g = uaGlobal.get(Number(d.year));
  if (!g) continue;
  const a = Number(d.total);
  const b = Number(g.total);
  if (Math.abs(a - b) > Math.max(0.1, b * 0.01)) problems.push(`Ukraine ${d.year}: European file ${a} TWh vs global ${b} TWh`);
}
const ea = new Map(read('energoatom-2021.csv').map((d) => [d.plant!, d]));
const gwh = (id: string): number => Number(ea.get(id)?.generation_gwh);
const plants = Object.fromEntries(NPP_IDS.map((id) => [id, gwh(id)])) as Record<NppId, number>;
const plantSum = NPP_IDS.reduce((s, id) => s + plants[id], 0) + gwh('SUNPP_HYDRO');
if (Math.abs(plantSum - gwh('ENERGOATOM')) > 1) problems.push(`Energoatom 2021: plants add up to ${plantSum}, total ${gwh('ENERGOATOM')}`);
const nuclear2021 = NPP_IDS.reduce((s, id) => s + plants[id], 0) / 1000;
const emberNuclear2021 = Number(eu.find((d) => d.year === '2021')?.nuclear);
if (Math.abs(nuclear2021 - emberNuclear2021) > emberNuclear2021 * 0.01) {
  problems.push(`Nuclear 2021: Energoatom ${nuclear2021} TWh vs Ember ${emberNuclear2021} TWh`);
}
const ukraine = {
  retrieved: EMBER_RETRIEVED,
  from: uFrom,
  to: uTo,
  gen: Object.fromEntries(FUELS.map((f) => [f, eu.map((d) => n(d[COLUMN[f]]) ?? 0)])),
  demand: eu.map((d) => n(d.demand)!),
  netImports: eu.map((d) => n(d.net_imports) ?? 0),
  perCapita: eu.map((d) => n(d.demand_pc)!),
  nuclear: {
    year: 2021,
    plants,
    energoatom: gwh('ENERGOATOM'),
    ukraine: gwh('UKRAINE'),
    // Six VVER-1000 units of 1,000 MW (report pp. 5 and 115) of the 13,835 MW of all 15 units (p. 14).
    znppMw: 6 * 1000,
    nuclearMw: 13_835,
  },
};

// ── 5. access.json — World Bank ───────────────────────────────────────────────────────────────────
const wb = read('wb-access.csv');
const wbBy = new Map<string, Map<number, DSVRowString>>();
for (const d of wb) {
  const m = wbBy.get(d.iso3!) ?? new Map<number, DSVRowString>();
  m.set(Number(d.year), d);
  wbBy.set(d.iso3!, m);
}
const ACCESS_YEAR = Math.max(...wb.filter((d) => d.access).map((d) => Number(d.year)));
const FIRST_YEAR = 2000;
const accessRows: AccessRow[] = [];
for (const [iso3, years] of wbBy) {
  const code = ISO2_OF.get(iso3);
  if (!code) continue; // aggregates (WLD, SSF …) and the Channel Islands, which WPP splits into GG and JE
  const year = [...years.keys()]
    .filter((y) => y > ACCESS_YEAR - 5 && years.get(y)!.access && years.get(y)!.population)
    .sort((a, b) => b - a)[0];
  if (year === undefined) continue;
  const d = years.get(year)!;
  accessRows.push({
    code,
    region: regionOf(code, `WB ${d.name}`),
    year,
    access: r2(Number(d.access)),
    population: Number(d.population),
    first: n(years.get(FIRST_YEAR)?.access) === null ? null : r2(Number(years.get(FIRST_YEAR)!.access)),
  });
}
const agg = (iso3: string) => {
  const d = wbBy.get(iso3)?.get(ACCESS_YEAR);
  if (!d?.access || !d.population) problems.push(`wb-access.csv: no ${iso3} ${ACCESS_YEAR}`);
  return { access: r2(Number(d?.access)), population: Number(d?.population) };
};
const access = {
  updated: WB_UPDATED,
  year: ACCESS_YEAR,
  firstYear: FIRST_YEAR,
  world: agg('WLD'),
  ssa: agg('SSF'),
  rows: accessRows.sort((a, b) => a.code.localeCompare(b.code)),
};

// ── Validate with the page's own parsers, then write ───────────────────────────────────────────────
const out: Array<[string, unknown, (json: unknown) => unknown]> = [
  [FILES.countries, countries, (j) => parseCountries(j)],
  [FILES.world, world, (j) => parseWorld(j)],
  [FILES.race, race, (j) => parseRace(j)],
  [FILES.ukraine, ukraine, (j) => parseUkraine(j)],
  [FILES.access, access, (j) => parseAccess(j)],
];
for (const [file, json, parse] of out) {
  try {
    parse(JSON.parse(JSON.stringify(json)));
  } catch (e) {
    problems.push(`${file}: ${(e as Error).message}`);
  }
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
mkdirSync(OUT_DIR, { recursive: true });
for (const [file, json] of out) {
  writeFileSync(join(OUT_DIR, file), `${JSON.stringify(json)}\n`);
  console.log(`public/data/electricity/${file}`);
}
console.log(
  `countries ${countries.rows.length} (${countries.rows.filter((r) => r.year !== RANK_YEAR).length} dated; skipped ${skipped.join(', ') || 'none'}) · ` +
    `world ${from}–${to} · race ${from}–${raceTo}, ${race.rows.length} countries · Ukraine ${uFrom}–${uTo} · access ${ACCESS_YEAR}, ${accessRows.length} countries`,
);
