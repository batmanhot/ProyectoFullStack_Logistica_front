import { useState, useEffect, useMemo } from 'react'
import { Plus, Edit2, Trash2, Users, Shield, Eye, EyeOff } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatDate } from '../utils/helpers'
import * as storage from '../services/storage'
import { Modal, ConfirmDialog, EmptyState, Badge, Btn, Field } from '../components/ui/index'

const ROLES_INFO = {
  admin:      { label: 'Administrador', color: 'danger',  desc: 'Acceso total al sistema' },
  supervisor: { label: 'Supervisor',    color: 'info',    desc: 'Lectura + reportes + órdenes' },
  almacenero: { label: 'Almacenero',    color: 'success', desc: 'Entradas, salidas y ajustes' },
}

const PERMISOS_POR_ROL = {
  admin:      ['Todo el sistema'],
  supervisor: ['Dashboard','Inventario','Movimientos','Reportes','Órdenes','Proveedores'],
  almacenero: ['Dashboard','Inventario','Entradas','Salidas','Ajustes','Devoluciones'],
}

const SI = 'w-full px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit] placeholder-[#5f6f80]'
const SEL = SI + ' pr-8'

export default function Usuarios() {
  const { usuarios, sesion, recargarUsuarios, toast } = useApp()
  const [modal, setModal]       = useState(false)
  const [editando, setEditando] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  function handleSave(data) {
    if (!editando && usuarios.find(u => u.email === data.email)) {
      toast('Ya existe un usuario con ese email', 'error'); return
    }
    storage.saveUsuario(data)
    recargarUsuarios()
    setModal(false)
    toast(editando ? 'Usuario actualizado' : 'Usuario creado', 'success')
  }

  function handleDel(id) {
    if (id === sesion?.id) { toast('No puedes eliminar tu propio usuario', 'error'); return }
    storage.deleteUsuario(id)
    recargarUsuarios()
    toast('Usuario eliminado', 'success')
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* Tarjetas de roles */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(ROLES_INFO).map(([key, rol]) => {
          const count = usuarios.filter(u => u.rol === key && u.activo).length
          return (
            <div key={key} className="bg-[#161d28] border border-white/[0.08] rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
                  <Shield size={18} className="text-[#9ba8b6]"/>
                </div>
                <Badge variant={rol.color}>{rol.label}</Badge>
              </div>
              <div className="text-[24px] font-semibold text-[#e8edf2] mb-0.5">{count}</div>
              <div className="text-[12px] text-[#5f6f80]">{rol.desc}</div>
              <div className="mt-3 flex flex-wrap gap-1">
                {PERMISOS_POR_ROL[key].map(p => (
                  <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#5f6f80]">{p}</span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabla de usuarios */}
      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
            Usuarios del Sistema
          </span>
          <Btn variant="primary" size="sm" onClick={() => { setEditando(null); setModal(true) }}>
            <Plus size={13}/> Nuevo Usuario
          </Btn>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {['Usuario','Email','Rol','Estado','Creado','Acciones'].map(h => (
                  <th key={h} className="bg-[#1a2230] px-3.5 py-2.5 text-left text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] border-b border-white/[0.08]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 && (
                <tr><td colSpan={6}><EmptyState icon={Users} title="Sin usuarios" description="Agrega el primer usuario."/></td></tr>
              )}
              {usuarios.map(u => (
                <tr key={u.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]">
                  <td className="px-3.5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#00c896]/10 text-[#00c896] text-[11px] font-bold flex items-center justify-center shrink-0">
                        {u.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-[#e8edf2]">{u.nombre}</div>
                        {u.id === sesion?.id && (
                          <div className="text-[10px] text-[#00c896]">← tú</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5 text-[12px] text-blue-400">{u.email}</td>
                  <td className="px-3.5 py-2.5">
                    <Badge variant={ROLES_INFO[u.rol]?.color || 'neutral'}>
                      {ROLES_INFO[u.rol]?.label || u.rol}
                    </Badge>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <Badge variant={u.activo ? 'success' : 'neutral'}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{formatDate(u.createdAt)}</td>
                  <td className="px-3.5 py-2.5">
                    <div className="flex gap-1">
                      <Btn variant="ghost" size="icon" onClick={() => { setEditando(u); setModal(true) }}>
                        <Edit2 size={13}/>
                      </Btn>
                      {u.id !== sesion?.id && (
                        <Btn variant="ghost" size="icon" className="text-red-400 hover:text-red-300"
                          onClick={() => setConfirmDel(u.id)}>
                          <Trash2 size={13}/>
                        </Btn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ModalUsuario
        open={modal}
        onClose={() => setModal(false)}
        editando={editando}
        onSave={handleSave}
        sesionId={sesion?.id}
      />

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => handleDel(confirmDel)}
        danger
        title="Eliminar usuario"
        message="¿Eliminar este usuario? Esta acción no se puede deshacer."
      />
    </div>
  )
}

function ModalUsuario({ open, onClose, editando, onSave, sesionId }) {
  const init = { nombre: '', email: '', password: '', rol: 'almacenero', activo: true }
  const [form, setForm] = useState(init)
  const [showPass, setShowPass] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    setForm(editando ? { ...init, ...editando, password: '' } : init)
    setShowPass(false)
  }, [editando, open])

  const canSave = form.nombre.trim() && form.email.trim() && (editando || form.password.trim())

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editando ? 'Editar Usuario' : 'Nuevo Usuario'}
      size="sm"
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" onClick={() => canSave && onSave(form)} disabled={!canSave}>
            Guardar
          </Btn>
        </>
      }
    >
      <Field label="Nombre completo *">
        <input className={SI} value={form.nombre} onChange={e => f('nombre', e.target.value)} placeholder="Juan Pérez"/>
      </Field>

      <Field label="Email *">
        <input type="email" className={SI} value={form.email} onChange={e => f('email', e.target.value)}
          placeholder="usuario@empresa.pe" disabled={!!editando}
          style={editando ? { opacity: 0.5 } : {}}/>
        {editando && <span className="text-[11px] text-[#5f6f80]">El email no se puede cambiar</span>}
      </Field>

      <Field label={editando ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}>
        <div className="relative">
          <input
            type={showPass ? 'text' : 'password'}
            className={SI + ' pr-10'}
            value={form.password}
            onChange={e => f('password', e.target.value)}
            placeholder="Mínimo 6 caracteres"
          />
          <button type="button" onClick={() => setShowPass(p => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6f80] hover:text-[#9ba8b6] transition-colors">
            {showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
          </button>
        </div>
      </Field>

      <Field label="Rol *">
        <select className={SEL} value={form.rol} onChange={e => f('rol', e.target.value)}>
          {Object.entries(ROLES_INFO).map(([key, r]) => (
            <option key={key} value={key}>{r.label} — {r.desc}</option>
          ))}
        </select>
      </Field>

      {/* Permisos del rol seleccionado */}
      <div className="bg-[#1a2230] rounded-lg px-4 py-3">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide mb-2">
          Módulos accesibles con este rol
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PERMISOS_POR_ROL[form.rol]?.map(p => (
            <span key={p} className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#00c896]/10 text-[#00c896]">{p}</span>
          ))}
        </div>
      </div>

      {editando && editando.id !== sesionId && (
        <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[#9ba8b6]">
          <input type="checkbox" checked={form.activo} onChange={e => f('activo', e.target.checked)}
            className="accent-[#00c896]"/>
          Usuario activo
        </label>
      )}
    </Modal>
  )
}
