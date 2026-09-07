import { useState } from 'react'
import { CreditCard, Plus, Star, CheckCircle, Edit2, Trash2, Save } from 'lucide-react'
import {
  Modal, ConfirmDialog, EmptyState, Badge, Btn,
  Field, Toggle,
} from '../../components/ui/index'

// ══════════════════════════════════════════════════════════
// TAB: PLANES Y PRECIOS
// ══════════════════════════════════════════════════════════
export default function TabPlanes({ planes, crearPlan, actualizarPlan, eliminarPlan, toast }) {
  const [modalOpen, setModal]   = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm]         = useState({})
  const [newFeat, setNewFeat]   = useState('')
  const [confirmDel, setConfirmDel] = useState(null)

  function openNew() {
    setEditItem(null)
    setForm({ nombre:'', descripcion:'', precioMensual:0, precioAnual:0, moneda:'PEN', color:'#6366f1', destacado:false, activo:true, esPublico:true, vigenciaDias:30, caracteristicas:[] })
    setModal(true)
  }

  function openEdit(p) { setEditItem(p); setForm({ ...p, caracteristicas:[...(p.caracteristicas||[])] }); setModal(true) }

  async function save() {
    if (!form.nombre?.trim()) { toast('El nombre del plan es requerido', 'error'); return }
    if (editItem) {
      const res = await actualizarPlan.mutateAsync({ id: editItem.id, nombre: form.nombre, descripcion: form.descripcion, precioMensual: form.precioMensual, precioAnual: form.precioAnual, moneda: form.moneda, color: form.color, destacado: form.destacado, activo: form.activo, esPublico: form.esPublico, vigenciaDias: form.vigenciaDias, caracteristicas: form.caracteristicas })
      if (res?.error) { toast(res.error, 'error'); return }
      toast('Plan actualizado', 'success')
    } else {
      const id = form.nombre.toLowerCase().replace(/\s+/g,'-')
      const res = await crearPlan.mutateAsync({ id, ...form })
      if (res?.error) { toast(res.error, 'error'); return }
      toast('Plan creado', 'success')
    }
    setModal(false)
  }

  async function remove(id) {
    const res = await eliminarPlan.mutateAsync(id)
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Plan eliminado', 'success')
  }
  async function toggleActivo(id) {
    const plan = planes.find(p => p.id === id)
    const res = await actualizarPlan.mutateAsync({ id, activo: !plan?.activo })
    if (res?.error) { toast(res.error, 'error'); return }
  }
  async function toggleDestacado(id) {
    const plan = planes.find(p => p.id === id)
    const res = await actualizarPlan.mutateAsync({ id, destacado: !plan?.destacado })
    if (res?.error) { toast(res.error, 'error'); return }
    for (const p of planes.filter(x => x.id !== id && x.destacado)) {
      const resOtro = await actualizarPlan.mutateAsync({ id: p.id, destacado: false })
      if (resOtro?.error) { toast(resOtro.error, 'error'); return }
    }
  }
  function addFeat() { if (!newFeat.trim()) return; setForm(p => ({ ...p, caracteristicas:[...(p.caracteristicas||[]), newFeat.trim()] })); setNewFeat('') }
  function removeFeat(i) { setForm(p => ({ ...p, caracteristicas: p.caracteristicas.filter((_,idx) => idx !== i) })) }

  const inp = 'w-full px-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[13px] text-[#e8edf2] placeholder-[#5f6f80] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20'
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-[#e8edf2]">Planes y Precios</h2>
          <p className="text-[12px] text-[#5f6f80] mt-0.5">Define los planes SaaS disponibles para tus clientes</p>
        </div>
        <Btn variant="primary" onClick={openNew}><Plus size={14}/>Nuevo plan</Btn>
      </div>

      {planes.length === 0
        ? <EmptyState icon={CreditCard} title="No hay planes definidos" action={<Btn variant="primary" onClick={openNew}><Plus size={14}/>Crear plan</Btn>} />
        : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {planes.map(p => (
              <div key={p.id} className={`relative bg-[#161d28] border rounded-xl overflow-hidden transition-all ${p.destacado ? 'border-[#00c896]/40 shadow-[0_0_20px_rgba(0,200,150,0.08)]' : 'border-white/8'}`}>
                <div className="h-1 w-full" style={{ background: p.color }} />
                {p.destacado && (
                  <div className="absolute top-3 right-3">
                    <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#00c896]/15 text-[#00c896]">
                      <Star size={10} fill="currentColor" /> Destacado
                    </span>
                  </div>
                )}
                {!p.activo && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl z-10">
                    <Badge variant="neutral">Inactivo</Badge>
                  </div>
                )}
                <div className="p-5">
                  <h3 className="text-[17px] font-bold text-[#e8edf2] mb-1">{p.nombre}</h3>
                  <p className="text-[12px] text-[#5f6f80] mb-4">{p.descripcion}</p>
                  <div className="mb-4">
                    <span className="text-[28px] font-extrabold text-[#e8edf2]">{p.precioMensual === 0 ? 'Gratis' : `S/ ${p.precioMensual}`}</span>
                    {p.precioMensual > 0 && <span className="text-[13px] text-[#5f6f80]">/mes</span>}
                    {p.precioAnual > 0 && (
                      <div className="text-[12px] text-[#5f6f80] mt-0.5">S/ {p.precioAnual}/año <span className="text-emerald-400">(ahorra {Math.round(100-(p.precioAnual/(p.precioMensual*12)*100))}%)</span></div>
                    )}
                  </div>
                  <ul className="space-y-1.5 mb-5">
                    {(p.caracteristicas||[]).map((c, i) => (
                      <li key={i} className="flex items-center gap-2 text-[12px] text-[#9ba8b6]">
                        <CheckCircle size={12} className="shrink-0" style={{ color: p.color }} />{c}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-2 pt-3 border-t border-white/6">
                    <Btn variant="ghost" size="sm" onClick={() => openEdit(p)}><Edit2 size={12}/>Editar</Btn>
                    <Btn variant="ghost" size="sm" onClick={() => toggleActivo(p.id)}>{p.activo ? 'Desactivar' : 'Activar'}</Btn>
                    <Btn variant="ghost" size="sm" onClick={() => toggleDestacado(p.id)}><Star size={12}/>Destacar</Btn>
                    <Btn variant="danger" size="icon" onClick={() => setConfirmDel(p)} title="Eliminar"><Trash2 size={12}/></Btn>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      }

      <Modal open={modalOpen} onClose={() => setModal(false)} title={editItem ? `Editar plan: ${editItem.nombre}` : 'Crear nuevo plan'} size="lg"
        footer={<>
          <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn variant="primary" onClick={save}><Save size={14}/>{editItem ? 'Guardar cambios' : 'Crear plan'}</Btn>
        </>}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field label="Nombre del plan *">
              <input className={inp} value={form.nombre||''} onChange={e => f('nombre',e.target.value)} placeholder="Pro, Enterprise…" />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Descripción corta">
              <input className={inp} value={form.descripcion||''} onChange={e => f('descripcion',e.target.value)} placeholder="Breve descripción para los clientes" />
            </Field>
          </div>
          <Field label="Precio mensual (S/)">
            <input type="number" min="0" className={inp} value={form.precioMensual||0} onChange={e => f('precioMensual', parseFloat(e.target.value)||0)} />
          </Field>
          <Field label="Precio anual (S/)">
            <input type="number" min="0" className={inp} value={form.precioAnual||0} onChange={e => f('precioAnual', parseFloat(e.target.value)||0)} />
          </Field>
          <Field label="Vigencia por defecto (días)">
            <input type="number" min="1" className={inp} value={form.vigenciaDias||30} onChange={e => f('vigenciaDias', parseInt(e.target.value)||30)} />
          </Field>
          <Field label="Color de acento">
            <div className="flex items-center gap-2">
              <input type="color" value={form.color||'#6366f1'} onChange={e => f('color',e.target.value)} className="w-10 h-9 rounded cursor-pointer bg-transparent border border-white/8" />
              <input className={`${inp} flex-1`} value={form.color||''} onChange={e => f('color',e.target.value)} placeholder="#6366f1" />
            </div>
          </Field>
          <Field label="Moneda">
            <select className={inp} value={form.moneda||'USD'} onChange={e => f('moneda',e.target.value)}>
              <option>USD</option><option>PEN</option><option>EUR</option>
            </select>
          </Field>
          <div className="col-span-2 flex items-center gap-6 flex-wrap">
            <Toggle value={!!form.activo} onChange={v => f('activo',v)} label="Plan activo (visible para clientes)" />
            <Toggle value={!!form.destacado} onChange={v => f('destacado',v)} label="Destacar este plan" />
            <Toggle value={form.esPublico !== false} onChange={v => f('esPublico',v)} label="Público (landing y selector de plan)" />
          </div>
          <div className="col-span-2">
            <Field label="Características incluidas">
              <div className="space-y-1.5 mb-2">
                {(form.caracteristicas||[]).map((c, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[#1a2230] px-3 py-1.5 rounded-lg">
                    <CheckCircle size={12} className="text-[#00c896] shrink-0" />
                    <span className="flex-1 text-[13px] text-[#e8edf2]">{c}</span>
                    <button onClick={() => removeFeat(i)} className="text-[#5f6f80] hover:text-red-400"><Trash2 size={12}/></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input className={`${inp} flex-1`} value={newFeat} onChange={e => setNewFeat(e.target.value)} onKeyDown={e => e.key==='Enter' && addFeat()} placeholder="Agregar característica…" />
                <Btn variant="secondary" onClick={addFeat}><Plus size={14}/>Agregar</Btn>
              </div>
            </Field>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={() => remove(confirmDel?.id)}
        danger title="Eliminar plan" message={`¿Eliminar el plan "${confirmDel?.nombre}"? Los negocios con este plan no serán afectados.`} />
    </div>
  )
}
