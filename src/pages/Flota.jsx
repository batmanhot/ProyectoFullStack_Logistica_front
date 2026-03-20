import { useState, useMemo } from 'react'
import { Truck, Plus, Edit2, Trash2, AlertTriangle, CheckCircle,
         Calendar, Gauge, Wrench, FileText, Download, Clock } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatDate, fechaHoy } from '../utils/helpers'
import { Modal, ConfirmDialog, EmptyState, Badge, Btn, Field } from '../components/ui/index'
import FechaRango from '../components/ui/FechaRango'

const SI  = 'w-full px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit] placeholder-[#5f6f80]'
const SEL = SI + ' pr-8'
const KEY_FLOTA = 'sp_flota'

// ── Storage helpers (localStorage directo, sin backend) ───
function leerFlota()      { try { return JSON.parse(localStorage.getItem(KEY_FLOTA) || '[]') } catch { return [] } }
function guardarFlota(d)  { localStorage.setItem(KEY_FLOTA, JSON.stringify(d)) }
function newId()          { return Math.random().toString(36).slice(2,10) }

// Días hasta una fecha
function diasHasta(fecha) {
  if (!fecha) return null
  const diff = new Date(fecha + 'T12:00:00') - new Date()
  return Math.ceil(diff / 86400000)
}

function estadoVenc(dias) {
  if (dias === null)  return { label:'Sin fecha', color:'#5f6f80', badge:'neutral'  }
  if (dias < 0)       return { label:'Vencido',   color:'#ef4444', badge:'danger'   }
  if (dias <= 15)     return { label:'Crítico',    color:'#ef4444', badge:'danger'   }
  if (dias <= 30)     return { label:'Urgente',    color:'#f59e0b', badge:'warning'  }
  if (dias <= 90)     return { label:'Próximo',    color:'#3b82f6', badge:'info'     }
  return               { label:'Vigente',    color:'#22c55e', badge:'success'  }
}

const TIPO_VEHICULO = ['Camioneta','Camión','Furgón','Moto','Auto','Bus','Otro']
const TIPO_MANT     = ['Cambio de aceite','Afinamiento','Revisión frenos','Cambio de llantas','Mantenimiento general','Revisión eléctrica','Revisión de suspensión','Otro']

const TABS = [['unidades','Unidades'],['mantenimiento','Mantenimiento'],['alertas','Alertas']]

