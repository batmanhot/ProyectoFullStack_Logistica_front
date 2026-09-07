import { createElement, useEffect, useState } from 'react'
import { AlertTriangle, Menu, Search, X } from 'lucide-react'
import { Card, DemoStatusBanner, EmptyTab, HelpPanel, ModuleHeader, ModuleTabs } from '../components/ModuleChrome'
import LandingManagement from '../LandingManagement'
import PlanCapabilitiesManagement from '../PlanCapabilitiesManagement'
import PlanComparison from '../PlanComparison'
import RoleTemplatesManagement from '../RoleTemplatesManagement'
import { seedPlans, seedTenantAdmins, seedTenants } from '../domain'
import { MODULES, NAV_GROUPS, readLocation, writeLocation } from './navigation'

const alerts = [
  { tipo:'Suscripción', severidad:'Alta', titulo:'Plan vence hoy', detalle:'Logística Andina EIRL · Básico', estado:'Abierta' },
  { tipo:'Límites', severidad:'Media', titulo:'Capacidad de usuarios agotada', detalle:'5 / 5 usuarios activos · Logística Andina EIRL', estado:'Abierta' },
  { tipo:'Seguridad', severidad:'Media', titulo:'MFA pendiente', detalle:'2 administradores requieren enrolamiento', estado:'Abierta' },
  { tipo:'Operación', severidad:'Baja', titulo:'Backup diario verificado', detalle:'BKP-20260829 completado y validado', estado:'Resuelta' },
]
const sessions = [
  { id:'s1', adminId:'a1', dispositivo:'Windows · Chrome', ubicacion:'Lima, Perú', acceso:'Ahora', activa:true },
  { id:'s2', adminId:'a1', dispositivo:'Android · Chrome', ubicacion:'Lima, Perú', acceso:'Hace 2 días', activa:true },
  { id:'s3', adminId:'a2', dispositivo:'macOS · Safari', ubicacion:'Arequipa, Perú', acceso:'Hace 3 h', activa:true },
]
const audit = [
  ['29 ago · 10:42','Andrea Ramos','Actualizó plan','Distribuciones Norte SAC','Suscripción','Exitoso'],
  ['29 ago · 10:31','Sistema','Verificó backup','BKP-20260829','Operación','Exitoso'],
  ['29 ago · 09:15','Carlos Medina','Inició sesión','PlatformAdmin','Seguridad','Exitoso'],
  ['28 ago · 17:04','Andrea Ramos','Consultó detalle 360°','Comercial Pacífico SAC','Soporte','Exitoso'],
]
const supportCases = [
  ['CASE-1042','Validar acceso de administrador','Logística Andina EIRL','Alta','Abierto'],
  ['CASE-1041','Consulta sobre límite de usuarios','Comercial Pacífico SAC','Media','En análisis'],
  ['CASE-1038','Solicitud de exportación','Distribuciones Norte SAC','Baja','Resuelto'],
]

function useLocalState(key, initialValue) {
  const [value, setValue] = useState(() => { try { return JSON.parse(localStorage.getItem(key)) || initialValue } catch { return initialValue } })
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* demo */ } }, [key, value])
  return [value, setValue]
}

function Status({ children }) { return <span className="inline-flex rounded-full bg-white/7 px-2.5 py-1 text-[11px] font-medium text-[#b8c4d1]">{children}</span> }
function PrimaryButton({ children, onClick, disabled }) { return <button type="button" onClick={onClick} disabled={disabled} className="rounded-lg bg-[#00c896] px-3 py-2 text-xs font-semibold text-[#082e1e] disabled:cursor-not-allowed disabled:opacity-40">{children}</button> }
function Kpis({ items }) { return <div className="grid gap-3 md:grid-cols-3">{items.map(([label,value,detail,color='#00c896']) => <Card key={label} title=""><span className="block h-1 w-9 rounded-full" style={{backgroundColor:color}} /><p className="mt-3 text-[11px] uppercase tracking-wider text-[#7190b3]">{label}</p><p className="mt-1 text-2xl font-semibold text-[#e8edf2]">{value}</p><p className="mt-1 text-xs">{detail}</p></Card>)}</div> }

