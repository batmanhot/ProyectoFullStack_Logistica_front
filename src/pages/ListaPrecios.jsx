import { useState, useMemo, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, Tag, DollarSign, Percent, Copy, Download, FileText } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency } from '../utils/helpers'
import { calcularPMP } from '../utils/valorizacion'
import { Modal, ConfirmDialog, EmptyState, Badge, Btn, Field, Alert } from '../components/ui/index'
import { exportarListaPreciosXLSX } from '../utils/exportXLSX'
import { exportarListaPreciosPDF } from '../utils/exportPDF'

const SI  = 'w-full px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit] placeholder-[#5f6f80]'
const SEL = SI + ' pr-8'
const TH  = ({c,r}) => <th className={`bg-[#1a2230] px-3.5 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] whitespace-nowrap border-b border-white/[0.08] ${r?'text-right':'text-left'}`}>{c}</th>

const KEY = 'sp_listas_precios'
function leer()    { try { return JSON.parse(localStorage.getItem(KEY)||'[]') } catch { return [] } }
function guardar(d){ localStorage.setItem(KEY, JSON.stringify(d)) }
function nid()     { return Math.random().toString(36).slice(2,10) }

const LISTAS_DEFAULT = [
  { id:'lp1', nombre:'Lista General',     tipo:'general',    descuento:0,   markup:0,    clienteIds:[], activa:true, createdAt:'2025-01-01T00:00:00Z' },
  { id:'lp2', nombre:'Mayorista',         tipo:'mayorista',  descuento:15,  markup:0,    clienteIds:[], activa:true, createdAt:'2025-01-01T00:00:00Z' },
  { id:'lp3', nombre:'Cliente Especial',  tipo:'especial',   descuento:0,   markup:0,    clienteIds:[], activa:true, createdAt:'2025-01-01T00:00:00Z' },
]

