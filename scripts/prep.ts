/*
 * prep.ts — runs one dataset's prep script: `npm run prep -- <id>` → data-raw/<id>/prep.ts.
 * Prep scripts turn raw files into public/data/<id>/ once, at authoring time (CLAUDE.md §4 data rules).
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ID_PATTERN, ROOT } from './lib/viz-folders';

const id = process.argv[2] ?? '';
const script = join(ROOT, 'data-raw', id, 'prep.ts');
if (!ID_PATTERN.test(id) || !existsSync(script)) {
  console.error(`Usage: npm run prep -- <id>   (expects data-raw/<id>/prep.ts; got "${id}")`);
  process.exit(1);
}
const r = spawnSync(process.execPath, ['--import', 'tsx', script], { stdio: 'inherit' });
process.exit(r.status ?? 1);
