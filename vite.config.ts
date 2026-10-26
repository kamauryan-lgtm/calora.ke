import { defineConfig } from 'vite';

// CALORA Vite configuration
export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: false
  },
  server: {
    port: 8000,
    host: true
  }
});
