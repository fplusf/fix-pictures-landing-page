import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import { handleProcessImage } from './src/lib/process-image-handler'

import { cloudflare } from "@cloudflare/vite-plugin";

const readRequestBody = async (req: IncomingMessage) => {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

const localApiPlugin = () => ({
  name: 'local-api-process-image',
  configureServer(server: {
    middlewares: {
      use: (handler: (req: IncomingMessage, res: ServerResponse, next: () => void) => void | Promise<void>) => void
    }
  }) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/api/process-image')) {
        next()
        return
      }

      const body = await readRequestBody(req)
      const origin = req.headers.origin ?? 'http://127.0.0.1:3000'
      const request = new Request(new URL(req.url, origin), {
        method: req.method,
        headers: new Headers(req.headers as Record<string, string>),
        body: body.length ? body : undefined,
      })

      try {
        const response = await handleProcessImage(request)
        res.statusCode = response.status
        response.headers.forEach((value, key) => {
          res.setHeader(key, value)
        })
        const arrayBuffer = await response.arrayBuffer()
        res.end(Buffer.from(arrayBuffer))
      } catch (error) {
        res.statusCode = 500
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({
          error: error instanceof Error ? error.message : 'Local API handler failed',
        }))
      }
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localApiPlugin(), cloudflare()],
  server: {
    port: 3000,
    strictPort: true,
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