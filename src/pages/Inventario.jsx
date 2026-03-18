import { useState, useMemo, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, Eye, Package, AlertTriangle, DollarSign, TrendingDown, Clock } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, estadoStock, formatDate, diasParaVencer } from '../utils/helpers'
import { valorarStock, calcularPMP } from '../utils/valorizacion'
import * as storage from '../services/storage'
import { Modal, ConfirmDialog, EmptyState, StockBadge, Badge, Btn, Field, Input, Select, Textarea } from '../components/ui/index'

const TH = ({children,right})=><th className={`bg-[#1a2230] px-3.5 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] whitespace-nowrap border-b border-white/[0.08] sticky top-0 z-10 ${right?'text-right':'text-left'}`}>{children}</th>
const TD = ({children,mono,muted,right,className=''})=><td className={`px-3.5 py-2.5 align-middle ${mono?'font-mono text-[12px]':''} ${muted?'text-[#9ba8b6]':'text-[#e8edf2]'} ${right?'text-right':''} ${className}`}>{children}</td>

export default function Inventario() {
  const { productos, categorias, almacenes, proveedores, recargarProductos, toast, formulaValorizacion, simboloMoneda } = useApp()
  const [busqueda, setBusqueda] = useState('')
  const [filtCat, setFiltCat]   = useState('')
  const [filtAlm, setFiltAlm]   = useState('')
  const [filtStock,setFiltStock]= useState('')
  const [modalForm, setModalForm]   = useState(false)
  const [modalDet, setModalDet]     = useState(null)
  const [editando, setEditando]     = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  const filtered = useMemo(()=>{
    let d=productos.filter(p=>p.activo!==false)
    if(busqueda){const q=busqueda.toLowerCase();d=d.filter(p=>p.nombre?.toLowerCase().includes(q)||p.sku?.toLowerCase().includes(q)||p.descripcion?.toLowerCase().includes(q))}
    if(filtCat) d=d.filter(p=>p.categoriaId===filtCat)
    if(filtAlm) d=d.filter(p=>p.almacenId===filtAlm)
    if(filtStock==='critico') d=d.filter(p=>{const e=estadoStock(p.stockActual,p.stockMinimo);return e.estado==='critico'||e.estado==='agotado'})
    if(filtStock==='vencidos') d=d.filter(p=>p.tieneVencimiento&&diasParaVencer(p.fechaVencimiento)<0)
    return d
  },[productos,busqueda,filtCat,filtAlm,filtStock])

  const catNombre=id=>categorias.find(c=>c.id===id)?.nombre||'—'
  const almNombre=id=>almacenes.find(a=>a.id===id)?.nombre||'—'

  // KPIs del inventario
  const kpis = useMemo(() => {
    const activos = productos.filter(p => p.activo !== false)
    const valorTotal   = activos.reduce((s, p) => s + valorarStock(p.batches || [], formulaValorizacion), 0)
    const agotados     = activos.filter(p => p.stockActual <= 0).length
    const criticos     = activos.filter(p => { const e = estadoStock(p.stockActual, p.stockMinimo); return e.estado === 'critico' }).length
    const porVencer    = activos.filter(p => {
      if (!p.tieneVencimiento || !p.fechaVencimiento) return false
      const d = diasParaVencer(p.fechaVencimiento)
      return d !== null && d >= 0 && d <= 30
    }).length
    const vencidos     = activos.filter(p => p.tieneVencimiento && diasParaVencer(p.fechaVencimiento) < 0).length
    return { total: activos.length, valorTotal, agotados, criticos, porVencer, vencidos }
  }, [productos, formulaValorizacion])

  function handleDel(id){ storage.deleteProducto(id); recargarProductos(); toast('Producto eliminado','success') }

  return(
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">

        <div className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl bg-[#00c896]"/>
          <div className="absolute top-3 right-4 opacity-[0.06]"><DollarSign size={44}/></div>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={13} className="text-[#00c896]"/>
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em]">Valor del inventario</span>
          </div>
          <div className="text-[19px] font-semibold text-[#e8edf2] font-mono leading-tight">{formatCurrency(kpis.valorTotal, simboloMoneda)}</div>
          <div className="text-[11px] text-[#5f6f80] mt-1">{kpis.total} productos activos · {formulaValorizacion}</div>
        </div>

        <div className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl bg-red-500"/>
          <div className="absolute top-3 right-4 opacity-[0.06]"><AlertTriangle size={44}/></div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={13} className="text-red-400"/>
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em]">Agotados / Críticos</span>
          </div>
          <div className="flex items-end gap-2">
            <div className="text-[28px] font-semibold text-red-400 leading-none">{kpis.agotados}</div>
            {kpis.criticos > 0 && (
              <div className="text-[18px] font-semibold text-amber-400 leading-none mb-0.5">+{kpis.criticos}</div>
            )}
          </div>
          <div className="text-[11px] text-[#5f6f80] mt-1">
            {kpis.agotados} agotados · {kpis.criticos} bajo mínimo
          </div>
        </div>

        <div className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl bg-amber-500"/>
          <div className="absolute top-3 right-4 opacity-[0.06]"><Clock size={44}/></div>
          <div className="flex items-center gap-2 mb-2">
            <Clock size={13} className="text-amber-400"/>
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em]">Próx. a vencer (30d)</span>
          </div>
          <div className="text-[28px] font-semibold text-amber-400 leading-none">{kpis.porVencer}</div>
          <div className="text-[11px] text-[#5f6f80] mt-1">
            {kpis.vencidos > 0
              ? <span className="text-red-400 font-semibold">{kpis.vencidos} ya vencidos</span>
              : 'Sin productos vencidos'
            }
            {kpis.porVencer > 0 && ' · requieren atención'}
          </div>
        </div>

        <div className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl bg-blue-500"/>
          <div className="absolute top-3 right-4 opacity-[0.06]"><TrendingDown size={44}/></div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={13} className="text-blue-400"/>
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em]">Cobertura del filtro</span>
          </div>
          <div className="text-[28px] font-semibold text-[#e8edf2] leading-none">{filtered.length}</div>
          <div className="text-[11px] text-[#5f6f80] mt-1">
            de {kpis.total} productos
            {filtered.length < kpis.total && <span className="text-[#00c896]"> · filtro activo</span>}
          </div>
        </div>

      </div>

      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Inventario de Productos</span>
          <Btn variant="primary" size="sm" onClick={()=>{setEditando(null);setModalForm(true)}}><Plus size={13}/>Nuevo Producto</Btn>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <input className="w-full pl-8 pr-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] placeholder-[#5f6f80] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20" placeholder="Buscar SKU, nombre..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
          </div>
          <select className="px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] pr-8" value={filtCat} onChange={e=>setFiltCat(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categorias.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <select className="px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] pr-8" value={filtAlm} onChange={e=>setFiltAlm(e.target.value)}>
            <option value="">Todos los almacenes</option>
            {almacenes.map(a=><option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
          <select className="px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] pr-8" value={filtStock} onChange={e=>setFiltStock(e.target.value)}>
            <option value="">Estado: todos</option>
            <option value="critico">Crítico / Agotado</option>
            <option value="vencidos">Vencidos</option>
          </select>
          {(busqueda||filtCat||filtAlm||filtStock)&&<Btn variant="ghost" size="sm" onClick={()=>{setBusqueda('');setFiltCat('');setFiltAlm('');setFiltStock('')}}>Limpiar</Btn>}
        </div>

        <div className="text-[12px] text-[#5f6f80] mb-3">
          {filtered.length} de {productos.filter(p=>p.activo!==false).length} productos · Valorización: <span className="text-[#00c896] font-semibold">{formulaValorizacion}</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr>
              <TH>SKU</TH><TH>Producto</TH><TH>Categoría</TH><TH>Almacén</TH>
              <TH right>Stock</TH><TH right>Costo PMP</TH><TH right>Valor</TH>
              <TH>Estado</TH><TH>Vence</TH><TH>Acciones</TH>
            </tr></thead>
            <tbody>
              {filtered.length===0&&<tr><td colSpan={10}><EmptyState icon={Package} title="Sin resultados" description="Prueba con otros filtros o agrega un producto."/></td></tr>}
              {filtered.map(p=>{
                const pmp=calcularPMP(p.batches||[])
                const val=valorarStock(p.batches||[],formulaValorizacion)
                const dias=diasParaVencer(p.fechaVencimiento)
                return(
                  <tr key={p.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02] cursor-pointer transition-colors" onClick={()=>setModalDet(p)}>
                    <TD mono><span className="text-[#00c896]">{p.sku}</span></TD>
                    <TD>
                      <div className="font-medium">{p.nombre}</div>
                      {p.descripcion&&<div className="text-[11px] text-[#5f6f80] mt-0.5 max-w-[220px] truncate">{p.descripcion}</div>}
                    </TD>
                    <TD muted>{catNombre(p.categoriaId)}</TD>
                    <TD muted>{almNombre(p.almacenId)}</TD>
                    <TD mono right>{p.stockActual} <span className="text-[#5f6f80] text-[11px]">{p.unidadMedida}</span></TD>
                    <TD mono right>{formatCurrency(pmp,simboloMoneda)}</TD>
                    <TD mono right><span className="text-[#00c896] font-semibold">{formatCurrency(val,simboloMoneda)}</span></TD>
                    <TD><StockBadge stockActual={p.stockActual} stockMinimo={p.stockMinimo}/></TD>
                    <TD>
                      {p.tieneVencimiento&&dias!==null
                        ?<Badge variant={dias<0?'danger':dias<=30?'warning':dias<=90?'info':'success'}>{dias<0?'Vencido':`${dias}d`}</Badge>
                        :<span className="text-[#5f6f80]">—</span>}
                    </TD>
                    <td className="px-3.5 py-2.5" onClick={e=>e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Btn variant="ghost" size="icon" onClick={()=>setModalDet(p)}><Eye size={13}/></Btn>
                        <Btn variant="ghost" size="icon" onClick={()=>{setEditando(p);setModalForm(true)}}><Edit2 size={13}/></Btn>
                        <Btn variant="ghost" size="icon" className="text-red-400 hover:text-red-300" onClick={()=>setConfirmDel(p.id)}><Trash2 size={13}/></Btn>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ModalProducto open={modalForm} onClose={()=>setModalForm(false)} editando={editando}
        categorias={categorias} almacenes={almacenes} proveedores={proveedores}
        onSaved={()=>{recargarProductos();setModalForm(false);toast(editando?'Producto actualizado':'Producto creado','success')}}/>

      <ModalDetalle open={!!modalDet} onClose={()=>setModalDet(null)} producto={modalDet}
        catNombre={catNombre} almNombre={almNombre} formulaValorizacion={formulaValorizacion} simboloMoneda={simboloMoneda}/>

      <ConfirmDialog open={!!confirmDel} onClose={()=>setConfirmDel(null)}
        onConfirm={()=>handleDel(confirmDel)} danger title="Eliminar producto"
        message="¿Eliminar este producto? Esta acción no se puede deshacer."/>
    </div>
  )
}

function ModalProducto({open,onClose,editando,categorias,almacenes,proveedores,onSaved}){
  const init={sku:'',nombre:'',descripcion:'',categoriaId:'',unidadMedida:'UND',stockMinimo:0,stockMaximo:0,almacenId:almacenes[0]?.id||'',proveedorId:'',precioVenta:0,tieneVencimiento:false,fechaVencimiento:'',activo:true}
  const [form,setForm]=useState(init)
  const [err,setErr]=useState({})
  const f=(k,v)=>setForm(p=>({...p,[k]:v}))
  useEffect(() => {
    if (editando) setForm({ ...init, ...editando })
    else setForm(init)
  }, [editando, open])

  const UMs=['UND','KG','LT','MT','CJA','PAQ','RESMA','DOC','JGO','SET']
  const validate=()=>{const e={};if(!form.sku.trim())e.sku='Requerido';if(!form.nombre.trim())e.nombre='Requerido';if(!form.categoriaId)e.categoriaId='Requerido';setErr(e);return Object.keys(e).length===0}
  function handleSave(){if(!validate())return;storage.saveProducto({...form,stockMinimo:+form.stockMinimo,stockMaximo:+form.stockMaximo,precioVenta:+form.precioVenta});onSaved()}
  const SI = 'px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 w-full font-[inherit] placeholder-[#5f6f80]'
  const SEL = SI + ' pr-8'
  return(
    <Modal open={open} onClose={onClose} title={editando?'Editar Producto':'Nuevo Producto'} size="lg"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={handleSave}>{editando?'Guardar Cambios':'Crear Producto'}</Btn></>}>
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="SKU *" error={err.sku}><input className={SI} value={form.sku} onChange={e=>f('sku',e.target.value)} placeholder="ELEC-001"/></Field>
        <Field label="Unidad de Medida"><select className={SEL} value={form.unidadMedida} onChange={e=>f('unidadMedida',e.target.value)}>{UMs.map(u=><option key={u}>{u}</option>)}</select></Field>
      </div>
      <Field label="Nombre del Producto *" error={err.nombre}><input className={SI} value={form.nombre} onChange={e=>f('nombre',e.target.value)} placeholder="Nombre descriptivo"/></Field>
      <Field label="Descripción"><textarea className={SI+' resize-y min-h-[56px]'} value={form.descripcion} onChange={e=>f('descripcion',e.target.value)} placeholder="Descripción..."/></Field>
      <div className="grid grid-cols-3 gap-3.5">
        <Field label="Categoría *" error={err.categoriaId}><select className={SEL} value={form.categoriaId} onChange={e=>f('categoriaId',e.target.value)}><option value="">Seleccionar...</option>{categorias.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select></Field>
        <Field label="Almacén"><select className={SEL} value={form.almacenId} onChange={e=>f('almacenId',e.target.value)}>{almacenes.map(a=><option key={a.id} value={a.id}>{a.nombre}</option>)}</select></Field>
        <Field label="Proveedor"><select className={SEL} value={form.proveedorId} onChange={e=>f('proveedorId',e.target.value)}><option value="">Sin proveedor</option>{proveedores.map(p=><option key={p.id} value={p.id}>{p.razonSocial}</option>)}</select></Field>
      </div>
      <div className="grid grid-cols-3 gap-3.5">
        <Field label="Stock Mínimo"><input type="number" className={SI} value={form.stockMinimo} onChange={e=>f('stockMinimo',e.target.value)} min="0"/></Field>
        <Field label="Stock Máximo"><input type="number" className={SI} value={form.stockMaximo} onChange={e=>f('stockMaximo',e.target.value)} min="0"/></Field>
        <Field label="Precio de Venta"><input type="number" className={SI} value={form.precioVenta} onChange={e=>f('precioVenta',e.target.value)} min="0" step="0.01"/></Field>
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[#9ba8b6]">
          <input type="checkbox" checked={form.tieneVencimiento} onChange={e=>f('tieneVencimiento',e.target.checked)} className="accent-[#00c896]"/>
          Tiene fecha de vencimiento
        </label>
        {form.tieneVencimiento&&(
          <Field label="Fecha de Vencimiento">
            <input type="date" className={SI} value={form.fechaVencimiento} onChange={e=>f('fechaVencimiento',e.target.value)}/>
          </Field>
        )}
      </div>
    </Modal>
  )
}

function ModalDetalle({open,onClose,producto,catNombre,almNombre,formulaValorizacion,simboloMoneda}){
  if(!producto) return null
  const p=producto
  const pmp=calcularPMP(p.batches||[])
  const val=valorarStock(p.batches||[],formulaValorizacion)
  const dias=diasParaVencer(p.fechaVencimiento)
  const info=[['SKU',p.sku],['Unidad',p.unidadMedida],['Categoría',catNombre(p.categoriaId)],['Almacén',almNombre(p.almacenId)],['Stock Actual',`${p.stockActual} ${p.unidadMedida}`],['Stock Mínimo',`${p.stockMinimo} ${p.unidadMedida}`],['Costo PMP',formatCurrency(pmp,simboloMoneda)],['Valor Stock',formatCurrency(val,simboloMoneda)],['Precio Venta',formatCurrency(p.precioVenta,simboloMoneda)],['Vencimiento',p.tieneVencimiento?`${formatDate(p.fechaVencimiento)} (${dias!==null?dias<0?'Vencido':`${dias}d`:'—'})`:'No aplica']]
  return(
    <Modal open={open} onClose={onClose} title={`Detalle: ${p.nombre}`} size="md" footer={<Btn variant="secondary" onClick={onClose}>Cerrar</Btn>}>
      <div className="grid grid-cols-2 gap-3">
        {info.map(([k,v])=>(
          <div key={k} className="bg-[#1a2230] rounded-lg px-3.5 py-2.5">
            <div className="text-[11px] text-[#5f6f80] mb-0.5">{k}</div>
            <div className="text-[13px] font-medium text-[#e8edf2]">{v||'—'}</div>
          </div>
        ))}
      </div>
      {(p.batches||[]).length>0&&(
        <>
          <div className="text-[13px] font-semibold text-[#e8edf2] mt-1">Lotes en stock</div>
          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full border-collapse text-[13px]">
              <thead><tr>{['Lote','Fecha','Cantidad','Costo Unit.','Subtotal'].map(h=><th key={h} className="bg-[#1a2230] px-3 py-2 text-left text-[11px] font-semibold text-[#5f6f80] uppercase border-b border-white/[0.08]">{h}</th>)}</tr></thead>
              <tbody>{p.batches.map((b,i)=>(
                <tr key={i} className="border-b border-white/[0.06] last:border-0">
                  <td className="px-3 py-2 font-mono text-[12px] text-[#9ba8b6]">{b.lote||'—'}</td>
                  <td className="px-3 py-2 text-[#9ba8b6]">{formatDate(b.fecha)}</td>
                  <td className="px-3 py-2 font-mono text-[12px]">{Number(b.cantidad).toFixed(2)} {p.unidadMedida}</td>
                  <td className="px-3 py-2 font-mono text-[12px]">{formatCurrency(b.costo,simboloMoneda)}</td>
                  <td className="px-3 py-2 font-mono text-[12px] text-[#00c896] font-semibold">{formatCurrency(b.cantidad*b.costo,simboloMoneda)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}
      {p.descripcion&&<p className="text-[13px] text-[#9ba8b6] leading-relaxed">{p.descripcion}</p>}
    </Modal>
  )
}
