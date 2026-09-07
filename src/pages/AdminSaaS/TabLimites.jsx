import { useState, useEffect } from 'react'
import { Users, Package, Database, Tag, Hash, CheckCircle, Save } from 'lucide-react'
import { Field, Toggle, Alert, Btn, Input, Select } from '../../components/ui/index'
import { analyzePlanChange, dependentsOf, includeDependencies, PLAN_PRESETS } from './planCapabilities'

// ══════════════════════════════════════════════════════════
// TAB: LÍMITES DEL PLAN
// ══════════════════════════════════════════════════════════
export default function TabLimites({ planes, negocios = [], actualizarPlan, toast }) {
  const [activePlan, setActivePlan] = useState(planes[0]?.id || '')
  const [localForm, setLocalForm]   = useState({})
  const [pendingPreset, setPendingPreset] = useState(null)

  useEffect(() => {
    // Sincroniza el selector cuando la consulta asíncrona entrega los planes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!activePlan && planes[0]?.id) setActivePlan(planes[0].id)
    if (activePlan && planes.length && !planes.some(p => p.id === activePlan)) setActivePlan(planes[0].id)
  }, [activePlan, planes])

  useEffect(() => {
    const plan = planes.find(p => p.id === activePlan) || {}
    // El formulario es un borrador editable deliberadamente separado del query cache.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalForm({ maxUsuarios:1, maxProductos:100, maxAlmacenes:1, maxProveedores:10, maxClientes:20, maxOrdenesMes:50, almacenamientoGB:1, soporte:'email', apiAccess:false, multiEmpresa:false, exportAvanzada:false, reportesAvanzados:false, modulosIncluidos:[], ...plan })
  }, [activePlan, planes])

  async function save() {
    const invalidLimit = ['maxUsuarios', 'maxProductos', 'maxAlmacenes', 'maxProveedores', 'maxClientes', 'maxOrdenesMes']
      .find(key => Number(localForm[key]) < -1)
    if (invalidLimit) { toast('Los límites solo aceptan -1 (ilimitado) o valores desde 0.', 'error'); return }
    if (Number(localForm.almacenamientoGB) < 0) { toast('El almacenamiento no puede ser negativo.', 'error'); return }
    if (!(localForm.modulosIncluidos || []).length) { toast('El plan debe incluir al menos un módulo operativo.', 'error'); return }
    if (localForm.reportesAvanzados && !(localForm.modulosIncluidos || []).includes('reportes')) {
      toast('Activa el módulo Reportes y KPIs para ofrecer reportes avanzados.', 'error'); return
    }
    const { id: _id, nombre: _n, descripcion: _d, precioMensual: _pm, precioAnual: _pa, moneda: _mo, color: _c, destacado: _dest, activo: _act, esPublico: _pub, vigenciaDias: _vd, caracteristicas: _car, createdAt: _ca, updatedAt: _ua, empresaId: _eid, ...limitFields } = localForm
    const res = await actualizarPlan.mutateAsync({ id: activePlan, ...limitFields })
    if (res?.error) { toast(res.error, 'error'); return }
    toast(`Límites del plan "${activePlan}" guardados`, 'success')
  }

  const plan = planes.find(p => p.id === activePlan)
  const moduleCount = (localForm.modulosIncluidos || []).length
  const impact = analyzePlanChange(plan, localForm, negocios)
  const s = (k, v) => setLocalForm(p => ({ ...p, [k]: v }))

  const numFields = [
    { key:'maxUsuarios',    label:'Máx. usuarios',          hint:'-1 = ilimitado', icon:<Users size={14}/> },
    { key:'maxProductos',   label:'Máx. productos',         hint:'-1 = ilimitado', icon:<Package size={14}/> },
    { key:'maxAlmacenes',   label:'Máx. almacenes',         hint:'-1 = ilimitado', icon:<Database size={14}/> },
    { key:'maxProveedores', label:'Máx. proveedores',       hint:'-1 = ilimitado', icon:<Tag size={14}/> },
    { key:'maxClientes',    label:'Máx. clientes',          hint:'-1 = ilimitado', icon:<Users size={14}/> },
    { key:'maxOrdenesMes',  label:'Máx. órdenes/mes',       hint:'-1 = ilimitado', icon:<Hash size={14}/> },
    { key:'almacenamientoGB', label:'Almacenamiento (GB)',  hint:'para archivos e imágenes', icon:<Database size={14}/> },
  ]

  const toggleFields = [
    { key:'exportAvanzada',  label:'Exportación avanzada',  desc:'PDF, Excel, CSV con reportes personalizados' },
    { key:'reportesAvanzados',label:'Reportes avanzados',   desc:'Dashboards KPI, previsión de demanda, SUNAT' },
  ]

  // Mismo vocabulario que Permiso.modulo — el eje de "tipo de negocio" del plan.
  const MODULOS = [
    { key:'inventario',  label:'Inventario y operaciones', desc:'Stock, kardex, entradas/salidas, ajustes' },
    { key:'operaciones', label:'Operaciones de almacén',   desc:'Entradas, salidas, transferencias, devoluciones' },
    { key:'compras',     label:'Compras',                  desc:'Órdenes de compra, cotizaciones, proveedores' },
    { key:'despachos',   label:'Despachos',                desc:'Clientes, despachos, pedidos internos, portal de pedidos, empaque' },
    { key:'transporte',  label:'Transporte',                desc:'Rutas, flota y mantenimiento' },
    { key:'ventas',      label:'Ventas',                    desc:'Proformas y cuentas por cobrar' },
    { key:'contable',    label:'Contable',                  desc:'SUNAT, reportes contables, financiero' },
    { key:'portal-b2b',  label:'Portal Proveedores B2B',    desc:'Acceso externo para proveedores' },
    { key:'reportes',    label:'Reportes y KPIs',           desc:'Dashboards operativos' },
    { key:'panel-auditoria', label:'Panel de Auditoría',    desc:'Bitácora, discrepancias, trazabilidad y conciliación (solo lectura) — add-on para rol Auditor' },
  ]
  function toggleModulo(key) {
    const actuales = localForm.modulosIncluidos || []
    if (!actuales.includes(key)) {
      setLocalForm(p => ({ ...p, modulosIncluidos: includeDependencies(actuales, key) }))
      return
    }
    const dependents = dependentsOf(actuales, key)
    if (dependents.length) {
      toast(`Primero desactiva los módulos dependientes: ${dependents.join(', ')}.`, 'error')
      return
    }
    setLocalForm(p => ({ ...p, modulosIncluidos: actuales.filter(m => m !== key) }))
  }

  function applyPreset() {
    if (!pendingPreset) return
    setLocalForm(current => ({ ...current, ...pendingPreset.values }))
    setPendingPreset(null)
    toast('Plantilla aplicada al borrador. Revisa el impacto antes de guardar.', 'success')
  }

  function selectPreset(preset) {
    const target = planes.find(item => item.id === preset.targetPlanId)
    if (!target) {
      toast(`No existe el plan destino “${preset.targetPlanName}”. Crea o restaura ese plan antes de usar la plantilla.`, 'error')
      return
    }
    setActivePlan(target.id)
    setPendingPreset(preset)
  }

  return (
    <div className="space-y-5">
      {/* Plan selector */}
      <div className="flex gap-2 flex-wrap">
        {planes.map(p => (
          <button key={p.id} onClick={() => setActivePlan(p.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium border transition-all ${activePlan === p.id ? 'text-[var(--text-primary)] border-opacity-40' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]'}`}
            style={activePlan === p.id ? { borderColor: p.color, background:`${p.color}15`, color: p.color } : {}}>
            {p.nombre}
          </button>
        ))}
      </div>

      {plan && <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-[var(--text-primary)]">Plantillas recomendadas por tamaño</p><p className="mt-0.5 text-xs text-[var(--text-muted)]">Cada perfil apunta a un plan registrado específico y solo modifica su borrador.</p></div><div className="flex flex-wrap gap-2">{PLAN_PRESETS.map(preset => <button key={preset.id} type="button" onClick={() => selectPreset(preset)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-left text-xs text-[var(--text-secondary)] hover:border-[var(--accent)]/30 hover:text-[var(--text-primary)]"><span className="block text-[var(--text-primary)]">{preset.nombre}</span><span className="mt-0.5 block text-[10px] text-[var(--text-muted)]">→ Plan {preset.targetPlanName}</span></button>)}</div></div>
        {pendingPreset && <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3"><div><p className="text-sm font-medium text-amber-100">Aplicar “{pendingPreset.nombre}” al Plan {pendingPreset.targetPlanName}</p><p className="text-xs text-[var(--text-secondary)]">{pendingPreset.description} Reemplazará únicamente los límites y módulos del borrador de ese plan.</p></div><div className="flex gap-2"><button type="button" onClick={() => setPendingPreset(null)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-secondary)]">Cancelar</button><button type="button" onClick={applyPreset} className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-semibold text-[#2b1a00]">Aplicar a {pendingPreset.targetPlanName}</button></div></div>}
      </div>}

      {plan && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)]">
            <div className="w-3 h-3 rounded-full" style={{ background: plan.color }} />
            <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">Plan {plan.nombre}</h3>
            <span className="text-[12px] text-[var(--text-muted)]">{plan.descripcion}</span>
            <span className="ml-auto rounded-full border border-[var(--accent)]/20 bg-[var(--accent-dim)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent)]">{moduleCount} módulos incluidos</span>
          </div>

          {/* Numeric limits */}
          <div>
            <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-4">Límites cuantitativos · (-1 = ilimitado)</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {numFields.map(field => (
                <Field key={field.key} label={field.label} hint={field.hint}>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">{field.icon}</span>
                    <Input type="number" className="pl-8" value={localForm[field.key]??''} onChange={e => s(field.key, parseInt(e.target.value)||0)} />
                  </div>
                </Field>
              ))}
              <Field label="Tipo de soporte">
                <Select value={localForm.soporte||'email'} onChange={e => s('soporte',e.target.value)}>
                  <option value="email">Email</option>
                  <option value="prioritario">Prioritario</option>
                  <option value="24/7">24/7 dedicado</option>
                </Select>
              </Field>
            </div>
          </div>

          {/* Toggle features */}
          <div>
            <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-4">Funcionalidades incluidas</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {toggleFields.map(field => (
                <div key={field.key} className="flex items-center justify-between p-4 bg-[var(--bg-muted)] rounded-lg border border-[var(--border)]">
                  <div>
                    <div className="text-[13px] font-medium text-[var(--text-primary)]">{field.label}</div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{field.desc}</div>
                  </div>
                  <Toggle value={!!localForm[field.key]} onChange={v => s(field.key, v)} />
                </div>
              ))}
            </div>
          </div>

          {/* Módulos incluidos — eje de "tipo de negocio", independiente de la escala */}
          <div>
            <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-4">Módulos incluidos · qué partes del sistema ve este plan</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {MODULOS.map(m => {
                const activo = (localForm.modulosIncluidos || []).includes(m.key)
                return (
                  <button key={m.key} type="button" onClick={() => toggleModulo(m.key)}
                    className={`text-left p-3.5 rounded-lg border transition-all ${activo ? 'border-[var(--accent)]/40 bg-[var(--accent-dim)]' : 'border-[var(--border)] bg-[var(--bg-muted)] hover:bg-[var(--bg-muted)]'}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${activo ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border-strong)]'}`}>
                        {activo && <CheckCircle size={11} className="text-[var(--bg-base)]" />}
                      </div>
                      <span className="text-[13px] font-medium text-[var(--text-primary)]">{m.label}</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1 ml-6">{m.desc}</p>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-[var(--border)]">
            {(impact.removedModules.length > 0 || impact.loweredLimits.length > 0) && <div className="mr-auto max-w-2xl rounded-lg border border-amber-500/20 bg-amber-500/5 p-3"><p className="text-xs font-semibold text-amber-200">Impacto antes de guardar · {impact.affectedBusinesses.length} negocio(s) usan este plan</p><p className="mt-1 text-[11px] text-[var(--text-secondary)]">{impact.removedModules.length ? `Se retirarán módulos: ${impact.removedModules.join(', ')}. ` : ''}{impact.loweredLimits.length ? `Se reducen límites: ${impact.loweredLimits.join(', ')}. No se eliminarán datos existentes; el enforcement deberá impedir nuevas altas sobre el límite.` : ''}</p></div>}
            <Btn variant="primary" onClick={save}><Save size={14}/>Guardar límites del plan {plan.nombre}</Btn>
          </div>
        </div>
      )}

      {planes.length === 0 && <Alert variant="info">Primero crea al menos un plan en la pestaña "Planes y Precios".</Alert>}
    </div>
  )
}
