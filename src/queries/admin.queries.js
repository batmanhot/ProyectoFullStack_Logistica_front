import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'

const OPTS = { authType: 'admin' }

// ── Endpoints PÚBLICOS (sin auth) — para LandingPage ─────
export function usePublicLanding() {
  return useQuery({
    queryKey: ['public', 'landing'],
    queryFn:  () => api.get('/public/landing', { skipAuth: true }).then(r => r.data?.data ?? null),
    staleTime: 5 * 60_000,
  })
}

export function usePublicPlanes() {
  return useQuery({
    queryKey: ['public', 'planes'],
    queryFn:  () => api.get('/public/planes', { skipAuth: true }).then(r => (r.data ?? []).map(normPlan)),
    staleTime: 5 * 60_000,
  })
}

// ── Normalizadores (exportados para testing) ─────────────
export function normNegocio(n) {
  const admin = n.usuarios?.[0] || n.admin || n.usuarioAdminInicial || {}
  return {
    ...n,
    empresaId:    n.codigo,
    fechaRegistro: n.createdAt ? n.createdAt.slice(0, 10) : '',
    fechaVencimiento: n.fechaVencimiento ? n.fechaVencimiento.slice(0, 10) : '',
    adminNombre:  n.adminNombre ?? admin.nombre ?? '',
    adminEmail:   n.adminEmail ?? admin.email ?? '',
    usuarios:     n.usuarios ?? [],
  }
}

export function normPlan(p) {
  return {
    ...p,
    precioMensual: parseFloat(p.precioMensual) || 0,
    precioAnual:   parseFloat(p.precioAnual)   || 0,
  }
}

export function normRenovacion(r) {
  return {
    ...r,
    negocioId:     r.empresaId,
    negocioNombre: r.empresa?.nombre ?? '',
    plan:          r.planId,
    estado:        r.estado?.toLowerCase() ?? 'pagado',
    monto:         parseFloat(r.monto) || 0,
    fechaPago:     r.fechaPago     ? r.fechaPago.slice(0, 10)     : '',
    periodoInicio: r.periodoInicio ? r.periodoInicio.slice(0, 10) : '',
    periodoFin:    r.periodoFin    ? r.periodoFin.slice(0, 10)    : '',
  }
}

// ── Negocios ─────────────────────────────────────────────
const NK = ['admin', 'negocios']

function asArrayResponse(payload) {
  if (Array.isArray(payload)) return payload
  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.data)) return payload.data
    if (Array.isArray(payload.items)) return payload.items
  }
  return []
}

export function useNegociosList(filtros = {}) {
  const p = new URLSearchParams()
  if (filtros.estado) p.set('estado', filtros.estado)
  if (filtros.plan)   p.set('plan',   filtros.plan)
  const qs = p.toString()
  return useQuery({
    queryKey: [...NK, filtros],
    placeholderData: (prev) => prev ?? [],
    queryFn: async () => {
      const res = await api.get(`/admin/negocios${qs ? `?${qs}` : ''}`, OPTS)
      return asArrayResponse(res.data ?? []).map(normNegocio)
    },
  })
}

/** Detalle enriquecido de un negocio puntual (incluye _count.usuarios y ultimoAcceso — findAll no los trae). */
export function useNegocio(id) {
  return useQuery({
    queryKey: [...NK, id],
    queryFn:  () => api.get(`/admin/negocios/${id}`, OPTS).then(r => normNegocio(r.data ?? {})),
    enabled:  !!id,
  })
}

export function useCrearNegocio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: dto => api.post('/admin/negocios', dto, OPTS),
    onSuccess:  () => qc.invalidateQueries({ queryKey: NK }),
  })
}

export function useActualizarNegocio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }) => api.put(`/admin/negocios/${id}`, dto, OPTS),
    onSuccess:  () => qc.invalidateQueries({ queryKey: NK }),
  })
}

/** "Cancelar negocio" — soft, reversible (re-editando el negocio se puede reactivar). */
export function useEliminarNegocio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: id => api.delete(`/admin/negocios/${id}`, OPTS),
    onSuccess:  () => qc.invalidateQueries({ queryKey: NK }),
  })
}

/** "Eliminar definitivamente" — protegido, exige repetir el nombre exacto del negocio. */
export function useArchivarNegocio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, confirmacionNombre }) => api.post(`/admin/negocios/${id}/archivar`, { confirmacionNombre }, OPTS),
    onSuccess:  () => qc.invalidateQueries({ queryKey: NK }),
  })
}

// ── Planes SaaS ──────────────────────────────────────────
const PK = ['admin', 'planes']

