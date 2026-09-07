// Boilerplate estándar de Web Push — convierte la VAPID public key
// (base64url) al formato Uint8Array que pide pushManager.subscribe().
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export function pushSoportado() {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

/** Pide permiso al usuario y suscribe este dispositivo. Devuelve el objeto listo para POST /push/subscribe. */
export async function suscribirse() {
  if (!pushSoportado()) throw new Error('Este navegador no soporta notificaciones push')

  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') throw new Error('Permiso de notificaciones denegado')

  const registration = await navigator.serviceWorker.ready
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  })

  const json = subscription.toJSON()
  return { endpoint: json.endpoint, keys: json.keys, userAgent: navigator.userAgent }
}

/** Cancela la suscripción del navegador. Devuelve el endpoint para avisar al backend, o null si no había ninguna. */
export async function desuscribirse() {
  if (!pushSoportado()) return null
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return null
  const endpoint = subscription.endpoint
  await subscription.unsubscribe()
  return endpoint
}
