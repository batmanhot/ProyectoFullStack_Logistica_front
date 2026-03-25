/**
 * ContabilidadReportes.jsx — Módulo Contable
 * Para el contador de la empresa.
 *
 * Reportes disponibles:
 *  1. Reporte de Compras  — todas las OC recibidas, con IGV, base imponible, total
 *  2. Reporte de Ventas   — todas las salidas/despachos, con IGV, base imponible, total
 *  3. Libro de Compras    — formato libro contable peruano (RUC proveedor, tipo doc, etc.)
 *  4. Libro de Ventas     — formato libro contable peruano (RUC cliente, tipo doc, etc.)
 *  5. Resumen mensual     — comparativo ingresos vs egresos por mes con IGV separado
 */
import { useState, useMemo } from 'react'
import { Download, FileText, BookOpen, TrendingUp, TrendingDown,
         DollarSign, Calendar, Search, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate } from '../utils/helpers'
import { Btn, Badge } from '../components/ui/index'

const TH = ({c,r})=><th className={`bg-[#1a2230] px-3.5 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] whitespace-nowrap border-b border-white/[0.08] sticky top-0 ${r?'text-right':'text-left'}`}>{c}</th>
const TD = ({c,mono,green,red,bold,r})=><td className={`px-3.5 py-2.5 ${r?'text-right':''} ${mono?'font-mono':''} text-[12px] ${green?'text-green-400':red?'text-red-400':bold?'text-[#e8edf2] font-semibold':'text-[#9ba8b6]'}`}>{c}</td>
const SEL = 'px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[12px] text-[#e8edf2] outline-none focus:border-[#00c896] font-[inherit]'

const IGV_RATE = 0.18

function calcBase(total)  { return total / (1 + IGV_RATE) }
function calcIGV(total)   { return total - calcBase(total) }

