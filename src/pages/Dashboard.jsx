import { useMemo } from 'react'
import { Package, TrendingUp, AlertTriangle, ShoppingCart, RefreshCw, Activity, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useApp } from '../store/AppContext'
import { formatCurrency, estadoStock, formatDate, diasParaVencer } from '../utils/helpers'
import { valorarStock } from '../utils/valorizacion'
import { useNavigate } from 'react-router-dom'
import { KpiCard, Badge, Alert } from '../components/ui/index'

const PIE_COLORS = ['#00c896','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6']
const TT = { background:'#1a2230', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, fontSize:12, color:'#e8edf2' }

export default function Dashboard() {
  const { productos, movimientos, ordenes, config, categorias, formulaValorizacion, simboloMoneda } = useApp()
  const nav = useNavigate()

  const kpis = useMemo(() => {
    const totalProductos = productos.filter(p => p.activo !== false).length
    const valorTotal     = productos.reduce((s,p) => s + valorarStock(p.batches||[], formulaValorizacion), 0)
    const stockCritico   = productos.filter(p => { const e=estadoStock(p.stockActual,p.stockMinimo); return e.estado==='critico'||e.estado==='agotado' }).length
    const ocPendientes   = ordenes.filter(o => o.estado==='PENDIENTE'||o.estado==='APROBADA').length
    const movHoy         = movimientos.filter(m => m.fecha===new Date().toISOString().split('T')[0]).length
    const proximosVencer = productos.filter(p => {
      if(!p.tieneVencimiento||!p.fechaVencimiento) return false
      const d=diasParaVencer(p.fechaVencimiento)
      return d!==null&&d>=0&&d<=(config?.diasAlertaVencimiento||30)
    }).length
    return { totalProductos, valorTotal, stockCritico, ocPendientes, movHoy, proximosVencer }
  }, [productos, movimientos, ordenes, formulaValorizacion, config])

  const movChart = useMemo(() => {
    const dias=[]
    for(let i=6;i>=0;i--){
      const d=new Date(); d.setDate(d.getDate()-i)
      const key=d.toISOString().split('T')[0]
      dias.push({
        dia: d.toLocaleDateString('es-PE',{weekday:'short'}),
        entradas: movimientos.filter(m=>m.fecha===key&&m.tipo==='ENTRADA').length,
        salidas:  movimientos.filter(m=>m.fecha===key&&m.tipo==='SALIDA').length,
      })
    }
    return dias
  }, [movimientos])

  const pieData = useMemo(() => {
    const map={}
    productos.forEach(p => {
      const nombre=categorias.find(c=>c.id===p.categoriaId)?.nombre||'Sin categoría'
      map[nombre]=(map[nombre]||0)+valorarStock(p.batches||[], formulaValorizacion)
    })
    return Object.entries(map).map(([name,value])=>({name,value:Math.round(value)})).filter(d=>d.value>0).sort((a,b)=>b.value-a.value)
  }, [productos, categorias, formulaValorizacion])

  const topProductos = useMemo(() => [...productos]
    .map(p=>({...p,valor:valorarStock(p.batches||[],formulaValorizacion)}))
    .sort((a,b)=>b.valor-a.valor).slice(0,5)
  ,[productos,formulaValorizacion])

  const alertas = useMemo(() => {
    const lista=[]
    productos.forEach(p => {
      const e=estadoStock(p.stockActual,p.stockMinimo)
      if(e.estado==='agotado') lista.push({tipo:'danger',msg:`${p.nombre} — Sin stock`,path:'/inventario'})
      else if(e.estado==='critico') lista.push({tipo:'warning',msg:`${p.nombre} — Stock crítico (${p.stockActual} ${p.unidadMedida})`,path:'/inventario'})
    })
    productos.forEach(p => {
      if(!p.tieneVencimiento||!p.fechaVencimiento) return
      const dias=diasParaVencer(p.fechaVencimiento)
      if(dias!==null&&dias<0) lista.push({tipo:'danger',msg:`${p.nombre} — VENCIDO (${formatDate(p.fechaVencimiento)})`,path:'/inventario'})
      else if(dias!==null&&dias<=30) lista.push({tipo:'warning',msg:`${p.nombre} — Vence en ${dias} días`,path:'/inventario'})
    })
    ordenes.filter(o=>o.estado==='PENDIENTE').forEach(o=>
      lista.push({tipo:'info',msg:`OC ${o.numero} pendiente de aprobación`,path:'/ordenes'})
    )
    return lista.slice(0,8)
  },[productos,ordenes])

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        <KpiCard label="Total Productos" value={kpis.totalProductos} accentColor="#00c896" icon={<Package size={36}/>}/>
        <KpiCard label="Valor del Stock" value={formatCurrency(kpis.valorTotal,simboloMoneda)} accentColor="#3b82f6" icon={<TrendingUp size={36}/>} mono sub={`Método: ${formulaValorizacion}`}/>
        <KpiCard label="Stock Crítico/Agotado" value={kpis.stockCritico} accentColor={kpis.stockCritico>0?'#ef4444':'#22c55e'} icon={<AlertTriangle size={36}/>} onClick={()=>nav('/inventario')}/>
        <KpiCard label="OC Pendientes" value={kpis.ocPendientes} accentColor="#f59e0b" icon={<ShoppingCart size={36}/>} onClick={()=>nav('/ordenes')}/>
        <KpiCard label="Próx. a Vencer" value={kpis.proximosVencer} accentColor={kpis.proximosVencer>0?'#f59e0b':'#22c55e'} icon={<Activity size={36}/>} sub={`en ${config?.diasAlertaVencimiento||30} días`}/>
        <KpiCard label="Movimientos Hoy" value={kpis.movHoy} accentColor="#00c896" icon={<RefreshCw size={36}/>}/>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-2 gap-5">
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Movimientos — Últimos 7 días</span>
            <div className="flex gap-3.5 text-[11px] text-[#5f6f80]">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[#00c896] inline-block"/>Entradas</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-red-400 inline-block"/>Salidas</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={movChart} barGap={4} barCategoryGap="30%">
              <XAxis dataKey="dia" tick={{fill:'#5f6f80',fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'#5f6f80',fontSize:11}} axisLine={false} tickLine={false} allowDecimals={false}/>
              <Tooltip contentStyle={TT} cursor={{fill:'rgba(255,255,255,0.03)'}}/>
              <Bar dataKey="entradas" fill="#00c896" radius={[4,4,0,0]} name="Entradas"/>
              <Bar dataKey="salidas"  fill="#ef4444" radius={[4,4,0,0]} name="Salidas"/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">Valor por Categoría</div>
          {pieData.length>0 ? (
            <div className="flex items-center gap-5">
              <ResponsiveContainer width={150} height={150}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3}>
                    {pieData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                  </Pie>
                  <Tooltip contentStyle={TT} formatter={v=>formatCurrency(v,simboloMoneda)}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                {pieData.slice(0,6).map((d,i)=>(
                  <div key={i} className="flex items-center gap-2 text-[12px]">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{background:PIE_COLORS[i%PIE_COLORS.length]}}/>
                    <span className="text-[#9ba8b6] flex-1 truncate">{d.name}</span>
                    <span className="text-[#e8edf2] font-medium shrink-0">{formatCurrency(d.value,simboloMoneda)}</span>
                  </div>
                ))}
              </div>
            </div>
          ):(
            <p className="text-[#5f6f80] text-[13px] text-center py-10">Sin datos de stock</p>
          )}
        </div>
      </div>

      {/* Top + Alertas */}
      <div className="grid grid-cols-2 gap-5">
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">Top 5 — Mayor Valor en Stock</div>
          {topProductos.map((p,i)=>(
            <div key={p.id} className={`flex items-center gap-3 py-2.5 ${i<4?'border-b border-white/[0.06]':''}`}>
              <span className="w-6 h-6 rounded-full bg-[#00c896]/10 text-[#00c896] text-[11px] font-bold flex items-center justify-center shrink-0">{i+1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-[#e8edf2] truncate">{p.nombre}</div>
                <div className="text-[11px] text-[#5f6f80] mt-0.5">{p.sku} · {p.stockActual} {p.unidadMedida}</div>
              </div>
              <span className="text-[13px] font-semibold text-[#00c896] shrink-0">{formatCurrency(p.valor,simboloMoneda)}</span>
            </div>
          ))}
        </div>

        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Alertas Activas</span>
            {alertas.length>0&&<Badge variant="danger">{alertas.length}</Badge>}
          </div>
          {alertas.length===0 ? (
            <p className="text-[#22c55e] text-[13px] text-center py-6">✓ Sin alertas pendientes</p>
          ):(
            <div className="flex flex-col gap-1.5">
              {alertas.map((a,i)=>(
                <Alert key={i} variant={a.tipo} onClick={()=>nav(a.path)}>{a.msg}</Alert>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Últimos movimientos */}
      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Últimos Movimientos</span>
          <button onClick={()=>nav('/movimientos')} className="text-[13px] text-[#9ba8b6] hover:text-[#e8edf2] transition-colors">Ver todos →</button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {['Fecha','Tipo','Producto','Cantidad','Costo Total','Motivo'].map(h=>(
                  <th key={h} className="bg-[#1a2230] px-3.5 py-2.5 text-left text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] border-b border-white/[0.08]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movimientos.slice(0,8).map(m=>{
                const prod=productos.find(p=>p.id===m.productoId)
                return(
                  <tr key={m.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{formatDate(m.fecha)}</td>
                    <td className="px-3.5 py-2.5">
                      <Badge variant={m.tipo==='ENTRADA'?'success':m.tipo==='SALIDA'?'danger':'neutral'}>
                        {m.tipo==='ENTRADA'?<ArrowDownToLine size={10}/>:m.tipo==='SALIDA'?<ArrowUpFromLine size={10}/>:null}
                        {m.tipo}
                      </Badge>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="font-medium text-[#e8edf2]">{prod?.nombre||'—'}</div>
                      <div className="text-[11px] text-[#5f6f80]">{prod?.sku}</div>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px]">{m.cantidad} <span className="text-[#5f6f80]">{prod?.unidadMedida}</span></td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px]">{formatCurrency(m.costoTotal,simboloMoneda)}</td>
                    <td className="px-3.5 py-2.5 text-[#9ba8b6]">{m.motivo}</td>
                  </tr>
                )
              })}
              {movimientos.length===0&&(
                <tr><td colSpan={6} className="text-center text-[#5f6f80] py-8">Sin movimientos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
