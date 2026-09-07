import { useMemo, useState } from 'react'
import { ShoppingCart, TrendingDown, AlertTriangle, CheckCircle, RefreshCw, Download, FileText, Info, Printer } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, estadoStock } from '../utils/helpers'
import { Badge, Btn, DataTable } from '../components/ui/index'
import { useNavigate } from 'react-router-dom'
import { useProductosList } from '../queries/productos.queries'
import { useInventarioList } from '../queries/inventario.queries'
import { useMovimientosList } from '../queries/movimientos.queries'
import { useOrdenesCompraList, useCrearOrdenCompra } from '../queries/ordenes-compra.queries'
import { useCategoriasList } from '../queries/categorias.queries'
import { useProveedoresList } from '../queries/proveedores.queries'
import { exportarPuntoReordenXLSX } from '../utils/exportXLSX'
import { exportarPuntoReordenPDF } from '../utils/exportPDF'

export default function PuntoReorden() {
  const { toast, sesion } = useApp()
  const simboloMoneda = 'S/'
  const nav = useNavigate()

  const { data: productosRaw     = [] } = useProductosList()
  const { data: inventarioItems  = [] } = useInventarioList()
  const { data: movimientosRaw   = [] } = useMovimientosList({ tipo: 'SALIDA' })
  const { data: ordenes          = [] } = useOrdenesCompraList()
  const { data: categorias       = [] } = useCategoriasList()
  const { data: proveedores      = [] } = useProveedoresList()
  const crearOrdenCompra               = useCrearOrdenCompra()

  const [filtro,    setFiltro]    = useState('criticos')
  const [generando, setGenerando] = useState(null)

  const stockMap = useMemo(() => {
    const m = {}
    inventarioItems.forEach(i => { m[i.productoId] = (m[i.productoId] || 0) + Number(i.cantidad || 0) })
    return m
  }, [inventarioItems])

  const productos = useMemo(() =>
    productosRaw.map(p => ({ ...p, activo: p.estado === 'Activo' || p.activo !== false, stockActual: stockMap[p.id] || 0 }))
  , [productosRaw, stockMap])

  const analisis = useMemo(() => {
    const hoy    = new Date()
    const hace60 = new Date(hoy); hace60.setDate(hoy.getDate() - 60)
    const hace60s = hace60.toISOString().split('T')[0]
    const hoys    = hoy.toISOString().split('T')[0]

    return productos
      .filter(p => p.activo !== false)
      .map(p => {
        const salidasRec = movimientosRaw.filter(m =>
          m.productoId === p.id && (m.fecha || m.createdAt || '')?.slice(0,10) >= hace60s
        )
        const totalSalidas60d = salidasRec.reduce((s, m) => s + Number(m.cantidad || 0), 0)
        const consumoDiario   = totalSalidas60d / 60
        const diasStock       = consumoDiario > 0 ? Math.floor(p.stockActual / consumoDiario) : null

        const puntosReorden  = Number(p.stockMinimo || 0) + (consumoDiario * 7)
        const stockMaximo    = Number(p.stockMaximo  || 0) || Number(p.stockMinimo || 0) * 4
        const cantSugerida   = Math.max(0, stockMaximo - p.stockActual)

        const estadoS        = estadoStock(p.stockActual, p.stockMinimo)
        const necesitaPedido = p.stockActual <= puntosReorden
        const pmp            = Number(p.precioCompra || 0)
        const costoSugerido  = +(cantSugerida * pmp).toFixed(2)

        const ocPendiente = ordenes.some(o =>
          (o.estado === 'PENDIENTE' || o.estado === 'APROBADA') &&
          o.items?.some(i => i.productoId === p.id)
        )

        return {
          ...p,
          consumoDiario:  Math.round(consumoDiario * 100) / 100,
          totalSalidas60d:Math.round(totalSalidas60d * 100) / 100,
          diasStock,
          puntosReorden:  Math.round(puntosReorden * 10) / 10,
          cantSugerida:   Math.round(cantSugerida),
          costoSugerido,
          pmp,
          estadoS,
          necesitaPedido,
          ocPendiente,
          catNombre: categorias.find(c => c.id === p.categoriaId)?.nombre || '—',
          provNombre: proveedores.find(pr => pr.id === p.proveedorId)?.razonSocial || '—',
        }
      })
      .sort((a, b) => {
        const pA = a.stockActual <= 0 ? 0 : a.estadoS.estado === 'critico' ? 1 : a.necesitaPedido ? 2 : 3
        const pB = b.stockActual <= 0 ? 0 : b.estadoS.estado === 'critico' ? 1 : b.necesitaPedido ? 2 : 3
        return pA !== pB ? pA - pB : (a.diasStock ?? 9999) - (b.diasStock ?? 9999)
      })
  }, [productos, movimientosRaw, ordenes, categorias, proveedores])

  const filtered = useMemo(() =>
    filtro === 'criticos' ? analisis.filter(p => p.necesitaPedido || p.stockActual <= 0) : analisis
  , [analisis, filtro])

  const pendientesDeOC = useMemo(() =>
    filtered.filter(p => p.necesitaPedido && !p.ocPendiente)
  , [filtered])

  // Set fijo para el reporte rápido — independiente del toggle "Todos los
  // productos", siempre son los que necesitan reposición ahora mismo.
  const necesitanReposicion = useMemo(() =>
    analisis.filter(p => p.necesitaPedido)
  , [analisis])

  const kpis = useMemo(() => ({
    necesitan:  analisis.filter(p => p.necesitaPedido).length,
    agotados:   analisis.filter(p => p.stockActual <= 0).length,
    conOC:      analisis.filter(p => p.ocPendiente).length,
    costoTotal: analisis.filter(p => p.necesitaPedido && !p.ocPendiente).reduce((s, p) => s + p.costoSugerido, 0),
  }), [analisis])

  async function generarOC(prod) {
    if (prod.cantSugerida <= 0) { toast('Sin cantidad sugerida para generar OC', 'warning'); return }
    setGenerando(prod.id)
    const item     = { productoId: prod.id, cantidad: prod.cantSugerida, costoUnitario: prod.pmp }
    const subtotal = prod.costoSugerido
    const igv      = +(subtotal * 0.18).toFixed(2)
    const total    = +(subtotal + igv).toFixed(2)

    const res = await crearOrdenCompra.mutateAsync({
      proveedorId:  prod.proveedorId || undefined,
      fecha:        new Date().toISOString().split('T')[0],
      estado:       'PENDIENTE',
      items:        [{ ...item, subtotal: prod.costoSugerido }],
      subtotal, igv, total,
      notas: `OC generada automáticamente por punto de reorden. Stock actual: ${prod.stockActual} ${prod.unidadMedida}`,
    })
    setGenerando(null)
    if (res?.error) { toast(res.error, 'error'); return }
    toast(`OC generada para ${prod.nombre} (${prod.cantSugerida} ${prod.unidadMedida})`, 'success')
  }

  function imprimirReposicion() {
    const filas = necesitanReposicion.map(p => `<tr>
      <td style="padding:7px 8px;border:1px solid #ddd;font-family:monospace">${p.sku || '—'}</td>
      <td style="padding:7px 8px;border:1px solid #ddd">${p.nombre}</td>
      <td style="padding:7px 8px;border:1px solid #ddd">${p.provNombre}</td>
      <td style="padding:7px 8px;border:1px solid #ddd;text-align:right">${p.stockActual} ${p.unidadMedida || ''}</td>
      <td style="padding:7px 8px;border:1px solid #ddd;text-align:right;font-weight:bold;color:#00875a">${p.cantSugerida > 0 ? `${p.cantSugerida} ${p.unidadMedida || ''}` : '—'}</td>
      <td style="padding:7px 8px;border:1px solid #ddd;text-align:center">
        ${p.ocPendiente ? 'OC Pendiente' : p.stockActual <= 0 ? 'AGOTADO' : 'Reponer'}
      </td>
    </tr>`).join('')

    const costoTotalHoja = necesitanReposicion.filter(p => !p.ocPendiente).reduce((s, p) => s + p.costoSugerido, 0)

    const win = window.open('', '_blank', 'width=900,height=700')
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Reporte de Reposición — ${new Date().toLocaleDateString('es-PE')}</title>
      <style>
        body{font-family:Arial,sans-serif;margin:30px;color:#222}
        h1{font-size:18px;margin:0}h2{font-size:12px;color:#666;font-weight:normal;margin-top:4px}
        table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}
        th{background:#f0f0f0;padding:7px 8px;border:1px solid #ddd;text-align:left}
        tfoot td{font-weight:bold;background:#fafafa}
        .header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #333;padding-bottom:12px}
        .meta{text-align:right;font-size:11px;color:#555}
      </style></head><body>
      <div class="header">
        <div><h1>REPORTE DE REPOSICIÓN DE STOCK</h1><h2>Generado por ${sesion?.nombre || 'StockPro'}</h2></div>
        <div class="meta">${new Date().toLocaleString('es-PE')}<br/>${necesitanReposicion.length} producto(s) a reponer</div>
      </div>
      <table>
        <thead><tr>
          <th>SKU</th><th>Producto</th><th>Proveedor</th><th style="text-align:right">Stock actual</th>
          <th style="text-align:right">Cant. sugerida</th><th style="text-align:center">Estado</th>
        </tr></thead>
        <tbody>${filas}</tbody>
        <tfoot><tr>
          <td colspan="4"></td>
          <td style="padding:7px 8px;border:1px solid #ddd" colspan="2">
            Costo estimado (sin OC pendiente): ${formatCurrency(costoTotalHoja, simboloMoneda)}
          </td>
        </tr></tfoot>
      </table>
      </body></html>`)
    win.document.close()
    win.print()
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
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      {/* ── Banner explicativo ── */}
      <div className="flex items-start gap-4 px-5 py-4 rounded-xl"
        style={{background:'rgba(0,200,150,0.08)',border:'1px solid rgba(0,200,150,0.20)'}}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{background:'rgba(0,200,150,0.15)'}}>
          <TrendingDown size={24} className="text-[#00c896]"/>
        </div>
        <div className="flex-1 flex flex-col gap-3">
          <div>
            <div className="text-[14px] font-bold text-[#e8edf2] mb-1">Punto de Reorden</div>
            <div className="text-[12px] text-[#9ba8b6] leading-relaxed">
              <strong className="text-[#e8edf2]">¿Para qué sirve?</strong> Te dice, producto por producto, cuándo
              generar una nueva Orden de Compra antes de quedarte sin stock. Calcula el consumo diario real de los
              últimos 60 días, el nivel de stock en el que deberías reponer (punto de reorden) y la cantidad
              sugerida para volver al stock máximo — y te deja generar la OC directamente desde aquí.
            </div>
          </div>
          <div className="flex items-start gap-1.5 text-[11px] text-[#5f6f80]">
            <Info size={12} className="shrink-0 mt-0.5"/>
            <span>Las 4 tarjetas de abajo no son acumulables entre sí: <strong className="text-[#9ba8b6]">Necesitan
            reposición</strong> cuenta todo producto bajo su punto de reorden, tenga o no una OC en camino;
            <strong className="text-[#9ba8b6]"> Con OC pendiente</strong> es un subconjunto de esos; y
            <strong className="text-[#9ba8b6]"> Costo estimado</strong> solo suma los que aún no tienen OC generada
            (para no duplicar un gasto ya comprometido) — por eso no calza con sumar a mano la columna "Costo
            estimado" de la tabla si en la lista hay productos con "OC Pendiente". El total al pie de la tabla sí
            replica ese mismo cálculo.</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          ['Necesitan reposición', kpis.necesitan,  '#ef4444', TrendingDown, null],
          ['Agotados',             kpis.agotados,   '#ef4444', AlertTriangle, null],
          ['Con OC pendiente',     kpis.conOC,      '#f59e0b', ShoppingCart, null],
          ['Costo estimado',       formatCurrency(kpis.costoTotal, simboloMoneda), '#00c896', RefreshCw, 'Solo productos sin OC pendiente'],
        ].map(([label, val, color, Icon, caption]) => (
          <div key={label} className="relative bg-[#161d28] border border-white/8 rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.75 rounded-t-xl" style={{ background: color }}/>
            <div className="absolute top-4 right-4 opacity-10"><Icon size={36}/></div>
            <div className="text-[11px] text-[#5f6f80] uppercase tracking-[0.05em] mb-2">{label}</div>
            <div className={`font-semibold text-[#e8edf2] ${typeof val === 'number' ? 'text-[28px]' : 'text-[17px] font-mono'}`}>{val}</div>
            {caption && <div className="text-[10px] text-[#5f6f80] mt-1">{caption}</div>}
          </div>
        ))}
      </div>

      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
            Análisis de Punto de Reorden
          </span>
          <div className="flex items-center gap-2">
            <div className="flex gap-2">
              {[
                ['criticos', `Requieren acción (${kpis.necesitan + kpis.agotados})`],
                ['todos',    `Todos los productos (${analisis.length})`],
              ].map(([key, label]) => (
                <button key={key} onClick={() => setFiltro(key)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border ${filtro === key
                    ? 'bg-[#00c896]/10 border-[#00c896]/40 text-[#00c896]'
                    : 'bg-transparent border-white/8 text-[#5f6f80] hover:text-[#9ba8b6]'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
            <Btn variant="primary" size="sm" onClick={imprimirReposicion} disabled={necesitanReposicion.length === 0}
              title="Vista rápida para imprimir/compartir solo lo que necesita reponerse — sin abrir Excel">
              <Printer size={13}/> Reporte de Reposición
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => exportarPuntoReordenXLSX(filtered, simboloMoneda)}>
              <Download size={13}/> Excel
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => exportarPuntoReordenPDF(filtered, simboloMoneda, sesion?.nombre)}>
              <FileText size={13}/> PDF
            </Btn>
          </div>
        </div>

        <DataTable
          rows={filtered}
          rowKey={p => p.id}
          rowClassName={p => p.stockActual <= 0 ? 'bg-red-500/4' : p.necesitaPedido ? 'bg-amber-500/3' : ''}
          emptyIcon={CheckCircle}
          emptyTitle="Todo en orden"
          emptyDescription="Todos los productos tienen stock suficiente sobre su punto de reorden."
          columns={[
            { key: 'producto', header: 'Producto', render: p => (
                <div>
                  <div className="font-medium text-[#e8edf2]">{p.nombre}</div>
                  <div className="text-[11px] text-[#5f6f80]">{p.sku} · {p.catNombre}</div>
                </div>
              ) },
            { key: 'stock', header: 'Stock actual', render: p => (
                <span>
                  <span className={`font-mono text-[12px] font-semibold ${p.stockActual <= 0 ? 'text-red-400' : p.stockActual <= (p.stockMinimo||0) ? 'text-amber-400' : 'text-[#e8edf2]'}`}>
                    {p.stockActual}
                  </span>
                  <span className="text-[11px] text-[#5f6f80] ml-1">{p.unidadMedida}</span>
                </span>
              ) },
            { key: 'reorden', header: 'P. Reorden', render: p => <span className="font-mono text-[12px] text-[#9ba8b6]">{p.puntosReorden.toFixed(1)} {p.unidadMedida}</span> },
            { key: 'consumo', header: 'Consumo/día', render: p => (
                p.consumoDiario > 0
                  ? <span className="font-mono text-[12px] text-[#9ba8b6]">{p.consumoDiario} {p.unidadMedida}/día</span>
                  : <span className="font-mono text-[12px] text-[#5f6f80]">Sin movimientos</span>
              ) },
            { key: 'dias', header: 'Días de stock', render: p => (
                <span className={`font-mono text-[12px] font-semibold ${diasColor(p.diasStock)}`}>
                  {p.diasStock === null ? '∞' : p.diasStock <= 0 ? 'AGOTADO' : `${p.diasStock} días`}
                </span>
              ) },
            { key: 'cantSug', header: 'Cant. sugerida', render: p => (
                p.cantSugerida > 0
                  ? <span className="font-mono text-[12px] text-[#00c896] font-semibold">{p.cantSugerida} {p.unidadMedida}</span>
                  : <span className="font-mono text-[12px] text-[#5f6f80]">—</span>
              ) },
            { key: 'costo', header: 'Costo estimado', render: p => <span className="font-mono text-[12px]">{p.costoSugerido > 0 ? formatCurrency(p.costoSugerido, simboloMoneda) : '—'}</span> },
            { key: 'estado', header: 'Estado', render: p => (
                p.ocPendiente
                  ? <Badge variant="warning"><ShoppingCart size={9}/>OC Pendiente</Badge>
                  : p.stockActual <= 0
                    ? <Badge variant="danger">Agotado</Badge>
                    : p.necesitaPedido
                      ? <Badge variant="warning">Reponer</Badge>
                      : <Badge variant="success">OK</Badge>
              ) },
            { key: 'accion', header: 'Acción', stopPropagation: true, render: p => (
                p.ocPendiente ? (
                  <Btn variant="ghost" size="sm" onClick={() => nav('/ordenes')} className="text-[#5f6f80]">Ver OC</Btn>
                ) : p.necesitaPedido && p.cantSugerida > 0 ? (
                  <Btn variant="primary" size="sm" disabled={generando === p.id || crearOrdenCompra.isPending} onClick={() => generarOC(p)}>
                    {generando === p.id
                      ? <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin"/>
                      : <ShoppingCart size={12}/>
                    }
                    Generar OC
                  </Btn>
                ) : null
              ) },
          ]}
          footerRow={[
            <span key="t" className="text-[11px] font-semibold text-[#5f6f80] uppercase">Total a comprar (sin OC pendiente)</span>,
            '', '', '', '',
            <span key="c" className="font-mono font-bold text-[#e8edf2]">{pendientesDeOC.reduce((s, p) => s + p.cantSugerida, 0)}</span>,
            <span key="$" className="font-mono font-bold text-[#00c896]">{formatCurrency(pendientesDeOC.reduce((s, p) => s + p.costoSugerido, 0), simboloMoneda)}</span>,
            '', '',
          ]}
        />

        <div className="mt-4 pt-3 border-t border-white/6">
          <p className="text-[11px] text-[#5f6f80] leading-relaxed">
            El consumo diario y los días de stock se calculan en base a los últimos 60 días de movimientos.
            La cantidad sugerida = Stock máximo − Stock actual. El punto de reorden = Stock mínimo + (7 días × consumo diario).
            El total al pie de la tabla coincide con la tarjeta "Costo estimado": ambos excluyen productos que ya
            tienen una OC pendiente, para no contar dos veces un gasto ya comprometido.
          </p>
        </div>

      </div>

      <div className="bg-[#161d28] border border-white/6 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          ¿Cómo funciona el módulo de Punto de Reorden?
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          {[
            ['1. Días de stock', 'Cuántos días te queda el inventario actual si el consumo sigue al mismo ritmo de los últimos 60 días.'],
            ['2. Punto de reorden (ROP)', 'Nivel mínimo de stock al que debes emitir una OC antes de quedarte sin mercadería: Stock mínimo + (7 días × consumo diario).'],
            ['3. Cantidad sugerida', 'Cuánto pedir para volver al stock máximo configurado. Si no tienes stock máximo, usa 4× el mínimo.'],
            ['4. Generar OC', 'Crea una Orden de Compra automáticamente con la cantidad sugerida — revísala y apruébala antes de enviarla al proveedor.'],
            ['5. Reporte de Reposición', 'Vista rápida para imprimir o compartir con Compras/Almacén — solo lo que necesita reponerse ahora, sin abrir Excel.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
              <div className="text-[11px] font-semibold text-[#e8edf2] mb-1.5">{t}</div>
              <div className="text-[11px] text-[#5f6f80] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-white/6 text-[11px] text-[#5f6f80] leading-relaxed">
          <strong className="text-[#9ba8b6]">Consejo:</strong> Configura el Stock Mínimo y Stock Máximo de cada producto en el módulo de Inventario para que estos cálculos sean precisos.
        </div>
      </div>
    </div>
  )
}
