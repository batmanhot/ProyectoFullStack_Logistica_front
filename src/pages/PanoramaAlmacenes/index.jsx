/**
 * Torre de Control de Almacenes — vista de supervisión multi-locación.
 * (nombre visible; el módulo/ruta interna siguen siendo "panorama-almacenes"
 * — cambiarlos habría implicado migrar el permiso ya insertado en producción,
 * sin ninguna ganancia funcional).
 *
 * Pensada para quien NO está en la operación diaria (Propietario / Gerente de
 * Operaciones): un vistazo del estado de cada almacén en sus distintas
 * locaciones — valor de inventario, criticidad de stock, vencimientos y
 * actividad reciente — con desglose de los productos en alerta y salto al
 * detalle. Permiso: 'panorama-almacenes'.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, RefreshCw, MapPin, Boxes, DollarSign, AlertTriangle,
  PackageX, Clock, Activity, ChevronDown, ChevronRight, ArrowRight, Info,
  Truck, Users, TrendingDown, PackageSearch, Workflow, PieChart as PieChartIcon,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts'
import { usePanoramaAlmacenes } from '../../queries/panorama-almacenes.queries'
import { formatCurrency, formatNumber, formatDateTime } from '../../utils/helpers'
import MapaAlmacenes from './MapaAlmacenes'

const SIN_UBIC = 'Sin ubicación asignada'
const TT_STYLE = { background: '#1a2230', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12, color: '#e8edf2' }

function haceCuanto(fecha) {
  if (!fecha) return 'sin actividad'
  const ms = Date.now() - new Date(fecha).getTime()
  if (Number.isNaN(ms)) return '—'
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'hace instantes'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  if (d < 30) return `hace ${d} d`
  return formatDateTime(fecha)
}

function saludAlmacen(a) {
  if (!a.activo) return { color: '#5f6f80', label: 'Inactivo' }
  if (a.agotados > 0) return { color: '#ef4444', label: 'Requiere atención' }
  if (a.criticos > 0 || a.porVencer30d > 0) return { color: '#f59e0b', label: 'En observación' }
  return { color: '#22c55e', label: 'En orden' }
}

function KPI({ label, value, sub, color = 'var(--accent)', icon: Icon }) {
  return (
    <div className="relative bg-[#161d28] border border-white/8 rounded-xl px-4 py-4 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }}/>
      <div className="absolute top-3 right-4 opacity-[0.06]">{Icon && <Icon size={44}/>}</div>
      <div className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.08em] mb-2 flex items-center gap-1.5">
        {Icon && <Icon size={11} style={{ color, opacity: 0.8 }}/>}{label}
      </div>
      {/* tamaño responsivo + break-words: en celular (grid a 2 columnas) un
          valor largo como "S/ 1,384,442.00" a 24px no entraba en la tarjeta
          y el overflow-hidden del contenedor lo recortaba a la mitad. */}
      <div className="text-[17px] sm:text-[19px] md:text-[22px] lg:text-[24px] font-semibold text-[#e8edf2] leading-tight break-words">{value}</div>
      {sub && <div className="text-[10px] text-[#5f6f80] mt-1.5 leading-snug">{sub}</div>}
    </div>
  )
}

/**
 * Donut de salud de inventario de UN almacén — Normal/Crítico/Agotado.
 * Mismos 3 estados y mismos colores que la grilla de KPI de arriba
 * (#22c55e/#f59e0b/#ef4444), solo que acá desglosados por almacén en vez de
 * consolidados. "Normal" = SKUs con stock que NO están en Crítico ni
 * Agotado — no es lo mismo que "tiene mínimo definido y está por encima":
 * un SKU sin mínimo configurado también cae acá (nunca se evalúa como
 * crítico/agotado, ver panoramaAlmacenes() en el backend).
 *
 * "Por vencer" NO es una porción del donut a propósito: es una dimensión
 * distinta (fecha de vencimiento del lote, no nivel de stock) y un SKU
 * puede ser Normal de stock y estar por vencer a la vez — meterlo como
 * cuarta porción haría que la suma ya no fuera el total real de SKUs.
 * Se muestra aparte, como un aviso chico debajo del donut.
 */
