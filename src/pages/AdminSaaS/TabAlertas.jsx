import { useMemo, useState } from 'react'
import {
  Bell, BellOff, Plus, Clock, CheckCircle, Edit2, Trash2, Save, Send, History,
  AlertTriangle, ShieldAlert, RotateCcw, CircleCheck,
} from 'lucide-react'
import {
  Modal, ConfirmDialog, EmptyState, Badge, Btn, KpiCard,
  Field, TableWrap, Th, Td, Alert, Toggle, Input, Textarea, Select,
} from '../../components/ui/index'
import {
  useHistorialAlertasEnvios, useEnviarAlertasPendientes,
  useSaludAlertas, useResolverAlertaSalud, useReabrirAlertaSalud,
} from '../../queries/admin.queries'

// ══════════════════════════════════════════════════════════
// TAB: ALERTAS — Centro de Alertas del SuperAdmin
// Bandeja (salud del sistema) · Reglas (avisos de vencimiento) · Historial
// ══════════════════════════════════════════════════════════

const SUB_TABS = [
  { id: 'bandeja',   label: 'Bandeja' },
  { id: 'reglas',    label: 'Reglas' },
  { id: 'historial', label: 'Historial' },
]

const SEVERIDAD = {
  critica: { label: 'Crítica', dot: 'bg-red-500',    text: 'text-red-400',    badge: 'danger'  },
  alta:    { label: 'Alta',    dot: 'bg-orange-500', text: 'text-orange-400', badge: 'warning' },
  media:   { label: 'Media',   dot: 'bg-yellow-500', text: 'text-yellow-400', badge: 'warning' },
  info:    { label: 'Info',    dot: 'bg-blue-500',   text: 'text-blue-400',   badge: 'info'    },
}

const CATEGORIA_LABEL = {
  vencimiento:     'Vencimiento',
  limite_excedido: 'Tope excedido',
  limite_al_borde: 'Tope al borde',
  entrega_fallando:'Entrega fallando',
  sin_email:       'Sin email',
  configuracion:   'Configuración',
}

const FILTROS_ESTADO = [
  { id: 'activas',     label: 'Activas' },
  { id: 'silenciadas', label: 'Silenciadas' },
  { id: 'resueltas',   label: 'Resueltas' },
  { id: 'todas',       label: 'Todas' },
]

