import { Building2, ArrowRight } from 'lucide-react'
import { PlanCard } from './PlanCard'

export function PlanesYPrecios({ primary, planes, ciclo, setCiclo, navigate, goSection, contacto, onPremise }) {
  return (
    <section id="planes" className="py-24 px-6 bg-[#111820]">
      <div className="max-w-6xl mx-auto">

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border mb-5"
               style={{ color: primary, borderColor: `${primary}40`, background: `${primary}10` }}>
            Planes y Precios
          </div>
          <h2 className="text-[38px] md:text-[48px] font-extrabold text-[#e8edf2] mb-4 leading-tight">
            El plan perfecto<br/>
            <span className="text-[#7a8a99]">para cada empresa</span>
          </h2>
          <p className="text-[16px] text-[#7a8a99] mb-8">
            Sin contratos de permanencia. Sin costos ocultos. Cambia de plan cuando necesites.
          </p>

          <div className="inline-flex items-center bg-[#141920] border border-white/8 rounded-xl p-1">
            <button
              onClick={() => setCiclo('mensual')}
              className={`px-6 py-2.5 rounded-lg text-[13px] font-semibold transition-all ${
                ciclo === 'mensual' ? 'bg-white/10 text-[#e8edf2] shadow-sm' : 'text-[#7a8a99] hover:text-white'
              }`}>
              Mensual
            </button>
            <button
              onClick={() => setCiclo('anual')}
              className={`px-6 py-2.5 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-2 ${
                ciclo === 'anual' ? 'bg-white/10 text-[#e8edf2] shadow-sm' : 'text-[#7a8a99] hover:text-white'
              }`}>
              Anual
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold"
                    style={{ background: `${primary}25`, color: primary }}>
                -20%
              </span>
            </button>
          </div>
        </div>

        <div className={`grid gap-5 ${
          planes.length <= 2
            ? 'grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto'
            : planes.length === 3
              ? 'grid-cols-1 md:grid-cols-3'
              : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
        }`}>
          {planes.map(plan => (
            <PlanCard key={plan.id} plan={plan} ciclo={ciclo} primary={primary}
                      navigate={navigate} whatsapp={contacto?.whatsapp}/>
          ))}
        </div>

        <p className="text-center text-[13px] text-[#5f6f80] mt-8">
          Precios en {planes[0]?.moneda || 'PEN'}. ¿Necesitas un plan a medida o para más de 10 empresas?{' '}
          <button onClick={() => goSection('contacto')}
            className="font-semibold transition-colors hover:opacity-80"
            style={{ color: primary }}>
            Hablemos →
          </button>
        </p>

        {/* On-Premise — sin precio fijo, se cotiza según el tipo de negocio.
            No es un PlanSaaS del backend (ese catálogo es de suscripción
            cloud con límites numéricos) — es una tarjeta aparte, editable
            desde SuperAdmin → Landing Page → On-Premise. */}
        {onPremise?.activo && (
          <div className="mt-8 rounded-2xl border p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6"
               style={{ borderColor: `${primary}30`, background: `linear-gradient(120deg, ${primary}08 0%, transparent 60%)` }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                 style={{ background: `${primary}15` }}>
              <Building2 size={26} style={{ color: primary }}/>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <h3 className="text-[18px] font-extrabold text-[#e8edf2]">{onPremise.nombre || 'On-Premise'}</h3>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                      style={{ color: primary, background: `${primary}15` }}>Precio a medida</span>
              </div>
              <p className="text-[13px] text-[#8a9ab0] leading-relaxed mb-3">{onPremise.descripcion}</p>
              {(onPremise.caracteristicas?.length > 0) && (
                <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] text-[#9ba8b6]">
                  {onPremise.caracteristicas.map((c, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full" style={{ background: primary }}/>{c}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button onClick={() => goSection('contacto')}
              className="shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-bold transition-all hover:opacity-90 w-full sm:w-auto justify-center"
              style={{ background: primary, color: '#082e1e', boxShadow: `0 6px 24px ${primary}40` }}>
              {onPremise.ctaTexto || 'Conversemos'} <ArrowRight size={15}/>
            </button>
          </div>
        )}

        {/* Tabla comparativa */}
        <div className="mt-12 bg-[#141920] border border-white/7 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/7 flex items-center gap-2">
            <span className="text-[14px]">📊</span>
            <h3 className="text-[14px] font-bold text-[#e8edf2]">Comparativa de límites operativos por plan</h3>
            <span className="ml-2 text-[11px] text-[#5f6f80]">— El plan elegido define tus capacidades operativas</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-white/6">
                  <th className="text-left px-6 py-3 text-[#5f6f80] font-semibold">Recurso</th>
                  {planes.map(p => (
                    <th key={p.id} className="px-4 py-3 text-center font-bold" style={{ color: p.color }}>
                      {p.nombre}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: '👤 Usuarios',      key: 'maxUsuarios'    },
                  { label: '📦 Productos',      key: 'maxProductos'   },
                  { label: '🏭 Almacenes',      key: 'maxAlmacenes'   },
                  { label: '🤝 Proveedores',    key: 'maxProveedores' },
                  { label: '👥 Clientes',       key: 'maxClientes'    },
                  { label: '📋 Órdenes/mes',    key: 'maxOrdenesMes'  },
                ].map(({ label, key }, ri) => {
                  return (
                    <tr key={key} className={`border-b border-white/4 ${ri % 2 === 0 ? 'bg-white/1' : ''}`}>
                      <td className="px-6 py-2.5 text-[#9ba8b6] font-medium">{label}</td>
                      {planes.map(p => {
                        const val = p[key]
                        const txt = val === -1 || val === undefined ? '∞ Ilimitado' : val?.toLocaleString() || '—'
                        const isMax = val === -1
                        return (
                          <td key={p.id} className="px-4 py-2.5 text-center font-bold">
                            <span style={{ color: isMax ? primary : p.color }}>{txt}</span>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 bg-white/1 border-t border-white/6 flex items-center gap-2 text-[11px] text-[#5f6f80]">
            <span>💡</span>
            <span>Puedes cambiar de plan en cualquier momento. Los límites se ajustan de inmediato sin perder tus datos.</span>
          </div>
        </div>
      </div>
    </section>
  )
}
