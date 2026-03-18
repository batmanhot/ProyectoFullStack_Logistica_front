import { useState, useMemo } from 'react'
import { Search, Download, Boxes, ArrowDownToLine, ArrowUpFromLine, FileSpreadsheet, FileText } from 'lucide-react'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'




import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate } from '../utils/helpers'
import { EmptyState, Badge, Btn } from '../components/ui/index'

const TH = ({ c, r }) => <th className={`bg-[#1a2230] px-3.5 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] whitespace-nowrap border-b border-white/[0.08] sticky top-0 ${r ? 'text-right' : 'text-left'}`}>{c}</th>
const SI = 'px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit] placeholder-[#5f6f80]'
const SEL = SI + ' pr-8'

export default function Movimientos() {
  const { movimientos, productos, almacenes, simboloMoneda } = useApp()
  const [busqueda, setBusqueda] = useState('')
  const [filtTipo, setFiltTipo] = useState('')
  const [filtAlm, setFiltAlm] = useState('')
  const [filtDesde, setFiltDesde] = useState('')
  const [filtHasta, setFiltHasta] = useState('')

  const toISODate = (val) => {
    if (!val) return ''
    if (val instanceof Date) return val.toISOString().split('T')[0]
    const s = String(val).trim()
    if (!s) return ''
    const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (isoMatch) return isoMatch[0]
    if (s.includes('/')) {
      const parts = s.split('/')
      if (parts.length === 3) {
        let [p1, p2, p3] = parts
        if (p1.length === 4) return `${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`
        console.log(`${p3}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}`)
        return `${p3}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}`
      }
    }
    return ''
  }

  const filtered = useMemo(() => {
    let d = [...movimientos]
    if (filtTipo) d = d.filter(m => m.tipo === filtTipo)
    if (filtAlm) d = d.filter(m => m.almacenId === filtAlm)

    if (filtDesde || filtHasta) {
      d = d.filter(m => {
        const mDate = toISODate(m.fecha)
        if (!mDate) return false
        if (filtDesde && mDate < filtDesde) return false
        if (filtHasta && mDate > filtHasta) return false
        return true
      })
    }

    //if (filtDesde) d = d.filter(l => m.fecha >= filtDesde)
    //if (filtHasta) d = d.filter(l => m.fecha <= filtHasta)

    if (busqueda) {
      const q = busqueda.toLowerCase()
      d = d.filter(m => {
        const p = productos.find(x => x.id === m.productoId)
        return p?.nombre.toLowerCase().includes(q) || p?.sku.toLowerCase().includes(q) || m.documento?.toLowerCase().includes(q) || m.motivo?.toLowerCase().includes(q)
      })
    }

    // Ordenar por fecha: la más reciente primero (descendente)
    d.sort((a, b) => {
      // Usamos el campo fecha normalizado y el id o createdAt como desempate para mayor precisión
      //const valA = (toISODate(a.fecha) || '0000-00-00') + (a.createdAt || a.id || '')
      //const valB = (toISODate(b.fecha) || '0000-00-00') + (b.createdAt || b.id || '')

      const valA = (toISODate(a.fecha))
      const valB = (toISODate(b.fecha))
      return valB.localeCompare(valA)
    })

    return d
  }, [movimientos, filtTipo, filtAlm, filtDesde, filtHasta, busqueda, productos])

  const totales = useMemo(() => ({
    entradas: filtered.filter(m => m.tipo === 'ENTRADA').reduce((s, m) => s + m.costoTotal, 0),
    salidas: filtered.filter(m => m.tipo === 'SALIDA').reduce((s, m) => s + m.costoTotal, 0),
    count: filtered.length,
  }), [filtered])

  function exportExcel() {
    const data = filtered.map(m => {
      const p = productos.find(x => x.id === m.productoId)
      const alm = almacenes.find(a => a.id === m.almacenId)
      return {
        'Fecha': formatDate(m.fecha),
        'Tipo': m.tipo,
        'Documento': m.documento || '—',
        'Producto': p?.nombre || '—',
        'SKU': p?.sku || '—',
        'Almacén': alm?.nombre || '—',
        'Cantidad': (m.tipo === 'ENTRADA' ? 1 : -1) * m.cantidad,
        'Costo Unit.': m.costoUnitario,
        'Total': m.costoTotal,
        'Lote': m.lote || '—',
        'Motivo': m.motivo || '—'
      }
    })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Movimientos")
    XLSX.writeFile(wb, `movimientos_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  function exportPDF() {
    try {
      if (!filtered.length) return alert('No hay datos para exportar')
      
      const doc = new jsPDF('landscape')
      
      doc.setFontSize(18)
      doc.setTextColor(33, 41, 54)
      doc.text('Historial de Movimientos', 14, 20)
      
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`Empresa: Distribuidora Lima Norte S.A.C.`, 14, 28)
      doc.text(`Fecha de reporte: ${new Date().toLocaleString()}`, 14, 33)
      
      if (filtDesde || filtHasta) {
        doc.text(`Rango: ${filtDesde || 'Inicio'} hasta ${filtHasta || 'Hoy'}`, 14, 38)
      }

      const tableHeaders = [['Fecha', 'Tipo', 'Documento', 'Producto', 'Almacén', 'Cant.', 'Costo Unit.', 'Total', 'Lote', 'Motivo']]
      const tableData = filtered.map(m => {
        const p = productos.find(x => x.id === m.productoId)
        const alm = almacenes.find(a => a.id === m.almacenId)
        return [
          formatDate(m.fecha),
          m.tipo,
          m.documento || '—',
          p?.nombre || '—',
          alm?.nombre || '—',
          `${m.tipo === 'ENTRADA' ? '+' : '-'}${m.cantidad}`,
          formatCurrency(m.costoUnitario, simboloMoneda),
          formatCurrency(m.costoTotal, simboloMoneda),
          m.lote || '—',
          m.motivo || '—'
        ]
      })

      autoTable(doc, {
        startY: 42,
        head: tableHeaders,
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [26, 34, 48], textColor: [232, 237, 242], fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: {
          5: { halign: 'right', fontStyle: 'bold' },
          6: { halign: 'right' },
          7: { halign: 'right', fontStyle: 'bold' },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 5) {
            const val = data.cell.raw
            if (typeof val === 'string' && val.startsWith('+')) data.cell.styles.textColor = [34, 197, 94]
            if (typeof val === 'string' && val.startsWith('-')) data.cell.styles.textColor = [239, 68, 68]
          }
        }
      })

      doc.save(`movimientos_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err) {
      console.error('PDF Export Error:', err)
      alert('Error al generar PDF: ' + err.message)
    }
  }




  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-3.5">
        {[['Entradas (filtradas)', formatCurrency(totales.entradas, simboloMoneda), '#22c55e'], ['Salidas (filtradas)', formatCurrency(totales.salidas, simboloMoneda), '#ef4444'], ['Movimientos', totales.count, '#3b82f6']].map(([l, v, c]) => (
          <div key={l} className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: c }} />
            <div className="text-[11px] text-[#5f6f80] uppercase tracking-[0.05em] mb-2">{l}</div>
            <div className="text-[18px] font-semibold text-[#e8edf2] font-mono">{v}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Historial de Movimientos</span>
          <div className="flex gap-2">
            <Btn variant="secondary" size="sm" onClick={exportExcel}><FileSpreadsheet size={13} />Exportar Excel</Btn>
            <Btn variant="secondary" size="sm" onClick={exportPDF}><FileText size={13} />Exportar PDF</Btn>
          </div>


        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none" />
            <input className={SI + ' pl-8 w-full'} placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <select className={SEL} style={{ width: 140 }} value={filtTipo} onChange={e => setFiltTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            {['ENTRADA', 'SALIDA', 'AJUSTE', 'TRANSFERENCIA'].map(t => <option key={t}>{t}</option>)}
          </select>
          <select className={SEL} style={{ width: 160 }} value={filtAlm} onChange={e => setFiltAlm(e.target.value)}>
            <option value="">Todos los almacenes</option>
            {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
          <input type="date" className={SI} style={{ width: 140 }} value={filtDesde} onChange={e => setFiltDesde(e.target.value)} />
          <input type="date" className={SI} style={{ width: 140 }} value={filtHasta} onChange={e => setFiltHasta(e.target.value)} />
          {(busqueda || filtTipo || filtAlm || filtDesde || filtHasta) && <Btn variant="ghost" size="sm" onClick={() => { setBusqueda(''); setFiltTipo(''); setFiltAlm(''); setFiltDesde(''); setFiltHasta('') }}>Limpiar</Btn>}
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr><TH c="Fecha" /><TH c="Tipo" /><TH c="Documento" /><TH c="Producto" /><TH c="Almacén" /><TH c="Cantidad" r /><TH c="Costo Unit." r /><TH c="Total" r /><TH c="Lote" /><TH c="Motivo" /></tr></thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={10}><EmptyState icon={Boxes} title="Sin movimientos" description="No hay movimientos con los filtros actuales." /></td></tr>}
              {filtered.map(m => {
                const p = productos.find(x => x.id === m.productoId)
                const alm = almacenes.find(a => a.id === m.almacenId)
                const varB = m.tipo === 'ENTRADA' ? 'success' : m.tipo === 'SALIDA' ? 'danger' : m.tipo === 'AJUSTE' ? 'info' : 'neutral'
                return (
                  <tr key={m.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]">
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{formatDate(m.fecha)}</td>
                    <td className="px-3.5 py-2.5"><Badge variant={varB}>{m.tipo === 'ENTRADA' ? <ArrowDownToLine size={10} /> : m.tipo === 'SALIDA' ? <ArrowUpFromLine size={10} /> : null}{m.tipo}</Badge></td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#00c896]">{m.documento || '—'}</td>
                    <td className="px-3.5 py-2.5"><div className="font-medium">{p?.nombre || '—'}</div><div className="text-[11px] text-[#5f6f80]">{p?.sku}</div></td>
                    <td className="px-3.5 py-2.5 text-[12px] text-[#9ba8b6]">{alm?.nombre || '—'}</td>
                    <td className={`px-3.5 py-2.5 font-mono text-[12px] text-right ${m.tipo === 'ENTRADA' ? 'text-green-400' : 'text-red-400'}`}>{m.tipo === 'ENTRADA' ? '+' : '-'}{m.cantidad} <span className="text-[#5f6f80] text-[11px]">{p?.unidadMedida}</span></td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-right">{formatCurrency(m.costoUnitario, simboloMoneda)}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[12px] text-right font-semibold">{formatCurrency(m.costoTotal, simboloMoneda)}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#9ba8b6]">{m.lote || '—'}</td>
                    <td className="px-3.5 py-2.5 text-[12px] text-[#9ba8b6] max-w-[140px] truncate">{m.motivo}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}