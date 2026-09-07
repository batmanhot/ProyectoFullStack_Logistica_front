import { useState } from 'react'
import {
  CreditCard, Plus, Star, CheckCircle, Edit2, Trash2, Save, Users, Package,
  Database, Hash, Download,
} from 'lucide-react'
import {
  PageHeader, Card, Btn, Badge, Field, Input, Select, Textarea, Toggle,
  TableWrap, Th, Td, EmptyState, Modal, ConfirmDialog, Alert,
} from './ui'
import { PLAN_MODULES, analyzePlanChange, dependentsOf, includeDependencies, displayLimit } from '../AdminSaaS/planCapabilities'
import { exportCsv } from './export-utils'

/**
 * Planes y límites — fusiona lo que en el panel clásico eran dos pestañas
 * separadas (Planes y Precios / Límites del Plan), siguiendo el patrón del
 * mockup de referencia (PlansLimitsRefined: una sola vista "Planes y
 * límites" porque en el dato real ambas cosas viven en el mismo PlanSaaS).
 * Lógica de negocio idéntica a TabPlanes.jsx + TabLimites.jsx del panel
 * clásico — dependencias de módulos, "un solo destacado", validaciones.
 */
export default function TabPlanesLimites({ planes, negocios, crearPlan, actualizarPlan, eliminarPlan, toast }) {
  const [modalOpen, setModal]   = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm]         = useState({})
  const [newFeat, setNewFeat]   = useState('')
  const [confirmDel, setConfirmDel] = useState(null)

  const DEFAULTS = { nombre:'', descripcion:'', precioMensual:0, precioAnual:0, moneda:'PEN', color:'#355fd1', destacado:false, activo:true, esPublico:true, vigenciaDias:30, caracteristicas:[], maxUsuarios:1, maxProductos:100, maxAlmacenes:1, maxProveedores:10, maxClientes:20, maxOrdenesMes:50, almacenamientoGB:1, soporte:'email', apiAccess:false, multiEmpresa:false, exportAvanzada:false, reportesAvanzados:false, modulosIncluidos:[] }

  function openNew() { setEditItem(null); setForm({ ...DEFAULTS }); setModal(true) }
  function openEdit(p) { setEditItem(p); setForm({ ...DEFAULTS, ...p, caracteristicas:[...(p.caracteristicas||[])], modulosIncluidos:[...(p.modulosIncluidos||[])] }); setModal(true) }

  const impact = editItem ? analyzePlanChange(editItem, form, negocios) : { removedModules:[], loweredLimits:[], affectedBusinesses:[] }

  async function save() {
    if (!form.nombre?.trim()) { toast('El nombre del plan es requerido', 'error'); return }
    const invalidLimit = ['maxUsuarios','maxProductos','maxAlmacenes','maxProveedores','maxClientes','maxOrdenesMes'].find(k => Number(form[k]) < -1)
    if (invalidLimit) { toast('Los límites solo aceptan -1 (ilimitado) o valores desde 0.', 'error'); return }
    if (Number(form.almacenamientoGB) < 0) { toast('El almacenamiento no puede ser negativo.', 'error'); return }
    if (!(form.modulosIncluidos || []).length) { toast('El plan debe incluir al menos un módulo operativo.', 'error'); return }
    if (form.reportesAvanzados && !(form.modulosIncluidos || []).includes('reportes')) { toast('Activa el módulo Reportes y KPIs para ofrecer reportes avanzados.', 'error'); return }

    if (editItem) {
      const res = await actualizarPlan.mutateAsync({ id: editItem.id, ...form })
      if (res?.error) { toast(res.error, 'error'); return }
      toast('Plan actualizado', 'success')
    } else {
      const id = form.nombre.toLowerCase().replace(/\s+/g,'-')
      const res = await crearPlan.mutateAsync({ id, ...form })
      if (res?.error) { toast(res.error, 'error'); return }
      toast('Plan creado', 'success')
    }
    setModal(false)
  }

  async function remove(id) {
    const res = await eliminarPlan.mutateAsync(id)
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Plan eliminado', 'success')
  }
  async function toggleActivo(p) {
    const res = await actualizarPlan.mutateAsync({ id: p.id, activo: !p.activo })
    if (res?.error) { toast(res.error, 'error'); return }
    toast(`${p.nombre}: ${p.activo ? 'desactivado' : 'activado'}`, 'success')
  }
  async function toggleDestacado(p) {
    const res = await actualizarPlan.mutateAsync({ id: p.id, destacado: !p.destacado })
    if (res?.error) { toast(res.error, 'error'); return }
    for (const other of planes.filter(x => x.id !== p.id && x.destacado)) {
      await actualizarPlan.mutateAsync({ id: other.id, destacado: false })
    }
  }
  function toggleModulo(key) {
    const actuales = form.modulosIncluidos || []
    if (!actuales.includes(key)) { setForm(p => ({ ...p, modulosIncluidos: includeDependencies(actuales, key) })); return }
    const dependents = dependentsOf(actuales, key)
    if (dependents.length) { toast(`Primero desactiva los módulos dependientes: ${dependents.join(', ')}.`, 'error'); return }
    setForm(p => ({ ...p, modulosIncluidos: actuales.filter(m => m !== key) }))
  }
  function addFeat() { if (!newFeat.trim()) return; setForm(p => ({ ...p, caracteristicas:[...(p.caracteristicas||[]), newFeat.trim()] })); setNewFeat('') }
  function removeFeat(i) { setForm(p => ({ ...p, caracteristicas: p.caracteristicas.filter((_,idx) => idx !== i) })) }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const moduleAssignments = planes.reduce((total, p) => total + (p.modulosIncluidos?.length || 0), 0)

  function exportar() {
    const rows = [
      ['Plan','Precio mensual','Usuarios','Productos','Almacenes','Pedidos/mes','Almacenamiento GB','Soporte','Módulos','Estado'],
      ...planes.map(p => [p.nombre, p.precioMensual, displayLimit(p.maxUsuarios), displayLimit(p.maxProductos), displayLimit(p.maxAlmacenes), displayLimit(p.maxOrdenesMes), displayLimit(p.almacenamientoGB), p.soporte, (p.modulosIncluidos||[]).join(' · '), p.activo ? 'Activo' : 'Inactivo']),
    ]
    exportCsv(rows, 'planes-y-limites')
    toast(`${planes.length} plan(es) exportado(s)`, 'success')
  }

  return (
    <div>
      <PageHeader
        breadcrumb="Suscripciones"
        title="Planes y límites"
        description="Define límites operativos y los módulos que se asignan a cada negocio."
        actions={<>
          <Btn variant="secondary" onClick={exportar}><Download size={14}/>Exportar</Btn>
          <Btn variant="primary" onClick={openNew}><Plus size={14}/>Nuevo plan</Btn>
        </>}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card><p className="text-[13px] font-semibold text-[#687386]">Planes activos</p><p className="mt-2 text-[24px] font-bold text-[#172033]">{planes.filter(p => p.activo).length}</p><p className="mt-1 text-[12.5px] text-[#8893a3]">Disponibles para contratación</p></Card>
        <Card><p className="text-[13px] font-semibold text-[#687386]">Asignaciones de módulos</p><p className="mt-2 text-[24px] font-bold text-[#172033]">{moduleAssignments}</p><p className="mt-1 text-[12.5px] text-[#8893a3]">Catálogo funcional por plan</p></Card>
        <Card><p className="text-[13px] font-semibold text-[#687386]">Acceso por vencimiento</p><p className="mt-2 text-[24px] font-bold text-[#172033]">Automático</p><p className="mt-1 text-[12.5px] text-[#8893a3]">Política calculada por negocio</p></Card>
      </div>

      {planes.length === 0 ? (
        <EmptyState icon={CreditCard} title="No hay planes definidos" action={<Btn variant="primary" onClick={openNew}><Plus size={14}/>Crear plan</Btn>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {planes.map(p => (
            <div key={p.id} className="relative rounded-2xl border border-[#dfe4ec] bg-white p-5 shadow-[0_1px_2px_rgba(18,27,43,.05)]" style={{ borderTopWidth: 4, borderTopColor: p.color }}>
              {p.destacado && (
                <div className="absolute top-3 right-3"><Badge variant="info"><Star size={10} className="mr-1" fill="currentColor"/>Destacado</Badge></div>
              )}
              <div className="flex items-start gap-3">
                <span className="grid size-10 place-items-center rounded-xl shrink-0" style={{ background: '#eef2ff', color: p.color }}><CreditCard size={17}/></span>
                <div className="min-w-0">
                  <h3 className="font-bold text-[#172033]">{p.nombre}</h3>
                  <p className="mt-0.5 text-[12px] leading-5 text-[#8893a3] line-clamp-2">{p.descripcion}</p>
                </div>
              </div>
              <p className="mt-4 text-[13px] text-[#8893a3]">
                {p.precioMensual === 0 ? 'Gratis' : <>Desde <strong className="text-[22px] text-[#172033]">S/ {p.precioMensual}</strong> / mes</>}
              </p>
              <div className="mt-4 space-y-2 border-y border-[#eef1f6] py-3.5 text-[13px] text-[#3d4759]">
                <div className="flex items-center gap-2.5"><Users size={13} className="text-[#355fd1]"/>{displayLimit(p.maxUsuarios)} usuarios</div>
                <div className="flex items-center gap-2.5"><Package size={13} className="text-[#355fd1]"/>{displayLimit(p.maxProductos)} productos</div>
                <div className="flex items-center gap-2.5"><Database size={13} className="text-[#355fd1]"/>{displayLimit(p.maxAlmacenes)} almacenes</div>
                <div className="flex items-center gap-2.5"><Hash size={13} className="text-[#355fd1]"/>{displayLimit(p.maxOrdenesMes)} pedidos/mes</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(p.modulosIncluidos||[]).slice(0,3).map(m => <span key={m} className="rounded-full bg-[#eef1f6] px-2 py-1 text-[11px] font-semibold text-[#687386]">{PLAN_MODULES.find(x=>x.key===m)?.short || m}</span>)}
                {(p.modulosIncluidos||[]).length > 3 && <span className="rounded-full bg-[#eef1f6] px-2 py-1 text-[11px] font-semibold text-[#687386]">+{p.modulosIncluidos.length - 3}</span>}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Btn variant="secondary" size="sm" className="flex-1" onClick={() => openEdit(p)}><Edit2 size={12}/>Editar</Btn>
                <Btn variant="ghost" size="sm" onClick={() => toggleDestacado(p)} title="Destacar"><Star size={12}/></Btn>
                <button onClick={() => toggleActivo(p)} className={`h-9 rounded-xl border px-2.5 text-[11.5px] font-bold ${p.activo ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'bg-[#eef1f6] text-[#8893a3] border-transparent'}`}>{p.activo ? 'Activo' : 'Inactivo'}</button>
                <Btn variant="danger" size="icon" onClick={() => setConfirmDel(p)} title="Eliminar"><Trash2 size={12}/></Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {planes.length > 0 && (
        <Card className="!p-0 overflow-hidden">
          <div className="p-5 border-b border-[#eef1f6]">
            <h2 className="text-[15px] font-bold text-[#172033]">Matriz de módulos</h2>
            <p className="mt-0.5 text-[12.5px] text-[#8893a3]">Comparación directa de los módulos incluidos por cada plan.</p>
          </div>
          <div className="overflow-x-auto">
            <TableWrap>
              <thead>
                <tr>
                  <Th>Módulo</Th>
                  {planes.map(p => <Th key={p.id}>{p.nombre}</Th>)}
                  <Th right>Total</Th>
                </tr>
              </thead>
              <tbody>
                {PLAN_MODULES.map(mod => {
                  const included = planes.filter(p => (p.modulosIncluidos||[]).includes(mod.key))
                  return (
                    <tr key={mod.key} className="border-t border-[#eef1f6]">
                      <Td>
                        <div className="font-semibold text-[#172033]">{mod.label}</div>
                        <div className="text-[11.5px] text-[#8893a3]">{mod.desc}</div>
                      </Td>
                      {planes.map(p => (
                        <Td key={p.id}>
                          {(p.modulosIncluidos||[]).includes(mod.key)
                            ? <span className="inline-grid size-6 place-items-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle size={13}/></span>
                            : <span className="text-[#c3cad6]">—</span>}
                        </Td>
                      ))}
                      <Td right><Badge variant={included.length ? 'success' : 'neutral'}>{included.length}</Badge></Td>
                    </tr>
                  )
                })}
              </tbody>
            </TableWrap>
          </div>
        </Card>
      )}

      {/* Modal crear/editar plan */}
      <Modal open={modalOpen} onClose={() => setModal(false)} title={editItem ? `Editar plan: ${editItem.nombre}` : 'Crear nuevo plan'} size="lg"
        footer={<>
          <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn variant="primary" onClick={save}><Save size={14}/>{editItem ? 'Guardar cambios' : 'Crear plan'}</Btn>
        </>}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Field label="Nombre del plan *"><Input value={form.nombre||''} onChange={e => f('nombre',e.target.value)} placeholder="Pro, Enterprise…" /></Field></div>
          <div className="col-span-2"><Field label="Descripción corta"><Input value={form.descripcion||''} onChange={e => f('descripcion',e.target.value)} placeholder="Breve descripción para los clientes" /></Field></div>
          <Field label="Precio mensual (S/)"><Input type="number" min="0" value={form.precioMensual||0} onChange={e => f('precioMensual', parseFloat(e.target.value)||0)} /></Field>
          <Field label="Precio anual (S/)"><Input type="number" min="0" value={form.precioAnual||0} onChange={e => f('precioAnual', parseFloat(e.target.value)||0)} /></Field>
          <Field label="Color de acento">
            <div className="flex items-center gap-2">
              <input type="color" value={form.color||'#355fd1'} onChange={e => f('color',e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-[#dfe4ec]" />
              <Input className="flex-1" value={form.color||''} onChange={e => f('color',e.target.value)} placeholder="#355fd1" />
            </div>
          </Field>
          <Field label="Vigencia por defecto (días)"><Input type="number" min="1" value={form.vigenciaDias||30} onChange={e => f('vigenciaDias', parseInt(e.target.value)||30)} /></Field>

          <div className="col-span-2 flex items-center gap-6 flex-wrap py-1">
            <Toggle value={!!form.activo} onChange={v => f('activo',v)} label="Plan activo" />
            <Toggle value={!!form.destacado} onChange={v => f('destacado',v)} label="Destacar este plan" />
            <Toggle value={form.esPublico !== false} onChange={v => f('esPublico',v)} label="Público (landing y selector)" />
          </div>

          <div className="col-span-2 border-t border-[#eef1f6] pt-4 grid grid-cols-2 gap-4">
            <Field label="Máx. usuarios" hint="-1 = ilimitado"><Input type="number" value={form.maxUsuarios??1} onChange={e => f('maxUsuarios', parseInt(e.target.value)||0)} /></Field>
            <Field label="Máx. productos" hint="-1 = ilimitado"><Input type="number" value={form.maxProductos??100} onChange={e => f('maxProductos', parseInt(e.target.value)||0)} /></Field>
            <Field label="Máx. almacenes" hint="-1 = ilimitado"><Input type="number" value={form.maxAlmacenes??1} onChange={e => f('maxAlmacenes', parseInt(e.target.value)||0)} /></Field>
            <Field label="Máx. proveedores" hint="-1 = ilimitado"><Input type="number" value={form.maxProveedores??10} onChange={e => f('maxProveedores', parseInt(e.target.value)||0)} /></Field>
            <Field label="Máx. clientes" hint="-1 = ilimitado"><Input type="number" value={form.maxClientes??20} onChange={e => f('maxClientes', parseInt(e.target.value)||0)} /></Field>
            <Field label="Máx. órdenes/mes" hint="-1 = ilimitado"><Input type="number" value={form.maxOrdenesMes??50} onChange={e => f('maxOrdenesMes', parseInt(e.target.value)||0)} /></Field>
            <Field label="Almacenamiento (GB)"><Input type="number" min="0" value={form.almacenamientoGB??1} onChange={e => f('almacenamientoGB', parseInt(e.target.value)||0)} /></Field>
            <Field label="Tipo de soporte">
              <Select value={form.soporte||'email'} onChange={e => f('soporte',e.target.value)}>
                <option value="email">Email</option><option value="prioritario">Prioritario</option><option value="24/7">24/7 dedicado</option>
              </Select>
            </Field>
          </div>

          <div className="col-span-2 flex items-center gap-6 flex-wrap">
            <Toggle value={!!form.exportAvanzada} onChange={v => f('exportAvanzada',v)} label="Exportación avanzada" />
            <Toggle value={!!form.reportesAvanzados} onChange={v => f('reportesAvanzados',v)} label="Reportes avanzados" />
            <Toggle value={!!form.apiAccess} onChange={v => f('apiAccess',v)} label="Acceso API" />
            <Toggle value={!!form.multiEmpresa} onChange={v => f('multiEmpresa',v)} label="Multi-empresa" />
          </div>

          <div className="col-span-2 border-t border-[#eef1f6] pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#687386]">Módulos incluidos</span>
              <Badge variant="neutral">{(form.modulosIncluidos||[]).length} seleccionados</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {PLAN_MODULES.map(mod => {
                const selected = (form.modulosIncluidos||[]).includes(mod.key)
                return (
                  <button key={mod.key} type="button" onClick={() => toggleModulo(mod.key)}
                    className={`rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors ${selected ? 'border-[#355fd1] bg-[#355fd1] text-white' : 'bg-white text-[#687386] border-[#dfe4ec] hover:border-[#355fd1]/40'}`}>
                    {mod.label}
                  </button>
                )
              })}
            </div>
          </div>

          {editItem && (impact.removedModules.length > 0 || impact.loweredLimits.length > 0) && (
            <div className="col-span-2">
              <Alert variant="warning">
                Impacto antes de guardar · {impact.affectedBusinesses.length} negocio(s) usan este plan.{' '}
                {impact.removedModules.length ? `Se retirarán módulos: ${impact.removedModules.join(', ')}. ` : ''}
                {impact.loweredLimits.length ? `Se reducen límites: ${impact.loweredLimits.join(', ')}. No se eliminan datos existentes.` : ''}
              </Alert>
            </div>
          )}

          <div className="col-span-2 border-t border-[#eef1f6] pt-4">
            <Field label="Características incluidas (texto libre para la landing)">
              <div className="space-y-1.5 mb-2">
                {(form.caracteristicas||[]).map((c, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[#f9fafc] px-3 py-1.5 rounded-lg">
                    <CheckCircle size={12} className="text-[#355fd1] shrink-0" />
                    <span className="flex-1 text-[13px] text-[#172033]">{c}</span>
                    <button onClick={() => removeFeat(i)} className="text-[#8893a3] hover:text-red-500"><Trash2 size={12}/></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input className="flex-1" value={newFeat} onChange={e => setNewFeat(e.target.value)} onKeyDown={e => e.key==='Enter' && addFeat()} placeholder="Agregar característica…" />
                <Btn variant="secondary" onClick={addFeat}><Plus size={14}/>Agregar</Btn>
              </div>
            </Field>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={() => remove(confirmDel?.id)}
        danger title="Eliminar plan" message={`¿Eliminar el plan "${confirmDel?.nombre}"? Los negocios con este plan no serán afectados.`} />
    </div>
  )
}
