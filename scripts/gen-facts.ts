/*
 * gen-facts.ts — CHANGED (S3-cp): writes public/data/country-facts.json (the country profile, #/c/ua) from
 * src/viz/<id>/facts.ts run on each entry's real data. Run: `npm run gen:facts` (predev / prebuild / verify and a
 * successful `npm run prep` run it for you). The output is committed; `npm run check:catalog` fails when it is stale.
 */
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { readGenerated } from './gen-catalog';
import { FACTS_BUDGET_GZIP, generateFacts, gzipSize } from './lib/facts';

async function main(): Promise<void> {
  const { path, source, ids } = await generateFacts();
  const size = `${(gzipSize(source) / 1024).toFixed(1)} kB gzip of ${FACTS_BUDGET_GZIP / 1024} kB`;
  if (readGenerated(path) === source) {
    console.log(`✓ gen:facts — up to date (${ids.length} tables, ${size}).`);
    return;
  }
  writeFileSync(path, source);
  console.log(`✓ gen:facts — wrote public/data/country-facts.json (${ids.length} tables, ${size}).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e: unknown) => {
    console.error(`✗ gen:facts — ${(e as Error).message}`);
    process.exit(1);
  });
}
