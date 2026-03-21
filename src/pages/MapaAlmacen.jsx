/**
 * MapaAlmacen.jsx — Mapa Visual de Almacén
 *
 * CÓMO FUNCIONA:
 * 1. El mapa genera una grilla de ubicaciones (racks) por almacén y zona
 * 2. Los productos se asignan a ubicaciones editando su campo `ubicacion`
 *    directamente desde este módulo (clic en celda → asignar producto)
 * 3. Los productos que tienen `almacenId` pero sin `ubicacion` aparecen
 *    en el panel "Sin ubicar" para asignarles un rack
 * 4. La ubicación se guarda en el producto via storage.saveProducto
 */
import { useState, useMemo } from 'react'
import { Grid3x3, List, Search, Package, MapPin, AlertTriangle,
         CheckCircle, Plus, X, ArrowRight } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { estadoStock } from '../utils/helpers'
import * as storage from '../services/storage'

const RACKS = {
  'ALM-01': [
    { zona:'A', filas:4, cols:5 },
    { zona:'B', filas:3, cols:4 },
    { zona:'C', filas:2, cols:6 },
    { zona:'D', filas:3, cols:3 },
  ],
  'ALM-02': [
    { zona:'A', filas:3, cols:4 },
    { zona:'B', filas:2, cols:5 },
  ],
  'ALM-03': [
    { zona:'F', filas:2, cols:4 },
  ],
}

function generarUbicaciones(almacenes) {
  const locs = []
  almacenes.forEach(alm => {
    const racks = RACKS[alm.codigo] || [{ zona:'A', filas:3, cols:4 }]
    racks.forEach(r => {
      for (let fila = 1; fila <= r.filas; fila++) {
        for (let col = 1; col <= r.cols; col++) {
          locs.push({
            id:        `${alm.codigo}-${r.zona}${String(fila).padStart(2,'0')}-${String(col).padStart(2,'0')}`,
            codigo:    `${r.zona}${String(fila).padStart(2,'0')}-${String(col).padStart(2,'0')}`,
            zona:      r.zona,
            almacen:   alm.codigo,
            almacenId: alm.id,
            fila, col,
            capacidad: 4,
          })
        }
      }
    })
  })
  return locs
}

function getOcupColor(pct) {
  if (pct === 0)  return { bg:'bg-[#1a2230]',        border:'border-white/[0.07]',    text:'text-[#3d4f60]',  label:'Vacía'    }
  if (pct >= 90)  return { bg:'bg-red-500/10',        border:'border-red-500/30',      text:'text-red-400',    label:'Crítica'  }
  if (pct >= 70)  return { bg:'bg-amber-500/10',      border:'border-amber-500/30',    text:'text-amber-400',  label:'Alta'     }
  if (pct >= 40)  return { bg:'bg-blue-500/10',       border:'border-blue-500/30',     text:'text-blue-400',   label:'Media'    }
  return            { bg:'bg-[#00c896]/8',        border:'border-[#00c896]/20',    text:'text-[#00c896]', label:'Baja'     }
}

