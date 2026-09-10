import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // For relative paths in production build
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
