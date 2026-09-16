/**
 * Dashboard del Propietario — resumen ejecutivo, no operativo.
 *
 * Antes Owner compartía literalmente el mismo Dashboard táctico que Admin
 * (movimientos de hoy, top 5 productos, últimos despachos). Ese detalle
 * día a día ya lo cubre el Dashboard de Admin/Gerencia — acá se prioriza lo
 * que un dueño necesita para decisiones de continuidad de negocio: salud
 * financiera del mes, salud multi-almacén (Torre de Control) y pendientes
 * que requieren su atención, cada uno con link a su pantalla de detalle en
 * vez de duplicar la lógica completa de esas pantallas.
 */
import { useMemo } from 'react'
import {
  Package, AlertTriangle, ShoppingCart, Users, DollarSign,
  TrendingUp, TrendingDown, Building2, CheckCircle, ArrowRight, Clock,
} from 'lucide-react'
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../store/AppContext'
import { formatCurrency, estadoStock } from '../../utils/helpers'
import { useProductosList } from '../../queries/productos.queries'
import { useInventarioList } from '../../queries/inventario.queries'
import { useMovimientosList } from '../../queries/movimientos.queries'
import { useOrdenesCompraList } from '../../queries/ordenes-compra.queries'
import { useDespachosList } from '../../queries/despachos.queries'
import { useClientesList } from '../../queries/clientes.queries'
import { usePanoramaAlmacenes } from '../../queries/panorama-almacenes.queries'

const TT = { background: '#1a2230', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12, color: '#e8edf2' }
const simboloMoneda = 'S/'

function KPI({ label, value, sub, color = '#00c896', icon: Icon, onClick, trend }) {
  return (
    <div onClick={onClick}
      className={`relative bg-[#161d28] border border-white/8 rounded-xl px-4 sm:px-5 py-4 overflow-hidden
        ${onClick ? 'cursor-pointer hover:border-white/16 transition-all' : ''}`}>
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }}/>
      <div className="absolute top-3 right-4 opacity-[0.06]">{Icon && <Icon size={44}/>}</div>
      <div className="text-[9px] sm:text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.08em] mb-2 flex items-center gap-1.5">
        {Icon && <Icon size={11} style={{ color, opacity: 0.8 }}/>}{label}
      </div>
      <div className="font-mono font-semibold text-[#e8edf2] leading-none text-[22px] sm:text-[24px]">{value}</div>
      {sub && <div className="text-[10px] text-[#5f6f80] mt-1.5 leading-snug flex items-center gap-1">
        {trend === 'up' && <TrendingUp size={11} className="text-green-400"/>}
        {trend === 'down' && <TrendingDown size={11} className="text-red-400"/>}
        {sub}
      </div>}
    </div>
  )
}

function saludAlmacen(a) {
  if (!a.activo) return { color: '#5f6f80', label: 'Inactivo' }
  if (a.agotados > 0) return { color: '#ef4444', label: 'Requiere atención' }
  if (a.criticos > 0 || a.porVencer30d > 0) return { color: '#f59e0b', label: 'En observación' }
  return { color: '#22c55e', label: 'En orden' }
}

