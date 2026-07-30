import { useState } from 'react'
import { ShieldCheck, Info, ScrollText, GitCompareArrows, Boxes, DollarSign } from 'lucide-react'
import { EmptyState, Badge } from '../components/ui/index'
import { formatDate, formatDateTime, formatCurrency } from '../utils/helpers'
import {
  useBitacoraAuditoria, useDiscrepanciasAuditoria,
  useMovimientosAuditoria, useCxcAuditoria,
} from '../queries/panel-auditoria.queries'

const TH = ({ c, r }) => <th className={`bg-[#1a2230] px-3.5 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] whitespace-nowrap border-b border-white/8 ${r ? 'text-right' : 'text-left'}`}>{c}</th>
const TD = ({ children, r, className = '' }) => <td className={`px-3.5 py-2.5 text-[13px] text-[#e8edf2] border-b border-white/6 ${r ? 'text-right' : ''} ${className}`}>{children}</td>

const TABS = [
  { id: 'bitacora',      label: 'Bitácora',      icon: ScrollText },
  { id: 'discrepancias', label: 'Discrepancias', icon: GitCompareArrows },
  { id: 'movimientos',   label: 'Trazabilidad',  icon: Boxes },
  { id: 'cxc',           label: 'Conciliación',  icon: DollarSign },
]

export default function PanelAuditoria() {
  const [tab, setTab] = useState('bitacora')

  return (
    <div className="p-6 flex flex-col gap-5">
      <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.20)' }}>
        <ShieldCheck size={20} className="text-[#00c896] shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1.5">
          <p className="text-[13px] text-[#e8edf2] leading-relaxed">
            <b>¿Para qué sirve?</b> Vista de solo lectura para revisar la operación sin poder modificarla — bitácora de actividad, discrepancias de inventario, trazabilidad de movimientos y conciliación de cuentas por cobrar.
          </p>
          <p className="text-[12px] text-[#9ba8b6] flex items-start gap-1.5">
            <Info size={13} className="shrink-0 mt-0.5" />
            Este panel no tiene ningún botón de crear, editar ni eliminar — el rol Auditor no tiene acceso a ningún otro módulo del sistema.
          </p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-white/8">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${tab === t.id ? 'border-[#00c896] text-[#e8edf2]' : 'border-transparent text-[#5f6f80] hover:text-[#9ba8b6]'}`}>
              <Icon size={14} />{t.label}
            </button>
          )
        })}
      </div>

      {tab === 'bitacora'      && <TabBitacora />}
      {tab === 'discrepancias' && <TabDiscrepancias />}
      {tab === 'movimientos'   && <TabMovimientos />}
      {tab === 'cxc'           && <TabCxc />}
    </div>
  )
}

function TabBitacora() {
  const { data = [], isLoading } = useBitacoraAuditoria()
  if (!isLoading && data.length === 0) return <EmptyState icon={ScrollText} title="Sin actividad registrada" />
  return (
    <div className="overflow-x-auto rounded-lg border border-white/8">
      <table className="w-full border-collapse">
        <thead><tr><TH c="Fecha" /><TH c="Usuario" /><TH c="Acción" /><TH c="Módulo" /><TH c="Detalle" /></tr></thead>
        <tbody>
          {data.map(a => (
            <tr key={a.id} className="hover:bg-white/2">
              <TD>{formatDateTime(a.timestamp)}</TD>
              <TD>{a.usuarioNombre}</TD>
              <TD><Badge variant="neutral">{a.accion}</Badge></TD>
              <TD>{a.modulo}</TD>
              <TD className="text-[#9ba8b6]">{a.detalle}</TD>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TabDiscrepancias() {
  const { data = [], isLoading } = useDiscrepanciasAuditoria()
  if (!isLoading && data.length === 0) return <EmptyState icon={GitCompareArrows} title="Sin discrepancias registradas" description="Los conteos de Inventario Físico coinciden con el sistema" />
  return (
    <div className="overflow-x-auto rounded-lg border border-white/8">
      <table className="w-full border-collapse">
        <thead><tr><TH c="Conteo" /><TH c="Fecha" /><TH c="Almacén" /><TH c="Producto" /><TH c="Sistema" r /><TH c="Físico" r /><TH c="Diferencia" r /><TH c="Ajustado" /></tr></thead>
        <tbody>
          {data.map(l => {
            const dif = Number(l.diferencia || 0)
            return (
              <tr key={l.id} className="hover:bg-white/2">
                <TD>{l.inventario?.numero}</TD>
                <TD>{formatDate(l.inventario?.fecha)}</TD>
                <TD>{l.inventario?.almacen?.nombre}</TD>
                <TD>{l.producto?.sku} — {l.producto?.nombre}</TD>
                <TD r>{Number(l.stockSistema)}</TD>
                <TD r>{l.stockFisico != null ? Number(l.stockFisico) : '—'}</TD>
                <TD r className={dif < 0 ? 'text-red-400' : 'text-emerald-400'}>{dif > 0 ? '+' : ''}{dif}</TD>
                <TD><Badge variant={l.ajustado ? 'success' : 'warning'}>{l.ajustado ? 'Sí' : 'Pendiente'}</Badge></TD>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function TabMovimientos() {
  const { data = [], isLoading } = useMovimientosAuditoria()
  if (!isLoading && data.length === 0) return <EmptyState icon={Boxes} title="Sin movimientos registrados" />
  return (
    <div className="overflow-x-auto rounded-lg border border-white/8">
      <table className="w-full border-collapse">
        <thead><tr><TH c="Fecha" /><TH c="Tipo" /><TH c="Producto" /><TH c="Almacén" /><TH c="Cantidad" r /></tr></thead>
        <tbody>
          {data.map(m => (
            <tr key={m.id} className="hover:bg-white/2">
              <TD>{formatDateTime(m.fecha)}</TD>
              <TD><Badge variant="neutral">{m.tipo}</Badge></TD>
              <TD>{m.producto?.sku} — {m.producto?.nombre}</TD>
              <TD>{m.almacen?.nombre}</TD>
              <TD r>{Number(m.cantidad)}</TD>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TabCxc() {
  const { data = [], isLoading } = useCxcAuditoria()
  if (!isLoading && data.length === 0) return <EmptyState icon={DollarSign} title="Sin cuentas por cobrar" />
  return (
    <div className="overflow-x-auto rounded-lg border border-white/8">
      <table className="w-full border-collapse">
        <thead><tr><TH c="Número" /><TH c="Cliente" /><TH c="Vencimiento" /><TH c="Monto" r /><TH c="Saldo" r /><TH c="Estado" /></tr></thead>
        <tbody>
          {data.map(c => (
            <tr key={c.id} className="hover:bg-white/2">
              <TD>{c.numero}</TD>
              <TD>{c.cliente?.razonSocial}</TD>
              <TD>{formatDate(c.fechaVencimiento)}</TD>
              <TD r>{formatCurrency(c.monto)}</TD>
              <TD r>{formatCurrency(c.saldo)}</TD>
              <TD><Badge variant={c.estado === 'VENCIDA' ? 'danger' : c.estado === 'PAGADA' ? 'success' : 'warning'}>{c.estado}</Badge></TD>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
