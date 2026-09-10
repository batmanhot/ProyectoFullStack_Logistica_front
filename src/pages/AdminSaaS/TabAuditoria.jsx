import { useEffect, useState } from 'react'
import {
  ScrollText, Search, Download, ChevronLeft, ChevronRight, ShieldCheck, Save, Building2, Landmark,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  KpiCard, Badge, Btn, Input, Select, TableWrap, Th, Td, Alert, Field,
} from '../../components/ui/index'
import {
  useAuditoriaPlataforma, useAuditoriaResumen, useAuditoriaSistema,
  usePlataformaConfig, useGuardarPlataformaConfig,
} from '../../queries/admin.queries'
import { api } from '../../services/api'
import { descargarCsv } from './_shared'

// ══════════════════════════════════════════════════════════
// TAB: AUDITORÍA — Bitácora unificada
//   · Plataforma   → AuditoriaPlataforma (lo que hacen los Administradores de Plataforma)
//   · Sistema log. → Auditoria de cada tenant (operaciones de los negocios)
// ══════════════════════════════════════════════════════════

const SUB_TABS = [
  { id: 'eventos',       label: 'Eventos' },
  { id: 'exportaciones', label: 'Exportaciones' },
  { id: 'retencion',     label: 'Retención' },
]

const AMBITOS = [
  { id: 'plataforma', label: 'Plataforma',        icon: Landmark },
  { id: 'sistema',    label: 'Sistema logístico', icon: Building2 },
]

