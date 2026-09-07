/**
 * MapaAlmacen/index.jsx — Mapa Visual de Almacén
 *
 * Ubicaciones: GET /ubicaciones?almacenId=xxx  (reales de BD)
 * Inventario:  GET /inventario?almacenId=xxx   (filas por productoId+ubicacionId)
 * Asignar:     POST /ubicaciones/:id/asignar   { productoId, cantidad }
 * Liberar:     POST /ubicaciones/:id/liberar   { productoId, cantidad }
 *
 * La tabla `Inventario` tiene { productoId, almacenId, ubicacionId?, cantidad }.
 * Filas con ubicacionId=null son el "bucket sin asignar" del almacén.
 * asignar() mueve stock de ese bucket a la ubicación física.
 *
 * Todos los cálculos derivados pesados (prodMap, invPorUbic, ubicsParsed,
 * ubicsFiltradas, kpis, lineasSelected, sinUbicLines, ubicacionSeleccionada)
 * viven acá. Los componentes de presentación (TabSinUbicar, VistaGridUbicaciones,
 * VistaListaUbicaciones, PanelDetalleUbicacion) solo reciben esos datos ya
 * calculados por props — nunca los recalculan.
 */
import { useState, useMemo } from 'react'
import { Grid3x3, List, Search, Plus, Loader2, MapPin, Warehouse } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { ConfirmDialog } from '../../components/ui/index'
import { useProductosList }   from '../../queries/productos.queries'
import { useAlmacenesList }   from '../../queries/almacenes.queries'
import {
  useUbicacionesList, useAsignarUbicacion, useLiberarUbicacion,
  useCrearUbicacion, useActualizarUbicacion, useEliminarUbicacion,
} from '../../queries/ubicaciones.queries'
import { useInventarioList }  from '../../queries/inventario.queries'
import { parseCodigo } from './constants'
import TabSinUbicar from './TabSinUbicar'
import VistaGridUbicaciones from './VistaGridUbicaciones'
import VistaListaUbicaciones from './VistaListaUbicaciones'
import PanelDetalleUbicacion from './PanelDetalleUbicacion'
import ModalReubicar from './ModalReubicar'
import ModalUbicacion from './ModalUbicacion'

