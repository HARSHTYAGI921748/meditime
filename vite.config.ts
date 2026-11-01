import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'www',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    host: true,
  },
  optimizeDeps: {
    exclude: ['tesseract.js'],
  },
});
