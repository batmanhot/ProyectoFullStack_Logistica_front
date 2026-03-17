import { useMemo, useState } from 'react'
import { TrendingUp, TrendingDown, Activity, AlertTriangle, Info } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'
import { useApp } from '../store/AppContext'
import { formatCurrency } from '../utils/helpers'
import { calcularPMP } from '../utils/valorizacion'
import { Badge, Btn } from '../components/ui/index'

const TT = { background:'#1a2230', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, fontSize:12, color:'#e8edf2' }

export default function Prevision() {
  const { productos, movimientos, categorias, simboloMoneda } = useApp()
  const [productoId, setProductoId] = useState('')
  const [horizonte, setHorizonte]   = useState(30) // días a proyectar
  const [busqueda, setBusqueda]     = useState('')

  const productosFiltrados = useMemo(() =>
    productos.filter(p => p.activo !== false && (!busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.sku.toLowerCase().includes(busqueda.toLowerCase())))
  , [productos, busqueda])

  const prod = productos.find(p => p.id === productoId)

  const analisis = useMemo(() => {
    if (!prod) return null

    const hoy    = new Date()
    const salidasTodas = movimientos.filter(m => m.productoId === prod.id && m.tipo === 'SALIDA')
    if (salidasTodas.length === 0) return { sinDatos: true }

    // Agrupar salidas por semana (últimas 12 semanas)
    const semanas = []
    for (let i = 11; i >= 0; i--) {
      const inicio = new Date(hoy); inicio.setDate(hoy.getDate() - (i + 1) * 7)
      const fin    = new Date(hoy); fin.setDate(hoy.getDate() - i * 7)
      const inicioS = inicio.toISOString().split('T')[0]
      const finS    = fin.toISOString().split('T')[0]
      const qty = salidasTodas.filter(m => m.fecha >= inicioS && m.fecha < finS).reduce((s, m) => s + m.cantidad, 0)
      semanas.push({
        semana: `S${12 - i}`,
        cantidad: Math.round(qty * 100) / 100,
        label: `Sem ${12 - i}`,
      })
    }

    // Promedio móvil simple (últimas 4 semanas)
    const ultimas4   = semanas.slice(-4).map(s => s.cantidad)
    const promSemanal = ultimas4.reduce((a, b) => a + b, 0) / 4
    const promDiario  = promSemanal / 7

    // Desviación estándar (para nivel de confianza)
    const varianza = ultimas4.reduce((s, v) => s + Math.pow(v - promSemanal, 2), 0) / 4
    const desvEst  = Math.sqrt(varianza)
    const cv       = promSemanal > 0 ? (desvEst / promSemanal) * 100 : 0 // coeficiente de variación

    // Proyección
    const diasStock      = promDiario > 0 ? Math.floor(prod.stockActual / promDiario) : null
    const fechaAgotamiento = diasStock !== null ? (() => { const d = new Date(); d.setDate(d.getDate() + diasStock); return d.toISOString().split('T')[0] })() : null

    // Stock de seguridad (1.65 × desvEst × √(plazo)) — 95% de nivel de servicio
    const plazoReposicion = 7 // días
    const stockSeguridad  = Math.ceil(1.65 * (desvEst / 7) * Math.sqrt(plazoReposicion))
    const puntoReorden    = Math.ceil(promDiario * plazoReposicion + stockSeguridad)
    const eoq             = prod.stockMaximo ? prod.stockMaximo - prod.stockActual : Math.ceil(promSemanal * 4)

    // Datos para gráfico: histórico + proyección
    const grafico = semanas.map(s => ({ ...s, proyeccion: null }))
    for (let d = 1; d <= horizonte; d++) {
      const semIdx = Math.floor((d - 1) / 7)
      if (semIdx === 0 || d === horizonte) {
        grafico.push({
          semana:    `P${d}d`,
          label:     `+${d}d`,
          cantidad:  null,
          proyeccion: Math.round(promSemanal / 7 * Math.min(7, d)),
        })
      }
    }

    const tendencia = semanas.length > 1
      ? ((semanas[semanas.length-1].cantidad - semanas[0].cantidad) / (semanas[0].cantidad || 1)) * 100
      : 0

    return {
      semanas, grafico, promSemanal, promDiario, desvEst, cv,
      diasStock, fechaAgotamiento, stockSeguridad, puntoReorden, eoq, tendencia,
      sinDatos: false,
    }
  }, [prod, movimientos, horizonte])

  const SEL = 'px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] pr-8'
  const catNombre = id => categorias.find(c => c.id === id)?.nombre || '—'

  function diasColor(dias) {
    if (dias === null) return 'text-green-400'
    if (dias <= 7)  return 'text-red-400'
    if (dias <= 14) return 'text-amber-400'
    if (dias <= 30) return 'text-amber-300'
    return 'text-green-400'
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* Selector */}
      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">Seleccionar Producto</div>
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <input className="w-full pl-3 pr-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] placeholder-[#5f6f80] outline-none focus:border-[#00c896]"
              placeholder="Buscar producto..." value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
          </div>
          <select className={SEL} style={{ minWidth: 260 }} value={productoId} onChange={e => setProductoId(e.target.value)}>
            <option value="">— Seleccionar producto —</option>
            {productosFiltrados.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.nombre}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[#5f6f80]">Horizonte:</span>
            {[7, 15, 30, 60].map(d => (
              <button key={d} onClick={() => setHorizonte(d)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${horizonte === d ? 'bg-[#00c896]/10 border-[#00c896]/40 text-[#00c896]' : 'border-white/[0.08] text-[#5f6f80] hover:text-[#9ba8b6]'}`}>
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {!prod && (
        <div className="flex-1 flex items-center justify-center py-16 text-center">
          <div>
            <Activity size={52} className="text-[#5f6f80] opacity-20 mx-auto mb-4"/>
            <p className="text-[14px] font-medium text-[#9ba8b6] mb-1">Selecciona un producto</p>
            <p className="text-[12px] text-[#5f6f80]">Se necesitan al menos 30 días de historial de salidas para la previsión.</p>
          </div>
        </div>
      )}

      {prod && analisis?.sinDatos && (
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-8 text-center">
          <Info size={40} className="text-[#5f6f80] opacity-30 mx-auto mb-4"/>
          <p className="text-[14px] font-medium text-[#9ba8b6] mb-1">Sin historial de salidas</p>
          <p className="text-[12px] text-[#5f6f80]">{prod.nombre} no tiene movimientos de salida registrados. La previsión requiere historial de consumo.</p>
        </div>
      )}

      {prod && analisis && !analisis.sinDatos && (
        <>
          {/* KPIs de previsión */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            {[
              ['Consumo semanal prom.', `${analisis.promSemanal.toFixed(2)} ${prod.unidadMedida}`, '#00c896'],
              ['Consumo diario prom.', `${analisis.promDiario.toFixed(3)} ${prod.unidadMedida}`, '#3b82f6'],
              ['Días de stock', analisis.diasStock !== null ? `${analisis.diasStock} días` : '∞', analisis.diasStock !== null && analisis.diasStock <= 14 ? '#ef4444' : '#22c55e'],
              ['Stock de seguridad sug.', `${analisis.stockSeguridad} ${prod.unidadMedida}`, '#f59e0b'],
            ].map(([l, v, c]) => (
              <div key={l} className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: c }}/>
                <div className="text-[11px] text-[#5f6f80] uppercase tracking-[0.05em] mb-2">{l}</div>
                <div className={`text-[18px] font-semibold font-mono ${analisis.diasStock !== null && l.includes('Días') ? diasColor(analisis.diasStock) : 'text-[#e8edf2]'}`}>{v}</div>
              </div>
            ))}
          </div>

          {/* Alerta de agotamiento */}
          {analisis.diasStock !== null && analisis.diasStock <= 30 && (
            <div className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border text-[13px] leading-snug ${analisis.diasStock <= 7 ? 'bg-red-500/10 border-red-500/25 text-red-300' : 'bg-amber-500/10 border-amber-500/25 text-amber-300'}`}>
              <AlertTriangle size={16} className="shrink-0 mt-0.5"/>
              <div>
                <span className="font-semibold">
                  {analisis.diasStock <= 0 ? 'Stock agotado.' : `Stock se agotará en ${analisis.diasStock} días (${analisis.fechaAgotamiento}).`}
                </span>
                {' '}Punto de reorden sugerido: <span className="font-semibold">{analisis.puntoReorden} {prod.unidadMedida}</span>
                {' '}· Cantidad EOQ sugerida: <span className="font-semibold">{analisis.eoq} {prod.unidadMedida}</span>
              </div>
            </div>
          )}

          {/* Gráfico */}
          <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
                Historial + Proyección ({horizonte} días)
              </span>
              <div className="flex gap-3 text-[11px] text-[#5f6f80]">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[#00c896] inline-block"/>Histórico</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-blue-400 inline-block"/>Proyección</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[12px] text-[#9ba8b6]">Tendencia:</span>
              {analisis.tendencia > 5 ? (
                <span className="flex items-center gap-1 text-green-400 text-[12px] font-semibold"><TrendingUp size={13}/> +{analisis.tendencia.toFixed(1)}% Creciente</span>
              ) : analisis.tendencia < -5 ? (
                <span className="flex items-center gap-1 text-red-400 text-[12px] font-semibold"><TrendingDown size={13}/> {analisis.tendencia.toFixed(1)}% Decreciente</span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400 text-[12px] font-semibold"><Activity size={13}/> Estable</span>
              )}
              <span className="text-[11px] text-[#5f6f80] ml-2">· CV: {analisis.cv.toFixed(1)}% {analisis.cv > 30 ? '(alta variabilidad)' : '(baja variabilidad)'}</span>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={analisis.grafico}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="semana" tick={{ fill:'#5f6f80', fontSize:11 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:'#5f6f80', fontSize:11 }} axisLine={false} tickLine={false} allowDecimals={false}/>
                <Tooltip contentStyle={TT} formatter={(v, name) => [v !== null ? `${v} ${prod.unidadMedida}` : '—', name]}/>
                <ReferenceLine x="S12" stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" label={{ value:'Hoy', fill:'#5f6f80', fontSize:10 }}/>
                <Line type="monotone" dataKey="cantidad" stroke="#00c896" strokeWidth={2} dot={{ r:3, fill:'#00c896' }} connectNulls={false} name="Histórico"/>
                <Line type="monotone" dataKey="proyeccion" stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 3" dot={{ r:3, fill:'#3b82f6' }} connectNulls={false} name="Proyección"/>
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Tabla resumen */}
          <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
            <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">Parámetros de Reposición Sugeridos</div>
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Punto de reorden (ROP)', `${analisis.puntoReorden} ${prod.unidadMedida}`, 'Nivel de stock al que se debe emitir una OC'],
                ['Stock de seguridad (SS)', `${analisis.stockSeguridad} ${prod.unidadMedida}`, 'Buffer para absorber variabilidad de la demanda (95% nivel de servicio)'],
                ['Cantidad sugerida a pedir', `${analisis.eoq} ${prod.unidadMedida}`, 'Basado en stock máximo configurado - stock actual'],
                ['Costo estimado de reposición', formatCurrency(analisis.eoq * calcularPMP(prod.batches || []), simboloMoneda), `${analisis.eoq} × PMP ${formatCurrency(calcularPMP(prod.batches||[]), simboloMoneda)}`],
                ['Fecha estimada agotamiento', analisis.fechaAgotamiento || 'Sin proyección', analisis.diasStock !== null ? `En ${analisis.diasStock} días` : 'Consumo diario = 0'],
                ['Variabilidad de la demanda', `${analisis.cv.toFixed(1)}%`, analisis.cv > 30 ? 'Alta — considerar mayor stock de seguridad' : analisis.cv > 15 ? 'Media — stock de seguridad recomendado' : 'Baja — demanda predecible'],
              ].map(([k, v, hint]) => (
                <div key={k} className="bg-[#1a2230] rounded-xl p-4">
                  <div className="text-[11px] text-[#5f6f80] mb-0.5">{k}</div>
                  <div className="text-[16px] font-semibold text-[#e8edf2] font-mono mb-1">{v}</div>
                  <div className="text-[11px] text-[#5f6f80] leading-snug">{hint}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      {/* Panel explicativo siempre visible */}
      <div className="bg-[#161d28] border border-blue-500/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-blue-400 text-[14px] font-bold">?</span>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-[#e8edf2] mb-2">¿Para qué sirve la Previsión de Demanda?</div>
            <p className="text-[12px] text-[#9ba8b6] leading-relaxed mb-3">
              La <strong className="text-[#e8edf2]">Previsión de Demanda</strong> analiza el historial de salidas de los
              últimos meses para <em>proyectar cuándo se agotará tu stock</em> y cuánto debes pedir.
              Te ayuda a comprar con anticipación, evitando tanto el quiebre de stock como el sobrestock.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
              {[
                ['📈 Tendencia', 'Si el consumo sube o baja en las últimas semanas. Te alerta si un producto está creciendo en demanda.'],
                ['🛡️ Stock de Seguridad', 'Buffer extra calculado con estadística (95% de nivel de servicio) para absorber variaciones inesperadas en la demanda.'],
                ['📅 Fecha de Agotamiento', 'Estimado de cuándo llegará tu stock a cero si no repones. Te da tiempo para emitir la OC antes de quedarte sin stock.'],
                ['📊 Variabilidad (CV)', 'Si el consumo es predecible o errático. CV < 15% = estable. CV > 30% = alta variabilidad, necesitas más stock de seguridad.'],
              ].map(([titulo, desc]) => (
                <div key={titulo} className="bg-[#1a2230] rounded-lg p-3">
                  <div className="text-[12px] font-semibold text-[#e8edf2] mb-1">{titulo}</div>
                  <div className="text-[11px] text-[#9ba8b6] leading-relaxed">{desc}</div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[#5f6f80] leading-relaxed">
              <strong className="text-[#9ba8b6]">Requisito:</strong> El producto debe tener al menos 30 días de historial de salidas registradas.
              Selecciona el <em>horizonte de proyección</em> (7, 15, 30 o 60 días) según la frecuencia con que haces tus pedidos.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
