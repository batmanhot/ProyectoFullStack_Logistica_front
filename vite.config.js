import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png','logo.svg','favicon.ico'],
      manifest: {
        name: 'StockPro — Gestión Logística',
        short_name: 'StockPro',
        description: 'Sistema de gestión logística para PYMEs',
        theme_color: '#141920',
        background_color: '#0e1117',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          { src:'/favicon.png', sizes:'any', type:'image/png' },
          { src:'/favicon.png', sizes:'192x192', type:'image/png' },
          { src:'/favicon.png', sizes:'512x512', type:'image/png', purpose:'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          { urlPattern:/^https:\/\/fonts\.googleapis\.com\/.*/i, handler:'CacheFirst', options:{ cacheName:'gfonts-cache', expiration:{ maxEntries:10, maxAgeSeconds:31536000 } } },
          { urlPattern:/^https:\/\/fonts\.gstatic\.com\/.*/i,   handler:'CacheFirst', options:{ cacheName:'gstatic-cache', expiration:{ maxEntries:10, maxAgeSeconds:31536000 } } },
        ],
      },
      devOptions: { enabled: true },
    }),
  ],
  resolve: { alias: { '@': '/src' } },
})
