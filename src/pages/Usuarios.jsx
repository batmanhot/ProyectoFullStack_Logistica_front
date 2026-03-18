import { useState, useEffect, useMemo } from 'react'
import { Plus, Edit2, Trash2, Users, Shield, Eye, EyeOff,
         CheckSquare, Square, ChevronDown, ChevronUp, Lock, Key } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatDate } from '../utils/helpers'
import * as storage from '../services/storage'
import { Modal, ConfirmDialog, EmptyState, Badge, Btn, Field } from '../components/ui/index'

// ── Estilos ──────────────────────────────────────────────
const SI  = 'w-full px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit] placeholder-[#5f6f80]'
const SEL = SI + ' pr-8'

// ── Módulos del sistema agrupados ────────────────────────
const MODULOS_GRUPOS = [
  {
    grupo: 'General',
    color: '#00c896',
    items: [
      { id:'dashboard',    label:'Dashboard',           desc:'Panel principal con KPIs'        },
      { id:'alertas',      label:'Alertas',             desc:'Centro de notificaciones'        },
    ]
  },
  {
    grupo: 'Inventario',
    color: '#3b82f6',
    items: [
      { id:'inventario',   label:'Inventario',          desc:'Catálogo y stock de productos'   },
      { id:'entradas',     label:'Entradas',            desc:'Registro de ingresos de stock'   },
      { id:'salidas',      label:'Salidas',             desc:'Registro de egresos de stock'    },
      { id:'ajustes',      label:'Ajustes',             desc:'Ajustes de inventario'           },
      { id:'devoluciones', label:'Devoluciones',        desc:'Devoluciones cliente/proveedor'  },
      { id:'transferencias',label:'Transferencias',     desc:'Entre almacenes'                 },
      { id:'inv-fisico',   label:'Inventario Físico',   desc:'Conteo cíclico y ajuste masivo'  },
    ]
  },
  {
    grupo: 'Compras',
    color: '#f59e0b',
    items: [
      { id:'ordenes',      label:'Órdenes de Compra',   desc:'Ciclo de compras a proveedores'  },
      { id:'cotizaciones', label:'Cotizaciones',        desc:'RFQ y comparativa de precios'    },
      { id:'proveedores',  label:'Proveedores',         desc:'Gestión de proveedores'          },
    ]
  },
  {
    grupo: 'Despachos',
    color: '#8b5cf6',
    items: [
      { id:'clientes',     label:'Clientes',            desc:'Gestión de clientes'             },
      { id:'despachos',    label:'Despachos',           desc:'Pedidos y guías de remisión'     },
      { id:'transportes',  label:'Transportes',         desc:'Rutas, transportistas y tracking'},
    ]
  },
  {
    grupo: 'Análisis',
    color: '#06b6d4',
    items: [
      { id:'kardex',       label:'Kardex',              desc:'Historial valorizado por producto'},
      { id:'vencimientos', label:'Vencimientos',        desc:'Control de fechas de vencimiento' },
      { id:'reorden',      label:'Punto de Reorden',    desc:'Alertas de reposición'            },
      { id:'prevision',    label:'Previsión',           desc:'Proyección de demanda'            },
      { id:'reportes',     label:'Reportes',            desc:'ABC, rotación, valorizado'        },
      { id:'movimientos',  label:'Movimientos',         desc:'Historial de todos los movimientos'},
    ]
  },
  {
    grupo: 'Administración',
    color: '#ef4444',
    items: [
      { id:'maestros',     label:'Categ. / Almacenes',  desc:'Categorías y almacenes'           },
      { id:'usuarios',     label:'Usuarios y Roles',    desc:'Gestión de accesos'               },
      { id:'configuracion',label:'Configuración',       desc:'Parámetros del sistema'           },
    ]
  },
]

const TODOS_MODULOS = MODULOS_GRUPOS.flatMap(g => g.items.map(i => i.id))

