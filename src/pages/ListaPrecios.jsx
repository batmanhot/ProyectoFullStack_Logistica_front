import { useState, useMemo, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, Tag, Copy, Download, FileText } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency } from '../utils/helpers'
import { getPrecio } from '../utils/precios'
import { Modal, ConfirmDialog, EmptyState, Badge, Btn, Field, Alert, Input, Select, DataTable } from '../components/ui/index'
import { exportarListaPreciosXLSX } from '../utils/exportXLSX'
import { exportarListaPreciosPDF } from '../utils/exportPDF'
import { useProductosList } from '../queries/productos.queries'
import { useCategoriasList } from '../queries/categorias.queries'
import {
  useListasPreciosList,
  useCrearListaPrecios,
  useActualizarListaPrecios,
  useEliminarListaPrecios,
  useSetPrecioProducto,
  useDuplicarListaPrecios,
} from '../queries/listas-precios.queries'

const simboloMoneda = 'S/'

export default function ListaPrecios() {
  const { sesion, toast } = useApp()

  const { data: productos  = [] } = useProductosList()
  const { data: categorias = [] } = useCategoriasList()
  const { data: listas     = [] } = useListasPreciosList()

  const crearLista     = useCrearListaPrecios()
  const actualizarLista = useActualizarListaPrecios()
  const eliminarLista  = useEliminarListaPrecios()
  const setPrecio      = useSetPrecioProducto()
  const duplicar       = useDuplicarListaPrecios()

  const [listaId,    setListaId]    = useState(null)
  const [modal,      setModal]      = useState(false)
  const [editando,   setEditando]   = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [busq,       setBusq]       = useState('')
  const [filtCat,    setFiltCat]    = useState('')
  const [editPrecio, setEditPrecio] = useState(null)

  // Auto-selecciona la primera lista cuando carga
  useEffect(() => { if (listas.length > 0 && !listaId) setListaId(listas[0].id) }, [listas, listaId])

  const lista = listas.find(l => l.id === listaId) || listas[0]

  function getMargen(prod, precio) {
    const pmp = Number(prod.precioCompra || 0)
    if (!precio || !pmp) return null
    return +((( precio - pmp) / precio) * 100).toFixed(1)
  }

  const prodsFiltrados = useMemo(() => {
    // Producto no tiene campo `activo` (booleano) en el schema, solo `estado` ('Activo'/'Inactivo').
    let d = productos.filter(p => p.estado === 'Activo')
    if (busq)    { const q = busq.toLowerCase(); d = d.filter(p => p.nombre?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)) }
    if (filtCat) d = d.filter(p => p.categoriaId === filtCat)
    return d
  }, [productos, busq, filtCat])

  async function saveLista(data) {
    if (data.id) {
      const res = await actualizarLista.mutateAsync({ id: data.id, nombre: data.nombre, tipo: data.tipo, descuento: data.descuento, markup: data.markup, activa: data.activa })
      if (res?.error) { toast(res.error, 'error'); return }
    } else {
      const res = await crearLista.mutateAsync({ nombre: data.nombre, tipo: data.tipo, descuento: data.descuento, markup: data.markup, activa: data.activa })
      if (res?.error) { toast(res.error, 'error'); return }
      if (res?.id) setListaId(res.id)
    }
    setModal(false)
  }

  async function setPrecioEspecial(listaIdArg, productoId, precio) {
    const res = await setPrecio.mutateAsync({ listaId: listaIdArg, productoId, precio: +precio })
    if (res?.error) { toast(res.error, 'error'); return }
    setEditPrecio(null)
  }

  async function deleteLista(id) {
    const res = await eliminarLista.mutateAsync(id)
    if (res?.error) { toast(res.error, 'error'); return }
    setConfirmDel(null)
    if (listaId === id) setListaId(listas.find(l => l.id !== id)?.id ?? null)
  }

  async function duplicarLista(l) {
    const res = await duplicar.mutateAsync(l.id)
    if (res?.error) { toast(res.error, 'error'); return }
    if (res?.id) setListaId(res.id)
  }

  async function resetPrecioEspecial(productoId) {
    const res = await setPrecio.mutateAsync({ listaId: lista?.id, productoId, precio: null })
    if (res?.error) toast(res.error, 'error')
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      {/* Tabs de listas */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {listas.map(l => (
            <button key={l.id} onClick={() => setListaId(l.id)}
              className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-all border ${listaId === l.id ? 'bg-[#00c896]/10 border-[#00c896]/30 text-[#00c896]' : 'bg-[#1a2230] border-white/7 text-[#9ba8b6] hover:border-white/14'}`}>
              {l.nombre}
              {l.descuento > 0 && <span className="ml-1.5 text-[10px] opacity-70">-{l.descuento}%</span>}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {lista && <Btn variant="ghost" size="sm" onClick={() => { setEditando(lista); setModal(true) }}><Edit2 size={12}/> Editar lista</Btn>}
          {lista && <Btn variant="ghost" size="sm" onClick={() => duplicarLista(lista)}><Copy size={12}/> Duplicar</Btn>}
          {lista && (
            <Btn variant="ghost" size="sm" onClick={async () => {
              await exportarListaPreciosXLSX(lista, productos, categorias, simboloMoneda, p => Number(p.precioCompra || 0))
            }}><Download size={13}/> Excel</Btn>
          )}
          {lista && (
            <Btn variant="ghost" size="sm" onClick={async () => {
              await exportarListaPreciosPDF(lista, productos, categorias, simboloMoneda, p => Number(p.precioCompra || 0), sesion?.nombre)
            }}><FileText size={13}/> PDF</Btn>
          )}
          <Btn variant="primary" size="sm" onClick={() => { setEditando(null); setModal(true) }}><Plus size={13}/> Nueva lista</Btn>
        </div>
      </div>

      {/* Sin listas creadas: no hay fila en `listas_precios` para esta empresa todavía.
          Antes esto caía en silencio a mostrar el catálogo de productos con precio base,
          dando la impresión de una "lista" que en realidad no existe en la tabla. */}
      {listas.length === 0 ? (
        <EmptyState icon={Tag} title="Sin listas de precios"
          description='Todavía no creaste ninguna lista de precios para esta empresa. Usa "Nueva lista" para crear la primera (general, mayorista, distribuidor...).'/>
      ) : (
        <>
          {/* Info de la lista activa */}
          {lista && (
            <div className="bg-[#161d28] border border-[#00c896]/15 rounded-xl px-5 py-4 flex items-center gap-6">
              <div>
                <div className="text-[14px] font-semibold text-[#e8edf2]">{lista.nombre}</div>
                <div className="text-[11px] text-[#5f6f80] mt-0.5 capitalize">{lista.tipo}</div>
              </div>
              <div className="flex gap-5 text-[12px]">
                {lista.descuento > 0 && <div><span className="text-[#5f6f80]">Descuento base</span><span className="ml-2 text-green-400 font-bold">-{lista.descuento}%</span></div>}
                {lista.markup   > 0 && <div><span className="text-[#5f6f80]">Markup sobre costo</span><span className="ml-2 text-amber-400 font-bold">+{lista.markup}%</span></div>}
                {!lista.descuento && !lista.markup && <div className="text-[#5f6f80]">Precios base del catálogo (editables por producto)</div>}
              </div>
              <Badge variant={lista.activa ? 'success' : 'neutral'} className="ml-auto">{lista.activa ? 'Activa' : 'Inactiva'}</Badge>
            </div>
          )}

          {/* Tabla de precios */}
          <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="relative flex-1 min-w-50">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
                <Input className="pl-7" placeholder="Buscar SKU o producto..." value={busq} onChange={e => setBusq(e.target.value)}/>
              </div>
              <Select className="w-auto" value={filtCat} onChange={e => setFiltCat(e.target.value)}>
                <option value="">Todas las categorías</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </Select>
            </div>

            <DataTable
              rows={prodsFiltrados}
              rowKey={prod => prod.id}
              emptyIcon={Tag}
              emptyTitle="Sin productos"
              emptyDescription="No hay productos con estos filtros."
              columns={[
                { key: 'sku', header: 'SKU', render: prod => <span className="font-mono text-[11px] text-[#00c896]">{prod.sku}</span> },
                { key: 'nombre', header: 'Producto', render: prod => <span className="font-medium text-[#e8edf2]">{prod.nombre?.slice(0, 35)}</span> },
                { key: 'categoria', header: 'Categoría', render: prod => <span className="text-[#9ba8b6]">{categorias.find(c => c.id === prod.categoriaId)?.nombre || '—'}</span> },
                { key: 'costo', header: 'Costo unit.', align: 'right', render: prod => <span className="font-mono text-[#9ba8b6]">{formatCurrency(Number(prod.precioCompra || 0), simboloMoneda)}</span> },
                { key: 'base', header: 'P. Base catálogo', align: 'right', render: prod => <span className="font-mono text-[#9ba8b6]">{formatCurrency(Number(prod.precioVenta || 0), simboloMoneda)}</span> },
                { key: 'precio', header: `Precio — ${lista?.nombre || 'Lista'}`, align: 'right', render: prod => {
                    const precio = lista ? getPrecio(prod, lista) : Number(prod.precioVenta || 0)
                    const tieneEspecial = lista?.precios?.[prod.id] !== undefined
                    return editPrecio?.productoId === prod.id && editPrecio?.listaId === lista?.id ? (
                      <div className="flex items-center gap-1.5 justify-end">
                        <input type="number"
                          className="w-24 px-2 py-1 bg-[#1e2835] border border-[#00c896]/40 rounded-lg text-[12px] text-[#e8edf2] outline-none font-mono text-right"
                          defaultValue={precio} autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter')  setPrecioEspecial(lista.id, prod.id, e.target.value)
                            if (e.key === 'Escape') setEditPrecio(null)
                          }}/>
                        <button className="text-[10px] text-[#5f6f80] hover:text-red-400" onClick={() => setEditPrecio(null)}>✕</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 justify-end">
                        <span className={`font-mono font-bold ${tieneEspecial ? 'text-amber-400' : 'text-[#e8edf2]'}`}>
                          {formatCurrency(precio, simboloMoneda)}
                        </span>
                        {tieneEspecial && <span className="text-[9px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded">especial</span>}
                        <button onClick={() => setEditPrecio({ productoId: prod.id, listaId: lista?.id })}
                          className="text-[#5f6f80] hover:text-[#00c896] transition-colors p-0.5 rounded">
                          <Edit2 size={11}/>
                        </button>
                      </div>
                    )
                  }, stopPropagation: true },
                { key: 'margen', header: 'Margen', align: 'right', render: prod => {
                    const precio = lista ? getPrecio(prod, lista) : Number(prod.precioVenta || 0)
                    const margen = getMargen(prod, precio)
                    return (
                      <span className="font-mono font-semibold"
                        style={{ color: margen === null ? '#5f6f80' : margen >= 40 ? '#22c55e' : margen >= 20 ? '#f59e0b' : '#ef4444' }}>
                        {margen !== null ? `${margen}%` : '—'}
                      </span>
                    )
                  } },
                { key: 'ajuste', header: 'Ajuste', stopPropagation: true, render: prod => {
                    const tieneEspecial = lista?.precios?.[prod.id] !== undefined
                    return tieneEspecial && (
                      <button className="text-[10px] text-[#5f6f80] hover:text-red-400 transition-colors"
                        onClick={() => resetPrecioEspecial(prod.id)}
                        title="Restaurar precio de lista">
                        ✕ Reset
                      </button>
                    )
                  } },
              ]}
            />
            <div className="mt-3 text-[11px] text-[#5f6f80]">
              Haz clic en el ícono de edición para ajustar el precio de un producto en esta lista. Enter para guardar, Esc para cancelar.
            </div>
          </div>
        </>
      )}

      <div className="bg-[#161d28] border border-white/6 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          ¿Cómo funciona el módulo de Lista de Precios?
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {[
            ['1. Crear lista', 'Define un descuento % sobre el precio base, o un markup % sobre el costo — o ninguno, para usar los precios base del catálogo.'],
            ['2. Elegir lista', 'Cambia entre listas (General, Mayorista, VIP...) con las pestañas de arriba para ver y editar sus precios.'],
            ['3. Ajustar por producto', 'Haz clic en el ícono de edición junto a un precio para fijar un valor especial solo para ese producto, sin afectar el resto de la lista.'],
            ['4. Duplicar o exportar', '"Duplicar" crea una copia editable de la lista actual; Excel/PDF exportan la tabla completa con los precios vigentes.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
              <div className="text-[11px] font-semibold text-[#e8edf2] mb-1.5">{t}</div>
              <div className="text-[11px] text-[#5f6f80] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>

      <ModalLista open={modal} onClose={() => setModal(false)} editando={editando} onSave={saveLista}/>
      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={() => deleteLista(confirmDel)}
        danger title="Eliminar lista" message="¿Eliminar esta lista de precios?"/>
    </div>
  )
}

function ModalLista({ open, onClose, editando, onSave }) {
  const init = { nombre: '', tipo: 'general', descuento: 0, markup: 0, activa: true }
  const [form, setForm] = useState(init)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  useEffect(() => {
    setForm(editando ? {
      ...init, ...editando,
      descuento: editando.descuento ?? 0,
      markup:    editando.markup    ?? 0,
      activa:    editando.activa !== false,
    } : init)
  }, [editando, open]) // eslint-disable-line

  return (
    <Modal open={open} onClose={onClose} title={editando ? 'Editar lista' : 'Nueva lista de precios'} size="sm"
      footer={
        <><Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" disabled={!form.nombre.trim()} onClick={() => onSave(form)}>Guardar</Btn></>
      }>
      <Field label="Nombre *">
        <Input value={form.nombre} onChange={e => f('nombre', e.target.value)} placeholder="Ej: Mayorista, Distribuidor, VIP..."/>
      </Field>
      <Field label="Tipo">
        <Select value={form.tipo} onChange={e => f('tipo', e.target.value)}>
          {['general', 'mayorista', 'minorista', 'especial', 'distribuidor'].map(t => (
            <option key={t} value={t} className="capitalize">{t}</option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Descuento % (sobre precio base)">
          <Input type="number" value={form.descuento} onChange={e => setForm(p => ({ ...p, descuento: +e.target.value, markup: +e.target.value > 0 ? 0 : p.markup }))} min="0" max="100" step="0.5"/>
        </Field>
        <Field label="Markup % (sobre costo)">
          <Input type="number" value={form.markup} onChange={e => setForm(p => ({ ...p, markup: +e.target.value, descuento: +e.target.value > 0 ? 0 : p.descuento }))} min="0" step="0.5"/>
        </Field>
      </div>
      <Alert variant="info">Son mutuamente excluyentes: al activar uno se desactiva el otro. El descuento aplica sobre el precio base del catálogo; el markup aplica sobre el costo unitario (solo si el producto tiene costo registrado). Puedes además editar precios específicos por producto en la tabla.</Alert>
      <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[#9ba8b6]">
        <input type="checkbox" checked={form.activa} onChange={e => f('activa', e.target.checked)} className="accent-[#00c896]"/>
        Lista activa
      </label>
    </Modal>
  )
}
