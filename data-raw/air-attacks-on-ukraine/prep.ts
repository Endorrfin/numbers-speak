/*
 * prep.ts — Kaggle "Massive Missile Attacks on Ukraine" + HRMMU civilian casualties →
 *   public/data/air-attacks-on-ukraine/attacks-2022-2026.json and civilians-hrmmu-2023-2026.json.
 * Run: `npm run prep -- air-attacks-on-ukraine`.  CHANGED (S3-aa): new dataset.
 *
 * Inputs (see README.md):
 *   missile_attacks_daily.csv — Petro Ivaniuk, Kaggle, CC BY-NC-SA 4.0: one row per model per Air Force report;
 *   hrmmu-civilians.csv       — civilian casualties per year transcribed from the UN HRMMU updates.
 * Rules (each one is printed with its counts):
 *   1. National reports only: rows from the regional air commands (PvK "South", "East", "West", "Centre") and
 *      oblast administrations overlap the Air Force's national reports and are dropped.
 *   2. Long-range strike weapons only: tactical and reconnaissance drones (Orlan, ZALA, Supercam, Lancet,
 *      Molniya…) and guided bombs are out of scope — reported irregularly and mostly by one regional command.
 *   3. Every model maps to a class; a row that combines models of several classes becomes `mixed`.
 *      An unknown model aborts the run, so a refresh cannot silently drop a new weapon.
 *   4. status_data = hidden (from 10 Aug 2026) → note `launched-hidden`; a missing `destroyed` →
 *      note `destroyed-missing`. Such items count in totals but not in interception rates.
 *   5. destroyed + lost > launched (a transcription slip) → lost is capped and the row is listed; a row
 *      without a number launched (the report names the attack only) adds nothing and is listed.
 * The output is validated by the same parsers the site uses.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvParse } from 'd3';
import {
  CIVILIANS_FILE,
  DATA_FILE,
  parseAttacks,
  parseCivilians,
} from '../../src/viz/air-attacks-on-ukraine/data';
import type {
  AttacksDataset,
  CivilianYear,
  CiviliansDataset,
  Item,
  ItemNote,
  ModelTotal,
  Report,
  WeaponClass,
} from '../../src/viz/air-attacks-on-ukraine/data';

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(here, '../../public/data/air-attacks-on-ukraine');
const RAW = 'missile_attacks_daily.csv';

/** Every in-scope model (source spelling) → class. */
const MODEL_CLASS: Record<string, WeaponClass> = {
  'X-101/X-555': 'cruise',
  Kalibr: 'cruise',
  'Iskander-K': 'cruise',
  'X-59': 'cruise',
  'X-69': 'cruise',
  'X-59/X-69': 'cruise',
  'X-59MK2': 'cruise',
  'X-35': 'cruise',
  'X-35Y': 'cruise',
  Banderol: 'cruise',
  'Iskander-M': 'ballistic',
  'KN-23': 'ballistic',
  'Iskander-M/KN-23': 'ballistic',
  'C-300': 'ballistic',
  'C-400': 'ballistic',
  'C-300/C-400': 'ballistic',
  'Ballistic Missile': 'ballistic',
  'Intercontinental Ballistic Missile': 'ballistic',
  'X-47 Kinzhal': 'ballistic',
  'X-22': 'antiship',
  'X-32': 'antiship',
  'P-800 Oniks': 'antiship',
  '3M22 Zircon': 'antiship',
  'X-31': 'other',
  'X-31P': 'other',
  'X-31PD': 'other',
  'Unknown Missile': 'other',
  'Shahed-136/131': 'drones',
  'Unknown UAV': 'drones',
};

/** Out of scope (rule 2). */
const OUT_OF_SCOPE = new Set([
  'Orlan-10',
  'Orlan-30',
  'ZALA',
  'Supercam',
  'Merlin-VR',
  'Orion',
  'Forpost',
  'Mohajer-6',
  'Reconnaissance UAV',
  'Lancet',
  'Молнія',
  'Granat-4',
  'Eleron',
  'Kub',
  'Привет-82',
  'Картограф',
  'Фенікс',
  'GBU',
  'Aerial Bomb',
]);

/** Rule 1: regional commands and oblast administrations. */
const REGIONAL_SOURCE = /^(https?:\/\/t\.me\/)?(pvk|kharkivoda)/i;

const csv = readFileSync(join(here, RAW), 'utf8').replace(/^\uFEFF/, '');
const sha = createHash('sha256').update(csv).digest('hex');
const rows = csvParse(csv);

const stats = { rows: rows.length, regional: 0, regionalLaunched: 0, outOfScope: 0, outLaunched: 0, hidden: 0, destroyedMissing: 0, mixed: 0 };
const capped: string[] = [];
const noCount: string[] = [];
const problems: string[] = [];

