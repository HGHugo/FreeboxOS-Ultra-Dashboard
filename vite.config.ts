import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: parseInt(process.env.VITE_PORT || '3000', 10),
    // SECURITY: dev server (and its /api proxy) stays on localhost unless VITE_HOST is set
    host: process.env.VITE_HOST || '127.0.0.1',
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.PORT || '3001'}`,
        changeOrigin: true
      },
      '/ws': {
        target: `ws://localhost:${process.env.PORT || '3001'}`,
        ws: true,
        changeOrigin: true
      }
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});