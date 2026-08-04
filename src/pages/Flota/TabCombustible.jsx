import { useState, useMemo } from 'react'
import { Fuel, Download, FileText } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { formatDate, fechaHoyISO } from '../../utils/helpers'
import { Btn, Input, Select, DataTable } from '../../components/ui/index'
import { useFlotaCombustible, useRegistrarCombustible } from '../../queries/flota.queries'
import { exportarCombustibleXLSX } from '../../utils/exportXLSX'
import { exportarCombustiblePDF } from '../../utils/exportPDF'
import { toDateStr } from './constants'

// ════════════════════════════════════════════════════════
// TAB COMBUSTIBLE & KM
// ════════════════════════════════════════════════════════
export default function TabCombustible({ flota }) {
  const { toast, sesion } = useApp()
  const [modalOpen,  setModalOpen]  = useState(false)
  const [filtUnidad, setFiltUnidad] = useState('')
  const initForm = {
    vehiculoId: '', fecha: fechaHoyISO(), litros: '', costo: '',
    kmAntes: '', kmDespues: '', tipoCombustible: 'Diesel', proveedor: '', notas: '',
  }
  const [form, setForm] = useState(initForm)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const { data: registros = [] } = useFlotaCombustible(
    filtUnidad ? { vehiculoId: filtUnidad } : {}
  )
  const registrarCombustible = useRegistrarCombustible()

  const kmRecorridos = (+form.kmDespues > +form.kmAntes) ? +form.kmDespues - +form.kmAntes : 0

  const kpis = useMemo(() => {
    const litros = registros.reduce((s, r) => s + (Number(r.litros)  || 0), 0)
    const costo  = registros.reduce((s, r) => s + (Number(r.costo)   || 0), 0)
    const km     = registros.reduce((s, r) => s + (Number(r.kmRecorridos) || 0), 0)
    return {
      litros:     litros.toFixed(1),
      costo:      costo.toFixed(2),
      km,
      costoPorKm: km > 0 ? (costo / km).toFixed(2) : '—',
    }
  }, [registros])

  async function handleGuardar() {
    const res = await registrarCombustible.mutateAsync({
      ...form,
      vehiculoId: form.vehiculoId,
      litros:     +form.litros,
      costo:      +form.costo,
      kmAntes:    form.kmAntes    ? +form.kmAntes    : undefined,
      kmDespues:  form.kmDespues  ? +form.kmDespues  : undefined,
    })
    if (res?.error) { toast(res.error, 'error'); return }
    setModalOpen(false)
    setForm(initForm)
    toast('Registro de combustible guardado', 'success')
  }

  return (
    <div className="flex flex-col gap-5">

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          { label:'Litros cargados',   val: kpis.litros + ' L',         color:'#3b82f6' },
          { label:'Gasto combustible', val: 'S/ ' + (+kpis.costo).toLocaleString('es-PE', {minimumFractionDigits:2}), color:'#ef4444' },
          { label:'Km recorridos',     val: kpis.km.toLocaleString() + ' km', color:'#00c896' },
          { label:'Costo por km',      val: kpis.costoPorKm !== '—' ? 'S/ ' + kpis.costoPorKm : '—', color:'#f59e0b' },
        ].map(({ label, val, color }) => (
          <div key={label} className="relative bg-[#161d28] border border-white/8 rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.75 rounded-t-xl" style={{ background: color }}/>
            <div className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.07em] mb-2">{label}</div>
            <div className="text-[17px] font-semibold font-mono" style={{ color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Tabla + Controles */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
            Registros de combustible
            <span className="ml-2 text-[#3d4f60] normal-case font-normal">({registros.length})</span>
          </span>
          <div className="flex gap-2">
            <Select className="w-auto" value={filtUnidad} onChange={e => setFiltUnidad(e.target.value)}>
              <option value="">Todas las unidades</option>
              {flota.map(u => (
                <option key={u.id} value={u.id}>{u.placa} — {u.nombre}</option>
              ))}
            </Select>
            <Btn variant="ghost" size="sm" onClick={() => exportarCombustibleXLSX(registros)}>
              <Download size={13}/> Excel
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => exportarCombustiblePDF(registros, sesion?.nombre)}>
              <FileText size={13}/> PDF
            </Btn>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#00c896]/12 border border-[#00c896]/25 text-[#00c896] rounded-lg text-[12px] font-medium hover:bg-[#00c896]/20 transition-colors whitespace-nowrap">
              <Fuel size={13}/> Cargar combustible
            </button>
          </div>
        </div>

        <DataTable
          rows={registros}
          rowKey={r => r.id}
          emptyIcon={Fuel}
          emptyTitle="Sin registros de combustible"
          emptyDescription='Usa el botón "Cargar combustible" para registrar el primer consumo.'
          columns={[
            { key: 'fecha', header: 'Fecha', render: r => <span className="font-mono text-[11px] text-[#9ba8b6]">{formatDate(toDateStr(r.fecha))}</span> },
            { key: 'unidad', header: 'Unidad', render: r => (
                <div>
                  <div className="font-mono text-[11px] text-[#00c896] font-bold">{r.vehiculo?.placa || '—'}</div>
                  <div className="text-[10px] text-[#5f6f80]">{r.vehiculo?.nombre || ''}</div>
                </div>
              ) },
            { key: 'litros', header: 'Litros', render: r => <span className="font-mono text-[#e8edf2]">{r.litros} L</span> },
            { key: 'costo', header: 'Costo', render: r => <span className="font-mono text-red-400 font-semibold">S/ {Number(r.costo).toFixed(2)}</span> },
            { key: 'kmAntes', header: 'KM antes', render: r => <span className="font-mono text-[#9ba8b6]">{r.kmAntes ? Number(r.kmAntes).toLocaleString() : '—'}</span> },
            { key: 'kmDespues', header: 'KM después', render: r => <span className="font-mono text-[#9ba8b6]">{r.kmDespues ? Number(r.kmDespues).toLocaleString() : '—'}</span> },
            { key: 'kmRecorridos', header: 'KM recorridos', render: r => {
                const km = Number(r.kmRecorridos) || 0
                return <span className="font-mono font-semibold text-[#00c896]">{km > 0 ? km.toLocaleString() + ' km' : '—'}</span>
              } },
            { key: 'cpk', header: 'S/ / km', render: r => {
                const km  = Number(r.kmRecorridos) || 0
                const cpk = km > 0 && Number(r.costo) > 0 ? (Number(r.costo) / km).toFixed(2) : '—'
                return <span className="font-mono text-amber-400">{cpk !== '—' ? 'S/ ' + cpk : '—'}</span>
              } },
            { key: 'tipoCombustible', header: 'Tipo combustible', render: r => <span className="text-[#9ba8b6]">{r.tipoCombustible || '—'}</span> },
          ]}
        />
      </div>

      {/* Modal cargar combustible */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#161d28] border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl animate-modal-in">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
              <span className="text-[15px] font-semibold text-[#e8edf2]">Registrar carga de combustible</span>
              <button onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-[#5f6f80] hover:text-[#e8edf2] hover:bg-white/5 text-[18px] leading-none">✕</button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="col-span-2">
                  <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">Unidad *</label>
                  <Select value={form.vehiculoId} onChange={e=>f('vehiculoId',e.target.value)}>
                    <option value="">Seleccionar unidad...</option>
                    {flota.filter(u => u.activo !== false).map(u => (
                      <option key={u.id} value={u.id}>{u.placa} — {u.nombre} ({u.tipo})</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">Fecha</label>
                  <Input type="date" value={form.fecha} onChange={e=>f('fecha',e.target.value)}/>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">Tipo combustible</label>
                  <Select value={form.tipoCombustible} onChange={e=>f('tipoCombustible',e.target.value)}>
                    {['Diesel','Gasolina 90','Gasolina 95','Gas natural','GLP'].map(t => <option key={t}>{t}</option>)}
                  </Select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">Litros cargados *</label>
                  <Input type="number" value={form.litros} onChange={e=>f('litros',e.target.value)} min="0" step="0.1" placeholder="0.0"/>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">Costo total (S/) *</label>
                  <Input type="number" value={form.costo} onChange={e=>f('costo',e.target.value)} min="0" step="0.01" placeholder="0.00"/>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">Odómetro al cargar (km)</label>
                  <Input type="number" value={form.kmAntes} onChange={e=>f('kmAntes',e.target.value)} min="0" placeholder="km antes del viaje"/>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">Odómetro al retornar (km)</label>
                  <Input type="number" value={form.kmDespues} onChange={e=>f('kmDespues',e.target.value)} min="0" placeholder="km al terminar"/>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">Grifo / Proveedor</label>
                  <Input value={form.proveedor} onChange={e=>f('proveedor',e.target.value)} placeholder="Nombre del grifo"/>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">Notas</label>
                  <Input value={form.notas} onChange={e=>f('notas',e.target.value)} placeholder="Observaciones opcionales"/>
                </div>
              </div>

              {kmRecorridos > 0 && (
                <div className="grid grid-cols-2 gap-3 px-4 py-3 bg-[#00c896]/8 rounded-xl border border-[#00c896]/20">
                  <div className="text-center">
                    <div className="text-[10px] text-[#5f6f80] mb-1 uppercase tracking-wide">KM recorridos</div>
                    <div className="text-[20px] font-bold text-[#00c896]">{kmRecorridos.toLocaleString()} km</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-[#5f6f80] mb-1 uppercase tracking-wide">Costo por km</div>
                    <div className="text-[20px] font-bold text-amber-400">
                      {+form.costo > 0 ? 'S/ ' + (+form.costo / kmRecorridos).toFixed(2) : '—'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-white/8">
              <button onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-[13px] text-[#9ba8b6] border border-white/8 rounded-lg hover:bg-white/4 transition-colors">
                Cancelar
              </button>
              <button
                disabled={!form.vehiculoId || !form.litros || !form.costo}
                onClick={handleGuardar}
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium bg-[#00c896]/15 border border-[#00c896]/30 text-[#00c896] rounded-lg hover:bg-[#00c896]/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <Fuel size={13}/> Guardar registro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
