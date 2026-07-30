import { Plus, Shield, Lock, Key, Edit2, Trash2, CheckSquare, Square } from 'lucide-react'
import { Btn } from '../../components/ui/index'
import { MODULOS_GRUPOS, TODOS_MODULOS, ROLES_BASE_META } from './constants'

// ════════════════════════════════════════════════════════
// TAB ROLES Y PERMISOS
// ════════════════════════════════════════════════════════
export default function TabRoles({
  roles, usuarios, getRolCode, setEditandoRol, setModalRol, setConfirmDelRol,
}) {
  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-[#9ba8b6]">
          Define qué módulos puede ver y usar cada rol. Los roles base no se pueden eliminar.
        </p>
        <Btn variant="primary" size="sm" onClick={() => { setEditandoRol(null); setModalRol(true) }}>
          <Plus size={13}/> Nuevo Rol
        </Btn>
      </div>

      <div className="flex flex-col gap-4">
        {Object.entries(roles).map(([codigo, rol]) => {
          const esBase      = !!ROLES_BASE_META[codigo]
          const usuariosRol = usuarios.filter(u => getRolCode(u) === codigo)
          const esAdmin     = rol.permisos?.includes('*')
          const activos     = rol.permisos || []
          return (
            <div key={codigo} className="bg-[#161d28] border border-white/8 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/6"
                style={{ borderLeftWidth:3, borderLeftColor: rol.color || '#5f6f80' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: (rol.color||'#5f6f80')+'22' }}>
                    <Shield size={16} style={{ color: rol.color||'#5f6f80' }}/>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#e8edf2]">{rol.label}</span>
                      {esBase && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#5f6f80] flex items-center gap-1">
                          <Lock size={8}/> Base
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#5f6f80] mt-0.5">{rol.desc}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-[#9ba8b6]">
                    {usuariosRol.length} usuario{usuariosRol.length !== 1 ? 's' : ''}
                  </span>
                  {esAdmin
                    ? <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10"><Key size={10}/>Acceso total</span>
                    : <span className="text-[11px] text-[#5f6f80]">{activos.length}/{TODOS_MODULOS.length} módulos</span>
                  }
                  <div className="flex gap-1">
                    <Btn variant="ghost" size="sm"
                      onClick={() => { setEditandoRol({ id: rol.id, codigo, ...rol }); setModalRol(true) }}>
                      <Edit2 size={12}/> Editar
                    </Btn>
                    {!esBase && (
                      <Btn variant="ghost" size="sm" className="text-red-400 hover:text-red-300"
                        onClick={() => setConfirmDelRol(codigo)}>
                        <Trash2 size={12}/>
                      </Btn>
                    )}
                  </div>
                </div>
              </div>

              {!esAdmin ? (
                <div className="px-5 py-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {MODULOS_GRUPOS.map(grupo => (
                    <div key={grupo.grupo}>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.06em] mb-1.5"
                        style={{ color: grupo.color }}>
                        {grupo.grupo}
                      </div>
                      <div className="flex flex-col gap-1">
                        {grupo.items.map(mod => {
                          const tiene = activos.includes(mod.id)
                          return (
                            <div key={mod.id} className="flex items-center gap-1.5 text-[11px]"
                              style={{ color: tiene ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                              {tiene
                                ? <CheckSquare size={12} style={{ color: grupo.color }} className="shrink-0"/>
                                : <Square size={12} className="shrink-0" style={{ color: 'var(--text-muted)' }}/>
                              }
                              {mod.label}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-3 text-[12px] text-[#5f6f80]">
                  Este rol tiene acceso completo a todos los módulos actuales y futuros del sistema.
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
