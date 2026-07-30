import { useState, useMemo } from 'react'
import { Fuel } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { formatDate, fechaHoy } from '../../utils/helpers'
import { useFlotaCombustible, useRegistrarCombustible } from '../../queries/flota.queries'
import { SI, SEL, toDateStr } from './constants'

// ════════════════════════════════════════════════════════
// TAB COMBUSTIBLE & KM
// ════════════════════════════════════════════════════════
export default function TabCombustible({ flota }) {
  const { toast } = useApp()
  const [modalOpen,  setModalOpen]  = useState(false)
  const [filtUnidad, setFiltUnidad] = useState('')
  const initForm = {
    vehiculoId: '', fecha: fechaHoy(), litros: '', costo: '',
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
            <select className={SEL} style={{ width: 200 }} value={filtUnidad} onChange={e => setFiltUnidad(e.target.value)}>
              <option value="">Todas las unidades</option>
              {flota.map(u => (
                <option key={u.id} value={u.id}>{u.placa} — {u.nombre}</option>
              ))}
            </select>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#00c896]/12 border border-[#00c896]/25 text-[#00c896] rounded-lg text-[12px] font-medium hover:bg-[#00c896]/20 transition-colors whitespace-nowrap">
              <Fuel size={13}/> Cargar combustible
            </button>
          </div>
        </div>

        {registros.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <Fuel size={36} className="text-[#3d4f60]"/>
            <div className="text-[13px] font-medium text-[#5f6f80]">Sin registros de combustible</div>
            <div className="text-[11px] text-[#3d4f60]">Usa el botón "Cargar combustible" para registrar el primer consumo.</div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/8">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr>
                  {['Fecha','Unidad','Litros','Costo','KM antes','KM después','KM recorridos','S/ / km','Tipo combustible'].map(h => (
                    <th key={h} className="bg-[#1a2230] px-3.5 py-2.5 text-left text-[10px] font-semibold text-[#5f6f80] uppercase border-b border-white/8 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registros.map(r => {
                  const km  = Number(r.kmRecorridos) || 0
                  const cpk = km > 0 && Number(r.costo) > 0 ? (Number(r.costo) / km).toFixed(2) : '—'
                  return (
                    <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/2">
                      <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#9ba8b6]">{formatDate(toDateStr(r.fecha))}</td>
                      <td className="px-3.5 py-2.5">
                        <div className="font-mono text-[11px] text-[#00c896] font-bold">{r.vehiculo?.placa || '—'}</div>
                        <div className="text-[10px] text-[#5f6f80]">{r.vehiculo?.nombre || ''}</div>
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-[#e8edf2]">{r.litros} L</td>
                      <td className="px-3.5 py-2.5 font-mono text-red-400 font-semibold">S/ {Number(r.costo).toFixed(2)}</td>
                      <td className="px-3.5 py-2.5 font-mono text-[#9ba8b6]">{r.kmAntes ? Number(r.kmAntes).toLocaleString() : '—'}</td>
                      <td className="px-3.5 py-2.5 font-mono text-[#9ba8b6]">{r.kmDespues ? Number(r.kmDespues).toLocaleString() : '—'}</td>
                      <td className="px-3.5 py-2.5 font-mono font-semibold text-[#00c896]">{km > 0 ? km.toLocaleString() + ' km' : '—'}</td>
                      <td className="px-3.5 py-2.5 font-mono text-amber-400">{cpk !== '—' ? 'S/ ' + cpk : '—'}</td>
                      <td className="px-3.5 py-2.5 text-[#9ba8b6]">{r.tipoCombustible || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
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
                  <select className={SEL} value={form.vehiculoId} onChange={e=>f('vehiculoId',e.target.value)}>
                    <option value="">Seleccionar unidad...</option>
                    {flota.filter(u => u.activo !== false).map(u => (
                      <option key={u.id} value={u.id}>{u.placa} — {u.nombre} ({u.tipo})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">Fecha</label>
                  <input type="date" className={SI} value={form.fecha} onChange={e=>f('fecha',e.target.value)}/>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">Tipo combustible</label>
                  <select className={SEL} value={form.tipoCombustible} onChange={e=>f('tipoCombustible',e.target.value)}>
                    {['Diesel','Gasolina 90','Gasolina 95','Gas natural','GLP'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">Litros cargados *</label>
                  <input type="number" className={SI} value={form.litros} onChange={e=>f('litros',e.target.value)} min="0" step="0.1" placeholder="0.0"/>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">Costo total (S/) *</label>
                  <input type="number" className={SI} value={form.costo} onChange={e=>f('costo',e.target.value)} min="0" step="0.01" placeholder="0.00"/>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">Odómetro al cargar (km)</label>
                  <input type="number" className={SI} value={form.kmAntes} onChange={e=>f('kmAntes',e.target.value)} min="0" placeholder="km antes del viaje"/>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">Odómetro al retornar (km)</label>
                  <input type="number" className={SI} value={form.kmDespues} onChange={e=>f('kmDespues',e.target.value)} min="0" placeholder="km al terminar"/>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">Grifo / Proveedor</label>
                  <input className={SI} value={form.proveedor} onChange={e=>f('proveedor',e.target.value)} placeholder="Nombre del grifo"/>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">Notas</label>
                  <input className={SI} value={form.notas} onChange={e=>f('notas',e.target.value)} placeholder="Observaciones opcionales"/>
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