export default function ListaPrecios() {
  const { productos, clientes, categorias, simboloMoneda, config } = useApp()
  const [listas,     setListas]     = useState(() => { const d=leer(); return d.length?d:LISTAS_DEFAULT })
  const [listaId,    setListaId]    = useState('lp1')
  const [modal,      setModal]      = useState(false)
  const [editando,   setEditando]   = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [busq,       setBusq]       = useState('')
  const [filtCat,    setFiltCat]    = useState('')
  const [editPrecio, setEditPrecio] = useState(null) // { productoId, precio }

  function reload() { const d=leer(); setListas(d.length?d:LISTAS_DEFAULT) }

  const lista = listas.find(l=>l.id===listaId) || listas[0]

  function getPrecio(prod, lista) {
    const pmp = calcularPMP(prod.batches||[])
    const base = prod.precioVenta || 0
    // Precio especial por producto en esta lista
    const especial = lista.precios?.[prod.id]
    if (especial !== undefined) return especial
    // Descuento % sobre precio base
    if (lista.descuento > 0) return +(base * (1 - lista.descuento/100)).toFixed(2)
    // Markup % sobre PMP
    if (lista.markup > 0) return +(pmp * (1 + lista.markup/100)).toFixed(2)
    return base
  }

  function getMargen(prod, precio) {
    const pmp = calcularPMP(prod.batches||[])
    if (!precio || !pmp) return null
    return +((( precio - pmp) / precio) * 100).toFixed(1)
  }

  const prodsFiltrados = useMemo(() => {
    let d = productos.filter(p=>p.activo!==false)
    if (busq) { const q=busq.toLowerCase(); d=d.filter(p=>p.nombre.toLowerCase().includes(q)||p.sku.toLowerCase().includes(q)) }
    if (filtCat) d = d.filter(p=>p.categoriaId===filtCat)
    return d
  }, [productos, busq, filtCat])

  function saveLista(data) {
    const lista = leer().length ? leer() : LISTAS_DEFAULT
    if (data.id) { const i=lista.findIndex(x=>x.id===data.id); if(i>=0)lista[i]=data; else lista.push(data) }
    else lista.push({...data,id:nid(),createdAt:new Date().toISOString()})
    guardar(lista); reload(); setModal(false)
  }

  function setPrecioEspecial(listaId, productoId, precio) {
    const lista = leer().length ? leer() : LISTAS_DEFAULT
    const idx = lista.findIndex(l=>l.id===listaId)
    if (idx<0) return
    if (!lista[idx].precios) lista[idx].precios={}
    lista[idx].precios[productoId] = +precio
    guardar(lista); reload(); setEditPrecio(null)
  }

  function deleteLista(id) { guardar((leer().length?leer():LISTAS_DEFAULT).filter(l=>l.id!==id)); reload(); setConfirmDel(null) }

  function duplicarLista(l) {
    const nueva = {...l, id:nid(), nombre:l.nombre+' (copia)', createdAt:new Date().toISOString()}
    const all = leer().length?leer():LISTAS_DEFAULT; all.push(nueva); guardar(all); reload()
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {listas.map(l=>(
            <button key={l.id} onClick={()=>setListaId(l.id)}
              className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-all border ${listaId===l.id?'bg-[#00c896]/10 border-[#00c896]/30 text-[#00c896]':'bg-[#1a2230] border-white/[0.07] text-[#9ba8b6] hover:border-white/[0.14]'}`}>
              {l.nombre}
              {l.descuento>0 && <span className="ml-1.5 text-[10px] opacity-70">-{l.descuento}%</span>}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Btn variant="ghost" size="sm" onClick={()=>{setEditando(lista);setModal(true)}}><Edit2 size={12}/> Editar lista</Btn>
          {lista && lista.id !== 'lp1' && <Btn variant="ghost" size="sm" onClick={()=>duplicarLista(lista)}><Copy size={12}/> Duplicar</Btn>}
          <Btn variant="ghost" size="sm" onClick={async()=>{ await exportarListaPreciosXLSX(lista, productos, categorias, simboloMoneda, calcularPMP) }}>
            <Download size={13}/> Excel
          </Btn>
          <Btn variant="ghost" size="sm" onClick={async()=>{ await exportarListaPreciosPDF(lista, productos, categorias, simboloMoneda, calcularPMP, config?.empresa) }}>
            <FileText size={13}/> PDF
          </Btn>
          <Btn variant="primary" size="sm" onClick={()=>{setEditando(null);setModal(true)}}><Plus size={13}/> Nueva lista</Btn>
        </div>
      </div>

      {lista && (
        <div className="bg-[#161d28] border border-[#00c896]/15 rounded-xl px-5 py-4 flex items-center gap-6">
          <div>
            <div className="text-[14px] font-semibold text-[#e8edf2]">{lista.nombre}</div>
            <div className="text-[11px] text-[#5f6f80] mt-0.5 capitalize">{lista.tipo}</div>
          </div>
          <div className="flex gap-5 text-[12px]">
            {lista.descuento>0 && <div><span className="text-[#5f6f80]">Descuento base</span><span className="ml-2 text-green-400 font-bold">-{lista.descuento}%</span></div>}
            {lista.markup>0    && <div><span className="text-[#5f6f80]">Markup sobre PMP</span><span className="ml-2 text-amber-400 font-bold">+{lista.markup}%</span></div>}
            {!lista.descuento&&!lista.markup && <div className="text-[#5f6f80]">Precios base del catálogo (editables por producto)</div>}
          </div>
          <Badge variant={lista.activa?'success':'neutral'} className="ml-auto">{lista.activa?'Activa':'Inactiva'}</Badge>
        </div>
      )}

      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <input className={SI+' pl-7'} placeholder="Buscar SKU o producto..." value={busq} onChange={e=>setBusq(e.target.value)}/>
          </div>
          <select className={SEL} style={{width:180}} value={filtCat} onChange={e=>setFiltCat(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categorias.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full border-collapse text-[12px]">
            <thead><tr>
              <TH c="SKU"/><TH c="Producto"/><TH c="Categoría"/>
              <TH c="P. Costo (PMP)" r/><TH c="P. Base catálogo" r/>
              <TH c={`Precio — ${lista?.nombre||'Lista'}`} r/>
              <TH c="Margen" r/><TH c="Ajuste"/>
            </tr></thead>
            <tbody>
              {prodsFiltrados.length===0&&<tr><td colSpan={8}><EmptyState icon={Tag} title="Sin productos" description="No hay productos con estos filtros."/></td></tr>}
              {prodsFiltrados.map(prod=>{
                const pmp    = calcularPMP(prod.batches||[])
                const precio = lista ? getPrecio(prod, lista) : prod.precioVenta||0
                const margen = getMargen(prod, precio)
                const tieneEspecial = lista?.precios?.[prod.id] !== undefined
                return (
                  <tr key={prod.id} className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02]">
                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#00c896]">{prod.sku}</td>
                    <td className="px-3.5 py-2.5 font-medium text-[#e8edf2]">{prod.nombre.slice(0,35)}</td>
                    <td className="px-3.5 py-2.5 text-[#9ba8b6]">{categorias.find(c=>c.id===prod.categoriaId)?.nombre||'—'}</td>
                    <td className="px-3.5 py-2.5 text-right font-mono text-[#9ba8b6]">{formatCurrency(pmp, simboloMoneda)}</td>
                    <td className="px-3.5 py-2.5 text-right font-mono text-[#9ba8b6]">{formatCurrency(prod.precioVenta||0, simboloMoneda)}</td>
                    <td className="px-3.5 py-2.5 text-right">
                      {editPrecio?.productoId===prod.id && editPrecio?.listaId===lista?.id ? (
                        <div className="flex items-center gap-1.5 justify-end">
                          <input type="number" className="w-24 px-2 py-1 bg-[#1e2835] border border-[#00c896]/40 rounded-lg text-[12px] text-[#e8edf2] outline-none font-mono text-right"
                            defaultValue={precio} autoFocus
                            onKeyDown={e=>{ if(e.key==='Enter')setPrecioEspecial(lista.id,prod.id,e.target.value); if(e.key==='Escape')setEditPrecio(null) }}/>
                          <button className="text-[10px] text-[#5f6f80] hover:text-red-400" onClick={()=>setEditPrecio(null)}>✕</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 justify-end">
                          <span className={`font-mono font-bold ${tieneEspecial?'text-amber-400':'text-[#e8edf2]'}`}>{formatCurrency(precio, simboloMoneda)}</span>
                          {tieneEspecial && <span className="text-[9px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded">especial</span>}
                          <button onClick={()=>setEditPrecio({productoId:prod.id,listaId:lista?.id})} className="text-[#5f6f80] hover:text-[#00c896] transition-colors p-0.5 rounded"><Edit2 size={11}/></button>
                        </div>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-semibold" style={{color:margen===null?'#5f6f80':margen>=40?'#22c55e':margen>=20?'#f59e0b':'#ef4444'}}>
                      {margen!==null ? `${margen}%` : '—'}
                    </td>
                    <td className="px-3.5 py-2.5">
                      {tieneEspecial && (
                        <button className="text-[10px] text-[#5f6f80] hover:text-red-400 transition-colors"
                          onClick={()=>{ const l=leer().length?leer():LISTAS_DEFAULT; const i=l.findIndex(x=>x.id===lista?.id); if(i>=0&&l[i].precios){delete l[i].precios[prod.id];guardar(l);reload()} }}
                          title="Restaurar precio de lista">✕ Reset</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-[11px] text-[#5f6f80]">
          Haz clic en el ícono de edición para ajustar el precio de un producto específico en esta lista. Presiona Enter para guardar, Esc para cancelar.
        </div>
      </div>

      <ModalLista open={modal} onClose={()=>setModal(false)} editando={editando} onSave={saveLista}/>
      <ConfirmDialog open={!!confirmDel} onClose={()=>setConfirmDel(null)} onConfirm={()=>deleteLista(confirmDel)} danger title="Eliminar lista" message="¿Eliminar esta lista de precios?"/>
    </div>
  )
}

function ModalLista({ open, onClose, editando, onSave }) {
  const init = { nombre:'', tipo:'general', descuento:0, markup:0, activa:true }
  const [form, setForm] = useState(init)
  const f = (k,v)=>setForm(p=>({...p,[k]:v}))
  useEffect(()=>{ setForm(editando?{...init,...editando}:init) },[editando,open]) // eslint-disable-line
  return (
    <Modal open={open} onClose={onClose} title={editando?'Editar lista':'Nueva lista de precios'} size="sm"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn variant="primary" disabled={!form.nombre.trim()} onClick={()=>onSave(form)}>Guardar</Btn></>}>
      <Field label="Nombre *"><input className={SI} value={form.nombre} onChange={e=>f('nombre',e.target.value)} placeholder="Ej: Mayorista, Distribuidor, VIP..."/></Field>
      <Field label="Tipo">
        <select className={SEL} value={form.tipo} onChange={e=>f('tipo',e.target.value)}>
          {['general','mayorista','minorista','especial','distribuidor'].map(t=><option key={t} value={t} className="capitalize">{t}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Descuento % (sobre precio base)"><input type="number" className={SI} value={form.descuento} onChange={e=>f('descuento',+e.target.value)} min="0" max="100" step="0.5"/></Field>
        <Field label="Markup % (sobre costo PMP)"><input type="number" className={SI} value={form.markup} onChange={e=>f('markup',+e.target.value)} min="0" step="0.5"/></Field>
      </div>
      <Alert variant="info">El descuento aplica sobre el precio base del catálogo. El markup aplica sobre el costo PMP. Puedes además editar precios específicos por producto en la tabla.</Alert>
      <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[#9ba8b6]">
        <input type="checkbox" checked={form.activa} onChange={e=>f('activa',e.target.checked)} className="accent-[#00c896]"/>
        Lista activa
      </label>
    </Modal>
  )
}
