import { useState, useMemo, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, Eye, Package, AlertTriangle, DollarSign, TrendingDown, Download, FileText } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { usePlanLimits } from '../hooks/usePlanLimits'
import { formatCurrency, estadoStock, formatDate } from '../utils/helpers'
import { Modal, ConfirmDialog, EmptyState, StockBadge, Badge, Btn, Field } from '../components/ui/index'
import { useProductosList, useCrearProducto, useActualizarProducto, useEliminarProducto } from '../queries/productos.queries'
import { useInventarioList } from '../queries/inventario.queries'
import { useCategoriasList, useCrearCategoria } from '../queries/categorias.queries'
import { useAlmacenesList, useCrearAlmacen } from '../queries/almacenes.queries'
import { useProveedoresList, useCrearProveedor } from '../queries/proveedores.queries'
import { exportarProductosXLSX } from '../utils/exportXLSX'
import { exportarProductosPDF } from '../utils/exportPDF'

const SI  = 'px-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 w-full font-[inherit] placeholder-[#5f6f80]'
const SEL = SI + ' pr-8'
const TH  = ({ children, right }) => <th className={`bg-[#1a2230] px-3.5 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] whitespace-nowrap border-b border-white/8 sticky top-0 z-10 ${right ? 'text-right' : 'text-left'}`}>{children}</th>
const TD  = ({ children, mono, muted, right, className = '' }) => <td className={`px-3.5 py-2.5 align-middle ${mono ? 'font-mono text-[12px]' : ''} ${muted ? 'text-[#9ba8b6]' : 'text-[#e8edf2]'} ${right ? 'text-right' : ''} ${className}`}>{children}</td>

const UMs = ['UND','KG','LT','MT','CJA','PAQ','RESMA','DOC','JGO','SET','SACO','ROLLO','BALDE','CAJA']

