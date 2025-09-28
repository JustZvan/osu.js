import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [
    TanStackRouterVite({ autoCodeSplitting: true }),
    viteReact(),
    tailwindcss(),
    nodePolyfills({
       
      exclude: [
        'fs',  
      ],
       
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
       
      protocolImports: true,
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/core', '@ffmpeg/util', '@ffmpeg/ffmpeg'],
  },
  worker: {
    format: 'es',
  },
  server: {
    headers: {
    }
  }
})
