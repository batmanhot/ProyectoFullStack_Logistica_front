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
  const owner = n.usuarioOwner || {}
  return {
    ...n,
    empresaId:    n.codigo,
    fechaRegistro: n.createdAt ? n.createdAt.slice(0, 10) : '',
    fechaVencimiento: n.fechaVencimiento ? n.fechaVencimiento.slice(0, 10) : '',
    // Owner / Admin del Negocio — datos que el SuperAdmin ve/edita
    ownerNombre:  n.ownerNombre ?? owner.nombre ?? '',
    ownerEmail:   n.ownerEmail ?? owner.email ?? '',
    ownerTelefono: owner.telefono ?? '',
    ownerDocumento: owner.documento ?? '',
    ownerCargo:   owner.cargo ?? '',
    ownerActivo:  owner.activo ?? true,
    ownerExiste:  !!owner.id,
    adminNombre:  n.adminNombre ?? admin.nombre ?? '',
    adminEmail:   n.adminEmail ?? admin.email ?? '',
    adminTelefono: admin.telefono ?? '',
    adminDocumento: admin.documento ?? '',
    adminCargo:   admin.cargo ?? '',
    adminActivo:  admin.activo ?? true,
    adminExiste:  !!admin.id,
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

/** Vista 360° de un negocio: estado + plan + equipo + ingresos + facturación + backups + señales. */
export function useVista360(id) {
  return useQuery({
    queryKey: [...NK, id, 'vista-360'],
    enabled:  !!id,
    queryFn:  () => api.get(`/admin/negocios/${id}/vista-360`, OPTS).then(r => r.data ?? null),
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

// ── Facturación de la plataforma (2026-09-10) ────────────
// Documentos de cobro emitidos a partir de las suscripciones/renovaciones.
const FK = ['admin', 'facturacion']

/** Lista paginada. `filtros`: { estado, busqueda, page, pageSize }. */
export function useFacturas(filtros = {}) {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(filtros)) if (v !== undefined && v !== '' && v !== 'Todos') p.set(k, v)
  const qs = p.toString()
  return useQuery({
    queryKey: [...FK, filtros],
    placeholderData: (prev) => prev,
    queryFn:  () => api.get(`/admin/facturacion${qs ? `?${qs}` : ''}`, OPTS)
      .then(r => r.data ?? { items: [], total: 0, page: 1, pageSize: 25 }),
  })
}

export function useFacturasResumen() {
  return useQuery({
    queryKey: [...FK, 'resumen'],
    queryFn:  () => api.get('/admin/facturacion/resumen', OPTS)
      .then(r => r.data ?? { facturado: 0, cobrado: 0, porCobrar: 0, vencido: 0, pendientes: 0, vencidas: 0 }),
  })
}

export function useFacturasHistorial() {
  return useQuery({
    queryKey: [...FK, 'historial'],
    queryFn:  () => api.get('/admin/facturacion/historial', OPTS).then(r => r.data ?? []),
  })
}

/** Detalle de una factura + su línea de tiempo de eventos. */
export function useFactura(id) {
  return useQuery({
    queryKey: [...FK, 'detalle', id],
    enabled:  !!id,
    queryFn:  () => api.get(`/admin/facturacion/${id}`, OPTS).then(r => r.data ?? null),
  })
}

function invalidarFacturas(qc) {
  qc.invalidateQueries({ queryKey: FK })
  qc.invalidateQueries({ queryKey: RK }) // el cobro puede conciliar una renovación
}

export function useEmitirFactura() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: dto => api.post('/admin/facturacion', dto, OPTS),
    onSuccess:  () => invalidarFacturas(qc),
  })
}

export function useEnviarFactura() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: id => api.patch(`/admin/facturacion/${id}/enviar`, {}, OPTS),
    onSuccess:  () => invalidarFacturas(qc),
  })
}

export function useRegistrarCobroFactura() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }) => api.post(`/admin/facturacion/${id}/cobro`, dto, OPTS),
    onSuccess:  () => invalidarFacturas(qc),
  })
}

export function useAnularFactura() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: id => api.post(`/admin/facturacion/${id}/anular`, {}, OPTS),
    onSuccess:  () => invalidarFacturas(qc),
  })
}

// ── Backups / continuidad operativa (2026-09-10) ─────────
// Registro y gobierno de respaldos + flujo de restauración con aprobación.
const BK = ['admin', 'backups']

export function useRespaldos(filtros = {}) {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(filtros)) if (v !== undefined && v !== '' && v !== 'Todos') p.set(k, v)
  const qs = p.toString()
  return useQuery({
    queryKey: [...BK, 'respaldos', filtros],
    placeholderData: (prev) => prev,
    queryFn:  () => api.get(`/admin/backups${qs ? `?${qs}` : ''}`, OPTS)
      .then(r => r.data ?? { items: [], total: 0, page: 1, pageSize: 25 }),
  })
}

