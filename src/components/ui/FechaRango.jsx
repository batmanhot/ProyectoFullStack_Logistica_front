/**
 * FechaRango.jsx — Selector de rango de fechas formato peruano
 * • Muestra: DD/MM/AAAA  (visual, para el usuario)
 * • Emite:   YYYY-MM-DD  (interno, para filtros y comparaciones de strings)
 * Sin dependencias externas.
 */
import { useState, useRef, useEffect } from 'react'
import { Calendar, X } from 'lucide-react'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic']

function diasEnMes(mes, anio) {
  return new Date(anio, mes, 0).getDate()
}

// ── Conversiones ──────────────────────────────────────────
// YYYY-MM-DD → { d, m, a }  (lo que recibe el componente como value)
function parseISO(val) {
  if (!val || val.length < 10) return null
  // Acepta YYYY-MM-DD
  if (val[4] === '-') {
    const a = parseInt(val.slice(0,4))
    const m = parseInt(val.slice(5,7))
    const d = parseInt(val.slice(8,10))
    if (isNaN(a) || isNaN(m) || isNaN(d)) return null
    return { d, m, a }
  }
  return null
}

// { d, m, a } → YYYY-MM-DD  (lo que emite onChange)
function toISO(d, m, a) {
  return `${a}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

// YYYY-MM-DD → DD/MM/AAAA  (solo para mostrar)
function toDisplay(val) {
  const p = parseISO(val)
  if (!p) return ''
  return `${String(p.d).padStart(2,'0')}/${String(p.m).padStart(2,'0')}/${p.a}`
}

// ════════════════════════════════════════════════════════
// DatePicker individual
// ════════════════════════════════════════════════════════
function DatePicker({ value, onChange, placeholder = 'dd/mm/aaaa', label }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const parsed = parseISO(value)

  const [vistaM, setVistaM] = useState(() => parsed?.m || new Date().getMonth() + 1)
  const [vistaA, setVistaA] = useState(() => parsed?.a || new Date().getFullYear())

  // Sincronizar vista cuando cambia el value externamente
  useEffect(() => {
    const p = parseISO(value)
    if (p) { setVistaM(p.m); setVistaA(p.a) }
  }, [value])

  // Cerrar al clic fuera
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function seleccionarDia(dia) {
    // Emite YYYY-MM-DD
    onChange(toISO(dia, vistaM, vistaA))
    setOpen(false)
  }

  function limpiar(e) {
    e.stopPropagation()
    onChange('')
  }

  function buildGrid() {
    const totalDias = diasEnMes(vistaM, vistaA)
    const primerDia = new Date(vistaA, vistaM - 1, 1).getDay()
    const offset    = primerDia === 0 ? 6 : primerDia - 1
    const celdas    = []
    for (let i = 0; i < offset; i++) celdas.push(null)
    for (let d = 1; d <= totalDias; d++) celdas.push(d)
    return celdas
  }

  const display = toDisplay(value)  // siempre DD/MM/AAAA o ''
  const hoy  = new Date()
  const hoyD = hoy.getDate()
  const hoyM = hoy.getMonth() + 1
  const hoyA = hoy.getFullYear()
  const grid = buildGrid()

  return (
    <div ref={ref} className="relative flex flex-col gap-0.5">
      {label && (
        <span className="text-[9px] font-bold text-[#5f6f80] uppercase tracking-[0.1em] pl-0.5">{label}</span>
      )}

      {/* Campo visible */}
      <div
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-[7px] bg-[#1e2835] border rounded-lg cursor-pointer transition-all select-none
          ${open ? 'border-[#00c896] ring-2 ring-[#00c896]/20' : 'border-white/[0.08] hover:border-white/[0.18]'}`}
        style={{ width: 148, minWidth: 148 }}
      >
        <Calendar size={13} className={open ? 'text-[#00c896]' : 'text-[#5f6f80]'} />
        <span className={`flex-1 text-[13px] font-mono ${display ? 'text-[#e8edf2]' : 'text-[#5f6f80]'}`}>
          {display || placeholder}
        </span>
        {display && (
          <button onClick={limpiar} className="text-[#5f6f80] hover:text-red-400 transition-colors p-0.5 -mr-1">
            <X size={11}/>
          </button>
        )}
      </div>

      {/* Dropdown calendario */}
      {open && (
        <div
          className="absolute top-full mt-1.5 z-[9999] bg-[#1a2230] border border-white/[0.12] rounded-xl shadow-2xl overflow-hidden"
          style={{ width: 248 }}
        >
          {/* Navegación mes/año */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.08]">
            <button
              onClick={() => {
                if (vistaM === 1) { setVistaM(12); setVistaA(a => a - 1) }
                else setVistaM(m => m - 1)
              }}
              className="w-6 h-6 flex items-center justify-center rounded text-[#5f6f80] hover:text-[#e8edf2] hover:bg-white/[0.06] text-[16px] font-bold transition-colors"
            >‹</button>
            <span className="text-[12px] font-semibold text-[#e8edf2]">
              {MESES[vistaM - 1]} {vistaA}
            </span>
            <button
              onClick={() => {
                if (vistaM === 12) { setVistaM(1); setVistaA(a => a + 1) }
                else setVistaM(m => m + 1)
              }}
              className="w-6 h-6 flex items-center justify-center rounded text-[#5f6f80] hover:text-[#e8edf2] hover:bg-white/[0.06] text-[16px] font-bold transition-colors"
            >›</button>
          </div>

          {/* Cabecera días semana */}
          <div className="grid grid-cols-7 px-2 pt-2">
            {['Lu','Ma','Mi','Ju','Vi','Sá','Do'].map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-[#5f6f80] py-1">{d}</div>
            ))}
          </div>

          {/* Grilla de días */}
          <div className="grid grid-cols-7 gap-0.5 px-2 pb-2.5">
            {grid.map((dia, i) => {
              if (!dia) return <div key={`e-${i}`}/>
              const esSeleccionado = parsed?.d === dia && parsed?.m === vistaM && parsed?.a === vistaA
              const esHoy          = dia === hoyD && vistaM === hoyM && vistaA === hoyA
              return (
                <button
                  key={dia}
                  onClick={() => seleccionarDia(dia)}
                  className={`w-full aspect-square flex items-center justify-center rounded-lg text-[12px] font-medium transition-all
                    ${esSeleccionado
                      ? 'bg-[#00c896] text-[#082e1e] font-bold shadow-[0_0_8px_rgba(0,200,150,0.4)]'
                      : esHoy
                        ? 'bg-[#00c896]/15 text-[#00c896] font-semibold'
                        : 'text-[#9ba8b6] hover:bg-white/[0.06] hover:text-[#e8edf2]'
                    }`}
                >
                  {dia}
                </button>
              )
            })}
          </div>

          {/* Atajo hoy */}
          <div className="px-2 pb-2 border-t border-white/[0.06] pt-1.5">
            <button
              onClick={() => { setVistaM(hoyM); setVistaA(hoyA); seleccionarDia(hoyD) }}
              className="w-full py-1.5 text-[11px] font-semibold text-[#00c896] hover:bg-[#00c896]/10 rounded-lg transition-colors"
            >
              Hoy
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════
// Componente de rango exportado
// ════════════════════════════════════════════════════════
export default function FechaRango({ desde, hasta, onDesde, onHasta, className = '' }) {
  return (
    <div className={`flex items-end gap-2 ${className}`}>
      <DatePicker value={desde} onChange={onDesde} placeholder="dd/mm/aaaa" label="Desde"/>
      <DatePicker value={hasta} onChange={onHasta} placeholder="dd/mm/aaaa" label="Hasta"/>
    </div>
  )
}

export { DatePicker }
