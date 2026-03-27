import { defineConfig } from 'vite';
export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        scanner: 'scanner.html',
      },
    },
  },
  server: { port: 5557, host: true },
  optimizeDeps: { include: ['acorn', 'acorn-walk'] }
});
