import { useMemo, useState } from 'react'
import {
  DatabaseBackup, ShieldCheck, ShieldAlert, AlertTriangle, Search, Download, Save, RefreshCw,
  FileClock, CheckCircle, Lock, HardDriveDownload, ChevronLeft, ChevronRight, XCircle,
} from 'lucide-react'
import {
  Modal, EmptyState, Badge, Btn, Field, TableWrap, Th, Td, KpiCard, Input, Select, Textarea, Toggle, Alert,
} from '../../components/ui/index'
import { fdate, descargarCsv } from './_shared'
import {
  useRespaldos, useRespaldosResumen, useRestauraciones, useRespaldoDestinos, useRespaldoActividad, useRespaldo,
  useCrearRespaldo, useVerificarIntegridad,
  useSolicitarRestauracion, useRegistrarAprobacionRestauracion, useEjecutarRestauracion, useRechazarRestauracion,
} from '../../queries/admin.queries'

// ══════════════════════════════════════════════════════════
// TAB: BACKUPS — continuidad operativa (registro y gobierno)
//   Respaldos / Restauraciones / Destino y política / Actividad
//   Registra el flujo; la ejecución real (worker + storage + KMS) va aparte.
// ══════════════════════════════════════════════════════════

const SUB_TABS = [
  { id: 'respaldos',   label: 'Respaldos' },
  { id: 'restauraciones', label: 'Restauraciones' },
  { id: 'destino',     label: 'Destino y política' },
  { id: 'actividad',   label: 'Actividad' },
]

const ALCANCES = [
  { id: 'base_datos', label: 'Base de datos' },
  { id: 'base_datos_archivos', label: 'Base de datos y archivos' },
  { id: 'configuracion', label: 'Configuración SaaS' },
]
const ALCANCE_LABEL = Object.fromEntries(ALCANCES.map(a => [a.id, a.label]))

const ESTADO_RESP = {
  VALIDANDO:  { label: 'Validando',  badge: 'warning' },
  COMPLETADO: { label: 'Completado', badge: 'success' },
  FALLIDO:    { label: 'Fallido',    badge: 'danger'  },
}
const INTEGRIDAD = {
  PENDIENTE:         { label: 'Pendiente',         badge: 'warning' },
  VERIFICADO:        { label: 'Verificado',        badge: 'success' },
  CON_OBSERVACIONES: { label: 'Con observaciones', badge: 'warning' },
}
const ESTADO_REST = {
  PENDIENTE_APROBACION: { label: 'Pendiente de aprobación', badge: 'warning' },
  APROBADA:             { label: 'Aprobada',                badge: 'info'    },
  EN_EJECUCION:         { label: 'En ejecución',            badge: 'info'    },
  RESTAURADA:           { label: 'Restaurada',              badge: 'success' },
  RECHAZADA:            { label: 'Rechazada',               badge: 'danger'  },
}
const EVENTO_LABEL = {
  respaldo_creado: 'Respaldo registrado',
  respaldo_fallido: 'Respaldo falló',
  integridad_verificada: 'Integridad verificada',
  estado_actualizado: 'Estado actualizado',
  prueba_restauracion: 'Prueba de restore',
  restauracion_solicitada: 'Restauración solicitada',
  aprobacion_registrada: 'Aprobación registrada',
  restauracion_ejecutada: 'Restauración ejecutada',
  restauracion_fallida: 'Restauración falló',
  restauracion_rechazada: 'Restauración rechazada',
}

const PAGE_SIZE = 25
const EMPTY = []

const gbFmt = bytes => (bytes == null ? '—' : `${(bytes / 1e9).toLocaleString('es-PE', { maximumFractionDigits: 2 })} GB`)

const ORIGEN = { automatico: { label: 'Automático', badge: 'info' }, manual: { label: 'Manual', badge: 'neutral' } }

/** "hace 3 h" / "hace 2 d" / "—". */
function relTime(iso) {
  if (!iso) return 'nunca'
  const h = (Date.now() - new Date(iso).getTime()) / 3.6e6
  if (h < 1) return 'hace <1 h'
  if (h < 48) return `hace ${Math.round(h)} h`
  return `hace ${Math.round(h / 24)} d`
}

