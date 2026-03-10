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
    // Target: modern browsers (~2019+). Avoids unnecessary polyfills.
    target: ['es2019', 'chrome79', 'firefox78', 'safari13', 'edge79'],
    chunkSizeWarningLimit: 600,
    cssCodeSplit: true,      // Per-route CSS: only load what each page needs
    minify: 'esbuild',       // 20-40x faster than terser, same output quality
    rollupOptions: {
      treeshake: {
        // Aggressive tree-shaking: assume modules have no side-effects
        // unless explicitly declared. Cuts dead code more aggressively.
        preset: 'recommended',
      },
      output: {
        // Stable vendor chunk names → aggressive browser caching between deploys
        manualChunks: (id) => {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          // Spline 3D — very heavy (~2 MB), isolated so it never blocks other chunks
          if (id.includes('@splinetool')) {
            return 'vendor-spline';
          }
          if (id.includes('react-router')) {
            return 'vendor-router';
          }
          if (id.includes('lucide-react')) {
            return 'vendor-lucide';
          }
          // react-markdown + its remark/rehype deps
          if (id.includes('react-markdown') || id.includes('remark') || id.includes('rehype') || id.includes('unified')) {
            return 'vendor-markdown';
          }
          // pdf libs — only loaded on CV page
          if (id.includes('jspdf') || id.includes('html2canvas')) {
            return 'vendor-pdf';
          }
          if (id.includes('node_modules')) {
            return 'vendor-misc';
          }
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // Remove license banner comments from vendor bundles (~3-8 KB saved)
    esbuildOptions: {
      legalComments: 'none',
    },
  },
});