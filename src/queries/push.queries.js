import { useMutation } from '@tanstack/react-query'
import api from '../services/api'

export function usePushSubscribe() {
  return useMutation({
    mutationFn: (subscription) => api.post('/push/subscribe', subscription),
  })
}

export function usePushUnsubscribe() {
  return useMutation({
    // api.delete() no manda body — usamos el helper genérico, que sí lo permite.
    mutationFn: (endpoint) => api.request('DELETE', '/push/subscribe', { endpoint }),
  })
}