export function useRespaldosResumen() {
  return useQuery({
    queryKey: [...BK, 'resumen'],
    refetchInterval: 5 * 60_000,
    queryFn:  () => api.get('/admin/backups/resumen', OPTS)
      .then(r => r.data ?? {
        total: 0, completados: 0, verificados: 0, restauracionesPendientes: 0, cifradoActivo: false,
        ultimoBackupAt: null, backupAtrasado: false, ultimaPrueba: null,
      }),
  })
}

export function useRestauraciones(filtros = {}) {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(filtros)) if (v !== undefined && v !== '' && v !== 'Todas') p.set(k, v)
  const qs = p.toString()
  return useQuery({
    queryKey: [...BK, 'restauraciones', filtros],
    queryFn:  () => api.get(`/admin/backups/restauraciones${qs ? `?${qs}` : ''}`, OPTS).then(r => r.data ?? []),
  })
}

export function useRespaldoDestinos() {
  return useQuery({
    queryKey: [...BK, 'destinos'],
    queryFn:  () => api.get('/admin/backups/destinos', OPTS).then(r => r.data ?? []),
  })
}

export function useRespaldoActividad() {
  return useQuery({
    queryKey: [...BK, 'actividad'],
    queryFn:  () => api.get('/admin/backups/actividad', OPTS).then(r => r.data ?? []),
  })
}

export function useRespaldo(id) {
  return useQuery({
    queryKey: [...BK, 'detalle', id],
    enabled:  !!id,
    queryFn:  () => api.get(`/admin/backups/${id}`, OPTS).then(r => r.data ?? null),
  })
}

function invalidarBackups(qc) {
  qc.invalidateQueries({ queryKey: BK })
}

export function useCrearRespaldo() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: dto => api.post('/admin/backups', dto, OPTS), onSuccess: () => invalidarBackups(qc) })
}

export function useVerificarIntegridad() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: ({ id, ...dto }) => api.patch(`/admin/backups/${id}/integridad`, dto, OPTS), onSuccess: () => invalidarBackups(qc) })
}

export function useActualizarEstadoRespaldo() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: ({ id, ...dto }) => api.patch(`/admin/backups/${id}/estado`, dto, OPTS), onSuccess: () => invalidarBackups(qc) })
}

export function useSolicitarRestauracion() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: ({ id, ...dto }) => api.post(`/admin/backups/${id}/restauraciones`, dto, OPTS), onSuccess: () => invalidarBackups(qc) })
}

export function useRegistrarAprobacionRestauracion() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: ({ id, ...dto }) => api.patch(`/admin/backups/restauraciones/${id}/aprobacion`, dto, OPTS), onSuccess: () => invalidarBackups(qc) })
}

export function useEjecutarRestauracion() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: ({ id, ...dto }) => api.post(`/admin/backups/restauraciones/${id}/ejecutar`, dto, OPTS), onSuccess: () => invalidarBackups(qc) })
}

export function useRechazarRestauracion() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: ({ id, ...dto }) => api.post(`/admin/backups/restauraciones/${id}/rechazar`, dto, OPTS), onSuccess: () => invalidarBackups(qc) })
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
// Bandeja de salud del sistema (Centro de Alertas, 2026-09-08).
const SK = ['admin', 'alertas-salud']

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
    onSuccess:  () => { qc.invalidateQueries({ queryKey: EK }); qc.invalidateQueries({ queryKey: VK }); qc.invalidateQueries({ queryKey: SK }) },
  })
}

// ── Centro de Alertas: bandeja de salud del sistema (2026-09-08) ──
// Vencimientos + topes de plan excedidos/al borde + correos rebotando +
// negocios sin email + problemas de configuración, en una sola lista.
export function useSaludAlertas() {
  return useQuery({
    queryKey: SK,
    queryFn:  () => api.get('/admin/alertas/salud', OPTS).then(r => r.data ?? []),
    refetchInterval: 60_000,
  })
}

/** Marca una alerta de salud como resuelta o silenciada (por su `clave`). */
export function useResolverAlertaSalud() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ clave, estado, nota, silenciarDias }) =>
      api.patch('/admin/alertas/salud', { clave, estado, nota, silenciarDias }, OPTS),
    onSuccess:  () => qc.invalidateQueries({ queryKey: SK }),
  })
}

/** Reabre una alerta de salud silenciada o resuelta. */
export function useReabrirAlertaSalud() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: clave => api.post('/admin/alertas/salud/reabrir', { clave }, OPTS),
    onSuccess:  () => qc.invalidateQueries({ queryKey: SK }),
  })
}

// ── Monitor en Vivo de la plataforma (2026-09-09) ────────
const MK = ['admin', 'monitor']

/** Snapshot en vivo: KPIs de tráfico, serie, actividad reciente y salud de servicios. */
export function useMonitorResumen(activo = true) {
  return useQuery({
    queryKey: [...MK, 'resumen'],
    queryFn:  () => api.get('/admin/monitor/resumen', OPTS).then(r => r.data ?? null),
    refetchInterval: activo ? 5000 : false,
    refetchOnWindowFocus: activo,
  })
}

export function useMonitorIncidentes() {
  return useQuery({
    queryKey: [...MK, 'incidentes'],
    queryFn:  () => api.get('/admin/monitor/incidentes', OPTS).then(r => r.data ?? []),
    refetchInterval: 30_000,
  })
}

