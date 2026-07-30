import { useState, useEffect } from 'react'
import { Eye, EyeOff, Shield, Key, CheckSquare, Square } from 'lucide-react'
import { Modal, Field, Btn } from '../../components/ui/index'
import { useAreasInternasList } from '../../queries/areas-internas.queries'
import { SI, SEL, MODULOS_GRUPOS } from './constants'

// ════════════════════════════════════════════════════════
// MODAL USUARIO
// ════════════════════════════════════════════════════════
export default function ModalUsuario({ open, onClose, editando, onSave, sesionId, roles }) {
  const { data: areas = [] } = useAreasInternasList()
  const init = { nombre:'', email:'', password:'', rol:'almacenero', areaId:'', activo:true }
  const [form,     setForm]     = useState(init)
  const [showPass, setShowPass] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    setForm(editando ? { ...init, ...editando, password:'' } : init)
    setShowPass(false)
  }, [editando, open]) // eslint-disable-line

  const rolSeleccionado = roles[form.rol]
  const esAdmin         = rolSeleccionado?.permisos?.includes('*')
  const necesitaArea    = form.rol === 'solicitante'
  const passOk  = editando
    ? (!form.password || form.password.length >= 8)
    : form.password.length >= 8
  const canSave = form.nombre.trim() && form.email.trim() && passOk
    && (!necesitaArea || form.areaId)

  return (
    <Modal open={open} onClose={onClose}
      title={editando ? 'Editar Usuario' : 'Nuevo Usuario'} size="md"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" disabled={!canSave} onClick={() => canSave && onSave(form)}>Guardar</Btn>
      </>}>

      <Field label="Nombre completo *">
        <input className={SI} value={form.nombre} onChange={e => f('nombre', e.target.value)} placeholder="Juan Pérez"/>
      </Field>

      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Email *">
          <input type="email" className={SI} value={form.email} onChange={e => f('email', e.target.value)}
            placeholder="usuario@empresa.pe" disabled={!!editando} style={editando?{opacity:.5}:{}}/>
          {editando && <span className="text-[10px] text-[#5f6f80]">El email no se puede cambiar</span>}
        </Field>
        <Field label={editando ? 'Nueva contraseña (vacío = no cambiar)' : 'Contraseña *'}>
          <div className="relative">
            <input type={showPass?'text':'password'} className={SI+' pr-10'} value={form.password}
              onChange={e => f('password', e.target.value)} placeholder="Mínimo 8 caracteres"/>
            <button type="button" onClick={() => setShowPass(p=>!p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6f80] hover:text-[#9ba8b6]">
              {showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
            </button>
          </div>
        </Field>
      </div>

      <Field label="Rol *">
        <select className={SEL} value={form.rol} onChange={e => f('rol', e.target.value)}>
          {Object.entries(roles).map(([codigo, r]) => (
            <option key={codigo} value={codigo}>{r.label}{r.desc ? ` — ${r.desc}` : ''}</option>
          ))}
        </select>
      </Field>

      {form.rol === 'solicitante' && (
        <Field label="Área asignada *">
          <select className={SEL} value={form.areaId || ''} onChange={e => f('areaId', e.target.value)}>
            <option value="">Selecciona un área...</option>
            {(areas || []).filter(a => a.activo).map(a => (
              <option key={a.id} value={a.id}>{a.nombre} ({a.codigo})</option>
            ))}
          </select>
          <span className="text-[10px] text-[#5f6f80] mt-1">El solicitante solo verá pedidos internos de esta área</span>
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
