import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

precacheAndRoute(self.__WB_MANIFEST)

// Mismo cacheo de Google Fonts que antes vivía en vite.config.js
// (workbox.runtimeCaching) — portado a mano porque el modo injectManifest
// no aplica esa config automáticamente.
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({ cacheName: 'gfonts-cache', plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 31536000 })] }),
)
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({ cacheName: 'gstatic-cache', plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 31536000 })] }),
)

// ── Web Push (Fase 2) ──────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data?.json() ?? {} } catch { /* payload no era JSON */ }
  const titulo = data.title || 'StockPro'
  console.log('[sw] push recibido:', titulo)
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: data.body || '',
      icon: '/favicon.png',
      badge: '/favicon.png',
      data: { url: data.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(self.clients.openWindow(url))
})
