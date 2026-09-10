import { useState, useEffect } from 'react'
import { Users, Package, Database, Tag, Hash, CheckCircle, Save, AlertTriangle } from 'lucide-react'
import { Field, Alert, Btn, Input, ConfirmDialog } from '../../components/ui/index'
import { analyzePlanChange, dependentsOf, includeDependencies, PLAN_PRESETS, PLAN_MODULES } from './planCapabilities'

// ══════════════════════════════════════════════════════════
// TAB: LÍMITES DEL PLAN
// ══════════════════════════════════════════════════════════

// Valores base para planes viejos que no tengan alguna columna todavía.
const LIMITES_DEFAULT = {
  maxUsuarios: 1, maxProductos: 100, maxAlmacenes: 1, maxProveedores: 10, maxClientes: 20,
  maxOrdenesMes: 50,
  modulosIncluidos: [],
}
// Topes numéricos que aceptan -1 (ilimitado).
const NUM_KEYS = ['maxUsuarios', 'maxProductos', 'maxAlmacenes', 'maxProveedores', 'maxClientes', 'maxOrdenesMes']
// Campos de plan que NO se gestionan en este panel — se descartan antes del PUT:
//  - apiAccess/multiEmpresa/exportAvanzada/reportesAvanzados: flags sin enforcement (quitados).
//  - soporte: es atributo comercial del plan → se edita en "Planes y Precios" (brochure).
//  - almacenamientoGB: sin cuota real de archivos, se quitó del panel.
// El eje real de alcance funcional son los módulos incluidos.
const NO_LIMITE = new Set(['id', 'nombre', 'descripcion', 'precioMensual', 'precioAnual', 'moneda', 'color',
  'destacado', 'activo', 'esPublico', 'vigenciaDias', 'caracteristicas', 'createdAt', 'updatedAt', 'empresaId',
  'apiAccess', 'multiEmpresa', 'exportAvanzada', 'reportesAvanzados', 'soporte', 'almacenamientoGB'])