// ── Landing Page ─────────────────────────────────────────
const LK = ['admin', 'landing']

export function useLanding() {
  return useQuery({
    queryKey: LK,
    // Doble `.data` a propósito: `r.data` es la fila LandingConfig completa
    // ({ id, data, updatedAt }) y `r.data.data` es el blob de contenido.
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

// ── Configuración de plataforma (singleton) ──────────────
const PCK = ['admin', 'plataforma-config']

export function usePlataformaConfig() {
  return useQuery({
    queryKey: PCK,
    queryFn:  () => api.get('/admin/plataforma-config', OPTS).then(r => r.data ?? null),
  })
}

export function useGuardarPlataformaConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: campos => api.put('/admin/plataforma-config', campos, OPTS),
    onSuccess:  () => qc.invalidateQueries({ queryKey: PCK }),
  })
}

// ── Administradores de Plataforma (SuperAdmins) — máx. 2 ──
const PAK = ['admin', 'platform-admins']

export function usePlatformAdmins() {
  return useQuery({
    queryKey: PAK,
    queryFn:  () => api.get('/admin/platform-admins', OPTS).then(r => r.data ?? []),
  })
}

export function useCrearPlatformAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: dto => api.post('/admin/platform-admins', dto, OPTS),
    onSuccess:  () => qc.invalidateQueries({ queryKey: PAK }),
  })
}

export function useActualizarPlatformAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }) => api.put(`/admin/platform-admins/${id}`, dto, OPTS),
    onSuccess:  () => qc.invalidateQueries({ queryKey: PAK }),
  })
}

export function useEliminarPlatformAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: id => api.delete(`/admin/platform-admins/${id}`, OPTS),
    onSuccess:  () => qc.invalidateQueries({ queryKey: PAK }),
  })
}

// ── Roles del sistema (catálogo base) — 2026-09-09 ───────
// El SuperAdmin gobierna las plantillas de rol (Rol.empresaId = null) que
// todos los tenants heredan. `owner`/`admin` vienen marcados `protegido:true`
// (acceso total intocable). Cada rol trae `enUso: { usuarios, negocios }`.
const RBK = ['admin', 'roles-base']

export function useRolesBase() {
  return useQuery({
    queryKey: RBK,
    queryFn:  () => api.get('/admin/roles-base', OPTS).then(r => r.data ?? []),
  })
}

export function useRolBase(id) {
  return useQuery({
    queryKey: [...RBK, id],
    enabled:  !!id,
    queryFn:  () => api.get(`/admin/roles-base/${id}`, OPTS).then(r => r.data ?? null),
  })
}

export function useCrearRolBase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: dto => api.post('/admin/roles-base', dto, OPTS),
    onSuccess:  () => qc.invalidateQueries({ queryKey: RBK }),
  })
}

export function useActualizarRolBase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }) => api.put(`/admin/roles-base/${id}`, dto, OPTS),
    onSuccess:  () => qc.invalidateQueries({ queryKey: RBK }),
  })
}

export function useEliminarRolBase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: id => api.delete(`/admin/roles-base/${id}`, OPTS),
    onSuccess:  () => qc.invalidateQueries({ queryKey: RBK }),
  })
}

// ── Auditoría de plataforma (2026-09-04) ─────────────────
// Quién hizo qué desde el panel de SuperAdmin — antes no quedaba ningún
// rastro. La llena PlatformAuditInterceptor en el backend automáticamente.
const AUK = ['admin', 'auditoria']

/** Bitácora de plataforma paginada. `filtros`: { tipo, busqueda, page, pageSize, desde, hasta }. */
export function useAuditoriaPlataforma(filtros = {}) {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(filtros)) if (v !== undefined && v !== '' && v !== 'Todos') p.set(k, v)
  const qs = p.toString()
  return useQuery({
    queryKey: [...AUK, filtros],
    placeholderData: (prev) => prev,
    queryFn:  () => api.get(`/admin/auditoria${qs ? `?${qs}` : ''}`, OPTS)
      .then(r => r.data ?? { items: [], total: 0, page: 1, pageSize: 25 }),
  })
}

export function useAuditoriaResumen() {
  return useQuery({
    queryKey: [...AUK, 'resumen'],
    queryFn:  () => api.get('/admin/auditoria/resumen', OPTS).then(r => r.data ?? { total: 0, requierenAtencion: 0, retencionDias: 365 }),
  })
}

/** Ámbito "Sistema logístico": auditoría operativa de los negocios (modelo `Auditoria`). */
export function useAuditoriaSistema(filtros = {}) {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(filtros)) if (v !== undefined && v !== '' && v !== 'Todas') p.set(k, v)
  const qs = p.toString()
  return useQuery({
    queryKey: [...AUK, 'sistema', filtros],
    placeholderData: (prev) => prev,
    queryFn:  () => api.get(`/admin/auditoria/sistema${qs ? `?${qs}` : ''}`, OPTS)
      .then(r => r.data ?? { items: [], total: 0, page: 1, pageSize: 25, kpis: {} }),
  })
}
