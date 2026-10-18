import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  preview: { port: 4173 },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Charts (recharts + d3) are only used in the admin — keep them in their own lazily-loaded chunk.
        // React/Redux/motion are left to Rollup: hand-splitting them caused init-order crashes.
        manualChunks: (id) => (/node_modules[\/](recharts|d3-|victory-)/.test(id) ? 'charts' : undefined),
      },
    },
  },
});
