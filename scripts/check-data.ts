/*
 * check-data.ts — manifest and data-file integrity gate (standard §3.8). Run: `npm run check:data`.
 * Every rule here protects a promise the site makes: bilingual text, traceable sources, stable URLs.
 */
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOG } from '../src/catalog';
import { CHART_KINDS, GEOS, RUBRIC_IDS, STATUSES } from '../src/catalog/types';
import type { Localized, VizMeta } from '../src/catalog/types';
import { ID_PATTERN, PUBLIC_DATA_DIR, listVizFolders } from './lib/viz-folders';

const errors: string[] = [];
const err = (ok: unknown, msg: string): void => {
  if (!ok) errors.push(msg);
};

const today = new Date().toISOString().slice(0, 10);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** A real calendar date in YYYY-MM-DD (2026-02-30 is rejected). */
function isDate(s: string): boolean {
  if (!DATE.test(s)) return false;
  const ms = Date.parse(`${s}T00:00:00Z`);
  return !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === s;
}
const isHttps = (u: string): boolean => {
  try {
    return new URL(u).protocol === 'https:';
  } catch {
    return false;
  }
};
const SAFE_FILE = /^[a-z0-9][a-z0-9._-]*\.(json|csv|tsv)$/;
const TAG = /^[\p{Ll}\p{N}][\p{Ll}\p{N} .&'’-]*$/u;
const D3_MODULE = /^d3(-[a-z]+)*$/;

function loc(value: Localized | undefined, where: string): void {
  if (!value || typeof value !== 'object') {
    errors.push(`${where}: Localized {en, uk} expected`);
    return;
  }
  err(value.en?.trim(), `${where}: empty EN`);
  err(value.uk?.trim(), `${where}: empty UK`);
}

function checkMeta(m: VizMeta): void {
  const at = `viz ${m.id}`;
  err(ID_PATTERN.test(m.id), `${at}: id must be kebab-case`);
  loc(m.title, `${at}.title`);
  loc(m.subtitle, `${at}.subtitle`);
  loc(m.description, `${at}.description`);

  err(m.rubrics.length > 0, `${at}: rubrics must not be empty`);
  err(new Set(m.rubrics).size === m.rubrics.length, `${at}: duplicate rubrics`);
  for (const r of m.rubrics) err((RUBRIC_IDS as readonly string[]).includes(r), `${at}: unknown rubric '${r}'`);
  err((CHART_KINDS as readonly string[]).includes(m.chart), `${at}: unknown chart '${m.chart}'`);
  err((GEOS as readonly string[]).includes(m.geo), `${at}: unknown geo '${m.geo}'`);
  err((STATUSES as readonly string[]).includes(m.status), `${at}: unknown status '${m.status}'`);

  if (m.period) {
    const { from, to } = m.period;
    err(Number.isInteger(from) && Number.isInteger(to), `${at}: period years must be integers`);
    err(from <= to, `${at}: period.from > period.to`);
    err(from >= 1000 && to <= 2100, `${at}: period out of range`);
  }

  err(new Set(m.tags).size === m.tags.length, `${at}: duplicate tags`);
  for (const tag of m.tags) err(TAG.test(tag), `${at}: tag '${tag}' must be lower-case words`);

  if (m.status !== 'draft') err(m.sources.length > 0, `${at}: '${m.status}' needs at least one source`);
  for (const s of m.sources) {
    err(s.title.trim(), `${at}: source without a title`);
    err(isHttps(s.url), `${at}: source url must be https — ${s.url}`);
    err(isDate(s.retrieved), `${at}: source.retrieved must be YYYY-MM-DD — ${s.retrieved}`);
    err(s.retrieved <= today, `${at}: source.retrieved is in the future — ${s.retrieved}`);
  }
  err(new Set(m.sources.map((s) => s.url)).size === m.sources.length, `${at}: duplicate source urls`);

  if (m.origin.kind === 'adapted') {
    err(m.origin.title.trim(), `${at}: adapted origin needs a title`);
    err(isHttps(m.origin.url), `${at}: adapted origin url must be https`);
    err(m.origin.license.trim(), `${at}: adapted origin needs a licence`);
  }

  if (m.status === 'published') err(m.data.length > 0, `${at}: published entries must ship their data files`);
  for (const file of m.data) {
    err(SAFE_FILE.test(file), `${at}: data file name '${file}' is not allowed (lower-case .json/.csv/.tsv)`);
    const path = join(PUBLIC_DATA_DIR, m.id, file);
    err(existsSync(path) && statSync(path).isFile(), `${at}: missing public/data/${m.id}/${file}`);
  }

  err(isDate(m.added), `${at}: added must be YYYY-MM-DD`);
  err(isDate(m.updated), `${at}: updated must be YYYY-MM-DD`);
  err(m.added <= m.updated, `${at}: updated is earlier than added`);
  err(m.updated <= today, `${at}: updated is in the future`);

  for (const mod of m.d3Modules ?? []) err(D3_MODULE.test(mod), `${at}: '${mod}' is not a D3 module name`);
}

// Folder names ↔ manifest ids (the generated catalog imports folders in sorted order).
let folders: string[] = [];
try {
  folders = listVizFolders().map((f) => f.id);
} catch (e) {
  errors.push((e as Error).message);
}
const ids = CATALOG.map((m) => m.id);
err(new Set(ids).size === ids.length, `duplicate visualization ids: ${ids.join(', ')}`);
err(
  folders.length === ids.length && folders.every((f, i) => f === ids[i]),
  `manifest ids must equal their folder names (folders: ${folders.join(', ')} · ids: ${ids.join(', ')})`,
);

for (const m of CATALOG) checkMeta(m);

if (errors.length) {
  console.error(`✗ check:data — ${errors.length} problem(s):`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
const byStatus = STATUSES.map((s) => `${CATALOG.filter((m) => m.status === s).length} ${s}`).join(', ');
console.log(`✓ check:data — ${CATALOG.length} visualization(s) (${byStatus}); bilingual, sourced, files present.`);
