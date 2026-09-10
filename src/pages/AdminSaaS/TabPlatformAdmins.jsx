import { useState } from 'react'
import { ShieldCheck, Plus, Edit2, Eye, EyeOff, Crown, Trash2 } from 'lucide-react'
import { Modal, ConfirmDialog, EmptyState, Badge, Btn, Field, Input, Alert } from '../../components/ui/index'
import { useApp } from '../../store/AppContext'
import {
  usePlatformAdmins, useCrearPlatformAdmin, useActualizarPlatformAdmin, useEliminarPlatformAdmin,
} from '../../queries/admin.queries'

const MAX = 2

export default function TabPlatformAdmins() {
  const { toast, sesion } = useApp()
  const { data: admins = [] } = usePlatformAdmins()
  const crear = useCrearPlatformAdmin()
  const actualizar = useActualizarPlatformAdmin()
  const eliminar = useEliminarPlatformAdmin()

  const [modalOpen, setModal] = useState(false)
  const [modo, setModo] = useState('nuevo')   // nuevo | editar
  const [target, setTarget] = useState(null)
  const [form, setForm] = useState({ nombre: '', email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const activos = admins.filter(a => a.activo).length
  const lleno = admins.length >= MAX
  const yoSoyNativo = !!admins.find(a => a.id === sesion?.id)?.esNativo

  // Puedo editar: mi propia cuenta, o cualquier no-nativa si soy el nativo.
  const puedoEditar = a => a.id === sesion?.id || (yoSoyNativo && !a.esNativo)
  // Puedo eliminar: solo el nativo, y nunca a la cuenta nativa (ni a sí mismo → es nativo).
  const puedoEliminar = a => yoSoyNativo && !a.esNativo

  function abrir(m, a = null) {
    setModo(m); setTarget(a)
    setForm({ nombre: a?.nombre || '', email: a?.email || '', password: '' })
    setShowPass(false); setModal(true)
  }

  async function save() {
    if (!form.nombre.trim()) { toast('El nombre es requerido', 'error'); return }
    if (!form.email.trim())  { toast('El email es requerido', 'error'); return }
    if (modo === 'nuevo' && form.password.length < 8) { toast('La contraseña debe tener al menos 8 caracteres', 'error'); return }
    if (modo === 'editar' && form.password && form.password.length < 8) { toast('La nueva contraseña debe tener al menos 8 caracteres', 'error'); return }

    const emailBloqueado = modo === 'editar' && target?.esNativo
    const res = modo === 'editar'
      ? await actualizar.mutateAsync({ id: target.id, nombre: form.nombre, ...(!emailBloqueado && { email: form.email }), ...(form.password && { password: form.password }) })
      : await crear.mutateAsync({ nombre: form.nombre, email: form.email, password: form.password })
    if (res?.error) { toast(res.error, 'error'); return }
    toast(modo === 'editar' ? 'Cuenta actualizada' : 'Administrador de plataforma registrado', 'success')
    setModal(false)
  }

  async function toggleActivo(a) {
    const res = await actualizar.mutateAsync({ id: a.id, activo: !a.activo })
    if (res?.error) { toast(res.error, 'error'); return }
    toast(a.activo ? 'Administrador desactivado' : 'Administrador reactivado', 'success')
  }

  async function borrar() {
    const res = await eliminar.mutateAsync(confirmDel.id)
    if (res?.error) { toast(res.error, 'error'); setConfirmDel(null); return }
    toast('Administrador eliminado', 'success')
    setConfirmDel(null)
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <Alert variant="info">
        Máximo <b>{MAX}</b> administradores de plataforma. Debe quedar siempre al menos uno activo y no
        puedes desactivar tu propia cuenta. La <b>cuenta nativa</b> es la de mayor nivel: puede editar y
        eliminar a cualquier otro administrador, y no se puede desactivar, eliminar ni cambiarle el email.
        Un administrador no nativo solo edita su propia cuenta.
      </Alert>

      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.06em]">
          {admins.length}/{MAX} registrados · {activos} activo{activos !== 1 ? 's' : ''}
        </span>
        <Btn variant="primary" size="sm" disabled={lleno} title={lleno ? `Ya hay ${MAX} administradores` : undefined} onClick={() => abrir('nuevo')}>
          <Plus size={13} /> Registrar administrador
        </Btn>
      </div>

      {admins.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Sin administradores" description="Registra el primer administrador de plataforma." />
      ) : (
        <div className="grid gap-3">
          {admins.map(a => {
            const esYo = a.id === sesion?.id
            return (
              <div key={a.id} className="flex items-center gap-3 bg-[#161d28] border border-white/8 rounded-xl px-4 py-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center shrink-0">
                  <Crown size={16} className="text-[var(--accent)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-[var(--text-primary)] truncate">{a.nombre}</span>
                    {esYo && <span className="text-[10px] text-[var(--accent)]">← tú</span>}
                    {a.esNativo && <Badge variant="teal">Nativa</Badge>}
                    <Badge variant={a.activo ? 'success' : 'neutral'}>{a.activo ? 'Activo' : 'Inactivo'}</Badge>
                  </div>
                  <div className="text-[12px] text-[var(--text-muted)] truncate">{a.email}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {puedoEditar(a) && (
                    <Btn variant="ghost" size="icon" title={esYo ? 'Editar mi cuenta' : 'Editar'} onClick={() => abrir('editar', a)}><Edit2 size={13} /></Btn>
                  )}
                  {!a.esNativo && (
                    <Btn
                      variant="ghost" size="sm"
                      disabled={esYo || (a.activo && activos <= 1)}
                      title={esYo ? 'No puedes desactivar tu propia cuenta' : (a.activo && activos <= 1 ? 'Debe quedar al menos uno activo' : undefined)}
                      onClick={() => toggleActivo(a)}
                    >
                      {a.activo ? 'Desactivar' : 'Reactivar'}
                    </Btn>
                  )}
                  {puedoEliminar(a) && (
                    <Btn variant="ghost" size="icon" className="text-red-400 hover:text-red-300" title="Eliminar" onClick={() => setConfirmDel(a)}>
                      <Trash2 size={13} />
                    </Btn>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModal(false)}
        title={modo === 'nuevo' ? 'Registrar administrador de plataforma' : (target?.id === sesion?.id ? 'Editar mi cuenta' : `Editar ${target?.nombre || ''}`)}
        size="sm"
        footer={<>
          <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn variant="primary" onClick={save} disabled={crear.isPending || actualizar.isPending}>{modo === 'nuevo' ? 'Registrar' : 'Guardar'}</Btn>
        </>}>
        <Field label="Nombre *">
          <Input value={form.nombre} onChange={e => f('nombre', e.target.value)} placeholder="Nombre y apellido" />
        </Field>
        <Field label={modo === 'editar' && target?.esNativo ? 'Email (bloqueado en la cuenta nativa)' : 'Email *'}>
          <Input type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="admin@sistema.pe"
            disabled={modo === 'editar' && target?.esNativo} style={modo === 'editar' && target?.esNativo ? { opacity: .5 } : {}} />
        </Field>
        <Field label={modo === 'nuevo' ? 'Contraseña * (mín. 8)' : 'Nueva contraseña (vacío = no cambiar)'}>
          <div className="relative">
            <Input type={showPass ? 'text' : 'password'} className="pr-10" value={form.password} onChange={e => f('password', e.target.value)} placeholder="••••••••" />
            <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </Field>
      </Modal>

      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={borrar}
        danger title="Eliminar administrador de plataforma"
        message={`¿Eliminar a "${confirmDel?.nombre}" (${confirmDel?.email})? Pierde el acceso de inmediato y se libera el cupo. Su rastro de auditoría se conserva. Esta acción no se puede deshacer.`} />
    </div>
  )
}
