import { useState, useEffect } from 'react'
import { Users, Package, Database, Tag, Hash, CheckCircle, Save } from 'lucide-react'
import { Field, Toggle, Alert, Btn } from '../../components/ui/index'

// ══════════════════════════════════════════════════════════
// TAB: LÍMITES DEL PLAN
// ══════════════════════════════════════════════════════════
export default function TabLimites({ planes, actualizarPlan, toast }) {
  const [activePlan, setActivePlan] = useState(planes[0]?.id || '')
  const [localForm, setLocalForm]   = useState({})

  useEffect(() => {
    const plan = planes.find(p => p.id === activePlan) || {}
    setLocalForm({ maxUsuarios:1, maxProductos:100, maxAlmacenes:1, maxProveedores:10, maxClientes:20, maxOrdenesMes:50, almacenamientoGB:1, soporte:'email', apiAccess:false, multiEmpresa:false, exportAvanzada:false, reportesAvanzados:false, modulosIncluidos:[], ...plan })
  }, [activePlan, planes])

  async function save() {
    const { id: _id, nombre: _n, descripcion: _d, precioMensual: _pm, precioAnual: _pa, moneda: _mo, color: _c, destacado: _dest, activo: _act, esPublico: _pub, vigenciaDias: _vd, caracteristicas: _car, createdAt: _ca, updatedAt: _ua, empresaId: _eid, ...limitFields } = localForm
    const res = await actualizarPlan.mutateAsync({ id: activePlan, ...limitFields })
    if (res?.error) { toast(res.error, 'error'); return }
    toast(`Límites del plan "${activePlan}" guardados`, 'success')
  }

  const plan = planes.find(p => p.id === activePlan)
  const inp = 'w-full px-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[13px] text-[#e8edf2] placeholder-[#5f6f80] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20'
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
    { key:'apiAccess',       label:'Acceso API',            desc:'Permite conexión vía API REST' },
    { key:'multiEmpresa',    label:'Multi-empresa',         desc:'Gestionar múltiples empresas en una cuenta' },
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
    setLocalForm(p => {
      const actuales = p.modulosIncluidos || []
      const nuevos = actuales.includes(key) ? actuales.filter(m => m !== key) : [...actuales, key]
      return { ...p, modulosIncluidos: nuevos }
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-[#e8edf2]">Límites por Plan</h2>
          <p className="text-[12px] text-[#5f6f80] mt-0.5">Configura los límites operativos de cada plan SaaS</p>
        </div>
      </div>

      {/* Plan selector */}
      <div className="flex gap-2 flex-wrap">
        {planes.map(p => (
          <button key={p.id} onClick={() => setActivePlan(p.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium border transition-all ${activePlan === p.id ? 'text-[#e8edf2] border-opacity-40' : 'border-white/8 text-[#5f6f80] hover:text-[#e8edf2] hover:bg-white/5'}`}
            style={activePlan === p.id ? { borderColor: p.color, background:`${p.color}15`, color: p.color } : {}}>
            {p.nombre}
          </button>
        ))}
      </div>

      {plan && (
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/6">
            <div className="w-3 h-3 rounded-full" style={{ background: plan.color }} />
            <h3 className="text-[15px] font-semibold text-[#e8edf2]">Plan {plan.nombre}</h3>
            <span className="text-[12px] text-[#5f6f80]">{plan.descripcion}</span>
          </div>

          {/* Numeric limits */}
          <div>
            <p className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide mb-4">Límites cuantitativos · (-1 = ilimitado)</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {numFields.map(field => (
                <Field key={field.key} label={field.label} hint={field.hint}>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5f6f80]">{field.icon}</span>
                    <input type="number" className={`${inp} pl-8`} value={localForm[field.key]??''} onChange={e => s(field.key, parseInt(e.target.value)||0)} />
                  </div>
                </Field>
              ))}
              <Field label="Tipo de soporte">
                <select className={inp} value={localForm.soporte||'email'} onChange={e => s('soporte',e.target.value)}>
                  <option value="email">Email</option>
                  <option value="prioritario">Prioritario</option>
                  <option value="24/7">24/7 dedicado</option>
                </select>
              </Field>
            </div>
          </div>

          {/* Toggle features */}
          <div>
            <p className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide mb-4">Funcionalidades incluidas</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {toggleFields.map(field => (
                <div key={field.key} className="flex items-center justify-between p-4 bg-[#1a2230] rounded-lg border border-white/6">
                  <div>
                    <div className="text-[13px] font-medium text-[#e8edf2]">{field.label}</div>
                    <div className="text-[11px] text-[#5f6f80] mt-0.5">{field.desc}</div>
                  </div>
                  <Toggle value={!!localForm[field.key]} onChange={v => s(field.key, v)} />
                </div>
              ))}
            </div>
          </div>

          {/* Módulos incluidos — eje de "tipo de negocio", independiente de la escala */}
          <div>
            <p className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide mb-4">Módulos incluidos · qué partes del sistema ve este plan</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {MODULOS.map(m => {
                const activo = (localForm.modulosIncluidos || []).includes(m.key)
                return (
                  <button key={m.key} type="button" onClick={() => toggleModulo(m.key)}
                    className={`text-left p-3.5 rounded-lg border transition-all ${activo ? 'border-[#00c896]/40 bg-[#00c896]/8' : 'border-white/6 bg-[#1a2230] hover:bg-white/5'}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${activo ? 'bg-[#00c896] border-[#00c896]' : 'border-white/20'}`}>
                        {activo && <CheckCircle size={11} className="text-[#0e1117]" />}
                      </div>
                      <span className="text-[13px] font-medium text-[#e8edf2]">{m.label}</span>
                    </div>
                    <p className="text-[11px] text-[#5f6f80] mt-1 ml-6">{m.desc}</p>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-white/6">
            <Btn variant="primary" onClick={save}><Save size={14}/>Guardar límites del plan {plan.nombre}</Btn>
          </div>
        </div>
      )}

      {planes.length === 0 && <Alert variant="info">Primero crea al menos un plan en la pestaña "Planes y Precios".</Alert>}
    </div>
  )
}
