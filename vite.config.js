import { defineConfig } from 'vite';

export default defineConfig({
  // Relative paths keep the build portable when GitHub Pages serves it from
  // https://<user>.github.io/<repository>/ instead of the domain root.
  base: './',
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
});
