/**
 * ContabilidadReportes.jsx — Módulo Contable
 *
 * Reportes disponibles:
 *  1. Reporte de Compras  — todas las OC recibidas, con IGV, base imponible, total
 *  2. Reporte de Ventas   — todas las salidas/despachos, con IGV, base imponible, total
 *  3. Libro de Compras    — formato libro contable peruano (RUC proveedor, tipo doc, etc.)
 *  4. Libro de Ventas     — formato libro contable peruano (RUC cliente, tipo doc, etc.)
 *  5. Resumen mensual     — comparativo ingresos vs egresos por mes con IGV separado
 */
import { useState, useMemo } from 'react'
import { Download, FileText, TrendingUp, TrendingDown,
         DollarSign, Search, X } from 'lucide-react'
import { formatCurrency, formatDate } from '../utils/helpers'
import { Btn, Badge, Select, Input, DataTable } from '../components/ui/index'
import { useOrdenesCompraList } from '../queries/ordenes-compra.queries'
import { useDespachosList } from '../queries/despachos.queries'
import { useProveedoresList } from '../queries/proveedores.queries'
import { useClientesList } from '../queries/clientes.queries'
import { useConfiguracion } from '../queries/configuracion.queries'

const simboloMoneda = 'S/'
const IGV_RATE = 0.18

function calcBase(total)  { return total / (1 + IGV_RATE) }
function calcIGV(total)   { return total - calcBase(total) }

