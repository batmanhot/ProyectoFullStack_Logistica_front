import { useState, useEffect } from 'react'
import { Modal, Btn, Field, Input, Select } from '../../components/ui/index'

// ── Modal Transportista ──────────────────────────────────
export default function ModalTransportista({ open, onClose, editando, onSave, saving }) {
  const init = { nombre:'', tipo:'PROPIO', placa:'', vehiculo:'', telefono:'', email:'', licencia:'', activo:true }
  const [form, setForm] = useState(init)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    setForm(editando ? {
      ...init, ...editando,
      placa:    editando.placa    || '',
      vehiculo: editando.vehiculo || '',
      telefono: editando.telefono || '',
      email:    editando.email    || '',
      licencia: editando.licencia || '',
      activo:   editando.activo !== false,
    } : init)
  }, [editando, open]) // eslint-disable-line

  return (
    <Modal open={open} onClose={onClose} title={editando ? 'Editar Transportista' : 'Nuevo Transportista'} size="md"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn variant="primary" disabled={!form.nombre.trim() || saving} onClick={() => onSave(form)}>{saving ? 'Guardando...' : 'Guardar'}</Btn></>}>
      <div className="grid grid-cols-2 gap-3.5">
        <div className="col-span-2"><Field label="Nombre / Razón Social *"><Input value={form.nombre} onChange={e => f('nombre', e.target.value)} placeholder="Juan Pérez o Courier Express SAC"/></Field></div>
        <Field label="Tipo"><Select value={form.tipo} onChange={e => f('tipo', e.target.value)}><option value="PROPIO">Propio</option><option value="TERCERO">Tercero</option></Select></Field>
        <Field label="Placa del vehículo"><Input value={form.placa} onChange={e => f('placa', e.target.value.toUpperCase())} placeholder="ABC-123"/></Field>
        <div className="col-span-2"><Field label="Descripción del vehículo"><Input value={form.vehiculo} onChange={e => f('vehiculo', e.target.value)} placeholder="Toyota Hilux, Van H-1, Moto..."/></Field></div>
        <Field label="Teléfono / Celular"><Input value={form.telefono} onChange={e => f('telefono', e.target.value)} placeholder="987-001-001"/></Field>
        <Field label="Licencia de conducir"><Input value={form.licencia} onChange={e => f('licencia', e.target.value)} placeholder="Q84512301"/></Field>
        <div className="col-span-2"><Field label="Email"><Input type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="conductor@empresa.pe"/></Field></div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[#9ba8b6]">
        <input type="checkbox" checked={!!form.activo} onChange={e => f('activo', e.target.checked)} className="accent-[#00c896]"/>
        Transportista activo
      </label>
    </Modal>
  )
}
