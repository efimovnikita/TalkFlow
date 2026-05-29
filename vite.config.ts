import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/TalkFlow/',
  optimizeDeps: {
    exclude: ['onnxruntime-web']
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg', 'icon-512.png'],
      workbox: {
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024, // 15MB to cover the WASM file
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm,onnx}']
      },
      manifest: {
        name: 'TalkFlow - Voice Translator',
        short_name: 'TalkFlow',
        description: 'Real-time voice-to-voice translation app.',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
})
