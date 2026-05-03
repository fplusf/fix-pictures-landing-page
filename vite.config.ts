import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cloudflare()],
  server: {
    port: 3000,
    strictPort: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
    proxy: {
      '/api/process-image': {
        target: 'http://localhost:54321',
        rewrite: () => '/functions/v1/process-image',
        changeOrigin: true,
      },
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
