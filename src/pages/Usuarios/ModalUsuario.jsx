import { useState, useEffect } from 'react'
import { Eye, EyeOff, Shield, Key, CheckSquare, Square } from 'lucide-react'
import { Modal, Field, Btn, Input, Select } from '../../components/ui/index'
import { useAreasInternasList } from '../../queries/areas-internas.queries'
import { useTransportistasList } from '../../queries/transportistas.queries'
import { MODULOS_GRUPOS } from './constants'

// ════════════════════════════════════════════════════════
// MODAL USUARIO
// ════════════════════════════════════════════════════════
export default function ModalUsuario({ open, onClose, editando, onSave, sesionId, roles }) {
  const { data: areas = [] } = useAreasInternasList()
  const { data: transportistas = [] } = useTransportistasList()
  const init = { nombre:'', email:'', password:'', rol:'almacenero', areaId:'', transportistaId:'', activo:true }
  const [form,     setForm]     = useState(init)
  const [showPass, setShowPass] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    // editando trae rol/area/transportista como objetos anidados (shape real
    // de la API) — hay que aplanarlos a los campos que este form maneja
    // (form.rol es un código string, no un objeto). Bug preexistente: antes
    // de este fix, editar CUALQUIER usuario dejaba el selector de Rol y de
    // Área sin preseleccionar nada, porque se pisaban con el objeto crudo.
    setForm(editando ? {
      ...init,
      ...editando,
      rol: editando.rol?.codigo || editando.rol || init.rol,
      areaId: editando.area?.id || editando.areaId || '',
      transportistaId: editando.transportista?.id || editando.transportistaId || '',
      password: '',
    } : init)
    setShowPass(false)
  }, [editando, open]) // eslint-disable-line

  const rolSeleccionado    = roles[form.rol]
  const esAdmin            = rolSeleccionado?.permisos?.includes('*')
  const necesitaArea       = form.rol === 'solicitante'
  const necesitaTransportista = form.rol === 'chofer'
  const passOk  = editando
    ? (!form.password || form.password.length >= 8)
    : form.password.length >= 8
  const canSave = form.nombre.trim() && form.email.trim() && passOk
    && (!necesitaArea || form.areaId)
    && (!necesitaTransportista || form.transportistaId)

  return (
    <Modal open={open} onClose={onClose}
      title={editando ? 'Editar Usuario' : 'Nuevo Usuario'} size="md"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" disabled={!canSave} onClick={() => canSave && onSave(form)}>Guardar</Btn>
      </>}>

      <Field label="Nombre completo *">
        <Input value={form.nombre} onChange={e => f('nombre', e.target.value)} placeholder="Juan Pérez"/>
      </Field>

      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Email *">
          <Input type="email" value={form.email} onChange={e => f('email', e.target.value)}
            placeholder="usuario@empresa.pe" disabled={!!editando} style={editando?{opacity:.5}:{}}/>
          {editando && <span className="text-[10px] text-[#5f6f80]">El email no se puede cambiar</span>}
        </Field>
        <Field label={editando ? 'Nueva contraseña (vacío = no cambiar)' : 'Contraseña *'}>
          <div className="relative">
            <Input type={showPass?'text':'password'} className="pr-10" value={form.password}
              onChange={e => f('password', e.target.value)} placeholder="Mínimo 8 caracteres"/>
            <button type="button" onClick={() => setShowPass(p=>!p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6f80] hover:text-[#9ba8b6]">
              {showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
            </button>
          </div>
        </Field>
      </div>

      <Field label="Rol *">
        <Select value={form.rol} onChange={e => f('rol', e.target.value)}>
          {Object.entries(roles).map(([codigo, r]) => (
            <option key={codigo} value={codigo}>{r.label}{r.desc ? ` — ${r.desc}` : ''}</option>
          ))}
        </Select>
      </Field>

      {form.rol === 'solicitante' && (
        <Field label="Área asignada *">
          <Select value={form.areaId || ''} onChange={e => f('areaId', e.target.value)}>
            <option value="">Selecciona un área...</option>
            {(areas || []).filter(a => a.activo).map(a => (
              <option key={a.id} value={a.id}>{a.nombre} ({a.codigo})</option>
            ))}
          </Select>
          <span className="text-[10px] text-[#5f6f80] mt-1">El solicitante solo verá pedidos internos de esta área</span>
        </Field>
      )}

      {form.rol === 'chofer' && (
        <Field label="Transportista vinculado *">
          <Select value={form.transportistaId || ''} onChange={e => f('transportistaId', e.target.value)}>
            <option value="">Selecciona un transportista...</option>
            {(transportistas || []).filter(t => t.activo).map(t => (
              <option key={t.id} value={t.id}>{t.nombre}{t.placa ? ` (${t.placa})` : ''}</option>
            ))}
          </Select>
          <span className="text-[10px] text-[#5f6f80] mt-1">El chofer solo verá y confirmará entrega de los despachos asignados a este transportista</span>
        </Field>
      )}

      {rolSeleccionado && (
        <div className="bg-[#1a2230] rounded-xl p-4 border border-white/6">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={13} style={{ color: rolSeleccionado.color||'#5f6f80' }}/>
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide">
              Módulos incluidos en: {rolSeleccionado.label}
            </span>
          </div>
          {esAdmin ? (
            <div className="flex items-center gap-2 text-[12px] text-amber-400">
              <Key size={13}/> Acceso completo a todos los módulos del sistema
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-x-4 gap-y-1">
              {MODULOS_GRUPOS.flatMap(g => g.items).map(mod => {
                const tiene = rolSeleccionado.permisos?.includes(mod.id)
                return (
                  <div key={mod.id} className={`flex items-center gap-1.5 text-[11px] ${tiene ? 'text-[#e8edf2]' : 'text-[#5f6f80]'}`}>
                    {tiene
                      ? <CheckSquare size={11} style={{ color: rolSeleccionado.color||'#00c896' }}/>
                      : <Square size={11}/>
                    }
                    {mod.label}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {editando && editando.id !== sesionId && (
        <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[#9ba8b6]">
          <input type="checkbox" checked={form.activo} onChange={e => f('activo', e.target.checked)} className="accent-[#00c896]"/>
          Usuario activo
        </label>
      )}
    </Modal>
  )
}
