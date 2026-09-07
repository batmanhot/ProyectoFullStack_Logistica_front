import { useState } from 'react'
import {
  Shield, Search, Download, Trash2, Filter,
  LogIn, LogOut, Plus, Edit2, Trash, FileText,
  Printer, Upload, AlertTriangle, RefreshCw, Eye
} from 'lucide-react'
import { useApp } from '../store/AppContext'
import { Badge, Btn, Field, Modal, Input, Select, DataTable, Pager } from '../components/ui/index'
import { useUsuariosList } from '../queries/usuarios.queries'
import { useAuditoriaList, useLimpiarAuditoria, fetchAuditoriaCompleta } from '../queries/auditoria.queries'
import { exportarAuditoriaXLSX } from '../utils/exportXLSX'
import { exportarAuditoriaPDF } from '../utils/exportPDF'
import { MODULOS_LABEL } from '../config/constants'

// Metadatos por tipo de acción
const ACCIONES = {
  LOGIN: { label: 'Ingreso', color: '#22c55e', icon: LogIn, badge: 'success' },
  LOGIN_FAILED: { label: 'Acceso fallido', color: '#ef4444', icon: AlertTriangle, badge: 'danger' },
  LOGOUT: { label: 'Cierre sesión', color: '#5f6f80', icon: LogOut, badge: 'neutral' },
  CREATE: { label: 'Creación', color: '#3b82f6', icon: Plus, badge: 'info' },
  UPDATE: { label: 'Modificación', color: '#f59e0b', icon: Edit2, badge: 'warning' },
  DELETE: { label: 'Eliminación', color: '#ef4444', icon: Trash, badge: 'danger' },
  EXPORT: { label: 'Exportación', color: '#8b5cf6', icon: Download, badge: 'neutral' },
  PRINT: { label: 'Impresión', color: '#06b6d4', icon: Printer, badge: 'info' },
  RESET: { label: 'Reset demo', color: '#f59e0b', icon: RefreshCw, badge: 'warning' },
  VIEW: { label: 'Consulta', color: '#5f6f80', icon: Eye, badge: 'neutral' },
}

