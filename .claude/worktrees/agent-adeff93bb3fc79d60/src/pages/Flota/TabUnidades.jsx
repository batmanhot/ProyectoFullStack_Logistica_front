import { Truck, Plus, Edit2, Trash2, Wrench } from 'lucide-react'
import { formatDate } from '../../utils/helpers'
import { EmptyState, Badge, Btn } from '../../components/ui/index'
import { toDateStr, diasHasta, estadoVenc } from './constants'

// ════════════════════════════════════════════════════════
// TAB UNIDADES
// ════════════════════════════════════════════════════════
export default function TabUnidades({ flota, ultimoPorVehiculo, setEditando, setModal, setConfirmDel, setModalMant }) {
  return (
    <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Unidades de Flota</span>
        <Btn variant="primary" size="sm" onClick={() => { setEditando(null); setModal(true) }}>
          <Plus size={13}/> Nueva Unidad
        </Btn>
      </div>
      {flota.length === 0 ? (
        <EmptyState icon={Truck} title="Sin unidades registradas" description="Agrega tu primera unidad de flota."/>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {flota.map(u => {
            const dSoat = diasHasta(u.vencSoat)
            const dRevt = diasHasta(u.vencRevTecnica)
            const dMant = diasHasta(u.proxMantenimiento)
            const ultimoMant = ultimoPorVehiculo[u.id] || null
            return (
              <div key={u.id} className="bg-[#1a2230] border border-white/6 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/6">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#00c896]/10 flex items-center justify-center shrink-0">
                      <Truck size={17} className="text-[#00c896]"/>
                    </div>
                    <div>
                      <div className="font-semibold text-[#e8edf2] text-[14px]">{u.nombre}</div>
                      <div className="text-[11px] text-[#5f6f80]">{u.tipo} · <span className="font-mono text-[#9ba8b6]">{u.placa}</span></div>
                    </div>
                  </div>
                  <div className="flex gap-1 items-center">
                    <Badge variant={u.activo !== false ? 'success' : 'neutral'}>
                      {u.activo !== false ? 'Activa' : 'Inactiva'}
                    </Badge>
                    <Btn variant="ghost" size="icon" onClick={() => { setEditando(u); setModal(true) }}><Edit2 size={12}/></Btn>
                    <Btn variant="ghost" size="icon" className="text-red-400" onClick={() => setConfirmDel(u.id)}><Trash2 size={12}/></Btn>
                  </div>
                </div>

                <div className="px-4 py-3 grid grid-cols-3 gap-3 border-b border-white/6">
                  <div>
                    <div className="text-[10px] text-[#5f6f80] uppercase tracking-wide mb-0.5">Km actual</div>
                    <div className="text-[13px] font-mono font-semibold text-[#e8edf2]">{(Number(u.kmActual)||0).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#5f6f80] uppercase tracking-wide mb-0.5">Año</div>
                    <div className="text-[13px] font-semibold text-[#e8edf2]">{u.anio || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#5f6f80] uppercase tracking-wide mb-0.5">Conductor</div>
                    <div className="text-[13px] text-[#9ba8b6] truncate">{u.conductor || '—'}</div>
                  </div>
                </div>

                <div className="px-4 py-3 grid grid-cols-3 gap-2 border-b border-white/6">
                  {[
                    ['SOAT',         u.vencSoat,          estadoVenc(dSoat), dSoat],
                    ['Rev. Técnica',  u.vencRevTecnica,    estadoVenc(dRevt), dRevt],
                    ['Próx. Mant.',   u.proxMantenimiento, estadoVenc(dMant), dMant],
                  ].map(([lbl, fecha, est, dias]) => (
                    <div key={lbl} className="text-center">
                      <div className="text-[10px] text-[#5f6f80] mb-1">{lbl}</div>
                      <div className="text-[11px] font-mono text-[#9ba8b6]">{fecha ? formatDate(toDateStr(fecha)) : '—'}</div>
                      {dias !== null && (
                        <div className="text-[10px] font-semibold mt-0.5" style={{ color: est.color }}>
                          {dias < 0 ? `Vencido ${Math.abs(dias)}d` : `${dias}d`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="px-4 py-2.5 flex items-center justify-between">
                  <div className="text-[11px] text-[#5f6f80]">
                    {ultimoMant
                      ? <>Último: <span className="text-[#9ba8b6]">{ultimoMant.tipo}</span> <span className="font-mono ml-1">{formatDate(toDateStr(ultimoMant.fecha))}</span></>
                      : 'Sin mantenimientos registrados'
                    }
                  </div>
                  <Btn variant="secondary" size="sm" onClick={() => setModalMant(u)}>
                    <Wrench size={12}/> Registrar
                  </Btn>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