const num = (v: string | undefined): number | null => {
  if (v === undefined || v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** '2023-05-16 3:30' → '2023-05-16 03:30'; '' when the value is not a date (reported as a problem). */
function stamp(v: string | undefined): string {
  const m = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}):(\d{2})(?::\d{2})?)?$/.exec((v ?? '').trim());
  if (!m) return '';
  return m[2] === undefined ? m[1]! : `${m[1]} ${m[2].padStart(2, '0')}:${m[3]}`;
}

type Draft = { date: string; start: string; end: string; items: Map<string, Item> };
const reports = new Map<string, Draft>();
const models = new Map<string, ModelTotal>();
let hiddenFrom = '';

for (const [i, d] of rows.entries()) {
  const at = `row ${i + 2}`;
  const model = (d.model ?? '').trim();
  const source = (d.source ?? '').trim();
  const start = stamp(d.time_start);
  const end = stamp(d.time_end);
  const launchedRaw = num(d.launched);
  if (!model || !start || !end) {
    problems.push(`${at}: model, time_start and time_end are required`);
    continue;
  }
  if (launchedRaw === null) {
    // The report names the attack but gives no number (3 rows in Feb 2024, S-300 / Iskander-M) — nothing to add.
    noCount.push(`${at} ${end} ${model}`);
    continue;
  }
  if (REGIONAL_SOURCE.test(source)) {
    stats.regional++;
    stats.regionalLaunched += launchedRaw;
    continue;
  }
  const parts = model.split(' and ').map((p) => p.trim());
  if (parts.some((p) => OUT_OF_SCOPE.has(p))) {
    stats.outOfScope++;
    stats.outLaunched += launchedRaw;
    continue;
  }
  const unknown = parts.filter((p) => !(p in MODEL_CLASS));
  if (unknown.length) {
    problems.push(`${at}: unknown model "${unknown.join('", "')}" — add it to MODEL_CLASS or OUT_OF_SCOPE`);
    continue;
  }
  const classes = new Set(parts.map((p) => MODEL_CLASS[p]!));
  const cls: WeaponClass = classes.size === 1 ? [...classes][0]! : 'mixed';
  if (cls === 'mixed') stats.mixed++;

  const launched = Math.round(launchedRaw);
  const destroyedRaw = num(d.destroyed);
  let lost = Math.round(num(d.not_reach_goal) ?? 0);
  let note: ItemNote | undefined;
  if ((d.status_data ?? '').trim() === 'hidden') {
    note = 'launched-hidden';
    stats.hidden++;
    const day = start.slice(0, 10);
    if (!hiddenFrom || day < hiddenFrom) hiddenFrom = day;
  } else if (destroyedRaw === null) {
    note = 'destroyed-missing';
    stats.destroyedMissing++;
  }
  const destroyed = Math.round(destroyedRaw ?? 0);
  if (destroyed > launched) {
    problems.push(`${at}: destroyed ${destroyed} > launched ${launched}`);
    continue;
  }
  if (destroyed + lost > launched) {
    capped.push(`${at} ${end} ${model}: launched ${launched}, destroyed ${destroyed}, lost ${lost} → ${launched - destroyed}`);
    lost = launched - destroyed;
  }

  // One report = one Air Force post for one day (rows of a post can carry different time windows per model,
  // e.g. drones 17:00–09:30 and missiles 17:00–08:30 on 7 Sep 2025); the window is the union of the rows'.
  const date = end.slice(0, 10);
  const key = `${source}|${date}`;
  let rep = reports.get(key);
  if (!rep) reports.set(key, (rep = { date, start, end, items: new Map() }));
  if (start < rep.start) rep.start = start;
  if (end > rep.end) rep.end = end;
  const itemKey = `${cls}|${note ?? ''}`;
  const item = rep.items.get(itemKey);
  if (item) {
    item.launched += launched;
    item.destroyed += destroyed;
    item.lost += lost;
  } else {
    rep.items.set(itemKey, { class: cls, launched, destroyed, lost, ...(note ? { note } : {}) });
  }

  const m = models.get(model) ?? { model, class: cls, years: {} };
  const y = date.slice(0, 4);
  m.years[y] = (m.years[y] ?? 0) + launched;
  models.set(model, m);
}

