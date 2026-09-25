/*
 * gen-previews.ts — CHANGED (S3-th): writes src/catalog/previews.generated.json (the gallery card previews)
 * from src/viz/<id>/preview.ts run on each entry's real data. Run: `npm run gen:previews` (predev /
 * prebuild run it for you). The output is committed; `npm run check:catalog` fails when it is stale.
 */
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { readGenerated } from './gen-catalog';
import { PREVIEWS_BUDGET_GZIP, generatePreviews, gzipSize } from './lib/previews';

async function main(): Promise<void> {
  const { path, source, ids } = await generatePreviews();
  const size = `${(gzipSize(source) / 1024).toFixed(1)} kB gzip of ${PREVIEWS_BUDGET_GZIP / 1024} kB`;
  if (readGenerated(path) === source) {
    console.log(`✓ gen:previews — up to date (${ids.length} previews, ${size}).`);
    return;
  }
  writeFileSync(path, source);
  console.log(`✓ gen:previews — wrote src/catalog/previews.generated.json (${ids.length} previews, ${size}).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e: unknown) => {
    console.error(`✗ gen:previews — ${(e as Error).message}`);
    process.exit(1);
  });
}
