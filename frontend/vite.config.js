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
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },

  build: {
    sourcemap: false,
    // Target: navegadores modernos con amplio soporte (~2019+).
    // Evita polyfills innecesarios que inflaban el bundle.
    target: ['es2019', 'chrome79', 'firefox78', 'safari13', 'edge79'],
    chunkSizeWarningLimit: 600,
    cssCodeSplit: true,       // CSS por ruta: solo carga lo que necesita cada página
    minify: 'esbuild',        // esbuild es 20-40x más rápido que terser, mismo resultado
    rollupOptions: {
      output: {
        // Separar vendors pesados en chunks independientes con nombre estable.
        // El navegador los cachea entre deploys si no cambian.
        manualChunks: (id) => {
          // React core — cambia rara vez, cacheo agresivo
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          // Spline 3D — muy pesado (~2MB), aislado para no bloquear nada
          if (id.includes('@splinetool')) {
            return 'vendor-spline';
          }
          // React Router
          if (id.includes('react-router')) {
            return 'vendor-router';
          }
          // Iconos Lucide
          if (id.includes('lucide-react')) {
            return 'vendor-lucide';
          }
          // Resto de node_modules en un chunk compartido
          if (id.includes('node_modules')) {
            return 'vendor-misc';
          }
        },
        // Nombre de assets con hash para cache busting correcto
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
  },
});