function EntityEditor({ kind, tenants, onClose, onSave }) {
  const isTenant = kind === 'tenant'
  const [form, setForm] = useState(isTenant
    ? { nombre:'', ruc:'', codigo:'', contacto:'', email:'', telefono:'', plan:'Básico', estado:'Activo' }
    : { nombre:'', email:'', tenant:tenants[0]?.nombre || '', tipo:'Admin Tenant' })
  const [error, setError] = useState('')
  useEffect(() => { const close = event => event.key === 'Escape' && onClose(); document.addEventListener('keydown', close); return () => document.removeEventListener('keydown', close) }, [onClose])
  const set = (key,value) => setForm(current => ({...current,[key]:value}))
  const submit = event => {
    event.preventDefault()
    if (!form.nombre.trim() || !form.email.trim() || (isTenant && (!form.ruc.trim() || !form.codigo.trim())) || (!isTenant && !form.tenant)) { setError(isTenant ? 'Completa nombre, RUC, código y correo.' : 'Completa nombre, correo y negocio.'); return }
    onSave(form)
  }
  const input = 'mt-1.5 w-full rounded-lg border border-white/10 bg-[#0e1117] px-3 py-2.5 text-sm text-[#e8edf2] outline-none transition focus:border-[#00c896]/70 focus:ring-2 focus:ring-[#00c896]/10'
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={event=>event.target===event.currentTarget&&onClose()}>
    <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="entity-editor-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-[#161d28] p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-semibold uppercase tracking-[.12em] text-[#00c896]">{isTenant?'Negocios':'Usuarios'}</p><h2 id="entity-editor-title" className="mt-2 text-xl font-semibold">{isTenant?'Nuevo negocio':'Nuevo administrador'}</h2><p className="mt-1 text-sm text-[#8392a4]">{isTenant?'Registra la información esencial. Podrás completar el detalle después.':'Asigna un responsable a un negocio existente.'}</p></div><button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-2 text-[#8392a4] hover:bg-white/5"><X size={18}/></button></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-medium text-[#9ba8b6] sm:col-span-2">Nombre completo{isTenant?' del negocio':''}<input autoFocus className={input} value={form.nombre} onChange={e=>set('nombre',e.target.value)} /></label>
        <label className="text-xs font-medium text-[#9ba8b6] sm:col-span-2">Correo<input type="email" className={input} value={form.email} onChange={e=>set('email',e.target.value)} /></label>
        {isTenant ? <>
          <label className="text-xs font-medium text-[#9ba8b6]">RUC<input inputMode="numeric" maxLength={11} className={input} value={form.ruc} onChange={e=>set('ruc',e.target.value.replace(/\D/g,''))} /></label>
          <label className="text-xs font-medium text-[#9ba8b6]">Código del tenant<input className={input} value={form.codigo} onChange={e=>set('codigo',e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))} /></label>
          <label className="text-xs font-medium text-[#9ba8b6]">Contacto<input className={input} value={form.contacto} onChange={e=>set('contacto',e.target.value)} /></label>
          <label className="text-xs font-medium text-[#9ba8b6]">Teléfono<input className={input} value={form.telefono} onChange={e=>set('telefono',e.target.value)} /></label>
          <label className="text-xs font-medium text-[#9ba8b6]">Plan<select className={input} value={form.plan} onChange={e=>set('plan',e.target.value)}><option>Prueba gratuita</option><option>Básico</option><option>Profesional</option><option>Empresarial</option></select></label>
          <label className="text-xs font-medium text-[#9ba8b6]">Estado<select className={input} value={form.estado} onChange={e=>set('estado',e.target.value)}><option>Trial</option><option>Activo</option><option>Suspendido</option></select></label>
        </> : <>
          <label className="text-xs font-medium text-[#9ba8b6] sm:col-span-2">Negocio<select className={input} value={form.tenant} onChange={e=>set('tenant',e.target.value)}>{tenants.map(tenant=><option key={tenant.id||tenant.nombre}>{tenant.nombre}</option>)}</select></label>
          <label className="text-xs font-medium text-[#9ba8b6] sm:col-span-2">Tipo de administrador<select className={input} value={form.tipo} onChange={e=>set('tipo',e.target.value)}><option>Admin Owner</option><option>Admin Tenant</option></select></label>
        </>}
      </div>
      {error && <p role="alert" className="mt-4 text-xs text-red-300">{error}</p>}
      <div className="mt-7 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2.5 text-xs text-[#9ba8b6]">Cancelar</button><button type="submit" className="rounded-lg bg-[#00c896] px-4 py-2.5 text-xs font-semibold text-[#082e1e]">{isTenant?'Crear negocio':'Crear administrador'}</button></div>
      <p className="mt-4 text-center text-[11px] text-[#5f6f80]">Registro local de demostración · backend pendiente</p>
    </form>
  </div>
}

