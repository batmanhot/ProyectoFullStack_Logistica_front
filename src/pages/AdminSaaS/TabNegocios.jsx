import { useState, useMemo } from 'react'
import {
  Building2, Plus, Edit2, Trash2, Search, Save, Eye, EyeOff,
  AlertTriangle, Clock, CheckCircle, Link2,
} from 'lucide-react'
import { differenceInDays, format, addDays } from 'date-fns'
import {
  Modal, ConfirmDialog, EmptyState, Badge, Btn,
  Field, TableWrap, Th, Td, KpiCard,
} from '../../components/ui/index'
import { estadoEfectivo, ESTADO_BADGE } from './constants'

// ══════════════════════════════════════════════════════════
// TAB: NEGOCIOS
// ══════════════════════════════════════════════════════════
export default function TabNegocios({ negocios, crearNegocio, actualizarNegocio, eliminarNegocio, planes, toast }) {
  const [search, setSearch]     = useState('')
  const [filtroEstado, setFE]   = useState('todos')
  const [filtroPlan,   setFP]   = useState('todos')
  const [modalOpen, setModal]   = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm]         = useState({})
  const [showPass, setShowPass] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)

  const stats = useMemo(() => ({
    total:    negocios.length,
    activos:  negocios.filter(n => n.estado === 'activo').length,
    trial:    negocios.filter(n => n.estado === 'trial').length,
    porVencer: negocios.filter(n => {
      if (!n.fechaVencimiento) return false
      const d = differenceInDays(new Date(n.fechaVencimiento), new Date())
      return d >= 0 && d <= 30
    }).length,
    vencidos: negocios.filter(n => estadoEfectivo(n) === 'vencido').length,
  }), [negocios])

  const filtered = useMemo(() => {
    let r = negocios
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(n => n.nombre.toLowerCase().includes(q) || n.ruc?.includes(q) || n.email?.toLowerCase().includes(q) || n.empresaId?.toLowerCase().includes(q))
    }
    if (filtroEstado !== 'todos') r = r.filter(n => estadoEfectivo(n) === filtroEstado)
    if (filtroPlan   !== 'todos') r = r.filter(n => n.plan   === filtroPlan)
    return r
  }, [negocios, search, filtroEstado, filtroPlan])

  function getAccessLink(empresaId) {
    return `${window.location.origin}/app/${empresaId}`
  }

  function copyLink(empresaId) {
    navigator.clipboard.writeText(getAccessLink(empresaId)).then(() => toast('Link copiado al portapapeles', 'success'))
  }

  function openNew() {
    setEditItem(null)
    setForm({ nombre:'', ruc:'', contacto:'', email:'', telefono:'', plan:'trial', estado:'trial', fechaVencimiento:format(addDays(new Date(), 30), 'yyyy-MM-dd'), empresaId:'', notas:'', adminNombre:'', adminEmail:'', adminPassword:'' })
    setModal(true)
  }

  function openEdit(item) { setEditItem(item); setForm({ ...item }); setModal(true) }

  async function save() {
    if (!form.nombre?.trim()) { toast('El nombre es requerido', 'error'); return }
    if (!form.empresaId?.trim()) { toast('El ID de empresa es requerido', 'error'); return }
    if (editItem) {
      const res = await actualizarNegocio.mutateAsync({ id: editItem.id, nombre: form.nombre, ruc: form.ruc, contacto: form.contacto, email: form.email, telefono: form.telefono, plan: form.plan, estado: form.estado, fechaVencimiento: form.fechaVencimiento || undefined, notas: form.notas })
      if (res?.error) { toast(res.error, 'error'); return }
      toast('Negocio actualizado', 'success')
    } else {
      if (!form.adminNombre?.trim()) { toast('El nombre del admin es requerido', 'error'); return }
      if (!form.adminEmail?.trim())  { toast('El email del admin es requerido', 'error');  return }
      if ((form.adminPassword?.length ?? 0) < 8) { toast('La contraseña del admin debe tener al menos 8 caracteres', 'error'); return }
      const res = await crearNegocio.mutateAsync({ codigo: form.empresaId, nombre: form.nombre, ruc: form.ruc, contacto: form.contacto, email: form.email, telefono: form.telefono, plan: form.plan, fechaVencimiento: form.fechaVencimiento || undefined, notas: form.notas, adminNombre: form.adminNombre, adminEmail: form.adminEmail, adminPassword: form.adminPassword })
      if (res?.error) { toast(res.error, 'error'); return }
      toast('Negocio registrado correctamente', 'success')
    }
    setModal(false)
  }

  async function remove(id) {
    const res = await eliminarNegocio.mutateAsync(id)
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Negocio eliminado', 'success')
  }

  const inp = 'w-full px-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[13px] text-[#e8edf2] placeholder-[#5f6f80] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20'
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const kpis = [
    { label:'Total registrados', value:stats.total,    color:'#3b82f6', icon:<Building2 size={32}/> },
    { label:'Activos',           value:stats.activos,  color:'#10b981', icon:<CheckCircle size={32}/> },
    { label:'Trial activo',      value:stats.trial,    color:'#6366f1', icon:<Clock size={32}/> },
    { label:'Por vencer (≤30d)', value:stats.porVencer,color:'#f59e0b', icon:<AlertTriangle size={32}/> },
    { label:'Vencidos',          value:stats.vencidos, color:'#ef4444', icon:<AlertTriangle size={32}/> },
  ]

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {kpis.map(k => <KpiCard key={k.label} label={k.label} value={k.value} accentColor={k.color} icon={k.icon} />)}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5f6f80]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, RUC, email o ID…" className={`${inp} pl-8`} />
        </div>
        <select value={filtroEstado} onChange={e => setFE(e.target.value)} className={`${inp} w-auto`}>
          <option value="todos">Todos los estados</option>
          {['activo','trial','suspendido','vencido','cancelado'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
        <select value={filtroPlan} onChange={e => setFP(e.target.value)} className={`${inp} w-auto`}>
          <option value="todos">Todos los planes</option>
          {planes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <Btn variant="primary" onClick={openNew}><Plus size={14}/> Nuevo negocio</Btn>
      </div>

      {/* Table */}
      {filtered.length === 0
        ? <EmptyState icon={Building2} title="No hay negocios" description="Registra el primer negocio para comenzar." action={<Btn variant="primary" onClick={openNew}><Plus size={14}/>Registrar negocio</Btn>} />
        : (
          <TableWrap>
            <thead>
              <tr><Th>Empresa</Th><Th>Plan</Th><Th>Estado</Th><Th>Vencimiento</Th><Th>Link de acceso</Th><Th>Contacto</Th><Th></Th></tr>
            </thead>
            <tbody>
              {filtered.map(n => {
                const plan  = planes.find(p => p.id === n.plan)
                const dias  = n.fechaVencimiento ? differenceInDays(new Date(n.fechaVencimiento), new Date()) : null
                const link  = n.empresaId ? getAccessLink(n.empresaId) : null
                return (
                  <tr key={n.id} className="border-t border-white/5 hover:bg-white/2 transition-colors">
                    <Td>
                      <div className="font-medium text-[#e8edf2]">{n.nombre}</div>
                      <div className="text-[11px] text-[#5f6f80]">ID: {n.empresaId} {n.ruc && `· RUC: ${n.ruc}`}</div>
                    </Td>
                    <Td>
                      {plan && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-semibold" style={{ background:`${plan.color}20`, color:plan.color }}>
                          {plan.nombre}
                        </span>
                      )}
                    </Td>
                    <Td><Badge variant={ESTADO_BADGE[estadoEfectivo(n)] || 'neutral'}>{estadoEfectivo(n)}</Badge></Td>
                    <Td>
                      {dias !== null ? (
                        <div>
                          <div className="text-[13px] text-[#e8edf2]">{n.fechaVencimiento}</div>
                          <div className={`text-[11px] ${dias < 0 ? 'text-red-400' : dias <= 7 ? 'text-red-400' : dias <= 30 ? 'text-yellow-400' : 'text-[#5f6f80]'}`}>
                            {dias < 0 ? `Vencido hace ${-dias}d` : dias === 0 ? 'Vence hoy' : `${dias}d restantes`}
                          </div>
                        </div>
                      ) : '—'}
                    </Td>
                    <Td>
                      {link ? (
                        <div className="flex items-center gap-1.5 max-w-[200px]">
                          <span className="text-[11px] text-[#5f6f80] font-mono truncate" title={link}>
                            /app/{n.empresaId}
                          </span>
                          <button
                            onClick={() => copyLink(n.empresaId)}
                            title="Copiar link de acceso"
                            className="shrink-0 p-1 rounded hover:bg-white/10 text-[#5f6f80] hover:text-[#00c896] transition-colors"
                          >
                            <Link2 size={12}/>
                          </button>
                        </div>
                      ) : '—'}
                    </Td>
                    <Td muted>
                      <div className="text-[12px]">{n.contacto}</div>
                      <div className="text-[11px] text-[#5f6f80]">{n.email}</div>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1 justify-end">
                        <Btn variant="ghost" size="icon" onClick={() => openEdit(n)} title="Editar"><Edit2 size={13}/></Btn>
                        <Btn variant="danger" size="icon" onClick={() => setConfirmDel(n)} title="Eliminar"><Trash2 size={13}/></Btn>
                      </div>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </TableWrap>
        )
      }

      {/* Modal add/edit */}
      <Modal open={modalOpen} onClose={() => setModal(false)} title={editItem ? 'Editar Negocio' : 'Registrar Nuevo Negocio'} size="lg"
        footer={<>
          <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn variant="primary" onClick={save}><Save size={14}/>{editItem ? 'Guardar cambios' : 'Registrar negocio'}</Btn>
        </>}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nombre del negocio *" className="col-span-2">
            <input className={`${inp} col-span-2`} value={form.nombre||''} onChange={e => f('nombre',e.target.value)} placeholder="Empresa XYZ S.A.C." />
          </Field>
          <Field label="RUC / Identificación fiscal">
            <input className={inp} value={form.ruc||''} onChange={e => f('ruc',e.target.value)} placeholder="20123456789" />
          </Field>
          <Field label="Contacto principal">
            <input className={inp} value={form.contacto||''} onChange={e => f('contacto',e.target.value)} placeholder="Juan Pérez" />
          </Field>
          <Field label="Email">
            <input type="email" className={inp} value={form.email||''} onChange={e => f('email',e.target.value)} placeholder="contacto@empresa.com" />
          </Field>
          <Field label="Teléfono">
            <input className={inp} value={form.telefono||''} onChange={e => f('telefono',e.target.value)} placeholder="+51 999 888 777" />
          </Field>
          <Field label="Código URL (slug de acceso) *">
            <input className={inp} value={form.empresaId||''} onChange={e => f('empresaId', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))} placeholder="mi-empresa" />
            {form.empresaId && (
              <div className="flex items-center gap-2 mt-1.5 px-2.5 py-1.5 bg-[#00c896]/8 border border-[#00c896]/20 rounded-lg">
                <Link2 size={11} className="text-[#00c896] shrink-0"/>
                <span className="text-[11px] text-[#00c896] font-mono truncate">
                  {window.location.origin}/app/{form.empresaId}
                </span>
              </div>
            )}
          </Field>
          {!editItem && (<>
            <Field label="Nombre del administrador *">
              <input className={inp} value={form.adminNombre||''} onChange={e => f('adminNombre',e.target.value)} placeholder="Juan Pérez" />
            </Field>
            <Field label="Email del administrador *">
              <input type="email" className={inp} value={form.adminEmail||''} onChange={e => f('adminEmail',e.target.value)} placeholder="admin@empresa.com" />
            </Field>
            <div className="col-span-2">
              <Field label="Contraseña inicial (mín. 8 caracteres) *">
                <div className="relative">
                  <input type={showPass?'text':'password'} className={`${inp} pr-10`} value={form.adminPassword||''} onChange={e => f('adminPassword',e.target.value)} placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPass(p=>!p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6f80] hover:text-[#e8edf2]">
                    {showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                </div>
              </Field>
            </div>
          </>)}
          <Field label="Plan contratado">
            <select className={inp} value={form.plan||'trial'} onChange={e => {
              const selectedPlan = planes.find(p => p.id === e.target.value)
              f('plan', e.target.value)
              if (selectedPlan && !editItem) {
                f('fechaVencimiento', format(addDays(new Date(), selectedPlan.vigenciaDias || 30), 'yyyy-MM-dd'))
              }
            }}>
              {planes.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.precioMensual === 0 ? '(Gratis)' : `(S/ ${p.precioMensual}/mes)`}</option>)}
            </select>
          </Field>
          <Field label="Estado">
            <select className={inp} value={form.estado||'trial'} onChange={e => f('estado',e.target.value)}>
              {['trial','activo','suspendido','cancelado'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </Field>
          <Field label="Fecha de registro">
            <input type="date" className={inp} value={form.fechaRegistro||''} onChange={e => f('fechaRegistro',e.target.value)} />
          </Field>
          <Field label="Fecha de vencimiento">
            <input type="date" className={inp} value={form.fechaVencimiento||''} onChange={e => f('fechaVencimiento',e.target.value)} />
          </Field>
          <div className="col-span-2">
            <Field label="Notas internas">
              <textarea rows={2} className={`${inp} resize-y`} value={form.notas||''} onChange={e => f('notas',e.target.value)} placeholder="Observaciones, acuerdos especiales…" />
            </Field>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={() => remove(confirmDel?.id)}
        danger title="Eliminar negocio" message={`¿Confirmas la eliminación de "${confirmDel?.nombre}"? Esta acción no se puede deshacer.`} />
    </div>
  )
}
