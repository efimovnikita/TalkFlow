import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/TalkFlow/',
  optimizeDeps: {
    exclude: ['onnxruntime-web']
  },
  server: {
    proxy: {
      '/mistral-realtime': {
        target: 'https://api.mistral.ai',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/mistral-realtime/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            try {
              const url = new URL(req.url || '', 'https://api.mistral.ai');
              const apiKey = url.searchParams.get('api_key');
              if (apiKey) {
                proxyReq.setHeader('Authorization', `Bearer ${apiKey}`);
                url.searchParams.delete('api_key');
                proxyReq.path = url.pathname + url.search;
              }
            } catch (e) {
              console.error('Error proxying HTTP request:', e);
            }
          });
          proxy.on('proxyReqWs', (proxyReq, req) => {
            try {
              const url = new URL(req.url || '', 'https://api.mistral.ai');
              const apiKey = url.searchParams.get('api_key');
              if (apiKey) {
                proxyReq.setHeader('Authorization', `Bearer ${apiKey}`);
                url.searchParams.delete('api_key');
                proxyReq.path = url.pathname + url.search;
              }
            } catch (e) {
              console.error('Error proxying WS request:', e);
            }
          });
        }
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
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
