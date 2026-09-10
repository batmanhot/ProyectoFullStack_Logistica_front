import { useState, useMemo } from 'react'
import { Users, Shield } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { ConfirmDialog } from '../../components/ui/index'
import { usePlanLimits } from '../../hooks/usePlanLimits'
import { useUsuariosList, useCrearUsuario, useActualizarUsuario, useEliminarUsuario } from '../../queries/usuarios.queries'
import { useRolesList } from '../../queries/roles.queries'
import { ROLES_BASE_META } from './constants'
import TabUsuarios from './TabUsuarios'
import TabRoles from './TabRoles'
import ModalUsuario from './ModalUsuario'

// ════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════
export default function Usuarios() {
  const { sesion, toast } = useApp()
  const { data: usuarios  = [] } = useUsuariosList()
  const { data: rolesApi  = [] } = useRolesList()
  const crearUsuario     = useCrearUsuario()
  const actualizarUsuario= useActualizarUsuario()
  const eliminarUsuario  = useEliminarUsuario()
  const planLimits       = usePlanLimits()

  const [tab,          setTab]          = useState('usuarios')
  const [modal,        setModal]        = useState(false)
  const [editando,     setEditando]     = useState(null)
  const [confirmDel,   setConfirmDel]   = useState(null)

  // Mapa enriquecido: { [codigo]: { id(uuid), label, color, desc, permisos } }
  // `rolesApi` ya solo trae el catálogo del SuperAdmin (`GET /roles` filtra
  // `empresaId null`). Los permisos SIEMPRE vienen del dato real; ROLES_BASE_META
  // solo aporta label/color/desc de presentación, nunca inventa permisos.
  const roles = useMemo(() => {
    const map = {}
    for (const r of rolesApi) {
      const meta = ROLES_BASE_META[r.codigo]
      map[r.codigo] = {
        id:      r.id,
        label:   meta?.label || r.label,
        color:   meta?.color || '#5f6f80',
        desc:    meta?.desc  || '',
        permisos: r.permisos?.map(p => p.modulo) || [],
      }
    }
    return map
  }, [rolesApi])

  // Helper para obtener código de rol de un usuario
  const getRolCode = (u) => u.rol?.codigo || u.rol || ''
  const rolColor   = (codigo) => roles[codigo]?.color || '#5f6f80'
  const rolLabel   = (codigo) => roles[codigo]?.label || codigo

  async function handleSaveUsuario(data) {
    // Construir solo los campos que acepta el DTO — mapear código de rol → UUID
    const rolId = roles[data.rol]?.id
    const payload = {
      nombre: data.nombre,
      ...(data.password                    ? { password: data.password } : {}),
      ...(rolId                            ? { rolId }                   : {}),
      ...(data.areaId                      ? { areaId: data.areaId }     : {}),
      ...(data.transportistaId             ? { transportistaId: data.transportistaId } : {}),
      // A diferencia de areaId/transportistaId (siempre obligatorios cuando
      // aplican), la meta es opcional a propósito. Vacío en edición manda
      // `null` explícito para poder quitar una meta ya configurada (el DTO
      // de alta no acepta null — ahí no hay nada que "quitar" todavía).
      ...(data.rol === 'ejecutivo-comercial' && (data.metaVentasMensual !== '' && data.metaVentasMensual != null)
        ? { metaVentasMensual: Number(data.metaVentasMensual) }
        : editando && data.rol === 'ejecutivo-comercial' ? { metaVentasMensual: null } : {}),
      ...(data.telefono  !== undefined ? { telefono: data.telefono }   : {}),
      ...(data.documento !== undefined ? { documento: data.documento } : {}),
      ...(data.cargo     !== undefined ? { cargo: data.cargo }         : {}),
      ...(editando                         ? { activo: data.activo }     : { email: data.email }),
    }
    const res = editando
      ? await actualizarUsuario.mutateAsync({ id: editando.id, ...payload })
      : await crearUsuario.mutateAsync(payload)
    if (res?.error) { toast(res.error, 'error'); return }
    setModal(false)
    toast(editando ? 'Usuario actualizado' : 'Usuario creado', 'success')
  }

  async function handleDelUsuario(id) {
    if (id === sesion?.id) { toast('No puedes eliminar tu propio usuario', 'error'); return }
    const res = await eliminarUsuario.mutateAsync(id)
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Usuario eliminado', 'success')
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-white/8">
        {[
          ['usuarios', 'Usuarios',        Users ],
          ['roles',    'Roles y Permisos', Shield],
        ].map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-all
              ${tab === id ? 'text-[#00c896] border-[#00c896]' : 'text-[#5f6f80] border-transparent hover:text-[#9ba8b6]'}`}>
            <Icon size={14}/>{label}
          </button>
        ))}
      </div>

      {tab === 'usuarios' && (
        <TabUsuarios
          usuarios={usuarios}
          sesion={sesion}
          roles={roles}
          getRolCode={getRolCode}
          rolColor={rolColor}
          rolLabel={rolLabel}
          planLimits={planLimits}
          setModal={setModal}
          setEditando={setEditando}
          setConfirmDel={setConfirmDel}
        />
      )}

      {tab === 'roles' && (
        <TabRoles
          roles={roles}
          usuarios={usuarios}
          getRolCode={getRolCode}
        />
      )}

      <div className="bg-[#161d28] border border-white/6 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          ¿Cómo funciona el módulo de Usuarios y Roles?
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {[
            ['1. Crear usuario', 'Asigna nombre, email, contraseña y un rol. Si el rol es "Solicitante", además debes elegir su área interna. Propietario y Administrador del negocio los gestiona el administrador de la plataforma.'],
            ['2. Elegir rol', 'Cada rol define qué módulos puede ver y usar el usuario — revisa los módulos incluidos antes de guardar, en el panel que aparece al elegir el rol.'],
            ['3. Catálogo de roles', 'La pestaña "Roles y Permisos" es de solo lectura: el catálogo lo administra la plataforma. ¿Necesitas un rol a medida? Solicítalo al administrador de la plataforma.'],
            ['4. Desactivar sin eliminar', 'Un usuario inactivo pierde acceso pero conserva su historial; no puedes eliminar tu propio usuario.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
              <div className="text-[11px] font-semibold text-[#e8edf2] mb-1.5">{t}</div>
              <div className="text-[11px] text-[#5f6f80] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Modales */}
      <ModalUsuario
        open={modal}
        onClose={() => { setModal(false); setEditando(null) }}
        editando={editando}
        onSave={handleSaveUsuario}
        sesionId={sesion?.id}
        roles={roles}
      />

      <ConfirmDialog
        open={!!confirmDel} onClose={() => setConfirmDel(null)}
        onConfirm={() => handleDelUsuario(confirmDel)} danger
        title="Eliminar usuario" message="¿Eliminar este usuario? Esta acción no se puede deshacer."
      />
    </div>
  )
}