export default function TabBackups({ negocios = [], toast }) {
  const [subTab, setSubTab] = useState('respaldos')
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [page, setPage] = useState(1)
  const [crearOpen, setCrearOpen] = useState(false)
  const [detalleId, setDetalleId] = useState(null)
  const [solicitar, setSolicitar] = useState(null)  // respaldo
  const [aprobar, setAprobar] = useState(null)      // restauración
  const [ejecutar, setEjecutar] = useState(null)    // restauración
  const [rechazar, setRechazar] = useState(null)    // restauración

  const filtros = useMemo(
    () => ({ estado: filtroEstado, busqueda: search.trim() || undefined, page, pageSize: PAGE_SIZE }),
    [filtroEstado, search, page],
  )
  const { data: lista = { items: [], total: 0 }, isLoading } = useRespaldos(filtros)
  const { data: resumen = {} } = useRespaldosResumen()
  const { data: restauraciones = [] } = useRestauraciones()
  const { data: destinos = [] } = useRespaldoDestinos()
  const { data: actividad = [] } = useRespaldoActividad()

  const verificar = useVerificarIntegridad()

  const items = lista.items || EMPTY
  const totalPages = Math.max(1, Math.ceil((lista.total || 0) / PAGE_SIZE))

  async function handleVerificar(r, resultado) {
    const res = await verificar.mutateAsync({ id: r.id, resultado })
    if (res?.error) { toast(res.error, 'error'); return }
    toast(resultado === 'VERIFICADO' ? 'Integridad verificada' : 'Observación registrada', 'success')
  }

  function exportar() {
    const filas = [
      ['Negocio', 'Alcance', 'Estado', 'Integridad', 'Fecha', 'Tamaño', 'Destino', 'Retención (días)', 'Cifrado'],
      ...items.map(r => [
        r.empresaNombre, r.alcanceLabel, ESTADO_RESP[r.estado]?.label || r.estado,
        INTEGRIDAD[r.integridad]?.label || r.integridad, String(r.createdAt).slice(0, 10),
        gbFmt(r.tamanoBytes), r.destinoNombre, r.retencionDias, r.cifrado ? 'sí' : 'no',
      ]),
    ]
    descargarCsv(`backups-${new Date().toISOString().slice(0, 10)}`, filas)
    toast(`${items.length} respaldo(s) exportado(s)`, 'success')
  }

  const ultimoTxt = relTime(resumen.ultimoBackupAt)
  const pruebaOk = resumen.ultimaPrueba?.resultado === 'ok'

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Último backup"
          value={ultimoTxt}
          sub={resumen.backupAtrasado ? 'El job nocturno no reportó — revisar' : 'Job de respaldo al día'}
          accentColor={resumen.backupAtrasado ? '#ef4444' : '#22c55e'}
          icon={<DatabaseBackup size={30}/>}
          mono
        />
        <KpiCard label="Respaldos completados" value={resumen.completados ?? 0} sub={`${resumen.verificados ?? 0} verificados`} accentColor="#3b82f6" icon={<ShieldCheck size={30}/>} />
        <KpiCard label="Restauraciones pendientes" value={resumen.restauracionesPendientes ?? 0} sub="Requieren aprobación o ejecución" accentColor={resumen.restauracionesPendientes > 0 ? '#f59e0b' : '#22c55e'} icon={<RefreshCw size={30}/>} />
        <KpiCard
          label="Prueba de restore"
          value={resumen.ultimaPrueba ? (pruebaOk ? 'OK' : 'Falló') : '—'}
          sub={resumen.ultimaPrueba ? `${fdate(resumen.ultimaPrueba.ejecutadaEn)}` : 'Sin corridas aún'}
          accentColor={!resumen.ultimaPrueba ? '#64748b' : pruebaOk ? '#22c55e' : '#ef4444'}
          icon={<CheckCircle size={30}/>}
          mono
        />
      </div>

      {/* Banner: cómo está montado el proceso */}
      <div className="flex gap-3 p-4 rounded-xl border border-blue-500/25 bg-blue-500/10">
        <ShieldCheck size={18} className="text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-[13px] font-semibold text-[var(--text-primary)]">Proceso de respaldo</p>
          <p className="text-[12px] text-[var(--text-muted)] mt-1 leading-relaxed">
            Un job externo toma el <span className="font-semibold">pg_dump completo</span> (DR) y los <span className="font-semibold">exports por negocio</span>,
            los cifra y sube al object storage, y los registra acá. La restauración por negocio exige solicitud +
            aprobación documentada del cliente y la ejecuta un operador en ventana de mantenimiento
            (<span className="font-mono">restore-tenant.mjs</span>). Ver <span className="font-mono">docs/BACKUP-RESTORE.md</span>.
          </p>
        </div>
      </div>

      {/* Sub-navegación + acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)]">
        <div className="flex gap-1">
          {SUB_TABS.map(t => (
            <button key={t.id} type="button" onClick={() => setSubTab(t.id)}
              className={`px-3.5 py-2 text-[12px] font-semibold -mb-px border-b-2 transition-colors ${
                subTab === t.id ? 'border-[var(--accent)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}>
              {t.label}
              {t.id === 'restauraciones' && resumen.restauracionesPendientes > 0 && (
                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">{resumen.restauracionesPendientes}</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="secondary" onClick={exportar}><Download size={14}/>Exportar</Btn>
          <Btn variant="primary" onClick={() => setCrearOpen(true)}><DatabaseBackup size={14}/>Crear respaldo</Btn>
        </div>
      </div>

      {/* ── RESPALDOS ── */}
      {subTab === 'respaldos' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Buscar por negocio, alcance o destino…" className="pl-8" />
            </div>
            <Select value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPage(1) }} style={{ width: 150 }}>
              <option>Todos</option>
              <option value="VALIDANDO">Validando</option>
              <option value="COMPLETADO">Completado</option>
              <option value="FALLIDO">Fallido</option>
            </Select>
            <span className="text-[12px] text-[var(--text-muted)] ml-auto">{lista.total || 0} respaldo(s)</span>
          </div>

          {isLoading ? (
            <div className="text-[12px] text-[var(--text-muted)] py-8 text-center">Cargando respaldos…</div>
          ) : items.length === 0 ? (
            <EmptyState icon={DatabaseBackup} title="Sin respaldos" description="Registra el primer respaldo de un negocio para gobernar su recuperación." />
          ) : (
            <>
              <TableWrap>
                <thead>
                  <tr><Th>Negocio</Th><Th>Alcance / origen</Th><Th>Fecha / tamaño</Th><Th>Destino</Th><Th>Estado</Th><Th>Integridad</Th><Th right>Acciones</Th></tr>
                </thead>
                <tbody>
                  {items.map(r => (
                    <tr key={r.id} className="border-t border-white/5 hover:bg-white/2 cursor-pointer" onClick={() => setDetalleId(r.id)}>
                      <Td>
                        <div className="font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                          {r.esPlataforma && <Lock size={11} className="text-[var(--accent)]" />}{r.empresaNombre}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)]">Retención {r.retencionDias} días</div>
                      </Td>
                      <Td>
                        <div className="text-[var(--text-primary)]">{r.alcanceLabel}</div>
                        <div className="mt-0.5"><Badge variant={ORIGEN[r.origen]?.badge || 'neutral'}>{ORIGEN[r.origen]?.label || r.origen}</Badge></div>
                      </Td>
                      <Td>
                        <div className="text-[13px] text-[var(--text-primary)]">{fdate(r.createdAt)}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">{gbFmt(r.tamanoBytes)}</div>
                      </Td>
                      <Td>
                        <div className="text-[13px] text-[var(--text-primary)] max-w-[220px] truncate" title={r.destinoNombre}>{r.destinoNombre}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">{r.destinoRegion}</div>
                      </Td>
                      <Td><Badge variant={ESTADO_RESP[r.estado]?.badge}>{ESTADO_RESP[r.estado]?.label || r.estado}</Badge></Td>
                      <Td><Badge variant={INTEGRIDAD[r.integridad]?.badge}>{INTEGRIDAD[r.integridad]?.label || r.integridad}</Badge></Td>
                      <Td right onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {r.integridad !== 'VERIFICADO' && (
                            <Btn variant="ghost" size="sm" onClick={() => handleVerificar(r, 'VERIFICADO')}><CheckCircle size={12}/>Verificar</Btn>
                          )}
                          {r.estado === 'COMPLETADO' && (
                            <Btn variant="ghost" size="sm" onClick={() => setSolicitar(r)}><HardDriveDownload size={12}/>Restaurar</Btn>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
              {totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 text-[12px] text-[var(--text-muted)]">
                  <Btn variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={13}/>Anterior</Btn>
                  <span>Página {page} de {totalPages}</span>
                  <Btn variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente<ChevronRight size={13}/></Btn>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── RESTAURACIONES ── */}
      {subTab === 'restauraciones' && (
        <div className="space-y-2">
          {restauraciones.length === 0 ? (
            <Alert variant="info">No hay solicitudes de restauración.</Alert>
          ) : restauraciones.map(s => (
            <div key={s.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border)]">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold text-[var(--text-primary)]">{s.empresaNombre}</span>
                  <Badge variant={ESTADO_REST[s.estado]?.badge}>{ESTADO_REST[s.estado]?.label || s.estado}</Badge>
                </div>
                <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                  {s.respaldoAlcance || 'Respaldo no disponible'} · {gbFmt(s.respaldoTamanoBytes)} · {fdate(s.respaldoCreadoEn)}
                </p>
                <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Motivo: {s.motivo}</p>
                {s.aprobacionEvidencia && <p className="text-[11px] text-emerald-400 mt-0.5">Aprobación: {s.aprobacionEvidencia} · {s.aprobacionContacto}</p>}
                {s.rechazoMotivo && <p className="text-[11px] text-red-400 mt-0.5">Rechazo: {s.rechazoMotivo}</p>}
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap">
                {s.estado === 'PENDIENTE_APROBACION' && (
                  <>
                    <Btn variant="primary" size="sm" onClick={() => setAprobar(s)}><CheckCircle size={13}/>Registrar aprobación</Btn>
                    <Btn variant="danger" size="sm" onClick={() => setRechazar(s)}><XCircle size={13}/>Rechazar</Btn>
                  </>
                )}
                {s.estado === 'APROBADA' && (
                  <Btn variant="primary" size="sm" onClick={() => setEjecutar(s)}><RefreshCw size={13}/>Ejecutar restauración</Btn>
                )}
                {s.estado === 'RESTAURADA' && <Badge variant="success">Ejecutada {fdate(s.ejecutadoEn)}</Badge>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── DESTINO Y POLÍTICA ── */}
      {subTab === 'destino' && (
        <div className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)]">Política de seguridad</p>
              <h4 className="text-[14px] font-bold text-[var(--text-primary)] mt-1.5">Destino administrado por contrato</h4>
              <p className="text-[12px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
                La ubicación de cada negocio se hereda de su servicio contratado. El SuperAdmin puede crear, verificar y
                restaurar respaldos, pero no redireccionarlos a destinos no aprobados.
              </p>
              <div className="grid grid-cols-3 gap-2 mt-4">
                {[['Cifrado', 'AES-256'], ['Retención', 'Según plan'], ['Restauración', 'Con aprobación']].map(([l, v]) => (
                  <div key={l} className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-2.5">
                    <p className="text-[10px] text-[var(--text-muted)]">{l}</p>
                    <p className="text-[12px] font-semibold text-[var(--text-primary)] mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
              <ShieldAlert size={18} className="text-amber-400" />
              <h4 className="text-[13px] font-bold text-[var(--text-primary)] mt-2">Regla de restauración</h4>
              <p className="text-[12px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
                No se ejecuta ninguna recuperación sin registrar quién autorizó al cliente, evidencia de aprobación y
                motivo de la solicitud.
              </p>
            </div>
          </div>

          <TableWrap>
            <thead>
              <tr><Th>Negocio</Th><Th>Ubicación contratada</Th><Th>Región</Th><Th>Retención</Th><Th>Protección</Th></tr>
            </thead>
            <tbody>
              {destinos.map(d => (
                <tr key={d.empresaId} className="border-t border-white/5">
                  <Td><div className="font-medium text-[var(--text-primary)]">{d.empresaNombre}</div></Td>
                  <Td muted>{d.destinoNombre}</Td>
                  <Td muted>{d.region}</Td>
                  <Td muted>{d.retencionDias} días</Td>
                  <Td><Badge variant="success">Cifrado activo</Badge></Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </div>
      )}

      {/* ── ACTIVIDAD ── */}
      {subTab === 'actividad' && (
        <div className="space-y-2">
          {actividad.length === 0 ? (
            <Alert variant="info">No hay actividad registrada.</Alert>
          ) : actividad.map(e => (
            <div key={e.id} className="flex items-center gap-3.5 p-3.5 bg-[var(--bg-card)] rounded-xl border border-[var(--border)]">
              <span className="w-9 h-9 rounded-xl bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center shrink-0">
                <FileClock size={16} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[var(--text-primary)]">{EVENTO_LABEL[e.tipo] || e.tipo}</p>
                <p className="text-[12px] text-[var(--text-muted)] mt-0.5">{e.empresaNombre || 'Operación de plataforma'} · {e.detalle}</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">por {e.actor}</p>
              </div>
              <span className="text-[12px] text-[var(--text-muted)] shrink-0">{fdate(e.fecha)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Modales */}
      {crearOpen && <ModalCrear onClose={() => setCrearOpen(false)} negocios={negocios} toast={toast} />}
      {solicitar && <ModalSolicitar respaldo={solicitar} onClose={() => setSolicitar(null)} toast={toast} />}
      {aprobar && <ModalAprobar restauracion={aprobar} onClose={() => setAprobar(null)} toast={toast} />}
      {ejecutar && <ModalEjecutar restauracion={ejecutar} onClose={() => setEjecutar(null)} toast={toast} />}
      {rechazar && <ModalRechazar restauracion={rechazar} onClose={() => setRechazar(null)} toast={toast} />}
      <ModalDetalle id={detalleId} onClose={() => setDetalleId(null)} onSolicitar={r => { setDetalleId(null); setSolicitar(r) }} />
    </div>
  )
}

// ── Modal: crear (registrar) respaldo ──────────────────────
function ModalCrear({ onClose, negocios, toast }) {
  const crear = useCrearRespaldo()
  const [form, setForm] = useState({ empresaId: negocios[0]?.id || '', alcance: 'base_datos', tamanoGb: '', retencionDias: 90, cifrado: true, estado: 'VALIDANDO', nota: '' })
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function guardar() {
    if (!form.empresaId) { toast('Selecciona un negocio', 'error'); return }
    const res = await crear.mutateAsync({
      empresaId: form.empresaId,
      alcance: form.alcance,
      tamanoBytes: form.tamanoGb ? Math.round(parseFloat(form.tamanoGb) * 1e9) : undefined,
      retencionDias: Number(form.retencionDias) || 90,
      cifrado: form.cifrado,
      estado: form.estado,
      nota: form.nota?.trim() || undefined,
    })
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Respaldo registrado', 'success')
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="Registrar respaldo" size="md"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" onClick={guardar} disabled={crear.isPending}><Save size={14}/>Registrar</Btn>
      </>}>
      <div className="space-y-4">
        <Alert variant="info">Esto <span className="font-semibold">registra</span> un respaldo ya tomado por infraestructura; no ejecuta el volcado.</Alert>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Negocio *">
            <Select value={form.empresaId} onChange={e => f('empresaId', e.target.value)}>
              <option value="">Seleccionar…</option>
              {negocios.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
            </Select>
          </Field>
          <Field label="Alcance">
            <Select value={form.alcance} onChange={e => f('alcance', e.target.value)}>
              {ALCANCES.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
            </Select>
          </Field>
          <Field label="Tamaño (GB)">
            <Input type="number" min="0" step="0.1" value={form.tamanoGb} onChange={e => f('tamanoGb', e.target.value)} placeholder="Opcional" />
          </Field>
          <Field label="Retención (días)">
            <Input type="number" min="1" max="3650" value={form.retencionDias} onChange={e => f('retencionDias', e.target.value)} />
          </Field>
          <Field label="Estado inicial">
            <Select value={form.estado} onChange={e => f('estado', e.target.value)}>
              <option value="VALIDANDO">Validando</option>
              <option value="COMPLETADO">Completado</option>
              <option value="FALLIDO">Fallido</option>
            </Select>
          </Field>
          <Field label="Cifrado">
            <div className="flex items-center h-9"><Toggle value={form.cifrado} onChange={v => f('cifrado', v)} label="Cifrado en destino" /></div>
          </Field>
        </div>
        <Field label="Nota (opcional)">
          <Textarea rows={2} value={form.nota} onChange={e => f('nota', e.target.value)} placeholder="Ventana de mantenimiento, job de origen, observación…" />
        </Field>
      </div>
    </Modal>
  )
}

// ── Modal: solicitar restauración ─────────────────────────
function ModalSolicitar({ respaldo, onClose, toast }) {
  const solicitar = useSolicitarRestauracion()
  const [motivo, setMotivo] = useState('')

  async function guardar() {
    if (!motivo.trim()) { toast('El motivo es obligatorio', 'error'); return }
    const res = await solicitar.mutateAsync({ id: respaldo.id, motivo: motivo.trim() })
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Solicitud enviada a aprobación del cliente', 'success')
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="Solicitar restauración" size="sm"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" onClick={guardar} disabled={solicitar.isPending}><HardDriveDownload size={14}/>Enviar solicitud</Btn>
      </>}>
      <div className="space-y-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] p-3 text-[12px]">
          <div className="text-[var(--text-primary)] font-medium">{respaldo.empresaNombre}</div>
          <div className="text-[var(--text-muted)] mt-0.5">{respaldo.alcanceLabel} · {gbFmt(respaldo.tamanoBytes)} · {fdate(respaldo.createdAt)}</div>
        </div>
        <Field label="Motivo de la restauración *" hint="Queda registrado; el cliente debe aprobarlo antes de ejecutar.">
          <Textarea rows={3} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej. pérdida de datos por error operativo del cliente el 09/09." />
        </Field>
        <Alert variant="warning">Ninguna restauración se ejecuta sin aprobación documentada del cliente.</Alert>
      </div>
    </Modal>
  )
}

// ── Modal: registrar aprobación ──────────────────────────
function ModalAprobar({ restauracion, onClose, toast }) {
  const aprobar = useRegistrarAprobacionRestauracion()
  const [form, setForm] = useState({ contacto: '', evidencia: '', nota: '' })
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function guardar() {
    if (!form.contacto.trim() || !form.evidencia.trim()) { toast('Contacto y evidencia son obligatorios', 'error'); return }
    const res = await aprobar.mutateAsync({ id: restauracion.id, contacto: form.contacto.trim(), evidencia: form.evidencia.trim(), nota: form.nota?.trim() || undefined })
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Aprobación del cliente registrada', 'success')
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="Registrar aprobación del cliente" size="sm"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" onClick={guardar} disabled={aprobar.isPending}><CheckCircle size={14}/>Registrar aprobación</Btn>
      </>}>
      <div className="space-y-4">
        <p className="text-[12px] text-[var(--text-secondary)]">{restauracion.empresaNombre} · {restauracion.motivo}</p>
        <Field label="Contacto que autorizó *" hint="Nombre y rol de quién, del lado del cliente, dio la autorización.">
          <Input value={form.contacto} onChange={e => f('contacto', e.target.value)} placeholder="Ej. Ana Pérez — Gerente de Operaciones" />
        </Field>
        <Field label="Evidencia de aprobación *" hint="Referencia verificable: N° de ticket, asunto del correo, acta.">
          <Input value={form.evidencia} onChange={e => f('evidencia', e.target.value)} placeholder="Ej. TICKET-8842 / correo 2026-09-10" />
        </Field>
        <Field label="Nota (opcional)">
          <Textarea rows={2} value={form.nota} onChange={e => f('nota', e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}

// ── Modal: ejecutar restauración ─────────────────────────
function ModalEjecutar({ restauracion, onClose, toast }) {
  const ejecutar = useEjecutarRestauracion()
  const [nota, setNota] = useState('')

  async function guardar() {
    const res = await ejecutar.mutateAsync({ id: restauracion.id, nota: nota.trim() || undefined })
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Restauración registrada como ejecutada', 'success')
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="Ejecutar restauración" size="sm"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" onClick={guardar} disabled={ejecutar.isPending}><RefreshCw size={14}/>Confirmar ejecución</Btn>
      </>}>
      <div className="space-y-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] p-3 text-[12px]">
          <div className="text-[var(--text-primary)] font-medium">{restauracion.empresaNombre}</div>
          <div className="text-emerald-400 mt-0.5">Aprobación: {restauracion.aprobacionEvidencia} · {restauracion.aprobacionContacto}</div>
        </div>
        <Alert variant="warning">Confirma que la restauración se realizó en el entorno del negocio. La acción queda en auditoría.</Alert>
        <Field label="Nota de ejecución (opcional)">
          <Textarea rows={2} value={nota} onChange={e => setNota(e.target.value)} placeholder="Punto de restauración usado, incidencias durante el proceso…" />
        </Field>
      </div>
    </Modal>
  )
}

// ── Modal: rechazar restauración ────────────────────────
function ModalRechazar({ restauracion, onClose, toast }) {
  const rechazar = useRechazarRestauracion()
  const [motivo, setMotivo] = useState('')

  async function guardar() {
    if (!motivo.trim()) { toast('El motivo del rechazo es obligatorio', 'error'); return }
    const res = await rechazar.mutateAsync({ id: restauracion.id, motivo: motivo.trim() })
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Solicitud de restauración rechazada', 'success')
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="Rechazar restauración" size="sm"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="danger" onClick={guardar} disabled={rechazar.isPending}><XCircle size={14}/>Rechazar solicitud</Btn>
      </>}>
      <div className="space-y-4">
        <p className="text-[12px] text-[var(--text-secondary)]">{restauracion.empresaNombre} · {restauracion.motivo}</p>
        <Field label="Motivo del rechazo *" hint="Queda en la bitácora de la solicitud y en la auditoría.">
          <Textarea rows={3} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej. el cliente no confirmó la autorización / se resolvió por otra vía." />
        </Field>
      </div>
    </Modal>
  )
}

// ── Modal: detalle del respaldo ─────────────────────────
function ModalDetalle({ id, onClose, onSolicitar }) {
  const { data: r, isLoading } = useRespaldo(id)
  return (
    <Modal open={!!id} onClose={onClose} title={r ? `Respaldo · ${r.empresaNombre}` : 'Detalle del respaldo'} size="lg">
      {isLoading || !r ? (
        <div className="text-[12px] text-[var(--text-muted)] py-8 text-center">Cargando…</div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={ESTADO_RESP[r.estado]?.badge}>{ESTADO_RESP[r.estado]?.label}</Badge>
            <Badge variant={INTEGRIDAD[r.integridad]?.badge}>{INTEGRIDAD[r.integridad]?.label}</Badge>
            {r.cifrado && <Badge variant="success">Cifrado</Badge>}
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
            {[
              ['Negocio', r.empresaNombre],
              ['Alcance', r.alcanceLabel],
              ['Origen', ORIGEN[r.origen]?.label || r.origen],
              ['Formato', r.formato || '—'],
              ['Fecha', fdate(r.createdAt)],
              ['Tamaño', gbFmt(r.tamanoBytes)],
              ['Destino', r.destinoNombre],
              ['Región', r.destinoRegion],
              ['Retención', `${r.retencionDias} días`],
              ['Registrado por', r.creadoPor],
              ['Ubicación (storage key)', r.storageKey || '— (respaldo solo registrado)'],
              ['Checksum SHA-256', r.checksum || '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-white/5 py-1">
                <span className="text-[var(--text-muted)] shrink-0">{k}</span>
                <span className="text-[var(--text-primary)] text-right font-mono text-[11px] break-all">{v}</span>
              </div>
            ))}
          </div>
          {r.nota && (
            <div className="rounded-xl bg-[var(--bg-muted)] p-3">
              <div className="text-[10px] uppercase text-[var(--text-muted)] mb-1">Nota</div>
              <p className="text-[12px] text-[var(--text-secondary)]">{r.nota}</p>
            </div>
          )}

          {r.estado === 'COMPLETADO' && (
            <Btn variant="secondary" size="sm" onClick={() => onSolicitar(r)}><HardDriveDownload size={13}/>Solicitar restauración</Btn>
          )}

          {r.restauraciones?.length > 0 && (
            <div>
              <div className="text-[12px] font-semibold text-[var(--text-primary)] mb-2">Restauraciones</div>
              <div className="space-y-1.5">
                {r.restauraciones.map(s => (
                  <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] p-2.5 text-[12px]">
                    <span className="text-[var(--text-muted)] truncate">{s.motivo}</span>
                    <Badge variant={ESTADO_REST[s.estado]?.badge}>{ESTADO_REST[s.estado]?.label}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-[12px] font-semibold text-[var(--text-primary)] mb-2">Actividad</div>
            <div className="space-y-2">
              {(r.eventos || []).map(e => (
                <div key={e.id} className="flex gap-3 rounded-lg border border-[var(--border)] p-2.5">
                  <span className="mt-1.5 w-2 h-2 rounded-full shrink-0 bg-[var(--accent)]" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold text-[var(--text-primary)]">{EVENTO_LABEL[e.tipo] || e.tipo}</span>
                      <span className="text-[11px] text-[var(--text-muted)]">{fdate(e.fecha)}</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{e.detalle} · {e.actor}</p>
                  </div>
                </div>
              ))}
              {(r.eventos || []).length === 0 && <p className="text-[11px] text-[var(--text-muted)]">Sin eventos.</p>}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
