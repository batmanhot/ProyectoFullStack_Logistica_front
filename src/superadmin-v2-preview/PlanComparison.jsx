import { Check, Minus } from 'lucide-react'
import { displayLimit, PLAN_MODULES } from '../pages/AdminSaaS/planCapabilities'

const LIMITS = [
  ['maxUsuarios','Usuarios'], ['maxProductos','Productos'], ['maxAlmacenes','Almacenes'],
  ['maxOrdenesMes','Órdenes/mes'], ['almacenamientoGB','Almacenamiento GB'],
]

export default function PlanComparison({ plans }) {
  return <section className="mb-7 overflow-hidden rounded-xl border border-white/8 bg-[#161d28]">
    <header className="border-b border-white/6 px-5 py-4"><h2 className="font-semibold">Comparación comercial</h2><p className="mt-1 text-xs text-[#9ba8b6]">Vista previa de lo que recibe cada cliente según el plan guardado.</p></header>
    <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm">
      <thead><tr className="bg-white/3"><th className="px-4 py-3 text-left text-xs text-[#5f6f80]">Capacidad</th>{plans.map(plan => <th key={plan.id} className="px-4 py-3 text-center"><span style={{ color:plan.color }}>{plan.nombre}</span>{plan.esPublico === false && <span className="ml-2 rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-[#9ba8b6]">PRIVADO</span>}</th>)}</tr></thead>
      <tbody>
        {LIMITS.map(([key,label]) => <tr key={key} className="border-t border-white/6"><th className="px-4 py-3 text-left text-xs font-medium text-[#9ba8b6]">{label}</th>{plans.map(plan => <td key={plan.id} className="px-4 py-3 text-center text-xs text-[#e8edf2]">{displayLimit(plan[key])}</td>)}</tr>)}
        <tr className="border-t border-white/8 bg-white/2"><th colSpan={plans.length + 1} className="px-4 py-2 text-left text-[10px] uppercase tracking-wide text-[#5f6f80]">Módulos visibles</th></tr>
        {PLAN_MODULES.map(module => <tr key={module.key} className="border-t border-white/6"><th className="px-4 py-3 text-left text-xs font-medium text-[#9ba8b6]">{module.short}</th>{plans.map(plan => { const enabled=(plan.modulosIncluidos||[]).includes(module.key); return <td key={plan.id} className="px-4 py-3 text-center">{enabled ? <Check aria-label="Incluido" size={15} className="mx-auto text-[#00c896]" /> : <Minus aria-label="No incluido" size={15} className="mx-auto text-[#3d4f60]" />}</td> })}</tr>)}
      </tbody>
    </table></div>
  </section>
}
