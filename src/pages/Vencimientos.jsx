import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle, Package, Eye, XCircle, Calendar, Hash, DollarSign, Layers, Info, Clock, Download, FileText, X, Search } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate, diasParaVencer, fechaHoy, generarNumDoc } from '../utils/helpers'
import { valorarStock, calcularPMP } from '../utils/valorizacion'
import * as storage from '../services/storage'
import { Badge, Btn, EmptyState, Modal } from '../components/ui/index'
import { exportarVencimientosXLSX } from '../utils/exportXLSX'
import { exportarVencimientosPDF } from '../utils/exportPDF'

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

const SI  = 'w-full px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit] placeholder-[#5f6f80]'
const SEL = SI + ' pr-8'

// ════════════════════════════════════════════════════════
export default function Vencimientos() {
  const { config,
   productos, categorias, almacenes, formulaValorizacion, simboloMoneda,
          recargarProductos, recargarMovimientos, recargarAjustes, toast } = useApp()

  const [filtroRango, setFiltroRango] = useState('all')
  const [filtCat,     setFiltCat]     = useState('')
  const [filtAlm,     setFiltAlm]     = useState('')
  const [filtEstado,  setFiltEstado]  = useState('')
  const [filtProd,    setFiltProd]    = useState('')
  const [verProd,     setVerProd]     = useState(null)  // modal detalle
  const [bajaConf,    setBajaConf]    = useState(null)  // modal confirmar baja

  const productosConVenc = useMemo(() =>
    productos
      .filter(p => p.activo !== false && p.tieneVencimiento && p.fechaVencimiento)
      .map(p => ({
        ...p,
        dias:       diasParaVencer(p.fechaVencimiento),
        valorStock: valorarStock(p.batches || [], formulaValorizacion),
        pmpCalc:    calcularPMP(p.batches || []),
        catNombre:  categorias.find(c => c.id === p.categoriaId)?.nombre || '—',
        almNombre:  almacenes.find(a => a.id === p.almacenId)?.nombre   || '—',
      }))
      .sort((a, b) => (a.dias ?? 9999) - (b.dias ?? 9999))
  , [productos, categorias, almacenes, formulaValorizacion])

  const conteos = useMemo(() => {
    const c = {}
    RANGOS.forEach(r => { c[r.key] = productosConVenc.filter(p => clasificar(p.dias)?.key === r.key).length })
    c.all = productosConVenc.length
    return c
  }, [productosConVenc])

  const filtered = useMemo(() => {
    let d = productosConVenc
    if (filtroRango !== 'all') d = d.filter(p => clasificar(p.dias)?.key === filtroRango)
    if (filtCat)    d = d.filter(p => p.categoriaId === filtCat)
    if (filtAlm)    d = d.filter(p => p.almacenId === filtAlm)
    if (filtEstado) d = d.filter(p => {
      const est = clasificar(p.dias)?.key
      return est === filtEstado
    })
    if (filtProd) {
      const q = filtProd.toLowerCase()
      d = d.filter(p => p.nombre?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q))
    }
    return d
  }, [productosConVenc, filtroRango, filtCat, filtAlm, filtEstado, filtProd])

  // ── Dar de baja (ajuste negativo de stock completo) ──
  function ejecutarBaja(prod, motivo) {
    if (!prod || prod.stockActual <= 0) {
      toast('El producto ya no tiene stock', 'warning'); return
    }
    // Registrar ajuste negativo por producto vencido
    storage._actualizarBatchesProducto(prod.id, [], 0)
    storage.registrarMovimiento({
      tipo:         'AJUSTE',
      productoId:   prod.id,
      almacenId:    prod.almacenId,
      cantidad:     prod.stockActual,
      costoUnitario:prod.pmpCalc,
      costoTotal:   +(prod.stockActual * prod.pmpCalc).toFixed(2),
      lote:         '',
      fecha:        fechaHoy(),
      motivo:       `[BAJA VENCIMIENTO] ${motivo || 'Producto vencido — baja de inventario'}`,
      documento:    generarNumDoc('BV', '001'),
      notas:        `Baja por vencimiento. Fecha vencimiento: ${prod.fechaVencimiento}. Stock dado de baja: ${prod.stockActual} ${prod.unidadMedida}`,
    })
    recargarProductos()
    recargarMovimientos()
    recargarAjustes()
    toast(`${prod.nombre} — ${prod.stockActual} ${prod.unidadMedida} dados de baja correctamente`, 'success')
    setBajaConf(null)
    setVerProd(null)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* Semáforo */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {RANGOS.map(r => (
          <button key={r.key}
            onClick={() => setFiltroRango(filtroRango === r.key ? 'all' : r.key)}
            className="relative rounded-xl px-4 py-3.5 text-left border transition-all overflow-hidden"
            style={{
              background:   filtroRango === r.key ? `${r.color}18` : '#161d28',
              borderColor:  filtroRango === r.key ? r.color : 'rgba(255,255,255,0.08)',
            }}>
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: r.color }}/>
            <div className="text-[26px] font-semibold text-[#e8edf2]">{conteos[r.key] || 0}</div>
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
            {' '}Haz clic en <strong>"Ver detalle"</strong> y luego <strong>"Dar de baja"</strong> para retirarlos del inventario y mantener la trazabilidad.
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
            Productos con Fecha de Vencimiento
            {filtroRango !== 'all' && (
              <span className="ml-2 text-[#00c896]">— {RANGOS.find(r => r.key === filtroRango)?.label}</span>
            )}
          </span>
          <div className="flex gap-2 items-center">
            <select className={SEL} value={filtCat} onChange={e => setFiltCat(e.target.value)}>
              <option value="">Todas las categorías</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            {(filtroRango !== 'all' || filtCat || filtAlm || filtEstado || filtProd) && (
              <Btn variant="ghost" size="sm" onClick={() => { setFiltroRango('all'); setFiltCat(''); setFiltAlm(''); setFiltEstado(''); setFiltProd('') }}>
                <X size={12}/> Limpiar
              </Btn>
            )}
            <Btn variant="ghost" size="sm" onClick={async()=>{ await exportarVencimientosXLSX(filtered, categorias, almacenes, simboloMoneda, calcularPMP) }}>
              <Download size={13}/> Excel
            </Btn>
            <Btn variant="ghost" size="sm" onClick={async()=>{ await exportarVencimientosPDF(filtered, categorias, almacenes, simboloMoneda, calcularPMP, config?.empresa) }}>
              <FileText size={13}/> PDF
            </Btn>
          </div>
        </div>
        {/* Filtros adicionales: producto, almacén, estado */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="relative flex-1 min-w-[160px]">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <input className={SI+' pl-8 !py-[5px] text-[12px]'} placeholder="Buscar producto o SKU..."
              value={filtProd} onChange={e=>setFiltProd(e.target.value)}/>
          </div>
          <select className={SEL} style={{width:155,padding:'5px 8px',fontSize:12}} value={filtAlm} onChange={e=>setFiltAlm(e.target.value)}>
            <option value="">Todos los almacenes</option>
            {almacenes.map(a=><option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
          <select className={SEL} style={{width:148,padding:'5px 8px',fontSize:12}} value={filtEstado} onChange={e=>setFiltEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {RANGOS.map(r=><option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
          <span className="text-[11px] text-[#5f6f80] whitespace-nowrap">
            {filtered.length} resultado{filtered.length!==1?'s':''}
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr>
              {['Producto','Categoría','Almacén','Stock','F. Vencimiento','Días restantes','Estado','Valor en riesgo','Acción'].map(h => (
                <th key={h} className="bg-[#1a2230] px-3.5 py-2.5 text-left text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] border-b border-white/[0.08] whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9}>
                  <EmptyState icon={CheckCircle} title="Sin productos en este rango"
                    description={filtroRango === 'all' ? 'Ningún producto tiene fecha de vencimiento configurada.' : 'No hay productos en este rango.'}/>
                </td></tr>
              )}
              {filtered.map(p => {
                const rango = clasificar(p.dias)
                return (
                  <tr key={p.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]">
                    <td className="px-3.5 py-2.5">
                      <div className="font-medium text-[#e8edf2]">{p.nombre}</div>
                      <div className="text-[11px] text-[#5f6f80]">{p.sku}</div>
                    </td>
                    <td className="px-3.5 py-2.5 text-[12px] text-[#9ba8b6]">{p.catNombre}</td>
                    <td className="px-3.5 py-2.5 text-[12px] text-[#9ba8b6]">{p.almNombre}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px]">
                      {p.stockActual} <span className="text-[#5f6f80] text-[11px]">{p.unidadMedida}</span>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">
                      {formatDate(p.fechaVencimiento)}
                    </td>
                    <td className="px-3.5 py-2.5">
                      {p.dias === null ? '—' : (
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
                      )}
                    </td>
                    <td className="px-3.5 py-2.5">
                      {rango ? <Badge variant={rango.badge}>{rango.label.split(' ')[0]}</Badge> : '—'}
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] font-semibold" style={{ color: rango?.color || '#00c896' }}>
                      {formatCurrency(p.valorStock, simboloMoneda)}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <Btn variant="ghost" size="sm" onClick={() => setVerProd(p)}>
                        <Eye size={12}/> Ver detalle
                      </Btn>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.06] text-[13px]">
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

      {/* ── Modal Detalle ─────────────────────────────── */}
      {verProd && (
        <ModalDetalleVencimiento
          prod={verProd}
          simboloMoneda={simboloMoneda}
          formulaValorizacion={formulaValorizacion}
          onClose={() => setVerProd(null)}
          onBaja={() => setBajaConf(verProd)}
        />
      )}

      {/* ── Modal Confirmar Baja ──────────────────────── */}
      {bajaConf && (
        <ModalConfirmarBaja
          prod={bajaConf}
          simboloMoneda={simboloMoneda}
          onClose={() => setBajaConf(null)}
          onConfirm={(motivo) => ejecutarBaja(bajaConf, motivo)}
        />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════
// MODAL DETALLE VENCIMIENTO
// ════════════════════════════════════════════════════════
function ModalDetalleVencimiento({ prod, simboloMoneda, formulaValorizacion, onClose, onBaja }) {
  const rango     = clasificar(prod.dias)
  const vencido   = prod.dias !== null && prod.dias < 0
  const urgente   = prod.dias !== null && prod.dias <= 30
  const pmpActual = calcularPMP(prod.batches || [])

  // Historial de batches con info de vencimiento
  const batches = (prod.batches || []).map(b => ({
    ...b,
    diasVenc: b.fecha ? diasParaVencer(prod.fechaVencimiento) : null,
  }))

  return (
    <Modal
      open
      title={`Detalle de Vencimiento — ${prod.sku}`}
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-[12px] text-[#5f6f80]">
            {rango && <Badge variant={rango.badge}>{rango.label}</Badge>}
          </span>
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={onClose}>Cerrar</Btn>
            {urgente && prod.stockActual > 0 && (
              <Btn variant="danger" onClick={onBaja}>
                <XCircle size={14}/> Dar de baja
              </Btn>
            )}
          </div>
        </div>
      }
    >
      {/* Alerta urgente */}
      {vencido && (
        <div className="flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-[13px] text-red-300 mb-2">
          <AlertTriangle size={15} className="shrink-0 mt-0.5"/>
          <span>Este producto está <strong>vencido desde hace {Math.abs(prod.dias)} días</strong>. Debe retirarse del almacén y darse de baja para mantener la trazabilidad del inventario.</span>
        </div>
      )}
      {!vencido && urgente && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[13px] text-amber-300 mb-2">
          <Clock size={15} className="shrink-0 mt-0.5"/>
          <span>Este producto vence en <strong>{prod.dias} días</strong>. Considera acelerar su distribución o planificar su baja antes del vencimiento.</span>
        </div>
      )}

      {/* Ficha del producto */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { icon:Package,    label:'Producto',         val: prod.nombre                          },
          { icon:Hash,       label:'SKU',               val: prod.sku                             },
          { icon:Layers,     label:'Categoría',         val: prod.catNombre                       },
          { icon:Package,    label:'Almacén',           val: prod.almNombre                       },
          { icon:Calendar,   label:'Fecha de vencimiento', val: formatDate(prod.fechaVencimiento), color: rango?.color },
          { icon:Clock,      label:'Días restantes',    val: prod.dias === null ? '—' : prod.dias < 0 ? `Vencido hace ${Math.abs(prod.dias)} días` : `${prod.dias} días`, color: rango?.color },
          { icon:Package,    label:'Stock actual',      val: `${prod.stockActual} ${prod.unidadMedida}` },
          { icon:DollarSign, label:`Costo PMP (${formulaValorizacion})`, val: formatCurrency(pmpActual, simboloMoneda), color:'#00c896' },
        ].map(({ icon:Icon, label, val, color }) => (
          <div key={label} className="bg-[#1a2230] rounded-xl px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon size={11} className="text-[#5f6f80]"/>
              <span className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em]">{label}</span>
            </div>
            <div className="text-[13px] font-semibold" style={{ color: color || '#e8edf2' }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Valorización del stock en riesgo */}
      <div className="bg-[#1a2230] rounded-xl p-4 mb-4 border" style={{ borderColor: (rango?.color || '#5f6f80') + '33' }}>
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] mb-3">Valorización del stock en riesgo</div>
        <div className="grid grid-cols-3 gap-3">
          {[
            ['Cantidad en riesgo',  `${prod.stockActual} ${prod.unidadMedida}`,      null],
            ['Costo unitario PMP',  formatCurrency(pmpActual, simboloMoneda),         null],
            ['Valor total en riesgo', formatCurrency(prod.valorStock, simboloMoneda), rango?.color || '#f59e0b'],
          ].map(([l, v, c]) => (
            <div key={l} className="text-center">
              <div className="text-[10px] text-[#5f6f80] mb-1">{l}</div>
              <div className="text-[15px] font-bold font-mono" style={{ color: c || '#e8edf2' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Batches / Lotes */}
      {batches.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] mb-2">
            Lotes en Stock ({batches.length})
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full border-collapse text-[12px]">
              <thead><tr>
                {['Lote','Fecha ingreso','Cantidad','Costo unit.','Subtotal'].map(h => (
                  <th key={h} className="bg-[#161d28] px-3 py-2 text-left text-[10px] font-semibold text-[#5f6f80] uppercase border-b border-white/[0.08]">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {batches.map((b, i) => (
                  <tr key={i} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                    <td className="px-3 py-2.5 font-mono text-[#9ba8b6]">{b.lote || `Lote ${i+1}`}</td>
                    <td className="px-3 py-2.5 font-mono text-[#9ba8b6]">{formatDate(b.fecha)}</td>
                    <td className="px-3 py-2.5 font-mono font-semibold text-[#e8edf2]">{b.cantidad} {prod.unidadMedida}</td>
                    <td className="px-3 py-2.5 font-mono text-[#9ba8b6]">{formatCurrency(b.costo, simboloMoneda)}</td>
                    <td className="px-3 py-2.5 font-mono font-semibold text-[#00c896]">
                      {formatCurrency(b.cantidad * b.costo, simboloMoneda)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recomendación */}
      <div className="mt-4 px-4 py-3 bg-[#1a2230] rounded-xl border border-white/[0.06]">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] mb-1.5">
          <Info size={11} className="inline mr-1"/>Recomendación
        </div>
        <p className="text-[12px] text-[#9ba8b6] leading-relaxed">
          {vencido
            ? `Este producto venció hace ${Math.abs(prod.dias)} días. Retíralo físicamente del almacén y usa el botón "Dar de baja" para registrar la baja en el sistema. Se generará un Ajuste Negativo con trazabilidad completa.`
            : prod.dias <= 15
              ? `Vencimiento inminente (${prod.dias} días). Considera reubicar este producto en zona de salida prioritaria y verificar si puede despacharse antes de vencer.`
              : prod.dias <= 30
                ? `Quedan ${prod.dias} días. Revisa si hay pedidos pendientes que puedan incluir este producto para evitar la pérdida.`
                : `Aún tienes ${prod.dias} días. Monitorea este producto periódicamente y prioriza su despacho antes de los artículos con mayor stock disponible.`
          }
        </p>
      </div>
    </Modal>
  )
}

// ════════════════════════════════════════════════════════
// MODAL CONFIRMAR BAJA
// ════════════════════════════════════════════════════════
function ModalConfirmarBaja({ prod, simboloMoneda, onClose, onConfirm }) {
  const [motivo, setMotivo] = useState('Producto vencido — retirado del almacén')

  return (
    <Modal
      open
      title="Confirmar Baja por Vencimiento"
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn variant="danger" onClick={() => onConfirm(motivo)}>
            <XCircle size={14}/> Confirmar Baja
          </Btn>
        </>
      }
    >
      <div className="flex items-start gap-3 px-4 py-3 bg-red-500/10 border border-red-500/25 rounded-xl mb-4 text-[13px] text-red-300">
        <AlertTriangle size={15} className="shrink-0 mt-0.5"/>
        <div>
          Esta acción <strong>no se puede deshacer</strong>. Se reducirá el stock de <strong>{prod.nombre}</strong> en <strong>{prod.stockActual} {prod.unidadMedida}</strong> y se registrará un ajuste negativo con trazabilidad completa.
        </div>
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {[
          ['Producto',     prod.nombre],
          ['SKU',          prod.sku],
          ['Vencimiento',  formatDate(prod.fechaVencimiento)],
          ['Stock a bajar',`${prod.stockActual} ${prod.unidadMedida}`],
          ['Valor a perder', formatCurrency(prod.valorStock, simboloMoneda)],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between text-[13px] px-3.5 py-2 bg-[#1a2230] rounded-lg">
            <span className="text-[#5f6f80]">{k}</span>
            <span className="font-semibold text-[#e8edf2]">{v}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em]">
          Motivo de baja *
        </label>
        <textarea
          className={SI + ' resize-y min-h-[68px]'}
          value={motivo}
          onChange={e => setMotivo(e.target.value)}
          placeholder="Describe el motivo de la baja..."
        />
        <p className="text-[11px] text-[#5f6f80]">
          Este texto quedará registrado en el Kardex y en el historial de Movimientos.
        </p>
      </div>
    </Modal>
  )
}
