import { CheckCircle, FileText, Calendar, Wrench } from 'lucide-react'
import { formatDate } from '../../utils/helpers'
import { Badge } from '../../components/ui/index'
import { toDateStr, estadoVenc } from './constants'

// ════════════════════════════════════════════════════════
// TAB ALERTAS
// ════════════════════════════════════════════════════════
export default function TabAlertas({ alertas }) {
  return (
    <div className="flex flex-col gap-4">
      {alertas.length === 0 ? (
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-10 flex flex-col items-center gap-3">
          <CheckCircle size={40} className="text-green-400 opacity-40"/>
          <div className="text-center">
            <p className="text-[14px] font-semibold text-[#9ba8b6]">Todo en orden</p>
            <p className="text-[12px] text-[#5f6f80] mt-1">No hay vencimientos próximos en los próximos 60 días</p>
          </div>
        </div>
      ) : alertas.map((a, i) => {
        const est = estadoVenc(a.dias)
        return (
          <div key={i} className="bg-[#161d28] border rounded-xl p-4 flex items-center gap-4"
            style={{ borderColor: est.color + '33' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: est.color + '18' }}>
              {a.tipo === 'SOAT'             ? <FileText size={18} style={{ color: est.color }}/> :
               a.tipo === 'Revisión Técnica' ? <Calendar size={18} style={{ color: est.color }}/> :
               <Wrench size={18} style={{ color: est.color }}/>}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-[#e8edf2]">{a.tipo}</span>
                <Badge variant={est.badge}>{est.label}</Badge>
              </div>
              <div className="text-[12px] text-[#9ba8b6]">
                {a.unidad} · <span className="font-mono">{a.placa}</span>
              </div>
              <div className="text-[11px] text-[#5f6f80] mt-0.5">
                Fecha: {formatDate(toDateStr(a.fecha))} ·
                <span className="font-semibold ml-1" style={{ color: est.color }}>
                  {a.dias < 0 ? `Vencido hace ${Math.abs(a.dias)} días` : `Vence en ${a.dias} días`}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
