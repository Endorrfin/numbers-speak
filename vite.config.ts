import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Standard §4.7: base './' + hash routing + .nojekyll → works under any GitHub Pages sub-path
// (https://endorrfin.github.io/numbers-speak/).
// manualChunks: React and D3 each get one stable vendor chunk, so content-only releases
// (a new visualization every month) never invalidate the cached libraries.
export default defineConfig({
  base: './',
  plugins: [react()],
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