function exportCSV(rows, filename) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const a    = document.createElement('a')
  a.href     = URL.createObjectURL(blob)
  a.download = `${filename}_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
}

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function ContabilidadReportes() {
  const { data: config      = {} } = useConfiguracion()
  const { data: ordenes     = [] } = useOrdenesCompraList()
  const { data: despachos   = [] } = useDespachosList()
  const { data: proveedores = [] } = useProveedoresList()
  const { data: clientes    = [] } = useClientesList()

  const empresa    = config?.nombre   ?? '—'
  const rucEmpresa = config?.ruc      ?? '—'

  const [tab,       setTab]       = useState('compras')
  const [periodo,   setPeriodo]   = useState('all')
  const [mesFiltro, setMesFiltro] = useState('')
  const [anioFiltro,setAnioFiltro]= useState('')
  const [busqueda,  setBusqueda]  = useState('')

  // ── Años disponibles ──────────────────────────────────
  const aniosDisp = useMemo(() => {
    const set = new Set([
      ...ordenes.map(o => o.fecha?.slice(0,4)),
      ...despachos.map(d => d.fecha?.slice(0,4)),
    ].filter(Boolean))
    return [...set].sort().reverse()
  }, [ordenes, despachos])

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
      const prov  = proveedores.find(p=>p.id===oc.proveedorId)
      const total = Number(oc.total)    || 0
      const base  = Number(oc.subtotal) || calcBase(total)
      const igv   = Number(oc.igv)      || calcIGV(total)
      return { ...oc, provNombre: prov?.razonSocial||'—', provRUC: prov?.ruc||'—', base, igv, total }
    }).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||''))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordenes, proveedores, periodo, mesFiltro, anioFiltro, busqueda])

  const totCompras = useMemo(() => ({
    base:  compras.reduce((s,c)=>s+c.base,0),
    igv:   compras.reduce((s,c)=>s+c.igv,0),
    total: compras.reduce((s,c)=>s+c.total,0),
  }), [compras])

  // ── REPORTE DE VENTAS ─────────────────────────────────
  const ventas = useMemo(() => {
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
      const cli      = clientes.find(c=>c.id===d.clienteId)
      const total    = Number(d.total)    || 0
      const subtotal = Number(d.subtotal) || calcBase(total)
      const igv      = Number(d.igv)      || calcIGV(total)
      const costoTotal = (d.items||[]).reduce((s,it)=>
        s + (Number(it.costoUnitario)||0)*(Number(it.cantidad)||0), 0)
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      tipoDoc:      '01',
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
  // Deriva de `compras`/`ventas` (ya filtrados por período/búsqueda y con las
  // mismas fórmulas de base/IGV que el resto del módulo) en vez de releer
  // `ordenes`/`despachos` crudos — así el resumen SIEMPRE coincide con las
  // demás pestañas y cards, incluso al aplicar un filtro de período.
  const resumenMensual = useMemo(() => {
    const mapa = {}
    compras.forEach(c => {
      const key = c.fecha?.slice(0,7) || '0000-00'
      if (!mapa[key]) mapa[key] = { mes:key, compras:0, igvCompras:0, totalCompras:0, ventas:0, igvVentas:0, totalVentas:0 }
      mapa[key].compras      += c.base
      mapa[key].igvCompras   += c.igv
      mapa[key].totalCompras += c.total
    })
    ventas.forEach(v => {
      const key = v.fecha?.slice(0,7) || '0000-00'
      if (!mapa[key]) mapa[key] = { mes:key, compras:0, igvCompras:0, totalCompras:0, ventas:0, igvVentas:0, totalVentas:0 }
      mapa[key].ventas      += v.base
      mapa[key].igvVentas   += v.igv
      mapa[key].totalVentas += v.total
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
  }, [compras, ventas])

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
    { id:'compras',      label:'Reporte de Compras' },
    { id:'ventas',       label:'Reporte de Ventas'  },
    { id:'libroCompras', label:'Libro de Compras'   },
    { id:'libroVentas',  label:'Libro de Ventas'    },
    { id:'resumen',      label:'Resumen Mensual'    },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      {/* Meta + filtros de período */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="text-[12px] text-[#5f6f80]">
          {empresa} · RUC: {rucEmpresa} · IGV: 18%
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Select className="w-auto!" value={periodo} onChange={e=>{setPeriodo(e.target.value);setMesFiltro('');setAnioFiltro('')}}>
            <option value="all">Todo el período</option>
            <option value="mes">Por mes</option>
            <option value="anio">Por año</option>
          </Select>
          {periodo === 'mes' && (
            <Input type="month" className="w-auto!" value={mesFiltro} onChange={e=>setMesFiltro(e.target.value)}/>
          )}
          {periodo === 'anio' && (
            <Select className="w-auto!" value={anioFiltro} onChange={e=>setAnioFiltro(e.target.value)}>
              <option value="">Seleccionar año</option>
              {aniosDisp.map(a=><option key={a} value={a}>{a}</option>)}
            </Select>
          )}
          {(periodo !== 'all' || busqueda) && (
            <button onClick={()=>{setPeriodo('all');setMesFiltro('');setAnioFiltro('');setBusqueda('')}}
              className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-[11px] text-[#5f6f80] hover:text-red-400 border border-white/8 hover:border-red-400/30 transition-all">
              <X size={11}/> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* KPIs resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label:'Total Compras',    val:formatCurrency(totCompras.total,simboloMoneda), sub:`IGV: ${formatCurrency(totCompras.igv,simboloMoneda)}`,  color:'#3b82f6', Icon:TrendingDown },
          { label:'Base Imp. Compras',val:formatCurrency(totCompras.base, simboloMoneda), sub:`${compras.length} OC recibidas`,                        color:'#6366f1', Icon:FileText    },
          { label:'Total Ventas',     val:formatCurrency(totVentas.total, simboloMoneda), sub:`IGV: ${formatCurrency(totVentas.igv,simboloMoneda)}`,   color:'#22c55e', Icon:TrendingUp  },
          { label:'Base Imp. Ventas', val:formatCurrency(totVentas.base,  simboloMoneda), sub:`${ventas.length} documentos`,                           color:'#00c896', Icon:DollarSign  },
        ].map(({label,val,sub,color,Icon})=>(
          <div key={label} className="relative bg-[#161d28] border border-white/8 rounded-xl px-4 py-3 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.75 rounded-t-xl" style={{background:color}}/>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={12} style={{color}} className="opacity-70"/>
              <span className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-wide">{label}</span>
            </div>
            <div className="text-[17px] font-semibold font-mono" style={{color}}>{val}</div>
            <div className="text-[10px] text-[#5f6f80] mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-white/8 overflow-x-auto">
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
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[13px] font-semibold text-[#e8edf2]">Reporte de Compras</div>
              <div className="text-[11px] text-[#5f6f80]">OC en estado Recibida o Parcial · {compras.length} registros</div>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
                <input className="pl-7 pr-3 py-[5px] bg-[#1e2835] border border-white/8 rounded-lg text-[12px] text-[#e8edf2] outline-none focus:border-[#00c896] w-[180px]"
                  placeholder="Buscar OC o proveedor..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
              </div>
              <Btn variant="ghost" size="sm" onClick={exportarComprasCSV}><Download size={12}/> CSV</Btn>
            </div>
          </div>

          <DataTable
            rows={compras}
            rowKey={c => c.id}
            emptyTitle="Sin compras en el período seleccionado"
            columns={[
              { key: 'numero', header: 'N° OC', render: c => <span className="font-mono text-[12px] text-green-400">{c.numero}</span> },
              { key: 'fecha', header: 'Fecha', render: c => <span className="text-[12px] text-[#9ba8b6]">{formatDate(c.fecha)}</span> },
              { key: 'proveedor', header: 'Proveedor', render: c => <span className="text-[12px] text-[#e8edf2] font-semibold">{c.provNombre}</span> },
              { key: 'ruc', header: 'RUC', render: c => <span className="font-mono text-[12px] text-[#9ba8b6]">{c.provRUC}</span> },
              { key: 'items', header: 'Items', align: 'right', render: c => <span className="text-[12px] text-[#9ba8b6]">{c.items?.length||0}</span> },
              { key: 'base', header: 'Base Imponible', align: 'right', render: c => <span className="font-mono text-[12px] text-[#9ba8b6]">{formatCurrency(c.base,simboloMoneda)}</span> },
              { key: 'igv', header: 'IGV 18%', align: 'right', render: c => <span className="font-mono text-[12px] text-[#9ba8b6]">{formatCurrency(c.igv,simboloMoneda)}</span> },
              { key: 'total', header: 'Total', align: 'right', render: c => <span className="font-mono text-[12px] text-[#e8edf2] font-semibold">{formatCurrency(c.total,simboloMoneda)}</span> },
              { key: 'estado', header: 'Estado', render: c => <Badge variant={c.estado==='RECIBIDA'?'success':'warning'}>{c.estado}</Badge> },
            ]}
            footerRow={compras.length>0 ? [
              <span className="text-[11px] font-bold text-[#5f6f80] uppercase">TOTALES — {compras.length} OC</span>,
              null, null, null, null,
              <span className="font-mono">{formatCurrency(totCompras.base, simboloMoneda)}</span>,
              <span className="font-mono">{formatCurrency(totCompras.igv, simboloMoneda)}</span>,
              <span className="font-mono text-[14px] text-[#00c896]">{formatCurrency(totCompras.total,simboloMoneda)}</span>,
              null,
            ] : undefined}
          />
        </div>
      )}

      {/* ── TAB: REPORTE DE VENTAS ────────────────────── */}
      {tab === 'ventas' && (
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[13px] font-semibold text-[#e8edf2]">Reporte de Ventas</div>
              <div className="text-[11px] text-[#5f6f80]">Despachos despachados o entregados · {ventas.length} registros</div>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
                <input className="pl-7 pr-3 py-[5px] bg-[#1e2835] border border-white/8 rounded-lg text-[12px] text-[#e8edf2] outline-none focus:border-[#00c896] w-[180px]"
                  placeholder="Buscar documento..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
              </div>
              <Btn variant="ghost" size="sm" onClick={exportarVentasCSV}><Download size={12}/> CSV</Btn>
            </div>
          </div>

          <DataTable
            rows={ventas}
            rowKey={v => `${v.documento}-${v.guia}-${v.fecha}`}
            emptyTitle="Sin ventas despachadas en el período seleccionado"
            columns={[
              { key: 'documento', header: 'N° Despacho', render: v => <span className="font-mono text-[12px] text-green-400">{v.documento}</span> },
              { key: 'guia', header: 'Guía', render: v => <span className="font-mono text-[12px] text-[#9ba8b6]">{v.guia}</span> },
              { key: 'fecha', header: 'Fecha', render: v => <span className="text-[12px] text-[#9ba8b6]">{formatDate(v.fecha)}</span> },
              { key: 'cliente', header: 'Cliente', render: v => <span className="text-[12px] text-[#e8edf2] font-medium max-w-40 truncate block">{v.cliente}</span> },
              { key: 'items', header: 'Ítems', align: 'right', render: v => <span className="text-[12px] text-[#9ba8b6]">{v.items?.length||0}</span> },
              { key: 'base', header: 'Base Imponible', align: 'right', render: v => <span className="font-mono text-[12px] text-[#9ba8b6]">{formatCurrency(v.base,simboloMoneda)}</span> },
              { key: 'igv', header: 'IGV 18%', align: 'right', render: v => <span className="font-mono text-[12px] text-[#9ba8b6]">{formatCurrency(v.igv,simboloMoneda)}</span> },
              { key: 'total', header: 'Total', align: 'right', render: v => <span className="font-mono text-[12px] text-[#e8edf2] font-semibold">{formatCurrency(v.total,simboloMoneda)}</span> },
              { key: 'costo', header: 'Costo', align: 'right', render: v => <span className="font-mono text-[12px] text-[#9ba8b6]">{formatCurrency(v.costoTotal,simboloMoneda)}</span> },
              { key: 'margen', header: 'Margen', align: 'right', render: v => (
                  <span className={`font-mono text-[12px] ${v.margen>=20?'text-green-400':v.margen>=0?'text-amber-400':'text-red-400'}`}>
                    {v.margen.toFixed(1)}%
                  </span>
                ) },
              { key: 'estado', header: 'Estado', render: v => <Badge variant={v.estado==='ENTREGADO'?'success':'info'}>{v.estado}</Badge> },
            ]}
            footerRow={ventas.length>0 ? [
              <span className="text-[11px] font-bold text-[#5f6f80] uppercase">TOTALES — {ventas.length} despachos</span>,
              null, null, null, null,
              <span className="font-mono">{formatCurrency(totVentas.base, simboloMoneda)}</span>,
              <span className="font-mono">{formatCurrency(totVentas.igv, simboloMoneda)}</span>,
              <span className="font-mono text-[14px] text-[#00c896]">{formatCurrency(totVentas.total,simboloMoneda)}</span>,
              <span className="font-mono">{formatCurrency(totVentas.costo,simboloMoneda)}</span>,
              <span className={totVentas.total>0?(((totVentas.total-totVentas.costo)/totVentas.total*100)>=20?'text-green-400':'text-amber-400'):'text-[#5f6f80]'}>
                {totVentas.total>0?((totVentas.total-totVentas.costo)/totVentas.total*100).toFixed(1):0}%
              </span>,
              null,
            ] : undefined}
          />
        </div>
      )}

      {/* ── TAB: LIBRO DE COMPRAS ─────────────────────── */}
      {tab === 'libroCompras' && (
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] font-semibold text-[#e8edf2]">Libro de Compras</div>
              <div className="text-[11px] text-[#5f6f80]">Formato para declaración SUNAT · {libroCompras.length} registros</div>
            </div>
            <Btn variant="primary" size="sm" onClick={exportarLibroComprasCSV}><Download size={12}/> Exportar CSV</Btn>
          </div>
          <DataTable
            rows={libroCompras}
            rowKey={l => l.correlativo}
            emptyTitle="Sin registros para el período"
            columns={[
              { key: 'correlativo', header: 'Correl.', render: l => <span className="font-mono text-[12px] text-[#9ba8b6]">{l.correlativo}</span> },
              { key: 'fecha', header: 'Fecha', render: l => <span className="text-[12px] text-[#9ba8b6]">{formatDate(l.fecha)}</span> },
              { key: 'tipoDoc', header: 'Tipo', render: l => <span className="font-mono text-[12px] text-[#9ba8b6]">{l.tipoDoc}</span> },
              { key: 'serie', header: 'Serie', render: l => <span className="font-mono text-[12px] text-[#9ba8b6]">{l.serie}</span> },
              { key: 'numero', header: 'N° Doc', render: l => <span className="font-mono text-[12px] text-green-400">{l.numero}</span> },
              { key: 'rucProveedor', header: 'RUC Proveedor', render: l => <span className="font-mono text-[12px] text-[#9ba8b6]">{l.rucProveedor}</span> },
              { key: 'proveedor', header: 'Proveedor', render: l => <span className="text-[12px] text-[#e8edf2] font-semibold">{l.proveedor}</span> },
              { key: 'base', header: 'Base Grav.', align: 'right', render: l => <span className="font-mono text-[12px] text-[#9ba8b6]">{formatCurrency(l.baseGravada,simboloMoneda)}</span> },
              { key: 'igv', header: 'IGV', align: 'right', render: l => <span className="font-mono text-[12px] text-[#9ba8b6]">{formatCurrency(l.igv,simboloMoneda)}</span> },
              { key: 'total', header: 'Total', align: 'right', render: l => <span className="font-mono text-[12px] text-[#e8edf2] font-semibold">{formatCurrency(l.total,simboloMoneda)}</span> },
            ]}
            footerRow={libroCompras.length>0 ? [
              <span className="text-[11px] font-bold text-[#5f6f80] uppercase">TOTALES</span>,
              null, null, null, null, null, null,
              <span className="font-mono">{formatCurrency(totCompras.base, simboloMoneda)}</span>,
              <span className="font-mono">{formatCurrency(totCompras.igv, simboloMoneda)}</span>,
              <span className="font-mono text-[#00c896]">{formatCurrency(totCompras.total,simboloMoneda)}</span>,
            ] : undefined}
          />
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-[11px] text-[#9ba8b6]" style={{background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.20)'}}>
            <span>Exporta a CSV y abre en Excel para generar el PDT 621 o importar al sistema contable. El Tipo Doc <strong className="text-[#e8edf2]">01 = Factura</strong>. Verifica el RUC del proveedor antes de declarar.</span>
          </div>
        </div>
      )}

      {/* ── TAB: LIBRO DE VENTAS ──────────────────────── */}
      {tab === 'libroVentas' && (
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] font-semibold text-[#e8edf2]">Libro de Ventas</div>
              <div className="text-[11px] text-[#5f6f80]">Formato para declaración SUNAT · {libroVentas.length} registros</div>
            </div>
            <Btn variant="primary" size="sm" onClick={exportarLibroVentasCSV}><Download size={12}/> Exportar CSV</Btn>
          </div>
          <DataTable
            rows={libroVentas}
            rowKey={l => l.correlativo}
            emptyTitle="Sin registros para el período"
            columns={[
              { key: 'correlativo', header: 'Correl.', render: l => <span className="font-mono text-[12px] text-[#9ba8b6]">{l.correlativo}</span> },
              { key: 'fecha', header: 'Fecha', render: l => <span className="text-[12px] text-[#9ba8b6]">{formatDate(l.fecha)}</span> },
              { key: 'tipoDoc', header: 'Tipo', render: l => <span className="font-mono text-[12px] text-[#9ba8b6]">{l.tipoDoc}</span> },
              { key: 'numero', header: 'N° Doc', render: l => <span className="font-mono text-[12px] text-green-400">{l.numero}</span> },
              { key: 'rucCliente', header: 'RUC Cliente', render: l => <span className="font-mono text-[12px] text-[#9ba8b6]">{l.rucCliente}</span> },
              { key: 'cliente', header: 'Cliente', render: l => <span className="text-[12px] text-[#e8edf2] font-medium max-w-36 truncate block">{l.cliente}</span> },
              { key: 'guia', header: 'Guía Remisión', render: l => <span className="font-mono text-[12px] text-[#9ba8b6]">{l.guia||'—'}</span> },
              { key: 'base', header: 'Base Grav.', align: 'right', render: l => <span className="font-mono text-[12px] text-[#9ba8b6]">{formatCurrency(l.baseGravada,simboloMoneda)}</span> },
              { key: 'igv', header: 'IGV', align: 'right', render: l => <span className="font-mono text-[12px] text-[#9ba8b6]">{formatCurrency(l.igv,simboloMoneda)}</span> },
              { key: 'total', header: 'Total', align: 'right', render: l => <span className="font-mono text-[12px] text-[#e8edf2] font-semibold">{formatCurrency(l.total,simboloMoneda)}</span> },
            ]}
            footerRow={libroVentas.length>0 ? [
              <span className="text-[11px] font-bold text-[#5f6f80] uppercase">TOTALES</span>,
              null, null, null, null, null, null,
              <span className="font-mono">{formatCurrency(totVentas.base, simboloMoneda)}</span>,
              <span className="font-mono">{formatCurrency(totVentas.igv, simboloMoneda)}</span>,
              <span className="font-mono text-[#00c896]">{formatCurrency(totVentas.total,simboloMoneda)}</span>,
            ] : undefined}
          />
        </div>
      )}

      {/* ── TAB: RESUMEN MENSUAL ──────────────────────── */}
      {tab === 'resumen' && (
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-5 flex flex-col gap-4">
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
          <DataTable
            rows={resumenMensual}
            rowKey={r => r.mes}
            emptyTitle="Sin datos disponibles"
            columns={[
              { key: 'mes', header: 'Mes', render: r => <span className="text-[12px] font-semibold text-[#e8edf2]">{r.mesLabel}</span> },
              { key: 'compras', header: 'Base Compras', align: 'right', render: r => <span className="font-mono text-[12px] text-[#9ba8b6]">{formatCurrency(r.compras,simboloMoneda)}</span> },
              { key: 'igvCompras', header: 'IGV Compras', align: 'right', render: r => <span className="font-mono text-[12px] text-[#9ba8b6]">{formatCurrency(r.igvCompras,simboloMoneda)}</span> },
              { key: 'totalCompras', header: 'Total Compras', align: 'right', render: r => <span className="font-mono text-[12px] text-[#e8edf2] font-semibold">{formatCurrency(r.totalCompras,simboloMoneda)}</span> },
              { key: 'ventas', header: 'Base Ventas', align: 'right', render: r => <span className="font-mono text-[12px] text-[#9ba8b6]">{formatCurrency(r.ventas,simboloMoneda)}</span> },
              { key: 'igvVentas', header: 'IGV Ventas', align: 'right', render: r => <span className="font-mono text-[12px] text-[#9ba8b6]">{formatCurrency(r.igvVentas,simboloMoneda)}</span> },
              { key: 'totalVentas', header: 'Total Ventas', align: 'right', render: r => <span className="font-mono text-[12px] text-[#e8edf2] font-semibold">{formatCurrency(r.totalVentas,simboloMoneda)}</span> },
              { key: 'saldo', header: 'Saldo', align: 'right', render: r => (
                  <span className={`font-mono text-[12px] font-bold ${r.saldo>=0?'text-green-400':'text-red-400'}`}>
                    {r.saldo>=0?'+':''}{formatCurrency(r.saldo,simboloMoneda)}
                  </span>
                ) },
            ]}
          />
          <div className="grid grid-cols-3 gap-3">
            {[
              { label:'Total acum. compras', val:formatCurrency(resumenMensual.reduce((s,r)=>s+r.totalCompras,0),simboloMoneda), color:'#3b82f6' },
              { label:'Total acum. ventas',  val:formatCurrency(resumenMensual.reduce((s,r)=>s+r.totalVentas,0),simboloMoneda),  color:'#22c55e' },
              { label:'IGV neto (Ventas−Compras)', val:formatCurrency(resumenMensual.reduce((s,r)=>s+r.igvVentas-r.igvCompras,0),simboloMoneda), color:'#f59e0b' },
            ].map(({label,val,color})=>(
              <div key={label} className="bg-[#1a2230] rounded-xl px-4 py-3 border border-white/8">
                <div className="text-[10px] text-[#5f6f80] uppercase tracking-wide mb-1">{label}</div>
                <div className="text-[17px] font-semibold font-mono" style={{color}}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Guía de uso */}
      <div className="bg-[#161d28] border border-white/6 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          ¿Cómo funciona el módulo de Reportes Contables?
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { t:'Reporte de Compras / Ventas', d:'Lista las OC recibidas y los despachos entregados con su base imponible, IGV (18%) y total — la fuente de datos de todo el módulo.' },
            { t:'Libro de Compras / Ventas', d:'Formato listo para declaración SUNAT (PDT 621): correlativo, tipo de documento, RUC y montos desglosados por operación.' },
            { t:'Resumen Mensual', d:'Compara compras vs. ventas mes a mes, con el saldo (ventas − compras) y el IGV neto a pagar o a favor.' },
            { t:'Filtro de período', d:'Filtra por mes o año específico para declarar un período tributario puntual, o deja "Todo el período" para ver el histórico completo.' },
            { t:'Exportar a CSV', d:'Cada pestaña exporta su tabla a CSV, lista para abrir en Excel o importar al sistema contable / PDT 621.' },
          ].map(({t,d}) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
              <div className="text-[12px] font-semibold text-[#e8edf2] mb-1">{t}</div>
              <div className="text-[11px] text-[#9ba8b6] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