// ════════════════════════════════════════════════════════
export default function MapaAlmacen() {
  const { productos, almacenes, recargarProductos } = useApp()

  const [almacenSel, setAlmacenSel] = useState(() => almacenes[0]?.codigo || '')
  const [zonaSel,    setZonaSel]    = useState('')
  const [viewMode,   setViewMode]   = useState('grid')
  const [search,     setSearch]     = useState('')
  const [selected,   setSelected]   = useState(null)   // codigo de celda seleccionada
  const [asignando,  setAsignando]  = useState(null)   // celda donde se va a asignar producto
  const [tab,        setTab]        = useState('mapa') // mapa | sinubicar

  const almacen = almacenes.find(a => a.codigo === almacenSel) || almacenes[0]
  const ubicaciones = useMemo(() => generarUbicaciones(almacenes), [almacenes])

  // Productos agrupados por su campo `ubicacion`
  const productosPorUbic = useMemo(() => {
    const map = {}
    productos.filter(p => p.activo !== false && p.ubicacion).forEach(p => {
      if (!map[p.ubicacion]) map[p.ubicacion] = []
      map[p.ubicacion].push(p)
    })
    return map
  }, [productos])

  // Productos del almacén seleccionado SIN ubicación asignada
  const sinUbicar = useMemo(() =>
    productos.filter(p =>
      p.activo !== false &&
      !p.ubicacion &&
      p.almacenId === almacen?.id
    )
  , [productos, almacen])

  // Todos los productos del almacén actual (para panel de asignación)
  const prodDelAlmacen = useMemo(() =>
    productos.filter(p => p.activo !== false && p.almacenId === almacen?.id)
  , [productos, almacen])

  const ubicsFiltradas = useMemo(() => {
    let d = ubicaciones.filter(u => u.almacen === almacenSel)
    if (zonaSel) d = d.filter(u => u.zona === zonaSel)
    if (search) {
      const q = search.toLowerCase()
      d = d.filter(u => {
        const prods = productosPorUbic[u.codigo] || []
        return u.codigo.toLowerCase().includes(q) ||
          prods.some(p => p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      })
    }
    return d
  }, [ubicaciones, almacenSel, zonaSel, search, productosPorUbic])

  const zonas = [...new Set(ubicaciones.filter(u => u.almacen === almacenSel).map(u => u.zona))].sort()

  const kpis = useMemo(() => {
    const ubs     = ubicaciones.filter(u => u.almacen === almacenSel)
    const ocupadas = ubs.filter(u => (productosPorUbic[u.codigo]||[]).length > 0).length
    const criticas = ubs.filter(u => (productosPorUbic[u.codigo]||[]).length >= u.capacidad).length
    return { total:ubs.length, ocupadas, vacias:ubs.length-ocupadas, criticas }
  }, [ubicaciones, almacenSel, productosPorUbic])

  const prodSelected = selected ? (productosPorUbic[selected] || []) : []

  // ── Asignar ubicación a un producto ──────────────────
  function asignarProducto(productoId, ubicCodigo) {
    const prod = storage.getProductoById(productoId).data
    if (!prod) return
    storage.saveProducto({ ...prod, ubicacion: ubicCodigo })
    recargarProductos()
    setAsignando(null)
  }

  // ── Quitar ubicación de un producto ──────────────────
  function quitarUbicacion(productoId) {
    const prod = storage.getProductoById(productoId).data
    if (!prod) return
    storage.saveProducto({ ...prod, ubicacion: '' })
    recargarProductos()
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3.5">
        {[
          { label:'Total ubicaciones', val:kpis.total,         color:'#3b82f6' },
          { label:'Ocupadas',          val:kpis.ocupadas,      color:'#00c896' },
          { label:'Vacías',            val:kpis.vacias,        color:'#5f6f80' },
          { label:'Sin ubicar',        val:sinUbicar.length,   color: sinUbicar.length > 0 ? '#f59e0b' : '#22c55e' },
        ].map(({ label, val, color }) => (
          <div key={label} className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }}/>
            <div className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.07em] mb-2">{label}</div>
            <div className="text-[26px] font-bold" style={{ color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Selector almacén + tabs + controles */}
      <div className="flex flex-wrap gap-2 items-center">
        {almacenes.map(a => (
          <button key={a.codigo}
            onClick={() => { setAlmacenSel(a.codigo); setZonaSel(''); setSelected(null); setAsignando(null) }}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all border ${
              almacenSel === a.codigo
                ? 'bg-[#00c896]/10 border-[#00c896]/30 text-[#00c896]'
                : 'bg-[#1a2230] border-white/[0.07] text-[#9ba8b6] hover:border-white/[0.14]'
            }`}>
            {a.nombre}
          </button>
        ))}

        <div className="ml-auto flex gap-2 items-center">
          {/* Tab mapa/sinubicar */}
          <div className="flex bg-[#1a2230] rounded-lg p-1 gap-0.5">
            {[['mapa','Mapa'],['sinubicar',`Sin ubicar (${sinUbicar.length})`]].map(([t,l]) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                  tab === t ? 'bg-[#00c896]/15 text-[#00c896]' : 'text-[#5f6f80] hover:text-[#9ba8b6]'
                }`}>
                {l}
              </button>
            ))}
          </div>

          {tab === 'mapa' && (
            <>
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
                <input
                  className="pl-8 pr-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[12px] text-[#e8edf2] outline-none focus:border-[#00c896] placeholder-[#5f6f80] w-[180px]"
                  placeholder="Buscar ubicación/SKU..." value={search} onChange={e => setSearch(e.target.value)}/>
              </div>
              <div className="flex gap-1 bg-[#1a2230] rounded-lg p-1">
                {[['grid', Grid3x3], ['list', List]].map(([m, Icon]) => (
                  <button key={m} onClick={() => setViewMode(m)}
                    className={`p-1.5 rounded-md transition-all ${viewMode===m ? 'bg-[#00c896]/15 text-[#00c896]' : 'text-[#5f6f80] hover:text-[#9ba8b6]'}`}>
                    <Icon size={14}/>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── TAB: PRODUCTOS SIN UBICAR ─────────────────── */}
      {tab === 'sinubicar' && (
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">
            Productos sin ubicación asignada — {almacen?.nombre}
          </div>

          {sinUbicar.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <CheckCircle size={36} className="text-green-400 opacity-60"/>
              <div className="text-[13px] font-medium text-[#e8edf2]">Todos los productos tienen ubicación</div>
              <div className="text-[11px] text-[#5f6f80]">Todos los productos de este almacén están asignados a un rack.</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {sinUbicar.map(p => {
                const est = estadoStock(p.stockActual, p.stockMinimo)
                const stColor = est.estado==='agotado'?'#ef4444':est.estado==='critico'?'#f59e0b':'#00c896'
                return (
                  <div key={p.id} className="flex items-center gap-4 px-4 py-3 bg-[#1a2230] rounded-xl border border-white/[0.07]">
                    <div className="w-8 h-8 rounded-lg bg-[#1e2835] flex items-center justify-center shrink-0">
                      <Package size={14} className="text-[#5f6f80]"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-[#e8edf2] truncate">{p.nombre}</div>
                      <div className="text-[11px] text-[#5f6f80] font-mono">{p.sku}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[12px] font-bold font-mono" style={{ color: stColor }}>{p.stockActual} {p.unidadMedida}</div>
                      <div className="text-[10px] text-[#5f6f80]">stock</div>
                    </div>
                    <div className="shrink-0">
                      <PanelAsignarUbic
                        producto={p}
                        ubicaciones={ubicaciones.filter(u => u.almacenId === p.almacenId)}
                        productosPorUbic={productosPorUbic}
                        onAsignar={(ubicCodigo) => asignarProducto(p.id, ubicCodigo)}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: MAPA ─────────────────────────────────── */}
      {tab === 'mapa' && (
        <>
          {/* Filtros de zona */}
          {zonas.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setZonaSel('')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  !zonaSel ? 'bg-[#00c896]/10 text-[#00c896] border border-[#00c896]/20'
                           : 'bg-[#1a2230] text-[#5f6f80] border border-white/[0.06] hover:border-white/[0.12]'}`}>
                Todas las zonas
              </button>
              {zonas.map(z => (
                <button key={z} onClick={() => setZonaSel(zonaSel===z ? '' : z)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    zonaSel===z ? 'bg-[#00c896]/10 text-[#00c896] border border-[#00c896]/20'
                                : 'bg-[#1a2230] text-[#5f6f80] border border-white/[0.06] hover:border-white/[0.12]'}`}>
                  Zona {z}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-5">
            {/* Grilla del mapa */}
            <div className="flex-1">
              {viewMode === 'grid' ? (
                <div>
                  {(zonaSel ? [zonaSel] : zonas).map(zona => {
                    const ubsZona = ubicsFiltradas.filter(u => u.zona === zona)
                    if (ubsZona.length === 0) return null
                    const filas = [...new Set(ubsZona.map(u=>u.fila))].sort((a,b)=>a-b)
                    const cols  = [...new Set(ubsZona.map(u=>u.col))].sort((a,b)=>a-b)
                    return (
                      <div key={zona} className="mb-6">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-7 h-7 rounded-lg bg-[#00c896]/10 flex items-center justify-center text-[#00c896] font-bold text-[13px]">{zona}</div>
                          <span className="text-[12px] font-semibold text-[#e8edf2]">Zona {zona}</span>
                          <span className="text-[11px] text-[#5f6f80]">{ubsZona.length} ubicaciones</span>
                        </div>
                        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0,1fr))` }}>
                          {filas.map(fila =>
                            cols.map(col => {
                              const u = ubsZona.find(x => x.fila===fila && x.col===col)
                              if (!u) return <div key={`e-${fila}-${col}`}/>
                              const prods = productosPorUbic[u.codigo] || []
                              const pct   = (prods.length / u.capacidad) * 100
                              const colr  = getOcupColor(pct)
                              const isSelected = selected === u.codigo
                              const isAsignando = asignando === u.codigo
                              return (
                                <button key={u.id}
                                  onClick={() => {
                                    if (isAsignando) { setAsignando(null); return }
                                    setSelected(isSelected ? null : u.codigo)
                                  }}
                                  className={`relative rounded-lg border p-2 text-left transition-all cursor-pointer
                                    ${colr.bg}
                                    ${isSelected || isAsignando
                                      ? 'ring-2 ring-[#00c896] ring-offset-1 ring-offset-[#0e1117]'
                                      : colr.border}
                                    hover:brightness-110`}
                                  style={{ minHeight: 56 }}>
                                  <div className={`text-[10px] font-bold ${isSelected?'text-[#00c896]':colr.text}`}>{u.codigo}</div>
                                  <div className="text-[9px] text-[#5f6f80] mt-0.5">{prods.length}/{u.capacidad}</div>
                                  {prods.length > 0 && (
                                    <div className="mt-1 flex gap-0.5 flex-wrap">
                                      {prods.slice(0,3).map(p => {
                                        const e = estadoStock(p.stockActual, p.stockMinimo)
                                        return <div key={p.id} className={`w-2 h-2 rounded-full ${
                                          e.estado==='agotado'?'bg-red-500':e.estado==='critico'?'bg-amber-400':'bg-[#00c896]'}`}/>
                                      })}
                                      {prods.length>3 && <div className="text-[8px] text-[#5f6f80]">+{prods.length-3}</div>}
                                    </div>
                                  )}
                                </button>
                              )
                            })
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                /* Vista lista */
                <div className="bg-[#161d28] border border-white/[0.08] rounded-xl overflow-hidden">
                  <table className="w-full border-collapse text-[12px]">
                    <thead><tr>
                      {['Ubicación','Zona','Ocupación','SKUs asignados','Estado','Acción'].map(h => (
                        <th key={h} className="bg-[#1a2230] px-3.5 py-2.5 text-left text-[10px] font-semibold text-[#5f6f80] uppercase border-b border-white/[0.08]">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {ubicsFiltradas.map(u => {
                        const prods = productosPorUbic[u.codigo] || []
                        const pct   = (prods.length / u.capacidad) * 100
                        const colr  = getOcupColor(pct)
                        return (
                          <tr key={u.id}
                            className="border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02] cursor-pointer"
                            onClick={() => setSelected(selected===u.codigo ? null : u.codigo)}>
                            <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#00c896] font-semibold">{u.codigo}</td>
                            <td className="px-3.5 py-2.5 text-[#9ba8b6]">Zona {u.zona}</td>
                            <td className="px-3.5 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-24 h-1.5 bg-[#0e1117] rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width:`${pct}%`, background:pct>=90?'#ef4444':pct>=70?'#f59e0b':pct>0?'#00c896':'transparent' }}/>
                                </div>
                                <span className={`text-[11px] ${colr.text}`}>{prods.length}/{u.capacidad}</span>
                              </div>
                            </td>
                            <td className="px-3.5 py-2.5 text-[#9ba8b6] max-w-[180px] truncate">
                              {prods.length > 0 ? prods.map(p=>p.sku).join(', ') : '—'}
                            </td>
                            <td className="px-3.5 py-2.5">
                              <span className={`text-[10px] font-semibold ${colr.text}`}>{colr.label}</span>
                            </td>
                            <td className="px-3.5 py-2.5" onClick={e => e.stopPropagation()}>
                              <PanelAsignarUbic
                                producto={null}
                                ubicacion={u}
                                ubicaciones={[u]}
                                productosPorUbic={productosPorUbic}
                                prodDelAlmacen={prodDelAlmacen}
                                onAsignar={(prodId) => asignarProducto(prodId, u.codigo)}
                                onQuitar={quitarUbicacion}
                                modoUbic
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Panel lateral — detalle de celda seleccionada */}
            {selected && (
              <div className="w-[280px] shrink-0">
                <div className="bg-[#161d28] border border-[#00c896]/20 rounded-xl p-4 sticky top-0">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin size={14} className="text-[#00c896]"/>
                    <span className="text-[13px] font-semibold text-[#e8edf2] font-mono">{selected}</span>
                    <button onClick={() => setSelected(null)} className="ml-auto text-[#5f6f80] hover:text-[#9ba8b6] text-[16px] leading-none">×</button>
                  </div>

                  {prodSelected.length === 0 ? (
                    <div className="text-center py-6 flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-[#1a2230] flex items-center justify-center">
                        <Package size={18} className="text-[#3d4f60]"/>
                      </div>
                      <div className="text-[12px] text-[#5f6f80]">Ubicación vacía</div>
                      <div className="text-[11px] text-[#3d4f60]">Asigna un producto desde<br/>"Sin ubicar" o desde lista</div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 mb-3">
                      {prodSelected.map(p => {
                        const est = estadoStock(p.stockActual, p.stockMinimo)
                        const stColor = est.estado==='agotado'?'#ef4444':est.estado==='critico'?'#f59e0b':'#00c896'
                        return (
                          <div key={p.id} className="bg-[#1a2230] rounded-lg p-3">
                            <div className="flex items-start justify-between mb-1">
                              <div className="text-[12px] font-medium text-[#e8edf2] leading-tight">{p.nombre.slice(0,26)}</div>
                              <div className="w-2 h-2 rounded-full ml-2 mt-1 shrink-0" style={{ background: stColor }}/>
                            </div>
                            <div className="text-[10px] text-[#5f6f80] font-mono">{p.sku}</div>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[11px] text-[#5f6f80]">Stock</span>
                              <span className="text-[12px] font-semibold font-mono" style={{ color: stColor }}>{p.stockActual} {p.unidadMedida}</span>
                            </div>
                            <button
                              onClick={() => quitarUbicacion(p.id)}
                              className="mt-2 w-full text-[10px] text-red-400 hover:text-red-300 py-1 rounded border border-red-500/20 hover:border-red-500/40 transition-colors">
                              Quitar de esta ubicación
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Asignar producto a esta celda */}
                  {(() => {
                    const ubic = ubicaciones.find(u => u.codigo === selected)
                    if (!ubic) return null
                    const prodsDisp = prodDelAlmacen.filter(p =>
                      !p.ubicacion || p.ubicacion === selected
                    )
                    if (prodsDisp.length === 0) return (
                      <div className="text-[11px] text-[#3d4f60] text-center py-2">No hay productos disponibles para asignar en este almacén.</div>
                    )
                    return (
                      <div>
                        <div className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-wide mb-2">Asignar producto</div>
                        <select
                          className="w-full px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[12px] text-[#e8edf2] outline-none focus:border-[#00c896]"
                          defaultValue=""
                          onChange={e => { if (e.target.value) asignarProducto(e.target.value, selected) }}>
                          <option value="">Seleccionar producto...</option>
                          {prodsDisp.filter(p => !p.ubicacion).map(p => (
                            <option key={p.id} value={p.id}>{p.sku} — {p.nombre.slice(0,25)}</option>
                          ))}
                        </select>
                      </div>
                    )
                  })()}

                  {/* Leyenda */}
                  <div className="mt-3 pt-3 border-t border-white/[0.06] flex gap-3 text-[10px]">
                    {[['bg-[#00c896]','OK'],['bg-amber-400','Crítico'],['bg-red-500','Agotado']].map(([bg,lb]) => (
                      <div key={lb} className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${bg}`}/>
                        <span className="text-[#5f6f80]">{lb}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Leyenda ocupación */}
          <div className="flex gap-3 text-[11px] flex-wrap">
            {[
              { bg:'bg-[#1a2230] border-white/[0.07]',         label:'Vacía'             },
              { bg:'bg-[#00c896]/8 border-[#00c896]/20',       label:'Ocupación baja'    },
              { bg:'bg-blue-500/10 border-blue-500/30',        label:'Ocupación media'   },
              { bg:'bg-amber-500/10 border-amber-500/30',      label:'Ocupación alta'    },
              { bg:'bg-red-500/10 border-red-500/30',          label:'Capacidad crítica' },
            ].map(({ bg, label }) => (
              <div key={label} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${bg}`}>
                <span className="text-[#9ba8b6]">{label}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── GUÍA DE USO ───────────────────────────────── */}
      <div className="bg-[#161d28] border border-white/[0.06] rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">¿Cómo usar el Mapa de Almacén?</div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {[
            ['1. Ver el mapa',     'El mapa muestra todos los racks y celdas del almacén. Las celdas vacías son gris oscuro. Las ocupadas tienen color según su nivel de llenado.'],
            ['2. Asignar producto','Haz clic en cualquier celda del mapa → en el panel derecho elige el producto a asignar. O ve a la pestaña "Sin ubicar" para ver los productos sin rack.'],
            ['3. Ver contenido',   'Al hacer clic en una celda ocupada (colorida), el panel derecho muestra qué productos hay, su stock y estado. Puedes quitar un producto de ahí.'],
            ['4. Persiste siempre','La ubicación se guarda directamente en el producto. No se pierde al cerrar. Se refleja también en Inventario y en búsquedas de picking.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
              <div className="text-[11px] font-semibold text-[#e8edf2] mb-1.5">{t}</div>
              <div className="text-[11px] text-[#5f6f80] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// Sub-componente: botón de asignación inline
// ════════════════════════════════════════════════════════
function PanelAsignarUbic({ producto, ubicacion, ubicaciones, productosPorUbic, prodDelAlmacen, onAsignar, onQuitar, modoUbic }) {
  const [open, setOpen] = useState(false)

  if (!modoUbic) {
    // Modo: asignar este producto a una ubicación
    return (
      <div className="relative">
        <button onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00c896]/10 border border-[#00c896]/20 text-[#00c896] rounded-lg text-[11px] font-medium hover:bg-[#00c896]/20 transition-colors">
          <MapPin size={11}/> Asignar rack
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1 w-[220px] bg-[#1a2230] border border-white/[0.12] rounded-xl shadow-2xl z-50 p-2">
            <div className="text-[10px] text-[#5f6f80] font-semibold uppercase tracking-wide px-2 py-1.5">
              Seleccionar ubicación para<br/>
              <span className="text-[#00c896]">{producto?.sku}</span>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {ubicaciones.filter(u => (productosPorUbic[u.codigo]||[]).length < u.capacidad).map(u => {
                const prods = productosPorUbic[u.codigo] || []
                return (
                  <button key={u.id}
                    onClick={() => { onAsignar(u.codigo); setOpen(false) }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/[0.05] text-left transition-colors">
                    <span className="text-[12px] font-mono text-[#00c896]">{u.codigo}</span>
                    <span className="text-[11px] text-[#5f6f80]">{prods.length}/{u.capacidad}</span>
                  </button>
                )
              })}
            </div>
            <button onClick={() => setOpen(false)} className="w-full mt-1 py-1.5 text-[11px] text-[#5f6f80] hover:text-[#9ba8b6]">Cancelar</button>
          </div>
        )}
      </div>
    )
  }

  // Modo ubicación: asignar producto a esta celda
  if (!prodDelAlmacen?.length) return <span className="text-[11px] text-[#3d4f60]">—</span>
  const sinUbic = (prodDelAlmacen || []).filter(p => !p.ubicacion)
  if (!sinUbic.length) return <span className="text-[11px] text-[#3d4f60]">Llena</span>
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 px-2 py-1 bg-[#1e2835] border border-white/[0.08] text-[#9ba8b6] rounded-lg text-[11px] hover:border-white/[0.18] transition-colors">
        <Plus size={10}/> Asignar
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-[200px] bg-[#1a2230] border border-white/[0.12] rounded-xl shadow-2xl z-50 p-2">
          <div className="max-h-40 overflow-y-auto">
            {sinUbic.map(p => (
              <button key={p.id}
                onClick={() => { onAsignar(p.id); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.05] text-left transition-colors">
                <span className="text-[11px] font-mono text-[#00c896]">{p.sku}</span>
                <span className="text-[11px] text-[#9ba8b6] truncate">{p.nombre.slice(0,18)}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setOpen(false)} className="w-full mt-1 py-1 text-[11px] text-[#5f6f80] hover:text-[#9ba8b6]">Cancelar</button>
        </div>
      )}
    </div>
  )
}