// ── Roles predefinidos base (no editables, sirven como plantilla) ──
const ROLES_BASE = {
  admin:      { label:'Administrador', color:'#ef4444', permisos:['*'],             desc:'Acceso total sin restricciones' },
  supervisor: { label:'Supervisor',    color:'#3b82f6', permisos:['dashboard','inventario','movimientos','reportes',
                  'ordenes','proveedores','kardex','vencimientos','reorden','prevision',
                  'alertas','cotizaciones','clientes','despachos','transportes'],    desc:'Operaciones + análisis + compras' },
  almacenero: { label:'Almacenero',    color:'#22c55e', permisos:['dashboard','inventario','entradas','salidas',
                  'ajustes','devoluciones','transferencias','kardex','vencimientos',
                  'inv-fisico','alertas','despachos','clientes','transportes'],      desc:'Operaciones de almacén' },
}

// ── Helpers ──────────────────────────────────────────────
function getRolesStorage() {
  try {
    const r = localStorage.getItem('sp_roles_custom')
    return r ? JSON.parse(r) : {}
  } catch { return {} }
}
function saveRolesStorage(roles) {
  localStorage.setItem('sp_roles_custom', JSON.stringify(roles))
}
function getTodosRoles() {
  const custom = getRolesStorage()
  return { ...ROLES_BASE, ...custom }
}