export default function SuperAdminV2App() {
  const [location, setLocation] = useState(readLocation)
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState(null)
  const [tenants, setTenants] = useLocalState('stockpro-superadmin-v2-tenants-v4', seedTenants)
  const [admins, setAdmins] = useLocalState('stockpro-superadmin-v2-tenant-admins-v2', seedTenantAdmins)
  const [adminSessions, setAdminSessions] = useLocalState('stockpro-superadmin-v2-admin-sessions-v2', sessions)
  useEffect(() => { const sync = () => setLocation(readLocation()); window.addEventListener('hashchange', sync); return () => window.removeEventListener('hashchange', sync) }, [])
  const go = (module, tab) => { writeLocation(module, tab); setMenuOpen(false) }
  const config = MODULES[location.module]
  return <div className="min-h-screen bg-[#0e1117] text-[#e8edf2]">
    <button onClick={() => setMenuOpen(true)} className="fixed left-4 top-4 z-30 rounded-lg border border-white/10 bg-[#161d28] p-2 lg:hidden" aria-label="Abrir navegación"><Menu size={19} /></button>
    {menuOpen && <button className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Cerrar navegación" />}
    <aside className={`fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto border-r border-white/8 bg-[#111720] px-4 py-5 transition-transform lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="mb-7 flex items-center justify-between"><div><p className="text-lg font-semibold">StockPro</p><p className="text-xs text-[#00c896]">SuperAdmin V2 · maqueta</p></div><button onClick={() => setMenuOpen(false)} className="lg:hidden" aria-label="Cerrar"><X size={18}/></button></div>
      {NAV_GROUPS.map(group => <div key={group.label || 'main'} className="mb-5"><p className="mb-2 px-2 text-[10px] font-semibold tracking-[.12em] text-[#5f6f80]">{group.label}</p>{group.items.map(([id,icon]) => <button key={id} onClick={() => go(id)} className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${location.module === id ? 'bg-[#00c896]/12 text-[#00c896]' : 'text-[#9ba8b6] hover:bg-white/4 hover:text-[#e8edf2]'}`}>{createElement(icon,{size:17})}{MODULES[id].label}</button>)}</div>)}
    </aside>
    <main className="min-h-screen lg:pl-64"><section className="mx-auto max-w-[1280px] px-5 pb-16 pt-16 lg:px-10 lg:pt-10">
      <ModuleHeader eyebrow={config.eyebrow} title={config.label} description={config.description} action={<span className="rounded-full border border-amber-500/25 bg-amber-500/8 px-3 py-1.5 text-[11px] font-semibold text-amber-200">Entorno de demostración</span>} />
      {config.tabs.length > 1 && <ModuleTabs tabs={config.tabs.map(([id,label]) => ({id,label}))} active={location.tab} onChange={tab => go(location.module, tab)} />}
      <ModuleContent module={location.module} tab={location.tab} tenants={tenants} admins={admins} sessions={adminSessions} setSessions={setAdminSessions} query={query} setQuery={setQuery} openEditor={setEditor} />
    </section></main>
    {editor && <EntityEditor kind={editor} tenants={tenants} onClose={() => setEditor(null)} onSave={data => { if (editor === 'tenant') setTenants(current => [{ ...data, id:`tenant-${Date.now()}`, admins:0, usuarios:0, riesgo:'Normal', ultimoAcceso:'Nunca' }, ...current]); else setAdmins(current => [{ ...data, id:`admin-${Date.now()}`, activo:true }, ...current]); setEditor(null) }} />}
  </div>
}

