import { useMemo, useState } from 'react'
import {
  Bell, CheckCheck, AlertTriangle, Clock, TrendingDown,
  ShoppingCart, Package, CheckCircle, X, Eye,
  ArrowRight, Calendar, Hash, Layers
} from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatDate, formatCurrency, diasParaVencer, estadoStock } from '../utils/helpers'
import { Badge, Btn, Modal } from '../components/ui/index'

const TIPOS = {
  stock_agotado: { label:'Agotado',       color:'danger',  icon:Package,       bg:'bg-red-500/15',    txt:'text-red-400'   },
  stock_critico: { label:'Stock crítico', color:'danger',  icon:AlertTriangle, bg:'bg-red-500/15',    txt:'text-red-400'   },
  vencimiento:   { label:'Vencimiento',   color:'warning', icon:Clock,         bg:'bg-amber-500/15',  txt:'text-amber-400' },
  reorden:       { label:'Punto reorden', color:'warning', icon:TrendingDown,  bg:'bg-amber-500/15',  txt:'text-amber-400' },
  oc_pendiente:  { label:'OC pendiente',  color:'info',    icon:ShoppingCart,  bg:'bg-blue-500/15',   txt:'text-blue-400'  },
}

function generarAlertas(productos, ordenes, config, categorias, almacenes, simboloMoneda) {
  const alertas = []
  const diasAlerta = config?.diasAlertaVencimiento || 30

  productos.forEach(p => {
    if (p.activo === false) return
    const e       = estadoStock(p.stockActual, p.stockMinimo)
    const cat     = categorias.find(c => c.id === p.categoriaId)?.nombre || '—'
    const alm     = almacenes.find(a => a.id === p.almacenId)?.nombre   || '—'
    const base    = { productoId:p.id, sku:p.sku, nombre:p.nombre, categoria:cat, almacen:alm,
                      stock:p.stockActual, stockMin:p.stockMinimo, stockMax:p.stockMaximo,
                      unidad:p.unidadMedida, fecha:new Date().toISOString().split('T')[0] }

    if (p.stockActual <= 0) {
      alertas.push({ ...base, tipo:'stock_agotado', prioridad:1,
        titulo:`${p.nombre} — Sin stock`,
        detalle:`El producto está agotado. Stock mínimo requerido: ${p.stockMinimo} ${p.unidadMedida}.`,
        accion:'Generar Orden de Compra',
        accionPath:'/ordenes',
      })
    } else if (e.estado === 'critico') {
      alertas.push({ ...base, tipo:'stock_critico', prioridad:1,
        titulo:`${p.nombre} — Stock crítico`,
        detalle:`Stock actual (${p.stockActual}) está por debajo del mínimo (${p.stockMinimo}) ${p.unidadMedida}.`,
        accion:'Ver en Punto de Reorden',
        accionPath:'/reorden',
      })
    } else if (e.estado === 'bajo') {
      alertas.push({ ...base, tipo:'reorden', prioridad:2,
        titulo:`${p.nombre} — Stock bajo`,
        detalle:`Stock actual (${p.stockActual}) se acerca al mínimo (${p.stockMinimo}) ${p.unidadMedida}.`,
        accion:'Ver Previsión',
        accionPath:'/prevision',
      })
    }

    if (p.tieneVencimiento && p.fechaVencimiento) {
      const dias = diasParaVencer(p.fechaVencimiento)
      if (dias !== null && dias < 0) {
        alertas.push({ ...base, tipo:'vencimiento', prioridad:1,
          titulo:`${p.nombre} — VENCIDO`,
          detalle:`Venció hace ${Math.abs(dias)} días. Fecha: ${formatDate(p.fechaVencimiento)}.`,
          diasVencimiento: dias,
          fechaVencimiento: p.fechaVencimiento,
          accion:'Gestionar baja',
          accionPath:'/vencimientos',
          fecha: p.fechaVencimiento,
        })
      } else if (dias !== null && dias <= diasAlerta) {
        alertas.push({ ...base, tipo:'vencimiento', prioridad: dias <= 15 ? 1 : 2,
          titulo:`${p.nombre} — Próximo a vencer`,
          detalle:`Vence en ${dias} días (${formatDate(p.fechaVencimiento)}).`,
          diasVencimiento: dias,
          fechaVencimiento: p.fechaVencimiento,
          accion:'Ver Vencimientos',
          accionPath:'/vencimientos',
          fecha: p.fechaVencimiento,
        })
      }
    }
  })

  ordenes.filter(o => o.estado === 'PENDIENTE').forEach(o => {
    alertas.push({
      tipo:'oc_pendiente', prioridad:3,
      titulo:`OC ${o.numero} — Pendiente de aprobación`,
      detalle:`Orden de compra por ${formatCurrency(o.total, simboloMoneda)} esperando aprobación.`,
      ocNumero: o.numero,
      ocTotal:  o.total,
      ocFecha:  o.fecha,
      accion:'Ir a Órdenes de Compra',
      accionPath:'/ordenes',
      fecha: o.fecha,
    })
  })

  return alertas.sort((a, b) => a.prioridad - b.prioridad)
}