function DonutSalud({ almacen }) {
  const nav = useNavigate()
  const normal = Math.max(0, almacen.skus - almacen.criticos - almacen.agotados)
  const total = normal + almacen.criticos + almacen.agotados
  // El filtro "Crítico / Agotado" de Inventario es uno solo (combina ambos
  // estados) — no hay forma de pedir "solo crítico" ahí, así que da igual
  // cuál de los dos números clickeen, el destino es el mismo.
  const irAInventario = () => nav(`/inventario?almacen=${almacen.id}&stock=critico`)
  const irAVencimientos = () => nav(`/vencimientos?almacen=${almacen.id}`)
  const partes = [
    { name: 'Normal',  value: normal,            color: '#22c55e' },
    { name: 'Crítico', value: almacen.criticos,  color: '#f59e0b' },
    { name: 'Agotado', value: almacen.agotados,  color: '#ef4444' },
  ].filter(p => p.value > 0)

  return (
    <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[#1a2230] border border-white/6 w-[150px] shrink-0">
      <span className={`text-[12px] font-medium truncate max-w-full ${almacen.activo === false ? 'text-[#5f6f80] italic' : 'text-[#e8edf2]'}`}>
        {almacen.nombre}{almacen.activo === false ? ' · inactivo' : ''}
      </span>
      <div className="relative w-[104px] h-[104px]">
        {total === 0 ? (
          <div className="w-full h-full rounded-full border-[3px] border-dashed border-white/10 flex items-center justify-center">
            <span className="text-[9.5px] text-[#5f6f80] text-center px-2">Sin SKUs</span>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={partes} dataKey="value" nameKey="name" innerRadius={32} outerRadius={48}
                  paddingAngle={partes.length > 1 ? 3 : 0} stroke="none">
                  {partes.map(p => <Cell key={p.name} fill={p.color}/>)}
                </Pie>
                <Tooltip contentStyle={TT_STYLE} formatter={(v, n) => [`${formatNumber(v, 0)} SKU${v === 1 ? '' : 's'}`, n]}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[15px] font-semibold text-[#e8edf2] leading-none">{formatNumber(total, 0)}</span>
              <span className="text-[8px] text-[#5f6f80] uppercase tracking-wide mt-0.5">SKUs</span>
            </div>
          </>
        )}
      </div>
      <div className="flex flex-col items-center gap-0.5 text-[10.5px] text-[#9ba8b6]">
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0"/>{normal} normal</span>
        {almacen.criticos > 0 && (
          <button onClick={irAInventario} className="flex items-center gap-1 hover:text-[#e8edf2] hover:underline transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] shrink-0"/>{almacen.criticos} crítico{almacen.criticos === 1 ? '' : 's'}
          </button>
        )}
        {almacen.agotados > 0 && (
          <button onClick={irAInventario} className="flex items-center gap-1 hover:text-[#e8edf2] hover:underline transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] shrink-0"/>{almacen.agotados} agotado{almacen.agotados === 1 ? '' : 's'}
          </button>
        )}
      </div>
      {almacen.porVencer30d > 0 && (
        <button onClick={irAVencimientos}
          className="inline-flex items-center gap-1 text-[9.5px] text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-full px-2 py-0.5 hover:bg-amber-500/20 transition-colors">
          <Clock size={9}/> {almacen.porVencer30d} por vencer
        </button>
      )}
    </div>
  )
}

/**
 * Celda de la fila "Pendientes Aprobación" en el detalle de Flujo de
 * Operación — a diferencia de las otras filas (un solo número), acá el
 * total puede venir de DOS pantallas distintas (Despachos en PEDIDO,
 * Pedidos Internos en ENVIADO — ver comentario de `pendientesDespacho` en
 * reportes.service.ts), así que en vez de un número plano se listan por
 * separado, cada uno enlazado a su pantalla real.
 */
function CeldaPendientes({ almacenId, pendientesDespacho, pendientesPedidoInterno }) {
  const nav = useNavigate()
  if (pendientesDespacho === 0 && pendientesPedidoInterno === 0) {
    return <span className="text-[#e8edf2]">0</span>
  }
  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      {pendientesDespacho > 0 && (
        <button onClick={() => nav(`/despachos?almacen=${almacenId}&estado=PEDIDO`)}
          className="text-[#e8edf2] hover:text-[var(--accent)] hover:underline transition-colors">
          {formatNumber(pendientesDespacho, 0)} desp.
        </button>
      )}
      {pendientesPedidoInterno > 0 && (
        <button onClick={() => nav('/pedidos-internos?estado=ENVIADO')}
          className="text-[#e8edf2] hover:text-[var(--accent)] hover:underline transition-colors">
          {formatNumber(pendientesPedidoInterno, 0)} P.I.
        </button>
      )}
    </span>
  )
}

function Chip({ label, value, color = '#9ba8b6', alerta, onClick }) {
  const cls = `flex flex-col gap-0.5 rounded-lg px-2.5 py-2 border text-left w-full ${alerta ? 'border-white/10' : 'border-white/6'} bg-[#141b25] ${onClick ? 'hover:border-white/20 transition-colors cursor-pointer' : ''}`
  const contenido = (
    <>
      <span className="text-[9.5px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">{label}</span>
      <span className="text-[13.5px] font-semibold" style={{ color }}>{value}</span>
    </>
  )
  return onClick
    ? <button onClick={onClick} className={cls}>{contenido}</button>
    : <div className={cls}>{contenido}</div>
}

/** Fila de "Stock por agotarse" — la columna "Almacenes" mostraba solo un
 * conteo ("2"); ahora, si el producto vive en más de un almacén, ese
 * conteo es un desplegable (mismo patrón que TarjetaAlmacen) que abre el
 * disponible EN CADA UNO, sin salir de la tabla ni abrir una tabla aparte
 * por almacén. Con un solo almacén no hay nada que desplegar: se muestra
 * directamente su nombre en vez de un "1" sin información. */
function FilaAgotarse({ p, nav }) {
  const [abierto, setAbierto] = useState(false)
  const col = p.estado === 'agotado' ? '#ef4444' : '#f59e0b'
  const multiAlmacen = (p.porAlmacen?.length ?? 0) > 1

  return (
    <>
      <tr className="border-t border-white/6">
        <td className="py-2 pr-3">
          <button onClick={() => nav(`/inventario?q=${encodeURIComponent(p.sku)}`)}
            className="text-left hover:underline decoration-white/30">
            <span className="text-[#5f6f80] font-mono text-[11px]">{p.sku}</span>{' '}
            <span className="text-[#9ba8b6]">{p.nombre}</span>
          </button>
          {p.reservado > 0 && (
            <span className="text-[10px] text-[#5f6f80]"> · {formatNumber(p.reservado, 0)} reservado</span>
          )}
        </td>
        <td className="py-2 pl-3 text-right tabular-nums font-semibold" style={{ color: col }}>{formatNumber(p.disponible, 0)}</td>
        <td className="py-2 pl-3 text-right tabular-nums text-[#9ba8b6]">{formatNumber(p.minimo, 0)}</td>
        <td className="py-2 pl-3 text-right tabular-nums" style={{ color: col }}>
          {p.cobertura == null ? '—' : `${Math.round(p.cobertura * 100)}%`}
        </td>
        <td className="py-2 pl-3 text-right tabular-nums text-[#9ba8b6]">
          {multiAlmacen ? (
            <button onClick={() => setAbierto(v => !v)}
              className="inline-flex items-center gap-1 hover:text-[#e8edf2] transition-colors">
              {abierto ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
              {p.almacenes}
            </button>
          ) : (
            <span className="truncate max-w-[140px] inline-block align-bottom">{p.porAlmacen?.[0]?.almacenNombre ?? p.almacenes}</span>
          )}
        </td>
      </tr>
      {multiAlmacen && abierto && (
        <tr className="bg-white/[0.02]">
          <td colSpan={5} className="py-2 px-3">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {p.porAlmacen.map(a => (
                <span key={a.almacenId}
                  className={`text-[11px] flex items-center gap-1.5 ${a.activo === false ? 'text-[#5f6f80] italic' : 'text-[#9ba8b6]'}`}>
                  <span className="truncate max-w-[140px]">{a.almacenNombre}{a.activo === false ? ' · inactivo' : ''}</span>
                  <span className="font-semibold tabular-nums shrink-0" style={{ color: a.disponible <= 0 ? '#ef4444' : '#e8edf2' }}>
                    {formatNumber(a.disponible, 0)}
                  </span>
                </span>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function Panel({ title, icon: Icon, subtitle, children }) {
  return (
    <div className="bg-[#161d28] border border-white/8 rounded-xl p-4 flex flex-col gap-3 h-full">
      <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] flex items-center gap-1.5">
        {Icon && <Icon size={12}/>} {title}
        {subtitle && <span className="text-[#5f6f80] font-normal normal-case">· {subtitle}</span>}
      </span>
      {children}
    </div>
  )
}

/** Una sola tabla (un solo encabezado) para "Clientes más atendidos" y
 * "Productos con más salida" — separada y totalizada POR ALMACÉN adentro,
 * con una fila de sección (nombre del almacén) y una fila de total por cada
 * uno, en vez de una tabla completa suelta por almacén. `totalDe(item)` ya
 * viene calculado de TODOS los clientes/productos de ese almacén, no solo
 * los que se listan en `item.filas`. */
function PanelPorAlmacen({ title, icon, items, columnas, vacio, totalDe, nota }) {
  return (
    <Panel title={title} icon={icon}>
      {nota && <p className="text-[11px] text-[#5f6f80] -mt-1">{nota}</p>}
      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-[9.5px] uppercase text-[#5f6f80]">
            {columnas.map((col, i) => (
              <th key={col.header} className={`pb-1.5 font-semibold ${i === 0 ? 'text-left' : 'text-right'}`}>{col.header}</th>
            ))}
          </tr>
        </thead>
        {items.map((item, gi) => (
          <tbody key={item.almacenId}>
            <tr>
              <td colSpan={columnas.length} className={gi === 0 ? 'pb-1' : 'pt-3 pb-1'}>
                <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#e8edf2] truncate">
                  <Building2 size={12} style={{ color: 'var(--accent)' }} className="shrink-0"/>
                  <span className="truncate">{item.almacenNombre}</span>
                </div>
              </td>
            </tr>
            {item.filas.length === 0 ? (
              <tr><td colSpan={columnas.length} className="text-[12px] text-[#5f6f80] py-2 text-center">{vacio}</td></tr>
            ) : (
              <>
                {item.filas.map((f, i) => (
                  <tr key={f.id} className="border-t border-white/6">
                    {columnas.map((col, ci) => (
                      <td key={col.header} className={`py-1.5 ${ci === 0 ? 'pr-2' : 'text-right tabular-nums'} ${ci === 0 ? 'text-[#9ba8b6]' : ci === columnas.length - 1 ? 'text-[#9ba8b6]' : 'text-[#e8edf2] font-medium'}`}>
                        {ci === 0 ? <span className="truncate block max-w-[170px]">{i + 1}. {col.render(f)}</span> : col.render(f)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t border-white/10">
                  <td className="pt-1.5 pb-1 text-[10.5px] font-semibold text-[#5f6f80] uppercase">Total</td>
                  {totalDe(item).map((t, i, arr) => (
                    <td key={i} className="pt-1.5 pb-1 text-right tabular-nums text-[13px] font-semibold"
                      style={i === arr.length - 1 ? { color: 'var(--accent)' } : { color: '#e8edf2' }}>
                      {t}
                    </td>
                  ))}
                </tr>
              </>
            )}
          </tbody>
        ))}
      </table>
    </Panel>
  )
}

function TarjetaAlmacen({ a, onAbrir }) {
  const nav = useNavigate()
  const [abierto, setAbierto] = useState(false)
  const salud = saludAlmacen(a)
  const ubic = [a.ciudad, a.region].filter(Boolean).join(', ') || a.direccion || SIN_UBIC
  const enAlerta = a.productosCriticos?.length > 0
  const irAInventario = () => nav(`/inventario?almacen=${a.id}&stock=critico`)

  return (
    <div className="bg-[#1a2230] border border-white/6 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-dim)' }}>
            <Building2 size={16} style={{ color: 'var(--accent)' }}/>
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-[#e8edf2] text-[14.5px] truncate">{a.nombre}</div>
            <div className="text-[12px] text-[#5f6f80] flex items-center gap-1 mt-0.5">
              <MapPin size={11} className="shrink-0"/>
              <span className="truncate">{ubic}</span>
            </div>
            {a.responsable && (
              <div className="text-[11px] text-[#5f6f80] mt-0.5 truncate">Responsable: {a.responsable}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0" title={salud.label}>
          <span className="w-2 h-2 rounded-full" style={{ background: salud.color }}/>
          <span className="text-[10px] font-medium" style={{ color: salud.color }}>{salud.label}</span>
        </div>
      </div>

      {/* Críticos/Agotados/Por vencer YA se ven arriba, en el donut de
          "Salud de inventario por almacén" — repetirlos acá como 3 chips
          más era la redundancia que señaló el usuario. Se quedan solo los
          3 datos que esta tarjeta es la ÚNICA en mostrar (valor, SKUs,
          unidades); la alerta de stock vive más abajo, fusionada con el
          desplegable de detalle en vez de duplicada en un chip aparte. */}
      <div className="grid grid-cols-3 gap-2">
        <Chip label="Valor stock"  value={formatCurrency(a.valorInventario)} color="#e8edf2"/>
        <Chip label="SKUs"         value={formatNumber(a.skus, 0)} color="#e8edf2"/>
        <Chip label="Unidades"     value={formatNumber(a.unidades, 0)} color="#e8edf2"/>
      </div>

      <div className="flex items-center justify-between text-[11px] text-[#5f6f80] border-t border-white/6 pt-2">
        <span className="flex items-center gap-1"><Truck size={11}/> Despachado (3m)</span>
        <span className="text-[#9ba8b6] font-medium">{formatCurrency(a.despachado3m)}</span>
      </div>
      <div className="flex items-center justify-between text-[11px] text-[#5f6f80]">
        <span className="flex items-center gap-1"><Activity size={11}/> {formatNumber(a.movimientos7d, 0)} mov. (7d)</span>
        <span className="flex items-center gap-1"><Clock size={11}/> {haceCuanto(a.ultimaActividad)}</span>
      </div>

      {(enAlerta || a.porVencer30d > 0) && (
        <div className="border-t border-white/6 pt-2 flex flex-col gap-1.5">
          {enAlerta && (
            <div className="flex items-center justify-between gap-2">
              {/* El conteo sale de a.agotados/a.criticos (los totales reales
                  del almacén) — antes decía "N productos en alerta" con
                  `productosCriticos.length`, que el backend recorta a 5
                  (ver panoramaAlmacenes()), así que con más de 5 alertas
                  mostraba un número menor al real. */}
              <button onClick={() => setAbierto(v => !v)}
                className="flex items-center gap-1.5 text-[11.5px] font-medium hover:text-[#e8edf2] transition-colors">
                {abierto ? <ChevronDown size={13} className="text-[#9ba8b6]"/> : <ChevronRight size={13} className="text-[#9ba8b6]"/>}
                {a.agotados > 0 && <span style={{ color: '#ef4444' }}>{a.agotados} agotado{a.agotados === 1 ? '' : 's'}</span>}
                {a.agotados > 0 && a.criticos > 0 && <span className="text-[#5f6f80]">·</span>}
                {a.criticos > 0 && <span style={{ color: '#f59e0b' }}>{a.criticos} crítico{a.criticos === 1 ? '' : 's'}</span>}
              </button>
              <button onClick={irAInventario} title="Ver en Inventario" className="text-[#5f6f80] hover:text-[var(--accent)] transition-colors shrink-0">
                <ArrowRight size={13}/>
              </button>
            </div>
          )}
          {a.porVencer30d > 0 && (
            <button onClick={() => nav(`/vencimientos?almacen=${a.id}`)}
              className="inline-flex items-center gap-1 self-start text-[10.5px] text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-full px-2 py-0.5 hover:bg-amber-500/20 transition-colors">
              <Clock size={9}/> {a.porVencer30d} por vencer
            </button>
          )}
          {enAlerta && abierto && (
            <ul className="mt-2 flex flex-col gap-1">
              {a.productosCriticos.map(p => (
                <li key={p.sku}>
                  <button onClick={() => nav(`/inventario?q=${encodeURIComponent(p.sku)}`)}
                    className="flex items-center justify-between text-[11.5px] gap-2 w-full text-left hover:bg-white/5 rounded px-1 -mx-1 py-0.5 transition-colors">
                    <span className="text-[#9ba8b6] truncate">
                      <span className="text-[#5f6f80] font-mono">{p.sku}</span> · {p.nombre}
                    </span>
                    <span className="shrink-0 font-medium" style={{ color: p.estado === 'agotado' ? '#ef4444' : '#f59e0b' }}>
                      {formatNumber(p.cantidad, 0)} / min {formatNumber(p.stockMinimo, 0)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button onClick={onAbrir}
        className="mt-auto flex items-center justify-center gap-1.5 text-[12px] font-medium text-[var(--accent)] hover:text-[var(--accent-dark)] transition-colors pt-1">
        Abrir inventario <ArrowRight size={13}/>
      </button>
    </div>
  )
}

/** Franja "estado de la operación" al tope de la torre de control — un
 * vistazo narrativo antes de entrar a los KPI/tablas. Inspirado en el patrón
 * de "pulso operativo" de los benchmarks de Control Tower (xxxcontrol-tower),
 * pero con datos reales: cuenta almacenes activos que tienen algún crítico,
 * agotado o vencimiento próximo (mismo criterio que `saludAlmacen`). */
function PulsoOperativo({ consolidado, almacenes }) {
  const activos = almacenes.filter(a => a.activo)
  const enAlerta = activos.filter(a => a.agotados > 0 || a.criticos > 0 || a.porVencer30d > 0)
  const estable = enAlerta.length === 0

  return (
    <div className="rounded-2xl border border-white/8 overflow-hidden shrink-0" style={{ background: 'linear-gradient(135deg, #161d28, #0e1117)' }}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--accent)' }}>Pulso operativo</span>
          <p className="text-[15px] font-semibold text-[#e8edf2] mt-1.5 leading-snug">
            {estable
              ? 'Todos los almacenes están en orden — sin críticos, agotados ni vencimientos próximos.'
              : `La operación está estable, con ${enAlerta.length} almacén${enAlerta.length === 1 ? '' : 'es'} que requiere${enAlerta.length === 1 ? '' : 'n'} atención.`}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-semibold bg-white/5 text-[#9ba8b6] shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse"/> En vivo
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 border-t border-white/6">
        <div className="px-5 py-3.5 sm:border-r border-white/6">
          <div className="text-[10px] text-[#5f6f80] uppercase tracking-[0.06em]">Almacenes activos</div>
          <div className="text-[20px] font-semibold text-[#e8edf2] mt-0.5">{formatNumber(consolidado.almacenesActivos, 0)}</div>
        </div>
        <div className="px-5 py-3.5 sm:border-r border-white/6">
          <div className="text-[10px] text-[#5f6f80] uppercase tracking-[0.06em]">Requieren atención</div>
          <div className="text-[20px] font-semibold mt-0.5" style={{ color: enAlerta.length ? '#f59e0b' : '#e8edf2' }}>{formatNumber(enAlerta.length, 0)}</div>
        </div>
        <div className="px-5 py-3.5">
          <div className="text-[10px] text-[#5f6f80] uppercase tracking-[0.06em]">Despachado (3m)</div>
          <div className="text-[20px] font-semibold text-[#e8edf2] mt-0.5">{formatCurrency(consolidado.despachado3m)}</div>
        </div>
      </div>
    </div>
  )
}

export default function PanoramaAlmacenes() {
  const nav = useNavigate()
  const { data, isLoading, isError, refetch, isFetching } = usePanoramaAlmacenes()

  const grupos = useMemo(() => {
    const alms = data?.almacenes ?? []
    const map = new Map()
    for (const a of alms) {
      const clave = a.ciudad?.trim() || SIN_UBIC
      if (!map.has(clave)) map.set(clave, [])
      map.get(clave).push(a)
    }
    // Locaciones con nombre primero (alfabético), "Sin ubicación" al final.
    return [...map.entries()].sort(([x], [y]) => {
      if (x === SIN_UBIC) return 1
      if (y === SIN_UBIC) return -1
      return x.localeCompare(y)
    })
  }, [data])

  const c = data?.consolidado
  const despMax = Math.max(1, ...((data?.despachosPorAlmacen ?? []).map(a => a.valor)))
  // Rango de meses que cubren los totales de "Continuidad del negocio" —
  // despachosMensuales ya viene en orden cronológico (más antiguo primero).
  // Sin esto, tarjetas como "Flujo de operación" (que NO tienen el mes en
  // su propio eje X, a diferencia de "Despachos valorizados") no dejan
  // claro a qué meses pertenece el total que están sumando.
  const mesesLbls = data?.despachosMensuales?.map(m => m.mes) ?? []
  const rangoMeses = mesesLbls.length > 1 ? `${mesesLbls[0]} – ${mesesLbls[mesesLbls.length - 1]}`
    : mesesLbls.length === 1 ? mesesLbls[0] : null

  // "Flujo de operación" compara Recepción/Picking/Despacho/Pendientes
  // Aprobación EN EL EJE X, con un color por almacén (al revés del panel
  // de arriba) — trasponemos `flujoOperativoPorAlmacen` (una fila por
  // almacén) a una fila por proceso, porque así es como recharts espera
  // los datos para agrupar barras por color de almacén dentro de cada
  // categoría de proceso.
  const flujoAlmacenes = useMemo(() => data?.flujoOperativoPorAlmacen ?? [], [data])
  const PALETA_ALMACEN = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4']
  const flujoProcesos = useMemo(() => {
    if (flujoAlmacenes.length === 0) return []
    const fila = (proceso, key, conUnidades) => {
      const row = { proceso }
      for (const a of flujoAlmacenes) {
        row[a.nombre] = a[key]
        if (conUnidades) row[`${a.nombre}__und`] = a.recepcionUnidades
      }
      return row
    }
    return [
      fila('Recepción', 'recepcion', true),
      fila('Picking', 'picking'),
      fila('Despacho', 'despacho'),
      // Flujo PARALELO a Despacho: sale del mismo almacén en el mismo mes,
      // pero a un área interna en vez de a un cliente — por eso va justo al
      // lado, no mezclado en la misma barra (son universos distintos).
      fila('Pedidos Internos', 'pedidosInternos'),
      fila('Pendientes Aprobación', 'pendientesAprobacion'),
    ]
  }, [flujoAlmacenes])

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[12px] text-[#5f6f80]">
          Estado de supervisión de cada locación — inventario, criticidad y actividad reciente.
        </p>
        <button onClick={() => refetch()} disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e2835] border border-white/8 text-[12px] text-[#9ba8b6] hover:text-[#e8edf2] hover:border-white/16 transition-colors disabled:opacity-50">
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''}/> Actualizar
        </button>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-[#5f6f80] text-[13px]">Cargando panorama…</div>
      )}

      {isError && (
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-8 text-center text-[#5f6f80] text-[13px]">
          No se pudo cargar el panorama. Verifica la conexión con el servidor.
        </div>
      )}

      {c && (
        <>
          <PulsoOperativo consolidado={c} almacenes={data.almacenes ?? []}/>

          {/* "Almacenes" ya se muestra en el Pulso Operativo de arriba
              ("Almacenes activos") — repetirlo acá era la tarjeta duplicada
              que señaló el usuario. Esta grilla se queda con las 5 que solo
              ella muestra (salud de inventario), en vez de con el conteo de
              locaciones. */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <KPI label="Valor de inventario" value={formatCurrency(c.valorInventario)} sub="Costo de compra" color="#22c55e" icon={DollarSign}/>
            <KPI label="SKUs con stock" value={formatNumber(c.skus, 0)} sub={`${formatNumber(c.unidades, 0)} unidades`} color="var(--accent)" icon={Boxes}/>
            <KPI label="Stock crítico" value={formatNumber(c.criticos, 0)} sub="Bajo el mínimo" color="#f59e0b" icon={AlertTriangle}/>
            <KPI label="Agotados"     value={formatNumber(c.agotados, 0)} sub="Con mínimo definido" color="#ef4444" icon={PackageX}/>
            <KPI label="Por vencer"   value={formatNumber(c.porVencer30d, 0)} sub="Lote ≤ 30 días" color="#f59e0b" icon={Clock}/>
          </div>

          {c.sinUbicacion > 0 && (
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3 text-[12px] text-amber-300">
              <Info size={14} className="shrink-0 mt-0.5"/>
              <span>
                {c.sinUbicacion} almacén{c.sinUbicacion === 1 ? '' : 'es'} sin ubicación asignada.
                Complétala en <button className="underline hover:text-amber-200" onClick={() => nav('/maestros')}>Categorías y Almacenes</button> para agruparlos por locación.
              </span>
            </div>
          )}

          {/* Despachos Valorizados + Salud de Inventario, lado a lado — antes
              cada uno era una franja a todo el ancho de la pantalla (poco
              eficiente: con pocos almacenes, Salud dejaba metad de la fila
              vacía). Despachos Valorizados sale del bloque "Continuidad del
              negocio" para poder emparejarse acá; no pierde su rango de
              fechas, lo sigue mostrando en su propio subtítulo (`rangoMeses`).
              CSS Grid, no flexbox — mismo patrón que Clientes/Productos más
              abajo: un `flex-wrap` + `items-stretch` + `h-full` colapsaba a
              alto 0 en una sola columna (celular) y el contenido quedaba
              superpuesto con lo de abajo; Grid no tiene ese problema. */}
          {(data.almacenes?.length > 0 || data.despachosMensuales?.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.despachosMensuales?.length > 0 && (
                <Panel title="Despachos valorizados" icon={Truck} subtitle={rangoMeses}>
                  {/* flex-1 acá (y en el gráfico de abajo) para que la tarjeta
                      aproveche el alto extra que gana al emparejarse con
                      "Salud de Inventario" (que suele ser más alta) — antes
                      el gráfico tenía 120px fijos y dejaba un vacío grande
                      abajo cuando la tarjeta vecina era más alta. */}
                  <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,200px)_1fr] gap-4 flex-1">
                    <div className="flex flex-col gap-2">
                      <div>
                        <div className="text-[24px] font-semibold text-[#e8edf2] leading-none">{formatCurrency(c.despachado3m)}</div>
                        <div className="text-[10px] text-[#5f6f80] mt-1">Total · 3 meses (sin anulados)</div>
                      </div>
                      <div className="flex-1 min-h-[120px] -ml-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data.despachosMensuales} margin={{ top: 6, right: 6, bottom: 0, left: 6 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false}/>
                            <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#5f6f80' }} axisLine={false} tickLine={false}/>
                            <YAxis hide/>
                            <Tooltip contentStyle={TT_STYLE} cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                              formatter={(v, _n, p) => [formatCurrency(v), `${p.payload.despachos} despacho${p.payload.despachos === 1 ? '' : 's'}`]}/>
                            <Bar dataKey="valor" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={54}/>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 xl:border-l xl:border-white/6 xl:pl-4">
                      <span className="text-[9.5px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
                        Por almacén de salida
                      </span>
                      {/* flex-1 + justify-center: con pocos almacenes la
                          lista es corta — mejor centrada en el espacio
                          disponible que pegada arriba con vacío abajo. */}
                      <div className="flex-1 flex flex-col justify-center">
                        {data.despachosPorAlmacen?.length ? (
                          <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1">
                            {data.despachosPorAlmacen.map(a => {
                              const pct = despMax > 0 ? (a.valor / despMax) * 100 : 0
                              return (
                                <div key={a.id}>
                                  <div className="flex items-center justify-between text-[11.5px] gap-2 mb-1">
                                    <span className={`truncate ${a.activo === false ? 'text-[#5f6f80] italic' : 'text-[#9ba8b6]'}`}>
                                      {a.nombre}{a.activo === false ? ' · inactivo' : ''}
                                    </span>
                                    <span className="shrink-0">
                                      <span className="text-[#e8edf2] font-medium">{formatCurrency(a.valor)}</span>
                                      <span className="text-[#5f6f80]"> · {a.despachos} desp.</span>
                                    </span>
                                  </div>
                                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                                    <div className="h-full rounded-full"
                                      style={{ width: `${a.valor > 0 ? Math.max(pct, 3) : 0}%`, background: 'var(--accent)' }}/>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="text-[12px] text-[#5f6f80] py-3">Sin despachos en el período</div>
                        )}
                      </div>
                    </div>
                  </div>
                </Panel>
              )}

              {data.almacenes?.length > 0 && (
                <Panel title="Salud de inventario por almacén" icon={PieChartIcon}>
                  <p className="text-[11px] text-[#5f6f80] -mt-1 mb-1">
                    Cuántos SKUs de cada almacén están Normal, Crítico o Agotado ahora mismo (no depende del período,
                    es una foto actual). <strong className="text-[#9ba8b6] font-medium">Por vencer</strong> se muestra aparte,
                    no como porción del donut: un SKU puede estar Normal de stock y por vencer a la vez.
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                    {data.almacenes.map(a => <DonutSalud key={a.id} almacen={a}/>)}
                  </div>
                </Panel>
              )}
            </div>
          )}

          {(flujoProcesos.length > 0 || data.topClientesPorAlmacen?.length > 0 || data.topProductosPorAlmacen?.length > 0 || data.porAgotarse?.length > 0) && (
            <div className="flex flex-col gap-3">
              <div className="text-[12px] font-semibold text-[#9ba8b6] uppercase tracking-[0.06em] flex items-center gap-2">
                <Activity size={13} className="text-[var(--accent)]"/> Continuidad del negocio
                <span className="text-[#5f6f80] font-normal normal-case">· últimos 3 meses</span>
              </div>

              {flujoProcesos.length > 0 && (
                <Panel title="Flujo de operación" icon={Workflow} subtitle={data.flujoOperativoMes}>
                  <p className="text-[11px] text-[#5f6f80] -mt-1 mb-1">
                    Recepción, Picking, Despacho y Pedidos Internos del mes en curso, comparados entre almacenes
                    (número de documentos: movimientos de entrada, listas de picking cerradas, despachos no anulados
                    y pedidos internos entregados — no las unidades físicas recibidas, que quedan en el tooltip de
                    Recepción). <strong className="text-[#9ba8b6] font-medium">Pedidos Internos</strong> es un flujo de
                    salida paralelo a Despacho: mismo almacén, mismo mes, pero hacia un área interna en vez de un
                    cliente. <strong className="text-[#9ba8b6] font-medium">Pendientes Aprobación</strong> es distinto a
                    las demás: no es del mes, es la foto de ahora mismo (despachos y pedidos internos esperando
                    aprobación).
                  </p>
                  {data.consumoInternoMes > 0 && (
                    <div className="flex items-center gap-1.5 text-[11.5px] -mt-0.5 mb-1">
                      <PackageSearch size={12} className="text-[#5f6f80]"/>
                      <span className="text-[#5f6f80]">Consumo interno del mes (a costo, no es ingreso):</span>
                      <span className="font-semibold text-[#9ba8b6]">{formatCurrency(data.consumoInternoMes)}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-[minmax(0,300px)_1fr] gap-4">
                    <div className="h-[200px] -ml-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={flujoProcesos} margin={{ top: 6, right: 6, bottom: 0, left: 6 }} barCategoryGap="20%" barGap={2}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false}/>
                          <XAxis dataKey="proceso" tick={{ fontSize: 9.5, fill: '#5f6f80' }} axisLine={false} tickLine={false}
                            interval={0} tickFormatter={v => v.length > 10 ? v.slice(0, 9) + '…' : v}/>
                          <YAxis tick={{ fontSize: 10, fill: '#5f6f80' }} axisLine={false} tickLine={false} allowDecimals={false} width={24}/>
                          <Tooltip contentStyle={TT_STYLE} cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                            formatter={(v, name, p) => {
                              const und = p.payload[`${name}__und`]
                              return und != null ? [`${formatNumber(v, 0)} (${formatNumber(und, 0)} und.)`, name] : [formatNumber(v, 0), name]
                            }}/>
                          {flujoAlmacenes.map((a, i) => (
                            <Bar key={a.id} dataKey={a.nombre} name={a.nombre}
                              fill={PALETA_ALMACEN[i % PALETA_ALMACEN.length]} radius={[3, 3, 0, 0]} maxBarSize={16}/>
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex flex-col gap-2 md:border-l md:border-white/6 md:pl-4">
                      <span className="text-[9.5px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
                        Detalle por almacén
                      </span>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[11.5px]">
                          <thead>
                            <tr>
                              <th className="text-left pb-1.5 font-semibold text-[9.5px] uppercase text-[#5f6f80]">Proceso</th>
                              {flujoAlmacenes.map((a, i) => (
                                <th key={a.id} className="text-right pb-1.5 pl-3 font-semibold text-[9.5px] uppercase text-[#5f6f80]">
                                  <span className="inline-flex items-center gap-1.5 justify-end">
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PALETA_ALMACEN[i % PALETA_ALMACEN.length] }}/>
                                    {a.nombre.replace(/^Almac[eé]n\s*/i, '')}
                                  </span>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {flujoProcesos.map(row => (
                              <tr key={row.proceso} className="border-t border-white/5">
                                <td className="py-1.5 text-[#9ba8b6]">{row.proceso}</td>
                                {flujoAlmacenes.map(a => (
                                  <td key={a.id} className="py-1.5 pl-3 text-right font-mono tabular-nums">
                                    {row.proceso === 'Pendientes Aprobación'
                                      ? <CeldaPendientes almacenId={a.id} pendientesDespacho={a.pendientesDespacho} pendientesPedidoInterno={a.pendientesPedidoInterno}/>
                                      : <span className="text-[#e8edf2]">{formatNumber(row[a.nombre], 0)}</span>}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </Panel>
              )}

              {/* Clientes / Productos / Stock por agotarse, lado a lado en
                  desktop — antes cada una era una franja completa, "Stock
                  por agotarse" incluso suelta fuera de esta sección. Sin
                  `h-full`/stretch a propósito: a diferencia de Salud+Despachos
                  (donde SÍ igualamos altura), acá el contenido es muy
                  desparejo (Stock trae hasta 12 filas, Clientes/Productos
                  hasta 5 por almacén) — forzar la misma altura recrearía el
                  vacío que ya corregimos ahí. `items-start` mantiene cada
                  una a su alto natural. */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 items-start">
                {data.topClientesPorAlmacen?.length > 0 && (
                  <PanelPorAlmacen title="Clientes más atendidos" icon={Users}
                    items={data.topClientesPorAlmacen}
                    vacio="Sin despachos en el período"
                    columnas={[
                      { header: 'Cliente', render: f => f.nombre },
                      { header: 'Ped.', render: f => f.pedidos },
                      { header: 'Valor', render: f => formatCurrency(f.valor) },
                    ]}
                    totalDe={item => [item.totalPedidos, formatCurrency(item.totalValor)]}/>
                )}

                {data.topProductosPorAlmacen?.length > 0 && (
                  <PanelPorAlmacen title="Productos con más salida" icon={PackageSearch}
                    items={data.topProductosPorAlmacen}
                    vacio="Sin salidas en el período"
                    nota="Valor de venta (subtotal de cada línea de despacho) + IGV 18% — mismo criterio que Despachos valorizados, por eso cuadran entre sí."
                    columnas={[
                      { header: 'Producto', render: f => <>{f.nombre} <span className="text-[#5f6f80] font-mono text-[10.5px]">{f.sku}</span></> },
                      { header: 'Unid.', render: f => formatNumber(f.unidades, 0) },
                      { header: 'Valor', render: f => formatCurrency(f.valor) },
                    ]}
                    totalDe={item => [formatNumber(item.totalUnidades, 0), formatCurrency(item.totalValor)]}/>
                )}

                {data.porAgotarse?.length > 0 && (
                  <Panel title="Stock por agotarse" icon={TrendingDown}>
                    <p className="text-[11.5px] text-[#5f6f80] -mt-1">
                      Disponible = stock físico − reservado, foto actual (no depende del período).
                      Ordenado por cobertura contra el mínimo.
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[12px] min-w-[420px]">
                        <thead>
                          <tr className="text-[10px] uppercase text-[#5f6f80]">
                            <th className="pb-2 font-semibold text-left">Producto</th>
                            <th className="pb-2 pl-3 font-semibold text-right">Disponible</th>
                            <th className="pb-2 pl-3 font-semibold text-right">Mínimo</th>
                            <th className="pb-2 pl-3 font-semibold text-right">Cobertura</th>
                            <th className="pb-2 pl-3 font-semibold text-right">Almacenes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.porAgotarse.map(p => <FilaAgotarse key={p.id} p={p} nav={nav}/>)}
                        </tbody>
                      </table>
                    </div>
                  </Panel>
                )}
              </div>
            </div>
          )}

          {grupos.length === 0 && (
            <div className="bg-[#161d28] border border-white/8 rounded-xl p-8 text-center text-[#5f6f80] text-[13px]">
              No hay almacenes registrados todavía.
            </div>
          )}

          {/* El mapa se pasó a vivir acá, justo arriba de "Por locación" —
              antes quedaba después de "Continuidad del negocio" (una
              sección de 3 meses a la que no pertenece) y separado de las
              tarjetas de locación por "Stock por agotarse" en el medio,
              aunque mapa + tarjetas responden la misma pregunta: "¿dónde
              están mis almacenes y cómo están?". */}
          {grupos.length > 0 && (
            <>
              {data.almacenes?.length > 0 && (
                <Panel title="Ubicación de almacenes" icon={MapPin}>
                  <MapaAlmacenes almacenes={data.almacenes} onAbrir={() => nav('/inventario')}/>
                </Panel>
              )}

              <div className="text-[12px] font-semibold text-[#9ba8b6] uppercase tracking-[0.06em] flex items-center gap-2 pt-1">
                <Building2 size={13} className="text-[var(--accent)]"/> Por locación
              </div>
            </>
          )}

          {/* Cada locación es una columna que fluye horizontalmente junto a
              las demás (antes cada una era un bloque a todo el ancho, así
              que con 1 almacén por ciudad — el caso más común — se veían
              apiladas verticalmente sin aprovechar el ancho disponible). La
              grilla INTERNA de cada columna sigue existiendo para cuando una
              misma locación tenga varios almacenes. */}
          <div className="flex flex-wrap gap-4">
            {grupos.map(([ciudad, alms]) => (
              <div key={ciudad} className="flex flex-col gap-3 w-full sm:flex-1 sm:w-auto sm:min-w-[360px] sm:basis-[360px]">
                <div className="flex items-center gap-2 text-[12px] font-semibold text-[#9ba8b6] uppercase tracking-[0.06em]">
                  <MapPin size={13} className={ciudad === SIN_UBIC ? 'text-[#5f6f80]' : 'text-[var(--accent)]'}/>
                  {ciudad}
                  <span className="text-[#5f6f80] font-normal normal-case">· {alms.length} almacén{alms.length === 1 ? '' : 'es'}</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {alms.map(a => (
                    <TarjetaAlmacen key={a.id} a={a} onAbrir={() => nav('/inventario')}/>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {data.generadoEn && (
            <div className="text-[11px] text-[#5f6f80] text-right">
              Generado {haceCuanto(data.generadoEn)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
