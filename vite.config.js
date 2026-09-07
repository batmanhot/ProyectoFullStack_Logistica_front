import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'node:path'
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
  // La consola SuperAdmin es una vista de evaluación. No se publica por
  // accidente: el pipeline debe habilitarla explícitamente y protegerla con
  // autenticación/autorización de plataforma antes de conectar datos reales.
  const buildInputs = { app: resolve(process.cwd(), 'index.html') }
  if (env.VITE_INCLUDE_SUPERADMIN_PREVIEW === 'true') {
    buildInputs['superadmin-v2'] = resolve(process.cwd(), 'superadmin-v2.html')
  }
  if (env.VITE_INCLUDE_RRHH_PREVIEW === 'true') {
    buildInputs['rrhh-afiliacion'] = resolve(process.cwd(), 'rrhh-afiliacion.html')
  }
  if (env.VITE_INCLUDE_RRHH_V2_PREVIEW === 'true') {
    buildInputs['rrhh-afiliacion-v2'] = resolve(process.cwd(), 'rrhh-afiliacion-v2.html')
  }
  if (env.VITE_INCLUDE_RRHH_V3_PREVIEW === 'true') {
    buildInputs['rrhh-afiliacion-v3'] = resolve(process.cwd(), 'rrhh-afiliacion-v3.html')
  }
  if (env.VITE_INCLUDE_CONTROL_TOWER_PREVIEW === 'true') {
    buildInputs['control-tower'] = resolve(process.cwd(), 'control-tower.html')
  }
  if (env.VITE_INCLUDE_CONTROL_TOWER_V2_PREVIEW === 'true') {
    buildInputs['transport-control-tower-v2'] = resolve(process.cwd(), 'transport-control-tower-v2.html')
  }
  if (env.VITE_INCLUDE_RRHH_ABSENCES_PREVIEW === 'true') {
    buildInputs['rrhh-ausencias'] = resolve(process.cwd(), 'rrhh-ausencias.html')
  }
  if (env.VITE_INCLUDE_MINING_CONTROL_PREVIEW === 'true') {
    buildInputs['mining-control-center'] = resolve(process.cwd(), 'mining-control-center.html')
  }
  return {
  build: {
    rollupOptions: {
      input: buildInputs,
    },
  },
  plugins: [
    tailwindcss(),
    react(),
    htmlSecurityHeaders(env.VITE_API_URL || 'http://localhost:3000'),
    VitePWA({
      // Fase 2 (2026-08-05): antes 'generateSW' (implícito) — necesitamos un
      // listener 'push' custom, que generateSW no soporta. El cacheo de
      // Google Fonts que antes vivía en `workbox.runtimeCaching` ahora se
      // define a mano dentro de src/sw.js.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
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
      devOptions: { enabled: true, type: 'module' },
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
