import { useState } from 'react'
import {
  Bug, Search, Filter, AlertOctagon, AlertTriangle, Info, MinusCircle,
  Eye, CheckCircle2, Circle, RefreshCw,
} from 'lucide-react'
import { Badge, Btn, Modal, Input, Select, Textarea, DataTable, Pager } from '../components/ui/index'
import { MODULOS_LABEL } from '../config/constants'
import { useIncidenciasList, useMarcarResueltaIncidencia } from '../queries/incidencias.queries'
import { useApp } from '../store/AppContext'

// Al estilo Registro de eventos de Windows: cada severidad tiene su propia
// bandera de color — ver docs/PROPUESTA-MODULO-PICKING.md para el formato de
// propuesta original de este módulo (Registro de Incidencias, 2026-07-31).
const SEVERIDADES = {
  CRITICO: { label: 'Crítico', icon: AlertOctagon, badge: 'danger' },
  ALTO:    { label: 'Alto',    icon: AlertTriangle, badge: 'warning' },
  MEDIO:   { label: 'Medio',   icon: Info,          badge: 'info' },
  BAJO:    { label: 'Bajo',    icon: MinusCircle,   badge: 'neutral' },
}

export default function Incidencias() {
  const { toast } = useApp()

  const [busqueda, setBusqueda] = useState('')
  const [filtSeveridad, setFiltSeveridad] = useState('')
  const [filtModulo, setFiltModulo] = useState('')
  const [filtResuelto, setFiltResuelto] = useState('')
  const [filtDesde, setFiltDesde] = useState('')
  const [filtHasta, setFiltHasta] = useState('')
  const [verIncidencia, setVerIncidencia] = useState(null)
  const [resolviendo, setResolviendo] = useState(null)
  const [notaResolucion, setNotaResolucion] = useState('')

  const [page, setPage] = useState(1)
  const PAGE_SIZE = 25

  const filtros = { busqueda, severidad: filtSeveridad, modulo: filtModulo, resuelto: filtResuelto, desde: filtDesde, hasta: filtHasta }

  // Si cambian los filtros, volvemos a la página 1 — ajustar el estado durante
  // el render (en vez de un useEffect) evita un commit extra.
  const filtrosKey = JSON.stringify(filtros)
  const [prevFiltrosKey, setPrevFiltrosKey] = useState(filtrosKey)
  if (filtrosKey !== prevFiltrosKey) {
    setPrevFiltrosKey(filtrosKey)
    setPage(1)
  }

  const { data: resp = {}, isFetching, refetch } = useIncidenciasList(filtros, { page, pageSize: PAGE_SIZE })
  const incidencias = resp.data ?? []
  const total        = resp.total ?? 0
  const kpis          = resp.kpis ?? { total: 0, criticos: 0, pendientes: 0, resueltos: 0 }
  const resolverMutation = useMarcarResueltaIncidencia()

  async function confirmarResolucion() {
    const res = await resolverMutation.mutateAsync({ id: resolviendo.id, notaResolucion })
    if (res?.error) { toast(res.error, 'error'); return }
    setResolviendo(null)
    setNotaResolucion('')
    toast('Incidencia marcada como resuelta', 'success')
  }

  const tieneHayFiltros = busqueda || filtSeveridad || filtModulo || filtResuelto || filtDesde || filtHasta

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          ['Total de incidencias', kpis.total, '#00c896', Bug],
          ['Críticas sin resolver', kpis.criticos, '#ef4444', AlertOctagon],
          ['Pendientes', kpis.pendientes, '#f59e0b', Circle],
          ['Resueltas', kpis.resueltos, '#3b82f6', CheckCircle2],
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
              <Btn variant="ghost" size="sm" onClick={() => { setBusqueda(''); setFiltSeveridad(''); setFiltModulo(''); setFiltResuelto(''); setFiltDesde(''); setFiltHasta('') }}>
                Limpiar filtros
              </Btn>
            )}
            <Btn variant="ghost" size="sm" onClick={() => refetch()} title="Actualizar ahora">
              <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} /> Actualizar
            </Btn>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div className="relative col-span-2 md:col-span-1">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none" />
            <Input className="pl-8" placeholder="Buscar en el mensaje..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <Select value={filtSeveridad} onChange={e => setFiltSeveridad(e.target.value)}>
            <option value="">Todas las severidades</option>
            {Object.entries(SEVERIDADES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
          <Select value={filtModulo} onChange={e => setFiltModulo(e.target.value)}>
            <option value="">Todos los módulos</option>
            {Object.entries(MODULOS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Select value={filtResuelto} onChange={e => setFiltResuelto(e.target.value)}>
            <option value="">Pendientes y resueltas</option>
            <option value="false">Solo pendientes</option>
            <option value="true">Solo resueltas</option>
          </Select>
          <Input type="date" value={filtDesde} onChange={e => setFiltDesde(e.target.value)} title="Desde" />
          <Input type="date" value={filtHasta} onChange={e => setFiltHasta(e.target.value)} title="Hasta" />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
            Registro de Incidencias
          </span>
          <span className="text-[12px] text-[#5f6f80]">{total} evento{total === 1 ? '' : 's'}</span>
        </div>

        <DataTable
          rows={incidencias}
          paginate={false}
          rowKey={inc => inc.id}
          onRowClick={inc => setVerIncidencia(inc)}
          emptyIcon={Bug}
          emptyTitle="Sin incidencias registradas"
          emptyDescription={tieneHayFiltros ? "No hay incidencias que coincidan con los filtros." : "Los errores no controlados del sistema quedarán registrados aquí."}
          columns={[
            { key: 'fecha', header: 'Fecha', render: inc => <span className="font-mono text-[12px] text-[#9ba8b6] whitespace-nowrap">{(inc.timestamp||'').slice(0,10)}</span> },
            { key: 'hora', header: 'Hora', render: inc => <span className="font-mono text-[12px] text-[#5f6f80] whitespace-nowrap">{inc.timestamp ? new Date(inc.timestamp).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'}) : ''}</span> },
            { key: 'severidad', header: 'Severidad', render: inc => {
                const meta = SEVERIDADES[inc.severidad] || SEVERIDADES.MEDIO
                const Icon = meta.icon
                return <Badge variant={meta.badge}><Icon size={9} /> {meta.label}</Badge>
              } },
            { key: 'modulo', header: 'Módulo', render: inc => (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-[#9ba8b6]">
                  {MODULOS_LABEL[inc.modulo] || inc.modulo}
                </span>
              ) },
            { key: 'endpoint', header: 'Endpoint', render: inc => <span className="font-mono text-[11px] text-[#5f6f80] max-w-45 truncate block" title={inc.opcion}>{inc.opcion}</span> },
            { key: 'mensaje', header: 'Mensaje', render: inc => <span className="text-[12px] text-[#9ba8b6] max-w-70 truncate block" title={inc.mensaje}>{inc.mensaje}</span> },
            { key: 'usuario', header: 'Usuario', render: inc => <span className="text-[12px] text-[#9ba8b6] truncate max-w-30 block">{inc.usuarioNombre || '—'}</span> },
            { key: 'estado', header: 'Estado', render: inc => (
                inc.resuelto
                  ? <Badge variant="success"><CheckCircle2 size={9} /> Resuelta</Badge>
                  : <Badge variant="neutral"><Circle size={9} /> Pendiente</Badge>
              ) },
            { key: 'acciones', header: '', stopPropagation: true, render: inc => (
                <div className="flex gap-1">
                  <Btn variant="ghost" size="icon" title="Ver detalle" onClick={() => setVerIncidencia(inc)}>
                    <Eye size={12} />
                  </Btn>
                  {!inc.resuelto && (
                    <Btn variant="ghost" size="icon" title="Marcar como resuelta" onClick={() => { setResolviendo(inc); setNotaResolucion('') }}>
                      <CheckCircle2 size={12} />
                    </Btn>
                  )}
                </div>
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
          ¿Cómo funciona el módulo de Incidencias?
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {[
            ['1. Registro automático', 'Los errores no controlados del backend (fallas de API, excepciones) quedan registrados aquí con severidad, sin acción manual.'],
            ['2. Revisar severidad', 'Crítico/Alto/Medio/Bajo indican urgencia — filtra por severidad para priorizar qué atender primero.'],
            ['3. Ver detalle técnico', 'Haz clic en la fila para ver el stack trace y el contexto completo de la request que falló.'],
            ['4. Marcar como resuelta', 'Cuando ya corregiste la causa, márcala como resuelta con una nota opcional explicando la solución.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
              <div className="text-[11px] font-semibold text-[#e8edf2] mb-1.5">{t}</div>
              <div className="text-[11px] text-[#5f6f80] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal detalle */}
      {verIncidencia && (
        <Modal open title="Detalle de la Incidencia" onClose={() => setVerIncidencia(null)} size="md"
          footer={<Btn variant="secondary" onClick={() => setVerIncidencia(null)}>Cerrar</Btn>}>
          {[
            ['Timestamp', verIncidencia.timestamp ? new Date(verIncidencia.timestamp).toLocaleString('es-PE') : ''],
            ['Severidad', (SEVERIDADES[verIncidencia.severidad] || SEVERIDADES.MEDIO).label],
            ['Módulo', MODULOS_LABEL[verIncidencia.modulo] || verIncidencia.modulo],
            ['Endpoint', verIncidencia.opcion],
            ['Código HTTP', verIncidencia.codigoError],
            ['Usuario', verIncidencia.usuarioNombre || '—'],
            ['Mensaje', verIncidencia.mensaje],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 py-2 border-b border-white/5">
              <span className="text-[12px] text-[#5f6f80] shrink-0">{k}</span>
              <span className="text-[12px] text-[#e8edf2] font-medium text-right">{v}</span>
            </div>
          ))}
          {verIncidencia.notaResolucion && (
            <div className="mt-3">
              <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide mb-2">Nota de resolución</div>
              <p className="text-[12px] text-[#9ba8b6] bg-[#0e1117] rounded-lg p-3">{verIncidencia.notaResolucion}</p>
            </div>
          )}
          {verIncidencia.stackTrace && (
            <div className="mt-3">
              <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide mb-2">Stack trace</div>
              <pre className="bg-[#0e1117] rounded-lg p-3 text-[11px] text-[#9ba8b6] overflow-auto max-h-48 font-mono">{verIncidencia.stackTrace}</pre>
            </div>
          )}
          {verIncidencia.contexto && (
            <div className="mt-3">
              <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide mb-2">Contexto de la request</div>
              <pre className="bg-[#0e1117] rounded-lg p-3 text-[11px] text-[#9ba8b6] overflow-auto max-h-48 font-mono">{JSON.stringify(verIncidencia.contexto, null, 2)}</pre>
            </div>
          )}
        </Modal>
      )}

      {/* Modal marcar resuelta */}
      {resolviendo && (
        <Modal open title="Marcar incidencia como resuelta" onClose={() => setResolviendo(null)} size="sm"
          footer={<>
            <Btn variant="secondary" onClick={() => setResolviendo(null)}>Cancelar</Btn>
            <Btn variant="primary" onClick={confirmarResolucion}><CheckCircle2 size={13} /> Confirmar</Btn>
          </>}>
          <p className="text-[13px] text-[#9ba8b6] leading-relaxed mb-3">{resolviendo.mensaje}</p>
          <label className="block text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide mb-1.5">Nota de resolución (opcional)</label>
          <Textarea
            className="min-h-20 resize-none"
            placeholder="Ej: se corrigió el bug en el cálculo de stock..."
            value={notaResolucion}
            onChange={e => setNotaResolucion(e.target.value)}
          />
        </Modal>
      )}
    </div>
  )
}
