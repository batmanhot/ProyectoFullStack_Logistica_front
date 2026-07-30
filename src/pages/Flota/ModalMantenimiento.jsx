import { useState, useEffect } from 'react'
import { Wrench } from 'lucide-react'
import { Modal, Btn, Field } from '../../components/ui/index'
import { SI, SEL, TIPO_MANT } from './constants'

// ════════════════════════════════════════════════════════
// MODAL REGISTRAR MANTENIMIENTO
// ════════════════════════════════════════════════════════
export default function ModalMantenimiento({ open, onClose, unidad, editando, onSave }) {
  const initForm = { tipo:'Cambio de aceite', kmActual:'', costo:'', taller:'', observaciones:'', proximoMantenimiento:'' }
  const [form, setForm] = useState(initForm)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (!open) return
    if (editando) {
      setForm({
        tipo:          editando.tipo || initForm.tipo,
        kmActual:      editando.kmActual ?? '',
        costo:         editando.costo ?? '',
        taller:        editando.taller || '',
        observaciones: editando.observaciones || '',
        proximoMantenimiento: '',
      })
    } else {
      setForm(initForm)
    }
  }, [open, editando]) // eslint-disable-line

  function handleSave() {
    onSave(unidad?.id, {
      tipo:          form.tipo,
      kmActual:      form.kmActual ? +form.kmActual : undefined,
      costo:         form.costo    ? +form.costo    : undefined,
      taller:        form.taller   || undefined,
      observaciones: form.observaciones || undefined,
      proximoMantenimiento: form.proximoMantenimiento || undefined,
    })
    setForm(initForm)
  }

  return (
    <Modal open={open} onClose={onClose}
      title={editando ? `Editar Mantenimiento — ${unidad?.nombre || ''}` : `Registrar Mantenimiento — ${unidad?.nombre || ''}`}
      size="sm"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" disabled={!form.tipo} onClick={handleSave}>
          <Wrench size={13}/> {editando ? 'Guardar cambios' : 'Registrar'}
        </Btn>
      </>}>
      <Field label="Tipo de mantenimiento *">
        <select className={SEL} value={form.tipo} onChange={e=>f('tipo',e.target.value)}>
          {TIPO_MANT.map(t => <option key={t}>{t}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Km al momento">
          <input type="number" className={SI} value={form.kmActual}
            onChange={e=>f('kmActual',e.target.value)}
            placeholder={unidad?.kmActual ? String(Number(unidad.kmActual)) : '0'}/>
        </Field>
        <Field label="Costo (S/)">
          <input type="number" className={SI} value={form.costo}
            onChange={e=>f('costo',e.target.value)}
            placeholder="0.00" min="0" step="0.01"/>
        </Field>
      </div>
      <Field label="Taller / Proveedor">
        <input className={SI} value={form.taller} onChange={e=>f('taller',e.target.value)} placeholder="Nombre del taller"/>
      </Field>
      <Field label="Próximo mantenimiento" hint="Opcional — si se completa, cierra la alerta actual de esta unidad">
        <input type="date" className={SI} value={form.proximoMantenimiento} onChange={e=>f('proximoMantenimiento',e.target.value)}/>
      </Field>
      <Field label="Observaciones">
        <textarea className={SI + ' resize-none'} rows={2}
          value={form.observaciones} onChange={e=>f('observaciones',e.target.value)}
          placeholder="Detalles del mantenimiento..."/>
      </Field>
    </Modal>
  )
}
