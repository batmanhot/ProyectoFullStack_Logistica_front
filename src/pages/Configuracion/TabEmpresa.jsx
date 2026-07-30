import { Field } from '../../components/ui/index'
import { SI } from './constants'

export default function TabEmpresa({ form, f, tenantId, sesion }) {
  return (
    <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Datos de la Empresa</div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#5f6f80] font-mono">org: {tenantId}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${sesion?.plan === 'pro' ? 'bg-[#00c896]/15 text-[#00c896]' : 'bg-blue-500/15 text-blue-400'}`}>
            {sesion?.plan || 'starter'}
          </span>
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

        <div className="mt-2 pt-4 border-t border-white/8">
          <div className="text-[11px] font-bold text-[#5f6f80] uppercase tracking-[0.08em] mb-3">Alertas automáticas</div>
          <div className="grid grid-cols-2 gap-3.5">
            <Field label="WhatsApp responsable (con código país)">
              <input className={SI} value={form.whatsappResponsable||''} onChange={e=>f('whatsappResponsable',e.target.value)} placeholder="51999888777"/>
            </Field>
            <Field label="Email responsable de alertas">
              <input type="email" className={SI} value={form.emailResponsable||''} onChange={e=>f('emailResponsable',e.target.value)} placeholder="compras@empresa.pe"/>
            </Field>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer mt-3 px-3.5 py-3 bg-[#1a2230] rounded-xl border border-white/7 hover:border-white/12 transition-colors">
            <input type="checkbox" checked={!!form.alertasAutoWhatsApp} onChange={e=>f('alertasAutoWhatsApp',e.target.checked)} className="accent-[#00c896] w-4 h-4"/>
            <div>
              <div className="text-[13px] font-medium text-[#e8edf2]">Activar alertas automáticas por WhatsApp</div>
              <div className="text-[11px] text-[#5f6f80] mt-0.5">Cuando haya stock agotado o crítico, el sistema abrirá WhatsApp con el mensaje pre-llenado al número del responsable.</div>
            </div>
          </label>
        </div>
      </div>
    </div>
  )
}
