import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle, Package, Eye, XCircle, Calendar, Hash, DollarSign, Layers, Info, Clock, Download, FileText, X, Search } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate, diasParaVencer, fechaHoy, generarNumDoc, vencimientoMasUrgentePorProducto } from '../utils/helpers'
import { Badge, Btn, Modal, Input, Select, Textarea, DataTable } from '../components/ui/index'
import { exportarVencimientosXLSX } from '../utils/exportXLSX'
import { exportarVencimientosPDF } from '../utils/exportPDF'
import { useProductosList } from '../queries/productos.queries'
import { useInventarioList } from '../queries/inventario.queries'
import { useCategoriasList } from '../queries/categorias.queries'
import { useAlmacenesList } from '../queries/almacenes.queries'
import { useCrearMovimiento } from '../queries/movimientos.queries'
import { useLotesList } from '../queries/lotes.queries'

const simboloMoneda        = 'S/'
const formulaValorizacion  = 'Precio Compra'

const RANGOS = [
  { key:'vencido', label:'Vencidos',           dias:[-Infinity,-1], color:'#ef4444', badge:'danger'  },
  { key:'critico', label:'Crítico (0–15 días)', dias:[0,15],         color:'#ef4444', badge:'danger'  },
  { key:'urgente', label:'Urgente (16–30 días)',dias:[16,30],        color:'#f59e0b', badge:'warning' },
  { key:'proximo', label:'Próximo (31–90 días)',dias:[31,90],        color:'#3b82f6', badge:'info'    },
  { key:'normal',  label:'Normal (> 90 días)',  dias:[91,Infinity],  color:'#22c55e', badge:'success' },
]

function clasificar(dias) {
  if (dias === null) return null
  return RANGOS.find(r => dias >= r.dias[0] && dias <= r.dias[1])
}

