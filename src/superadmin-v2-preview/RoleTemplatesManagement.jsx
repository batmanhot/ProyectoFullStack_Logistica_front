import { useEffect, useMemo, useState } from 'react'
import { Check, Pencil, Plus, ShieldCheck, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { PLAN_MODULES } from '../pages/AdminSaaS/planCapabilities'

const STORE_KEY = 'stockpro-superadmin-v2-fixed-role-templates-v1'

const seedRoleTemplates = [
  { id:'administrador', nombre:'Administrador operativo', descripcion:'Administración integral de la operación.', accesos:PLAN_MODULES.map(item => item.key), usuarios:1, version:1, activo:true },
  { id:'gerente-operaciones', nombre:'Gerente de operaciones', descripcion:'Supervisión operativa, indicadores y reportes.', accesos:['inventario','operaciones','compras','despachos','transporte','reportes'], usuarios:1, version:1, activo:true },
  { id:'supervisor', nombre:'Supervisor', descripcion:'Supervisión de almacén y trazabilidad operativa.', accesos:['inventario','operaciones','despachos','reportes'], usuarios:1, version:1, activo:true },
  { id:'almacenero', nombre:'Almacenero', descripcion:'Ejecución de tareas y movimientos de almacén.', accesos:['inventario','operaciones'], usuarios:1, version:1, activo:true },
  { id:'analista-comercial', nombre:'Analista comercial', descripcion:'Consulta comercial, clientes y análisis.', accesos:['ventas','despachos','reportes'], usuarios:1, version:1, activo:true },
  { id:'ejecutivo-comercial', nombre:'Ejecutivo comercial', descripcion:'Gestión de ventas, clientes y proformas.', accesos:['ventas','despachos'], usuarios:1, version:1, activo:true },
  { id:'coordinador', nombre:'Coordinador', descripcion:'Coordinación de despachos y transporte.', accesos:['despachos','transporte'], usuarios:1, version:1, activo:true },
  { id:'chofer', nombre:'Chofer', descripcion:'Consulta y confirmación de entregas asignadas.', accesos:['despachos','transporte'], usuarios:1, version:1, activo:true },
  { id:'contable', nombre:'Contable / Finanzas', descripcion:'Operación financiera, contable y SUNAT.', accesos:['ventas','contable','reportes'], usuarios:1, version:1, activo:true },
  { id:'auditor', nombre:'Auditor', descripcion:'Consulta de bitácoras, trazabilidad y conciliación.', accesos:['inventario','operaciones','reportes','panel-auditoria'], usuarios:1, version:1, activo:true },
  { id:'solicitante', nombre:'Solicitante', descripcion:'Solicitudes internas con acceso operativo acotado.', accesos:['compras'], usuarios:1, version:1, activo:true },
]

const blankRole = { nombre:'', descripcion:'', accesos:[], usuarios:0, version:1, activo:true }

export default function RoleTemplatesManagement() {
  const [roles, setRoles] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || seedRoleTemplates } catch { return seedRoleTemplates }
  })
  const [editing, setEditing] = useState(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [draft, setDraft] = useState(blankRole)
  const [filter, setFilter] = useState('Todos')

  useEffect(() => { localStorage.setItem(STORE_KEY, JSON.stringify(roles)) }, [roles])
  const visible = useMemo(() => roles.filter(role => filter === 'Todos' || (filter === 'Activos' ? role.activo : !role.activo)), [roles, filter])

  const openEditor = role => {
    setEditing(role || null)
    setDraft(role ? { ...role, accesos:[...role.accesos] } : { ...blankRole })
    setEditorOpen(true)
  }
  const toggleAccess = key => setDraft(current => ({ ...current, accesos:current.accesos.includes(key) ? current.accesos.filter(item => item !== key) : [...current.accesos, key] }))
  const save = () => {
    if (!draft.nombre.trim()) { toast.error('Ingresa el nombre del rol fijo.'); return }
    if (!draft.accesos.length) { toast.error('Selecciona al menos un acceso.'); return }
    const record = editing
      ? { ...draft, id:editing.id, version:editing.version + 1 }
      : { ...draft, id:`rol-${Date.now()}`, version:1 }
    setRoles(current => editing ? current.map(role => role.id === record.id ? record : role) : [...current, record])
    setEditing(null)
    setEditorOpen(false)
    toast.success(editing ? 'Nueva versión de la plantilla publicada.' : 'Rol fijo publicado para asignación.')
  }

  return <section className="mt-5 rounded-xl border border-white/8 bg-[#161d28] p-5">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-semibold uppercase tracking-[.08em] text-[#00c896]">Catálogo central</p><h2 className="mt-1 text-lg font-semibold">Plantillas de roles fijos</h2><p className="mt-1 max-w-3xl text-xs leading-relaxed text-[#9ba8b6]">El SuperAdmin define y publica los accesos. Admin Owner y Admin Tenant solamente asignan estas plantillas a sus usuarios.</p></div><button type="button" onClick={() => openEditor(null)} className="inline-flex items-center gap-2 rounded-lg bg-[#00c896] px-3 py-2 text-xs font-semibold text-[#082e1e]"><Plus size={14}/>Nuevo rol fijo</button></header>
    <div className="mt-4 flex gap-2">{['Todos','Activos','Archivados'].map(item => <button key={item} onClick={() => setFilter(item)} className={`rounded-lg px-3 py-1.5 text-xs ${filter === item ? 'bg-[#00c896]/15 text-[#00c896]' : 'bg-white/4 text-[#9ba8b6]'}`}>{item}</button>)}</div>
    <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="text-[10px] uppercase tracking-wide text-[#5f6f80]"><tr>{['Rol fijo','Accesos','Versión','Usuarios','Estado',''].map(value => <th key={value || 'actions'} className="border-b border-white/8 px-3 py-2 font-semibold">{value}</th>)}</tr></thead><tbody>{visible.map(role => <tr key={role.id} className="border-b border-white/6 last:border-0"><td className="px-3 py-3"><p className="font-medium text-[#e8edf2]">{role.nombre}</p><p className="mt-0.5 text-xs text-[#5f6f80]">{role.descripcion}</p></td><td className="px-3 py-3 text-[#9ba8b6]">{role.accesos.length} módulos</td><td className="px-3 py-3 text-[#9ba8b6]">v{role.version}</td><td className="px-3 py-3 text-[#9ba8b6]">{role.usuarios}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[11px] ${role.activo ? 'bg-emerald-500/10 text-emerald-300' : 'bg-white/8 text-[#9ba8b6]'}`}>{role.activo ? 'Publicado' : 'Archivado'}</span></td><td className="px-3 py-3"><button type="button" onClick={() => openEditor(role)} className="inline-flex items-center gap-1 text-xs text-[#00c896]"><Pencil size={12}/>Gestionar</button></td></tr>)}</tbody></table></div>
    <div className="mt-4 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs leading-relaxed text-blue-100"><ShieldCheck size={15} className="mr-2 inline"/>Los roles no se eliminan cuando están en uso: se archivan. Una actualización incrementa su versión y deberá mostrar su impacto antes de aplicarse a usuarios reales.</div>

    {editorOpen && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-5" onMouseDown={event => { if (event.target === event.currentTarget) { setEditorOpen(false); setEditing(null); setDraft(blankRole) } }}><div role="dialog" aria-modal="true" aria-label="Gestionar plantilla de rol" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-[#161d28]"><header className="flex items-center justify-between border-b border-white/8 px-5 py-4"><div><h3 className="font-semibold">{editing ? `Gestionar ${editing.nombre}` : 'Nuevo rol fijo'}</h3><p className="mt-1 text-xs text-[#5f6f80]">Solo disponible para SuperAdmin.</p></div><button onClick={() => { setEditorOpen(false); setEditing(null); setDraft(blankRole) }} className="p-2 text-[#9ba8b6]"><X size={16}/></button></header><div className="grid gap-4 p-5 md:grid-cols-2"><label className="text-xs text-[#9ba8b6]">Nombre del rol<input value={draft.nombre} onChange={event => setDraft(current => ({ ...current, nombre:event.target.value }))} placeholder="Supervisor de operaciones" className="mt-1.5 w-full rounded-lg border border-white/8 bg-[#0e1117] px-3 py-2.5 text-sm text-[#e8edf2] outline-none focus:border-[#00c896]" /></label><label className="text-xs text-[#9ba8b6]">Estado<select value={String(draft.activo)} onChange={event => setDraft(current => ({ ...current, activo:event.target.value === 'true' }))} className="mt-1.5 w-full rounded-lg border border-white/8 bg-[#0e1117] px-3 py-2.5 text-sm text-[#e8edf2]"><option value="true">Publicado</option><option value="false">Archivado</option></select></label><label className="md:col-span-2 text-xs text-[#9ba8b6]">Descripción<textarea value={draft.descripcion} onChange={event => setDraft(current => ({ ...current, descripcion:event.target.value }))} placeholder="Responsabilidades y alcance del rol" rows={2} className="mt-1.5 w-full rounded-lg border border-white/8 bg-[#0e1117] px-3 py-2.5 text-sm text-[#e8edf2] outline-none focus:border-[#00c896]" /></label><div className="md:col-span-2"><p className="text-xs font-semibold text-[#9ba8b6]">Accesos incluidos</p><div className="mt-3 grid gap-2 md:grid-cols-2">{PLAN_MODULES.map(module => { const checked = draft.accesos.includes(module.key); return <button type="button" key={module.key} onClick={() => toggleAccess(module.key)} className={`flex items-start gap-3 rounded-lg border p-3 text-left ${checked ? 'border-[#00c896]/40 bg-[#00c896]/8' : 'border-white/8 bg-[#0e1117]'}`}><span className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded border ${checked ? 'border-[#00c896] bg-[#00c896] text-[#082e1e]' : 'border-white/20'}`}>{checked && <Check size={11}/>}</span><span><strong className="block text-xs text-[#e8edf2]">{module.label}</strong><span className="mt-1 block text-[11px] text-[#5f6f80]">{module.desc}</span></span></button> })}</div></div>{editing && <div className="md:col-span-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-100">Publicar generará la versión v{editing.version + 1}. En producción requerirá mostrar usuarios y negocios afectados antes de confirmar.</div>}</div><footer className="flex justify-end gap-2 border-t border-white/8 px-5 py-4"><button onClick={() => { setEditorOpen(false); setEditing(null); setDraft(blankRole) }} className="rounded-lg border border-white/8 px-3 py-2 text-xs text-[#9ba8b6]">Cancelar</button><button onClick={save} className="rounded-lg bg-[#00c896] px-3 py-2 text-xs font-semibold text-[#082e1e]">Publicar plantilla</button></footer></div></div>}
  </section>
}