export default function Flota() {
  const { sesion } = useApp()
  const [tab,        setTab]        = useState('unidades')
  const [flota,      setFlota]      = useState(leerFlota)
  const [modal,      setModal]      = useState(false)
  const [editando,   setEditando]   = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [modalMant,  setModalMant]  = useState(null)  // unidad seleccionada para agregar mantenimiento
  const [filtDesde,  setFiltDesde]  = useState('')
  const [filtHasta,  setFiltHasta]  = useState('')

  function recargar() { setFlota(leerFlota()) }

  function handleSave(data) {
    const actual = leerFlota()
    if (data.id) {
      const idx = actual.findIndex(u => u.id === data.id)
      if (idx >= 0) actual[idx] = { ...data, updatedAt: new Date().toISOString() }
    } else {
      actual.push({ ...data, id: newId(), createdAt: new Date().toISOString(), mantenimientos: [] })
    }
    guardarFlota(actual)
    recargar()
    setModal(false)
  }

  function handleDel(id) {
    guardarFlota(leerFlota().filter(u => u.id !== id))
    recargar()
    setConfirmDel(null)
  }

  function handleAddMant(unidadId, mantData) {
    const actual = leerFlota()
    const idx = actual.findIndex(u => u.id === unidadId)
    if (idx < 0) return
    if (!actual[idx].mantenimientos) actual[idx].mantenimientos = []
    actual[idx].mantenimientos.unshift({ ...mantData, id: newId(), fecha: fechaHoy(), usuarioId: sesion?.id })
    actual[idx].kmActual = mantData.kmActual || actual[idx].kmActual
    guardarFlota(actual)
    recargar()
    setModalMant(null)
  }

  // KPIs
  const kpis = useMemo(() => {
    const total   = flota.length
    const activas = flota.filter(u => u.activo !== false).length
    const alertasSoat = flota.filter(u => { const d = diasHasta(u.vencSoat); return d !== null && d <= 30 }).length
    const alertasRevt = flota.filter(u => { const d = diasHasta(u.vencRevTecnica); return d !== null && d <= 30 }).length
    const kmTotal = flota.reduce((s, u) => s + (u.kmActual || 0), 0)
    return { total, activas, alertasSoat, alertasRevt, kmTotal }
  }, [flota])

  // Todos los mantenimientos filtrados
  const todosMantenimientos = useMemo(() => {
    const lista = []
    flota.forEach(u => {
      (u.mantenimientos || []).forEach(m => {
        if (filtDesde && m.fecha < filtDesde) return
        if (filtHasta && m.fecha > filtHasta) return
        lista.push({ ...m, unidadNombre: u.nombre, unidadPlaca: u.placa })
      })
    })
    return lista.sort((a, b) => b.fecha.localeCompare(a.fecha))
  }, [flota, filtDesde, filtHasta])

  // Alertas próximas
  const alertas = useMemo(() => {
    const lista = []
    flota.filter(u => u.activo !== false).forEach(u => {
      const dSoat = diasHasta(u.vencSoat)
      const dRevt = diasHasta(u.vencRevTecnica)
      const dMant = diasHasta(u.proxMantenimiento)
      if (dSoat !== null && dSoat <= 60) lista.push({ unidad: u.nombre, placa: u.placa, tipo: 'SOAT', dias: dSoat, fecha: u.vencSoat })
      if (dRevt !== null && dRevt <= 60) lista.push({ unidad: u.nombre, placa: u.placa, tipo: 'Revisión Técnica', dias: dRevt, fecha: u.vencRevTecnica })
      if (dMant !== null && dMant <= 30) lista.push({ unidad: u.nombre, placa: u.placa, tipo: 'Mantenimiento', dias: dMant, fecha: u.proxMantenimiento })
    })
    return lista.sort((a, b) => a.dias - b.dias)
  }, [flota])

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          ['Total unidades',    kpis.total,        '#00c896', Truck        ],
          ['Activas',           kpis.activas,       '#22c55e', CheckCircle  ],
          ['Alertas SOAT',      kpis.alertasSoat,  kpis.alertasSoat>0?'#ef4444':'#22c55e', AlertTriangle],
          ['Alertas Rev. Técn.',kpis.alertasRevt,  kpis.alertasRevt>0?'#f59e0b':'#22c55e', Calendar],
          ['Km total flota',    kpis.kmTotal.toLocaleString(), '#3b82f6', Gauge],
        ].map(([label, val, color, Icon]) => (
          <div key={label} className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-4 py-3.5 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }}/>
            <div className="flex items-center gap-1.5 mb-2">
              <Icon size={11} style={{ color, opacity: 0.8 }}/>
              <span className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.07em]">{label}</span>
            </div>
            <div className="text-[22px] font-bold text-[#e8edf2]">{val}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-white/[0.08]">
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 text-[13px] font-medium border-b-2 -mb-px transition-all relative
              ${tab === id ? 'text-[#00c896] border-[#00c896]' : 'text-[#5f6f80] border-transparent hover:text-[#9ba8b6]'}`}>
            {label}
            {id === 'alertas' && alertas.length > 0 && (
              <span className="ml-1.5 text-[10px] font-bold bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">{alertas.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB UNIDADES ─────────────────────────────── */}
      {tab === 'unidades' && (
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Unidades de Flota</span>
            <Btn variant="primary" size="sm" onClick={() => { setEditando(null); setModal(true) }}>
              <Plus size={13}/> Nueva Unidad
            </Btn>
          </div>

          {flota.length === 0 ? (
            <EmptyState icon={Truck} title="Sin unidades registradas" description="Agrega tu primera unidad de flota."/>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {flota.map(u => {
                const dSoat = diasHasta(u.vencSoat)
                const dRevt = diasHasta(u.vencRevTecnica)
                const dMant = diasHasta(u.proxMantenimiento)
                const estSoat = estadoVenc(dSoat)
                const estRevt = estadoVenc(dRevt)
                const estMant = estadoVenc(dMant)
                const ultimoMant = (u.mantenimientos || [])[0]

                return (
                  <div key={u.id} className="bg-[#1a2230] border border-white/[0.06] rounded-xl overflow-hidden">
                    {/* Cabecera */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#00c896]/10 flex items-center justify-center shrink-0">
                          <Truck size={17} className="text-[#00c896]"/>
                        </div>
                        <div>
                          <div className="font-semibold text-[#e8edf2] text-[14px]">{u.nombre}</div>
                          <div className="text-[11px] text-[#5f6f80]">{u.tipo} · <span className="font-mono text-[#9ba8b6]">{u.placa}</span></div>
                        </div>
                      </div>
                      <div className="flex gap-1 items-center">
                        <Badge variant={u.activo !== false ? 'success' : 'neutral'}>
                          {u.activo !== false ? 'Activa' : 'Inactiva'}
                        </Badge>
                        <Btn variant="ghost" size="icon" onClick={() => { setEditando(u); setModal(true) }}><Edit2 size={12}/></Btn>
                        <Btn variant="ghost" size="icon" className="text-red-400" onClick={() => setConfirmDel(u.id)}><Trash2 size={12}/></Btn>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="px-4 py-3 grid grid-cols-3 gap-3 border-b border-white/[0.06]">
                      <div>
                        <div className="text-[10px] text-[#5f6f80] uppercase tracking-wide mb-0.5">Km actual</div>
                        <div className="text-[13px] font-mono font-semibold text-[#e8edf2]">{(u.kmActual||0).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#5f6f80] uppercase tracking-wide mb-0.5">Año</div>
                        <div className="text-[13px] font-semibold text-[#e8edf2]">{u.anio || '—'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#5f6f80] uppercase tracking-wide mb-0.5">Conductor</div>
                        <div className="text-[13px] text-[#9ba8b6] truncate">{u.conductor || '—'}</div>
                      </div>
                    </div>

                    {/* Vencimientos */}
                    <div className="px-4 py-3 grid grid-cols-3 gap-2 border-b border-white/[0.06]">
                      {[['SOAT', u.vencSoat, estSoat, dSoat], ['Rev. Técnica', u.vencRevTecnica, estRevt, dRevt], ['Próx. Mantenimiento', u.proxMantenimiento, estMant, dMant]].map(([lbl, fecha, est, dias]) => (
                        <div key={lbl} className="text-center">
                          <div className="text-[10px] text-[#5f6f80] mb-1">{lbl}</div>
                          <div className="text-[11px] font-mono text-[#9ba8b6]">{fecha ? formatDate(fecha) : '—'}</div>
                          {dias !== null && (
                            <div className="text-[10px] font-semibold mt-0.5" style={{ color: est.color }}>
                              {dias < 0 ? `Vencido ${Math.abs(dias)}d` : `${dias}d`}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Último mantenimiento + Acción */}
                    <div className="px-4 py-2.5 flex items-center justify-between">
                      <div>
                        {ultimoMant ? (
                          <div className="text-[11px] text-[#5f6f80]">
                            Último: <span className="text-[#9ba8b6]">{ultimoMant.tipo}</span>
                            <span className="font-mono ml-1.5 text-[#5f6f80]">{formatDate(ultimoMant.fecha)}</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-[#5f6f80]">Sin mantenimientos registrados</div>
                        )}
                      </div>
                      <Btn variant="secondary" size="sm" onClick={() => setModalMant(u)}>
                        <Wrench size={12}/> Registrar
                      </Btn>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB MANTENIMIENTO ────────────────────────── */}
      {tab === 'mantenimiento' && (
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Historial de Mantenimientos</span>
            <FechaRango desde={filtDesde} hasta={filtHasta} onDesde={setFiltDesde} onHasta={setFiltHasta}/>
          </div>
          {todosMantenimientos.length === 0 ? (
            <EmptyState icon={Wrench} title="Sin mantenimientos" description="Registra el primer mantenimiento desde la pestaña Unidades."/>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
              <table className="w-full border-collapse text-[13px]">
                <thead><tr>
                  {['Fecha','Unidad','Placa','Tipo','Km','Costo','Taller','Observaciones'].map(h => (
                    <th key={h} className="bg-[#1a2230] px-3.5 py-2.5 text-left text-[11px] font-semibold text-[#5f6f80] uppercase border-b border-white/[0.08] whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {todosMantenimientos.map(m => (
                    <tr key={m.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]">
                      <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{formatDate(m.fecha)}</td>
                      <td className="px-3.5 py-2.5 font-medium text-[#e8edf2]">{m.unidadNombre}</td>
                      <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#00c896]">{m.unidadPlaca}</td>
                      <td className="px-3.5 py-2.5"><span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">{m.tipo}</span></td>
                      <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{m.kmActual ? m.kmActual.toLocaleString() : '—'}</td>
                      <td className="px-3.5 py-2.5 font-mono text-[12px] font-semibold text-[#00c896]">{m.costo ? `S/ ${m.costo.toFixed(2)}` : '—'}</td>
                      <td className="px-3.5 py-2.5 text-[#9ba8b6]">{m.taller || '—'}</td>
                      <td className="px-3.5 py-2.5 text-[12px] text-[#5f6f80] max-w-[200px] truncate">{m.observaciones || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB ALERTAS ─────────────────────────────── */}
      {tab === 'alertas' && (
        <div className="flex flex-col gap-4">
          {alertas.length === 0 ? (
            <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-10 flex flex-col items-center gap-3">
              <CheckCircle size={40} className="text-green-400 opacity-40"/>
              <div className="text-center">
                <p className="text-[14px] font-semibold text-[#9ba8b6]">Todo en orden</p>
                <p className="text-[12px] text-[#5f6f80] mt-1">No hay vencimientos próximos en los próximos 60 días</p>
              </div>
            </div>
          ) : alertas.map((a, i) => {
            const est = estadoVenc(a.dias)
            return (
              <div key={i} className="bg-[#161d28] border rounded-xl p-4 flex items-center gap-4"
                style={{ borderColor: est.color + '33' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: est.color + '18' }}>
                  {a.tipo === 'SOAT' ? <FileText size={18} style={{ color: est.color }}/> :
                   a.tipo === 'Revisión Técnica' ? <Calendar size={18} style={{ color: est.color }}/> :
                   <Wrench size={18} style={{ color: est.color }}/>}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-[#e8edf2]">{a.tipo}</span>
                    <Badge variant={est.badge}>{est.label}</Badge>
                  </div>
                  <div className="text-[12px] text-[#9ba8b6]">{a.unidad} · <span className="font-mono">{a.placa}</span></div>
                  <div className="text-[11px] text-[#5f6f80] mt-0.5">
                    Fecha: {formatDate(a.fecha)} ·
                    <span className="font-semibold ml-1" style={{ color: est.color }}>
                      {a.dias < 0 ? `Vencido hace ${Math.abs(a.dias)} días` : `Vence en ${a.dias} días`}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modales ──────────────────────────────────── */}
      <ModalUnidad open={modal} onClose={() => setModal(false)} editando={editando} onSave={handleSave}/>
      <ModalMantenimiento open={!!modalMant} onClose={() => setModalMant(null)} unidad={modalMant} onSave={handleAddMant}/>
      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)}
        onConfirm={() => handleDel(confirmDel)} danger
        title="Eliminar unidad" message="¿Eliminar esta unidad de flota? También se eliminará su historial de mantenimientos."/>
    </div>
  )
}

// ── Modal Nueva/Editar Unidad ─────────────────────────────
function ModalUnidad({ open, onClose, editando, onSave }) {
  const init = { nombre:'', tipo:'Camioneta', placa:'', anio:'', conductor:'',
                 kmActual:0, vencSoat:'', vencRevTecnica:'', proxMantenimiento:'', activo:true }
  const [form, setForm] = useState(init)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const { useEffect } = { useEffect: (fn, deps) => { /* stub */ } }
  // useEffect para sincronizar form con editando
  if (open && editando && form.nombre !== editando.nombre) setForm({ ...init, ...editando })

  return (
    <Modal open={open} onClose={onClose} title={editando ? 'Editar Unidad' : 'Nueva Unidad'} size="md"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" disabled={!form.nombre||!form.placa} onClick={() => onSave(editando ? { ...form, id: editando.id, mantenimientos: editando.mantenimientos||[] } : form)}>
          Guardar
        </Btn>
      </>}>
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Nombre / Descripción *"><input className={SI} value={form.nombre} onChange={e=>f('nombre',e.target.value)} placeholder="Ej: Camioneta 01"/></Field>
        <Field label="Tipo"><select className={SEL} value={form.tipo} onChange={e=>f('tipo',e.target.value)}>{TIPO_VEHICULO.map(t=><option key={t}>{t}</option>)}</select></Field>
        <Field label="Placa *"><input className={SI} value={form.placa} onChange={e=>f('placa',e.target.value.toUpperCase())} placeholder="ABC-123"/></Field>
        <Field label="Año"><input type="number" className={SI} value={form.anio} onChange={e=>f('anio',e.target.value)} min="1990" max="2030"/></Field>
        <Field label="Conductor asignado"><input className={SI} value={form.conductor} onChange={e=>f('conductor',e.target.value)} placeholder="Nombre del conductor"/></Field>
        <Field label="Km actual"><input type="number" className={SI} value={form.kmActual} onChange={e=>f('kmActual',+e.target.value)} min="0"/></Field>
        <Field label="Venc. SOAT"><input type="date" className={SI} value={form.vencSoat} onChange={e=>f('vencSoat',e.target.value)}/></Field>
        <Field label="Venc. Rev. Técnica"><input type="date" className={SI} value={form.vencRevTecnica} onChange={e=>f('vencRevTecnica',e.target.value)}/></Field>
        <Field label="Próx. Mantenimiento"><input type="date" className={SI} value={form.proxMantenimiento} onChange={e=>f('proxMantenimiento',e.target.value)}/></Field>
        <Field label="Estado">
          <label className="flex items-center gap-2 mt-1.5 cursor-pointer text-[13px] text-[#9ba8b6]">
            <input type="checkbox" checked={form.activo} onChange={e=>f('activo',e.target.checked)} className="accent-[#00c896]"/>
            Unidad activa en operación
          </label>
        </Field>
      </div>
    </Modal>
  )
}

// ── Modal Registrar Mantenimiento ─────────────────────────
function ModalMantenimiento({ open, onClose, unidad, onSave }) {
  const [form, setForm] = useState({ tipo:'Cambio de aceite', kmActual:'', costo:'', taller:'', observaciones:'' })
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <Modal open={open} onClose={onClose}
      title={`Registrar Mantenimiento — ${unidad?.nombre || ''}`} size="sm"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" disabled={!form.tipo} onClick={() => {
          onSave(unidad.id, { tipo: form.tipo, kmActual: +form.kmActual||unidad?.kmActual, costo: +form.costo||null, taller: form.taller, observaciones: form.observaciones })
          setForm({ tipo:'Cambio de aceite', kmActual:'', costo:'', taller:'', observaciones:'' })
        }}>
          <Wrench size={13}/> Registrar
        </Btn>
      </>}>
      <Field label="Tipo de mantenimiento *">
        <select className={SEL} value={form.tipo} onChange={e=>f('tipo',e.target.value)}>
          {TIPO_MANT.map(t=><option key={t}>{t}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Km al momento"><input type="number" className={SI} value={form.kmActual} onChange={e=>f('kmActual',e.target.value)} placeholder={unidad?.kmActual||0}/></Field>
        <Field label="Costo (S/)"><input type="number" className={SI} value={form.costo} onChange={e=>f('costo',e.target.value)} placeholder="0.00" min="0" step="0.01"/></Field>
      </div>
      <Field label="Taller / Proveedor"><input className={SI} value={form.taller} onChange={e=>f('taller',e.target.value)} placeholder="Nombre del taller"/></Field>
      <Field label="Observaciones">
        <textarea className={SI + ' resize-none'} rows={2} value={form.observaciones} onChange={e=>f('observaciones',e.target.value)} placeholder="Detalles del mantenimiento..."/>
      </Field>
    </Modal>
  )
}
