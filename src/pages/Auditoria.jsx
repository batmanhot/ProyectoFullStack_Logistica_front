import { useState, useMemo } from 'react'
import { Shield, Search, Download, Trash2, Filter,
         LogIn, LogOut, Plus, Edit2, Trash, FileText,
         Printer, Upload, AlertTriangle, RefreshCw, Eye } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatDate, fechaHoy } from '../utils/helpers'
import * as storage from '../services/storage'
import { EmptyState, Badge, Btn, Field, Modal } from '../components/ui/index'

const SI  = 'w-full px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] font-[inherit] placeholder-[#5f6f80]'
const SEL = SI + ' pr-8'

// Metadatos por tipo de acción
const ACCIONES = {
  LOGIN:        { label:'Ingreso',        color:'#22c55e', icon:LogIn,       badge:'success' },
  LOGIN_FAILED: { label:'Acceso fallido', color:'#ef4444', icon:AlertTriangle,badge:'danger'  },
  LOGOUT:       { label:'Cierre sesión',  color:'#5f6f80', icon:LogOut,      badge:'neutral' },
  CREATE:       { label:'Creación',       color:'#3b82f6', icon:Plus,        badge:'info'    },
  UPDATE:       { label:'Modificación',   color:'#f59e0b', icon:Edit2,       badge:'warning' },
  DELETE:       { label:'Eliminación',    color:'#ef4444', icon:Trash,       badge:'danger'  },
  EXPORT:       { label:'Exportación',    color:'#8b5cf6', icon:Download,    badge:'neutral' },
  PRINT:        { label:'Impresión',      color:'#06b6d4', icon:Printer,     badge:'info'    },
  RESET:        { label:'Reset demo',     color:'#f59e0b', icon:RefreshCw,   badge:'warning' },
  VIEW:         { label:'Consulta',       color:'#5f6f80', icon:Eye,         badge:'neutral' },
}

const MODULOS_LABEL = {
  auth:'Acceso', inventario:'Inventario', entradas:'Entradas', salidas:'Salidas',
  ajustes:'Ajustes', devoluciones:'Devoluciones', transferencias:'Transferencias',
  ordenes:'Órdenes', cotizaciones:'Cotizaciones', proveedores:'Proveedores',
  clientes:'Clientes', despachos:'Despachos', transportes:'Transportes',
  kardex:'Kardex', vencimientos:'Vencimientos', reorden:'Punto Reorden',
  prevision:'Previsión', reportes:'Reportes', usuarios:'Usuarios',
  maestros:'Maestros', configuracion:'Configuración', 'inv-fisico':'Inv. Físico',
}

