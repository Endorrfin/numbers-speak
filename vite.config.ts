import { spawn } from 'node:child_process';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// CHANGED (S3-lz): the gallery's cards are literals in catalog.generated.ts (gen-catalog evaluates each meta.ts), so
// in `npm run dev` an edited manifest regenerates the catalog — the card updates as it did when meta.ts was imported.
// One run at a time; edits during a run queue one more. A failed run (half-created folder) only prints its error.
function regenerateCatalogOnMetaChange(): Plugin {
  const META = /[\\/]src[\\/]viz[\\/][^\\/]+[\\/]meta\.ts$/;
  let running = false;
  let again = false;
  const run = (): void => {
    if (running) {
      again = true;
      return;
    }
    running = true;
    const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/gen-catalog.ts'], { stdio: 'inherit' });
    child.on('exit', () => {
      running = false;
      if (again) {
        again = false;
        run();
      }
    });
  };
  return {
    name: 'numbers-speak:gen-catalog',
    apply: 'serve',
    configureServer(server) {
      for (const event of ['add', 'change', 'unlink'] as const) {
        server.watcher.on(event, (file: string) => {
          if (META.test(file)) run();
        });
      }
    },
  };
}

// Standard §4.7: base './' + hash routing + .nojekyll → works under any GitHub Pages sub-path
// (https://endorrfin.github.io/numbers-speak/).
// manualChunks: React and D3 each get one stable vendor chunk, so content-only releases
// (a new visualization every month) never invalidate the cached libraries.
// CHANGED (S3-ai1): d3 modules only one page needs (brush, zoom and the drag they share; hierarchy from S3-ai2) stay out of
// the shared d3-vendor chunk, which every chart page loads. They are imported from their own packages (not the `d3`
// umbrella) and left unassigned, so Rolldown puts them in the chunk of the page that imports them. Tried and dropped:
// unassigned but imported through the umbrella → they joined a chunk every page loads; a manual 'd3-interact' chunk →
// Rolldown pulled d3-selection & co. into it, and every chart page loaded it. scripts/test-lanes.ts checks the rule and
// the imports; the built chunks are checked by hand (CLAUDE.md §14, S3-ai1).
export const PAGE_ONLY_D3 = ['d3-brush', 'd3-zoom', 'd3-drag', 'd3-hierarchy'];
const D3_UMBRELLA = /node_modules[\\/]d3[\\/]/;

/** The vendor chunk a module belongs to, or undefined (Rolldown places it with its importers). Exported for tests. */
export function vendorChunk(id: string): string | undefined {
  if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
    return 'react-vendor';
  }
  const d3 = /node_modules\/(d3|d3-[a-z-]+|internmap|delaunator|robust-predicates)\//.exec(id);
  if (d3 && !PAGE_ONLY_D3.includes(d3[1]!)) {
    return 'd3-vendor';
  }
  return undefined;
}

export default defineConfig({
  base: './',
  plugins: [react(), regenerateCatalogOnMetaChange()], // CHANGED (S3-lz)
  // CHANGED (S2): scan only the app entry for dependency pre-bundling. By default Vite crawls every
  // *.html under the root, including the gitignored legacy pages in _examples/ (broken imports there
  // made `npm run dev` print "Failed to run dependency scan").
  optimizeDeps: {
    entries: ['index.html'],
  },
  server: {
    // CHANGED (S2): legacy pages, raw data and scratch builds never trigger a reload.
    watch: { ignored: ['**/_examples/**', '**/data-raw/**', '**/dist-*/**'] },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      // CHANGED (S3-ai1): the `d3` umbrella only re-exports; without side effects its import of a module nobody uses
      // through it is pruned, so d3-brush / d3-zoom are placed by their real importers (see PAGE_ONLY_D3 above).
      treeshake: { moduleSideEffects: (id: string) => !D3_UMBRELLA.test(id) },
      output: {
        manualChunks: vendorChunk, // CHANGED (S3-ai1)
      },
    },
  },
});
