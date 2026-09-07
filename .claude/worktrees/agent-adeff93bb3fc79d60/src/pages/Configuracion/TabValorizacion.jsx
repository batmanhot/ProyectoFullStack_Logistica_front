import { Badge } from '../../components/ui/index'
import { FORMULAS_VALORIZACION } from '../../utils/valorizacion'

export default function TabValorizacion({ form, f }) {
  return (
    <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Método de Valorización de Stock</span>
        <Badge variant="teal">Activo: {form.formulaValorizacion}</Badge>
      </div>

      <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg border border-blue-500/25 bg-blue-500/10 text-blue-300 text-[13px] mb-4 leading-snug">
        <span>El método seleccionado se aplica a <b>todas las salidas</b> y al cálculo del valor del stock en dashboards y reportes.
        En Perú, el método más usado y aceptado por SUNAT es el <b>PMP</b>.</span>
      </div>

      <div className="flex flex-col gap-3">
        {FORMULAS_VALORIZACION.map(formula => {
          const activo = form.formulaValorizacion === formula.id
          return (
            <div key={formula.id} onClick={() => f('formulaValorizacion', formula.id)}
              className={`rounded-xl p-5 cursor-pointer transition-all border ${activo ? 'bg-[#00c896]/10 border-[#00c896]' : 'bg-[#1a2230] border-white/8 hover:border-white/20'}`}>
              <div className="flex items-center gap-3 mb-2">
                {/* Radio */}
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${activo ? 'border-[#00c896] bg-[#00c896]' : 'border-white/20 bg-transparent'}`}>
                  {activo && <div className="w-2 h-2 rounded-full bg-[#082e1e]" />}
                </div>
                <div>
                  <div className={`font-semibold text-[15px] ${activo ? 'text-[#00c896]' : 'text-[#e8edf2]'}`}>{formula.nombre}</div>
                  <div className="text-[12px] text-[#5f6f80]">Alias: {formula.alias}</div>
                </div>
                {formula.recomendado && <Badge variant="teal" className="ml-auto">Recomendado Perú</Badge>}
              </div>

              <p className="text-[13px] text-[#9ba8b6] leading-relaxed ml-8">{formula.desc}</p>

              {formula.id === 'PMP' && (
                <div className="ml-8 mt-3 px-4 py-3 bg-[#0e1117] rounded-lg">
                  <div className="text-[11px] font-semibold text-[#00c896] mb-1.5 uppercase tracking-wide">Fórmula:</div>
                  <code className="text-[13px] text-[#e8edf2] font-mono">PMP = Σ(cantidad × costo) / Σ(cantidad)</code>
                  <div className="text-[12px] text-[#5f6f80] mt-1.5">Se recalcula automáticamente en cada entrada de mercadería.</div>
                </div>
              )}
              {formula.id === 'FIFO' && (
                <div className="ml-8 mt-3 px-4 py-3 bg-[#0e1117] rounded-lg">
                  <div className="text-[11px] font-semibold text-blue-400 mb-1 uppercase tracking-wide">Lógica PEPS:</div>
                  <div className="text-[12px] text-[#9ba8b6]">El lote más antiguo se consume primero. Ideal para productos con vencimiento.</div>
                </div>
              )}
              {formula.id === 'LIFO' && (
                <div className="ml-8 mt-3 px-4 py-3 bg-[#0e1117] rounded-lg">
                  <div className="text-[11px] font-semibold text-[#5f6f80] mb-1 uppercase tracking-wide">Nota:</div>
                  <div className="text-[12px] text-[#9ba8b6]">El lote más reciente se consume primero. Poco común en Perú. No recomendado por las NIIF.</div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
