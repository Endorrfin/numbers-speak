/*
 * sync-flags.ts — copies the 4:3 SVG flags of `flag-icons` (MIT) into public/flags/4x3/ (gitignored).
 * predev / prebuild run it. Why files, not emoji: Windows does not render flag emoji. Why public/, not
 * bundled: each flag is fetched only when a chart shows it and is cached by the browser; the JS bundle
 * does not grow. Skips files that are already up to date, so it is cheap on every dev start.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { ROOT } from './lib/viz-folders';

const require = createRequire(import.meta.url);
const pkgDir = dirname(require.resolve('flag-icons/package.json'));
const from = join(pkgDir, 'flags/4x3');
const to = join(ROOT, 'public/flags/4x3');

mkdirSync(to, { recursive: true });
let copied = 0;
const files = readdirSync(from).filter((f) => /^[a-z]{2}\.svg$/.test(f)); // ISO alpha-2 only
for (const f of files) {
  const src = join(from, f);
  const dst = join(to, f);
  if (existsSync(dst) && statSync(dst).size === statSync(src).size) continue;
  copyFileSync(src, dst);
  copied++;
}
console.log(`✓ sync:flags — ${files.length} flags (${copied} copied).`);
