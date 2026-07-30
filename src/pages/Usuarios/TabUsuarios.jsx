import { Plus, Edit2, Trash2, Users, Key } from 'lucide-react'
import { formatDate } from '../../utils/helpers'
import { EmptyState, Badge, Btn } from '../../components/ui/index'
import { TODOS_MODULOS } from './constants'

// ════════════════════════════════════════════════════════
// TAB USUARIOS
// ════════════════════════════════════════════════════════
export default function TabUsuarios({
  usuarios, sesion, roles, getRolCode, rolColor, rolLabel,
  planLimits, setModal, setEditando, setConfirmDel,
}) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['Total',        usuarios.length,                           '#00c896'],
          ['Activos',      usuarios.filter(u => u.activo).length,     '#22c55e'],
          ['Inactivos',    usuarios.filter(u => !u.activo).length,    '#5f6f80'],
          ['Roles en uso', [...new Set(usuarios.map(getRolCode))].filter(Boolean).length, '#3b82f6'],
        ].map(([l, v, color]) => (
          <div key={l} className="relative bg-[#161d28] border border-white/8 rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.75 rounded-t-xl" style={{ background: color }}/>
            <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] mb-2">{l}</div>
            <div className="text-[28px] font-semibold text-[#e8edf2]">{v}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Usuarios del Sistema</span>
          <div className="flex items-center gap-2">
            {planLimits.usuarios.maximo !== -1 && (
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                !planLimits.usuarios.permitido ? 'bg-red-500/20 text-red-400' :
                planLimits.usuarios.porcentaje >= 80 ? 'bg-amber-500/20 text-amber-400' :
                'bg-white/6 text-[#5f6f80]'
              }`}>
                {planLimits.usuarios.actual}/{planLimits.usuarios.maximo}
              </span>
            )}
            <Btn variant="primary" size="sm"
              disabled={!planLimits.usuarios.permitido}
              title={planLimits.usuarios.mensaje || undefined}
              onClick={() => { setEditando(null); setModal(true) }}>
              <Plus size={13}/> Nuevo Usuario
            </Btn>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr>
              {['Usuario','Email','Rol','Permisos','Estado','Creado','Acciones'].map(h => (
                <th key={h} className="bg-[#1a2230] px-3.5 py-2.5 text-left text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] border-b border-white/8 whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {usuarios.length === 0 && (
                <tr><td colSpan={7}><EmptyState icon={Users} title="Sin usuarios" description="Agrega el primer usuario."/></td></tr>
              )}
              {usuarios.map(u => {
                const rc  = getRolCode(u)
                const rol = roles[rc]
                const permisosTotales = rol?.permisos?.includes('*')
                  ? TODOS_MODULOS.length
                  : (rol?.permisos?.length || 0)
                return (
                  <tr key={u.id} className="border-b border-white/6 last:border-0 hover:bg-white/2">
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0"
                          style={{ background: rolColor(rc)+'33', color: rolColor(rc), border:`1.5px solid ${rolColor(rc)}44` }}>
                          {(u.nombre||'?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-[#e8edf2]">{u.nombre}</div>
                          {u.id === sesion?.id && <div className="text-[10px] text-[#00c896]">← sesión actual</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 text-[12px] text-blue-400">{u.email}</td>
                    <td className="px-3.5 py-2.5">
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: rolColor(rc)+'22', color: rolColor(rc) }}>
                        {rolLabel(rc)}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {rol?.permisos?.includes('*')
                          ? <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1"><Key size={10}/>Acceso total</span>
                          : <>
                              <div className="w-16 h-1.5 bg-[#0e1117] rounded-full overflow-hidden">
                                <div className="h-full rounded-full"
                                  style={{ width:`${(permisosTotales/TODOS_MODULOS.length)*100}%`, background: rolColor(rc) }}/>
                              </div>
                              <span className="text-[11px] text-[#5f6f80]">{permisosTotales}/{TODOS_MODULOS.length}</span>
                            </>
                        }
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <Badge variant={u.activo ? 'success' : 'neutral'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{formatDate(u.createdAt)}</td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex gap-1">
                        <Btn variant="ghost" size="icon" title="Editar" onClick={() => { setEditando(u); setModal(true) }}>
                          <Edit2 size={13}/>
                        </Btn>
                        {u.id !== sesion?.id && (
                          <Btn variant="ghost" size="icon" title="Eliminar" className="text-red-400 hover:text-red-300"
                            onClick={() => setConfirmDel(u.id)}>
                            <Trash2 size={13}/>
                          </Btn>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