export default function TabLimites({ planes, negocios = [], actualizarPlan, toast }) {
  const [activePlan, setActivePlan] = useState(planes[0]?.id || '')
  const [localForm, setLocalForm]   = useState({ ...LIMITES_DEFAULT })
  const [dirty, setDirty]           = useState(false)   // el borrador tiene cambios sin guardar
  const [pendingPreset, setPendingPreset] = useState(null)
  const [confirmSwitch, setConfirmSwitch] = useState(null) // id del plan al que se quiere cambiar descartando el borrador

  // Alinea el plan activo cuando la query entrega/actualiza la lista.
  useEffect(() => {
    if (!activePlan && planes[0]?.id) setActivePlan(planes[0].id)
    else if (activePlan && planes.length && !planes.some(p => p.id === activePlan)) setActivePlan(planes[0].id)
  }, [activePlan, planes])

  // Re-siembra el borrador SOLO al cambiar de plan — nunca en un refetch de
  // `planes`. Antes el efecto dependía de `planes` y cualquier refetch (guardar
  // otro plan, volver a la pestaña, foco de ventana) pisaba el borrador en curso.
  useEffect(() => {
    const plan = planes.find(p => p.id === activePlan) || {}
    setLocalForm({ ...LIMITES_DEFAULT, ...plan })
    setDirty(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlan])

  const plan = planes.find(p => p.id === activePlan)
  const moduleCount = (localForm.modulosIncluidos || []).length
  const impact = analyzePlanChange(plan, localForm, negocios)
  const s = (k, v) => { setDirty(true); setLocalForm(p => ({ ...p, [k]: v })) }

  async function save() {
    for (const k of NUM_KEYS) {
      const v = Number(localForm[k])
      if (!Number.isInteger(v) || v < -1) {
        toast('Los topes solo aceptan -1 (ilimitado) o un entero ≥ 0.', 'error'); return
      }
    }
    if (!(localForm.modulosIncluidos || []).length) { toast('El plan debe incluir al menos un módulo operativo.', 'error'); return }

    // Solo campos de límite, con los numéricos ya normalizados a Number.
    const payload = {}
    for (const [k, v] of Object.entries(localForm)) if (!NO_LIMITE.has(k)) payload[k] = v
    for (const k of NUM_KEYS) payload[k] = Number(localForm[k]) || 0

    const res = await actualizarPlan.mutateAsync({ id: activePlan, ...payload })
    if (res?.error) { toast(res.error, 'error'); return }
    setDirty(false)
    toast(`Límites del plan "${plan?.nombre || activePlan}" guardados`, 'success')
  }

  const numFields = [
    { key:'maxUsuarios',    label:'Máx. usuarios',    icon:<Users size={14}/> },
    { key:'maxProductos',   label:'Máx. productos',   icon:<Package size={14}/> },
    { key:'maxAlmacenes',   label:'Máx. almacenes',   icon:<Database size={14}/> },
    { key:'maxProveedores', label:'Máx. proveedores', icon:<Tag size={14}/> },
    { key:'maxClientes',    label:'Máx. clientes',    icon:<Users size={14}/> },
    { key:'maxOrdenesMes',  label:'Máx. órdenes/mes', icon:<Hash size={14}/> },
  ]

  function toggleModulo(key) {
    const actuales = localForm.modulosIncluidos || []
    if (!actuales.includes(key)) { s('modulosIncluidos', includeDependencies(actuales, key)); return }
    const dependents = dependentsOf(actuales, key)
    if (dependents.length) {
      toast(`Primero desactiva los módulos dependientes: ${dependents.join(', ')}.`, 'error')
      return
    }
    s('modulosIncluidos', actuales.filter(m => m !== key))
  }

  function pickPlan(id) {
    if (id === activePlan) return
    if (dirty) { setConfirmSwitch(id); return }
    setActivePlan(id)
  }

  function applyPreset() {
    if (!pendingPreset) return
    setLocalForm(current => ({ ...current, ...pendingPreset.values }))
    setDirty(true)
    setPendingPreset(null)
    toast('Plantilla aplicada al borrador. Revisa el impacto antes de guardar.', 'success')
  }

  function selectPreset(preset) {
    const target = planes.find(item => item.id === preset.targetPlanId)
    if (!target) {
      toast(`No existe el plan destino “${preset.targetPlanName}”. Crea o restaura ese plan antes de usar la plantilla.`, 'error')
      return
    }
    if (dirty && target.id !== activePlan) {
      toast('Guarda o descarta los cambios del plan actual antes de aplicar una plantilla.', 'error')
      return
    }
    setActivePlan(target.id)
    setPendingPreset(preset)
  }

  return (
    <div className="space-y-5">
      {/* Selector de plan */}
      <div className="flex gap-2 flex-wrap">
        {planes.map(p => (
          <button key={p.id} onClick={() => pickPlan(p.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium border transition-all ${activePlan === p.id ? 'text-[var(--text-primary)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]'}`}
            style={activePlan === p.id ? { borderColor: p.color, background: `${p.color}15`, color: p.color } : {}}>
            {p.nombre}
          </button>
        ))}
      </div>

      {/* Plantillas recomendadas */}
      {plan && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Plantillas recomendadas por tamaño</p>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">Cada perfil apunta a un plan registrado y solo modifica su borrador.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {PLAN_PRESETS.map(preset => (
                <button key={preset.id} type="button" onClick={() => selectPreset(preset)}
                  className="rounded-lg border border-[var(--border)] px-3 py-2 text-left text-xs text-[var(--text-secondary)] hover:border-[var(--accent)]/30 hover:text-[var(--text-primary)]">
                  <span className="block text-[var(--text-primary)]">{preset.nombre}</span>
                  <span className="mt-0.5 block text-[10px] text-[var(--text-muted)]">→ Plan {preset.targetPlanName}</span>
                </button>
              ))}
            </div>
          </div>

          {pendingPreset && (
            <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <div>
                <p className="text-sm font-medium text-amber-100">Aplicar “{pendingPreset.nombre}” al Plan {pendingPreset.targetPlanName}</p>
                <p className="text-xs text-[var(--text-secondary)]">{pendingPreset.description} Reemplazará únicamente los límites y módulos del borrador de ese plan.</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPendingPreset(null)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-secondary)]">Cancelar</button>
                <button type="button" onClick={applyPreset} className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-semibold text-[#2b1a00]">Aplicar a {pendingPreset.targetPlanName}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {plan && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)]">
            <div className="w-3 h-3 rounded-full" style={{ background: plan.color }} />
            <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">Plan {plan.nombre}</h3>
            <span className="text-[12px] text-[var(--text-muted)]">{plan.descripcion}</span>
            {dirty && <span className="text-[11px] font-semibold text-amber-400">· cambios sin guardar</span>}
            <span className="ml-auto rounded-full border border-[var(--accent)]/20 bg-[var(--accent-dim)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent)]">{moduleCount} módulos incluidos</span>
          </div>

          {/* Topes cuantitativos */}
          <div>
            <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">Topes cuantitativos</p>
            <p className="text-[11px] text-[var(--text-muted)] mb-4">Activa <span className="font-semibold">∞</span> para dejar un tope sin límite.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {numFields.map(field => {
                const ilimitado = Number(localForm[field.key]) === -1
                return (
                  <Field key={field.key} label={field.label}>
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1 min-w-0">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">{field.icon}</span>
                        <Input type="number" min="0"
                          className={`pl-8 ${ilimitado ? 'opacity-50' : ''}`}
                          value={ilimitado ? '' : (localForm[field.key] ?? '')}
                          disabled={ilimitado}
                          placeholder={ilimitado ? 'Ilimitado' : ''}
                          onChange={e => { const r = e.target.value; s(field.key, r === '' ? '' : Math.max(0, parseInt(r, 10) || 0)) }} />
                      </div>
                      <button type="button" title="Alternar ilimitado"
                        onClick={() => s(field.key, ilimitado ? LIMITES_DEFAULT[field.key] : -1)}
                        className={`shrink-0 px-2 py-2 rounded-md text-[12px] font-semibold border transition-colors ${ilimitado ? 'border-[var(--accent)]/40 bg-[var(--accent-dim)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
                        ∞
                      </button>
                    </div>
                  </Field>
                )
              })}
            </div>
          </div>

          {/* Módulos incluidos — eje de "tipo de negocio", independiente de la escala */}
          <div>
            <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-4">Módulos incluidos · qué partes del sistema ve este plan</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PLAN_MODULES.map(m => {
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

          {/* Impacto del cambio */}
          {(impact.removedModules.length > 0 || impact.loweredLimits.length > 0) && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-xs font-semibold text-amber-200 flex items-center gap-1.5">
                <AlertTriangle size={13} /> Impacto antes de guardar · {impact.affectedBusinesses.length} negocio(s) usan este plan
              </p>
              <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                {impact.removedModules.length ? `Se retirarán módulos: ${impact.removedModules.join(', ')}. ` : ''}
                {impact.loweredLimits.length ? `Se reducen topes: ${impact.loweredLimits.join(', ')}. No se eliminan datos existentes; el enforcement impedirá nuevas altas por encima del tope.` : ''}
              </p>
              {impact.affectedBusinesses.length > 0 && (
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">{impact.affectedBusinesses.map(b => b.nombre).filter(Boolean).join(', ')}</p>
              )}
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-[var(--border)]">
            <Btn variant="primary" onClick={save} disabled={!dirty || actualizarPlan.isPending}>
              <Save size={14}/>Guardar límites del plan {plan.nombre}
            </Btn>
          </div>
        </div>
      )}

      {planes.length === 0 && <Alert variant="info">Primero crea al menos un plan en la pestaña "Planes y Precios".</Alert>}

      <ConfirmDialog open={!!confirmSwitch} onClose={() => setConfirmSwitch(null)}
        onConfirm={() => setActivePlan(confirmSwitch)}
        danger title="Descartar cambios sin guardar"
        message={`El borrador del plan "${plan?.nombre || activePlan}" tiene cambios sin guardar. Si cambias de plan se perderán. ¿Continuar?`} />
    </div>
  )
}
