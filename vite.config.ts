import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
  worker: {
    format: 'es',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  optimizeDeps: {
    // Both packages use WASM side-effects and are worker-only imports.
    // Excluding them from pre-bundling prevents Vite from trying to analyse
    // their binary assets during the dep-scan phase.
    exclude: ['@imgly/background-removal', '@huggingface/transformers'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase-js': ['@supabase/supabase-js'],
          'lucide': ['lucide-react'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-slider', '@radix-ui/react-slot', 'class-variance-authority', 'clsx', 'tailwind-merge'],
          'utils-vendor': ['jszip', 'piexifjs', 'exifr', 'react-dropzone'],
        },
      },
    },
  },
})
