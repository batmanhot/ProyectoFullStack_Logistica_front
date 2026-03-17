import { useMemo, useState } from 'react'
import { ShoppingCart, TrendingDown, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate, estadoStock } from '../utils/helpers'
import { calcularPMP } from '../utils/valorizacion'
import { Badge, Btn, EmptyState } from '../components/ui/index'
import { useNavigate } from 'react-router-dom'
import * as storage from '../services/storage'

export default function PuntoReorden() {
  const { productos, movimientos, ordenes, categorias, recargarOrdenes, sesion, toast, simboloMoneda } = useApp()
  const nav = useNavigate()
  const [filtro, setFiltro]   = useState('criticos') // 'criticos' | 'todos'
  const [generando, setGenerando] = useState(null)

  // Calcular consumo promedio diario de los últimos 60 días por producto
  const analisis = useMemo(() => {
    const hoy     = new Date()
    const hace60  = new Date(hoy); hace60.setDate(hoy.getDate() - 60)
    const hace60s = hace60.toISOString().split('T')[0]
    const hoys    = hoy.toISOString().split('T')[0]

    return productos
      .filter(p => p.activo !== false)
      .map(p => {
        // Salidas de los últimos 60 días
        const salidasRec = movimientos.filter(m =>
          m.productoId === p.id && m.tipo === 'SALIDA' && m.fecha >= hace60s && m.fecha <= hoys
        )
        const totalSalidas60d = salidasRec.reduce((s, m) => s + m.cantidad, 0)
        const consumoDiario   = totalSalidas60d / 60
        const diasStock       = consumoDiario > 0 ? Math.floor(p.stockActual / consumoDiario) : null

        // Punto de reorden = stock mínimo + consumo de 7 días de seguridad
        const puntosReorden  = p.stockMinimo + (consumoDiario * 7)
        // Cantidad sugerida a pedir = stock máximo - stock actual
        const cantSugerida   = Math.max(0, (p.stockMaximo || p.stockMinimo * 4) - p.stockActual)

        const estadoS        = estadoStock(p.stockActual, p.stockMinimo)
        const necesitaPedido = p.stockActual <= puntosReorden
        const pmp            = calcularPMP(p.batches || [])
        const costoSugerido  = +(cantSugerida * pmp).toFixed(2)

        // ¿Ya tiene una OC pendiente?
        const ocPendiente = ordenes.some(o =>
          (o.estado === 'PENDIENTE' || o.estado === 'APROBADA') &&
          o.items?.some(i => i.productoId === p.id)
        )

        return {
          ...p,
          consumoDiario:  Math.round(consumoDiario * 100) / 100,
          totalSalidas60d: Math.round(totalSalidas60d * 100) / 100,
          diasStock,
          puntosReorden:  Math.round(puntosReorden * 10) / 10,
          cantSugerida:   Math.round(cantSugerida),
          costoSugerido,
          pmp,
          estadoS,
          necesitaPedido,
          ocPendiente,
          catNombre: categorias.find(c => c.id === p.categoriaId)?.nombre || '—',
        }
      })
      .sort((a, b) => {
        // Primero los más urgentes: agotados > críticos > con reorden > resto
        const pA = a.stockActual <= 0 ? 0 : a.estadoS.estado === 'critico' ? 1 : a.necesitaPedido ? 2 : 3
        const pB = b.stockActual <= 0 ? 0 : b.estadoS.estado === 'critico' ? 1 : b.necesitaPedido ? 2 : 3
        return pA !== pB ? pA - pB : (a.diasStock ?? 9999) - (b.diasStock ?? 9999)
      })
  }, [productos, movimientos, ordenes, categorias])

  const filtered = useMemo(() =>
    filtro === 'criticos'
      ? analisis.filter(p => p.necesitaPedido || p.stockActual <= 0)
      : analisis
  , [analisis, filtro])

  const kpis = useMemo(() => ({
    necesitan: analisis.filter(p => p.necesitaPedido).length,
    agotados:  analisis.filter(p => p.stockActual <= 0).length,
    conOC:     analisis.filter(p => p.ocPendiente).length,
    costoTotal: analisis.filter(p => p.necesitaPedido && !p.ocPendiente).reduce((s, p) => s + p.costoSugerido, 0),
  }), [analisis])

  function generarOC(prod) {
    if (prod.cantSugerida <= 0) { toast('Sin cantidad sugerida para generar OC', 'warning'); return }
    setGenerando(prod.id)

    const numero = `OC-${Date.now().toString(36).toUpperCase()}`
    const item   = { productoId: prod.id, cantidad: prod.cantSugerida, costoUnitario: prod.pmp, subtotal: prod.costoSugerido }
    const subtotal = prod.costoSugerido
    const igv      = +(subtotal * 0.18).toFixed(2)
    const total    = +(subtotal + igv).toFixed(2)

    storage.saveOrden({
      numero, proveedorId: prod.proveedorId || '',
      fecha: new Date().toISOString().split('T')[0],
      fechaEntrega: '', estado: 'PENDIENTE',
      items: [item], subtotal, igv, total,
      notas: `OC generada automáticamente por punto de reorden. Stock actual: ${prod.stockActual} ${prod.unidadMedida}`,
      usuarioId: sesion?.id || 'usr1',
    })

    recargarOrdenes()
    toast(`OC ${numero} generada para ${prod.nombre} (${prod.cantSugerida} ${prod.unidadMedida})`, 'success')
    setGenerando(null)
  }

  function diasColor(dias) {
    if (dias === null) return 'text-[#5f6f80]'
    if (dias <= 0)  return 'text-red-400'
    if (dias <= 7)  return 'text-red-400'
    if (dias <= 15) return 'text-amber-400'
    if (dias <= 30) return 'text-amber-300'
    return 'text-green-400'
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          ['Necesitan reposición', kpis.necesitan, '#ef4444', TrendingDown],
          ['Agotados',             kpis.agotados,  '#ef4444', AlertTriangle],
          ['Con OC pendiente',     kpis.conOC,     '#f59e0b', ShoppingCart],
          ['Costo estimado',       formatCurrency(kpis.costoTotal, simboloMoneda), '#00c896', RefreshCw],
        ].map(([label, val, color, Icon]) => (
          <div key={label} className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }}/>
            <div className="absolute top-4 right-4 opacity-[0.10]"><Icon size={36}/></div>
            <div className="text-[11px] text-[#5f6f80] uppercase tracking-[0.05em] mb-2">{label}</div>
            <div className={`font-semibold text-[#e8edf2] ${typeof val === 'number' ? 'text-[28px]' : 'text-[17px] font-mono'}`}>{val}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
            Análisis de Punto de Reorden
          </span>
          <div className="flex gap-2">
            {[
              ['criticos', `Requieren acción (${kpis.necesitan + kpis.agotados})`],
              ['todos',    `Todos los productos (${analisis.length})`],
            ].map(([key, label]) => (
              <button key={key} onClick={() => setFiltro(key)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border ${filtro === key
                  ? 'bg-[#00c896]/10 border-[#00c896]/40 text-[#00c896]'
                  : 'bg-transparent border-white/[0.08] text-[#5f6f80] hover:text-[#9ba8b6]'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {['Producto','Stock actual','P. Reorden','Consumo/día','Días de stock','Cant. sugerida','Costo estimado','Estado','Acción'].map(h => (
                  <th key={h} className="bg-[#1a2230] px-3 py-2.5 text-left text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] border-b border-white/[0.08] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9}>
                  <EmptyState icon={CheckCircle} title="Todo en orden"
                    description="Todos los productos tienen stock suficiente sobre su punto de reorden."/>
                </td></tr>
              )}
              {filtered.map(p => (
                <tr key={p.id} className={`border-b border-white/[0.06] last:border-0 transition-colors ${
                  p.stockActual <= 0 ? 'bg-red-500/[0.04]' :
                  p.necesitaPedido   ? 'bg-amber-500/[0.03]' : 'hover:bg-white/[0.02]'
                }`}>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-[#e8edf2]">{p.nombre}</div>
                    <div className="text-[11px] text-[#5f6f80]">{p.sku} · {p.catNombre}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`font-mono text-[12px] font-semibold ${p.stockActual <= 0 ? 'text-red-400' : p.stockActual <= p.stockMinimo ? 'text-amber-400' : 'text-[#e8edf2]'}`}>
                      {p.stockActual}
                    </span>
                    <span className="text-[11px] text-[#5f6f80] ml-1">{p.unidadMedida}</span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[12px] text-[#9ba8b6]">
                    {p.puntosReorden.toFixed(1)} {p.unidadMedida}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[12px]">
                    {p.consumoDiario > 0
                      ? <span className="text-[#9ba8b6]">{p.consumoDiario} {p.unidadMedida}/día</span>
                      : <span className="text-[#5f6f80]">Sin movimientos</span>
                    }
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`font-mono text-[12px] font-semibold ${diasColor(p.diasStock)}`}>
                      {p.diasStock === null ? '∞' : p.diasStock <= 0 ? 'AGOTADO' : `${p.diasStock} días`}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[12px]">
                    {p.cantSugerida > 0
                      ? <span className="text-[#00c896] font-semibold">{p.cantSugerida} {p.unidadMedida}</span>
                      : <span className="text-[#5f6f80]">—</span>
                    }
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[12px]">
                    {p.costoSugerido > 0 ? formatCurrency(p.costoSugerido, simboloMoneda) : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    {p.ocPendiente
                      ? <Badge variant="warning"><ShoppingCart size={9}/>OC Pendiente</Badge>
                      : p.stockActual <= 0
                        ? <Badge variant="danger">Agotado</Badge>
                        : p.necesitaPedido
                          ? <Badge variant="warning">Reponer</Badge>
                          : <Badge variant="success">OK</Badge>
                    }
                  </td>
                  <td className="px-3 py-2.5">
                    {p.ocPendiente ? (
                      <Btn variant="ghost" size="sm" onClick={() => nav('/ordenes')}
                        className="text-[#5f6f80]">Ver OC</Btn>
                    ) : p.necesitaPedido && p.cantSugerida > 0 ? (
                      <Btn variant="primary" size="sm"
                        disabled={generando === p.id}
                        onClick={() => generarOC(p)}>
                        {generando === p.id
                          ? <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin-slow"/>
                          : <ShoppingCart size={12}/>
                        }
                        Generar OC
                      </Btn>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 pt-3 border-t border-white/[0.06]">
          <p className="text-[11px] text-[#5f6f80] leading-relaxed">
            El consumo diario y los días de stock se calculan en base a los últimos 60 días de movimientos.
            La cantidad sugerida = Stock máximo − Stock actual. El punto de reorden = Stock mínimo + (7 días × consumo diario).
          </p>
        </div>

      {/* Panel explicativo */}
      <div className="bg-[#161d28] border border-[#00c896]/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#00c896]/10 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[#00c896] text-[14px] font-bold">?</span>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-[#e8edf2] mb-2">¿Para qué sirve el Punto de Reorden?</div>
            <p className="text-[12px] text-[#9ba8b6] leading-relaxed mb-3">
              El <strong className="text-[#e8edf2]">Punto de Reorden (ROP)</strong> es el nivel mínimo de stock al que debes emitir
              una orden de compra <em>antes</em> de quedarte sin mercadería. Evita quiebres de stock calculando
              cuánto consumirás mientras esperas la entrega del proveedor.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              {[
                ['📦 Días de stock', 'Cuántos días te queda el inventario actual si el consumo sigue al mismo ritmo de los últimos 60 días.'],
                ['🔄 Cantidad sugerida', 'Cuánto pedir para volver al stock máximo configurado. Si no tienes stock máximo, usa 4× el mínimo.'],
                ['⚡ Generar OC', 'Crea una Orden de Compra automáticamente con la cantidad sugerida. Revísala y apruébala antes de enviar al proveedor.'],
              ].map(([titulo, desc]) => (
                <div key={titulo} className="bg-[#1a2230] rounded-lg p-3">
                  <div className="text-[12px] font-semibold text-[#e8edf2] mb-1">{titulo}</div>
                  <div className="text-[11px] text-[#9ba8b6] leading-relaxed">{desc}</div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[#5f6f80] leading-relaxed">
              <strong className="text-[#9ba8b6]">Consejo:</strong> Configura el <em>Stock Mínimo</em> y <em>Stock Máximo</em> de cada producto
              en el módulo de Inventario para que los cálculos sean precisos. Sin esos datos, el sistema usa valores estimados.
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
