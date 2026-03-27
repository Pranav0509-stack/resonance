import { defineConfig } from 'vite';
export default defineConfig({
  root: '.', build: { outDir: 'dist' },
  server: { port: 5557, host: true },
  optimizeDeps: { include: ['acorn', 'acorn-walk'] }
});
