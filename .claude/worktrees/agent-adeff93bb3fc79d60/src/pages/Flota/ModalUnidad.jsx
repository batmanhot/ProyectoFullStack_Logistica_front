import { useState, useEffect } from 'react'
import { Modal, Btn, Field, Input, Select } from '../../components/ui/index'
import { TIPO_VEHICULO, toDateStr } from './constants'

// ════════════════════════════════════════════════════════
// MODAL NUEVA / EDITAR UNIDAD
// ════════════════════════════════════════════════════════
export default function ModalUnidad({ open, onClose, editando, onSave }) {
  const init = {
    nombre:'', tipo:'Camioneta', placa:'', anio:'', conductor:'',
    kmActual:0, vencSoat:'', vencRevTecnica:'', proxMantenimiento:'', activo:true,
  }
  const [form, setForm] = useState(init)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (!open) return
    if (editando) {
      setForm({
        ...init,
        ...editando,
        conductor:         editando.conductor || '',
        vencSoat:          toDateStr(editando.vencSoat)          || '',
        vencRevTecnica:    toDateStr(editando.vencRevTecnica)    || '',
        proxMantenimiento: toDateStr(editando.proxMantenimiento) || '',
        kmActual:          Number(editando.kmActual) || 0,
      })
    } else {
      setForm(init)
    }
  }, [open, editando]) // eslint-disable-line

  return (
    <Modal open={open} onClose={onClose}
      title={editando ? 'Editar Unidad' : 'Nueva Unidad'}
      size="md"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary"
          disabled={!form.nombre || !form.placa}
          onClick={() => onSave(editando ? { ...form, id: editando.id } : form)}>
          Guardar
        </Btn>
      </>}>
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Nombre / Descripción *">
          <Input value={form.nombre} onChange={e=>f('nombre',e.target.value)} placeholder="Ej: Camioneta 01"/>
        </Field>
        <Field label="Tipo">
          <Select value={form.tipo} onChange={e=>f('tipo',e.target.value)}>
            {TIPO_VEHICULO.map(t => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label="Placa *">
          <Input value={form.placa} onChange={e=>f('placa',e.target.value.toUpperCase())} placeholder="ABC-123"/>
        </Field>
        <Field label="Año">
          <Input type="number" value={form.anio} onChange={e=>f('anio', e.target.value ? +e.target.value : '')} min="1990" max="2030"/>
        </Field>
        <Field label="Conductor asignado">
          <Input value={form.conductor} onChange={e=>f('conductor',e.target.value)} placeholder="Nombre del conductor"/>
        </Field>
        <Field label="Km actual">
          <Input type="number" value={form.kmActual} onChange={e=>f('kmActual',+e.target.value)} min="0"/>
        </Field>
        <Field label="Venc. SOAT">
          <Input type="date" value={form.vencSoat} onChange={e=>f('vencSoat',e.target.value)}/>
        </Field>
        <Field label="Venc. Rev. Técnica">
          <Input type="date" value={form.vencRevTecnica} onChange={e=>f('vencRevTecnica',e.target.value)}/>
        </Field>
        <Field label="Próx. Mantenimiento">
          <Input type="date" value={form.proxMantenimiento} onChange={e=>f('proxMantenimiento',e.target.value)}/>
        </Field>
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
