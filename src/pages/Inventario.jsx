import { useState, useMemo, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, Eye, Package,
         AlertTriangle, DollarSign, TrendingDown, Clock} from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, estadoStock, formatDate, diasParaVencer } from '../utils/helpers'
import { valorarStock, calcularPMP } from '../utils/valorizacion'
import * as storage from '../services/storage'
import { Modal, ConfirmDialog, EmptyState, StockBadge, Badge, Btn, Field } from '../components/ui/index'

const SI  = 'px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 w-full font-[inherit] placeholder-[#5f6f80]'
const SEL = SI + ' pr-8'
const TH  = ({children, right}) => <th className={`bg-[#1a2230] px-3.5 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] whitespace-nowrap border-b border-white/[0.08] sticky top-0 z-10 ${right?'text-right':'text-left'}`}>{children}</th>
const TD  = ({children, mono, muted, right, className=''}) => <td className={`px-3.5 py-2.5 align-middle ${mono?'font-mono text-[12px]':''} ${muted?'text-[#9ba8b6]':'text-[#e8edf2]'} ${right?'text-right':''} ${className}`}>{children}</td>

const UMs = ['UND','KG','LT','MT','CJA','PAQ','RESMA','DOC','JGO','SET','SACO','ROLLO','BALDE','CAJA']

