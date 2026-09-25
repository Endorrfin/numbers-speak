// lib/previews.ts — CHANGED (S3-th): builds src/catalog/previews.generated.json from src/viz/<id>/preview.ts.
// Shared by gen-previews (writes), check:catalog (staleness, coverage, budget) and the tests.
// Deterministic: fixed key order, numbers rounded (drawn-only marks to 3 significant digits — enough for
// a 300 px card; printed numbers — key figures and row values — to 6), so the same data gives the same
// bytes on every machine.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import type { CardPreview, KeyFigure, LabelArg, PreviewMarks, PreviewNum, PreviewSource } from '../../src/catalog/preview';
import { parseCardPreview } from '../../src/catalog/preview';
import { PUBLIC_DATA_DIR, ROOT, listVizFolders } from './viz-folders';

export const PREVIEWS_PATH = join(ROOT, 'src/catalog/previews.generated.json');
/** All previews together, gzip-compressed (they ship in the initial bundle). */
export const PREVIEWS_BUDGET_GZIP = 12 * 1024;

type PreviewModule = { previewSource: PreviewSource<unknown>; preview: (dataset: unknown) => CardPreview };

const sig = (v: number, digits: number): number => (v === 0 ? 0 : Number(v.toPrecision(digits)));
const m3 = (v: number): number => sig(v, 3);

function roundNum(n: PreviewNum): PreviewNum {
  return { value: sig(n.value, 6), format: n.format };
}
function roundArg(a: LabelArg): LabelArg {
  return a.kind === 'num' ? { ...a, value: sig(a.value, 6) } : a;
}
function roundKey(k: KeyFigure): KeyFigure {
  const value = Array.isArray(k.value) ? ([roundNum(k.value[0]!), roundNum(k.value[1]!)] as const) : roundNum(k.value as PreviewNum);
  const out: KeyFigure = { value, label: k.label };
  if (k.args) out.args = Object.fromEntries(Object.entries(k.args).map(([name, a]) => [name, roundArg(a)]));
  return out;
}
function roundMarks(m: PreviewMarks): PreviewMarks {
  switch (m.kind) {
    case 'rows':
      // Row values are printed on the card, so they keep 6 digits; only the drawn-only marks get 3.
      return { ...m, rows: m.rows.map((r) => ({ ...r, value: sig(r.value, 6) })), domain: [sig(m.domain[0], 6), sig(m.domain[1], 6)] };
    case 'butterfly':
      return { ...m, rows: m.rows.map((r) => ({ ...r, left: m3(r.left), right: m3(r.right) })), max: m3(m.max) };
    case 'series':
      return { ...m, lines: m.lines.map((l) => ({ ...l, values: l.values.map((v) => (v === null ? null : m3(v))) })), max: m3(m.max) };
    case 'columns':
      return { ...m, stacks: m.stacks.map((s) => s.map(m3)), max: m3(m.max) };
    case 'grid':
      return m;
  }
}

/** Runs one entry's preview on its real data file and validates the result. */
export async function buildPreview(id: string, dir: string): Promise<CardPreview> {
  const mod = (await import(pathToFileURL(join(dir, 'preview.ts')).href)) as PreviewModule;
  const { file, parse } = mod.previewSource;
  const where = `public/data/${id}/${file}`;
  const dataset = parse(JSON.parse(readFileSync(join(PUBLIC_DATA_DIR, id, file), 'utf8')), where);
  const raw = mod.preview(dataset);
  // Validate before and after rounding: the contract holds for the function and for the file.
  parseCardPreview(raw, `src/viz/${id}/preview.ts`);
  const rounded: CardPreview = { key: roundKey(raw.key), marks: roundMarks(raw.marks) };
  return parseCardPreview(rounded, `previews.generated.json#${id}`);
}

/** Every folder that has a preview.ts, in id order. */
export const previewFolders = () => listVizFolders().filter((f) => existsSync(join(f.dir, 'preview.ts')));

export async function generatePreviews(): Promise<{ path: string; source: string; ids: string[] }> {
  const entries: string[] = [];
  const ids: string[] = [];
  for (const { id, dir } of previewFolders()) {
    const p = await buildPreview(id, dir);
    entries.push(`  ${JSON.stringify(id)}: ${JSON.stringify(p)}`);
    ids.push(id);
  }
  return { path: PREVIEWS_PATH, source: `{\n${entries.join(',\n')}\n}\n`, ids };
}

export const gzipSize = (source: string): number => gzipSync(Buffer.from(source, 'utf8'), { level: 9 }).length;