if (problems.length) {
  console.error(`✗ prep air-attacks-on-ukraine — ${problems.length} problem(s):`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}

const CLASS_ORDER: WeaponClass[] = ['cruise', 'ballistic', 'antiship', 'other', 'mixed', 'drones'];
const sorted: Report[] = [...reports.values()]
  .map((r) => ({
    date: r.date,
    start: r.start,
    end: r.end,
    items: [...r.items.values()].sort(
      (a, b) => CLASS_ORDER.indexOf(a.class) - CLASS_ORDER.indexOf(b.class) || (a.note ?? '').localeCompare(b.note ?? ''),
    ),
  }))
  .sort((a, b) => (a.date + ' ' + a.start < b.date + ' ' + b.start ? -1 : a.date + ' ' + a.start > b.date + ' ' + b.start ? 1 : 0));

const dataset: AttacksDataset = {
  unit: 'weapons',
  first: sorted[0]!.date,
  last: sorted[sorted.length - 1]!.date,
  hiddenFrom: hiddenFrom || sorted[sorted.length - 1]!.date,
  reports: sorted,
  models: [...models.values()].sort(
    (a, b) => CLASS_ORDER.indexOf(a.class) - CLASS_ORDER.indexOf(b.class) || a.model.localeCompare(b.model),
  ),
};
parseAttacks(JSON.parse(JSON.stringify(dataset)));

// ── Civilians ────────────────────────────────────────────────────────────────────────────────────────
const civ = csvParse(readFileSync(join(here, 'hrmmu-civilians.csv'), 'utf8').replace(/^\uFEFF/, ''));
const pair = (k: string | undefined, i: string | undefined) => {
  const killed = num(k);
  const injured = num(i);
  if (killed === null && injured === null) return undefined;
  if (killed === null || injured === null) throw new Error(`hrmmu-civilians.csv: killed and injured come in pairs (${k}, ${i})`);
  return { killed, injured };
};
const civilians: CiviliansDataset = {
  unit: 'persons',
  years: civ.map((d): CivilianYear => {
    const out: CivilianYear = {
      year: Number(d.year),
      fromMonth: Number(d.from_month),
      toMonth: Number(d.to_month),
      total: pair(d.total_killed, d.total_injured)!,
      source: d.source ?? '',
    };
    const lr = pair(d.long_range_killed, d.long_range_injured);
    const sd = pair(d.short_drones_killed, d.short_drones_injured);
    if (lr) out.longRange = lr;
    if (sd) out.shortDrones = sd;
    if (d.note) out.note = d.note as 'monthly-sum';
    return out;
  }),
};
parseCivilians(JSON.parse(JSON.stringify(civilians)));

// ── Write (one report / model per line: readable diffs on refresh) ───────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true });
const body = [
  '{',
  `  "unit": ${JSON.stringify(dataset.unit)},`,
  `  "first": ${JSON.stringify(dataset.first)},`,
  `  "last": ${JSON.stringify(dataset.last)},`,
  `  "hiddenFrom": ${JSON.stringify(dataset.hiddenFrom)},`,
  '  "reports": [',
  dataset.reports.map((r) => `    ${JSON.stringify(r, (k, v: unknown) => (k === 'lost' && v === 0 ? undefined : v))}`).join(',\n'),
  '  ],',
  '  "models": [',
  dataset.models.map((m) => `    ${JSON.stringify(m)}`).join(',\n'),
  '  ]',
  '}',
  '',
].join('\n');
writeFileSync(join(OUT_DIR, DATA_FILE), body);
writeFileSync(
  join(OUT_DIR, CIVILIANS_FILE),
  ['{', '  "unit": "persons",', '  "years": [', civilians.years.map((y) => `    ${JSON.stringify(y)}`).join(',\n'), '  ]', '}', ''].join('\n'),
);

// ── Report ───────────────────────────────────────────────────────────────────────────────────────────
const byYear = new Map<string, Record<string, number>>();
for (const r of dataset.reports) {
  const y = r.date.slice(0, 4);
  const acc = byYear.get(y) ?? {};
  for (const it of r.items) acc[it.class] = (acc[it.class] ?? 0) + it.launched;
  byYear.set(y, acc);
}
console.log(`✓ ${RAW} sha256 ${sha}`);
console.log(`  ${stats.rows} rows · regional dropped ${stats.regional} (${stats.regionalLaunched} launched) · out of scope ${stats.outOfScope} (${stats.outLaunched} launched)`);
console.log(`  mixed rows ${stats.mixed} · hidden ${stats.hidden} (from ${dataset.hiddenFrom}) · destroyed missing ${stats.destroyedMissing}`);
for (const c of capped) console.log(`  capped: ${c}`);
for (const c of noCount) console.log(`  no number launched (skipped): ${c}`);
console.log(`  ${dataset.reports.length} reports ${dataset.first} … ${dataset.last} · ${dataset.models.length} models`);
for (const [y, acc] of byYear) console.log(`  ${y}: ${CLASS_ORDER.map((c) => `${c} ${acc[c] ?? 0}`).join(' · ')}`);
console.log(`✓ wrote public/data/air-attacks-on-ukraine/${DATA_FILE} and ${CIVILIANS_FILE}`);