export default function Auditoria() {
  const { usuarios, sesion, simboloMoneda } = useApp()

  const [logs,      setLogs]      = useState(() => storage.getAuditoria().data || [])
  const [busqueda,  setBusqueda]  = useState('')
  const [filtAccion,setFiltAccion]= useState('')
  const [filtModulo,setFiltModulo]= useState('')
  const [filtUser,  setFiltUser]  = useState('')
  const [filtDesde, setFiltDesde] = useState('')
  const [filtHasta, setFiltHasta] = useState('')
  const [verLog,    setVerLog]    = useState(null)
  const [confirmLimpiar, setConfirmLimpiar] = useState(false)

  function recargar() {
    setLogs(storage.getAuditoria({
      busqueda, accion: filtAccion, modulo: filtModulo,
      usuarioId: filtUser, desde: filtDesde, hasta: filtHasta,
    }).data || [])
  }

  const logsFiltered = useMemo(() => {
    let d = logs
    if (busqueda)   { const q = busqueda.toLowerCase(); d = d.filter(l => l.detalle?.toLowerCase().includes(q) || l.usuarioNombre?.toLowerCase().includes(q) || l.modulo?.toLowerCase().includes(q)) }
    if (filtAccion) d = d.filter(l => l.accion === filtAccion)
    if (filtModulo) d = d.filter(l => l.modulo === filtModulo)
    if (filtUser)   d = d.filter(l => l.usuarioId === filtUser)
    if (filtDesde)  d = d.filter(l => l.fecha >= filtDesde)
    if (filtHasta)  d = d.filter(l => l.fecha <= filtHasta)
    return d
  }, [logs, busqueda, filtAccion, filtModulo, filtUser, filtDesde, filtHasta])

  // KPIs
  const kpis = useMemo(() => {
    const hoy = fechaHoy()
    return {
      total:    logs.length,
      hoy:      logs.filter(l => l.fecha === hoy).length,
      errores:  logs.filter(l => l.accion === 'LOGIN_FAILED' || l.accion === 'DELETE').length,
      usuarios: [...new Set(logs.map(l => l.usuarioId))].length,
    }
  }, [logs])

  function exportarCSV() {
    const rows = [['Fecha','Hora','Usuario','Acción','Módulo','Detalle']]
    logsFiltered.forEach(l => rows.push([l.fecha, l.hora, l.usuarioNombre, l.accion, l.modulo, l.detalle]))
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const a   = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['\ufeff'+csv], { type:'text/csv;charset=utf-8' }))
    a.download = `auditoria_${fechaHoy()}.csv`
    a.click()
  }

  function limpiar() {
    storage.limpiarAuditoria()
    setLogs([])
    setConfirmLimpiar(false)
  }

  const tieneHayFiltros = busqueda || filtAccion || filtModulo || filtUser || filtDesde || filtHasta

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          ['Total de eventos',  kpis.total,    '#00c896', Shield  ],
          ['Eventos hoy',       kpis.hoy,      '#3b82f6', FileText],
          ['Alertas / Errores', kpis.errores,  '#ef4444', AlertTriangle],
          ['Usuarios activos',  kpis.usuarios, '#f59e0b', Shield  ],
        ].map(([label, val, color, Icon]) => (
          <div key={label} className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }}/>
            <div className="absolute top-3 right-4 opacity-[0.06]"><Icon size={44}/></div>
            <div className="flex items-center gap-2 mb-2">
              <Icon size={13} style={{ color }}/>
              <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em]">{label}</span>
            </div>
            <div className="text-[28px] font-semibold text-[#e8edf2]">{val}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] flex items-center gap-2">
            <Filter size={12}/> Filtros
          </span>
          <div className="flex gap-2">
            {tieneHayFiltros && (
              <Btn variant="ghost" size="sm" onClick={() => { setBusqueda(''); setFiltAccion(''); setFiltModulo(''); setFiltUser(''); setFiltDesde(''); setFiltHasta('') }}>
                Limpiar filtros
              </Btn>
            )}
            <Btn variant="ghost" size="sm" onClick={exportarCSV}>
              <Download size={12}/> Exportar CSV
            </Btn>
            {sesion?.rol === 'admin' && (
              <Btn variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => setConfirmLimpiar(true)}>
                <Trash2 size={12}/> Limpiar log
              </Btn>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div className="relative col-span-2 md:col-span-1">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <input className={SI + ' pl-8'} placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
          </div>
          <select className={SEL} value={filtAccion} onChange={e => setFiltAccion(e.target.value)}>
            <option value="">Todas las acciones</option>
            {Object.entries(ACCIONES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className={SEL} value={filtModulo} onChange={e => setFiltModulo(e.target.value)}>
            <option value="">Todos los módulos</option>
            {Object.entries(MODULOS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className={SEL} value={filtUser} onChange={e => setFiltUser(e.target.value)}>
            <option value="">Todos los usuarios</option>
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>
          <input type="date" className={SI} value={filtDesde} onChange={e => setFiltDesde(e.target.value)} title="Desde"/>
          <input type="date" className={SI} value={filtHasta} onChange={e => setFiltHasta(e.target.value)} title="Hasta"/>
        </div>
      </div>

      {/* Tabla de logs */}
      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
            Registro de Auditoría
          </span>
          <span className="text-[12px] text-[#5f6f80]">
            {logsFiltered.length} de {logs.length} eventos
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr>
              {['Fecha','Hora','Usuario','Acción','Módulo','Detalle',''].map(h => (
                <th key={h} className="bg-[#1a2230] px-3.5 py-2.5 text-left text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] border-b border-white/[0.08] whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {logsFiltered.length === 0 && (
                <tr><td colSpan={7}>
                  <EmptyState icon={Shield} title="Sin registros de auditoría"
                    description={tieneHayFiltros ? "No hay eventos que coincidan con los filtros." : "Las operaciones del sistema quedarán registradas aquí."}/>
                </td></tr>
              )}
              {logsFiltered.map(log => {
                const meta = ACCIONES[log.accion] || ACCIONES.VIEW
                const Icon = meta.icon
                return (
                  <tr key={log.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]">
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6] whitespace-nowrap">{log.fecha}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#5f6f80] whitespace-nowrap">{log.hora}</td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#00c896]/15 text-[#00c896] text-[10px] font-bold flex items-center justify-center shrink-0">
                          {log.usuarioNombre?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <span className="text-[12px] text-[#e8edf2] truncate max-w-[110px]">{log.usuarioNombre}</span>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <Badge variant={meta.badge}>
                        <Icon size={9}/> {meta.label}
                      </Badge>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-[#9ba8b6]">
                        {MODULOS_LABEL[log.modulo] || log.modulo}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-[12px] text-[#9ba8b6] max-w-[280px] truncate" title={log.detalle}>
                      {log.detalle}
                    </td>
                    <td className="px-3.5 py-2.5">
                      {log.datos && (
                        <Btn variant="ghost" size="icon" title="Ver datos" onClick={() => setVerLog(log)}>
                          <Eye size={12}/>
                        </Btn>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal detalle log */}
      {verLog && (
        <Modal open title="Detalle del Evento" onClose={() => setVerLog(null)} size="sm"
          footer={<Btn variant="secondary" onClick={() => setVerLog(null)}>Cerrar</Btn>}>
          {[
            ['Timestamp', verLog.timestamp],
            ['Usuario',   verLog.usuarioNombre],
            ['Acción',    verLog.accion],
            ['Módulo',    MODULOS_LABEL[verLog.modulo] || verLog.modulo],
            ['Detalle',   verLog.detalle],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 py-2 border-b border-white/[0.05]">
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
            <Btn variant="danger" onClick={limpiar}><Trash2 size={13}/> Confirmar limpieza</Btn>
          </>}>
          <p className="text-[13px] text-[#9ba8b6] leading-relaxed">
            Se eliminarán <strong className="text-[#e8edf2]">{logs.length} eventos</strong> del log de auditoría. Esta acción no se puede deshacer. Se recomienda exportar el CSV primero.
          </p>
        </Modal>
      )}
    </div>
  )
}
