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
      includeAssets: ['favicon.svg', 'icons.svg'],
      workbox: {
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024 // 15MB to cover the WASM file
      },
      manifest: {
        name: 'TalkFlow - Voice Translator',
        short_name: 'TalkFlow',
        description: 'Real-time voice-to-voice translation app mimicking Google Translate Conversation mode.',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          },
          {
            src: 'icons.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
