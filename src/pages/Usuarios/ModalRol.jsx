import { useState, useEffect } from 'react'
import { Shield, Lock, Key, CheckSquare, Square } from 'lucide-react'
import { Modal, Field, Btn } from '../../components/ui/index'
import { SI, MODULOS_GRUPOS, TODOS_MODULOS, ROLES_BASE_META } from './constants'

// ════════════════════════════════════════════════════════
// MODAL ROL
// ════════════════════════════════════════════════════════
export default function ModalRol({ open, onClose, editando, onSave }) {
  // editando tiene { id: uuid, codigo, label, color, desc, permisos, ... }
  const esBase = editando?.codigo ? !!ROLES_BASE_META[editando.codigo] : false

  const init = { label:'', desc:'', color:'#3b82f6', permisos:['dashboard'], esAdmin:false }
  const [form, setForm] = useState(init)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (editando) {
      setForm({
        label:   editando.label   || '',
        desc:    editando.desc    || '',
        color:   editando.color   || '#3b82f6',
        permisos:editando.permisos?.includes('*') ? [] : (editando.permisos || []),
        esAdmin: editando.permisos?.includes('*') || false,
      })
    } else {
      setForm(init)
    }
  }, [editando, open]) // eslint-disable-line

  function toggleModulo(id) {
    setForm(p => ({
      ...p,
      permisos: p.permisos.includes(id)
        ? p.permisos.filter(x => x !== id)
        : [...p.permisos, id]
    }))
  }

  function toggleGrupo(grupo) {
    const ids = grupo.items.map(i => i.id)
    const todosActivos = ids.every(id => form.permisos.includes(id))
    setForm(p => ({
      ...p,
      permisos: todosActivos
        ? p.permisos.filter(x => !ids.includes(x))
        : [...new Set([...p.permisos, ...ids])]
    }))
  }

  function handleSave() {
    if (!form.label.trim()) return
    const permisos = form.esAdmin ? ['*'] : form.permisos
    onSave(editando?.id || null, { label: form.label.trim(), desc: form.desc.trim(), color: form.color, permisos })
  }

  const COLORES = ['#ef4444','#f59e0b','#22c55e','#3b82f6','#8b5cf6','#06b6d4','#ec4899','#00c896','#64748b']

  return (
    <Modal open={open} onClose={onClose}
      title={editando ? `Editar Rol: ${editando.label}` : 'Nuevo Rol'} size="lg"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" disabled={!form.label.trim()} onClick={handleSave}>
          <Shield size={13}/> Guardar Rol
        </Btn>
      </>}>

      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Nombre del rol *">
          <input className={SI} value={form.label} onChange={e => f('label', e.target.value)}
            placeholder="Ej: Vendedor, Auditor..." disabled={esBase}/>
        </Field>
        <Field label="Descripción breve">
          <input className={SI} value={form.desc} onChange={e => f('desc', e.target.value)}
            placeholder="Ej: Acceso de solo lectura..." disabled={esBase}/>
        </Field>
      </div>

      <div>
        <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] block mb-2">Color del rol</label>
        <div className="flex items-center gap-2 flex-wrap">
          {COLORES.map(col => (
            <button key={col} type="button"
              className={`w-7 h-7 rounded-full border-2 transition-all ${form.color===col ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
              style={{ background: col }}
              onClick={() => !esBase && f('color', col)}/>
          ))}
          <input type="color" value={form.color} onChange={e => !esBase && f('color', e.target.value)}
            className="w-7 h-7 rounded-full cursor-pointer border-0 bg-transparent" title="Color personalizado"/>
        </div>
      </div>

      <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
        form.esAdmin ? 'bg-amber-500/10 border-amber-500/30' : 'bg-[#1a2230] border-white/6 hover:border-white/12'
      } ${esBase ? 'pointer-events-none opacity-60' : ''}`}>
        <input type="checkbox" checked={form.esAdmin}
          onChange={e => !esBase && f('esAdmin', e.target.checked)} className="accent-amber-500"/>
        <div>
          <div className="text-[13px] font-semibold text-[#e8edf2] flex items-center gap-2">
            <Key size={13} className="text-amber-400"/> Acceso total (administrador)
          </div>
          <div className="text-[11px] text-[#9ba8b6]">
            Concede acceso automático a todos los módulos, incluyendo los que se agreguen en el futuro
          </div>
        </div>
      </label>

      {!form.esAdmin && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
              Módulos accesibles — {form.permisos.length}/{TODOS_MODULOS.length} seleccionados
            </span>
            <div className="flex gap-2">
              <Btn variant="ghost" size="sm"
                onClick={() => setForm(p => ({ ...p, permisos: TODOS_MODULOS, esAdmin: false }))}>
                Todos
              </Btn>
              <Btn variant="ghost" size="sm"
                onClick={() => setForm(p => ({ ...p, permisos: ['dashboard'] }))}>
                Ninguno
              </Btn>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {MODULOS_GRUPOS.map(grupo => {
              const ids = grupo.items.map(i => i.id)
              const activos       = ids.filter(id => form.permisos.includes(id)).length
              const todosMarcados = activos === ids.length
              const algunoMarcado = activos > 0 && activos < ids.length
              return (
                <div key={grupo.grupo} className="bg-[#1a2230] rounded-xl overflow-hidden border border-white/6">
                  <button type="button"
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/3 transition-colors text-left"
                    onClick={() => toggleGrupo(grupo)}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: grupo.color+'22' }}>
                        {todosMarcados
                          ? <CheckSquare size={14} style={{ color: grupo.color }}/>
                          : algunoMarcado
                            ? <div className="w-2.5 h-2.5 rounded-sm" style={{ background: grupo.color, opacity: 0.6 }}/>
                            : <Square size={14} style={{ color: 'var(--text-muted)' }}/>
                        }
                      </div>
                      <span className="text-[12px] font-semibold" style={{ color: grupo.color }}>
                        {grupo.grupo}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#5f6f80]">{activos}/{ids.length}</span>
                  </button>

                  <div className="px-4 pb-3 grid grid-cols-2 md:grid-cols-3 gap-1.5">
                    {grupo.items.map(mod => {
                      const activo = form.permisos.includes(mod.id)
                      return (
                        <label key={mod.id}
                          className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-all ${activo ? 'bg-white/4' : 'hover:bg-white/2'}`}>
                          <input type="checkbox" checked={activo}
                            onChange={() => toggleModulo(mod.id)}
                            className="mt-0.5 shrink-0 accent-[#00c896]"/>
                          <div>
                            <div className={`text-[12px] font-medium ${activo ? 'text-[#e8edf2]' : 'text-[#5f6f80]'}`}>
                              {mod.label}
                            </div>
                            <div className="text-[10px] text-[#5f6f80] leading-snug">{mod.desc}</div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {esBase && (
        <div className="flex items-center gap-2 px-4 py-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-[12px] text-blue-300">
          <Lock size={13}/> Nombre y descripción bloqueados en roles base. Puedes modificar libremente los permisos.
        </div>
      )}
    </Modal>
  )
}