export default function DashboardOwner() {
  const { sesion } = useApp()
  const nav = useNavigate()
  const hoy = new Date()
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`

  const { data: productosRaw  = [] } = useProductosList()
  const { data: inventarioRaw = [] } = useInventarioList()
  const { data: movimientos   = [] } = useMovimientosList()
  const { data: ordenes       = [] } = useOrdenesCompraList()
  const { data: despachos     = [] } = useDespachosList()
  const { data: clientes      = [] } = useClientesList()
  const { data: panorama, isLoading: cargandoPanorama } = usePanoramaAlmacenes()

  const productos = useMemo(() => {
    const stockMap = {}
    inventarioRaw.forEach(item => { stockMap[item.productoId] = (stockMap[item.productoId] || 0) + Number(item.cantidad || 0) })
    return productosRaw.map(p => ({ ...p, activo: p.estado === 'Activo', stockActual: stockMap[p.id] || 0, stockMinimo: Number(p.stockMinimo || 0) }))
  }, [productosRaw, inventarioRaw])

  const consolidado = panorama?.consolidado

  const kpisNegocio = useMemo(() => {
    const activos = productos.filter(p => p.activo)
    const criticosLocal = activos.filter(p => { const e = estadoStock(p.stockActual, p.stockMinimo); return e.estado === 'critico' || e.estado === 'agotado' }).length
    return {
      totalProductos: activos.length,
      // Valor de inventario y stock crítico: si ya cargó la Torre de Control
      // se usa ese consolidado (multi-almacén, más completo); si no, el
      // cálculo local de este mismo componente evita una pantalla vacía.
      valorInventario: consolidado ? consolidado.valorInventario : activos.reduce((s, p) => s + (Number(p.precioCompra || 0) * p.stockActual), 0),
      criticos: consolidado ? (consolidado.criticos + consolidado.agotados) : criticosLocal,
      totalClientes: clientes.filter(c => c.activo !== false).length,
    }
  }, [productos, clientes, consolidado])

  // P&L simplificado del mes en curso (mismo criterio que Financiero.jsx,
  // sin el histórico de 6 meses — acá solo importa "¿cómo vamos este mes?").
  const financieroMes = useMemo(() => {
    const salidasMes = movimientos.filter(m => m.tipo === 'SALIDA' && m.fecha?.startsWith(mesActual))
    const ingresos = salidasMes.reduce((s, m) => {
      const p = productos.find(x => x.id === m.productoId)
      return s + (m.cantidad * (p?.precioVenta || 0))
    }, 0)
    const costoVentas = salidasMes.reduce((s, m) => s + ((m.costoUnitario || 0) * (m.cantidad || 0)), 0)
    const margenBruto = ingresos - costoVentas
    const margenPct = ingresos > 0 ? (margenBruto / ingresos) * 100 : 0
    return { ingresos, costoVentas, margenBruto, margenPct }
  }, [movimientos, productos, mesActual])

  const movChart = useMemo(() => {
    const dias = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      dias.push({
        dia: d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' }),
        Entradas: movimientos.filter(m => m.fecha === key && m.tipo === 'ENTRADA').reduce((s, m) => s + (m.costoTotal || 0), 0),
        Salidas: movimientos.filter(m => m.fecha === key && m.tipo === 'SALIDA').reduce((s, m) => s + (m.costoTotal || 0), 0),
      })
    }
    return dias
  }, [movimientos])

  const almacenesOrdenados = useMemo(() => {
    const lista = panorama?.almacenes ?? []
    return [...lista].sort((a, b) => (b.agotados - a.agotados) || (b.criticos - a.criticos)).slice(0, 5)
  }, [panorama])

  const resumenAlmacenes = useMemo(() => {
    const lista = panorama?.almacenes ?? []
    const atencion = lista.filter(a => a.activo && a.agotados > 0).length
    const observacion = lista.filter(a => a.activo && a.agotados === 0 && (a.criticos > 0 || a.porVencer30d > 0)).length
    return { total: lista.length, atencion, observacion, enOrden: lista.length - atencion - observacion }
  }, [panorama])

  const pendientes = useMemo(() => {
    const lista = []
    productos.filter(p => p.activo).forEach(p => {
      const e = estadoStock(p.stockActual, p.stockMinimo)
      if (e.estado === 'agotado') lista.push({ prioridad: 1, tipo: 'danger', msg: `${p.nombre} — Sin stock`, path: '/inventario' })
      else if (e.estado === 'critico') lista.push({ prioridad: 1, tipo: 'warning', msg: `${p.nombre} — Crítico (${p.stockActual} ${p.unidadMedida || ''})`, path: '/inventario' })
    })
    ordenes.filter(o => o.estado === 'PENDIENTE').forEach(o =>
      lista.push({ prioridad: 2, tipo: 'info', msg: `OC ${o.numero} pendiente de aprobación`, path: '/ordenes' })
    )
    despachos.filter(d => d.estado === 'LISTO').forEach(d =>
      lista.push({ prioridad: 3, tipo: 'info', msg: `${d.numero} — Listo para despachar`, path: '/despachos' })
    )
    return lista.sort((a, b) => a.prioridad - b.prioridad).slice(0, 6)
  }, [productos, ordenes, despachos])

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-[18px] font-bold text-[#e8edf2]">
            {(() => { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches' })()}{sesion?.nombre ? `, ${sesion.nombre.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-[12px] text-[#5f6f80] mt-0.5">{new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · Panel ejecutivo</p>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-[#5f6f80]">Empresa</div>
          <div className="text-[13px] font-semibold text-[#e8edf2]">{sesion?.nombre || 'StockPro'}</div>
        </div>
      </div>

      <div>
        <div className="text-[9.5px] font-bold text-[#3d4f60] uppercase tracking-[0.14em] mb-2.5">Negocio</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI label="Total productos"       value={kpisNegocio.totalProductos}                                  color="#00c896" icon={Package}       onClick={() => nav('/inventario')}/>
          <KPI label="Valor de inventario"   value={formatCurrency(kpisNegocio.valorInventario, simboloMoneda)}  color="#3b82f6" icon={DollarSign}    onClick={() => nav('/panorama-almacenes')} sub="Todos los almacenes"/>
          <KPI label="Stock crítico/agotado" value={kpisNegocio.criticos} color={kpisNegocio.criticos > 0 ? '#ef4444' : '#22c55e'} icon={AlertTriangle} onClick={() => nav('/inventario')} sub={kpisNegocio.criticos > 0 ? 'Requiere reposición' : 'Todo en orden'}/>
          <KPI label="Clientes activos"      value={kpisNegocio.totalClientes}                                   color="#f59e0b" icon={Users}         onClick={() => nav('/clientes')}/>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="text-[9.5px] font-bold text-[#3d4f60] uppercase tracking-[0.14em]">Financiero — mes en curso</div>
          <button onClick={() => nav('/financiero')} className="text-[11px] text-[#9ba8b6] hover:text-[#e8edf2] transition-colors flex items-center gap-1">Ver P&amp;L completo <ArrowRight size={11}/></button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI label="Ingresos del mes"  value={formatCurrency(financieroMes.ingresos, simboloMoneda)}    color="#3b82f6" icon={DollarSign}/>
          <KPI label="Costo de ventas"   value={formatCurrency(financieroMes.costoVentas, simboloMoneda)} color="#ef4444" icon={TrendingDown}/>
          <KPI label="Margen bruto"      value={formatCurrency(financieroMes.margenBruto, simboloMoneda)} color={financieroMes.margenBruto >= 0 ? '#22c55e' : '#ef4444'} icon={TrendingUp} trend={financieroMes.margenBruto >= 0 ? 'up' : 'down'}/>
          <KPI label="Margen neto %"     value={`${financieroMes.margenPct.toFixed(1)}%`} color={financieroMes.margenPct >= 0 ? '#22c55e' : '#ef4444'}   icon={DollarSign}/>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] flex items-center gap-1.5"><Building2 size={13}/> Salud de Almacenes</span>
            <button onClick={() => nav('/panorama-almacenes')} className="text-[11px] text-[#9ba8b6] hover:text-[#e8edf2] transition-colors">Torre de Control →</button>
          </div>
          {cargandoPanorama ? (
            <p className="text-[12px] text-[#5f6f80] text-center py-6">Cargando…</p>
          ) : resumenAlmacenes.total === 0 ? (
            <p className="text-[12px] text-[#5f6f80] text-center py-6">Sin almacenes registrados</p>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-4 text-[12px]">
                <span className="flex items-center gap-1.5 text-[#5f6f80]"><span className="w-2 h-2 rounded-full bg-[#22c55e]"/>{resumenAlmacenes.enOrden} en orden</span>
                <span className="flex items-center gap-1.5 text-[#5f6f80]"><span className="w-2 h-2 rounded-full bg-[#f59e0b]"/>{resumenAlmacenes.observacion} en observación</span>
                <span className="flex items-center gap-1.5 text-[#5f6f80]"><span className="w-2 h-2 rounded-full bg-[#ef4444]"/>{resumenAlmacenes.atencion} requieren atención</span>
              </div>
              <div className="flex flex-col divide-y divide-white/5">
                {almacenesOrdenados.map(a => {
                  const salud = saludAlmacen(a)
                  return (
                    <div key={a.id} className="flex items-center justify-between py-2.5 cursor-pointer hover:bg-white/2 px-1 rounded-lg transition-colors" onClick={() => nav('/panorama-almacenes')}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: salud.color }}/>
                        <span className="text-[12px] text-[#e8edf2] truncate">{a.nombre}</span>
                      </div>
                      <span className="text-[11px] font-medium shrink-0" style={{ color: salud.color }}>{salud.label}</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Pendientes de Atención</span>
            <button onClick={() => nav('/alertas')} className="text-[11px] text-[#9ba8b6] hover:text-[#e8edf2] transition-colors">Ver Alertas →</button>
          </div>
          {pendientes.length === 0 ? (
            <div className="flex flex-col items-center py-6 gap-2">
              <CheckCircle size={28} className="text-green-400 opacity-50"/>
              <p className="text-[12px] text-[#22c55e] font-medium">Sin pendientes</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {pendientes.map((a, i) => (
                <div key={i} onClick={() => nav(a.path)}
                  className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                    a.tipo === 'danger' ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/35' :
                    a.tipo === 'warning' ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/35' :
                    'bg-blue-500/5 border-blue-500/15 hover:border-blue-500/30'
                  }`}>
                  <AlertTriangle size={12} className={`shrink-0 mt-0.5 ${a.tipo === 'danger' ? 'text-red-400' : a.tipo === 'warning' ? 'text-amber-400' : 'text-blue-400'}`}/>
                  <span className="text-[12px] text-[#9ba8b6] leading-snug">{a.msg}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Entradas vs Salidas — Últimos 14 días</span>
          <div className="flex gap-3 text-[11px] text-[#5f6f80]">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#00c896]"/>Entradas</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400"/>Salidas</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={movChart} margin={{ left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
            <XAxis dataKey="dia" tick={{ fill: '#5f6f80', fontSize: 10 }} axisLine={false} tickLine={false} interval={1}/>
            <YAxis tick={{ fill: '#5f6f80', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}/>
            <Tooltip contentStyle={TT} formatter={v => formatCurrency(v, simboloMoneda)}/>
            <Line type="monotone" dataKey="Entradas" stroke="#00c896" strokeWidth={2} dot={false} activeDot={{ r: 4 }}/>
            <Line type="monotone" dataKey="Salidas" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }}/>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