export default function TabAlertas({ alertas, vencimientos, crearAlerta, actualizarAlerta, eliminarAlerta, toast }) {
  const [subTab, setSubTab]     = useState('bandeja')
  const [modalOpen, setModal]   = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm]         = useState({})
  const [confirmDel, setConfirmDel] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('activas')
  const [accionAlerta, setAccionAlerta] = useState(null) // { alerta, modo: 'resolver' | 'silenciar' }
  const [accionForm, setAccionForm] = useState({ nota: '', silenciarDias: '30' })
  const [filtroHist, setFiltroHist] = useState('todos')
  const CANALES = ['email', 'sistema', 'whatsapp', 'sms']

  const { data: envios = [] } = useHistorialAlertasEnvios()
  const { data: salud = [], isLoading: saludLoading } = useSaludAlertas()
  const enviarPendientes = useEnviarAlertasPendientes()
  const resolver = useResolverAlertaSalud()
  const reabrir  = useReabrirAlertaSalud()

  const kpis = useMemo(() => ({
    criticas: salud.filter(a => a.estado === 'nueva' && a.severidad === 'critica').length,
    atencion: salud.filter(a => a.estado === 'nueva').length,
    reglasActivas: alertas.filter(a => a.activa).length,
    reglasTotal: alertas.length,
    entregasFallando: salud.filter(a => a.categoria === 'entrega_fallando').length,
  }), [salud, alertas])

  const bandeja = useMemo(() => {
    if (filtroEstado === 'todas') return salud
    if (filtroEstado === 'activas') return salud.filter(a => a.estado === 'nueva')
    if (filtroEstado === 'silenciadas') return salud.filter(a => a.estado === 'silenciada')
    return salud.filter(a => a.estado === 'resuelta')
  }, [salud, filtroEstado])

  const enviosFiltrados = useMemo(
    () => filtroHist === 'todos' ? envios : envios.filter(e => e.estado === filtroHist),
    [envios, filtroHist],
  )

  async function handleEnviarAhora() {
    const res = await enviarPendientes.mutateAsync()
    if (res?.error) { toast(res.error, 'error'); return }
    const { enviados = 0, fallidos = 0, omitidos = 0 } = res?.data ?? {}
    if (enviados === 0 && fallidos === 0) toast(`Nada por enviar ahora — ${omitidos} negocio(s) omitido(s) (ya avisados, sin regla de email aplicable o sin email de contacto)`, 'info')
    else toast(`Envío completado: ${enviados} enviado(s)${fallidos ? `, ${fallidos} fallido(s)` : ''}`, fallidos ? 'warning' : 'success')
  }

  function abrirAccion(alerta, modo) {
    setAccionAlerta({ alerta, modo })
    setAccionForm({ nota: '', silenciarDias: '30' })
  }
  async function confirmarAccion() {
    const { alerta, modo } = accionAlerta
    const payload = modo === 'silenciar'
      ? { clave: alerta.clave, estado: 'silenciada', nota: accionForm.nota || undefined, silenciarDias: accionForm.silenciarDias === 'indefinido' ? undefined : parseInt(accionForm.silenciarDias, 10) }
      : { clave: alerta.clave, estado: 'resuelta', nota: accionForm.nota || undefined }
    const res = await resolver.mutateAsync(payload)
    if (res?.error) { toast(res.error, 'error'); return }
    toast(modo === 'silenciar' ? 'Alerta silenciada' : 'Alerta marcada como resuelta', 'success')
    setAccionAlerta(null)
  }
  async function reabrirAlerta(clave) {
    const res = await reabrir.mutateAsync(clave)
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Alerta reabierta', 'success')
  }

  function openNew() {
    setEditItem(null)
    setForm({ diasAntes:7, activa:true, canales:['email'], asunto:'', mensaje:'' })
    setModal(true)
  }
  function openEdit(a) { setEditItem(a); setForm({ ...a, canales:[...(a.canales||[])] }); setModal(true) }

  async function save() {
    if (!form.asunto?.trim()) { toast('El asunto es requerido', 'error'); return }
    if (form.activa && !(form.canales || []).includes('email')) {
      toast('Una regla activa necesita el canal "email" — es el único que envía de verdad.', 'error'); return
    }
    const dto = { diasAntes: form.diasAntes, activa: form.activa, canales: form.canales, asunto: form.asunto, mensaje: form.mensaje }
    if (editItem) {
      const res = await actualizarAlerta.mutateAsync({ id: editItem.id, ...dto })
      if (res?.error) { toast(res.error, 'error'); return }
      toast('Regla actualizada', 'success')
    } else {
      const res = await crearAlerta.mutateAsync(dto)
      if (res?.error) { toast(res.error, 'error'); return }
      toast('Regla creada', 'success')
    }
    setModal(false)
  }

  async function remove(id) {
    const res = await eliminarAlerta.mutateAsync(id)
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Regla eliminada', 'success')
  }
  async function toggleActiva(a) {
    if (!a.activa && !(a.canales || []).includes('email')) {
      toast('Agrega el canal "email" a la regla antes de activarla.', 'error'); return
    }
    await actualizarAlerta.mutateAsync({ id: a.id, activa: !a.activa })
  }
  function toggleCanal(canal) {
    setForm(p => {
      const cs = p.canales || []
      return { ...p, canales: cs.includes(canal) ? cs.filter(c => c !== canal) : [...cs, canal] }
    })
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="space-y-5">
      {/* Barra de salud */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Alertas críticas" value={kpis.criticas} accentColor={kpis.criticas > 0 ? '#ef4444' : '#22c55e'} icon={<ShieldAlert size={30}/>} />
        <KpiCard label="Requieren atención" value={kpis.atencion} accentColor={kpis.atencion > 0 ? '#f59e0b' : '#22c55e'} icon={<AlertTriangle size={30}/>} />
        <KpiCard label="Reglas activas" value={`${kpis.reglasActivas} / ${kpis.reglasTotal}`} accentColor="#3b82f6" icon={<Bell size={30}/>} />
        <KpiCard label="Entregas fallando" value={kpis.entregasFallando} accentColor={kpis.entregasFallando > 0 ? '#f59e0b' : '#22c55e'} icon={<Send size={30}/>} />
      </div>

      {/* Sub-navegación + acción principal */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)]">
        <div className="flex gap-1">
          {SUB_TABS.map(t => (
            <button key={t.id} type="button" onClick={() => setSubTab(t.id)}
              className={`px-3.5 py-2 text-[12px] font-semibold -mb-px border-b-2 transition-colors ${
                subTab === t.id ? 'border-[var(--accent)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}>
              {t.label}
              {t.id === 'bandeja' && kpis.atencion > 0 && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">{kpis.atencion}</span>}
            </button>
          ))}
        </div>
        <Btn variant="primary" onClick={handleEnviarAhora} disabled={enviarPendientes.isPending}>
          <Send size={13}/>{enviarPendientes.isPending ? 'Enviando…' : 'Enviar alertas ahora'}
        </Btn>
      </div>

      {/* ── BANDEJA ── */}
      {subTab === 'bandeja' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTROS_ESTADO.map(fo => (
              <button key={fo.id} type="button" onClick={() => setFiltroEstado(fo.id)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${
                  filtroEstado === fo.id ? 'bg-[var(--accent-dim)] border-[var(--accent)]/40 text-[var(--accent)]' : 'bg-[var(--bg-muted)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}>
                {fo.label}
              </button>
            ))}
            <span className="ml-auto text-[11px] text-[var(--text-muted)]">Se recalcula cada minuto. El envío de correos corre 8:00 (hora de Lima).</span>
          </div>

          {saludLoading ? (
            <div className="text-[12px] text-[var(--text-muted)] py-8 text-center">Cargando alertas…</div>
          ) : bandeja.length === 0 ? (
            <Alert variant="success">
              {filtroEstado === 'activas' ? 'Sin alertas activas — el sistema está sano. 🎉' : 'Nada en esta vista.'}
            </Alert>
          ) : (
            <div className="space-y-2">
              {bandeja.map(a => {
                const sev = SEVERIDAD[a.severidad] || SEVERIDAD.info
                return (
                  <div key={a.clave} className={`flex items-start gap-3.5 p-4 bg-[var(--bg-card)] rounded-xl border ${a.estado === 'nueva' ? 'border-[var(--border)]' : 'border-[var(--border)]/40 opacity-70'}`}>
                    <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${sev.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[13px] font-semibold text-[var(--text-primary)]">{a.titulo}</span>
                        <Badge variant={sev.badge}>{sev.label}</Badge>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/6 text-[var(--text-secondary)]">{CATEGORIA_LABEL[a.categoria] || a.categoria}</span>
                        {a.estado === 'silenciada' && <Badge variant="neutral">Silenciada</Badge>}
                        {a.estado === 'resuelta' && <Badge variant="success">Resuelta</Badge>}
                      </div>
                      {a.empresaNombre && <div className="text-[12px] text-[var(--text-secondary)]">{a.empresaNombre}</div>}
                      <p className="text-[12px] text-[var(--text-muted)] mt-0.5">{a.detalle}</p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-1"><span className="font-semibold">Acción:</span> {a.accionSugerida}</p>
                      {a.nota && <p className="text-[11px] text-[var(--text-muted)] mt-1 italic">Nota: {a.nota}</p>}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {a.estado === 'nueva' ? (
                        <>
                          <Btn variant="ghost" size="sm" onClick={() => abrirAccion(a, 'resolver')}><CircleCheck size={13}/>Resolver</Btn>
                          <Btn variant="ghost" size="sm" onClick={() => abrirAccion(a, 'silenciar')}><BellOff size={13}/>Silenciar</Btn>
                        </>
                      ) : (
                        <Btn variant="ghost" size="sm" onClick={() => reabrirAlerta(a.clave)}><RotateCcw size={13}/>Reabrir</Btn>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── REGLAS ── */}
      {subTab === 'reglas' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-[var(--text-muted)]">Cuándo y cómo se avisa a cada negocio sobre el vencimiento de su plan. Solo el canal <span className="font-semibold">email</span> envía de verdad.</p>
            <Btn variant="primary" onClick={openNew}><Plus size={14}/>Nueva regla</Btn>
          </div>

          {alertas.length === 0
            ? <EmptyState icon={Bell} title="Sin reglas de alerta" description="Sin al menos una regla activa, el aviso automático de vencimiento no hace nada." action={<Btn variant="primary" onClick={openNew}><Plus size={14}/>Crear regla</Btn>} />
            : (
              <div className="space-y-2">
                {[...alertas].sort((a,b) => a.diasAntes - b.diasAntes).map(a => {
                  const sinEmail = !(a.canales || []).includes('email')
                  return (
                    <div key={a.id} className={`flex items-start gap-4 p-4 bg-[var(--bg-card)] rounded-xl border transition-all ${a.activa ? 'border-[var(--border)]' : 'border-[var(--border)]/40 opacity-60'}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-[13px] ${a.diasAntes <= 7 ? 'bg-red-500/15 text-red-400' : a.diasAntes <= 15 ? 'bg-yellow-500/15 text-yellow-400' : 'bg-blue-500/15 text-blue-400'}`}>
                        {a.diasAntes}d
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[13px] font-semibold text-[var(--text-primary)]">{a.asunto}</span>
                          <Badge variant={a.activa ? 'success' : 'neutral'}>{a.activa ? 'Activa' : 'Inactiva'}</Badge>
                          {a.activa && sinEmail && <Badge variant="warning">No envía nada — sin canal email</Badge>}
                        </div>
                        <p className="text-[12px] text-[var(--text-muted)] truncate">{a.diasAntes} días antes · {a.mensaje}</p>
                        <div className="flex items-center gap-1.5 mt-2">
                          {(a.canales||[]).map(c => (
                            <span key={c} className="text-[11px] px-2 py-0.5 rounded-full bg-white/6 text-[var(--text-secondary)]">{c}{c !== 'email' && <span className="opacity-50"> ·no envía</span>}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Toggle value={a.activa} onChange={() => toggleActiva(a)} />
                        <Btn variant="ghost" size="icon" onClick={() => openEdit(a)}><Edit2 size={13}/></Btn>
                        <Btn variant="danger" size="icon" onClick={() => setConfirmDel(a)}><Trash2 size={13}/></Btn>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          }

          {/* Vencimientos próximos que hoy hacen match con una regla */}
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} className="text-[var(--accent)]" />
              <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Negocios que hoy hacen match con una regla</h3>
              <Badge variant={vencimientos.length > 0 ? 'warning' : 'success'}>{vencimientos.length}</Badge>
            </div>
            {vencimientos.length === 0 ? (
              <Alert variant="success">Ningún negocio activo entra en el rango de una regla ahora mismo.</Alert>
            ) : (
              <TableWrap>
                <thead>
                  <tr><Th>Empresa</Th><Th>Código</Th><Th>Vencimiento</Th><Th>Días</Th><Th>Regla aplicable</Th></tr>
                </thead>
                <tbody>
                  {vencimientos.map(v => (
                    <tr key={v.empresaId} className="border-t border-white/5 hover:bg-white/2">
                      <Td><div className="font-medium text-[var(--text-primary)]">{v.nombre}</div></Td>
                      <Td muted>{v.codigo}</Td>
                      <Td muted>{v.fechaVencimiento ? String(v.fechaVencimiento).slice(0, 10) : '—'}</Td>
                      <Td>
                        <span className={`font-bold text-[13px] ${v.dias <= 0 ? 'text-red-400' : v.dias <= 7 ? 'text-red-400' : v.dias <= 15 ? 'text-yellow-400' : 'text-blue-400'}`}>
                          {v.dias <= 0 ? 'VENCIDO' : `${v.dias}d`}
                        </span>
                      </Td>
                      <Td>
                        {v.reglaAplicable
                          ? <span className="text-[11px] px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full">{v.reglaAplicable.asunto}</span>
                          : <span className="text-[11px] text-[var(--text-muted)]">—</span>}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </div>
        </div>
      )}

      {/* ── HISTORIAL ── */}
      {subTab === 'historial' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <History size={15} className="text-[var(--accent)]" />
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Envíos reales</h3>
            <Badge variant="neutral">{enviosFiltrados.length}</Badge>
            <Select value={filtroHist} onChange={e => setFiltroHist(e.target.value)} style={{ width: 160 }} className="ml-auto">
              <option value="todos">Todos</option>
              <option value="enviado">Enviados</option>
              <option value="fallido">Fallidos</option>
            </Select>
          </div>
          {enviosFiltrados.length === 0 ? (
            <Alert variant="info">Sin envíos que mostrar. Corren solos cada mañana (8:00 hora de Lima) o con "Enviar alertas ahora".</Alert>
          ) : (
            <TableWrap>
              <thead>
                <tr><Th>Empresa</Th><Th>Regla</Th><Th>Canal</Th><Th>Estado</Th><Th>Fecha</Th></tr>
              </thead>
              <tbody>
                {enviosFiltrados.map(e => (
                  <tr key={e.id} className="border-t border-white/5 hover:bg-white/2">
                    <Td><div className="font-medium text-[var(--text-primary)]">{e.empresa?.nombre}</div></Td>
                    <Td muted>{e.regla?.asunto}</Td>
                    <Td muted>{e.canal}</Td>
                    <Td>
                      <Badge variant={e.estado === 'enviado' ? 'success' : 'danger'}>{e.estado}</Badge>
                      {e.estado === 'fallido' && e.error && <div className="text-[11px] text-red-400/70 mt-1 max-w-[280px] truncate" title={e.error}>{e.error}</div>}
                    </Td>
                    <Td muted>{e.enviadoAt ? String(e.enviadoAt).slice(0, 16).replace('T', ' ') : '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </div>
      )}

      {/* Modal regla */}
      <Modal open={modalOpen} onClose={() => setModal(false)} title={editItem ? 'Editar regla de alerta' : 'Nueva regla de alerta'} size="md"
        footer={<>
          <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn variant="primary" onClick={save}><Save size={14}/>{editItem ? 'Guardar cambios' : 'Crear regla'}</Btn>
        </>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Días antes del vencimiento">
              <Input type="number" min="0" max="365" value={form.diasAntes ?? 7} onChange={e => f('diasAntes', parseInt(e.target.value, 10) || 0)} />
            </Field>
            <Field label="Estado">
              <div className="flex items-center h-9">
                <Toggle value={!!form.activa} onChange={v => f('activa', v)} label="Regla activa" />
              </div>
            </Field>
          </div>
          <Field label="Asunto del mensaje *">
            <Input value={form.asunto||''} onChange={e => f('asunto', e.target.value)} placeholder="¡Plan próximo a vencer!" />
          </Field>
          <Field label="Mensaje" hint="Variables: {plan} = nombre del plan · {dias} = días restantes (o 'hoy') · {empresa} = nombre del negocio">
            <Textarea rows={3} value={form.mensaje||''} onChange={e => f('mensaje', e.target.value)} placeholder="Tu plan {plan} vence en {dias} días…" />
          </Field>
          <Field label="Canales de notificación" hint="Solo 'email' envía de verdad (SMTP). 'sistema', 'whatsapp' y 'sms' se guardan como intención — no disparan nada.">
            <div className="flex flex-wrap gap-2 mt-1">
              {CANALES.map(c => {
                const active = (form.canales||[]).includes(c)
                return (
                  <button key={c} type="button" onClick={() => toggleCanal(c)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${active ? 'bg-[var(--accent-dim)] border-[var(--accent)]/40 text-[var(--accent)]' : 'bg-[var(--bg-muted)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
                    {active && <CheckCircle size={12}/>}{c}{c !== 'email' && <span className="opacity-50">*</span>}
                  </button>
                )
              })}
            </div>
          </Field>
          {form.activa && !(form.canales || []).includes('email') && (
            <Alert variant="warning">Esta regla está activa pero no tiene el canal <span className="font-semibold">email</span>: no enviará nada.</Alert>
          )}
        </div>
      </Modal>

      {/* Modal resolver / silenciar */}
      <Modal open={!!accionAlerta} onClose={() => setAccionAlerta(null)}
        title={accionAlerta?.modo === 'silenciar' ? 'Silenciar alerta' : 'Marcar alerta como resuelta'} size="sm"
        footer={<>
          <Btn variant="secondary" onClick={() => setAccionAlerta(null)}>Cancelar</Btn>
          <Btn variant="primary" onClick={confirmarAccion} disabled={resolver.isPending}>
            {accionAlerta?.modo === 'silenciar' ? <BellOff size={14}/> : <CircleCheck size={14}/>}
            {accionAlerta?.modo === 'silenciar' ? 'Silenciar' : 'Resolver'}
          </Btn>
        </>}>
        <div className="space-y-4">
          <p className="text-[12px] text-[var(--text-secondary)]">{accionAlerta?.alerta?.titulo}</p>
          {accionAlerta?.modo === 'silenciar' && (
            <Field label="Silenciar por" hint="Vuelve a aparecer al terminar el plazo, si la condición sigue vigente.">
              <Select value={accionForm.silenciarDias} onChange={e => setAccionForm(p => ({ ...p, silenciarDias: e.target.value }))}>
                <option value="7">7 días</option>
                <option value="30">30 días</option>
                <option value="90">90 días</option>
                <option value="indefinido">Indefinido</option>
              </Select>
            </Field>
          )}
          <Field label="Nota (opcional)">
            <Textarea rows={2} value={accionForm.nota} onChange={e => setAccionForm(p => ({ ...p, nota: e.target.value }))} placeholder="Ej. hablado con el cliente, renueva la próxima semana" />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={() => remove(confirmDel?.id)}
        danger title="Eliminar regla" message={`¿Eliminar la regla "${confirmDel?.asunto}"? Deja de generar alertas; el historial de envíos se conserva.`} />
    </div>
  )
}