export default function Auditoria() {
  const { sesion, toast } = useApp()
  const { data: usuarios = [] } = useUsuariosList()

  const [busqueda, setBusqueda] = useState('')
  const [filtAccion, setFiltAccion] = useState('')
  const [filtModulo, setFiltModulo] = useState('')
  const [filtUser, setFiltUser] = useState('')
  const [filtDesde, setFiltDesde] = useState('')
  const [filtHasta, setFiltHasta] = useState('')
  const [verLog, setVerLog] = useState(null)
  const [confirmLimpiar, setConfirmLimpiar] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 25

  const filtros = { busqueda, accion: filtAccion, modulo: filtModulo, usuarioId: filtUser, desde: filtDesde, hasta: filtHasta }

  // Si cambian los filtros, volvemos a la página 1 — si no, se puede quedar
  // pidiendo una página que ya no existe para el nuevo filtro. Ajustar el
  // estado durante el render (en vez de un useEffect) evita un commit extra.
  const filtrosKey = JSON.stringify(filtros)
  const [prevFiltrosKey, setPrevFiltrosKey] = useState(filtrosKey)
  if (filtrosKey !== prevFiltrosKey) {
    setPrevFiltrosKey(filtrosKey)
    setPage(1)
  }

  const { data: resp = {} } = useAuditoriaList(filtros, { page, pageSize: PAGE_SIZE })
  const apiLogs = resp.data ?? []
  const total   = resp.total ?? 0
  const kpis    = resp.kpis ?? { total: 0, hoy: 0, errores: 0, usuarios: 0 }
  const limpiarMutation = useLimpiarAuditoria()

  async function logsParaExportar() {
    const completos = await fetchAuditoriaCompleta(filtros)
    return completos.map(l => {
      const ts = l.timestamp ? new Date(l.timestamp) : null
      return {
        ...l,
        fecha: ts ? ts.toLocaleDateString('es-PE') : '',
        hora:  ts ? ts.toLocaleTimeString('es-PE') : '',
      }
    })
  }
  async function exportExcel() { await exportarAuditoriaXLSX(await logsParaExportar()) }
  async function exportPDF()   { await exportarAuditoriaPDF(await logsParaExportar(), sesion?.nombre) }

  async function limpiar() {
    const res = await limpiarMutation.mutateAsync()
    if (res?.error) { toast(res.error, 'error'); return }
    setConfirmLimpiar(false)
    toast('Bitácora de auditoría limpiada', 'success')
  }

  const tieneHayFiltros = busqueda || filtAccion || filtModulo || filtUser || filtDesde || filtHasta

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          ['Total de eventos', kpis.total, '#00c896', Shield],
          ['Eventos hoy', kpis.hoy, '#3b82f6', FileText],
          ['Alertas / Errores', kpis.errores, '#ef4444', AlertTriangle],
          ['Usuarios activos', kpis.usuarios, '#f59e0b', Shield],
        ].map(([label, val, color, Icon]) => (
          <div key={label} className="relative bg-[#161d28] border border-white/8 rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.75 rounded-t-xl" style={{ background: color }} />
            <div className="absolute top-3 right-4 opacity-[0.06]"><Icon size={44} /></div>
            <div className="flex items-center gap-2 mb-2">
              <Icon size={13} style={{ color }} />
              <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em]">{label}</span>
            </div>
            <div className="text-[28px] font-semibold text-[#e8edf2]">{val}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] flex items-center gap-2">
            <Filter size={12} /> Filtros
          </span>
          <div className="flex gap-2">
            {tieneHayFiltros && (
              <Btn variant="ghost" size="sm" onClick={() => { setBusqueda(''); setFiltAccion(''); setFiltModulo(''); setFiltUser(''); setFiltDesde(''); setFiltHasta('') }}>
                Limpiar filtros
              </Btn>
            )}
            <Btn variant="ghost" size="sm" onClick={exportExcel}>
              <Download size={12} /> Excel
            </Btn>
            <Btn variant="ghost" size="sm" onClick={exportPDF}>
              <FileText size={12} /> PDF
            </Btn>
            {sesion?.rol?.codigo === 'admin' && (
              <Btn variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => setConfirmLimpiar(true)}>
                <Trash2 size={12} /> Limpiar log
              </Btn>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div className="relative col-span-2 md:col-span-1">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none" />
            <Input className="pl-8" placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <Select value={filtAccion} onChange={e => setFiltAccion(e.target.value)}>
            <option value="">Todas las acciones</option>
            {Object.entries(ACCIONES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
          <Select value={filtModulo} onChange={e => setFiltModulo(e.target.value)}>
            <option value="">Todos los módulos</option>
            {Object.entries(MODULOS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Select value={filtUser} onChange={e => setFiltUser(e.target.value)}>
            <option value="">Todos los usuarios</option>
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </Select>
          <Input type="date" value={filtDesde} onChange={e => setFiltDesde(e.target.value)} title="Desde" />
          <Input type="date" value={filtHasta} onChange={e => setFiltHasta(e.target.value)} title="Hasta" />
        </div>
      </div>

      {/* Tabla de logs */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
            Registro de Auditoría
          </span>
          <span className="text-[12px] text-[#5f6f80]">
            {total} evento{total === 1 ? '' : 's'}
          </span>
        </div>

        <DataTable
          rows={apiLogs}
          paginate={false}
          rowKey={log => log.id}
          emptyIcon={Shield}
          emptyTitle="Sin registros de auditoría"
          emptyDescription={tieneHayFiltros ? "No hay eventos que coincidan con los filtros." : "Las operaciones del sistema quedarán registradas aquí."}
          columns={[
            { key: 'fecha', header: 'Fecha', render: log => <span className="font-mono text-[12px] text-[#9ba8b6] whitespace-nowrap">{(log.timestamp||'').slice(0,10)}</span> },
            { key: 'hora', header: 'Hora', render: log => <span className="font-mono text-[12px] text-[#5f6f80] whitespace-nowrap">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'}) : ''}</span> },
            { key: 'usuario', header: 'Usuario', render: log => (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#00c896]/15 text-[#00c896] text-[10px] font-bold flex items-center justify-center shrink-0">
                    {log.usuarioNombre?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <span className="text-[12px] text-[#e8edf2] truncate max-w-27.5">{log.usuarioNombre}</span>
                </div>
              ) },
            { key: 'accion', header: 'Acción', render: log => {
                const meta = ACCIONES[log.accion] || ACCIONES.VIEW
                const Icon = meta.icon
                return <Badge variant={meta.badge}><Icon size={9} /> {meta.label}</Badge>
              } },
            { key: 'modulo', header: 'Módulo', render: log => (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-[#9ba8b6]">
                  {MODULOS_LABEL[log.modulo] || log.modulo}
                </span>
              ) },
            { key: 'detalle', header: 'Detalle', render: log => (
                <span className="text-[12px] text-[#9ba8b6] max-w-70 truncate block" title={log.detalle}>{log.detalle}</span>
              ) },
            { key: 'ver', header: '', stopPropagation: true, render: log => log.datos && (
                <Btn variant="ghost" size="icon" title="Ver datos" onClick={() => setVerLog(log)}>
                  <Eye size={12} />
                </Btn>
              ) },
          ]}
        />

        <Pager
          page={page}
          totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
          onChange={setPage}
          rangeStart={total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
          rangeEnd={Math.min(page * PAGE_SIZE, total)}
          total={total}
        />
      </div>

      <div className="bg-[#161d28] border border-white/6 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          ¿Cómo funciona el módulo de Auditoría?
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {[
            ['1. Registro automático', 'Cada ingreso, creación, edición, eliminación, exportación o impresión relevante queda registrada aquí sin acción manual.'],
            ['2. Filtrar', 'Combina búsqueda, tipo de acción, módulo, usuario y rango de fechas para acotar el log a lo que necesitas revisar.'],
            ['3. Ver datos adicionales', 'Cuando un evento tiene información extra (ej. valores antes/después de una edición), aparece el ícono de ojo para verla en detalle.'],
            ['4. Exportar o limpiar', 'Excel/PDF exportan el log filtrado; "Limpiar log" (solo Admin) borra permanentemente todos los eventos — se recomienda exportar antes.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
              <div className="text-[11px] font-semibold text-[#e8edf2] mb-1.5">{t}</div>
              <div className="text-[11px] text-[#5f6f80] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal detalle log */}
      {verLog && (
        <Modal open title="Detalle del Evento" onClose={() => setVerLog(null)} size="sm"
          footer={<Btn variant="secondary" onClick={() => setVerLog(null)}>Cerrar</Btn>}>
          {[
            ['Timestamp', verLog.timestamp],
            ['Usuario', verLog.usuarioNombre],
            ['Acción', verLog.accion],
            ['Módulo', MODULOS_LABEL[verLog.modulo] || verLog.modulo],
            ['Detalle', verLog.detalle],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 py-2 border-b border-white/5">
              <span className="text-[12px] text-[#5f6f80] shrink-0">{k}</span>
              <span className="text-[12px] text-[#e8edf2] font-medium text-right">{v}</span>
            </div>
          ))}
          {verLog.datos && (
            <div className="mt-3">
              <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide mb-2">Datos adicionales</div>
              <pre className="bg-[#0e1117] rounded-lg p-3 text-[11px] text-[#9ba8b6] overflow-auto max-h-48 font-mono">
                {JSON.stringify(verLog.datos, null, 2)}
              </pre>
            </div>
          )}
        </Modal>
      )}

      {/* Confirmar limpiar */}
      {confirmLimpiar && (
        <Modal open title="Limpiar registro de auditoría" onClose={() => setConfirmLimpiar(false)} size="sm"
          footer={<>
            <Btn variant="secondary" onClick={() => setConfirmLimpiar(false)}>Cancelar</Btn>
            <Btn variant="danger" onClick={limpiar}><Trash2 size={13} /> Confirmar limpieza</Btn>
          </>}>
          <p className="text-[13px] text-[#9ba8b6] leading-relaxed">
            Se eliminarán <strong className="text-[#e8edf2]">{total} eventos</strong> del log de auditoría. Esta acción no se puede deshacer. Se recomienda exportar el CSV primero.
          </p>
        </Modal>
      )}
    </div>
  )
}