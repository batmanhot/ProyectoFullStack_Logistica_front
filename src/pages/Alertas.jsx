import { useMemo, useState } from 'react'
import {
  Bell, BellRing, CheckCheck, CheckCircle, Eye, ArrowRight, RotateCcw
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatDate, formatDateTime, formatCurrency, vencimientoMasUrgentePorProducto } from '../utils/helpers'
import {
  TIPOS, TIPOS_CHOFER, TIPOS_EJECUTIVO_COMERCIAL, TIPOS_COORDINADOR_TRANSPORTE, TIPOS_CONTABLE,
  generarAlertas, generarAlertasChofer, generarAlertasEjecutivoComercial,
  generarAlertasCoordinadorTransporte, generarAlertasContable, claveAtencion,
} from '../utils/alertas'
import { Badge, Btn, Modal, Textarea } from '../components/ui/index'
import { useAtencionesAlerta, useMarcarAtendida, useReabrirAlerta } from '../queries/atenciones-alerta.queries'
import { useApp } from '../store/AppContext'
import { useConfiguracion } from '../queries/configuracion.queries'
import { useProductosList } from '../queries/productos.queries'
import { useOrdenesCompraList } from '../queries/ordenes-compra.queries'
import { useCategoriasList } from '../queries/categorias.queries'
import { useAlmacenesList } from '../queries/almacenes.queries'
import { useLotesList } from '../queries/lotes.queries'
import { useRutasList } from '../queries/rutas.queries'
import { useCxCList } from '../queries/cuentas-por-cobrar.queries'
import { useProformasList } from '../queries/proformas.queries'
import { useOportunidadesList } from '../queries/oportunidades.queries'
import { usePedidosPortalList } from '../queries/pedidos-portal.queries'
import { useFlotaAlertas } from '../queries/flota.queries'
import { useSunatDocumentos } from '../queries/sunat.queries'
import { useCotizacionesList } from '../queries/cotizaciones.queries'
import { useDespachosList } from '../queries/despachos.queries'
import { usePedidosInternosList } from '../queries/pedidos-internos.queries'
import { useReglasAprobacion } from '../queries/aprobaciones.queries'

