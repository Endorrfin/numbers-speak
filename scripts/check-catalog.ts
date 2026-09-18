/*
 * check-catalog.ts — staleness gate for the generated catalog. Run: `npm run check:catalog`.
 * Regenerates in memory and compares with the committed file, so a new visualization folder that
 * forgot `npm run gen:catalog` fails CI instead of silently missing from the gallery.
 */
import { generate, readGenerated } from './gen-catalog';

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
  console.error(`✗ check:catalog — src/catalog/catalog.generated.ts ${where}.\n  Fix: npm run gen:catalog`);
  process.exit(1);
}
console.log('✓ check:catalog — the generated catalog matches src/viz.');
