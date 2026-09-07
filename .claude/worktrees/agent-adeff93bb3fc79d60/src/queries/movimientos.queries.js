import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const MOV_KEYS = {
  all:   () => ['movimientos'],
  list:  (f) => ['movimientos', 'list', f],
}

const KARDEX_KEYS = {
  all:  () => ['kardex'],
  one:  (f) => ['kardex', f],
}

// ── Movimientos ──────────────────────────────────────────────

// El backend NO devuelve `costoTotal` — el modelo Movimiento solo guarda
// `costoUnitario` y `cantidad` (ambos Decimal, serializados como string por
// Prisma). Se normaliza acá para que TODAS las pantallas que consumen este
// hook reciban valores numéricos ya listos para sumar, en vez de que cada
// página reinvente `costoUnitario * cantidad` (o, peor, sume el campo
// inexistente `costoTotal` y obtenga siempre 0 o NaN).
function normalizarMovimiento(m) {
  const cantidad      = Number(m.cantidad) || 0
  const costoUnitario = Number(m.costoUnitario) || 0
  return { ...m, cantidad, costoUnitario, costoTotal: costoUnitario * Math.abs(cantidad) }
}

export function useMovimientosList({ productoId, almacenId, tipo, desde, hasta } = {}) {
  return useQuery({
    queryKey: MOV_KEYS.list({ productoId, almacenId, tipo, desde, hasta }),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (productoId) params.set('productoId', productoId)
      if (almacenId)  params.set('almacenId', almacenId)
      if (tipo)       params.set('tipo', tipo)
      if (desde)      params.set('desde', desde)
      if (hasta)      params.set('hasta', hasta)
      const qs = params.toString() ? `?${params}` : ''
      const r = await api.get(`/movimientos${qs}`)
      if (r.error) throw new Error(r.error)
      return (r.data ?? []).map(normalizarMovimiento)
    },
  })
}

export function useCrearMovimiento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto) => api.post('/movimientos', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MOV_KEYS.all() })
      qc.invalidateQueries({ queryKey: ['inventario'] })
      qc.invalidateQueries({ queryKey: KARDEX_KEYS.all() })
    },
  })
}

// ── Kardex ───────────────────────────────────────────────────

export function useKardex({ productoId, almacenId, desde, hasta } = {}) {
  return useQuery({
    queryKey: KARDEX_KEYS.one({ productoId, almacenId, desde, hasta }),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (productoId) params.set('productoId', productoId)
      if (almacenId)  params.set('almacenId', almacenId)
      if (desde)      params.set('desde', desde)
      if (hasta)      params.set('hasta', hasta)
      const qs = params.toString() ? `?${params}` : ''
      const r = await api.get(`/kardex${qs}`)
      if (r.error) throw new Error(r.error)
      return r.data ?? []
    },
    enabled: !!productoId,
  })
}
