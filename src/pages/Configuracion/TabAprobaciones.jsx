import { useApp } from '../../store/AppContext'
import { Badge, Spinner } from '../../components/ui/index'
import { useRolesList } from '../../queries/roles.queries'
import { useReglasAprobacion, useActualizarReglaAprobacion } from '../../queries/aprobaciones.queries'

// Owner/Admin aprueban siempre (permiso '*') — no se ofrecen como opción.
const ROLES_SIEMPRE = ['owner', 'admin']

export default function TabAprobaciones() {
  const { toast } = useApp()
  const { data: reglas = [], isLoading } = useReglasAprobacion()
  const { data: rolesApi = [] } = useRolesList()
  const actualizar = useActualizarReglaAprobacion()

  const rolesAsignables = rolesApi
    .filter(r => !ROLES_SIEMPRE.includes(r.codigo))
    .map(r => ({ codigo: r.codigo, label: r.label || r.codigo }))

  async function toggleRol(regla, codigo) {
    const yaEsta = regla.rolesAprobadores.includes(codigo)
    const siguiente = yaEsta
      ? regla.rolesAprobadores.filter(c => c !== codigo)
      : [...regla.rolesAprobadores, codigo]
    const res = await actualizar.mutateAsync({ proceso: regla.proceso, rolesAprobadores: siguiente })
    if (res?.error) { toast(res.error, 'error'); return }
    toast(`${regla.label}: aprobadores actualizados`, 'success')
  }

  if (isLoading) return <div className="flex justify-center p-8"><Spinner /></div>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg border border-blue-500/25 bg-blue-500/10 text-blue-300 text-[13px] leading-snug">
        <span>Define qué <b>rol(es)</b> pueden aprobar o rechazar cada proceso. El <b>Propietario</b> y el
        <b> Administrador</b> pueden siempre, no hace falta agregarlos. Si no eliges ninguno, cualquier
        usuario con acceso al módulo podrá hacerlo. El cambio se guarda al instante.</span>
      </div>

      {reglas.map(regla => (
        <div key={regla.proceso} className="bg-[#161d28] border border-white/8 rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-[15px] text-[#e8edf2]">{regla.label}</span>
            {regla.rolesAprobadores.length === 0
              ? <Badge variant="neutral">Sin aprobador designado</Badge>
              : <Badge variant="teal">{regla.rolesAprobadores.length} rol(es)</Badge>}
          </div>
          <p className="text-[13px] text-[#9ba8b6] leading-relaxed mb-3">{regla.descripcion}</p>

          <div className="flex flex-wrap gap-2">
            {rolesAsignables.map(rol => {
              const activo = regla.rolesAprobadores.includes(rol.codigo)
              return (
                <button
                  key={rol.codigo}
                  type="button"
                  disabled={actualizar.isPending}
                  onClick={() => toggleRol(regla, rol.codigo)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all disabled:opacity-50
                    ${activo
                      ? 'bg-[#00c896]/12 border-[#00c896] text-[#00c896]'
                      : 'bg-[#1a2230] border-white/8 text-[#9ba8b6] hover:border-white/20'}`}
                >
                  {rol.label}
                </button>
              )
            })}
          </div>

          {regla.rolesAprobadores.length === 0 && (
            <div className="text-[12px] text-[#5f6f80] mt-3">
              Cualquier usuario con el permiso del módulo puede aprobar este proceso.
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