function ModuleContent(props) {
  const pages = { dashboard:Dashboard, negocios:Negocios, usuarios:Usuarios, soporte:Soporte, planes:Planes, suscripciones:Suscripciones, operacion:Operacion, alertas:Alertas, auditoria:Auditoria, administradores:Administradores, configuracion:Configuracion, landing:Landing, analytics:Analytics }
  const Page = pages[props.module]
  return <Page {...props} />
}

function Dashboard({ tenants, admins }) { return <><Kpis items={[["Negocios activos",tenants.filter(t=>t.estado==='Activo').length,'Tenants con operación habilitada'],['Administradores',admins.length,'Owner y Admin Tenant registrados'],['Alertas abiertas','3','Requieren atención','#f59e0b']]} /><div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]"><Card title="Requiere atención">{alerts.filter(a=>a.estado==='Abierta').map(a=><div key={a.titulo} className="flex gap-3 border-t border-white/6 py-3 first:border-0"><AlertTriangle size={16} className="mt-0.5 text-amber-400"/><div><p className="text-[#e8edf2]">{a.titulo}</p><p className="text-xs">{a.detalle}</p></div></div>)}</Card><Card title="Acciones rápidas"><div className="grid gap-2"><button onClick={()=>writeLocation('negocios','listado')} className="rounded-lg bg-white/4 p-3 text-left hover:bg-white/7">Gestionar negocios</button><button onClick={()=>writeLocation('usuarios','administradores-tenant')} className="rounded-lg bg-white/4 p-3 text-left hover:bg-white/7">Administradores de tenant</button><button onClick={()=>writeLocation('soporte','casos')} className="rounded-lg bg-white/4 p-3 text-left hover:bg-white/7">Revisar soporte</button></div></Card></div></> }

function Negocios({ tab, tenants, query, setQuery, openEditor }) {
  const filtered = tenants.filter(t=>t.nombre.toLowerCase().includes(query.toLowerCase()))
  if(tab==='listado') return <><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><label className="flex min-w-[280px] items-center gap-2 rounded-lg border border-white/8 bg-[#161d28] px-3 py-2"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Buscar negocio" /></label><PrimaryButton onClick={()=>openEditor('tenant')}>Nuevo negocio</PrimaryButton></div><div className="overflow-x-auto rounded-xl border border-white/8 bg-[#161d28]"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-white/3 text-xs text-[#718095]"><tr>{['Negocio','Plan','Estado','Administradores','Usuarios','Riesgo',''].map(x=><th key={x||'a'} className="px-4 py-3">{x}</th>)}</tr></thead><tbody>{filtered.map(t=><tr key={t.id||t.nombre} className="border-t border-white/6"><td className="px-4 py-4 font-medium">{t.nombre}</td><td className="px-4 py-4 text-[#9ba8b6]">{t.plan}</td><td className="px-4 py-4"><Status>{t.estado}</Status></td><td className="px-4 py-4">{t.admins}</td><td className="px-4 py-4">{t.usuarios}</td><td className="px-4 py-4"><Status>{t.riesgo}</Status></td><td className="px-4 py-4"><button className="text-xs text-[#00c896]">Abrir detalle</button></td></tr>)}</tbody></table></div></>
  if(tab==='ciclo') return <><DemoStatusBanner>Las transiciones se muestran para validar el flujo; las reglas autoritativas de suspensión y reactivación siguen pendientes.</DemoStatusBanner><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{tenants.map(t=><Card key={t.id||t.nombre} title={t.nombre}><div className="flex items-center justify-between"><Status>{t.estado}</Status><span>{t.plan}</span></div><p className="mt-3 text-xs">Trial → Activo → Gracia → Suspendido → Cancelado → Archivado</p></Card>)}</div></>
  return <><Kpis items={[["Riesgo alto",'1','Requiere atención hoy','#ef4444'],['Capacidad agotada','2','Límites al 100%','#f59e0b'],['Sin actividad','1','Más de 90 días','#3b82f6']]} /><HelpPanel>Los riesgos deben derivarse de datos reales de suscripción, uso, accesos y operación cuando se conecte el backend.</HelpPanel></>
}

function Usuarios({ tab, admins, sessions, setSessions, openEditor }) {
  if(tab==='roles') return <RoleTemplatesManagement />
  if(tab==='administradores-tenant') return <><div className="mb-4 flex justify-end"><PrimaryButton onClick={()=>openEditor('admin')}>Nuevo administrador</PrimaryButton></div><Card title="Administradores registrados · prueba local">{admins.map(a=><div key={a.id} className="flex flex-wrap items-center gap-3 border-t border-white/6 py-3 first:border-0"><div className="min-w-[220px] flex-1"><p className="font-medium text-[#e8edf2]">{a.nombre}</p><p className="text-xs">{a.email} · {a.tenant}</p></div><Status>{a.tipo}</Status><Status>{a.activo===false?'Inactivo':'Activo'}</Status><button className="text-xs text-[#00c896]">Editar</button></div>)}</Card></>
  return <><DemoStatusBanner>La revocación afecta únicamente estos datos locales; todavía no invalida tokens reales.</DemoStatusBanner><Card title="Sesiones activas">{sessions.map(s=><div key={s.id} className="flex flex-wrap items-center gap-3 border-t border-white/6 py-3 first:border-0"><div className="flex-1"><p className="text-[#e8edf2]">{s.dispositivo}</p><p className="text-xs">{s.ubicacion} · {s.acceso}</p></div><Status>{s.activa?'Activa':'Revocada'}</Status><button disabled={!s.activa} onClick={()=>setSessions(current=>current.map(x=>x.id===s.id?{...x,activa:false}:x))} className="text-xs text-red-300 disabled:opacity-40">Revocar</button></div>)}</Card><HelpPanel>Todo tenant debe conservar un Owner activo. Las asignaciones deben aplicar mínimo privilegio y quedar auditadas.</HelpPanel></>
}

function Soporte({ tab }) {
  if(tab==='casos') { const rows=supportCases; return <><DemoStatusBanner>Los casos son demostrativos. No existe aún persistencia, API ni acceso real a tenants.</DemoStatusBanner><div className="mb-4 flex justify-end"><PrimaryButton disabled>Nuevo caso · backend pendiente</PrimaryButton></div><Card title="Casos recientes">{rows.map(x=><div key={x[0]} className="grid gap-2 border-t border-white/6 py-3 first:border-0 sm:grid-cols-[100px_1fr_auto]"><span className="text-xs text-[#00c896]">{x[0]}</span><div><p className="text-[#e8edf2]">{x[1]}</p><p className="text-xs">{x[2]}</p></div><div className="flex gap-2"><Status>{x[3]}</Status><Status>{x[4]}</Status></div></div>)}</Card></> }
  if(tab==='accesos') return <><DemoStatusBanner/><Kpis items={[["Accesos activos",'0','Ningún acceso al tenant'],['Por expirar','0','Sin sesiones temporales'],['Revocados hoy','0','Sin actividad']]} /></>
  return <div className="grid gap-4 md:grid-cols-2"><Card title="1. Registrar el caso">Tenant, solicitante, motivo, prioridad y evidencia.</Card><Card title="2. Verificar identidad">Confirmación mediante un canal registrado.</Card><Card title="3. Aprobar intervención">Alcance mínimo, responsable y duración.</Card><Card title="4. Auditar y cerrar">Inicio, fin, acciones y resultado comunicado.</Card></div>
}

function Planes({ tab }) {
  if(tab==='capacidades') return <PlanCapabilitiesManagement />
  if(tab==='comparacion') return <PlanComparison plans={seedPlans} />
  return <><div className="mb-4 flex justify-end"><PrimaryButton>Nuevo plan</PrimaryButton></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{seedPlans.map(p=><Card key={p.id||p.nombre} title={p.nombre}><p className="text-2xl font-semibold text-[#e8edf2]">{p.mrr}</p><p className="mt-1 text-xs">{p.limite}</p><button className="mt-4 text-xs text-[#00c896]">Editar plan</button></Card>)}</div></>
}

function Suscripciones({ tab }) {
  if(tab==='resumen') return <Kpis items={[["MRR estimado",'S/ 9,840','Ingresos mensuales'],['Renovaciones próximas','3','Durante los siguientes 7 días'],['Pagos pendientes','2','Requieren seguimiento','#f59e0b']]} />
  if(tab==='renovaciones') return <Card title="Próximas renovaciones">{[['Hoy','Logística Andina EIRL','Básico'],['31 ago','Almacenes Sur Perú','Trial'],['02 sep','Comercial Pacífico SAC','Empresarial']].map(x=><div key={x[1]} className="grid grid-cols-[80px_1fr_auto] border-t border-white/6 py-3 first:border-0"><span>{x[0]}</span><span className="text-[#e8edf2]">{x[1]}</span><Status>{x[2]}</Status></div>)}</Card>
  return <><DemoStatusBanner>La emisión de documentos, pasarela y conciliación de pagos aún no están integradas.</DemoStatusBanner><EmptyTab title="Facturación y pagos" description="Documentos, cobros y conciliación se resolverán como un flujo único, sin mezclarse con las renovaciones." /></>
}

function Operacion({ tab }) {
  if(tab==='salud') return <Kpis items={[["Salud de plataforma",'96%','Servicios críticos operativos','#22c55e'],['Disponibilidad','99.9%','Ventana de evaluación'],['Servicios degradados','1','Requiere seguimiento','#f59e0b']]} />
  if(tab==='incidentes') return <Card title="Incidentes activos"><p>No hay incidentes críticos activos en los datos de demostración.</p></Card>
  return <><DemoStatusBanner>Los respaldos son informativos; restaurar o descargar no ejecuta procesos reales.</DemoStatusBanner><div className="grid gap-4 md:grid-cols-2"><Card title="Último respaldo"><p className="text-[#e8edf2]">BKP-20260829 · Verificado</p><p className="mt-2 text-xs">Hoy, 03:00 · PostgreSQL</p></Card><Card title="Plan de continuidad">Runbooks, responsables, simulacros y comunicación.</Card></div></>
}

function Alertas({ tab }) {
  if(tab==='bandeja') return <div className="space-y-3">{alerts.map(a=><Card key={a.titulo} title={a.titulo}><div className="flex flex-wrap justify-between gap-3"><span>{a.detalle}</span><div className="flex gap-2"><Status>{a.tipo}</Status><Status>{a.estado}</Status></div></div></Card>)}</div>
  return <><DemoStatusBanner/><EmptyTab title="Reglas de alertas" description="Aquí se configurarán fuentes, umbrales, severidad, responsables y escalamiento." /></>
}

function Auditoria({ tab }) {
  if(tab==='eventos') return <div className="overflow-x-auto rounded-xl border border-white/8 bg-[#161d28]"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-white/3 text-xs text-[#718095]"><tr>{['Fecha','Actor','Acción','Recurso','Tipo','Resultado'].map(x=><th key={x} className="px-4 py-3">{x}</th>)}</tr></thead><tbody>{audit.map(row=><tr key={row.join()} className="border-t border-white/6">{row.map((x,i)=><td key={i} className="px-4 py-4">{i>3?<Status>{x}</Status>:x}</td>)}</tr>)}</tbody></table></div>
  if(tab==='exportaciones') return <EmptyTab title="Exportaciones auditadas" description="Cada exportación registrará solicitante, motivo, filtros y resultado." />
  return <><DemoStatusBanner>La bitácora local no es inmutable. La garantía de integridad depende del backend.</DemoStatusBanner><div className="grid gap-4 md:grid-cols-2"><Card title="Retención">Definir plazos, acceso, archivo y eliminación controlada.</Card><Card title="Integridad">Verificar orden temporal, actor auténtico y ausencia de secretos.</Card></div></>
}

function Administradores({ tab, sessions, setSessions }) {
  if(tab==='cuentas') return <><div className="mb-4 flex justify-end"><PrimaryButton>Nuevo administrador de plataforma</PrimaryButton></div><Card title="Cuentas privilegiadas">{['Andrea Ramos','Carlos Medina'].map(x=><div key={x} className="flex justify-between border-t border-white/6 py-3 first:border-0"><span className="text-[#e8edf2]">{x}</span><Status>Activo</Status></div>)}</Card></>
  if(tab==='seguridad') return <><DemoStatusBanner/><Kpis items={[["MFA activo",'0 / 2','Implementación pendiente'],['Sesiones activas',sessions.filter(s=>s.activa).length,'Dispositivos conectados'],['Incumplimientos','2','Requieren atención','#f59e0b']]} /><Card title="Sesiones de plataforma" className="mt-5">{sessions.map(s=><div key={s.id} className="flex items-center justify-between border-t border-white/6 py-3 first:border-0"><div><p className="text-[#e8edf2]">{s.dispositivo}</p><p className="text-xs">{s.ubicacion}</p></div><button onClick={()=>setSessions(v=>v.map(x=>x.id===s.id?{...x,activa:false}:x))} className="text-xs text-red-300">{s.activa?'Revocar':'Revocada'}</button></div>)}</Card></>
  return <Card title="Actividad reciente">{audit.filter(x=>x[4]==='Seguridad').map(x=><p key={x.join()} className="border-t border-white/6 py-3 first:border-0">{x[1]} · {x[2]} · {x[0]}</p>)}</Card>
}

function Configuracion({ tab }) {
  if(tab==='experimentos') return <><DemoStatusBanner>ACE y Approval Engine permanecen en evaluación y no controlan la aplicación actual.</DemoStatusBanner><div className="grid gap-4 md:grid-cols-2"><Card title="Access Control Engine · ACE">Contratos, aislamiento y observabilidad pendientes.</Card><Card title="Approval Engine">Idempotencia, eventos y aprobación formal pendientes.</Card></div></>
  const content={general:['Configuración general','Nombre de plataforma, zona horaria, seguridad y notificaciones.'],integraciones:['Integraciones','Servicios externos, contratos y estado de conexión.']}[tab]
  return <><DemoStatusBanner/><EmptyTab title={content[0]} description={content[1]} /></>
}

function Landing({ tab }) {
  if(tab==='contenido') return <LandingManagement />
  if(tab==='seo') return <EmptyTab title="SEO y redes sociales" description="Título, descripción, Open Graph, imágenes y datos estructurados." />
  return <><DemoStatusBanner/><EmptyTab title="Publicación versionada" description="Borradores, versión publicada, autor, fecha e historial de cambios." /></>
}

function Analytics({ tab }) {
  if(tab==='resumen') return <Kpis items={[["Visitas del mes",'2,840','+12% vs. período anterior','#3b82f6'],['Solicitudes de demo','86','3.0% de conversión'],['Trials iniciados','24','28% desde solicitud','#8b5cf6']]} />
  if(tab==='conversion') return <Card title="Embudo de conversión">{[['Visitas','2,840','100%'],['Solicitudes','86','3.0%'],['Trials','24','0.8%'],['Clientes','9','0.3%']].map(x=><div key={x[0]} className="grid grid-cols-3 border-t border-white/6 py-3 first:border-0"><span>{x[0]}</span><span className="text-center text-[#e8edf2]">{x[1]}</span><span className="text-right">{x[2]}</span></div>)}</Card>
  if(tab==='adquisicion') return <EmptyTab title="Fuentes de adquisición" description="Campañas, referencias, búsqueda orgánica y atribución." />
  return <><DemoStatusBanner>Debe definirse el proveedor analítico y consentimiento antes de medir usuarios reales.</DemoStatusBanner><EmptyTab title="Consentimiento y privacidad" description="Cookies, finalidades, revocación y estado de instrumentación." /></>
}
