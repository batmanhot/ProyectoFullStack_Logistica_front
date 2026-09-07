import { useMemo, useState } from 'react'
import { DollarSign, Package, Clock, FolderKanban, Download } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { formatCurrency } from '../../utils/helpers'
import { Btn, Select, Input, Badge, EmptyState } from '../../components/ui/index'
import { useReporteConsumoProyecto, usePendientesPorDespacharProyecto } from '../../queries/proyectos.queries'
import { useCdrList } from '../../queries/cdr.queries'
import { useAreasInternasList } from '../../queries/areas-internas.queries'
import { useProyectosList } from '../../queries/proyectos.queries'
import { exportarReporteConsumoProyectoXLSX } from '../../utils/exportXLSX'

const TT = { background: '#1a2230', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12, color: '#e8edf2' }
const SIN_PROYECTO = 'sin-proyecto'

function KPI({ label, value, sub, color, icon: Icon }) {
  return (
    <div className="relative bg-[#161d28] border border-white/8 rounded-xl px-4 sm:px-5 py-4 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }}/>
      <div className="absolute top-3 right-4 opacity-[0.06]">{Icon && <Icon size={44}/>}</div>
      <div className="text-[9px] sm:text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.08em] mb-2 flex items-center gap-1.5">
        {Icon && <Icon size={11} style={{ color, opacity: 0.8 }}/>}{label}
      </div>
      <div className="text-[28px] font-semibold text-[#e8edf2] leading-none">{value}</div>
      {sub && <div className="text-[10px] text-[#5f6f80] mt-1.5 leading-snug">{sub}</div>}
    </div>
  )
}