export default function Vencimientos() {
  const { toast } = useApp()

  const { data: productosRaw    = [] } = useProductosList()
  const { data: inventarioItems = [] } = useInventarioList()
  const { data: categorias      = [] } = useCategoriasList()
  const { data: almacenes       = [] } = useAlmacenesList()
  const { data: lotes           = [] } = useLotesList(undefined, { enabled: true })
  const crearMovimiento               = useCrearMovimiento()

  // El vencimiento vive en LoteProducto, no en Producto — ver vencimientoMasUrgentePorProducto.
  const vencPorProducto = useMemo(() => vencimientoMasUrgentePorProducto(lotes), [lotes])

  const [filtroRango, setFiltroRango] = useState('all')
  const [filtCat,     setFiltCat]     = useState('')
  const [filtAlm,     setFiltAlm]     = useState('')
  const [filtEstado,  setFiltEstado]  = useState('')
  const [filtProd,    setFiltProd]    = useState('')
  const [verProd,     setVerProd]     = useState(null)
  const [bajaConf,    setBajaConf]    = useState(null)

  // stockMap: productoId -> total
  const stockMap = useMemo(() => {
    const m = {}
    inventarioItems.forEach(i => { m[i.productoId] = (m[i.productoId] || 0) + Number(i.cantidad || 0) })
    return m
  }, [inventarioItems])

  // stockByAlmacen: productoId -> almacenId -> cantidad
  const stockByAlmacen = useMemo(() => {
    const m = {}
    inventarioItems.forEach(i => {
      if (!m[i.productoId]) m[i.productoId] = {}
      m[i.productoId][i.almacenId] = (m[i.productoId][i.almacenId] || 0) + Number(i.cantidad || 0)
    })
    return m
  }, [inventarioItems])

  // Almacén principal (con más stock) para cada producto
  function getMainAlmacen(productoId) {
    const byAlm = stockByAlmacen[productoId] || {}
    const entry = Object.entries(byAlm).sort((a, b) => b[1] - a[1])[0]
    return entry ? entry[0] : almacenes[0]?.id
  }

  const productosConVenc = useMemo(() =>
    productosRaw
      .filter(p => (p.estado === 'Activo' || p.activo !== false) && vencPorProducto[p.id])
      .map(p => {
        const stockActual    = stockMap[p.id] || 0
        const pmpCalc        = Number(p.precioCompra || 0)
        const mainAlmId      = getMainAlmacen(p.id)
        const fechaVencimiento = vencPorProducto[p.id]
        return {
          ...p,
          activo:     p.estado === 'Activo' || p.activo !== false,
          stockActual,
          pmpCalc,
          valorStock: stockActual * pmpCalc,
          mainAlmId,
          fechaVencimiento,
          dias:       diasParaVencer(fechaVencimiento),
          catNombre:  categorias.find(c => c.id === p.categoriaId)?.nombre || '—',
          almNombre:  almacenes.find(a => a.id === mainAlmId)?.nombre       || '—',
        }
      })
      .sort((a, b) => (a.dias ?? 9999) - (b.dias ?? 9999))
  , [productosRaw, stockMap, categorias, almacenes, inventarioItems, vencPorProducto])

  const conteos = useMemo(() => {
    const c = {}
    RANGOS.forEach(r => { c[r.key] = productosConVenc.filter(p => clasificar(p.dias)?.key === r.key).length })
    c.all = productosConVenc.length
    return c
  }, [productosConVenc])

  const filtered = useMemo(() => {
    let d = productosConVenc
    if (filtroRango !== 'all') d = d.filter(p => clasificar(p.dias)?.key === filtroRango)
    if (filtCat) d = d.filter(p => p.categoriaId === filtCat)
    if (filtAlm) d = d.filter(p => (stockByAlmacen[p.id]?.[filtAlm] || 0) > 0)
    if (filtEstado) d = d.filter(p => clasificar(p.dias)?.key === filtEstado)
    if (filtProd) {
      const q = filtProd.toLowerCase()
      d = d.filter(p => p.nombre?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q))
    }
    return d
  }, [productosConVenc, filtroRango, filtCat, filtAlm, filtEstado, filtProd, stockByAlmacen])

  async function ejecutarBaja(prod, motivo) {
    if (!prod || prod.stockActual <= 0) {
      toast('El producto ya no tiene stock', 'warning'); return
    }
    const almacenId = prod.mainAlmId || almacenes[0]?.id
    const res = await crearMovimiento.mutateAsync({
      tipo:          'AJUSTE',
      direccion:     'decremento',
      productoId:    prod.id,
      almacenId,
      cantidad:      prod.stockActual,
      costoUnitario: prod.pmpCalc,
      motivo:        `[BAJA VENCIMIENTO] ${motivo || 'Producto vencido — baja de inventario'}`,
      documento:     generarNumDoc('BV', '001'),
      fecha:         fechaHoy(),
    })
    if (res?.error) { toast(res.error, 'error'); setBajaConf(null); return }
    toast(`${prod.nombre} — ${prod.stockActual} ${prod.unidadMedida} dados de baja`, 'success')
    setBajaConf(null)
    setVerProd(null)
  }

  const limpiarFiltros = () => { setFiltroRango('all'); setFiltCat(''); setFiltAlm(''); setFiltEstado(''); setFiltProd('') }
  const hayFiltros     = filtroRango !== 'all' || filtCat || filtAlm || filtEstado || filtProd
  const calcFn         = (p) => Number(p?.precioCompra || 0)

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      {/* Semáforo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {RANGOS.map(r => (
          <button key={r.key}
            onClick={() => setFiltroRango(filtroRango === r.key ? 'all' : r.key)}
            className="relative rounded-xl px-4 py-3.5 text-left border transition-all overflow-hidden"
            style={{ background: filtroRango === r.key ? `${r.color}18` : 'var(--bg-card)', borderColor: filtroRango === r.key ? r.color : 'var(--border)' }}>
            <div className="absolute top-0 left-0 right-0 h-0.75 rounded-t-xl" style={{ background: r.color }}/>
            <div className="text-[28px] font-semibold text-[#e8edf2]">{conteos[r.key] || 0}</div>
            <div className="text-[11px] text-[#9ba8b6] mt-0.5 leading-tight">{r.label}</div>
          </button>
        ))}
      </div>

      {/* Alerta vencidos */}
      {conteos.vencido > 0 && (
        <div className="flex items-start gap-3 px-4 py-3.5 bg-red-500/10 border border-red-500/25 rounded-xl text-[13px] text-red-300">
          <AlertTriangle size={16} className="shrink-0 mt-0.5"/>
          <div>
            <span className="font-semibold">{conteos.vencido} producto{conteos.vencido > 1 ? 's' : ''} vencido{conteos.vencido > 1 ? 's' : ''}.</span>
            {' '}Haz clic en <strong>"Ver detalle"</strong> y luego <strong>"Dar de baja"</strong> para retirarlos del inventario.
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
            Productos con Fecha de Vencimiento
            {filtroRango !== 'all' && <span className="ml-2 text-[#00c896]">— {RANGOS.find(r => r.key === filtroRango)?.label}</span>}
          </span>
          <div className="flex gap-2 items-center">
            <Select className="w-auto" value={filtCat} onChange={e => setFiltCat(e.target.value)}>
              <option value="">Todas las categorías</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Select>
            {hayFiltros && <Btn variant="ghost" size="sm" onClick={limpiarFiltros}><X size={12}/> Limpiar</Btn>}
            <Btn variant="ghost" size="sm" onClick={async () => { await exportarVencimientosXLSX(filtered, categorias, almacenes, simboloMoneda, calcFn) }}>
              <Download size={13}/> Excel
            </Btn>
            <Btn variant="ghost" size="sm" onClick={async () => { await exportarVencimientosPDF(filtered, categorias, almacenes, simboloMoneda, calcFn, null) }}>
              <FileText size={13}/> PDF
            </Btn>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="relative flex-1 min-w-40">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <Input className="pl-8" placeholder="Buscar producto o SKU..."
              value={filtProd} onChange={e => setFiltProd(e.target.value)}/>
          </div>
          <Select className="w-auto" value={filtAlm} onChange={e => setFiltAlm(e.target.value)}>
            <option value="">Todos los almacenes</option>
            {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </Select>
          <Select className="w-auto" value={filtEstado} onChange={e => setFiltEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {RANGOS.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
          </Select>
          <span className="text-[11px] text-[#5f6f80] whitespace-nowrap">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <DataTable
          rows={filtered}
          rowKey={p => p.id}
          onRowClick={p => setVerProd(p)}
          emptyIcon={CheckCircle}
          emptyTitle="Sin productos en este rango"
          emptyDescription={filtroRango === 'all' ? 'Ningún producto tiene fecha de vencimiento configurada.' : 'No hay productos en este rango.'}
          columns={[
            { key: 'producto', header: 'Producto', render: p => <div><div className="font-medium text-[#e8edf2]">{p.nombre}</div><div className="text-[11px] text-[#5f6f80]">{p.sku}</div></div> },
            { key: 'categoria', header: 'Categoría', render: p => <span className="text-[12px] text-[#9ba8b6]">{p.catNombre}</span> },
            { key: 'almacen', header: 'Almacén', render: p => <span className="text-[12px] text-[#9ba8b6]">{p.almNombre}</span> },
            { key: 'stock', header: 'Stock', render: p => <span className="font-mono text-[12px]">{p.stockActual} <span className="text-[#5f6f80] text-[11px]">{p.unidadMedida}</span></span> },
            { key: 'venc', header: 'F. Vencimiento', render: p => <span className="font-mono text-[12px] text-[#9ba8b6]">{formatDate(p.fechaVencimiento)}</span> },
            { key: 'dias', header: 'Días restantes', render: p => {
                const rango = clasificar(p.dias)
                return p.dias === null ? '—' : (
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-[#0e1117] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{
                        width: p.dias < 0 ? '100%' : p.dias > 90 ? '8%' : `${Math.max(5, 100-(p.dias/90)*100)}%`,
                        background: rango?.color || '#22c55e',
                      }}/>
                    </div>
                    <span className="font-mono text-[12px] font-semibold" style={{ color: rango?.color }}>
                      {p.dias < 0 ? `${Math.abs(p.dias)}d vencido` : `${p.dias}d`}
                    </span>
                  </div>
                )
              } },
            { key: 'estado', header: 'Estado', render: p => {
                const rango = clasificar(p.dias)
                return rango ? <Badge variant={rango.badge}>{rango.label.split(' ')[0]}</Badge> : '—'
              } },
            { key: 'valor', header: 'Valor en riesgo', render: p => {
                const rango = clasificar(p.dias)
                return <span className="font-mono text-[12px] font-semibold" style={{ color: rango?.color || '#00c896' }}>{formatCurrency(p.valorStock, simboloMoneda)}</span>
              } },
            { key: 'accion', header: 'Acción', stopPropagation: true, render: p => (
                <Btn variant="ghost" size="sm" onClick={() => setVerProd(p)}><Eye size={12}/> Ver detalle</Btn>
              ) },
          ]}
        />

        {filtered.length > 0 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/6 text-[13px]">
            <span className="text-[#5f6f80]">{filtered.length} productos mostrados</span>
            <span className="text-[#9ba8b6]">
              Valor total en riesgo:{' '}
              <span className="text-[#e8edf2] font-semibold">
                {formatCurrency(filtered.reduce((s, p) => s + p.valorStock, 0), simboloMoneda)}
              </span>
            </span>
          </div>
        )}
      </div>

      <div className="bg-[#161d28] border border-white/6 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          ¿Cómo funciona el módulo de Vencimientos?
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {[
            ['1. Semáforo de riesgo', 'Los productos se clasifican automáticamente por días restantes: Vencidos, Crítico (0-15d), Urgente (16-30d), Próximo (31-90d) y Normal.'],
            ['2. Ver detalle', 'Haz clic en la fila para ver el detalle completo del producto, incluyendo sus lotes registrados y una recomendación según su urgencia.'],
            ['3. Filtrar', 'Combina categoría, almacén y estado para enfocarte en lo más urgente primero.'],
            ['4. Dar de baja', 'Para productos vencidos o muy próximos a vencer, usa "Dar de baja" para retirarlos del inventario con trazabilidad completa en Kardex.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
              <div className="text-[11px] font-semibold text-[#e8edf2] mb-1.5">{t}</div>
              <div className="text-[11px] text-[#5f6f80] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>

      {verProd && (
        <ModalDetalleVencimiento
          prod={verProd}
          onClose={() => setVerProd(null)}
          onBaja={() => setBajaConf(verProd)}
        />
      )}

      {bajaConf && (
        <ModalConfirmarBaja
          prod={bajaConf}
          onClose={() => setBajaConf(null)}
          onConfirm={(motivo) => ejecutarBaja(bajaConf, motivo)}
          saving={crearMovimiento.isPending}
        />
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────
function ModalDetalleVencimiento({ prod, onClose, onBaja }) {
  const rango   = clasificar(prod.dias)
  const vencido = prod.dias !== null && prod.dias < 0
  const urgente = prod.dias !== null && prod.dias <= 30

  const { data: lotes = [] } = useLotesList(prod.id)

  return (
    <Modal open title={`Detalle de Vencimiento — ${prod.sku}`} onClose={onClose} size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <span>{rango && <Badge variant={rango.badge}>{rango.label}</Badge>}</span>
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={onClose}>Cerrar</Btn>
            {urgente && prod.stockActual > 0 && (
              <Btn variant="danger" onClick={onBaja}><XCircle size={14}/> Dar de baja</Btn>
            )}
          </div>
        </div>
      }>

      {vencido && (
        <div className="flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-[13px] text-red-300 mb-2">
          <AlertTriangle size={15} className="shrink-0 mt-0.5"/>
          <span>Este producto está <strong>vencido desde hace {Math.abs(prod.dias)} días</strong>. Debe retirarse del almacén y darse de baja.</span>
        </div>
      )}
      {!vencido && urgente && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[13px] text-amber-300 mb-2">
          <Clock size={15} className="shrink-0 mt-0.5"/>
          <span>Este producto vence en <strong>{prod.dias} días</strong>. Considera acelerar su distribución.</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { icon:Package,    label:'Producto',              val: prod.nombre },
          { icon:Hash,       label:'SKU',                   val: prod.sku    },
          { icon:Layers,     label:'Categoría',             val: prod.catNombre },
          { icon:Package,    label:'Almacén principal',     val: prod.almNombre },
          { icon:Calendar,   label:'Fecha de vencimiento',  val: formatDate(prod.fechaVencimiento), color: rango?.color },
          { icon:Clock,      label:'Días restantes',        val: prod.dias === null ? '—' : prod.dias < 0 ? `Vencido hace ${Math.abs(prod.dias)} días` : `${prod.dias} días`, color: rango?.color },
          { icon:Package,    label:'Stock actual',          val: `${prod.stockActual} ${prod.unidadMedida}` },
          { icon:DollarSign, label:`Costo unit. (${formulaValorizacion})`, val: formatCurrency(prod.pmpCalc, simboloMoneda), color:'#00c896' },
        ].map(({ icon:Icon, label, val, color }) => (
          <div key={label} className="bg-[#1a2230] rounded-xl px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon size={11} className="text-[#5f6f80]"/>
              <span className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em]">{label}</span>
            </div>
            <div className="text-[13px] font-semibold" style={{ color: color || 'var(--text-primary)' }}>{val}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#1a2230] rounded-xl p-4 mb-4 border" style={{ borderColor: (rango?.color || '#5f6f80') + '33' }}>
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] mb-3">Valorización del stock en riesgo</div>
        <div className="grid grid-cols-3 gap-3">
          {[
            ['Cantidad en riesgo',    `${prod.stockActual} ${prod.unidadMedida}`,      null],
            ['Costo unitario',        formatCurrency(prod.pmpCalc, simboloMoneda),      null],
            ['Valor total en riesgo', formatCurrency(prod.valorStock, simboloMoneda),   rango?.color || '#f59e0b'],
          ].map(([l, v, c]) => (
            <div key={l} className="text-center">
              <div className="text-[10px] text-[#5f6f80] mb-1">{l}</div>
              <div className="text-[15px] font-bold font-mono" style={{ color: c || 'var(--text-primary)' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {lotes.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] mb-2">Lotes registrados ({lotes.length})</div>
          <div className="overflow-x-auto rounded-xl border border-white/8">
            <table className="w-full border-collapse text-[12px]">
              <thead><tr>
                {['N° Lote','F. Vencimiento','Cantidad original'].map(h => (
                  <th key={h} className="bg-[#161d28] px-3 py-2 text-left text-[10px] font-semibold text-[#5f6f80] uppercase border-b border-white/8">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {lotes.map(l => (
                  <tr key={l.id} className="border-b border-white/4 last:border-0 hover:bg-white/2">
                    <td className="px-3 py-2.5 font-mono text-[#9ba8b6]">{l.numero}</td>
                    <td className="px-3 py-2.5 font-mono text-[#9ba8b6]">{formatDate(l.fechaVencimiento)}</td>
                    <td className="px-3 py-2.5 font-mono font-semibold text-[#e8edf2]">{l.cantidadOriginal} {prod.unidadMedida}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-4 px-4 py-3 bg-[#1a2230] rounded-xl border border-white/6">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] mb-1.5">
          <Info size={11} className="inline mr-1"/>Recomendación
        </div>
        <p className="text-[12px] text-[#9ba8b6] leading-relaxed">
          {vencido
            ? `Este producto venció hace ${Math.abs(prod.dias)} días. Retíralo físicamente y usa "Dar de baja" para registrar la salida con trazabilidad completa.`
            : prod.dias <= 15
              ? `Vencimiento inminente (${prod.dias} días). Considera reubicar en zona de salida prioritaria.`
              : prod.dias <= 30
                ? `Quedan ${prod.dias} días. Revisa si hay pedidos que puedan incluir este producto antes de que venza.`
                : `Aún tienes ${prod.dias} días. Monitorea periódicamente y prioriza su despacho.`
          }
        </p>
      </div>
    </Modal>
  )
}

// ────────────────────────────────────────────────────────
function ModalConfirmarBaja({ prod, onClose, onConfirm, saving }) {
  const [motivo, setMotivo] = useState('Producto vencido — retirado del almacén')

  return (
    <Modal open title="Confirmar Baja por Vencimiento" onClose={onClose} size="sm"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn variant="danger" disabled={saving} onClick={() => onConfirm(motivo)}><XCircle size={14}/> {saving ? 'Procesando...' : 'Confirmar Baja'}</Btn></>}>

      <div className="flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/25 rounded-xl mb-4 text-[13px] text-red-300">
        <AlertTriangle size={15} className="shrink-0 mt-0.5"/>
        <div>
          Esta acción <strong>no se puede deshacer</strong>. Se reducirá el stock de <strong>{prod.nombre}</strong> en <strong>{prod.stockActual} {prod.unidadMedida}</strong>.
        </div>
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {[
          ['Producto',       prod.nombre],
          ['SKU',            prod.sku],
          ['Vencimiento',    formatDate(prod.fechaVencimiento)],
          ['Stock a bajar',  `${prod.stockActual} ${prod.unidadMedida}`],
          ['Valor a perder', formatCurrency(prod.valorStock, simboloMoneda)],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between text-[13px] px-3.5 py-2 bg-[#1a2230] rounded-lg">
            <span className="text-[#5f6f80]">{k}</span>
            <span className="font-semibold text-[#e8edf2]">{v}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em]">Motivo de baja *</label>
        <Textarea className="resize-y min-h-17" value={motivo}
          onChange={e => setMotivo(e.target.value)} placeholder="Describe el motivo de la baja..."/>
        <p className="text-[11px] text-[#5f6f80]">Este texto quedará registrado en el Kardex y en el historial de Movimientos.</p>
      </div>
    </Modal>
  )
}
