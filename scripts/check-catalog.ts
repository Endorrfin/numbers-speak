/*
 * check-catalog.ts — staleness gate for the generated catalog. Run: `npm run check:catalog`.
 * Regenerates in memory and compares with the committed file, so a new visualization folder that
 * forgot `npm run gen:catalog` fails CI instead of silently missing from the gallery.
 * CHANGED (S3-cl): it also fails when a `published` entry has no CHANGELOG.md line that links it
 * (`…#/v/<id>`, PLAN A8 step 4) — that manual step was skipped for four entries on 2026-09-22.
 * All failures are reported in one run.
 * CHANGED (S3-th): card previews — src/catalog/previews.generated.json must match src/viz/<id>/preview.ts,
 * every published entry needs a preview, and all previews together stay within the gzip budget.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { VizMeta } from '../src/catalog/types';
import { generate, readGenerated } from './gen-catalog';
import { CHANGELOG_PATH, missingFromChangelog } from './lib/changelog';
import { PREVIEWS_BUDGET_GZIP, generatePreviews, gzipSize } from './lib/previews'; // CHANGED (S3-th)
import { listVizFolders } from './lib/viz-folders';

// CHANGED (S3-cl): failures are collected and reported together.
const errors: string[] = [];

let result: { path: string; source: string };
try {
  result = generate();
} catch (e) {
  console.error(`✗ check:catalog — ${(e as Error).message}`);
  process.exit(1);
}

const onDisk = readGenerated(result.path);
if (onDisk !== result.source) {
  const a = onDisk.split('\n');
  const b = result.source.split('\n');
  const found = a.findIndex((line, n) => line !== b[n]);
  const line = (found === -1 ? Math.min(a.length, b.length) : found) + 1;
  const where = onDisk === '' ? 'is MISSING' : `is STALE (first difference at line ${line})`;
  errors.push(`src/catalog/catalog.generated.ts ${where}.\n  Fix: npm run gen:catalog`); // CHANGED (S3-cl)
}

// CHANGED (S3-cl): every published entry needs a CHANGELOG line that links its page.
const published: string[] = [];
for (const { dir } of listVizFolders()) {
  const { default: meta } = (await import(pathToFileURL(join(dir, 'meta.ts')).href)) as { default: VizMeta };
  if (meta.status === 'published') published.push(meta.id);
}
const missing = missingFromChangelog(published, readFileSync(CHANGELOG_PATH, 'utf8'));
if (missing.length > 0) {
  errors.push(
    `CHANGELOG.md has no line for these published entries: ${missing.join(', ')}.\n` +
      '  Fix: add "- **New:** [Title EN / Title UA](https://endorrfin.github.io/numbers-speak/#/v/<id>) — …"' +
      ' under its release date (newest first).',
  );
}

// CHANGED (S3-th): card previews — fresh, complete for published entries, within budget.
try {
  const previews = await generatePreviews();
  const previewsOnDisk = readGenerated(previews.path);
  if (previewsOnDisk !== previews.source) {
    const where = previewsOnDisk === '' ? 'is MISSING' : 'is STALE';
    errors.push(`src/catalog/previews.generated.json ${where}.\n  Fix: npm run gen:previews`);
  }
  const withoutPreview = published.filter((id) => !previews.ids.includes(id));
  if (withoutPreview.length > 0) {
    errors.push(
      `These published entries have no card preview: ${withoutPreview.join(', ')}.\n` +
        '  Fix: add src/viz/<id>/preview.ts (see src/catalog/preview.ts), then npm run gen:previews',
    );
  }
  const size = gzipSize(previews.source);
  if (size > PREVIEWS_BUDGET_GZIP) {
    errors.push(`card previews are ${size} B gzip, over the ${PREVIEWS_BUDGET_GZIP} B budget.`);
  }
} catch (e) {
  errors.push(`card previews could not be built — ${(e as Error).message}`);
}

// CHANGED (S3-cl): report every failure, then exit.
if (errors.length > 0) {
  for (const message of errors) {
    console.error(`✗ check:catalog — ${message}`);
  }
  process.exit(1);
}
console.log(
  '✓ check:catalog — the generated catalog and card previews match src/viz; every published entry has a preview' +
    ' and a CHANGELOG.md line.',
); // CHANGED (S3-th)
