import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Hallazgo Alto #8 (auditoría de seguridad 2026-07-29): agrega una
 * Content-Security-Policy SOLO al HTML del build de producción (`apply:
 * 'build'`) — en dev, @vitejs/plugin-react inyecta un <script> inline
 * (preámbulo de React Fast Refresh) que una CSP con script-src 'self'
 * bloquearía sin 'unsafe-inline', rompiendo `npm run dev`.
 */
function htmlSecurityHeaders(apiUrl) {
  const apiOrigin = (() => {
    try { return new URL(apiUrl).origin } catch { return "'self'" }
  })()
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    // La app usa `style` inline en muchos componentes — ver memoria del
    // proyecto sobre contraste de colores en modo claro.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    `connect-src 'self' ${apiOrigin}`,
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "object-src 'none'",
  ].join('; ')

  return {
    name: 'html-security-headers',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<title>',
        `<meta http-equiv="Content-Security-Policy" content="${csp}" />\n    <title>`,
      )
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
  plugins: [
    tailwindcss(),
    react(),
    htmlSecurityHeaders(env.VITE_API_URL || 'http://localhost:3000'),
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
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
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
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['src/utils/helpers.js', 'src/utils/valorizacion.js'],
      exclude: [
        'src/**/*.{test,spec}.{js,jsx}',
        'src/test/**',
      ],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
    },
  },
  }
})
