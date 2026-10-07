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
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }
          if (/node_modules\/(d3|d3-[a-z-]+|internmap|delaunator|robust-predicates)\//.test(id)) {
            return 'd3-vendor';
          }
        },
      },
    },
  },
});
