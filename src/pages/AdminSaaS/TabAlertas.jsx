import { useState } from 'react'
import { Bell, Plus, Clock, CheckCircle, Edit2, Trash2, Save } from 'lucide-react'
import {
  Modal, ConfirmDialog, EmptyState, Badge, Btn,
  Field, TableWrap, Th, Td, Alert, Toggle,
} from '../../components/ui/index'

// ══════════════════════════════════════════════════════════
// TAB: ALERTAS DE VENCIMIENTO
// ══════════════════════════════════════════════════════════
export default function TabAlertas({ alertas, vencimientos, crearAlerta, actualizarAlerta, eliminarAlerta, toast }) {
  const [modalOpen, setModal]   = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm]         = useState({})
  const [confirmDel, setConfirmDel] = useState(null)
  const CANALES = ['email', 'sistema', 'whatsapp', 'sms']

  function openNew() {
    setEditItem(null)
    setForm({ diasAntes:7, activa:true, canales:['email','sistema'], asunto:'', mensaje:'' })
    setModal(true)
  }
  function openEdit(a) { setEditItem(a); setForm({ ...a, canales:[...(a.canales||[])] }); setModal(true) }

  async function save() {
    if (!form.asunto?.trim()) { toast('El asunto es requerido', 'error'); return }
    if (editItem) {
      const res = await actualizarAlerta.mutateAsync({ id: editItem.id, diasAntes: form.diasAntes, activa: form.activa, canales: form.canales, asunto: form.asunto, mensaje: form.mensaje })
      if (res?.error) { toast(res.error, 'error'); return }
      toast('Regla de alerta actualizada', 'success')
    } else {
      const res = await crearAlerta.mutateAsync({ diasAntes: form.diasAntes, activa: form.activa, canales: form.canales, asunto: form.asunto, mensaje: form.mensaje })
      if (res?.error) { toast(res.error, 'error'); return }
      toast('Regla de alerta creada', 'success')
    }
    setModal(false)
  }

  async function remove(id) {
    const res = await eliminarAlerta.mutateAsync(id)
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Regla eliminada', 'success')
  }
  async function toggleActiva(id) {
    const alerta = alertas.find(a => a.id === id)
    await actualizarAlerta.mutateAsync({ id, activa: !alerta?.activa })
  }
  function toggleCanal(canal) {
    setForm(p => {
      const cs = p.canales || []
      return { ...p, canales: cs.includes(canal) ? cs.filter(c => c !== canal) : [...cs, canal] }
    })
  }

  const inp = 'w-full px-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[13px] text-[#e8edf2] placeholder-[#5f6f80] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20'
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="space-y-6">
      {/* Reglas */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[15px] font-semibold text-[#e8edf2]">Reglas de Alerta</h2>
            <p className="text-[12px] text-[#5f6f80] mt-0.5">Define cuándo y cómo se notifica a los clientes sobre el vencimiento de su plan</p>
          </div>
          <Btn variant="primary" onClick={openNew}><Plus size={14}/>Nueva regla</Btn>
        </div>

        {alertas.length === 0
          ? <EmptyState icon={Bell} title="Sin reglas de alerta" action={<Btn variant="primary" onClick={openNew}><Plus size={14}/>Crear regla</Btn>} />
          : (
            <div className="space-y-2">
              {[...alertas].sort((a,b) => a.diasAntes - b.diasAntes).map(a => (
                <div key={a.id} className={`flex items-start gap-4 p-4 bg-[#161d28] rounded-xl border transition-all ${a.activa ? 'border-white/8' : 'border-white/4 opacity-60'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-[13px] ${a.diasAntes <= 7 ? 'bg-red-500/15 text-red-400' : a.diasAntes <= 15 ? 'bg-yellow-500/15 text-yellow-400' : 'bg-blue-500/15 text-blue-400'}`}>
                    {a.diasAntes}d
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-semibold text-[#e8edf2]">{a.asunto}</span>
                      <Badge variant={a.activa ? 'success' : 'neutral'}>{a.activa ? 'Activa' : 'Inactiva'}</Badge>
                    </div>
                    <p className="text-[12px] text-[#5f6f80] truncate">{a.mensaje}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      {(a.canales||[]).map(c => (
                        <span key={c} className="text-[11px] px-2 py-0.5 rounded-full bg-white/6 text-[#9ba8b6]">{c}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Toggle value={a.activa} onChange={() => toggleActiva(a.id)} />
                    <Btn variant="ghost" size="icon" onClick={() => openEdit(a)}><Edit2 size={13}/></Btn>
                    <Btn variant="danger" size="icon" onClick={() => setConfirmDel(a)}><Trash2 size={13}/></Btn>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>

      {/* Vencimientos próximos */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Clock size={15} className="text-[#00c896]" />
          <h3 className="text-[14px] font-semibold text-[#e8edf2]">Vencimientos próximos (≤30 días)</h3>
          <Badge variant={vencimientos.length > 0 ? 'warning' : 'success'}>{vencimientos.length}</Badge>
        </div>
        {vencimientos.length === 0 ? (
          <Alert variant="success">No hay vencimientos próximos en los próximos 30 días.</Alert>
        ) : (
          <TableWrap>
            <thead>
              <tr><Th>Empresa</Th><Th>Código</Th><Th>Vencimiento</Th><Th>Días restantes</Th><Th>Alerta aplicable</Th></tr>
            </thead>
            <tbody>
              {vencimientos.map(v => (
                <tr key={v.empresaId} className="border-t border-white/5 hover:bg-white/2">
                  <Td>
                    <div className="font-medium text-[#e8edf2]">{v.nombre}</div>
                  </Td>
                  <Td muted>{v.codigo}</Td>
                  <Td muted>{v.fechaVencimiento ? String(v.fechaVencimiento).slice(0, 10) : '—'}</Td>
                  <Td>
                    <span className={`font-bold text-[14px] ${v.dias <= 0 ? 'text-red-400' : v.dias <= 7 ? 'text-red-400' : v.dias <= 15 ? 'text-yellow-400' : 'text-blue-400'}`}>
                      {v.dias <= 0 ? 'VENCIDO' : `${v.dias} días`}
                    </span>
                  </Td>
                  <Td>
                    {v.reglaAplicable
                      ? <span className="text-[11px] px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full">{v.reglaAplicable.asunto}</span>
                      : <span className="text-[11px] text-[#5f6f80]">—</span>
                    }
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModal(false)} title={editItem ? 'Editar regla de alerta' : 'Nueva regla de alerta'} size="md"
        footer={<>
          <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn variant="primary" onClick={save}><Save size={14}/>{editItem ? 'Guardar cambios' : 'Crear regla'}</Btn>
        </>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Días antes del vencimiento">
              <input type="number" min="1" max="365" className={inp} value={form.diasAntes||7} onChange={e => f('diasAntes',parseInt(e.target.value)||1)} />
            </Field>
            <Field label="Estado">
              <div className="flex items-center h-9">
                <Toggle value={!!form.activa} onChange={v => f('activa',v)} label="Regla activa" />
              </div>
            </Field>
          </div>
          <Field label="Asunto del mensaje *">
            <input className={inp} value={form.asunto||''} onChange={e => f('asunto',e.target.value)} placeholder="¡Plan próximo a vencer!" />
          </Field>
          <Field label="Mensaje" hint="Variables: {plan} = nombre del plan, {dias} = días restantes, {empresa} = nombre del negocio">
            <textarea rows={3} className={`${inp} resize-y`} value={form.mensaje||''} onChange={e => f('mensaje',e.target.value)} placeholder="Tu plan {plan} vence en {dias} días…" />
          </Field>
          <Field label="Canales de notificación">
            <div className="flex flex-wrap gap-2 mt-1">
              {CANALES.map(c => {
                const active = (form.canales||[]).includes(c)
                return (
                  <button key={c} type="button" onClick={() => toggleCanal(c)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${active ? 'bg-[#00c896]/15 border-[#00c896]/40 text-[#00c896]' : 'bg-[#1a2230] border-white/8 text-[#5f6f80] hover:text-[#e8edf2]'}`}>
                    {active && <CheckCircle size={12}/>}{c}
                  </button>
                )
              })}
            </div>
          </Field>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={() => remove(confirmDel?.id)}
        danger title="Eliminar regla" message={`¿Eliminar la regla "${confirmDel?.asunto}"?`} />
    </div>
  )
}
