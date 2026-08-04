/**
 * Línea de tiempo horizontal genérica — usada por TrazabilidadPedidos.jsx
 * (despachos/OC/pedidos internos) y por el detalle de Pedidos Internos.
 * `flujo`: [{ id, label, desc?, color, icon }] en orden. `flujoCancelado`:
 * paso(s) terminales alternativos (ej. Rechazado) que se agregan al final
 * cuando `cancelado` es true, en vez de continuar el flujo normal.
 */
export function LineaTiempo({ flujo, flujoCancelado, estadoActual, cancelado }) {
  const flujoEfectivo = cancelado ? [...flujo, ...flujoCancelado] : flujo

  const idxActual = flujoEfectivo.findIndex(s => s.id === estadoActual)

  return (
    <div className="flex items-start gap-0 mt-4 mb-1 overflow-x-auto pb-1">
      {flujoEfectivo.map((paso, i) => {
        const done    = i < idxActual
        const current = i === idxActual
        const color   = current ? paso.color : done ? paso.color : '#3d4f60'

        return (
          <div key={paso.id} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-1 min-w-[64px]">
              {/* Círculo */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[14px] transition-all relative
                ${current ? 'shadow-lg' : ''}`}
                style={{
                  background: current ? `${paso.color}25` : done ? `${paso.color}15` : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${current ? paso.color : done ? `${paso.color}60` : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: current ? `0 0 12px ${paso.color}50` : 'none',
                }}>
                <span className={`${!done && !current ? 'opacity-30' : ''} text-[13px]`}>
                  {done ? '✓' : paso.icon}
                </span>
                {current && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0e1117]"
                    style={{background: paso.color}}/>
                )}
              </div>
              {/* Etiqueta */}
              <div className={`text-[10px] font-semibold mt-1.5 text-center leading-tight ${
                current ? 'text-white' : done ? '' : 'text-white/20'
              }`}
                style={{ color: current || done ? color : undefined }}>
                {paso.label}
              </div>
              {current && paso.desc && (
                <div className="text-[9px] text-white/40 text-center mt-0.5 max-w-[72px] leading-tight">{paso.desc}</div>
              )}
            </div>
            {/* Línea conectora */}
            {i < flujoEfectivo.length - 1 && (
              <div className="h-[2px] flex-1 mx-0.5 rounded transition-all" style={{
                background: done ? `linear-gradient(90deg, ${paso.color}60, ${flujoEfectivo[i+1].color}40)` : 'rgba(255,255,255,0.06)',
                minWidth: 16,
              }}/>
            )}
          </div>
        )
      })}
    </div>
  )
}