export default function ReportesProyecto() {
  const simboloMoneda = 'S/'
  const hoy = new Date().toISOString().split('T')[0]
  // Por defecto se muestran 3 meses (el actual + los 2 anteriores) para que
  // el comparativo mensual tenga sentido de entrada; el usuario acota el rango
  // con los filtros si quiere ver solo el mes en curso.
  const inicioRango = new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1).toISOString().split('T')[0]

  const [desde, setDesde] = useState(inicioRango)
  const [hasta, setHasta] = useState(hoy)
  const [cdrId, setCdrId] = useState('')
  const [areaId, setAreaId] = useState('')
  const [proyectoId, setProyectoId] = useState('')

  const { data: cdrs      = [] } = useCdrList()
  const { data: areas     = [] } = useAreasInternasList()
  const { data: proyectos = [] } = useProyectosList({ incluirInactivos: true })

  const filtros = { desde, hasta, cdrId: cdrId || undefined, areaId: areaId || undefined, proyectoId: proyectoId || undefined }
  const { data: filas = [], isLoading } = useReporteConsumoProyecto(filtros)
  const { data: pendientes = [] } = usePendientesPorDespacharProyecto({ cdrId: cdrId || undefined, areaId: areaId || undefined, proyectoId: proyectoId || undefined })

  const valorFila = (f) => Number(f.cantidad) * Number(f.costoUnitario || 0)

  const kpis = useMemo(() => {
    const valorTotal = filas.reduce((s, f) => s + valorFila(f), 0)
    const proyectosConConsumo = new Set(filas.filter(f => f.proyecto).map(f => f.proyecto.id)).size
    return { valorTotal, movimientos: filas.length, proyectosConConsumo, pendientes: pendientes.length }
  }, [filas, pendientes])

  const porProyecto = useMemo(() => {
    const map = new Map()
    filas.forEach(f => {
      const key = f.proyecto?.id || SIN_PROYECTO
      if (!map.has(key)) {
        map.set(key, {
          nombre: f.proyecto ? `${f.proyecto.codigo} — ${f.proyecto.nombre}` : 'Sin proyecto asignado',
          cdr: f.proyecto?.cdr?.nombre || '—',
          cliente: f.proyecto?.cliente?.razonSocial || '—',
          cantidad: 0, valor: 0,
        })
      }
      const r = map.get(key)
      r.cantidad++; r.valor += valorFila(f)
    })
    return Array.from(map.values()).sort((a, b) => b.valor - a.valor)
  }, [filas])

  const porCDR = useMemo(() => {
    const map = new Map()
    filas.forEach(f => {
      const key = f.proyecto?.cdr?.id || SIN_PROYECTO
      const nombre = f.proyecto?.cdr?.nombre || 'Sin CDR'
      if (!map.has(key)) map.set(key, { nombre, cantidad: 0, valor: 0 })
      const r = map.get(key)
      r.cantidad++; r.valor += valorFila(f)
    })
    return Array.from(map.values()).sort((a, b) => b.valor - a.valor)
  }, [filas])

  const porArea = useMemo(() => {
    const map = new Map()
    filas.forEach(f => {
      const key = f.pedidoInterno?.area?.id || SIN_PROYECTO
      const nombre = f.pedidoInterno?.area?.nombre || '—'
      if (!map.has(key)) map.set(key, { nombre, cantidad: 0, valor: 0 })
      const r = map.get(key)
      r.cantidad++; r.valor += valorFila(f)
    })
    return Array.from(map.values()).sort((a, b) => b.valor - a.valor)
  }, [filas])

  const comparativoMensual = useMemo(() => {
    const map = new Map()
    filas.forEach(f => {
      const d = new Date(f.fecha)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('es-PE', { month: 'short', year: '2-digit' })
      if (!map.has(key)) map.set(key, { key, label, valor: 0 })
      map.get(key).valor += valorFila(f)
    })
    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key))
  }, [filas])

  async function exportar() {
    await exportarReporteConsumoProyectoXLSX(filas, simboloMoneda)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4">

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[18px] font-bold text-[#e8edf2]">Consumo por Proyecto 📦</h1>
          <p className="text-[12px] text-[#5f6f80] mt-0.5">Valorización de despachos por proyecto, CDR y área — base para el cobro al cliente contratante.</p>
        </div>
        <Btn variant="secondary" size="sm" onClick={exportar} disabled={filas.length === 0}><Download size={13}/> Exportar Excel</Btn>
      </div>

      {/* Filtros */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-[#5f6f80] uppercase">Desde</label>
          <Input type="date" value={desde} onChange={e => setDesde(e.target.value)}/>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-[#5f6f80] uppercase">Hasta</label>
          <Input type="date" value={hasta} onChange={e => setHasta(e.target.value)}/>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-[#5f6f80] uppercase">CDR</label>
          <Select value={cdrId} onChange={e => setCdrId(e.target.value)}>
            <option value="">Todos</option>
            {cdrs.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-[#5f6f80] uppercase">Área</label>
          <Select value={areaId} onChange={e => setAreaId(e.target.value)}>
            <option value="">Todas</option>
            {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-[#5f6f80] uppercase">Proyecto</label>
          <Select value={proyectoId} onChange={e => setProyectoId(e.target.value)}>
            <option value="">Todos</option>
            {proyectos.map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Valor del período" value={formatCurrency(kpis.valorTotal, simboloMoneda)} color="#00c896" icon={DollarSign}/>
        <KPI label="Movimientos" value={kpis.movimientos} color="#3b82f6" icon={Package}/>
        <KPI label="Proyectos con consumo" value={kpis.proyectosConConsumo} color="#8b5cf6" icon={FolderKanban}/>
        <KPI label="Pendientes por despachar" value={kpis.pendientes} color={kpis.pendientes > 0 ? '#f59e0b' : '#22c55e'} icon={Clock}/>
      </div>

      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">Comparativo mensual</div>
        {comparativoMensual.length === 0 ? (
          <div className="text-[12px] text-[#5f6f80] text-center py-8">Sin datos en el período seleccionado.</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={comparativoMensual}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)"/>
              <XAxis dataKey="label" stroke="#5f6f80" fontSize={11}/>
              <YAxis stroke="#5f6f80" fontSize={11} width={50}/>
              <Tooltip contentStyle={TT} formatter={v => formatCurrency(v, simboloMoneda)}/>
              <Bar dataKey="valor" fill="#00c896" radius={[4, 4, 0, 0]}/>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-4">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">Por proyecto</div>
          {isLoading ? <div className="text-[12px] text-[#5f6f80] text-center py-6">Cargando...</div>
            : porProyecto.length === 0 ? <div className="text-[12px] text-[#5f6f80] text-center py-6">Sin movimientos en el período.</div>
            : (
              <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                {porProyecto.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-[12px] py-1.5 border-b border-white/5 last:border-0">
                    <div className="min-w-0">
                      <div className={`truncate ${r.nombre === 'Sin proyecto asignado' ? 'text-[#5f6f80] italic' : 'text-[#e8edf2]'}`}>{r.nombre}</div>
                      <div className="text-[#5f6f80] truncate">{r.cdr} · {r.cliente}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[#00c896] font-mono font-semibold">{formatCurrency(r.valor, simboloMoneda)}</div>
                      <div className="text-[#5f6f80] text-[11px]">{r.cantidad} mov.</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>

        <div className="bg-[#161d28] border border-white/8 rounded-xl p-4">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">Por CDR</div>
          {porCDR.length === 0 ? <div className="text-[12px] text-[#5f6f80] text-center py-6">Sin movimientos en el período.</div> : (
            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
              {porCDR.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-[12px] py-1.5 border-b border-white/5 last:border-0">
                  <div className="text-[#e8edf2] truncate">{r.nombre}</div>
                  <div className="text-right shrink-0">
                    <div className="text-[#00c896] font-mono font-semibold">{formatCurrency(r.valor, simboloMoneda)}</div>
                    <div className="text-[#5f6f80] text-[11px]">{r.cantidad} mov.</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-4">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">Por área solicitante</div>
          {porArea.length === 0 ? <div className="text-[12px] text-[#5f6f80] text-center py-6">Sin movimientos en el período.</div> : (
            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
              {porArea.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-[12px] py-1.5 border-b border-white/5 last:border-0">
                  <div className="text-[#e8edf2] truncate">{r.nombre}</div>
                  <div className="text-right shrink-0">
                    <div className="text-[#00c896] font-mono font-semibold">{formatCurrency(r.valor, simboloMoneda)}</div>
                    <div className="text-[#5f6f80] text-[11px]">{r.cantidad} mov.</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#161d28] border border-white/8 rounded-xl p-4">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">Pendientes por despachar</div>
          {pendientes.length === 0 ? (
            <div className="text-[12px] text-[#5f6f80] text-center py-6">No hay pedidos de proyecto pendientes. 🎉</div>
          ) : (
            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
              {pendientes.map(p => (
                <div key={p.id} className="flex items-center justify-between text-[12px] py-1.5 border-b border-white/5 last:border-0">
                  <div className="min-w-0">
                    <div className="font-mono text-[#e8edf2]">{p.numero}</div>
                    <div className="text-[#5f6f80] truncate">{p.proyecto?.codigo} — {p.proyecto?.nombre} · {p.area?.nombre}</div>
                  </div>
                  <Badge variant="warning">{p.estado}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