export default function Inventario() {
  const { toast, sesion } = useApp()
  const planLimits = usePlanLimits()
  const simboloMoneda = 'S/'

  // ── Datos reales ──────────────────────────────────────
  const { data: productosRaw  = [], isLoading: loadingProd } = useProductosList({ incluirInactivos: true })
  const { data: inventarioRaw = [] }                         = useInventarioList()
  const { data: categorias    = [] }                         = useCategoriasList()
  const { data: almacenes     = [] }                         = useAlmacenesList()
  const { data: proveedores   = [] }                         = useProveedoresList()

  // ── Mutaciones ────────────────────────────────────────
  const crearProducto     = useCrearProducto()
  const actualizarProducto = useActualizarProducto()
  const eliminarProducto  = useEliminarProducto()
  const crearCategoria    = useCrearCategoria()
  const crearAlmacen      = useCrearAlmacen()
  const crearProveedor    = useCrearProveedor()

  // ── Estado local ──────────────────────────────────────
  const [busqueda,   setBusqueda]   = useState('')
  const [filtCat,    setFiltCat]    = useState('')
  const [filtAlm,    setFiltAlm]    = useState('')
  const [filtStock,  setFiltStock]  = useState('')
  const [modalForm,  setModalForm]  = useState(false)
  const [modalDet,   setModalDet]   = useState(null)
  const [editando,   setEditando]   = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [quickCat,   setQuickCat]   = useState({ open: false, cb: null })
  const [quickAlm,   setQuickAlm]   = useState({ open: false, cb: null })
  const [quickProv,  setQuickProv]  = useState({ open: false, cb: null })

  // ── Enriquecer productos con stockActual ──────────────
  const { productos, productosPorAlmacen } = useMemo(() => {
    const stockMap = {}
    const porAlmacen = {}   // almacenId → Set<productoId>
    inventarioRaw.forEach(item => {
      stockMap[item.productoId] = (stockMap[item.productoId] || 0) + Number(item.cantidad || 0)
      if (!porAlmacen[item.almacenId]) porAlmacen[item.almacenId] = new Set()
      porAlmacen[item.almacenId].add(item.productoId)
    })
    const enriquecidos = productosRaw.map(p => ({
      ...p,
      activo:      p.estado === 'Activo',
      stockActual: stockMap[p.id] || 0,
      stockMinimo: Number(p.stockMinimo || 0),
    }))
    return { productos: enriquecidos, productosPorAlmacen: porAlmacen }
  }, [productosRaw, inventarioRaw])

  // ── Stock reservado desde inventario (simplificado = 0) ─
  const stockReservado = {}

  // ── Filtros ───────────────────────────────────────────
  const filtered = useMemo(() => {
    let d = productos.filter(p => p.activo)
    if (busqueda) {
      const q = busqueda.toLowerCase()
      d = d.filter(p => p.nombre?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q))
    }
    if (filtCat) d = d.filter(p => p.categoriaId === filtCat)
    if (filtAlm) d = d.filter(p => productosPorAlmacen[filtAlm]?.has(p.id))
    if (filtStock === 'critico') d = d.filter(p => { const e = estadoStock(p.stockActual, p.stockMinimo); return e.estado === 'critico' || e.estado === 'agotado' })
    return d
  }, [productos, busqueda, filtCat, filtAlm, filtStock, productosPorAlmacen])

  const catMap = useMemo(() => new Map(categorias.map(c => [c.id, c.nombre])), [categorias])
  const almMap = useMemo(() => new Map(almacenes.map(a => [a.id, a.nombre])), [almacenes])

  const kpis = useMemo(() => {
    const activos    = productos.filter(p => p.activo)
    const valorTotal = activos.reduce((s, p) => s + (Number(p.precioCompra || 0) * p.stockActual), 0)
    const agotados   = activos.filter(p => p.stockActual <= 0).length
    const criticos   = activos.filter(p => estadoStock(p.stockActual, p.stockMinimo).estado === 'critico').length
    return { total: activos.length, valorTotal, agotados, criticos }
  }, [productos])

  // ── Handlers de quick-create ──────────────────────────
  async function handleQuickCat(nombre) {
    const res = await crearCategoria.mutateAsync({ nombre: nombre.trim(), descripcion: '' })
    if (res.error) { toast(res.error, 'error'); return }
    if (res.data?.id && quickCat.cb) quickCat.cb(res.data.id)
    setQuickCat({ open: false, cb: null })
    toast('Categoría creada', 'success')
  }
  async function handleQuickAlm(nombre) {
    if (!planLimits.almacenes.permitido) { toast(planLimits.almacenes.mensaje || 'Límite de almacenes alcanzado', 'error'); return }
    const res = await crearAlmacen.mutateAsync({ nombre: nombre.trim() })
    if (res.error) { toast(res.error, 'error'); return }
    if (res.data?.id && quickAlm.cb) quickAlm.cb(res.data.id)
    setQuickAlm({ open: false, cb: null })
    toast('Almacén creado', 'success')
  }
  async function handleQuickProv(data) {
    if (!planLimits.proveedores.permitido) { toast(planLimits.proveedores.mensaje || 'Límite de proveedores alcanzado', 'error'); return }
    const res = await crearProveedor.mutateAsync({ razonSocial: data.razonSocial, ruc: data.ruc, telefono: data.telefono })
    if (res.error) { toast(res.error, 'error'); return }
    if (res.data?.id && quickProv.cb) quickProv.cb(res.data.id)
    setQuickProv({ open: false, cb: null })
    toast('Proveedor creado', 'success')
  }

  // ── CRUD ──────────────────────────────────────────────
  async function handleDel(id) {
    const res = await eliminarProducto.mutateAsync(id)
    if (res.error) { toast(res.error, 'error'); return }
    toast('Producto desactivado', 'success')
    setConfirmDel(null)
  }

  async function handleSaved(form) {
    const payload = {
      sku:          form.sku,
      nombre:       form.nombre,
      barcode:      form.barcode || undefined,
      categoriaId:  form.categoriaId || undefined,
      proveedorId:  form.proveedorId || undefined,
      unidadMedida: form.unidadMedida || 'UND',
      esPerecedero: !!form.esPerecedero,
      stockMinimo:  +form.stockMinimo || 0,
      stockMaximo:  +form.stockMaximo || 0,
      precioCompra: +form.precioCompra || 0,
      precioVenta:  +form.precioVenta  || 0,
    }
    let res
    if (editando) {
      res = await actualizarProducto.mutateAsync({
        id: editando.id,
        ...payload,
        estado: form.activo ? 'Activo' : 'Inactivo',
      })
    } else {
      res = await crearProducto.mutateAsync(payload)
    }
    if (res.error) { toast(res.error, 'error'); return }
    setModalForm(false)
    toast(editando ? 'Producto actualizado' : 'Producto creado', 'success')
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          { label:'Valor del inventario',   val: formatCurrency(kpis.valorTotal, 'S/'),        sub: `${kpis.total} productos · Precio Compra`, color:'#00c896', icon:DollarSign,   mono:true  },
          { label:'Agotados / Críticos',    val: `${kpis.agotados} / ${kpis.criticos}`,        sub: `${kpis.agotados} agotados · ${kpis.criticos} bajo mínimo`, color:'#ef4444', icon:AlertTriangle },
          { label:'Filtrados',              val: filtered.length,                               sub: `de ${kpis.total} productos`, color:'#3b82f6', icon:TrendingDown },
          { label:'Total activos',          val: kpis.total,                                    sub: 'productos en sistema', color:'#f59e0b', icon:Package },
        ].map(({ label, val, sub, color, icon:Icon, mono }) => (
          <div key={label} className="relative bg-[#161d28] border border-white/8 rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }}/>
            <div className="absolute top-3 right-4 opacity-[0.06]"><Icon size={44}/></div>
            <div className="flex items-center gap-1.5 mb-2">
              <Icon size={11} style={{ color, opacity:0.8 }}/>
              <span className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.07em]">{label}</span>
            </div>
            <div className={`font-semibold text-[#e8edf2] leading-none ${mono ? 'text-[17px] font-mono' : 'text-[28px]'}`}>{val}</div>
            <div className="text-[11px] text-[#5f6f80] mt-1.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Inventario de Productos</span>
          <div className="flex items-center gap-2">
            <Btn variant="ghost" size="sm" onClick={() => exportarProductosXLSX(filtered, categorias)}>
              <Download size={13}/> Excel
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => exportarProductosPDF(filtered, categorias, simboloMoneda, sesion?.nombre)}>
              <FileText size={13}/> PDF
            </Btn>
            {planLimits.productos.maximo !== -1 && (
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                !planLimits.productos.permitido ? 'bg-red-500/20 text-red-400' :
                planLimits.productos.porcentaje >= 80 ? 'bg-amber-500/20 text-amber-400' :
                'bg-white/6 text-[#5f6f80]'
              }`}>
                {planLimits.productos.actual}/{planLimits.productos.maximo}
              </span>
            )}
            <Btn variant="primary" size="sm"
              disabled={!planLimits.productos.permitido}
              title={planLimits.productos.mensaje || undefined}
              onClick={() => { setEditando(null); setModalForm(true) }}>
              <Plus size={13}/> Nuevo Producto
            </Btn>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <input className={SI + ' pl-8'} placeholder="Buscar SKU, nombre..." value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
          </div>
          <select className={SEL} style={{ width:160 }} value={filtCat} onChange={e => setFiltCat(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <select className={SEL} style={{ width:160 }} value={filtAlm} onChange={e => setFiltAlm(e.target.value)}>
            <option value="">Todos los almacenes</option>
            {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
          <select className={SEL} style={{ width:150 }} value={filtStock} onChange={e => setFiltStock(e.target.value)}>
            <option value="">Estado: todos</option>
            <option value="critico">Crítico / Agotado</option>
          </select>
          {(busqueda || filtCat || filtAlm || filtStock) && (
            <Btn variant="ghost" size="sm" onClick={() => { setBusqueda(''); setFiltCat(''); setFiltAlm(''); setFiltStock('') }}>
              Limpiar
            </Btn>
          )}
        </div>

        <div className="text-[12px] text-[#5f6f80] mb-3">
          {filtered.length} de {kpis.total} productos · Valorización: <span className="text-[#00c896] font-semibold">Precio Compra</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <TH>SKU</TH>
                <TH>Producto</TH>
                <TH>Categoría</TH>
                <TH right>Stock</TH>
                <TH right>Disponible</TH>
                <TH right>Costo Unit.</TH>
                <TH right>Valor Stock</TH>
                <TH>Estado</TH>
                <TH>Acciones</TH>
              </tr>
            </thead>
            <tbody>
              {loadingProd && (
                <tr><td colSpan={9} className="text-center text-[#5f6f80] py-8 text-[12px]">Cargando productos...</td></tr>
              )}
              {!loadingProd && filtered.length === 0 && (
                <tr><td colSpan={9}><EmptyState icon={Package} title="Sin resultados" description="Prueba con otros filtros o agrega un producto."/></td></tr>
              )}
              {filtered.map(p => {
                const val      = Number(p.precioCompra || 0) * p.stockActual
                const reservado  = stockReservado[p.id] || 0
                const disponible = Math.max(0, p.stockActual - reservado)
                const dispColor  = disponible <= 0 ? 'text-red-400 font-bold'
                                 : disponible <= p.stockMinimo ? 'text-amber-400 font-semibold'
                                 : 'text-[#00c896] font-semibold'
                return (
                  <tr key={p.id}
                    className="border-b border-white/6 last:border-0 hover:bg-white/2 cursor-pointer transition-colors"
                    onClick={() => setModalDet(p)}>
                    <TD mono><span className="text-[#00c896]">{p.sku}</span></TD>
                    <TD>
                      <div className="font-medium text-[#e8edf2]">{p.nombre}</div>
                      {p.barcode && <div className="text-[11px] text-[#5f6f80] mt-0.5">{p.barcode}</div>}
                    </TD>
                    <TD muted>{catMap.get(p.categoriaId) || '—'}</TD>
                    <TD mono right>{p.stockActual} <span className="text-[#5f6f80] text-[11px]">{p.unidadMedida}</span></TD>
                    <TD mono right><span className={dispColor}>{disponible}</span></TD>
                    <TD mono right>{formatCurrency(Number(p.precioCompra || 0), 'S/')}</TD>
                    <TD mono right><span className="text-[#00c896] font-semibold">{formatCurrency(val, 'S/')}</span></TD>
                    <TD><StockBadge stockActual={p.stockActual} stockMinimo={p.stockMinimo}/></TD>
                    <td className="px-3.5 py-2.5" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Btn variant="ghost" size="icon" title="Ver detalle"  onClick={e => { e.stopPropagation(); setModalDet(p) }}><Eye   size={13}/></Btn>
                        <Btn variant="ghost" size="icon" title="Editar"       onClick={e => { e.stopPropagation(); setEditando(p); setModalForm(true) }}><Edit2 size={13}/></Btn>
                        <Btn variant="ghost" size="icon" title="Eliminar" className="text-red-400 hover:text-red-300"
                          onClick={e => { e.stopPropagation(); setConfirmDel(p.id) }}><Trash2 size={13}/></Btn>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
        saving={crearProducto.isPending || actualizarProducto.isPending}
        onAddCategoria={cb => setQuickCat({ open: true, cb })}
        onAddAlmacen={cb => setQuickAlm({ open: true, cb })}
        onAddProveedor={cb => setQuickProv({ open: true, cb })}
      />

      <ModalQuickCategoria open={quickCat.open} onClose={() => setQuickCat({ open: false, cb: null })} onSave={handleQuickCat}/>
      <ModalQuickAlmacen   open={quickAlm.open} onClose={() => setQuickAlm({ open: false, cb: null })} onSave={handleQuickAlm}/>
      <ModalQuickProveedor open={quickProv.open} onClose={() => setQuickProv({ open: false, cb: null })} onSave={handleQuickProv}/>

      <ModalDetalle
        open={!!modalDet}
        onClose={() => setModalDet(null)}
        producto={modalDet}
        catNombre={id => catMap.get(id) || '—'}
        almNombre={id => almMap.get(id) || '—'}
        inventarioRaw={inventarioRaw}
        almacenes={almacenes}
      />

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => handleDel(confirmDel)}
        danger
        title="Desactivar producto"
        message="¿Desactivar este producto? Quedará inactivo pero se conserva el historial."
      />
    </div>
  )
}

// ── Valores por defecto ───────────────────────────────────────
const INIT_PRODUCTO = {
  sku:'', nombre:'', barcode:'',
  categoriaId:'', unidadMedida:'UND',
  stockMinimo:0, stockMaximo:0,
  proveedorId:'',
  precioCompra:0, precioVenta:0,
  esPerecedero:false,
  activo:true,
}

function normalizarProducto(p) {
  return {
    ...INIT_PRODUCTO,
    ...p,
    barcode:      p.barcode     || '',
    proveedorId:  p.proveedorId || '',
    precioCompra: Number(p.precioCompra ?? 0),
    precioVenta:  Number(p.precioVenta  ?? 0),
    stockMinimo:  Number(p.stockMinimo  ?? 0),
    stockMaximo:  Number(p.stockMaximo  ?? 0),
    esPerecedero: !!p.esPerecedero,
    activo:       p.estado === 'Activo',
  }
}

// ── Modal Crear / Editar Producto ─────────────────────────────
export function ModalProducto({ open, onClose, editando, categorias, almacenes, proveedores, onSaved, saving, onAddCategoria, onAddAlmacen, onAddProveedor }) {
  const planLimits = usePlanLimits()
  const [form, setForm] = useState(INIT_PRODUCTO)
  const [err,  setErr]  = useState({})
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (!open) return
    setErr({})
    setForm(editando ? normalizarProducto(editando) : { ...INIT_PRODUCTO })
  }, [open, editando])  // eslint-disable-line

  function validate() {
    const e = {}
    if (!String(form.sku    || '').trim()) e.sku        = 'Requerido'
    if (!String(form.nombre || '').trim()) e.nombre     = 'Requerido'
    if (!form.categoriaId)                 e.categoriaId = 'Requerido'
    setErr(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validate()) return
    onSaved(form)
  }

  return (
    <Modal open={open} onClose={onClose}
      title={editando ? 'Editar Producto' : 'Nuevo Producto'}
      size="lg"
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : editando ? 'Guardar Cambios' : 'Crear Producto'}
          </Btn>
        </>
      }>

      <div className="grid grid-cols-2 gap-3.5">
        <Field label="SKU *" error={err.sku}>
          <input className={SI} value={form.sku || ''} onChange={e => f('sku', e.target.value)} placeholder="ELEC-001"/>
        </Field>
        <Field label="Unidad de Medida">
          <select className={SEL} value={form.unidadMedida || 'UND'} onChange={e => f('unidadMedida', e.target.value)}>
            {UMs.map(u => <option key={u}>{u}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Nombre del Producto *" error={err.nombre}>
        <input className={SI} value={form.nombre || ''} onChange={e => f('nombre', e.target.value)} placeholder="Nombre descriptivo"/>
      </Field>

      <Field label="Código de Barras">
        <input className={SI} value={form.barcode || ''} onChange={e => f('barcode', e.target.value)} placeholder="EAN13, UPC..."/>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        <Field label="Categoría *" error={err.categoriaId}>
          <div className="flex gap-1.5">
            <select className={SEL + ' flex-1'} value={form.categoriaId || ''} onChange={e => f('categoriaId', e.target.value)}>
              <option value="">Seleccionar...</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <button type="button" title="Nueva categoría"
              className="shrink-0 w-8.5 flex items-center justify-center bg-[#00c896]/10 hover:bg-[#00c896]/20 border border-[#00c896]/30 rounded-lg text-[#00c896] transition-colors"
              onClick={() => onAddCategoria?.(id => f('categoriaId', id))}>
              <Plus size={13}/>
            </button>
          </div>
        </Field>
        <Field label="Proveedor">
          <div className="flex gap-1.5">
            <select className={SEL + ' flex-1'} value={form.proveedorId || ''} onChange={e => f('proveedorId', e.target.value)}>
              <option value="">Sin proveedor</option>
              {proveedores.map(p => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}
            </select>
            <button type="button"
              title={!planLimits.proveedores.permitido ? planLimits.proveedores.mensaje : 'Nuevo proveedor'}
              disabled={!planLimits.proveedores.permitido}
              className="shrink-0 w-8.5 flex items-center justify-center bg-[#00c896]/10 hover:bg-[#00c896]/20 border border-[#00c896]/30 rounded-lg text-[#00c896] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => onAddProveedor?.(id => f('proveedorId', id))}>
              <Plus size={13}/>
            </button>
          </div>
        </Field>
        <Field label="Almacén inicial">
          <div className="flex gap-1.5">
            <select className={SEL + ' flex-1'} disabled value="">
              <option value="">Se asigna en 1ª Entrada</option>
            </select>
            <button type="button"
              title={!planLimits.almacenes.permitido ? planLimits.almacenes.mensaje : 'Nuevo almacén'}
              disabled={!planLimits.almacenes.permitido}
              className="shrink-0 w-8.5 flex items-center justify-center bg-[#00c896]/10 hover:bg-[#00c896]/20 border border-[#00c896]/30 rounded-lg text-[#00c896] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => onAddAlmacen?.(() => {})}>
              <Plus size={13}/>
            </button>
          </div>
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Field label="Stock Mínimo">
          <input type="number" className={SI} value={form.stockMinimo ?? 0} onChange={e => f('stockMinimo', e.target.value)} min="0"/>
        </Field>
        <Field label="Stock Máximo">
          <input type="number" className={SI} value={form.stockMaximo ?? 0} onChange={e => f('stockMaximo', e.target.value)} min="0"/>
        </Field>
        <Field label="Precio Compra (S/)">
          <input type="number" className={SI} value={form.precioCompra ?? 0} onChange={e => f('precioCompra', e.target.value)} min="0" step="0.01"/>
        </Field>
        <Field label="Precio Venta (S/)">
          <input type="number" className={SI} value={form.precioVenta ?? 0} onChange={e => f('precioVenta', e.target.value)} min="0" step="0.01"/>
        </Field>
      </div>

      <div className="flex items-center gap-6 flex-wrap pt-1">
        <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[#9ba8b6]">
          <input type="checkbox" checked={!!form.esPerecedero} onChange={e => f('esPerecedero', e.target.checked)} className="accent-[#00c896]"/>
          Producto perecedero
        </label>
        {editando && (
          <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[#9ba8b6]">
            <input type="checkbox" checked={!!form.activo} onChange={e => f('activo', e.target.checked)} className="accent-[#00c896]"/>
            Producto activo
          </label>
        )}
      </div>
    </Modal>
  )
}

// ── Modales Rápidos ───────────────────────────────────────────
function ModalQuickCategoria({ open, onClose, onSave }) {
  const [nombre, setNombre] = useState('')
  useEffect(() => { if (open) setNombre('') }, [open])
  return (
    <Modal open={open} onClose={onClose} title="Nueva Categoría" size="sm" zIndex={60}
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={() => nombre.trim() && onSave(nombre)} disabled={!nombre.trim()}>Crear</Btn></>}>
      <Field label="Nombre *"><input className={SI} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Electrónica, Herramientas..." autoFocus/></Field>
    </Modal>
  )
}

function ModalQuickAlmacen({ open, onClose, onSave }) {
  const [nombre, setNombre] = useState('')
  useEffect(() => { if (open) setNombre('') }, [open])
  return (
    <Modal open={open} onClose={onClose} title="Nuevo Almacén" size="sm" zIndex={60}
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={() => nombre.trim() && onSave(nombre)} disabled={!nombre.trim()}>Crear</Btn></>}>
      <Field label="Nombre *"><input className={SI} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Almacén Principal..." autoFocus/></Field>
    </Modal>
  )
}

function ModalQuickProveedor({ open, onClose, onSave }) {
  const init = { razonSocial:'', ruc:'', telefono:'' }
  const [form, setForm] = useState(init)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  useEffect(() => { if (open) setForm(init) }, [open])  // eslint-disable-line
  return (
    <Modal open={open} onClose={onClose} title="Nuevo Proveedor" size="sm" zIndex={60}
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={() => form.razonSocial.trim() && onSave(form)} disabled={!form.razonSocial.trim()}>Crear</Btn></>}>
      <Field label="Razón Social *"><input className={SI} value={form.razonSocial} onChange={e => f('razonSocial', e.target.value)} placeholder="Importaciones XYZ S.A.C." autoFocus/></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="RUC"><input className={SI} value={form.ruc} onChange={e => f('ruc', e.target.value)} placeholder="20123456789" maxLength={11}/></Field>
        <Field label="Teléfono"><input className={SI} value={form.telefono} onChange={e => f('telefono', e.target.value)} placeholder="987654321"/></Field>
      </div>
    </Modal>
  )
}

// ── Modal Detalle Producto ────────────────────────────────────
function ModalDetalle({ open, onClose, producto, catNombre, almNombre, inventarioRaw, almacenes }) {
  if (!open || !producto) return null
  const p = producto

  // Inventario de este producto por almacén
  const stockPorAlmacen = inventarioRaw
    .filter(item => item.productoId === p.id)
    .map(item => ({
      almacen:  almacenes.find(a => a.id === item.almacenId)?.nombre || item.almacenId,
      cantidad: Number(item.cantidad || 0),
    }))
    .filter(r => r.cantidad > 0)

  const valorTotal = Number(p.precioCompra || 0) * p.stockActual
  const margen = p.precioVenta > 0
    ? (((Number(p.precioVenta) - Number(p.precioCompra || 0)) / Number(p.precioVenta)) * 100).toFixed(1) + '%'
    : '—'

  const info = [
    ['SKU',            p.sku],
    ['Unidad',         p.unidadMedida],
    ['Categoría',      catNombre(p.categoriaId)],
    ['Proveedor',      p.proveedorId ? (p.proveedorId.slice(0, 8) + '...') : '—'],
    ['Stock total',    `${p.stockActual} ${p.unidadMedida || ''}`],
    ['Stock mínimo',   `${p.stockMinimo} ${p.unidadMedida || ''}`],
    ['Precio compra',  formatCurrency(Number(p.precioCompra || 0), 'S/')],
    ['Precio venta',   p.precioVenta > 0 ? formatCurrency(Number(p.precioVenta), 'S/') : '—'],
    ['Margen bruto',   margen],
    ['Valor en stock', formatCurrency(valorTotal, 'S/')],
    ['Perecedero',     p.esPerecedero ? 'Sí' : 'No'],
    ['Estado',         p.estado || '—'],
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

      {stockPorAlmacen.length > 0 && (
        <>
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Stock por almacén</div>
          <div className="overflow-x-auto rounded-xl border border-white/8">
            <table className="w-full border-collapse text-[12px]">
              <thead><tr>
                <th className="bg-[#1a2230] px-3 py-2 text-left text-[10px] font-semibold text-[#5f6f80] uppercase border-b border-white/8">Almacén</th>
                <th className="bg-[#1a2230] px-3 py-2 text-right text-[10px] font-semibold text-[#5f6f80] uppercase border-b border-white/8">Cantidad</th>
              </tr></thead>
              <tbody>
                {stockPorAlmacen.map((r, i) => (
                  <tr key={i} className="border-b border-white/6 last:border-0 hover:bg-white/2">
                    <td className="px-3 py-2 text-[#9ba8b6]">{r.almacen}</td>
                    <td className="px-3 py-2 font-mono text-right text-[#00c896] font-semibold">{r.cantidad} {p.unidadMedida}</td>
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
