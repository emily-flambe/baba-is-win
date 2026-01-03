import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte({ configFile: '../svelte.config.js' })],
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.0.0'),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4321',
        changeOrigin: true,
      },
    },
  },
});