// ════════════════════════════════════════════════════════
export default function Alertas() {
  const { sesion, tienePermiso } = useApp()
  const rolCodigo = sesion?.rol?.codigo
  const esComodin = sesion?.rol?.permisos?.includes('*') ?? false
  const esChofer = rolCodigo === 'chofer'
  const esEjecutivoComercial = rolCodigo === 'ejecutivo-comercial'
  const esCoordinadorTransporte = rolCodigo === 'coordinador-transporte'
  const esContable = rolCodigo === 'contable-finanzas'
  // Analista de Compras y Gerente de Operaciones usan el generador genérico
  // (tienen inventario/ordenes/categorias/almacenes), pero les falta el tipo
  // "RFQ sin respuesta" — se les suma como parámetro opcional, no ameritan
  // un generador propio como los 4 roles de arriba (ver utils/alertas.js).
  const esRolConCotizaciones = rolCodigo === 'analista-compras' || rolCodigo === 'gerente-operaciones'
  const esRolEspecial = esChofer || esEjecutivoComercial || esCoordinadorTransporte || esContable

  // Cada rol de la lista de abajo tiene un hueco real de permisos contra el
  // generador genérico de inventario (Chofer: sin inventario/OC/almacenes;
  // Ejecutivo Comercial: sin ordenes/categorias/lotes-series; Coordinador de
  // Transporte y Contable/Finanzas: sin NINGUNO de los permisos que el
  // genérico necesita) — esas consultas les devuelven 403 (lista vacía) y
  // generarAlertas() nunca encontraría nada real. Cada uno usa su propio
  // generador en vez del de inventario (ver utils/alertas.js).
  const { data: productos  = [] } = useProductosList({ enabled: !esRolEspecial })
  const { data: ordenes    = [] } = useOrdenesCompraList({ enabled: !esRolEspecial })
  const { data: categorias = [] } = useCategoriasList({ enabled: !esRolEspecial })
  const { data: almacenes  = [] } = useAlmacenesList({ enabled: !esRolEspecial })
  const { data: lotes      = [] } = useLotesList(undefined, { enabled: !esRolEspecial })
  const { data: rutasRaw   = [] } = useRutasList({ enabled: esChofer || esCoordinadorTransporte })
  const { data: cxc            = [] } = useCxCList({ enabled: esEjecutivoComercial || esContable })
  const { data: proformas      = [] } = useProformasList({ enabled: esEjecutivoComercial })
  const { data: oportunidades  = [] } = useOportunidadesList({ enabled: esEjecutivoComercial })
  const { data: pedidosPortal  = [] } = usePedidosPortalList({ enabled: esEjecutivoComercial })
  const { data: flotaAlertas   = [] } = useFlotaAlertas({ enabled: esCoordinadorTransporte })
  const { data: guias          = [] } = useSunatDocumentos({ enabled: esContable })
  const { data: cotizaciones   = [] } = useCotizacionesList({ enabled: esRolConCotizaciones })
  // "Pendiente de aprobación" (Despachos/Pedidos Internos) — solo tiene
  // sentido pedir estos datos si el rol puede al menos operar o aprobar ese
  // módulo; esAprobador() en utils/alertas.js afina después según
  // ReglaAprobacion (puede que su rol no sea el aprobador configurado).
  const puedeVerDespachosAprobar = !esRolEspecial && (tienePermiso('despachos') || tienePermiso('despachos-aprobar'))
  const puedeVerPedidosInternosAprobar = !esRolEspecial && (tienePermiso('pedidos-internos') || tienePermiso('pedidos-internos-aprobar'))
  const { data: despachosPorAprobar = [] } = useDespachosList({ estado: 'PEDIDO', enabled: puedeVerDespachosAprobar })
  const { data: pedidosInternosPorAprobar = [] } = usePedidosInternosList({ estado: 'ENVIADO', enabled: puedeVerPedidosInternosAprobar })
  const { data: reglasAprobacion = [] } = useReglasAprobacion({ enabled: puedeVerDespachosAprobar || puedeVerPedidosInternosAprobar })
  const { data: configApi } = useConfiguracion()
  const alertaVencimiento = configApi?.alertaVencimiento !== false
  const simboloMoneda = 'S/'
  const navigate = useNavigate()
  const [filtroTipo, setFiltroTipo] = useState('all')

  const [verAlerta, setVerAlerta] = useState(null)
  // Seguimiento de atención (2026-09-13) — reemplaza al viejo "leída" en
  // localStorage: ahora es un registro real en el backend (quién, cuándo,
  // qué acción tomó), compartido entre usuarios y dispositivos.
  const { data: atenciones = [] } = useAtencionesAlerta()
  const atencionesPorClave = useMemo(() =>
    new Map(atenciones.map(a => [`${a.tipo}:${a.clave}`, a]))
  , [atenciones])

  const vencPorProducto = useMemo(() => vencimientoMasUrgentePorProducto(lotes), [lotes])

  // Chofer ve solo SUS rutas; Coordinador de Transporte ve las de toda la
  // empresa (gestiona el equipo completo, no un vehículo propio).
  const rutasPropias = useMemo(() =>
    rutasRaw.filter(r => r.transportistaId === sesion?.transportistaId)
  , [rutasRaw, sesion?.transportistaId])

  const TIPOS_ACTIVOS = esChofer ? TIPOS_CHOFER
    : esEjecutivoComercial ? TIPOS_EJECUTIVO_COMERCIAL
    : esCoordinadorTransporte ? TIPOS_COORDINADOR_TRANSPORTE
    : esContable ? TIPOS_CONTABLE
    : TIPOS

  const alertas = useMemo(() => {
    if (esChofer) return generarAlertasChofer(rutasPropias)
    if (esEjecutivoComercial) return generarAlertasEjecutivoComercial(cxc, proformas, oportunidades, pedidosPortal, simboloMoneda)
    if (esCoordinadorTransporte) return generarAlertasCoordinadorTransporte(rutasRaw, flotaAlertas)
    if (esContable) return generarAlertasContable(cxc, guias, simboloMoneda)
    return generarAlertas(productos, ordenes, vencPorProducto, { alertaVencimiento }, categorias, almacenes, simboloMoneda, cotizaciones, {
      despachos: despachosPorAprobar, pedidosInternos: pedidosInternosPorAprobar, reglas: reglasAprobacion, rolCodigo, esComodin,
    })
  }, [esChofer, esEjecutivoComercial, esCoordinadorTransporte, esContable, rutasPropias, rutasRaw, flotaAlertas, cxc, guias, proformas, oportunidades, pedidosPortal, productos, ordenes, vencPorProducto, alertaVencimiento, categorias, almacenes, cotizaciones, simboloMoneda, despachosPorAprobar, pedidosInternosPorAprobar, reglasAprobacion, rolCodigo, esComodin])

  const noAtendidas = useMemo(() =>
    alertas.filter(a => !atencionesPorClave.has(claveAtencion(a))).length
  , [alertas, atencionesPorClave])

  const filtered = useMemo(() => {
    if (filtroTipo === 'all') return alertas
    if (filtroTipo === 'pendientes') return alertas.filter(a => !atencionesPorClave.has(claveAtencion(a)))
    return alertas.filter(a => a.tipo === filtroTipo)
  }, [alertas, filtroTipo, atencionesPorClave])

  const conteos = useMemo(() => {
    const c = { all: alertas.length }
    Object.keys(TIPOS_ACTIVOS).forEach(t => { c[t] = alertas.filter(a => a.tipo === t).length })
    return c
  }, [alertas, TIPOS_ACTIVOS])

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      {/* KPIs por tipo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
        {[
          ['Todas', 'all', Bell],
          ['Sin atender', 'pendientes', BellRing],
          ...Object.entries(TIPOS_ACTIVOS).map(([k,v]) => [v.label, k, v.icon]),
        ].map((row) => {
          const [label, key, TileIcon] = row
          const count        = key === 'all' ? conteos.all : key === 'pendientes' ? noAtendidas : (conteos[key] || 0)
          const activo       = filtroTipo === key
          const esPendientes = key === 'pendientes'
          const esTodas      = key === 'all'
          const meta         = (!esTodas && !esPendientes) ? TIPOS_ACTIVOS[key] : null
          const iconBg  = esTodas ? 'bg-[var(--accent-dim)]' : esPendientes ? (count > 0 ? 'bg-red-500/15' : 'bg-white/5') : (meta?.bg || 'bg-white/5')
          const iconTxt = esTodas ? 'text-[var(--accent)]'   : esPendientes ? (count > 0 ? 'text-red-400'   : 'text-[#5f6f80]') : (meta?.txt || 'text-[#9ba8b6]')
          return (
            <button key={key} onClick={() => setFiltroTipo(key)}
              className="relative text-left p-3.5 sm:p-4 rounded-xl border transition-all overflow-hidden"
              style={{
                background:  activo ? 'rgba(0,200,150,0.08)' : esPendientes && count > 0 ? 'rgba(239,68,68,0.06)' : 'var(--bg-card)',
                borderColor: activo ? '#00c896' : esPendientes && count > 0 ? 'rgba(239,68,68,0.3)' : 'var(--border)',
              }}>
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl"
                style={{ background: activo ? '#00c896' : 'transparent' }}/>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${iconBg}`}>
                <TileIcon size={15} className={iconTxt}/>
              </div>
              <div className={`text-[28px] font-semibold ${esPendientes && count > 0 ? 'text-red-400' : 'text-[#e8edf2]'}`}>{count}</div>
              <div className="text-[10px] sm:text-[11px] text-[#5f6f80] mt-0.5 leading-tight">{label}</div>
            </button>
          )
        })}
      </div>

      {/* Lista de alertas */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
              Centro de Alertas
            </span>
            {noAtendidas > 0 && (
              <span className="text-[11px] bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full font-semibold">
                {noAtendidas} pendiente{noAtendidas === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <CheckCircle size={48} className="text-green-400 opacity-40"/>
            <div className="text-center">
              <p className="text-[14px] font-medium text-[#9ba8b6] mb-1">Sin alertas activas</p>
              <p className="text-[12px] text-[#5f6f80]">
                {esChofer ? 'Tus rutas están al día.'
                  : esEjecutivoComercial ? 'Tu cartera está al día.'
                  : esCoordinadorTransporte ? 'Rutas y flota están al día.'
                  : esContable ? 'Cobranza y guías de remisión están al día.'
                  : 'Todo el inventario está en orden.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((alerta, i) => {
              const meta   = TIPOS_ACTIVOS[alerta.tipo]
              const Icon   = meta?.icon || Bell
              const atencion = atencionesPorClave.get(claveAtencion(alerta))
              const color  = alerta.prioridad === 1 ? { bg:'bg-red-500/4', border:'border-red-500/20', hborder:'hover:border-red-500/40', dot:'bg-red-400' }
                           : alerta.prioridad === 2 ? { bg:'bg-amber-500/4', border:'border-amber-500/20', hborder:'hover:border-amber-500/35', dot:'bg-amber-400' }
                           : { bg:'bg-blue-500/3', border:'border-blue-500/15', hborder:'hover:border-blue-500/30', dot:'bg-blue-400' }
              return (
                <div key={i}
                  onClick={() => setVerAlerta(alerta)}
                  className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer group ${
                    atencion ? 'bg-transparent border-white/4 opacity-60'
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
                        {atencion
                          ? <Badge variant="success">Atendida</Badge>
                          : <div className={`w-2 h-2 rounded-full shrink-0 ${color.dot}`}/>}
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
          atencion={atencionesPorClave.get(claveAtencion(verAlerta))}
          simboloMoneda={simboloMoneda}
          navigate={navigate}
          onClose={() => setVerAlerta(null)}
        />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════
// MODAL DETALLE ALERTA
// ════════════════════════════════════════════════════════
function ModalDetalleAlerta({ alerta, atencion, simboloMoneda, navigate, onClose }) {
  const { toast } = useApp()
  const [nota, setNota] = useState('')
  const marcarAtendida = useMarcarAtendida()
  const reabrir = useReabrirAlerta()

  const meta  = TIPOS[alerta.tipo] || TIPOS_CHOFER[alerta.tipo] || TIPOS_EJECUTIVO_COMERCIAL[alerta.tipo]
    || TIPOS_COORDINADOR_TRANSPORTE[alerta.tipo] || TIPOS_CONTABLE[alerta.tipo]
  const Icon  = meta?.icon || Bell

  async function confirmarAtendida() {
    if (nota.trim().length < 3) return
    try {
      await marcarAtendida.mutateAsync({ tipo: alerta.tipo, clave: alerta.clave ?? alerta.titulo, notaAccion: nota.trim() })
      toast('Alerta marcada como atendida', 'success')
    } catch (e) {
      toast(e.message || 'No se pudo registrar la atención', 'error')
    }
  }

  async function confirmarReabrir() {
    try {
      await reabrir.mutateAsync({ tipo: alerta.tipo, clave: alerta.clave ?? alerta.titulo })
      toast('Alerta vuelta a pendiente', 'success')
    } catch (e) {
      toast(e.message || 'No se pudo reabrir la alerta', 'error')
    }
  }

  return (
    <Modal open title="Detalle de Alerta" onClose={onClose} size="sm"
      footer={<Btn variant="secondary" onClick={onClose} className="ml-auto">Cerrar</Btn>}>

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
        {alerta.rutaNumero && (
          <div className="bg-[#1a2230] rounded-lg px-3 py-2.5">
            <div className="text-[10px] text-[#5f6f80] uppercase tracking-wide mb-0.5">Ruta</div>
            <div className="text-[12px] font-semibold text-[#00c896] font-mono">{alerta.rutaNumero}</div>
          </div>
        )}
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
        <div 
          onClick={() => {
            if (alerta.accionPath) {
              navigate(alerta.accionPath)
              onClose()
            }
          }}
          className="flex items-center justify-between px-4 py-3 bg-[#00c896]/8 border border-[#00c896]/20 rounded-xl cursor-pointer hover:bg-[#00c896]/15 hover:border-[#00c896]/40 transition-all group/action"
        >
          <div>
            <div className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-wide mb-0.5 group-hover/action:text-[#00c896] transition-colors">Acción recomendada</div>
            <div className="text-[13px] font-medium text-[#e8edf2]">{alerta.accion}</div>
          </div>
          <ArrowRight size={16} className="text-[#00c896] shrink-0 group-hover/action:translate-x-1 transition-transform"/>
        </div>
      )}

      {/* Seguimiento — registrar la acción tomada y marcar Atendida */}
      <div className="mt-4 pt-4 border-t border-white/8">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide mb-2">Seguimiento</div>
        {atencion ? (
          <div className="bg-green-500/8 border border-green-500/20 rounded-xl px-4 py-3">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <Badge variant="success">Atendida</Badge>
              <span className="text-[11px] text-[#5f6f80]">
                {atencion.usuario?.nombre || 'Alguien'} · {formatDateTime(atencion.fecha)}
              </span>
            </div>
            <p className="text-[13px] text-[#9ba8b6] leading-relaxed mb-3">{atencion.notaAccion}</p>
            <Btn variant="ghost" size="sm" onClick={confirmarReabrir} disabled={reabrir.isPending}>
              <RotateCcw size={13}/> {reabrir.isPending ? 'Reabriendo...' : 'Reabrir (marcada por error)'}
            </Btn>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Textarea
              value={nota}
              onChange={e => setNota(e.target.value)}
              placeholder="¿Qué acción tomaste para atender esta alerta?"
              rows={3}
            />
            <Btn
              variant="primary" size="sm"
              onClick={confirmarAtendida}
              disabled={nota.trim().length < 3 || marcarAtendida.isPending}
              className="self-end"
            >
              <CheckCheck size={13}/> {marcarAtendida.isPending ? 'Guardando...' : 'Marcar como atendida'}
            </Btn>
          </div>
        )}
      </div>

    </Modal>
  )
}
