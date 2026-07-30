import { Field } from '../../components/ui/index'
import { MONEDAS, SI, SEL } from './constants'

export default function TabSistema({ form, f }) {
  return (
    <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
      <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">Configuración del Sistema</div>
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Moneda">
          <select className={SEL} value={form.moneda} onChange={e => {
            const m = MONEDAS.find(x => x.code === e.target.value)
            f('moneda', e.target.value); f('simboloMoneda', m?.simbolo || 'S/')
          }}>
            {MONEDAS.map(m => <option key={m.code} value={m.code}>{m.simbolo} — {m.nombre}</option>)}
          </select>
        </Field>
        <Field label="Símbolo de Moneda">
          <input className={SI} value={form.simboloMoneda} onChange={e => f('simboloMoneda', e.target.value)} placeholder="S/" />
        </Field>
        <Field label="Serie Órdenes de Compra" hint="Prefijo para N° de OC. Ej: OC-001-0001">
          <input className={SI} value={form.serieOC || 'OC'} onChange={e => f('serieOC', e.target.value)} />
        </Field>
        <Field label="Serie Movimientos" hint="Prefijo para movimientos de stock">
          <input className={SI} value={form.serieMov || 'MOV'} onChange={e => f('serieMov', e.target.value)} />
        </Field>
      </div>
    </div>
  )
}
