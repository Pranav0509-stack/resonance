import { defineConfig } from 'vite';
export default defineConfig(({ command }) => ({
  root: '.',
  base: command === 'build' ? '/resonance/' : '/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        scanner: 'scanner.html',
        learn: 'learn.html',
      },
    },
  },
  server: { port: 5557, host: true },
  optimizeDeps: { include: ['acorn', 'acorn-walk'] }
}));
