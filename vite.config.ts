import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

/** Version shown in problem reports: the date and the git commit. */
function appVersion(): string {
  const day = new Date().toISOString().slice(0, 10);
  try {
    return `${day} ${execSync('git rev-parse --short HEAD').toString().trim()}`;
  } catch {
    return day;
  }
}

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(appVersion()) },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      // The game, plus a standalone 3D art preview page.
      input: {
        main: resolve(__dirname, 'index.html'),
        preview3d: resolve(__dirname, 'preview3d.html'),
        preview2d: resolve(__dirname, 'preview2d.html'),
      },
    },
  },
  test: { globals: true, environment: 'node' },
});