export function usePlanesAdminList(incluirInactivos = true) {
  return useQuery({
    queryKey: [...PK, { incluirInactivos }],
    queryFn:  () => api.get(`/admin/planes?incluirInactivos=${incluirInactivos}`, OPTS).then(r => (r.data ?? []).map(normPlan)),
  })
}

export function useCrearPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: dto => api.post('/admin/planes', dto, OPTS),
    onSuccess:  () => qc.invalidateQueries({ queryKey: PK }),
  })
}

export function useActualizarPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }) => api.put(`/admin/planes/${id}`, dto, OPTS),
    onSuccess:  () => qc.invalidateQueries({ queryKey: PK }),
  })
}

export function useEliminarPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: id => api.delete(`/admin/planes/${id}`, OPTS),
    onSuccess:  () => qc.invalidateQueries({ queryKey: PK }),
  })
}

// ── Renovaciones ─────────────────────────────────────────
const RK = ['admin', 'renovaciones']

export function useRenovacionesList(filtros = {}) {
  const p = new URLSearchParams()
  if (filtros.empresaId) p.set('empresaId', filtros.empresaId)
  if (filtros.estado)    p.set('estado',    filtros.estado.toUpperCase())
  const qs = p.toString()
  return useQuery({
    queryKey: [...RK, filtros],
    queryFn:  () => api.get(`/admin/renovaciones${qs ? `?${qs}` : ''}`, OPTS).then(r => (r.data ?? []).map(normRenovacion)),
  })
}

export function useCrearRenovacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: dto => api.post('/admin/renovaciones', dto, OPTS),
    onSuccess:  () => qc.invalidateQueries({ queryKey: RK }),
  })
}

export function useAnularRenovacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: id => api.post(`/admin/renovaciones/${id}/anular`, {}, OPTS),
    onSuccess:  () => qc.invalidateQueries({ queryKey: RK }),
  })
}

// ── Alertas de vencimiento ───────────────────────────────
const AK = ['admin', 'alertas']
const VK = ['admin', 'vencimientos']

export function useAlertasList() {
  return useQuery({
    queryKey: AK,
    queryFn:  () => api.get('/admin/alertas', OPTS).then(r => r.data ?? []),
  })
}

export function useVencimientosProximos() {
  return useQuery({
    queryKey: VK,
    queryFn:  () => api.get('/admin/alertas/vencimientos-proximos', OPTS).then(r => r.data ?? []),
    refetchInterval: 60_000,
  })
}

export function useCrearAlerta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: dto => api.post('/admin/alertas', dto, OPTS),
    onSuccess:  () => qc.invalidateQueries({ queryKey: AK }),
  })
}

export function useActualizarAlerta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }) => api.put(`/admin/alertas/${id}`, dto, OPTS),
    onSuccess:  () => qc.invalidateQueries({ queryKey: AK }),
  })
}

export function useEliminarAlerta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: id => api.delete(`/admin/alertas/${id}`, OPTS),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: AK }); qc.invalidateQueries({ queryKey: VK }) },
  })
}

// Historial de envíos reales (2026-09-04) — para que el panel muestre que
// de verdad se mandó algo, no solo la lista de "quién debería recibir algo".
const EK = ['admin', 'alertas-envios']

export function useHistorialAlertasEnvios() {
  return useQuery({
    queryKey: EK,
    queryFn:  () => api.get('/admin/alertas/envios', OPTS).then(r => r.data ?? []),
  })
}

/** Dispara el envío ahora mismo, sin esperar al cron de las 8am. */
export function useEnviarAlertasPendientes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/admin/alertas/enviar-pendientes', {}, OPTS),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: EK }); qc.invalidateQueries({ queryKey: VK }) },
  })
}

// ── Landing Page ─────────────────────────────────────────
const LK = ['admin', 'landing']

export function useLanding() {
  return useQuery({
    queryKey: LK,
    queryFn:  () => api.get('/admin/landing', OPTS).then(r => r.data?.data ?? null),
  })
}

export function useGuardarLanding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: landingObj => api.put('/admin/landing', { data: landingObj }, OPTS),
    onSuccess:  () => qc.invalidateQueries({ queryKey: LK }),
  })
}

// ── Auditoría de plataforma (2026-09-04) ─────────────────
// Quién hizo qué desde el panel de SuperAdmin — antes no quedaba ningún
// rastro. La llena PlatformAuditInterceptor en el backend automáticamente.
export function useAuditoriaPlataforma(limite = 15) {
  return useQuery({
    queryKey: ['admin', 'auditoria', limite],
    queryFn:  () => api.get(`/admin/auditoria?limite=${limite}`, OPTS).then(r => r.data ?? []),
  })
}
