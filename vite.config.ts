import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
})
