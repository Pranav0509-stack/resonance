import { defineConfig } from 'vite';
export default defineConfig(({ command }) => ({
  root: '.',
  base: command === 'build' ? '/resonance/' : '/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
      },
    },
  },
  server: { port: parseInt(process.env.PORT) || 5557, host: true },
  optimizeDeps: { include: ['acorn', 'acorn-walk'] }
}));
