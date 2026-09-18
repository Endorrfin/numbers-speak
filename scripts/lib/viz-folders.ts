// scripts/lib/viz-folders.ts — the one place that knows how visualization folders are laid out.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export const ROOT = resolve(here, '../..');
export const VIZ_DIR = join(ROOT, 'src/viz');
export const GENERATED_PATH = join(ROOT, 'src/catalog/catalog.generated.ts');
export const PUBLIC_DATA_DIR = join(ROOT, 'public/data');

export const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type VizFolder = { id: string; dir: string };

/**
 * Every folder in src/viz, sorted. Throws with a readable message when a folder is incomplete or
 * badly named — a half-created visualization must fail loudly, not disappear from the catalog.
 */
export function listVizFolders(): VizFolder[] {
  if (!existsSync(VIZ_DIR)) return [];
  const problems: string[] = [];
  const folders: VizFolder[] = [];
  for (const name of readdirSync(VIZ_DIR).sort()) {
    const dir = join(VIZ_DIR, name);
    if (!statSync(dir).isDirectory()) {
      problems.push(`src/viz/${name}: only folders belong in src/viz`);
      continue;
    }
    if (!ID_PATTERN.test(name)) problems.push(`src/viz/${name}: folder name must be kebab-case`);
    for (const file of ['meta.ts', 'index.tsx']) {
      if (!existsSync(join(dir, file))) problems.push(`src/viz/${name}: missing ${file}`);
    }
    folders.push({ id: name, dir });
  }
  if (problems.length) {
    throw new Error(`Invalid visualization folders:\n  - ${problems.join('\n  - ')}`);
  }
  return folders;
}