export default function MapaAlmacen() {
  const { toast } = useApp()
  const { data: productos  = [] } = useProductosList()
  const { data: almacenes  = [] } = useAlmacenesList()

  const [almacenSel, setAlmacenSel] = useState(() => '')
  const [zonaSel,    setZonaSel]    = useState('')
  const [viewMode,   setViewMode]   = useState('grid')
  const [search,     setSearch]     = useState('')
  const [selected,   setSelected]   = useState(null)   // ubicacionId seleccionado
  const [tab,        setTab]        = useState('mapa')
  const [modalAsig,  setModalAsig]  = useState(null)   // { ubicacionId, modo:'asignar'|'liberar', linea? }
  const [modalUbic,  setModalUbic]  = useState(null)   // false-ish=cerrado | true=crear | ubicacion=editar
  const [confirmDelUbic, setConfirmDelUbic] = useState(null) // ubicacion a eliminar

  const almacenId = almacenSel || almacenes[0]?.id || ''
  const almacen   = almacenes.find(a => a.id === almacenId)

  const { data: ubicaciones = [], isLoading: cargandoUbic } = useUbicacionesList(almacenId)
  const { data: inventario  = [], isLoading: cargandoInv  } = useInventarioList({ almacenId })

  const asignarMut = useAsignarUbicacion()
  const liberarMut = useLiberarUbicacion()
  const crearUbicMut      = useCrearUbicacion()
  const actualizarUbicMut = useActualizarUbicacion()
  const eliminarUbicMut   = useEliminarUbicacion()

  async function handleEliminarUbicacion(ubic) {
    const res = await eliminarUbicMut.mutateAsync(ubic.id)
    setConfirmDelUbic(null)
    if (res?.error) { toast(res.error, 'error'); return }
    if (selected === ubic.id) setSelected(null)
    toast('Ubicación eliminada', 'success')
  }

  const prodMap = useMemo(() => Object.fromEntries(productos.map(p => [p.id, p])), [productos])

  // Inventario agrupado por ubicacionId (null = sin asignar)
  const invPorUbic = useMemo(() => {
    const m = {}
    inventario.forEach(inv => {
      const key = inv.ubicacionId ?? '__ninguna__'
      if (!m[key]) m[key] = []
      if (Number(inv.cantidad) > 0) m[key].push(inv)
    })
    return m
  }, [inventario])

  const sinUbicLines = invPorUbic['__ninguna__'] || []

  // Líneas dentro de la ubicación seleccionada
  const lineasSelected = selected ? (invPorUbic[selected] || []) : []

  // Ubicación seleccionada (objeto completo) — resuelta acá para no duplicar el
  // find() en el componente de presentación del panel de detalle.
  const ubicacionSeleccionada = selected ? ubicaciones.find(u => u.id === selected) : null

  // Ubicaciones del almacén actual con info de parsing
  const ubicsParsed = useMemo(() =>
    ubicaciones.map(u => ({ ...u, ...parseCodigo(u.codigo) }))
  , [ubicaciones])

  const zonas = [...new Set(ubicsParsed.map(u => u.zona))].sort()

  const ubicsFiltradas = useMemo(() => {
    let d = ubicsParsed
    if (zonaSel) d = d.filter(u => u.zona === zonaSel)
    if (search) {
      const q = search.toLowerCase()
      d = d.filter(u => {
        const lineas = invPorUbic[u.id] || []
        return u.codigo.toLowerCase().includes(q) ||
          lineas.some(l => {
            const p = prodMap[l.productoId]
            return p?.nombre?.toLowerCase().includes(q) || p?.sku?.toLowerCase().includes(q)
          })
      })
    }
    return d
  }, [ubicsParsed, zonaSel, search, invPorUbic, prodMap])

  const kpis = useMemo(() => {
    const total    = ubicaciones.length
    const ocupadas = ubicaciones.filter(u => (invPorUbic[u.id]||[]).length > 0).length
    const criticas = ubicaciones.filter(u => u.capacidadActual >= u.capacidadMax && u.capacidadMax > 0).length
    return { total, ocupadas, vacias: total - ocupadas, criticas, sinUbicar: sinUbicLines.length }
  }, [ubicaciones, invPorUbic, sinUbicLines])

  const cargando = cargandoUbic || cargandoInv

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          { label:'Total ubicaciones', val: kpis.total,    color:'#3b82f6' },
          { label:'Ocupadas',          val: kpis.ocupadas, color:'#00c896' },
          { label:'Vacías',            val: kpis.vacias,   color:'#5f6f80' },
          { label:'Sin ubicar (SKUs)', val: kpis.sinUbicar, color: kpis.sinUbicar > 0 ? '#f59e0b' : '#22c55e' },
        ].map(({ label, val, color }) => (
          <div key={label} className="relative bg-[#161d28] border border-white/8 rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.75 rounded-t-xl" style={{ background: color }}/>
            <div className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.07em] mb-2">{label}</div>
            <div className="text-[28px] font-semibold" style={{ color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Selector almacén + tabs + controles */}
      <div className="flex flex-wrap gap-2 items-center">
        {almacenes.map(a => (
          <button key={a.id}
            onClick={() => { setAlmacenSel(a.id); setZonaSel(''); setSelected(null); setTab('mapa') }}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all border ${
              almacenId === a.id
                ? 'bg-[#00c896]/10 border-[#00c896]/30 text-[#00c896]'
                : 'bg-[#1a2230] border-white/8 text-[#9ba8b6] hover:border-white/14'
            }`}>
            {a.nombre}
          </button>
        ))}

        <div className="ml-auto flex gap-2 items-center">
          <div className="flex bg-[#1a2230] rounded-lg p-1 gap-0.5">
            {[['mapa','Mapa'], ['sinubicar', `Sin ubicar (${kpis.sinUbicar})`]].map(([t, l]) => (
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
                  className="pl-8 pr-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[12px] text-[#e8edf2] outline-none focus:border-[#00c896] placeholder-[#5f6f80] w-[180px]"
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

          {almacenId && (
            <button onClick={() => setModalUbic(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#00c896] text-[#0e1117] rounded-lg text-[12px] font-semibold hover:bg-[#00b084] transition-colors">
              <Plus size={13}/> Nueva ubicación
            </button>
          )}
        </div>
      </div>

      {cargando && (
        <div className="flex items-center gap-2 text-[12px] text-[#5f6f80]">
          <Loader2 size={14} className="animate-spin"/> Cargando ubicaciones e inventario...
        </div>
      )}

      {/* Sin almacenes en absoluto — no hay dónde crear ubicaciones */}
      {!cargando && almacenes.length === 0 && (
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-10 text-center">
          <Warehouse size={32} className="text-[#3d4f60] mx-auto mb-3"/>
          <div className="text-[14px] font-medium text-[#e8edf2] mb-1">Todavía no tienes almacenes</div>
          <div className="text-[12px] text-[#5f6f80]">
            Ve a <span className="text-[#00c896]">Configuración → Almacenes</span> y crea al menos uno. Luego vuelve aquí para armar su mapa de ubicaciones.
          </div>
        </div>
      )}

      {/* Almacén sin ubicaciones — el CTA crea la primera ubicación sin salir de esta pantalla */}
      {!cargando && almacenes.length > 0 && ubicaciones.length === 0 && almacenId && (
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-10 text-center">
          <MapPin size={32} className="text-[#3d4f60] mx-auto mb-3"/>
          <div className="text-[14px] font-medium text-[#e8edf2] mb-1">Este almacén todavía no tiene ubicaciones</div>
          <div className="text-[12px] text-[#5f6f80] mb-4 max-w-md mx-auto">
            Las ubicaciones son los racks, estanterías o zonas de piso donde físicamente guardas la mercadería.
            Crea la primera para empezar a organizar el stock de <strong className="text-[#9ba8b6]">{almacen?.nombre}</strong>.
          </div>
          <button onClick={() => setModalUbic(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#00c896] text-[#0e1117] rounded-lg text-[12px] font-semibold hover:bg-[#00b084] transition-colors">
            <Plus size={13}/> Crear primera ubicación
          </button>
        </div>
      )}

      {/* ── TAB: PRODUCTOS SIN UBICAR ──────────────────── */}
      {tab === 'sinubicar' && (
        <TabSinUbicar
          nombreAlmacen={almacen?.nombre}
          sinUbicLines={sinUbicLines}
          prodMap={prodMap}
          setModalAsig={setModalAsig}
        />
      )}

      {/* ── TAB: MAPA ───────────────────────────────────── */}
      {tab === 'mapa' && ubicaciones.length > 0 && (
        <>
          {/* Filtros de zona */}
          {zonas.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setZonaSel('')}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
                  !zonaSel ? 'bg-[#00c896]/10 text-[#00c896] border border-[#00c896]/20'
                           : 'bg-[#1a2230] text-[#5f6f80] border border-white/6 hover:border-white/12'}`}>
                Todas las zonas
              </button>
              {zonas.map(z => (
                <button key={z} onClick={() => setZonaSel(zonaSel===z ? '' : z)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
                    zonaSel===z ? 'bg-[#00c896]/10 text-[#00c896] border border-[#00c896]/20'
                                : 'bg-[#1a2230] text-[#5f6f80] border border-white/6 hover:border-white/12'}`}>
                  Zona {z}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-5">
            {/* Grilla del mapa */}
            <div className="flex-1">
              {viewMode === 'grid' ? (
                <VistaGridUbicaciones
                  zonaSel={zonaSel}
                  zonas={zonas}
                  ubicsFiltradas={ubicsFiltradas}
                  invPorUbic={invPorUbic}
                  prodMap={prodMap}
                  selected={selected}
                  setSelected={setSelected}
                />
              ) : (
                <VistaListaUbicaciones
                  ubicsFiltradas={ubicsFiltradas}
                  invPorUbic={invPorUbic}
                  prodMap={prodMap}
                  selected={selected}
                  setSelected={setSelected}
                  setModalAsig={setModalAsig}
                  setModalUbic={setModalUbic}
                />
              )}
            </div>

            {/* Panel lateral — detalle de celda seleccionada */}
            {selected && ubicacionSeleccionada && (
              <PanelDetalleUbicacion
                ubicacion={ubicacionSeleccionada}
                lineasSelected={lineasSelected}
                prodMap={prodMap}
                setSelected={setSelected}
                setModalUbic={setModalUbic}
                setModalAsig={setModalAsig}
                setConfirmDelUbic={setConfirmDelUbic}
                toast={toast}
              />
            )}
          </div>

          {/* Leyenda ocupación */}
          <div className="flex gap-3 text-[11px] flex-wrap">
            {[
              { bg:'bg-[#1a2230] border-white/8',        label:'Vacía'             },
              { bg:'bg-[#00c896]/8 border-[#00c896]/20', label:'Ocupación baja'    },
              { bg:'bg-blue-500/10 border-blue-500/30',  label:'Ocupación media'   },
              { bg:'bg-amber-500/10 border-amber-500/30',label:'Ocupación alta'    },
              { bg:'bg-red-500/10 border-red-500/30',    label:'Capacidad crítica' },
            ].map(({ bg, label }) => (
              <div key={label} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${bg}`}>
                <span className="text-[#9ba8b6]">{label}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── GUÍA DE USO ─────────────────────────────────── */}
      <div className="bg-[#161d28] border border-white/6 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">¿Cómo usar el Mapa de Almacén?</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            ['1. Elige el almacén',  'Selecciona el almacén arriba. Cada almacén tiene su propio mapa de ubicaciones — no se comparten entre sí.'],
            ['2. Crea ubicaciones',  'Presiona "Nueva ubicación" para dar de alta un rack, estantería o zona de piso: zona, fila, columna y capacidad máxima (en SKUs distintos).'],
            ['3. Asigna stock',      'Haz clic en una celda para asignarle producto, o ve a "Sin ubicar" y presiona "Asignar rack" para elegir a qué ubicación mandar ese producto. El stock sale del bucket general del almacén.'],
            ['4. Ver contenido',     'Haz clic en una celda con color para ver qué hay dentro: producto, stock en ese rack, estado. Puedes mover el stock de vuelta al bucket general desde este panel.'],
            ['5. Persiste en BD',    'Las ubicaciones y asignaciones se guardan en la base de datos. Son compartidas entre todos los usuarios y dispositivos conectados.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
              <div className="text-[11px] font-semibold text-[#e8edf2] mb-1.5">{t}</div>
              <div className="text-[11px] text-[#5f6f80] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MODAL ASIGNAR / LIBERAR ─────────────────────── */}
      {modalAsig && (
        <ModalReubicar
          modo={modalAsig.modo}
          ubicacion={modalAsig.ubicacion}
          invLinea={modalAsig.inv}
          prod={modalAsig.prod}
          sinUbicLines={sinUbicLines}
          prodMap={prodMap}
          ubicacionesDisponibles={ubicaciones}
          asignarMut={asignarMut}
          liberarMut={liberarMut}
          onClose={() => setModalAsig(null)}
        />
      )}

      {/* ── MODAL CREAR / EDITAR UBICACIÓN ──────────────── */}
      {modalUbic && (
        <ModalUbicacion
          ubicacion={modalUbic === true ? null : modalUbic}
          almacenId={almacenId}
          ubicacionesExistentes={ubicaciones}
          crearMut={crearUbicMut}
          actualizarMut={actualizarUbicMut}
          onClose={() => setModalUbic(null)}
          onSaved={(msg) => { setModalUbic(null); toast(msg, 'success') }}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelUbic}
        onClose={() => setConfirmDelUbic(null)}
        onConfirm={() => handleEliminarUbicacion(confirmDelUbic)}
        danger
        title="Eliminar ubicación"
        message={confirmDelUbic ? `Se eliminará la ubicación "${confirmDelUbic.codigo}". Esta acción no se puede deshacer.` : ''}
      />
    </div>
  )
}
