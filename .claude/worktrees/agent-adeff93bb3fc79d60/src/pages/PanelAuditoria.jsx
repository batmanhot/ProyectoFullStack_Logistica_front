import { useState } from 'react'
import { ScrollText, GitCompareArrows, Boxes, DollarSign } from 'lucide-react'
import { Badge, DataTable } from '../components/ui/index'
import { formatDate, formatDateTime, formatCurrency } from '../utils/helpers'
import {
  useBitacoraAuditoria, useDiscrepanciasAuditoria,
  useMovimientosAuditoria, useCxcAuditoria,
} from '../queries/panel-auditoria.queries'

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

      <div className="bg-[#161d28] border border-white/6 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          ¿Cómo funciona el módulo de Panel de Auditoría?
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {[
            ['1. Bitácora', 'Actividad reciente del sistema: quién hizo qué, en qué módulo y cuándo.'],
            ['2. Discrepancias', 'Diferencias entre el stock del sistema y el conteo físico registradas en Inventario Físico, y si ya fueron ajustadas.'],
            ['3. Trazabilidad', 'Historial de movimientos de inventario (entradas, salidas, ajustes) por producto y almacén.'],
            ['4. Conciliación', 'Estado de las cuentas por cobrar — vencidas, pagadas o pendientes — para cruzar con contabilidad.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
              <div className="text-[11px] font-semibold text-[#e8edf2] mb-1.5">{t}</div>
              <div className="text-[11px] text-[#5f6f80] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-white/6 text-[11px] text-[#5f6f80] leading-relaxed">
          Este panel es de <strong className="text-[#9ba8b6]">solo lectura</strong> — no tiene botones de crear, editar ni eliminar. El rol Auditor no tiene acceso a ningún otro módulo del sistema.
        </div>
      </div>
    </div>
  )
}

function TabBitacora() {
  const { data = [], isLoading } = useBitacoraAuditoria()
  return (
    <DataTable
      loading={isLoading}
      rows={data}
      rowKey={a => a.id}
      emptyIcon={ScrollText}
      emptyTitle="Sin actividad registrada"
      columns={[
        { key: 'fecha', header: 'Fecha', render: a => formatDateTime(a.timestamp) },
        { key: 'usuario', header: 'Usuario', render: a => a.usuarioNombre },
        { key: 'accion', header: 'Acción', render: a => <Badge variant="neutral">{a.accion}</Badge> },
        { key: 'modulo', header: 'Módulo', render: a => a.modulo },
        { key: 'detalle', header: 'Detalle', render: a => <span className="text-[#9ba8b6]">{a.detalle}</span> },
      ]}
    />
  )
}

function TabDiscrepancias() {
  const { data = [], isLoading } = useDiscrepanciasAuditoria()
  return (
    <DataTable
      loading={isLoading}
      rows={data}
      rowKey={l => l.id}
      emptyIcon={GitCompareArrows}
      emptyTitle="Sin discrepancias registradas"
      emptyDescription="Los conteos de Inventario Físico coinciden con el sistema"
      columns={[
        { key: 'conteo', header: 'Conteo', render: l => l.inventario?.numero },
        { key: 'fecha', header: 'Fecha', render: l => formatDate(l.inventario?.fecha) },
        { key: 'almacen', header: 'Almacén', render: l => l.inventario?.almacen?.nombre },
        { key: 'producto', header: 'Producto', render: l => `${l.producto?.sku} — ${l.producto?.nombre}` },
        { key: 'sistema', header: 'Sistema', align: 'right', render: l => Number(l.stockSistema) },
        { key: 'fisico', header: 'Físico', align: 'right', render: l => l.stockFisico != null ? Number(l.stockFisico) : '—' },
        { key: 'diferencia', header: 'Diferencia', align: 'right', render: l => {
            const dif = Number(l.diferencia || 0)
            return <span className={dif < 0 ? 'text-red-400' : 'text-emerald-400'}>{dif > 0 ? '+' : ''}{dif}</span>
          } },
        { key: 'ajustado', header: 'Ajustado', render: l => <Badge variant={l.ajustado ? 'success' : 'warning'}>{l.ajustado ? 'Sí' : 'Pendiente'}</Badge> },
      ]}
    />
  )
}

function TabMovimientos() {
  const { data = [], isLoading } = useMovimientosAuditoria()
  return (
    <DataTable
      loading={isLoading}
      rows={data}
      rowKey={m => m.id}
      emptyIcon={Boxes}
      emptyTitle="Sin movimientos registrados"
      columns={[
        { key: 'fecha', header: 'Fecha', render: m => formatDateTime(m.fecha) },
        { key: 'tipo', header: 'Tipo', render: m => <Badge variant="neutral">{m.tipo}</Badge> },
        { key: 'producto', header: 'Producto', render: m => `${m.producto?.sku} — ${m.producto?.nombre}` },
        { key: 'almacen', header: 'Almacén', render: m => m.almacen?.nombre },
        { key: 'cantidad', header: 'Cantidad', align: 'right', render: m => Number(m.cantidad) },
      ]}
    />
  )
}

function TabCxc() {
  const { data = [], isLoading } = useCxcAuditoria()
  return (
    <DataTable
      loading={isLoading}
      rows={data}
      rowKey={c => c.id}
      emptyIcon={DollarSign}
      emptyTitle="Sin cuentas por cobrar"
      columns={[
        { key: 'numero', header: 'Número', render: c => c.numero },
        { key: 'cliente', header: 'Cliente', render: c => c.cliente?.razonSocial },
        { key: 'vencimiento', header: 'Vencimiento', render: c => formatDate(c.fechaVencimiento) },
        { key: 'monto', header: 'Monto', align: 'right', render: c => formatCurrency(c.monto) },
        { key: 'saldo', header: 'Saldo', align: 'right', render: c => formatCurrency(c.saldo) },
        { key: 'estado', header: 'Estado', render: c => <Badge variant={c.estado === 'VENCIDA' ? 'danger' : c.estado === 'PAGADA' ? 'success' : 'warning'}>{c.estado}</Badge> },
      ]}
    />
  )
}