export default function Inventario() {
  const {
    productos, categorias, almacenes, proveedores,
    recargarProductos, toast,
    formulaValorizacion, simboloMoneda,
    stockReservado,
  } = useApp()

  const [busqueda,   setBusqueda]   = useState('')
  const [filtCat,    setFiltCat]    = useState('')
  const [filtAlm,    setFiltAlm]    = useState('')
  const [filtStock,  setFiltStock]  = useState('')
  const [modalForm,  setModalForm]  = useState(false)
  const [modalDet,   setModalDet]   = useState(null)
  const [editando,   setEditando]   = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  const filtered = useMemo(() => {
    let d = productos.filter(p => p.activo !== false)
    if (busqueda) {
      const q = busqueda.toLowerCase()
      d = d.filter(p => p.nombre?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.descripcion?.toLowerCase().includes(q))
    }
    if (filtCat)   d = d.filter(p => p.categoriaId === filtCat)
    if (filtAlm)   d = d.filter(p => p.almacenId   === filtAlm)
    if (filtStock === 'critico')  d = d.filter(p => { const e = estadoStock(p.stockActual, p.stockMinimo); return e.estado === 'critico' || e.estado === 'agotado' })
    if (filtStock === 'vencidos') d = d.filter(p => p.tieneVencimiento && diasParaVencer(p.fechaVencimiento) < 0)
    return d
  }, [productos, busqueda, filtCat, filtAlm, filtStock])

  const catNombre = id => categorias.find(c => c.id === id)?.nombre || '—'
  const almNombre = id => almacenes.find(a => a.id === id)?.nombre   || '—'

  const kpis = useMemo(() => {
    const activos    = productos.filter(p => p.activo !== false)
    const valorTotal = activos.reduce((s, p) => s + valorarStock(p.batches || [], formulaValorizacion), 0)
    const agotados   = activos.filter(p => p.stockActual <= 0).length
    const criticos   = activos.filter(p => estadoStock(p.stockActual, p.stockMinimo).estado === 'critico').length
    const porVencer  = activos.filter(p => {
      if (!p.tieneVencimiento || !p.fechaVencimiento) return false
      const d = diasParaVencer(p.fechaVencimiento)
      return d !== null && d >= 0 && d <= 30
    }).length
    const vencidos   = activos.filter(p => p.tieneVencimiento && diasParaVencer(p.fechaVencimiento) < 0).length
    return { total: activos.length, valorTotal, agotados, criticos, porVencer, vencidos }
  }, [productos, formulaValorizacion])

  function abrirNuevo()       { setEditando(null);  setModalForm(true)  }
  function abrirEditar(p, e)  { e.stopPropagation(); setEditando(p); setModalForm(true) }
  function abrirDet(p)        { setModalDet(p) }
  function abrirDetBtn(p, e)  { e.stopPropagation(); setModalDet(p)  }
  function pedirDel(id, e)    { e.stopPropagation(); setConfirmDel(id) }

  function handleDel(id) {
    storage.deleteProducto(id)
    recargarProductos()
    toast('Producto eliminado', 'success')
  }

  function handleSaved() {
    recargarProductos()
    setModalForm(false)
    toast(editando ? 'Producto actualizado' : 'Producto creado', 'success')
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          { label:'Valor del inventario',    val: formatCurrency(kpis.valorTotal, simboloMoneda), sub: `${kpis.total} productos · ${formulaValorizacion}`, color:'#00c896',  icon:DollarSign,   mono:true  },
          { label:'Agotados / Críticos',      val: `${kpis.agotados} / ${kpis.criticos}`,         sub: `${kpis.agotados} agotados · ${kpis.criticos} bajo mínimo`,  color:'#ef4444',  icon:AlertTriangle },
          { label:'Próx. a vencer (30d)',     val: kpis.porVencer,                                 sub: kpis.vencidos > 0 ? `${kpis.vencidos} ya vencidos` : 'Sin vencidos',  color:'#f59e0b',  icon:Clock  },
          { label:'Productos filtrados',      val: filtered.length,                                sub: `de ${kpis.total} productos`,  color:'#3b82f6',  icon:TrendingDown  },
        ].map(({ label, val, sub, color, icon:Icon, mono }) => (
          <div key={label} className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }}/>
            <div className="absolute top-3 right-4 opacity-[0.06]"><Icon size={44}/></div>
            <div className="flex items-center gap-1.5 mb-2">
              <Icon size={11} style={{ color, opacity:0.8 }}/>
              <span className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.07em]">{label}</span>
            </div>
            <div className={`font-bold text-[#e8edf2] leading-none ${mono ? 'text-[17px] font-mono' : 'text-[26px]'}`}>{val}</div>
            <div className="text-[11px] text-[#5f6f80] mt-1.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Inventario de Productos</span>
          <Btn variant="primary" size="sm" onClick={abrirNuevo}>
            <Plus size={13}/> Nuevo Producto
          </Btn>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <input className={SI + ' pl-8'} placeholder="Buscar SKU, nombre..." value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
          </div>
          <select className={SEL} style={{width:160}} value={filtCat} onChange={e => setFiltCat(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <select className={SEL} style={{width:160}} value={filtAlm} onChange={e => setFiltAlm(e.target.value)}>
            <option value="">Todos los almacenes</option>
            {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
          <select className={SEL} style={{width:150}} value={filtStock} onChange={e => setFiltStock(e.target.value)}>
            <option value="">Estado: todos</option>
            <option value="critico">Crítico / Agotado</option>
            <option value="vencidos">Vencidos</option>
          </select>
          {(busqueda||filtCat||filtAlm||filtStock) && (
            <Btn variant="ghost" size="sm" onClick={() => { setBusqueda(''); setFiltCat(''); setFiltAlm(''); setFiltStock('') }}>
              Limpiar
            </Btn>
          )}
        </div>

        <div className="text-[12px] text-[#5f6f80] mb-3">
          {filtered.length} de {kpis.total} productos · Valorización: <span className="text-[#00c896] font-semibold">{formulaValorizacion}</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <TH>SKU</TH>
                <TH>Producto</TH>
                <TH>Categoría</TH>
                <TH>Almacén</TH>
                <TH right>Stock</TH>
                <TH right>Reservado</TH>
                <TH right>Disponible</TH>
                <TH right>Costo PMP</TH>
                <TH right>Valor Stock</TH>
                <TH>Estado</TH>
                <TH>Vence</TH>
                <TH>Acciones</TH>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={12}>
                  <EmptyState icon={Package} title="Sin resultados" description="Prueba con otros filtros o agrega un producto."/>
                </td></tr>
              )}
              {filtered.map(p => {
                const pmp       = calcularPMP(p.batches || [])
                const val       = valorarStock(p.batches || [], formulaValorizacion)
                const dias      = diasParaVencer(p.fechaVencimiento)
                const reservado = stockReservado?.[p.id] || 0
                const disponible= Math.max(0, p.stockActual - reservado)
                const dispColor = disponible <= 0 ? 'text-red-400 font-bold'
                                : disponible <= p.stockMinimo ? 'text-amber-400 font-semibold'
                                : 'text-[#00c896] font-semibold'
                return (
                  <tr key={p.id}
                    className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02] cursor-pointer transition-colors"
                    onClick={() => abrirDet(p)}>
                    <TD mono><span className="text-[#00c896]">{p.sku}</span></TD>
                    <TD>
                      <div className="font-medium text-[#e8edf2]">{p.nombre}</div>
                      {p.descripcion && <div className="text-[11px] text-[#5f6f80] mt-0.5 max-w-[200px] truncate">{p.descripcion}</div>}
                    </TD>
                    <TD muted>{catNombre(p.categoriaId)}</TD>
                    <TD muted>{almNombre(p.almacenId)}</TD>
                    <TD mono right>{p.stockActual} <span className="text-[#5f6f80] text-[11px]">{p.unidadMedida}</span></TD>
                    <TD mono right>
                      {reservado > 0
                        ? <span className="text-amber-400 font-semibold">{reservado}</span>
                        : <span className="text-[#5f6f80]">—</span>
                      }
                    </TD>
                    <TD mono right>
                      <span className={dispColor}>{disponible}</span>
                    </TD>
                    <TD mono right>{formatCurrency(pmp, simboloMoneda)}</TD>
                    <TD mono right><span className="text-[#00c896] font-semibold">{formatCurrency(val, simboloMoneda)}</span></TD>
                    <TD><StockBadge stockActual={p.stockActual} stockMinimo={p.stockMinimo}/></TD>
                    <TD>
                      {p.tieneVencimiento && dias !== null
                        ? <Badge variant={dias < 0 ? 'danger' : dias <= 30 ? 'warning' : dias <= 90 ? 'info' : 'success'}>
                            {dias < 0 ? 'Vencido' : `${dias}d`}
                          </Badge>
                        : <span className="text-[#5f6f80]">—</span>
                      }
                    </TD>
                    <td className="px-3.5 py-2.5" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Btn variant="ghost" size="icon" title="Ver detalle"  onClick={e => abrirDetBtn(p, e)}><Eye   size={13}/></Btn>
                        <Btn variant="ghost" size="icon" title="Editar"       onClick={e => abrirEditar(p, e)}><Edit2 size={13}/></Btn>
                        <Btn variant="ghost" size="icon" title="Eliminar" className="text-red-400 hover:text-red-300"
                          onClick={e => pedirDel(p.id, e)}><Trash2 size={13}/></Btn>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>


      {/* ── Panel explicativo: Stock Reservado ──────── */}
      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        <div className="flex items-start gap-4">

          {/* Ícono */}
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
            <Package size={17} className="text-amber-400"/>
          </div>

          <div className="flex-1">
            <div className="text-[13px] font-semibold text-[#e8edf2] mb-1">
              ¿Cómo funciona el Stock Reservado y Disponible?
            </div>
            <p className="text-[12px] text-[#9ba8b6] leading-relaxed mb-4">
              Cuando registras un despacho, el sistema <strong className="text-[#e8edf2]">bloquea automáticamente</strong> las
              unidades de cada producto incluido en ese pedido. Esto evita que el mismo stock sea comprometido
              con dos clientes diferentes. El bloqueo se activa mientras el despacho esté en alguno de estos estados:
            </p>

            {/* Estados que reservan */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
              {[
                { estado:'PEDIDO',   desc:'Pedido registrado, pendiente de aprobación',   color:'#5f6f80' },
                { estado:'APROBADO', desc:'Aprobado, pendiente de preparación',           color:'#3b82f6' },
                { estado:'PICKING',  desc:'En preparación en el almacén',                 color:'#f59e0b' },
                { estado:'LISTO',    desc:'Listo para despachar al cliente',              color:'#00c896' },
              ].map(({ estado, desc, color }) => (
                <div key={estado} className="bg-[#1a2230] rounded-lg px-3 py-2.5 border-l-2" style={{ borderColor: color }}>
                  <div className="text-[11px] font-bold mb-0.5" style={{ color }}>{estado}</div>
                  <div className="text-[11px] text-[#5f6f80] leading-snug">{desc}</div>
                </div>
              ))}
            </div>

            {/* Las 3 columnas explicadas */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-[#1a2230] rounded-lg px-3.5 py-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#9ba8b6] shrink-0"/>
                  <span className="text-[11px] font-bold text-[#e8edf2] uppercase tracking-wide">Stock</span>
                </div>
                <p className="text-[11px] text-[#5f6f80] leading-relaxed">
                  El total físico en el almacén. No cambia hasta que se registre una entrada o salida real.
                </p>
              </div>
              <div className="bg-[#1a2230] rounded-lg px-3.5 py-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"/>
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wide">Reservado</span>
                </div>
                <p className="text-[11px] text-[#5f6f80] leading-relaxed">
                  Unidades bloqueadas por despachos activos. Se liberan automáticamente al marcar el despacho como
                  <strong className="text-[#9ba8b6]"> DESPACHADO, ENTREGADO o ANULADO</strong>.
                </p>
              </div>
              <div className="bg-[#1a2230] rounded-lg px-3.5 py-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00c896] shrink-0"/>
                  <span className="text-[11px] font-bold text-[#00c896] uppercase tracking-wide">Disponible</span>
                </div>
                <p className="text-[11px] text-[#5f6f80] leading-relaxed">
                  Lo que realmente puedes vender o comprometer: <span className="font-mono text-[#e8edf2]">Stock − Reservado</span>.
                  En <span className="text-[#00c896]">verde</span> si hay margen,
                  <span className="text-amber-400"> ámbar</span> si está bajo el mínimo,
                  <span className="text-red-400"> rojo</span> si está agotado.
                </p>
              </div>
            </div>

            {/* Tip accionable */}
            <div className="flex items-start gap-2.5 px-3.5 py-2.5 bg-[#00c896]/8 border border-[#00c896]/20 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00c896] shrink-0 mt-1.5"/>
              <p className="text-[11px] text-[#9ba8b6] leading-relaxed">
                <strong className="text-[#e8edf2]">¿Cómo activar una reserva?</strong>{' '}
                Ve a <strong className="text-[#00c896]">Despachos → Nuevo Pedido</strong>, agrega los productos y guarda.
                El stock reservado se actualizará aquí en tiempo real mientras el pedido esté en estado PEDIDO, APROBADO, PICKING o LISTO.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modales */}
      <ModalProducto
        open={modalForm}
        onClose={() => setModalForm(false)}
        editando={editando}
        categorias={categorias}
        almacenes={almacenes}
        proveedores={proveedores}
        onSaved={handleSaved}
      />

      <ModalDetalle
        open={!!modalDet}
        onClose={() => setModalDet(null)}
        producto={modalDet}
        catNombre={catNombre}
        almNombre={almNombre}
        formulaValorizacion={formulaValorizacion}
        simboloMoneda={simboloMoneda}
        stockReservado={stockReservado || {}}
      />

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => handleDel(confirmDel)}
        danger
        title="Eliminar producto"
        message="¿Eliminar este producto? Esta acción no se puede deshacer."
      />
    </div>
  )
}


// ── Valores por defecto fuera del componente ────────────
const INIT_PRODUCTO = {
  sku:'', nombre:'', descripcion:'',
  categoriaId:'', unidadMedida:'UND',
  stockMinimo:0, stockMaximo:0,
  almacenId:'', proveedorId:'',
  precioVenta:0,
  tieneVencimiento:false, fechaVencimiento:'',
  activo:true,
}

function normalizarProducto(p) {
  return {
    ...INIT_PRODUCTO,
    ...p,
    descripcion:      p.descripcion      || '',
    proveedorId:      p.proveedorId      || '',
    precioVenta:      p.precioVenta      ?? 0,
    fechaVencimiento: p.fechaVencimiento || '',
    tieneVencimiento: !!p.tieneVencimiento,
    activo:           p.activo !== false,
  }
}

// ── Modal Crear / Editar Producto ─────────────────────────
function ModalProducto({ open, onClose, editando, categorias, almacenes, proveedores, onSaved }) {
  const [form, setForm] = useState(INIT_PRODUCTO)
  const [err,  setErr]  = useState({})
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (!open) return
    setErr({})
    setForm(editando
      ? normalizarProducto(editando)
      : { ...INIT_PRODUCTO, almacenId: almacenes[0]?.id || '' }
    )
  }, [open, editando])  // eslint-disable-line react-hooks/exhaustive-deps

  function validate() {
    const e = {}
    if (!String(form.sku    || '').trim()) e.sku         = 'Requerido'
    if (!String(form.nombre || '').trim()) e.nombre      = 'Requerido'
    if (!form.categoriaId)                 e.categoriaId = 'Requerido'
    setErr(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validate()) return
    storage.saveProducto({
      ...form,
      stockMinimo:      +form.stockMinimo  || 0,
      stockMaximo:      +form.stockMaximo  || 0,
      precioVenta:      +form.precioVenta  || 0,
      fechaVencimiento: form.tieneVencimiento ? (form.fechaVencimiento || null) : null,
    })
    onSaved()
  }

  const SI  = 'px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 w-full font-[inherit] placeholder-[#5f6f80]'
  const SEL = SI + ' pr-8'

  return (
    <Modal open={open} onClose={onClose}
      title={editando ? 'Editar Producto' : 'Nuevo Producto'}
      size="lg"
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" onClick={handleSave}>
            {editando ? 'Guardar Cambios' : 'Crear Producto'}
          </Btn>
        </>
      }>

      <div className="grid grid-cols-2 gap-3.5">
        <Field label="SKU *" error={err.sku}>
          <input className={SI} value={form.sku || ''}
            onChange={e => f('sku', e.target.value)} placeholder="ELEC-001"/>
        </Field>
        <Field label="Unidad de Medida">
          <select className={SEL} value={form.unidadMedida || 'UND'}
            onChange={e => f('unidadMedida', e.target.value)}>
            {['UND','KG','LT','MT','CJA','PAQ','RESMA','DOC','JGO','SET','SACO','ROLLO','BALDE','CAJA'].map(u => <option key={u}>{u}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Nombre del Producto *" error={err.nombre}>
        <input className={SI} value={form.nombre || ''}
          onChange={e => f('nombre', e.target.value)} placeholder="Nombre descriptivo"/>
      </Field>

      <Field label="Descripción">
        <textarea className={SI + ' resize-y min-h-[52px]'} value={form.descripcion || ''}
          onChange={e => f('descripcion', e.target.value)} placeholder="Descripción opcional..."/>
      </Field>

      <div className="grid grid-cols-3 gap-3.5">
        <Field label="Categoría *" error={err.categoriaId}>
          <select className={SEL} value={form.categoriaId || ''}
            onChange={e => f('categoriaId', e.target.value)}>
            <option value="">Seleccionar...</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </Field>
        <Field label="Almacén">
          <select className={SEL} value={form.almacenId || ''}
            onChange={e => f('almacenId', e.target.value)}>
            {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </Field>
        <Field label="Proveedor">
          <select className={SEL} value={form.proveedorId || ''}
            onChange={e => f('proveedorId', e.target.value)}>
            <option value="">Sin proveedor</option>
            {proveedores.map(p => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3.5">
        <Field label="Stock Mínimo">
          <input type="number" className={SI} value={form.stockMinimo ?? 0}
            onChange={e => f('stockMinimo', e.target.value)} min="0"/>
        </Field>
        <Field label="Stock Máximo">
          <input type="number" className={SI} value={form.stockMaximo ?? 0}
            onChange={e => f('stockMaximo', e.target.value)} min="0"/>
        </Field>
        <Field label="Precio de Venta (S/)">
          <input type="number" className={SI} value={form.precioVenta ?? 0}
            onChange={e => f('precioVenta', e.target.value)} min="0" step="0.01"/>
        </Field>
      </div>

      <div className="flex items-start gap-6 flex-wrap pt-1">
        <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[#9ba8b6] mt-1">
          <input type="checkbox" checked={!!form.tieneVencimiento}
            onChange={e => f('tieneVencimiento', e.target.checked)} className="accent-[#00c896]"/>
          Tiene fecha de vencimiento
        </label>
        {form.tieneVencimiento && (
          <Field label="Fecha de Vencimiento">
            <input type="date" className={SI} style={{width:180}}
              value={form.fechaVencimiento || ''}
              onChange={e => f('fechaVencimiento', e.target.value)}/>
          </Field>
        )}
        {editando && (
          <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[#9ba8b6] mt-1">
            <input type="checkbox" checked={!!form.activo}
              onChange={e => f('activo', e.target.checked)} className="accent-[#00c896]"/>
            Producto activo
          </label>
        )}
      </div>
    </Modal>
  )
}

// ── Modal Detalle Producto ────────────────────────────────
function ModalDetalle({ open, onClose, producto, catNombre, almNombre, formulaValorizacion, simboloMoneda, stockReservado }) {
  if (!open || !producto) return null
  const p        = producto
  const pmp      = calcularPMP(p.batches || [])
  const val      = valorarStock(p.batches || [], formulaValorizacion)
  const dias     = diasParaVencer(p.fechaVencimiento)
  const reservado  = stockReservado?.[p.id] || 0
  const disponible = Math.max(0, p.stockActual - reservado)
  const margen     = p.precioVenta > 0
    ? (((p.precioVenta - pmp) / p.precioVenta) * 100).toFixed(1) + '%'
    : '—'

  const info = [
    ['SKU',              p.sku],
    ['Unidad',           p.unidadMedida],
    ['Categoría',        catNombre(p.categoriaId)],
    ['Almacén',          almNombre(p.almacenId)],
    ['Stock actual',     p.stockActual + ' ' + p.unidadMedida],
    ['Stock reservado',  reservado + ' ' + p.unidadMedida],
    ['Stock disponible', disponible + ' ' + p.unidadMedida],
    ['Stock mínimo',     p.stockMinimo + ' ' + p.unidadMedida],
    ['Costo PMP',        formatCurrency(pmp, simboloMoneda)],
    ['Precio venta',     p.precioVenta > 0 ? formatCurrency(p.precioVenta, simboloMoneda) : '—'],
    ['Margen bruto',     margen],
    ['Valor en stock',   formatCurrency(val, simboloMoneda)],
    ['Vencimiento',      p.tieneVencimiento
      ? formatDate(p.fechaVencimiento) + ' (' + (dias !== null ? dias < 0 ? 'Vencido' : dias + 'd' : '—') + ')'
      : 'No aplica'],
  ]

  return (
    <Modal open={open} onClose={onClose} title={p.nombre} size="md"
      footer={<Btn variant="secondary" onClick={onClose}>Cerrar</Btn>}>

      <div className="grid grid-cols-2 gap-2.5">
        {info.map(([k, v]) => (
          <div key={k} className="bg-[#1a2230] rounded-lg px-3.5 py-2.5">
            <div className="text-[10px] text-[#5f6f80] uppercase tracking-wide mb-0.5">{k}</div>
            <div className="text-[13px] font-medium text-[#e8edf2]">{v || '—'}</div>
          </div>
        ))}
      </div>

      {p.descripcion && (
        <p className="text-[13px] text-[#9ba8b6] leading-relaxed px-1">{p.descripcion}</p>
      )}

      {(p.batches || []).length > 0 && (
        <>
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Lotes en stock</div>
          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full border-collapse text-[12px]">
              <thead><tr>
                {['Lote','Fecha','Cantidad','Costo unit.','Subtotal'].map(h => (
                  <th key={h} className="bg-[#1a2230] px-3 py-2 text-left text-[10px] font-semibold text-[#5f6f80] uppercase border-b border-white/[0.08]">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {p.batches.map((b, i) => (
                  <tr key={i} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]">
                    <td className="px-3 py-2 font-mono text-[#9ba8b6]">{b.lote || '—'}</td>
                    <td className="px-3 py-2 text-[#9ba8b6]">{formatDate(b.fecha)}</td>
                    <td className="px-3 py-2 font-mono">{Number(b.cantidad).toFixed(2)} {p.unidadMedida}</td>
                    <td className="px-3 py-2 font-mono">{formatCurrency(b.costo, simboloMoneda)}</td>
                    <td className="px-3 py-2 font-mono text-[#00c896] font-semibold">{formatCurrency(b.cantidad * b.costo, simboloMoneda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  )
}