// ════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════
export default function Usuarios() {
  const { usuarios, sesion, recargarUsuarios, toast } = useApp()
  const [tab,        setTab]        = useState('usuarios')
  const [modal,      setModal]      = useState(false)
  const [editando,   setEditando]   = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [modalRol,   setModalRol]   = useState(false)
  const [editandoRol,setEditandoRol]= useState(null)
  const [roles,      setRoles]      = useState(getTodosRoles)
  const [confirmDelRol, setConfirmDelRol] = useState(null)

  function recargarRoles() { setRoles(getTodosRoles()) }

  function handleSaveUsuario(data) {
    if (!editando && usuarios.find(u => u.email === data.email)) {
      toast('Ya existe un usuario con ese email', 'error'); return
    }
    storage.saveUsuario(data)
    recargarUsuarios()
    setModal(false)
    toast(editando ? 'Usuario actualizado' : 'Usuario creado', 'success')
  }

  function handleDelUsuario(id) {
    if (id === sesion?.id) { toast('No puedes eliminar tu propio usuario', 'error'); return }
    storage.deleteUsuario(id)
    recargarUsuarios()
    toast('Usuario eliminado', 'success')
  }

  function handleSaveRol(id, data) {
    const custom = getRolesStorage()
    if (!id) {
      // Nuevo rol
      const newId = 'rol_' + Date.now()
      custom[newId] = data
    } else {
      custom[id] = { ...data }
    }
    saveRolesStorage(custom)
    recargarRoles()
    setModalRol(false)
    toast(id ? 'Rol actualizado' : 'Rol creado', 'success')
  }

  function handleDelRol(id) {
    // No borrar roles base
    if (ROLES_BASE[id]) { toast('Los roles base no se pueden eliminar', 'error'); return }
    // Verificar que no haya usuarios con ese rol
    const enUso = usuarios.filter(u => u.rol === id)
    if (enUso.length > 0) {
      toast(`No se puede eliminar: ${enUso.length} usuario(s) usan este rol`, 'error'); return
    }
    const custom = getRolesStorage()
    delete custom[id]
    saveRolesStorage(custom)
    recargarRoles()
    toast('Rol eliminado', 'success')
    setConfirmDelRol(null)
  }

  const rolColor = id => roles[id]?.color || '#5f6f80'
  const rolLabel = id => roles[id]?.label || id

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* ── Tabs ──────────────────────────────────────── */}
      <div className="flex gap-0.5 border-b border-white/[0.08]">
        {[
          ['usuarios',  'Usuarios',       Users ],
          ['roles',     'Roles y Permisos', Shield],
        ].map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-all
              ${tab === id ? 'text-[#00c896] border-[#00c896]' : 'text-[#5f6f80] border-transparent hover:text-[#9ba8b6]'}`}>
            <Icon size={14}/>{label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════
          TAB USUARIOS
      ════════════════════════════════════════════════ */}
      {tab === 'usuarios' && (
        <>
          {/* KPIs rápidos */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ['Total',    usuarios.length,                                '#00c896'],
              ['Activos',  usuarios.filter(u => u.activo).length,          '#22c55e'],
              ['Inactivos',usuarios.filter(u => !u.activo).length,         '#5f6f80'],
              ['Roles en uso', [...new Set(usuarios.map(u => u.rol))].length,'#3b82f6'],
            ].map(([l, v, color]) => (
              <div key={l} className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }}/>
                <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] mb-2">{l}</div>
                <div className="text-[28px] font-semibold text-[#e8edf2]">{v}</div>
              </div>
            ))}
          </div>

          {/* Tabla usuarios */}
          <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Usuarios del Sistema</span>
              <Btn variant="primary" size="sm" onClick={() => { setEditando(null); setModal(true) }}>
                <Plus size={13}/> Nuevo Usuario
              </Btn>
            </div>
            <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
              <table className="w-full border-collapse text-[13px]">
                <thead><tr>
                  {['Usuario','Email','Rol','Permisos','Estado','Creado','Acciones'].map(h => (
                    <th key={h} className="bg-[#1a2230] px-3.5 py-2.5 text-left text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] border-b border-white/[0.08] whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {usuarios.length === 0 && (
                    <tr><td colSpan={7}><EmptyState icon={Users} title="Sin usuarios" description="Agrega el primer usuario."/></td></tr>
                  )}
                  {usuarios.map(u => {
                    const rol = roles[u.rol]
                    const permisosTotales = rol?.permisos?.includes('*')
                      ? TODOS_MODULOS.length
                      : (rol?.permisos?.length || 0)
                    return (
                      <tr key={u.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]">
                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0"
                              style={{ background: rolColor(u.rol) + '33', color: rolColor(u.rol), border: `1.5px solid ${rolColor(u.rol)}44` }}>
                              {u.nombre.charAt(0).toUpperCase()}
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
                            style={{ background: rolColor(u.rol)+'22', color: rolColor(u.rol) }}>
                            {rolLabel(u.rol)}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center gap-1.5">
                            {rol?.permisos?.includes('*')
                              ? <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1"><Key size={10}/>Acceso total</span>
                              : <>
                                  <div className="w-16 h-1.5 bg-[#0e1117] rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width:`${(permisosTotales/TODOS_MODULOS.length)*100}%`, background: rolColor(u.rol) }}/>
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
      )}

      {/* ════════════════════════════════════════════════
          TAB ROLES Y PERMISOS
      ════════════════════════════════════════════════ */}
      {tab === 'roles' && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-[#9ba8b6] mt-0.5">
                Define qué módulos puede ver y usar cada rol. Los roles base no se pueden eliminar.
              </p>
            </div>
            <Btn variant="primary" size="sm" onClick={() => { setEditandoRol(null); setModalRol(true) }}>
              <Plus size={13}/> Nuevo Rol
            </Btn>
          </div>

          <div className="flex flex-col gap-4">
            {Object.entries(roles).map(([id, rol]) => {
              const esBase       = !!ROLES_BASE[id]
              const usuariosRol  = usuarios.filter(u => u.rol === id)
              const esAdmin      = rol.permisos?.includes('*')
              const activos      = rol.permisos || []

              return (
                <div key={id} className="bg-[#161d28] border border-white/[0.08] rounded-xl overflow-hidden">
                  {/* Cabecera del rol */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]"
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
                        <Btn variant="ghost" size="sm" onClick={() => { setEditandoRol({ id, ...rol }); setModalRol(true) }}>
                          <Edit2 size={12}/> Editar
                        </Btn>
                        {!esBase && (
                          <Btn variant="ghost" size="sm" className="text-red-400 hover:text-red-300"
                            onClick={() => setConfirmDelRol(id)}>
                            <Trash2 size={12}/>
                          </Btn>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Matriz de módulos */}
                  {!esAdmin && (
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
                                <div key={mod.id}
                                  className="flex items-center gap-1.5 text-[11px]"
                                  style={{ color: tiene ? '#e8edf2' : '#374151', opacity: tiene ? 1 : 0.5 }}>
                                  {tiene
                                    ? <CheckSquare size={12} style={{ color: grupo.color }} className="shrink-0"/>
                                    : <Square size={12} className="text-[#374151] shrink-0"/>
                                  }
                                  {mod.label}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {esAdmin && (
                    <div className="px-5 py-3 text-[12px] text-[#5f6f80]">
                      Este rol tiene acceso completo a todos los módulos actuales y futuros del sistema.
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── Modales ────────────────────────────────────── */}
      <ModalUsuario
        open={modal}
        onClose={() => { setModal(false); setEditando(null) }}
        editando={editando}
        onSave={handleSaveUsuario}
        sesionId={sesion?.id}
        roles={roles}
      />

      <ModalRol
        open={modalRol}
        onClose={() => { setModalRol(false); setEditandoRol(null) }}
        editando={editandoRol}
        onSave={handleSaveRol}
      />

      <ConfirmDialog
        open={!!confirmDel} onClose={() => setConfirmDel(null)}
        onConfirm={() => handleDelUsuario(confirmDel)} danger
        title="Eliminar usuario" message="¿Eliminar este usuario? Esta acción no se puede deshacer."
      />

      <ConfirmDialog
        open={!!confirmDelRol} onClose={() => setConfirmDelRol(null)}
        onConfirm={() => handleDelRol(confirmDelRol)} danger
        title="Eliminar rol"
        message={`¿Eliminar el rol? Los usuarios asignados deberán ser reasignados.`}
      />
    </div>
  )
}

// ════════════════════════════════════════════════════════
// MODAL USUARIO
// ════════════════════════════════════════════════════════
function ModalUsuario({ open, onClose, editando, onSave, sesionId, roles }) {
  const init = { nombre:'', email:'', password:'', rol:'almacenero', activo:true }
  const [form,     setForm]     = useState(init)
  const [showPass, setShowPass] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    setForm(editando ? { ...init, ...editando, password:'' } : init)
    setShowPass(false)
  }, [editando, open])

  const rolSeleccionado = roles[form.rol]
  const esAdmin = rolSeleccionado?.permisos?.includes('*')
  const canSave = form.nombre.trim() && form.email.trim() && (editando || form.password.trim())

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
              onChange={e => f('password', e.target.value)} placeholder="Mínimo 6 caracteres"/>
            <button type="button" onClick={() => setShowPass(p=>!p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6f80] hover:text-[#9ba8b6]">
              {showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
            </button>
          </div>
        </Field>
      </div>

      {/* Selección de rol */}
      <Field label="Rol *">
        <select className={SEL} value={form.rol} onChange={e => f('rol', e.target.value)}>
          {Object.entries(roles).map(([id, r]) => (
            <option key={id} value={id}>{r.label} — {r.desc}</option>
          ))}
        </select>
      </Field>

      {/* Vista previa de permisos del rol */}
      {rolSeleccionado && (
        <div className="bg-[#1a2230] rounded-xl p-4 border border-white/[0.06]">
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
                  <div key={mod.id} className={`flex items-center gap-1.5 text-[11px] ${tiene ? 'text-[#e8edf2]' : 'text-[#374151] opacity-40'}`}>
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

// ════════════════════════════════════════════════════════
// MODAL ROL
// ════════════════════════════════════════════════════════
function ModalRol({ open, onClose, editando, onSave }) {
  const esBase = editando?.id ? !!ROLES_BASE[editando.id] : false

  const init = {
    label:'', desc:'', color:'#3b82f6',
    permisos: ['dashboard'],
    esAdmin: false,
  }
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
  }, [editando, open])

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

  function seleccionarTodos() {
    setForm(p => ({ ...p, permisos: TODOS_MODULOS, esAdmin: false }))
  }
  function deseleccionarTodos() {
    setForm(p => ({ ...p, permisos: ['dashboard'] }))
  }

  function handleSave() {
    if (!form.label.trim()) return
    const permisos = form.esAdmin ? ['*'] : form.permisos
    onSave(editando?.id || null, {
      label:   form.label.trim(),
      desc:    form.desc.trim(),
      color:   form.color,
      permisos,
    })
  }

  const COLORES_PRESET = [
    '#ef4444','#f59e0b','#22c55e','#3b82f6','#8b5cf6','#06b6d4','#ec4899','#00c896','#64748b',
  ]

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

      {/* Color del rol */}
      <div>
        <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] block mb-2">Color del rol</label>
        <div className="flex items-center gap-2 flex-wrap">
          {COLORES_PRESET.map(col => (
            <button key={col} type="button"
              className={`w-7 h-7 rounded-full border-2 transition-all ${form.color===col ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
              style={{ background: col }}
              onClick={() => !esBase && f('color', col)}/>
          ))}
          <input type="color" value={form.color} onChange={e => !esBase && f('color', e.target.value)}
            className="w-7 h-7 rounded-full cursor-pointer border-0 bg-transparent"
            title="Color personalizado"/>
        </div>
      </div>

      {/* Opción acceso total */}
      <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
        form.esAdmin ? 'bg-amber-500/10 border-amber-500/30' : 'bg-[#1a2230] border-white/[0.06] hover:border-white/[0.12]'
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

      {/* Matriz de módulos */}
      {!form.esAdmin && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
              Módulos accesibles — {form.permisos.length}/{TODOS_MODULOS.length} seleccionados
            </span>
            <div className="flex gap-2">
              <Btn variant="ghost" size="sm" onClick={seleccionarTodos}>Todos</Btn>
              <Btn variant="ghost" size="sm" onClick={deseleccionarTodos}>Ninguno</Btn>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {MODULOS_GRUPOS.map(grupo => {
              const ids = grupo.items.map(i => i.id)
              const activos   = ids.filter(id => form.permisos.includes(id)).length
              const todosMarcados = activos === ids.length
              const algunoMarcado = activos > 0 && activos < ids.length

              return (
                <div key={grupo.grupo} className="bg-[#1a2230] rounded-xl overflow-hidden border border-white/[0.06]">
                  {/* Cabecera del grupo — clic selecciona/deselecciona todos */}
                  <button type="button"
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.03] transition-colors text-left"
                    onClick={() => !esBase && toggleGrupo(grupo)}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded flex items-center justify-center"
                        style={{ background: grupo.color+'22' }}>
                        {todosMarcados
                          ? <CheckSquare size={14} style={{ color: grupo.color }}/>
                          : algunoMarcado
                            ? <div className="w-2.5 h-2.5 rounded-sm" style={{ background: grupo.color, opacity: 0.6 }}/>
                            : <Square size={14} className="text-[#374151]"/>
                        }
                      </div>
                      <span className="text-[12px] font-semibold" style={{ color: grupo.color }}>
                        {grupo.grupo}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#5f6f80]">{activos}/{ids.length}</span>
                  </button>

                  {/* Ítems del grupo */}
                  <div className="px-4 pb-3 grid grid-cols-2 md:grid-cols-3 gap-1.5">
                    {grupo.items.map(mod => {
                      const activo = form.permisos.includes(mod.id)
                      return (
                        <label key={mod.id}
                          className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                            activo ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                          } ${esBase ? 'pointer-events-none' : ''}`}>
                          <input type="checkbox" checked={activo}
                            onChange={() => !esBase && toggleModulo(mod.id)}
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
        <div className="flex items-center gap-2 px-4 py-3 bg-[#1a2230] rounded-xl border border-white/[0.06] text-[12px] text-[#5f6f80]">
          <Lock size={13}/> Los roles base solo se pueden visualizar, no modificar. Para personalizar, crea un nuevo rol.
        </div>
      )}
    </Modal>
  )
}
