import { useState, useMemo } from 'react'
import { Search, Download, Boxes, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate } from '../utils/helpers'
import { EmptyState, Badge, Btn } from '../components/ui/index'

const TH=({c,r})=><th className={`bg-[#1a2230] px-3.5 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] whitespace-nowrap border-b border-white/[0.08] sticky top-0 ${r?'text-right':'text-left'}`}>{c}</th>
const SI='px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit] placeholder-[#5f6f80]'
const SEL=SI+' pr-8'

export default function Movimientos() {
  const { movimientos, productos, almacenes, simboloMoneda } = useApp()
  const [busqueda,setBusqueda]=useState('')
  const [filtTipo,setFiltTipo]=useState('')
  const [filtAlm,setFiltAlm]=useState('')
  const [filtDesde,setFiltDesde]=useState('')
  const [filtHasta,setFiltHasta]=useState('')

  const filtered=useMemo(()=>{
    let d=[...movimientos]
    if(filtTipo) d=d.filter(m=>m.tipo===filtTipo)
    if(filtAlm)  d=d.filter(m=>m.almacenId===filtAlm)
    if(filtDesde)d=d.filter(m=>m.fecha>=filtDesde)
    if(filtHasta)d=d.filter(m=>m.fecha<=filtHasta)
    if(busqueda){const q=busqueda.toLowerCase();d=d.filter(m=>{const p=productos.find(x=>x.id===m.productoId);return p?.nombre.toLowerCase().includes(q)||p?.sku.toLowerCase().includes(q)||m.documento?.toLowerCase().includes(q)||m.motivo?.toLowerCase().includes(q)})}
    return d
  },[movimientos,filtTipo,filtAlm,filtDesde,filtHasta,busqueda,productos])

  const totales=useMemo(()=>({
    entradas:filtered.filter(m=>m.tipo==='ENTRADA').reduce((s,m)=>s+m.costoTotal,0),
    salidas: filtered.filter(m=>m.tipo==='SALIDA').reduce((s,m)=>s+m.costoTotal,0),
    count:   filtered.length,
  }),[filtered])

  function exportCSV(){
    const rows=[['Fecha','Tipo','Documento','Producto','SKU','Cantidad','Costo Unit.','Costo Total','Motivo','Lote']]
    filtered.forEach(m=>{const p=productos.find(x=>x.id===m.productoId);rows.push([m.fecha,m.tipo,m.documento||'',p?.nombre||'',p?.sku||'',m.cantidad,m.costoUnitario,m.costoTotal,m.motivo||'',m.lote||''])})
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'}));a.download=`movimientos_${new Date().toISOString().split('T')[0]}.csv`;a.click()
  }

  return(
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-3.5">
        {[['Entradas (filtradas)',formatCurrency(totales.entradas,simboloMoneda),'#22c55e'],['Salidas (filtradas)',formatCurrency(totales.salidas,simboloMoneda),'#ef4444'],['Movimientos',totales.count,'#3b82f6']].map(([l,v,c])=>(
          <div key={l} className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{background:c}}/>
            <div className="text-[11px] text-[#5f6f80] uppercase tracking-[0.05em] mb-2">{l}</div>
            <div className="text-[18px] font-semibold text-[#e8edf2] font-mono">{v}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Historial de Movimientos</span>
          <Btn variant="secondary" size="sm" onClick={exportCSV}><Download size={13}/>Exportar CSV</Btn>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <input className={SI+' pl-8 w-full'} placeholder="Buscar..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
          </div>
          <select className={SEL} style={{width:140}} value={filtTipo} onChange={e=>setFiltTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            {['ENTRADA','SALIDA','AJUSTE','TRANSFERENCIA'].map(t=><option key={t}>{t}</option>)}
          </select>
          <select className={SEL} style={{width:160}} value={filtAlm} onChange={e=>setFiltAlm(e.target.value)}>
            <option value="">Todos los almacenes</option>
            {almacenes.map(a=><option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
          <input type="date" className={SI} style={{width:140}} value={filtDesde} onChange={e=>setFiltDesde(e.target.value)}/>
          <input type="date" className={SI} style={{width:140}} value={filtHasta} onChange={e=>setFiltHasta(e.target.value)}/>
          {(busqueda||filtTipo||filtAlm||filtDesde||filtHasta)&&<Btn variant="ghost" size="sm" onClick={()=>{setBusqueda('');setFiltTipo('');setFiltAlm('');setFiltDesde('');setFiltHasta('')}}>Limpiar</Btn>}
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr><TH c="Fecha"/><TH c="Tipo"/><TH c="Documento"/><TH c="Producto"/><TH c="Almacén"/><TH c="Cantidad" r/><TH c="Costo Unit." r/><TH c="Total" r/><TH c="Lote"/><TH c="Motivo"/></tr></thead>
            <tbody>
              {filtered.length===0&&<tr><td colSpan={10}><EmptyState icon={Boxes} title="Sin movimientos" description="No hay movimientos con los filtros actuales."/></td></tr>}
              {filtered.map(m=>{
                const p=productos.find(x=>x.id===m.productoId)
                const alm=almacenes.find(a=>a.id===m.almacenId)
                const varB=m.tipo==='ENTRADA'?'success':m.tipo==='SALIDA'?'danger':m.tipo==='AJUSTE'?'info':'neutral'
                return(
                  <tr key={m.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]">
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{formatDate(m.fecha)}</td>
                    <td className="px-3.5 py-2.5"><Badge variant={varB}>{m.tipo==='ENTRADA'?<ArrowDownToLine size={10}/>:m.tipo==='SALIDA'?<ArrowUpFromLine size={10}/>:null}{m.tipo}</Badge></td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#00c896]">{m.documento||'—'}</td>
                    <td className="px-3.5 py-2.5"><div className="font-medium">{p?.nombre||'—'}</div><div className="text-[11px] text-[#5f6f80]">{p?.sku}</div></td>
                    <td className="px-3.5 py-2.5 text-[12px] text-[#9ba8b6]">{alm?.nombre||'—'}</td>
                    <td className={`px-3.5 py-2.5 font-mono text-[12px] text-right ${m.tipo==='ENTRADA'?'text-green-400':'text-red-400'}`}>{m.tipo==='ENTRADA'?'+':'-'}{m.cantidad} <span className="text-[#5f6f80] text-[11px]">{p?.unidadMedida}</span></td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-right">{formatCurrency(m.costoUnitario,simboloMoneda)}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-right font-semibold">{formatCurrency(m.costoTotal,simboloMoneda)}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#9ba8b6]">{m.lote||'—'}</td>
                    <td className="px-3.5 py-2.5 text-[12px] text-[#9ba8b6] max-w-[140px] truncate">{m.motivo}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
