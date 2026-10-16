import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      // The game, plus a standalone 3D art preview page.
      input: {
        main: resolve(__dirname, 'index.html'),
        preview3d: resolve(__dirname, 'preview3d.html'),
      },
    },
  },
  test: { globals: true, environment: 'node' },
});
