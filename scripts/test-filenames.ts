// test-filenames.ts — guards against module names that collide on case-insensitive file systems.
// macOS (APFS) and Windows resolve './RankedBar' to 'rankedBar.ts' when it exists, while Linux CI
// does not — so `RankedBar.tsx` next to `rankedBar.ts` passed CI and broke `tsc` on the owner's Mac (S2).
// Rule: within one folder, no two files may share a module name (name without extension) ignoring case.
import { readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { ROOT } from './lib/viz-folders';

const DIRS = ['src', 'scripts', 'data-raw'];
const problems: string[] = [];
let files = 0;

function walk(dir: string): void {
  const seen = new Map<string, string>();
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      walk(path);
      continue;
    }
    files++;
    const key = name.slice(0, name.length - extname(name).length).toLowerCase();
    const other = seen.get(key);
    if (other && other !== name) problems.push(`${relative(ROOT, dir)}/: '${other}' and '${name}' collide ignoring case`);
    seen.set(key, name);
  }
}
for (const d of DIRS) walk(join(ROOT, d));

if (problems.length) {
  console.error(`✖ filenames: ${problems.length} case collision(s):\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log(`✓ filenames: ${files} files, no case-insensitive module collisions.`);
