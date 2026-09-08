import { Field } from '../../components/ui/index'
import { SI } from './constants'
import { PLAN_META } from '../../config/constants'

export default function TabEmpresa({ form, f, tenantId, sesion }) {
  const planMeta = PLAN_META[sesion?.plan]
  return (
    <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Datos de la Empresa</div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#5f6f80] font-mono">org: {tenantId}</span>
          {planMeta && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ color: planMeta.color, background: `${planMeta.color}26` }}>
              {planMeta.label}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3.5">
        <Field label="Razón Social / Nombre de Empresa">
          <input className={SI} value={form.empresa} onChange={e => f('empresa', e.target.value)} placeholder="Mi Empresa S.A.C." />
        </Field>
        <div className="grid grid-cols-2 gap-3.5">
          <Field label="RUC">
            <input className={SI} value={form.ruc} onChange={e => f('ruc', e.target.value)} placeholder="20000000001" maxLength={11} />
          </Field>
          <Field label="Teléfono">
            <input className={SI} value={form.telefono || ''} onChange={e => f('telefono', e.target.value)} placeholder="01-2345678" />
          </Field>
        </div>
        <Field label="Dirección">
          <input className={SI} value={form.direccion || ''} onChange={e => f('direccion', e.target.value)} placeholder="Av. Principal 123, Lima" />
        </Field>
        <Field label="Email">
          <input type="email" className={SI} value={form.email || ''} onChange={e => f('email', e.target.value)} placeholder="contacto@empresa.pe" />
        </Field>

        <p className="text-[11px] text-[#5f6f80] leading-relaxed mt-1">
          Estos datos se usan únicamente como encabezado de los documentos que genera el sistema
          (guías, órdenes de compra, cotizaciones, proformas, hoja de reparto, vale de salida) y en los
          reportes de Contabilidad. La gestión de la cuenta (plan, vencimiento, estado) vive en el panel de administración.
        </p>
      </div>
    </div>
  )
}
