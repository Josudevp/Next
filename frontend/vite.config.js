import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  server: {
    // ── Proxy para desarrollo local ──────────────────────────────────────────
    // Redirige /api/* al backend en localhost:5000.
    // En producción (Render), VITE_API_URL apunta al backend real y
    // el frontend llama directamente a esa URL; este proxy solo aplica en local.
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },

  build: {
    // Genera sourcemaps solo en local para no exponer código en producción
    sourcemap: false,
    // Avisa si algún chunk supera 1MB
    chunkSizeWarningLimit: 1000,
  },
});