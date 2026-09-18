/*
 * run-tests.ts — auto-discovering engine-test runner (standard §4.6). `npm test` runs this.
 * It finds every `scripts/test-*.ts`, runs each in its OWN process (so one failing test — which
 * calls process.exit(1) — doesn't abort the rest), streams their output, and exits non-zero if any
 * failed. Add a sim engine + a `scripts/test-<name>.ts` and it's picked up automatically — no
 * package.json edit. Exits 0 (green) when a fresh guide has no engine tests yet.
 *
 * From ../_standard/templates/tier1-spa. Run via tsx.
 */
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const tests = readdirSync(here)
  .filter((f) => /^test-.*\.ts$/.test(f))
  .sort();

if (tests.length === 0) {
  console.log("— engine tests — none yet (add a pure engine in src/lib + scripts/test-<name>.ts, standard §4.5). Skipping.");
  process.exit(0);
}

let failed = 0;
for (const f of tests) {
  // `node --import tsx <file>` doesn't depend on the tsx bin being on PATH — only the package.
  const r = spawnSync(process.execPath, ["--import", "tsx", join(here, f)], { stdio: "inherit" });
  if (r.status !== 0) failed++;
}

console.log(`\n— engine tests — ${tests.length} file(s), ${failed} failed.`);
process.exit(failed > 0 ? 1 : 0);