// Exportar a CSV simple
function exportCSV(rows, filename) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const a    = document.createElement('a')
  a.href     = URL.createObjectURL(blob)
  a.download = `${filename}_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
}

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function ContabilidadReportes() {
  const { ordenes, movimientos, despachos, proveedores, clientes,
          almacenes, productos, simboloMoneda, config } = useApp()

  const [tab,       setTab]       = useState('compras')
  const [periodo,   setPeriodo]   = useState('all')   // all | mes | año
  const [mesFiltro, setMesFiltro] = useState('')      // YYYY-MM
  const [anioFiltro,setAnioFiltro]= useState('')
  const [busqueda,  setBusqueda]  = useState('')
  const empresa = config?.empresa || 'Distribuidora Lima Norte S.A.C.'
  const rucEmpresa = config?.ruc || '20512345678'

  // ── Años disponibles ──────────────────────────────────
  const aniosDisp = useMemo(() => {
    const set = new Set([
      ...ordenes.map(o => o.fecha?.slice(0,4)),
      ...movimientos.filter(m=>m.tipo==='SALIDA').map(m=>m.fecha?.slice(0,4)),
    ].filter(Boolean))
    return [...set].sort().reverse()
  }, [ordenes, movimientos])

  function filtrarPorPeriodo(items, campoFecha = 'fecha') {
    return items.filter(item => {
      const fecha = item[campoFecha] || item.createdAt?.slice(0,10) || ''
      if (periodo === 'mes'  && mesFiltro)  return fecha.slice(0,7) === mesFiltro
      if (periodo === 'anio' && anioFiltro) return fecha.slice(0,4) === anioFiltro
      return true
    })
  }

  // ── REPORTE DE COMPRAS ────────────────────────────────
  const compras = useMemo(() => {
    let ocs = ordenes.filter(o => o.estado === 'RECIBIDA' || o.estado === 'PARCIAL')
    ocs = filtrarPorPeriodo(ocs)
    if (busqueda) {
      const q = busqueda.toLowerCase()
      ocs = ocs.filter(o => {
        const prov = proveedores.find(p=>p.id===o.proveedorId)
        return o.numero?.toLowerCase().includes(q) || prov?.razonSocial?.toLowerCase().includes(q) || prov?.ruc?.includes(q)
      })
    }
    return ocs.map(oc => {
      const prov     = proveedores.find(p=>p.id===oc.proveedorId)
      const base     = oc.subtotal || calcBase(oc.total || 0)
      const igv      = oc.igv     || calcIGV(oc.total || 0)
      const total    = oc.total   || 0
      return { ...oc, provNombre: prov?.razonSocial||'—', provRUC: prov?.ruc||'—', base, igv, total }
    }).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''))
  }, [ordenes, proveedores, periodo, mesFiltro, anioFiltro, busqueda])

  const totCompras = useMemo(() => ({
    base:  compras.reduce((s,c)=>s+c.base,0),
    igv:   compras.reduce((s,c)=>s+c.igv,0),
    total: compras.reduce((s,c)=>s+c.total,0),
  }), [compras])

  // ── REPORTE DE VENTAS — usa despachos (tienen precio de venta real)
  const ventas = useMemo(() => {
    // Fuente principal: despachos DESPACHADO o ENTREGADO (tienen subtotal, igv, total, precioVenta por ítem)
    let des = despachos.filter(d => ['DESPACHADO','ENTREGADO'].includes(d.estado))
    des = filtrarPorPeriodo(des, 'fecha')
    if (busqueda) {
      const q = busqueda.toLowerCase()
      des = des.filter(d => {
        const cli = clientes.find(c=>c.id===d.clienteId)
        return d.numero?.toLowerCase().includes(q) ||
               d.guiaNumero?.toLowerCase().includes(q) ||
               cli?.razonSocial?.toLowerCase().includes(q)
      })
    }
    return des.map(d => {
      const cli       = clientes.find(c=>c.id===d.clienteId)
      // subtotal e igv ya vienen en el despacho (calculados al crear)
      const subtotal  = d.subtotal  || 0
      const igv       = d.igv       || calcIGV(d.total || 0)
      const total     = d.total     || 0
      // Costo: suma de costoUnitario × cantidad de cada ítem
      const costoTotal = (d.items||[]).reduce((s,it)=>
        s + (it.costoUnitario||0)*(it.cantidad||0), 0)
      const margen = total > 0 ? ((total - costoTotal) / total * 100) : 0
      return {
        documento:   d.numero || d.guiaNumero || '—',
        guia:        d.guiaNumero || '—',
        fecha:       d.fecha,
        cliente:     cli?.razonSocial || '—',
        rucCliente:  cli?.ruc || '—',
        items:       d.items || [],
        base:        subtotal,
        igv,
        total,
        costoTotal,
        margen,
        estado:      d.estado,
      }
    }).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''))
  }, [despachos, clientes, periodo, mesFiltro, anioFiltro, busqueda])

  const totVentas = useMemo(() => ({
    base:   ventas.reduce((s,v)=>s+v.base,0),
    igv:    ventas.reduce((s,v)=>s+v.igv,0),
    total:  ventas.reduce((s,v)=>s+v.total,0),
    costo:  ventas.reduce((s,v)=>s+v.costoTotal,0),
  }), [ventas])

  // ── LIBRO DE COMPRAS ──────────────────────────────────
  const libroCompras = useMemo(() =>
    compras.map((c,i) => ({
      correlativo:  String(i+1).padStart(4,'0'),
      fecha:        c.fecha,
      tipoDoc:      '01', // Factura
      serie:        c.numero?.split('-')[1] || '001',
      numero:       c.numero,
      rucProveedor: c.provRUC,
      proveedor:    c.provNombre,
      baseGravada:  c.base,
      igv:          c.igv,
      total:        c.total,
    }))
  , [compras])

  // ── LIBRO DE VENTAS ───────────────────────────────────
  const libroVentas = useMemo(() =>
    ventas.map((v,i) => ({
      correlativo:  String(i+1).padStart(4,'0'),
      fecha:        v.fecha,
      tipoDoc:      '01',
      numero:       v.documento,
      guia:         v.guia,
      rucCliente:   v.rucCliente || '—',
      cliente:      v.cliente?.slice(0,35) || '—',
      baseGravada:  v.base,
      igv:          v.igv,
      total:        v.total,
    }))
  , [ventas])

  // ── RESUMEN MENSUAL ───────────────────────────────────
  const resumenMensual = useMemo(() => {
    const mapa = {}
    ordenes.filter(o=>['RECIBIDA','PARCIAL'].includes(o.estado)).forEach(o => {
      const key = o.fecha?.slice(0,7) || '0000-00'
      if (!mapa[key]) mapa[key] = { mes:key, compras:0, igvCompras:0, ventas:0, igvVentas:0 }
      mapa[key].compras    += o.subtotal || calcBase(o.total||0)
      mapa[key].igvCompras += o.igv      || calcIGV(o.total||0)
    })
    despachos.filter(d=>['DESPACHADO','ENTREGADO'].includes(d.estado)).forEach(d => {
      const key = d.fecha?.slice(0,7) || '0000-00'
      if (!mapa[key]) mapa[key] = { mes:key, compras:0, igvCompras:0, ventas:0, igvVentas:0 }
      mapa[key].ventas    += d.subtotal || 0
      mapa[key].igvVentas += d.igv || 0
    })
    return Object.values(mapa)
      .sort((a,b)=>b.mes.localeCompare(a.mes))
      .map(r => ({
        ...r,
        mesLabel: (() => {
          const [y,m] = r.mes.split('-')
          return `${MESES[parseInt(m)-1]} ${y}`
        })(),
        saldo: r.ventas - r.compras,
      }))
  }, [ordenes, movimientos, productos])

  // ── Exports CSV ───────────────────────────────────────
  function exportarComprasCSV() {
    const rows = [
      ['REPORTE DE COMPRAS', empresa, rucEmpresa],
      ['N° OC','Fecha','Proveedor','RUC Proveedor','Base Imponible','IGV (18%)','Total'],
      ...compras.map(c=>[c.numero, c.fecha, c.provNombre, c.provRUC,
        c.base.toFixed(2), c.igv.toFixed(2), c.total.toFixed(2)]),
      ['','','','TOTALES', totCompras.base.toFixed(2), totCompras.igv.toFixed(2), totCompras.total.toFixed(2)],
    ]
    exportCSV(rows, 'reporte_compras')
  }

  function exportarVentasCSV() {
    const rows = [
      ['REPORTE DE VENTAS', empresa, rucEmpresa],
      ['N° Despacho','Guía','Fecha','Cliente','Base Imponible','IGV (18%)','Total','Costo','Margen %','Estado'],
      ...ventas.map(v=>[v.documento, v.guia||'—', v.fecha, v.cliente,
        v.base.toFixed(2), v.igv.toFixed(2), v.total.toFixed(2),
        v.costoTotal.toFixed(2), v.margen.toFixed(1)+'%', v.estado]),
      ['','','TOTALES', totVentas.base.toFixed(2), totVentas.igv.toFixed(2), totVentas.total.toFixed(2), totVentas.costo.toFixed(2)],
    ]
    exportCSV(rows, 'reporte_ventas')
  }

  function exportarLibroComprasCSV() {
    const rows = [
      ['LIBRO DE COMPRAS', empresa, rucEmpresa],
      ['Correlativo','Fecha','Tipo Doc','Serie','N° Doc','RUC Proveedor','Proveedor','Base Gravada','IGV','Total'],
      ...libroCompras.map(l=>[l.correlativo,l.fecha,l.tipoDoc,l.serie,l.numero,l.rucProveedor,l.proveedor,
        l.baseGravada.toFixed(2),l.igv.toFixed(2),l.total.toFixed(2)]),
    ]
    exportCSV(rows, 'libro_compras')
  }

  function exportarLibroVentasCSV() {
    const rows = [
      ['LIBRO DE VENTAS', empresa, rucEmpresa],
      ['Correlativo','Fecha','Tipo Doc','N° Despacho','Guía Remisión','RUC Cliente','Cliente','Base Gravada','IGV','Total'],
      ...libroVentas.map(l=>[l.correlativo,l.fecha,l.tipoDoc,l.numero,l.guia||'—',l.rucCliente,l.cliente,
        l.baseGravada.toFixed(2),l.igv.toFixed(2),l.total.toFixed(2)]),
    ]
    exportCSV(rows, 'libro_ventas')
  }

  const TABS_DEF = [
    { id:'compras',      label:'📦 Reporte de Compras' },
    { id:'ventas',       label:'💰 Reporte de Ventas'  },
    { id:'libroCompras', label:'📒 Libro de Compras'   },
    { id:'libroVentas',  label:'📗 Libro de Ventas'    },
    { id:'resumen',      label:'📊 Resumen Mensual'    },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[16px] font-bold text-[#e8edf2] flex items-center gap-2">
            <BookOpen size={18} className="text-[#00c896]"/> Reportes Contables
          </h2>
          <p className="text-[12px] text-[#5f6f80] mt-0.5">
            {empresa} · RUC: {rucEmpresa} · IGV: 18%
          </p>
        </div>
        {/* Filtros de período */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <select className={SEL} value={periodo} onChange={e=>{setPeriodo(e.target.value);setMesFiltro('');setAnioFiltro('')}}>
            <option value="all">Todo el período</option>
            <option value="mes">Por mes</option>
            <option value="anio">Por año</option>
          </select>
          {periodo === 'mes' && (
            <input type="month" className={SEL} value={mesFiltro} onChange={e=>setMesFiltro(e.target.value)}/>
          )}
          {periodo === 'anio' && (
            <select className={SEL} value={anioFiltro} onChange={e=>setAnioFiltro(e.target.value)}>
              <option value="">Seleccionar año</option>
              {aniosDisp.map(a=><option key={a} value={a}>{a}</option>)}
            </select>
          )}
          {(periodo !== 'all' || busqueda) && (
            <button onClick={()=>{setPeriodo('all');setMesFiltro('');setAnioFiltro('');setBusqueda('')}}
              className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-[11px] text-[#5f6f80] hover:text-red-400 border border-white/[0.08] hover:border-red-400/30 transition-all">
              <X size={11}/> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* KPIs resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label:'Total Compras',    val:formatCurrency(totCompras.total,simboloMoneda), sub:`IGV: ${formatCurrency(totCompras.igv,simboloMoneda)}`,  color:'#3b82f6', Icon:TrendingDown },
          { label:'Base Imp. Compras',val:formatCurrency(totCompras.base, simboloMoneda), sub:`${compras.length} OC recibidas`,                        color:'#6366f1', Icon:FileText    },
          { label:'Total Ventas',     val:formatCurrency(totVentas.total, simboloMoneda), sub:`IGV: ${formatCurrency(totVentas.igv,simboloMoneda)}`,   color:'#22c55e', Icon:TrendingUp  },
          { label:'Base Imp. Ventas', val:formatCurrency(totVentas.base,  simboloMoneda), sub:`${ventas.length} documentos`,                           color:'#00c896', Icon:DollarSign  },
        ].map(({label,val,sub,color,Icon})=>(
          <div key={label} className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-4 py-3 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{background:color}}/>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={12} style={{color}} className="opacity-70"/>
              <span className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-wide">{label}</span>
            </div>
            <div className="text-[16px] font-bold font-mono" style={{color}}>{val}</div>
            <div className="text-[10px] text-[#5f6f80] mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-white/[0.08] overflow-x-auto">
        {TABS_DEF.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`px-4 py-2.5 text-[12px] font-medium border-b-2 -mb-px transition-all whitespace-nowrap ${
              tab===t.id?'text-[#00c896] border-[#00c896]':'text-[#5f6f80] border-transparent hover:text-[#9ba8b6]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: REPORTE DE COMPRAS ───────────────────── */}
      {tab === 'compras' && (
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[13px] font-semibold text-[#e8edf2]">Reporte de Compras</div>
              <div className="text-[11px] text-[#5f6f80]">OC en estado Recibida o Parcial · {compras.length} registros</div>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
                <input className="pl-7 pr-3 py-[5px] bg-[#1e2835] border border-white/[0.08] rounded-lg text-[12px] text-[#e8edf2] outline-none focus:border-[#00c896] w-[180px]"
                  placeholder="Buscar OC o proveedor..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
              </div>
              <Btn variant="ghost" size="sm" onClick={exportarComprasCSV}><Download size={12}/> CSV</Btn>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full border-collapse text-[12px]">
              <thead><tr>
                <TH c="N° OC"/><TH c="Fecha"/><TH c="Proveedor"/><TH c="RUC"/><TH c="Items" r/>
                <TH c="Base Imponible" r/><TH c="IGV 18%" r/><TH c="Total" r/><TH c="Estado"/>
              </tr></thead>
              <tbody>
                {compras.length===0 && (
                  <tr><td colSpan={9} className="text-center py-8 text-[#5f6f80] text-[12px]">
                    Sin compras en el período seleccionado
                  </td></tr>
                )}
                {compras.map(c=>(
                  <tr key={c.id} className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02]">
                    <TD c={c.numero} mono green/>
                    <TD c={formatDate(c.fecha)}/>
                    <TD c={c.provNombre} bold/>
                    <TD c={c.provRUC} mono/>
                    <TD c={c.items?.length||0} r/>
                    <TD c={formatCurrency(c.base,simboloMoneda)} mono r/>
                    <TD c={formatCurrency(c.igv,simboloMoneda)} mono r/>
                    <TD c={formatCurrency(c.total,simboloMoneda)} mono bold r/>
                    <td className="px-3.5 py-2.5">
                      <Badge variant={c.estado==='RECIBIDA'?'success':'warning'}>{c.estado}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
              {compras.length>0 && (
                <tfoot><tr className="bg-[#1a2230]">
                  <td colSpan={5} className="px-3.5 py-2.5 text-[11px] font-bold text-[#5f6f80] uppercase">TOTALES — {compras.length} OC</td>
                  <TD c={formatCurrency(totCompras.base, simboloMoneda)} mono bold r/>
                  <TD c={formatCurrency(totCompras.igv,  simboloMoneda)} mono bold r/>
                  <td className="px-3.5 py-2.5 text-right font-mono font-bold text-[14px] text-[#00c896]">{formatCurrency(totCompras.total,simboloMoneda)}</td>
                  <td/>
                </tr></tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: REPORTE DE VENTAS ────────────────────── */}
      {tab === 'ventas' && (
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[13px] font-semibold text-[#e8edf2]">Reporte de Ventas</div>
              <div className="text-[11px] text-[#5f6f80]">Salidas de stock agrupadas por documento · {ventas.length} registros</div>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
                <input className="pl-7 pr-3 py-[5px] bg-[#1e2835] border border-white/[0.08] rounded-lg text-[12px] text-[#e8edf2] outline-none focus:border-[#00c896] w-[180px]"
                  placeholder="Buscar documento..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
              </div>
              <Btn variant="ghost" size="sm" onClick={exportarVentasCSV}><Download size={12}/> CSV</Btn>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full border-collapse text-[12px]">
              <thead><tr>
                <TH c="N° Despacho"/><TH c="Guía"/><TH c="Fecha"/><TH c="Cliente"/><TH c="Ítems" r/>
                <TH c="Base Imponible" r/><TH c="IGV 18%" r/><TH c="Total" r/>
                <TH c="Costo" r/><TH c="Margen" r/><TH c="Estado"/>
              </tr></thead>
              <tbody>
                {ventas.length===0 && (
                  <tr><td colSpan={11} className="text-center py-8 text-[#5f6f80] text-[12px]">
                    Sin ventas despachadas en el período seleccionado
                  </td></tr>
                )}
                {ventas.map((v,i)=>(
                  <tr key={i} className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02]">
                    <TD c={v.documento} mono green/>
                    <TD c={v.guia} mono/>
                    <TD c={formatDate(v.fecha)}/>
                    <td className="px-3.5 py-2.5 text-[12px] text-[#e8edf2] font-medium max-w-[160px] truncate">{v.cliente}</td>
                    <TD c={v.items?.length||0} r/>
                    <TD c={formatCurrency(v.base,simboloMoneda)} mono r/>
                    <TD c={formatCurrency(v.igv,simboloMoneda)} mono r/>
                    <TD c={formatCurrency(v.total,simboloMoneda)} mono bold r/>
                    <TD c={formatCurrency(v.costoTotal,simboloMoneda)} mono r/>
                    <td className="px-3.5 py-2.5 text-right font-mono text-[12px]">
                      <span className={v.margen>=20?'text-green-400':v.margen>=0?'text-amber-400':'text-red-400'}>
                        {v.margen.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <Badge variant={v.estado==='ENTREGADO'?'success':'info'}>{v.estado}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
              {ventas.length>0 && (
                <tfoot><tr className="bg-[#1a2230]">
                  <td colSpan={5} className="px-3.5 py-2.5 text-[11px] font-bold text-[#5f6f80] uppercase">TOTALES — {ventas.length} despachos</td>
                  <TD c={formatCurrency(totVentas.base, simboloMoneda)} mono bold r/>
                  <TD c={formatCurrency(totVentas.igv,  simboloMoneda)} mono bold r/>
                  <td className="px-3.5 py-2.5 text-right font-mono font-bold text-[14px] text-[#00c896]">{formatCurrency(totVentas.total,simboloMoneda)}</td>
                  <TD c={formatCurrency(totVentas.costo,simboloMoneda)} mono bold r/>
                  <td className="px-3.5 py-2.5 text-right font-mono text-[12px]">
                    <span className={totVentas.total>0?(((totVentas.total-totVentas.costo)/totVentas.total*100)>=20?'text-green-400':'text-amber-400'):'text-[#5f6f80]'}>
                      {totVentas.total>0?((totVentas.total-totVentas.costo)/totVentas.total*100).toFixed(1):0}%
                    </span>
                  </td>
                  <td/>
                </tr></tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: LIBRO DE COMPRAS ─────────────────────── */}
      {tab === 'libroCompras' && (
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] font-semibold text-[#e8edf2]">Libro de Compras</div>
              <div className="text-[11px] text-[#5f6f80]">Formato para declaración SUNAT · {libroCompras.length} registros</div>
            </div>
            <Btn variant="primary" size="sm" onClick={exportarLibroComprasCSV}><Download size={12}/> Exportar CSV</Btn>
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full border-collapse text-[12px]">
              <thead><tr>
                <TH c="Correl."/><TH c="Fecha"/><TH c="Tipo"/><TH c="Serie"/><TH c="N° Doc"/>
                <TH c="RUC Proveedor"/><TH c="Proveedor"/>
                <TH c="Base Grav." r/><TH c="IGV" r/><TH c="Total" r/>
              </tr></thead>
              <tbody>
                {libroCompras.map((l,i)=>(
                  <tr key={i} className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02]">
                    <TD c={l.correlativo} mono/>
                    <TD c={formatDate(l.fecha)}/>
                    <TD c={l.tipoDoc} mono/>
                    <TD c={l.serie} mono/>
                    <TD c={l.numero} mono green/>
                    <TD c={l.rucProveedor} mono/>
                    <TD c={l.proveedor} bold/>
                    <TD c={formatCurrency(l.baseGravada,simboloMoneda)} mono r/>
                    <TD c={formatCurrency(l.igv,simboloMoneda)} mono r/>
                    <TD c={formatCurrency(l.total,simboloMoneda)} mono bold r/>
                  </tr>
                ))}
                {libroCompras.length===0 && (
                  <tr><td colSpan={10} className="text-center py-8 text-[#5f6f80] text-[12px]">Sin registros para el período</td></tr>
                )}
              </tbody>
              {libroCompras.length>0 && (
                <tfoot><tr className="bg-[#1a2230]">
                  <td colSpan={7} className="px-3.5 py-2.5 text-[11px] font-bold text-[#5f6f80] uppercase">TOTALES</td>
                  <TD c={formatCurrency(totCompras.base, simboloMoneda)} mono bold r/>
                  <TD c={formatCurrency(totCompras.igv,  simboloMoneda)} mono bold r/>
                  <td className="px-3.5 py-2.5 text-right font-mono font-bold text-[#00c896]">{formatCurrency(totCompras.total,simboloMoneda)}</td>
                </tr></tfoot>
              )}
            </table>
          </div>
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-[11px] text-[#9ba8b6]" style={{background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.20)'}}>
            💡 <span>Exporta a CSV y abre en Excel para generar el PDT 621 o importar al sistema contable. El Tipo Doc <strong className="text-[#e8edf2]">01 = Factura</strong>. Verifica el RUC del proveedor antes de declarar.</span>
          </div>
        </div>
      )}

      {/* ── TAB: LIBRO DE VENTAS ──────────────────────── */}
      {tab === 'libroVentas' && (
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] font-semibold text-[#e8edf2]">Libro de Ventas</div>
              <div className="text-[11px] text-[#5f6f80]">Formato para declaración SUNAT · {libroVentas.length} registros</div>
            </div>
            <Btn variant="primary" size="sm" onClick={exportarLibroVentasCSV}><Download size={12}/> Exportar CSV</Btn>
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full border-collapse text-[12px]">
              <thead><tr>
                <TH c="Correl."/><TH c="Fecha"/><TH c="Tipo"/><TH c="N° Doc"/>
                <TH c="RUC Cliente"/><TH c="Cliente"/><TH c="Guía Remisión"/>
                <TH c="Base Grav." r/><TH c="IGV" r/><TH c="Total" r/>
              </tr></thead>
              <tbody>
                {libroVentas.map((l,i)=>(
                  <tr key={i} className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02]">
                    <TD c={l.correlativo} mono/>
                    <TD c={formatDate(l.fecha)}/>
                    <TD c={l.tipoDoc} mono/>
                    <TD c={l.numero} mono green/>
                    <TD c={l.rucCliente} mono/>
                    <td className="px-3.5 py-2.5 text-[12px] text-[#e8edf2] font-medium max-w-[140px] truncate">{l.cliente}</td>
                    <TD c={l.guia||'—'} mono/>
                    <TD c={formatCurrency(l.baseGravada,simboloMoneda)} mono r/>
                    <TD c={formatCurrency(l.igv,simboloMoneda)} mono r/>
                    <TD c={formatCurrency(l.total,simboloMoneda)} mono bold r/>
                  </tr>
                ))}
                {libroVentas.length===0 && (
                  <tr><td colSpan={9} className="text-center py-8 text-[#5f6f80] text-[12px]">Sin registros para el período</td></tr>
                )}
              </tbody>
              {libroVentas.length>0 && (
                <tfoot><tr className="bg-[#1a2230]">
                  <td colSpan={7} className="px-3.5 py-2.5 text-[11px] font-bold text-[#5f6f80] uppercase">TOTALES</td>
                  <TD c={formatCurrency(totVentas.base,simboloMoneda)} mono bold r/>
                  <TD c={formatCurrency(totVentas.igv, simboloMoneda)} mono bold r/>
                  <td className="px-3.5 py-2.5 text-right font-mono font-bold text-[#00c896]">{formatCurrency(totVentas.total,simboloMoneda)}</td>
                </tr></tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: RESUMEN MENSUAL ──────────────────────── */}
      {tab === 'resumen' && (
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] font-semibold text-[#e8edf2]">Resumen Mensual Compras vs Ventas</div>
              <div className="text-[11px] text-[#5f6f80]">Base imponible + IGV desglosado por mes</div>
            </div>
            <Btn variant="ghost" size="sm" onClick={()=>{
              const rows=[['Mes','Base Compras','IGV Compras','Total Compras','Base Ventas','IGV Ventas','Total Ventas','Saldo'],
                ...resumenMensual.map(r=>[r.mesLabel,r.compras.toFixed(2),r.igvCompras.toFixed(2),(r.compras+r.igvCompras).toFixed(2),r.ventas.toFixed(2),r.igvVentas.toFixed(2),(r.ventas+r.igvVentas).toFixed(2),r.saldo.toFixed(2)])]
              exportCSV(rows,'resumen_mensual')
            }}><Download size={12}/> CSV</Btn>
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full border-collapse text-[12px]">
              <thead><tr>
                <TH c="Mes"/>
                <TH c="Base Compras" r/><TH c="IGV Compras" r/><TH c="Total Compras" r/>
                <TH c="Base Ventas" r/><TH c="IGV Ventas" r/><TH c="Total Ventas" r/>
                <TH c="Saldo" r/>
              </tr></thead>
              <tbody>
                {resumenMensual.map((r,i)=>(
                  <tr key={i} className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02]">
                    <td className="px-3.5 py-2.5 text-[12px] font-semibold text-[#e8edf2]">{r.mesLabel}</td>
                    <TD c={formatCurrency(r.compras,simboloMoneda)} mono r/>
                    <TD c={formatCurrency(r.igvCompras,simboloMoneda)} mono r/>
                    <TD c={formatCurrency(r.compras+r.igvCompras,simboloMoneda)} mono bold r/>
                    <TD c={formatCurrency(r.ventas,simboloMoneda)} mono r/>
                    <TD c={formatCurrency(r.igvVentas,simboloMoneda)} mono r/>
                    <TD c={formatCurrency(r.ventas+r.igvVentas,simboloMoneda)} mono bold r/>
                    <td className="px-3.5 py-2.5 text-right font-mono text-[12px] font-bold">
                      <span className={r.saldo>=0?'text-green-400':'text-red-400'}>
                        {r.saldo>=0?'+':''}{formatCurrency(r.saldo,simboloMoneda)}
                      </span>
                    </td>
                  </tr>
                ))}
                {resumenMensual.length===0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-[#5f6f80] text-[12px]">Sin datos disponibles</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label:'Total acum. compras', val:formatCurrency(resumenMensual.reduce((s,r)=>s+r.compras+r.igvCompras,0),simboloMoneda), color:'#3b82f6' },
              { label:'Total acum. ventas',  val:formatCurrency(resumenMensual.reduce((s,r)=>s+r.ventas+r.igvVentas,0),simboloMoneda),  color:'#22c55e' },
              { label:'IGV neto (Ventas−Compras)', val:formatCurrency(resumenMensual.reduce((s,r)=>s+r.igvVentas-r.igvCompras,0),simboloMoneda), color:'#f59e0b' },
            ].map(({label,val,color})=>(
              <div key={label} className="bg-[#1a2230] rounded-xl px-4 py-3 border border-white/[0.08]">
                <div className="text-[10px] text-[#5f6f80] uppercase tracking-wide mb-1">{label}</div>
                <div className="text-[15px] font-bold font-mono" style={{color}}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