const TIPOS_PLATAFORMA = ['Todos', 'Seguridad', 'Suscripción', 'Operación', 'Soporte', 'Alerta']
const ACCIONES_SISTEMA = ['Todas', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGIN_FAILED']

const CATEGORIA_BADGE = {
  Seguridad: 'info', Suscripción: 'teal', Operación: 'neutral', Soporte: 'neutral', Alerta: 'warning',
  CREATE: 'success', UPDATE: 'info', DELETE: 'danger', LOGIN: 'neutral', LOGOUT: 'neutral', LOGIN_FAILED: 'warning',
}

function fechaCorta(ts) {
  try { return format(new Date(ts), 'd MMM · HH:mm', { locale: es }) }
  catch { return '—' }
}

export default function TabAuditoria({ negocios = [], toast }) {
  const [subTab, setSubTab] = useState('eventos')
  const [ambito, setAmbito] = useState('plataforma')
  const [tipo, setTipo] = useState('Todos')
  const [accion, setAccion] = useState('Todas')
  const [negocioId, setNegocioId] = useState('')
  const [busqInput, setBusqInput] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [exportando, setExportando] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => { setBusqueda(busqInput); setPage(1) }, 350)
    return () => clearTimeout(id)
  }, [busqInput])
  useEffect(() => { setPage(1) }, [tipo, accion, negocioId, ambito])

  const esPlataforma = ambito === 'plataforma'

  const { data: resumen } = useAuditoriaResumen()
  const plat = useAuditoriaPlataforma({ tipo, busqueda, page, pageSize })
  const sist = useAuditoriaSistema({ empresaId: negocioId || undefined, accion, busqueda, page, pageSize })
  const activa = esPlataforma ? plat : sist

  const { data: config } = usePlataformaConfig()
  const guardarConfig = useGuardarPlataformaConfig()

  const items = activa.data?.items || []
  const total = activa.data?.total ?? 0
  const totalPaginas = Math.max(1, Math.ceil(total / pageSize))
  const isFetching = activa.isFetching
  const kpisSis = sist.data?.kpis || {}
  const parcial = sist.data?.parcial

  const [retencion, setRetencion] = useState('')
  useEffect(() => {
    if (config?.retencionAuditoriaDias != null) setRetencion(String(config.retencionAuditoriaDias))
  }, [config?.retencionAuditoriaDias])

  async function guardarRetencion() {
    const n = parseInt(retencion, 10)
    if (!Number.isInteger(n) || n < 30 || n > 3650) { toast('La retención debe estar entre 30 y 3650 días.', 'error'); return }
    const res = await guardarConfig.mutateAsync({ retencionAuditoriaDias: n })
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Política de retención actualizada', 'success')
  }

  async function exportarTodo() {
    setExportando(true)
    try {
      const base = esPlataforma ? '/admin/auditoria' : '/admin/auditoria/sistema'
      const filas = [['Fecha', 'Ámbito', 'Negocio', 'Actor', 'Acción', 'Categoría', 'Resultado']]
      for (let p = 1; p <= 100; p++) {
        const qs = new URLSearchParams({ page: String(p), pageSize: '100' })
        if (esPlataforma && tipo !== 'Todos') qs.set('tipo', tipo)
        if (!esPlataforma && accion !== 'Todas') qs.set('accion', accion)
        if (!esPlataforma && negocioId) qs.set('empresaId', negocioId)
        if (busqueda) qs.set('busqueda', busqueda)
        const res = await api.get(`${base}?${qs}`, { authType: 'admin' })
        const lote = res.data?.items || []
        for (const r of lote) filas.push([
          new Date(r.timestamp).toISOString().slice(0, 19).replace('T', ' '),
          r.ambito === 'sistema' ? 'Sistema logístico' : 'Plataforma',
          r.empresaNombre || '—', r.actor, r.accion, r.tipo,
          r.resultado === 'requiere_atencion' ? 'Requiere atención' : 'Exitoso',
        ])
        if (lote.length < 100) break
      }
      descargarCsv(`bitacora-${ambito}-${new Date().toISOString().slice(0, 10)}`, filas)
      toast(`${filas.length - 1} evento(s) exportado(s)`, 'success')
    } catch {
      toast('No se pudo generar la exportación', 'error')
    } finally {
      setExportando(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* KPIs — cambian según el ámbito */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {esPlataforma ? (
          <>
            <KpiCard label="Eventos de plataforma" value={(resumen?.total ?? 0).toLocaleString()} sub="Bitácora acumulada" accentColor="#6366f1" icon={<Landmark size={30}/>} />
            <KpiCard label="Requieren atención" value={resumen?.requierenAtencion ?? 0} sub="Incidentes detectados" accentColor={(resumen?.requierenAtencion ?? 0) > 0 ? '#f59e0b' : '#22c55e'} icon={<ShieldCheck size={30}/>} />
            <KpiCard label="Retención configurada" value={`${resumen?.retencionDias ?? config?.retencionAuditoriaDias ?? 365} días`} sub="Purga diaria a las 3:00" accentColor="#3b82f6" icon={<ScrollText size={30}/>} />
          </>
        ) : (
          <>
            <KpiCard label={negocioId ? 'Eventos del negocio' : 'Eventos recientes'} value={(kpisSis.total ?? 0).toLocaleString()} sub={negocioId ? 'Bitácora del tenant' : 'Últimos por negocio'} accentColor="#00c896" icon={<Building2 size={30}/>} />
            <KpiCard label="Eventos hoy" value={kpisSis.hoy ?? 0} sub="Actividad de operación" accentColor="#3b82f6" icon={<ScrollText size={30}/>} />
            <KpiCard label={negocioId ? 'Usuarios distintos' : 'Negocios con actividad'} value={negocioId ? (kpisSis.usuarios ?? 0) : (kpisSis.negocios ?? 0)} sub={negocioId ? 'En el rango consultado' : 'En la muestra reciente'} accentColor="#6366f1" icon={<ShieldCheck size={30}/>} />
          </>
        )}
      </div>

      {/* Sub-navegación */}
      <div className="flex gap-1 border-b border-[var(--border)]">
        {SUB_TABS.map(t => (
          <button key={t.id} type="button" onClick={() => setSubTab(t.id)}
            className={`px-3.5 py-2 text-[12px] font-semibold -mb-px border-b-2 transition-colors ${
              subTab === t.id ? 'border-[var(--accent)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── EVENTOS ── */}
      {subTab === 'eventos' && (
        <div className="space-y-3">
          {/* Selector de ámbito */}
          <div className="inline-flex rounded-lg border border-[var(--border)] overflow-hidden">
            {AMBITOS.map(a => {
              const Ico = a.icon
              return (
                <button key={a.id} type="button" onClick={() => setAmbito(a.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-semibold transition-colors ${
                    ambito === a.id ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'bg-[var(--bg-muted)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}>
                  <Ico size={13}/>{a.label}
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <Input value={busqInput} onChange={e => setBusqInput(e.target.value)} placeholder="Buscar actor, acción o recurso…" className="pl-8" />
            </div>
            {!esPlataforma && (
              <Select value={negocioId} onChange={e => setNegocioId(e.target.value)} style={{ width: 220 }}>
                <option value="">Todos los negocios</option>
                {[...negocios].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '')).map(n => (
                  <option key={n.id} value={n.id}>{n.nombre}</option>
                ))}
              </Select>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(esPlataforma ? TIPOS_PLATAFORMA : ACCIONES_SISTEMA).map(v => {
              const activo = esPlataforma ? tipo === v : accion === v
              return (
                <button key={v} type="button" onClick={() => esPlataforma ? setTipo(v) : setAccion(v)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${
                    activo ? 'bg-[var(--accent-dim)] border-[var(--accent)]/40 text-[var(--accent)]' : 'bg-[var(--bg-muted)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}>
                  {v}
                </button>
              )
            })}
          </div>

          {!esPlataforma && parcial && !negocioId && (
            <Alert variant="info">Vista combinada: muestra los eventos más recientes de cada negocio. Elige un negocio para ver su bitácora completa y paginada.</Alert>
          )}

          {items.length === 0 ? (
            <Alert variant="info">{isFetching ? 'Cargando…' : 'No hay eventos que coincidan con el filtro.'}</Alert>
          ) : (
            <>
              <TableWrap>
                <thead>
                  <tr><Th>Fecha</Th><Th>Ámbito</Th><Th>Negocio</Th><Th>Actor</Th><Th>Acción</Th><Th>Categoría</Th><Th>Resultado</Th></tr>
                </thead>
                <tbody>
                  {items.map(r => (
                    <tr key={r.id} className="border-t border-white/5 hover:bg-white/2">
                      <Td muted>{fechaCorta(r.timestamp)}</Td>
                      <Td>
                        <Badge variant={r.ambito === 'sistema' ? 'teal' : 'info'}>
                          {r.ambito === 'sistema' ? 'Negocio' : 'Plataforma'}
                        </Badge>
                      </Td>
                      <Td muted>{r.empresaNombre || '—'}</Td>
                      <Td><span className="font-medium text-[var(--text-primary)]">{r.actor}</span></Td>
                      <Td>
                        <div className="text-[var(--text-primary)]">{r.accion}</div>
                        {r.modulo && <div className="text-[11px] text-[var(--text-muted)]">{r.modulo}</div>}
                      </Td>
                      <Td><Badge variant={CATEGORIA_BADGE[r.tipo] || 'neutral'}>{r.tipo}</Badge></Td>
                      <Td>
                        <Badge variant={r.resultado === 'requiere_atencion' ? 'warning' : 'success'}>
                          {r.resultado === 'requiere_atencion' ? 'Requiere atención' : 'Exitoso'}
                        </Badge>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
              <div className="flex items-center justify-between text-[12px] text-[var(--text-muted)]">
                <span>{total.toLocaleString()} evento(s){isFetching ? ' · actualizando…' : ''}</span>
                <div className="flex items-center gap-2">
                  <Btn variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}><ChevronLeft size={13}/></Btn>
                  <span>Página {page} de {totalPaginas}</span>
                  <Btn variant="ghost" size="sm" disabled={page >= totalPaginas} onClick={() => setPage(p => Math.min(totalPaginas, p + 1))}><ChevronRight size={13}/></Btn>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── EXPORTACIONES ── */}
      {subTab === 'exportaciones' && (
        <div className="space-y-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Descargar bitácora</h3>
            <p className="text-[12px] text-[var(--text-muted)] mt-1">
              Genera un CSV con el ámbito <span className="font-semibold">{esPlataforma ? 'Plataforma' : 'Sistema logístico'}</span> y el filtro actual.
            </p>
            <div className="mt-3">
              <Btn variant="primary" onClick={exportarTodo} disabled={exportando}>
                <Download size={14}/>{exportando ? 'Generando…' : 'Exportar CSV'}
              </Btn>
            </div>
          </div>
          <Alert variant="info">Las exportaciones se descargan al instante y no se archivan en el servidor.</Alert>
        </div>
      )}

      {/* ── RETENCIÓN ── */}
      {subTab === 'retencion' && (
        <div className="space-y-4 max-w-md">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4">
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Política de retención · Plataforma</h3>
            <p className="text-[12px] text-[var(--text-muted)] mt-1 mb-3">
              Un proceso automático elimina cada día a las 3:00 los eventos de <span className="font-semibold">plataforma</span> más
              antiguos que este límite (30 a 3650 días). La bitácora de cada negocio la administra el propio negocio.
            </p>
            <Field label="Días a conservar">
              <Input type="number" min="30" max="3650" value={retencion} onChange={e => setRetencion(e.target.value)} />
            </Field>
            <div className="mt-3">
              <Btn variant="primary" onClick={guardarRetencion} disabled={guardarConfig.isPending || retencion === String(config?.retencionAuditoriaDias ?? '')}>
                <Save size={14}/>Guardar política
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
