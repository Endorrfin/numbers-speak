import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Standard §4.7: base './' + hash routing + .nojekyll → works under any GitHub Pages sub-path
// (https://endorrfin.github.io/numbers-speak/).
// manualChunks: React and D3 each get one stable vendor chunk, so content-only releases
// (a new visualization every month) never invalidate the cached libraries.
export default defineConfig({
  base: './',
  plugins: [react()],
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