// ════════════════════════════════════════════════════════
export default function Alertas() {
  const { productos, ordenes, config, categorias, almacenes, simboloMoneda } = useApp()
  const [filtroTipo, setFiltroTipo] = useState('all')
  const [verAlerta,  setVerAlerta]  = useState(null)
  const [leidas,     setLeidas]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('sp_alertas_leidas') || '[]') } catch { return [] }
  })

  const alertas = useMemo(() =>
    generarAlertas(productos, ordenes, config, categorias, almacenes, simboloMoneda)
  , [productos, ordenes, config, categorias, almacenes, simboloMoneda])

  const filtered = useMemo(() =>
    filtroTipo === 'all' ? alertas : alertas.filter(a => a.tipo === filtroTipo)
  , [alertas, filtroTipo])

  const noLeidas = alertas.filter(a => !leidas.includes(a.titulo)).length

  function marcarLeida(titulo) {
    const n = [...new Set([...leidas, titulo])]
    setLeidas(n); localStorage.setItem('sp_alertas_leidas', JSON.stringify(n))
  }
  function marcarTodas() {
    const n = alertas.map(a => a.titulo)
    setLeidas(n); localStorage.setItem('sp_alertas_leidas', JSON.stringify(n))
  }

  const conteos = useMemo(() => {
    const c = { all: alertas.length }
    Object.keys(TIPOS).forEach(t => { c[t] = alertas.filter(a => a.tipo === t).length })
    return c
  }, [alertas])

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* KPIs por tipo */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[['Todas', 'all', Bell], ...Object.entries(TIPOS).map(([k,v]) => [v.label, k, v.icon])].map(([label, key, Icon]) => {
          const count  = key === 'all' ? conteos.all : (conteos[key] || 0)
          const activo = filtroTipo === key
          const meta   = key !== 'all' ? TIPOS[key] : null
          return (
            <button key={key} onClick={() => setFiltroTipo(key)}
              className="relative text-left p-4 rounded-xl border transition-all overflow-hidden"
              style={{
                background:  activo ? 'rgba(0,200,150,0.08)' : '#161d28',
                borderColor: activo ? '#00c896' : 'rgba(255,255,255,0.08)',
              }}>
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl"
                style={{ background: activo ? '#00c896' : 'transparent' }}/>
              <div className="flex items-center justify-between mb-2">
                <Icon size={14} className={activo ? 'text-[#00c896]' : (meta?.txt || 'text-[#5f6f80]')}/>
                {count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${meta?.bg || 'bg-red-500/15'} ${meta?.txt || 'text-red-400'}`}>
                    {count}
                  </span>
                )}
              </div>
              <div className="text-[22px] font-semibold text-[#e8edf2]">{count}</div>
              <div className="text-[11px] text-[#5f6f80] mt-0.5 leading-tight">{label}</div>
            </button>
          )
        })}
      </div>

      {/* Lista de alertas */}
      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
              Centro de Alertas
            </span>
            {noLeidas > 0 && (
              <span className="text-[11px] bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full font-semibold">
                {noLeidas} no leídas
              </span>
            )}
          </div>
          {noLeidas > 0 && (
            <Btn variant="ghost" size="sm" onClick={marcarTodas}>
              <CheckCheck size={13}/> Marcar todas leídas
            </Btn>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <CheckCircle size={48} className="text-green-400 opacity-40"/>
            <div className="text-center">
              <p className="text-[14px] font-medium text-[#9ba8b6] mb-1">Sin alertas activas</p>
              <p className="text-[12px] text-[#5f6f80]">Todo el inventario está en orden.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((alerta, i) => {
              const meta   = TIPOS[alerta.tipo]
              const Icon   = meta?.icon || Bell
              const esLeida = leidas.includes(alerta.titulo)
              const color  = alerta.prioridad === 1 ? { bg:'bg-red-500/[0.04]', border:'border-red-500/20', hborder:'hover:border-red-500/40', dot:'bg-red-400' }
                           : alerta.prioridad === 2 ? { bg:'bg-amber-500/[0.04]', border:'border-amber-500/20', hborder:'hover:border-amber-500/35', dot:'bg-amber-400' }
                           : { bg:'bg-blue-500/[0.03]', border:'border-blue-500/15', hborder:'hover:border-blue-500/30', dot:'bg-blue-400' }
              return (
                <div key={i}
                  onClick={() => { setVerAlerta(alerta); marcarLeida(alerta.titulo) }}
                  className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer group ${
                    esLeida ? 'bg-transparent border-white/[0.04] opacity-45'
                    : `${color.bg} ${color.border} ${color.hborder}`
                  }`}>

                  {/* Ícono */}
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${meta?.bg}`}>
                    <Icon size={16} className={meta?.txt}/>
                  </div>

                  {/* Texto */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <span className="font-medium text-[#e8edf2] text-[13px] leading-snug">{alerta.titulo}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {!esLeida && <div className={`w-2 h-2 rounded-full shrink-0 ${color.dot}`}/>}
                        <Badge variant={meta?.color || 'neutral'}>{meta?.label}</Badge>
                      </div>
                    </div>
                    <div className="text-[12px] text-[#9ba8b6]">{alerta.detalle}</div>
                    {alerta.fecha && (
                      <div className="text-[11px] text-[#5f6f80] mt-1">{formatDate(alerta.fecha)}</div>
                    )}
                  </div>

                  {/* Flecha — indica que hay más info */}
                  <div className="opacity-0 group-hover:opacity-100 transition-all shrink-0 mt-1">
                    <Eye size={14} className="text-[#5f6f80]"/>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal detalle alerta */}
      {verAlerta && (
        <ModalDetalleAlerta
          alerta={verAlerta}
          simboloMoneda={simboloMoneda}
          onClose={() => setVerAlerta(null)}
          onMarcarLeida={() => { marcarLeida(verAlerta.titulo); setVerAlerta(null) }}
        />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════
// MODAL DETALLE ALERTA
// ════════════════════════════════════════════════════════
function ModalDetalleAlerta({ alerta, simboloMoneda, onClose, onMarcarLeida }) {
  const meta  = TIPOS[alerta.tipo]
  const Icon  = meta?.icon || Bell

  return (
    <Modal open title="Detalle de Alerta" onClose={onClose} size="sm"
      footer={
        <div className="flex justify-between w-full">
          <Btn variant="ghost" size="sm" onClick={onMarcarLeida}>
            <CheckCheck size={13}/> Marcar leída
          </Btn>
          <Btn variant="secondary" onClick={onClose}>Cerrar</Btn>
        </div>
      }>

      {/* Cabecera tipo */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${meta?.bg} mb-4`}>
        <div className={`w-10 h-10 rounded-xl ${meta?.bg} flex items-center justify-center shrink-0`}>
          <Icon size={20} className={meta?.txt}/>
        </div>
        <div>
          <div className={`text-[11px] font-bold uppercase tracking-[0.06em] ${meta?.txt}`}>{meta?.label}</div>
          <div className="text-[14px] font-semibold text-[#e8edf2] leading-snug">{alerta.titulo}</div>
        </div>
      </div>

      {/* Detalles del producto/OC */}
      <div className="flex flex-col gap-2 mb-4">
        {alerta.sku && (
          <div className="grid grid-cols-2 gap-2">
            {[
              ['SKU',          alerta.sku],
              ['Categoría',    alerta.categoria],
              ['Almacén',      alerta.almacen],
              ['Stock actual', `${alerta.stock} ${alerta.unidad}`],
              alerta.stockMin != null ? ['Stock mínimo', `${alerta.stockMin} ${alerta.unidad}`] : null,
              alerta.stockMax != null && alerta.stockMax > 0 ? ['Stock máximo', `${alerta.stockMax} ${alerta.unidad}`] : null,
            ].filter(Boolean).map(([k, v]) => (
              <div key={k} className="bg-[#1a2230] rounded-lg px-3 py-2.5">
                <div className="text-[10px] text-[#5f6f80] uppercase tracking-wide mb-0.5">{k}</div>
                <div className="text-[12px] font-semibold text-[#e8edf2]">{v}</div>
              </div>
            ))}
          </div>
        )}

        {alerta.fechaVencimiento && (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#1a2230] rounded-lg px-3 py-2.5">
              <div className="text-[10px] text-[#5f6f80] uppercase tracking-wide mb-0.5">Fecha vencimiento</div>
              <div className="text-[12px] font-semibold text-amber-400">{formatDate(alerta.fechaVencimiento)}</div>
            </div>
            <div className="bg-[#1a2230] rounded-lg px-3 py-2.5">
              <div className="text-[10px] text-[#5f6f80] uppercase tracking-wide mb-0.5">Días restantes</div>
              <div className={`text-[12px] font-semibold ${alerta.diasVencimiento < 0 ? 'text-red-400' : 'text-amber-400'}`}>
                {alerta.diasVencimiento < 0
                  ? `Vencido hace ${Math.abs(alerta.diasVencimiento)} días`
                  : `${alerta.diasVencimiento} días`}
              </div>
            </div>
          </div>
        )}

        {alerta.ocNumero && (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#1a2230] rounded-lg px-3 py-2.5">
              <div className="text-[10px] text-[#5f6f80] uppercase tracking-wide mb-0.5">Número OC</div>
              <div className="text-[12px] font-semibold text-[#00c896] font-mono">{alerta.ocNumero}</div>
            </div>
            <div className="bg-[#1a2230] rounded-lg px-3 py-2.5">
              <div className="text-[10px] text-[#5f6f80] uppercase tracking-wide mb-0.5">Total</div>
              <div className="text-[12px] font-semibold text-[#e8edf2]">{formatCurrency(alerta.ocTotal, simboloMoneda)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Descripción completa */}
      <div className="bg-[#1a2230] rounded-xl px-4 py-3 mb-4">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide mb-1.5">Descripción</div>
        <p className="text-[13px] text-[#9ba8b6] leading-relaxed">{alerta.detalle}</p>
      </div>

      {/* Acción recomendada */}
      {alerta.accion && (
        <div className="flex items-center justify-between px-4 py-3 bg-[#00c896]/8 border border-[#00c896]/20 rounded-xl">
          <div>
            <div className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-wide mb-0.5">Acción recomendada</div>
            <div className="text-[13px] font-medium text-[#e8edf2]">{alerta.accion}</div>
          </div>
          <ArrowRight size={16} className="text-[#00c896] shrink-0"/>
        </div>
      )}
    </Modal>
  )
}
