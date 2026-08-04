import { useState, useMemo } from 'react'
import { Search, Boxes, ArrowDownToLine, ArrowUpFromLine, FileSpreadsheet, FileText } from 'lucide-react'

import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate } from '../utils/helpers'
import { Badge, Btn, Input, Select, DataTable } from '../components/ui/index'
import { useMovimientosList } from '../queries/movimientos.queries'
import { useProductosList } from '../queries/productos.queries'
import { useAlmacenesList } from '../queries/almacenes.queries'
import { exportarMovimientosXLSX } from '../utils/exportXLSX'
import { exportarMovimientosPDF } from '../utils/exportPDF'

const simboloMoneda = 'S/'

export default function Movimientos() {
  const { sesion } = useApp()

  const [busqueda,  setBusqueda]  = useState('')
  const [filtTipo,  setFiltTipo]  = useState('')
  const [filtAlm,   setFiltAlm]   = useState('')
  const [filtDesde, setFiltDesde] = useState('')
  const [filtHasta, setFiltHasta] = useState('')

  const { data: movimientosRaw = [], isLoading } = useMovimientosList({
    tipo:      filtTipo  || undefined,
    almacenId: filtAlm   || undefined,
    desde:     filtDesde || undefined,
    hasta:     filtHasta || undefined,
  })
  const { data: productos  = [] } = useProductosList({ incluirInactivos: true })
  const { data: almacenes  = [] } = useAlmacenesList()

  const movimientos = useMemo(() =>
    movimientosRaw.map(m => ({
      ...m,
      costoTotal: Number(m.costoUnitario || 0) * Number(m.cantidad || 0),
    }))
  , [movimientosRaw])

  const filtered = useMemo(() => {
    let d = [...movimientos]
    if (busqueda) {
      const q = busqueda.toLowerCase()
      d = d.filter(m => {
        const p = productos.find(x => x.id === m.productoId)
        return p?.nombre?.toLowerCase().includes(q) || p?.sku?.toLowerCase().includes(q) ||
               m.documento?.toLowerCase().includes(q) || m.motivo?.toLowerCase().includes(q)
      })
    }
    d.sort((a, b) => {
      const fa = (a.fecha || a.createdAt || '').slice(0, 10)
      const fb = (b.fecha || b.createdAt || '').slice(0, 10)
      return fb.localeCompare(fa)
    })
    return d
  }, [movimientos, busqueda, productos])

  const totales = useMemo(() => ({
    entradas: filtered.filter(m => m.tipo === 'ENTRADA').reduce((s, m) => s + m.costoTotal, 0),
    salidas:  filtered.filter(m => m.tipo === 'SALIDA' ).reduce((s, m) => s + m.costoTotal, 0),
    count:    filtered.length,
  }), [filtered])

  async function exportExcel() {
    await exportarMovimientosXLSX(filtered, productos, almacenes, simboloMoneda)
  }

  async function exportPDF() {
    await exportarMovimientosPDF(filtered, productos, almacenes, simboloMoneda, sesion?.nombre)
  }

  const hasFiltros = busqueda || filtTipo || filtAlm || filtDesde || filtHasta
  const limpiar = () => { setBusqueda(''); setFiltTipo(''); setFiltAlm(''); setFiltDesde(''); setFiltHasta('') }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {[
          ['Entradas (filtradas)', formatCurrency(totales.entradas, simboloMoneda), '#22c55e'],
          ['Salidas (filtradas)',  formatCurrency(totales.salidas,  simboloMoneda), '#ef4444'],
          ['Movimientos',          totales.count,                                   '#3b82f6'],
        ].map(([l, v, c]) => (
          <div key={l} className="relative bg-[#161d28] border border-white/8 rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: c }}/>
            <div className="text-[11px] text-[#5f6f80] uppercase tracking-[0.05em] mb-2">{l}</div>
            <div className="text-[17px] font-semibold text-[#e8edf2] font-mono">{v}</div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Historial de Movimientos</span>
          <div className="flex gap-2">
            <Btn variant="secondary" size="sm" onClick={exportExcel}><FileSpreadsheet size={13}/> Excel</Btn>
            <Btn variant="secondary" size="sm" onClick={exportPDF}><FileText size={13}/> PDF</Btn>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <div className="relative flex-1 min-w-50">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <Input className="pl-8" placeholder="Buscar producto, SKU, doc, motivo..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
          </div>
          <Select className="w-auto" value={filtTipo} onChange={e => setFiltTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            {['ENTRADA', 'SALIDA', 'AJUSTE', 'TRANSFERENCIA', 'DEVOLUCION'].map(t => <option key={t}>{t}</option>)}
          </Select>
          <Select className="w-auto" value={filtAlm} onChange={e => setFiltAlm(e.target.value)}>
            <option value="">Todos los almacenes</option>
            {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </Select>
          <Input type="date" value={filtDesde} onChange={e => setFiltDesde(e.target.value)}/>
          <Input type="date" value={filtHasta} onChange={e => setFiltHasta(e.target.value)}/>
          {hasFiltros && <Btn variant="ghost" size="sm" onClick={limpiar}>Limpiar</Btn>}
        </div>

        <DataTable
          loading={isLoading}
          rows={filtered}
          rowKey={m => m.id}
          emptyIcon={Boxes}
          emptyTitle="Sin movimientos"
          emptyDescription="No hay movimientos con los filtros actuales."
          columns={[
            { key: 'fecha', header: 'Fecha', render: m => <span className="font-mono text-[12px] text-[#9ba8b6]">{formatDate(m.fecha || m.createdAt)}</span> },
            { key: 'tipo', header: 'Tipo', render: m => {
                const varB = m.tipo === 'ENTRADA' ? 'success' : m.tipo === 'SALIDA' ? 'danger' : m.tipo === 'AJUSTE' ? 'info' : m.tipo === 'DEVOLUCION' ? 'warning' : 'neutral'
                return (
                  <Badge variant={varB}>
                    {m.tipo === 'ENTRADA' ? <ArrowDownToLine size={10}/> : m.tipo === 'SALIDA' ? <ArrowUpFromLine size={10}/> : null}
                    {m.tipo}
                  </Badge>
                )
              } },
            { key: 'documento', header: 'Documento', render: m => <span className="font-mono text-[12px] text-[#00c896]">{m.documento || '—'}</span> },
            { key: 'producto', header: 'Producto', render: m => {
                const p = productos.find(x => x.id === m.productoId)
                return (
                  <div>
                    <div className="font-medium text-[#e8edf2]">{p?.nombre || '—'}</div>
                    <div className="text-[11px] text-[#5f6f80]">{p?.sku}</div>
                  </div>
                )
              } },
            { key: 'almacen', header: 'Almacén', render: m => <span className="text-[12px] text-[#9ba8b6]">{almacenes.find(a => a.id === m.almacenId)?.nombre || '—'}</span> },
            { key: 'cantidad', header: 'Cantidad', align: 'right', render: m => {
                const p = productos.find(x => x.id === m.productoId)
                const esEnt = m.tipo === 'ENTRADA'
                return (
                  <span className={`font-mono text-[12px] ${esEnt ? 'text-green-400' : 'text-red-400'}`}>
                    {esEnt ? '+' : '-'}{m.cantidad} <span className="text-[#5f6f80] text-[11px]">{p?.unidadMedida}</span>
                  </span>
                )
              } },
            { key: 'costoUnit', header: 'Costo Unit.', align: 'right', render: m => <span className="font-mono text-[12px] text-[#9ba8b6]">{formatCurrency(Number(m.costoUnitario || 0), simboloMoneda)}</span> },
            { key: 'total', header: 'Total', align: 'right', render: m => <span className="font-mono text-[12px] font-semibold text-[#e8edf2]">{formatCurrency(m.costoTotal, simboloMoneda)}</span> },
            { key: 'motivo', header: 'Motivo', render: m => <span className="text-[12px] text-[#9ba8b6] max-w-35 truncate block">{m.motivo || '—'}</span> },
          ]}
        />

        {filtered.length > 0 && (
          <div className="mt-3 text-[11px] text-[#5f6f80]">
            {filtered.length} movimiento{filtered.length !== 1 ? 's' : ''} — los filtros de tipo, almacén y fecha se aplican en el servidor.
          </div>
        )}
      </div>

      <div className="bg-[#161d28] border border-white/6 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          ¿Cómo funciona el módulo de Movimientos?
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {[
            ['1. Registro automático', 'Cada Entrada, Salida, Ajuste, Transferencia o Devolución que se registra en su módulo correspondiente queda aquí, con costo unitario y total valorizado.'],
            ['2. Filtrar por tipo', 'Combina tipo de movimiento, almacén y rango de fechas para acotar el historial a lo que necesitas auditar.'],
            ['3. Buscar', 'Busca por producto, SKU, número de documento o motivo para encontrar un movimiento específico rápidamente.'],
            ['4. Exportar', 'Excel/PDF exportan el historial filtrado completo, útil para conciliación y auditoría de inventario.'],
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
