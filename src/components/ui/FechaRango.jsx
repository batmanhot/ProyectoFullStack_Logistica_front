/**
 * FechaRango.jsx — Selector de rango de fechas dd/mm/aaaa
 * Sin dependencias externas. Formato peruano garantizado.
 * Emite valores en YYYY-MM-DD para filtros de string.
 */
import { useState, useRef, useEffect } from 'react'
import { Calendar, X } from 'lucide-react'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic']

function diasEnMes(mes, anio) {
  return new Date(anio, mes, 0).getDate()
}

// Un picker de fecha individual con dropdown de calendario
function DatePicker({ value, onChange, placeholder = 'dd/mm/aaaa', label }) {
  const [open, setOpen]   = useState(false)
  const ref               = useRef(null)

  // Parsear YYYY-MM-DD → {d, m, a}
  const parsed = value && value.length === 10
    ? { d: parseInt(value.slice(8,10)), m: parseInt(value.slice(5,7)), a: parseInt(value.slice(0,4)) }
    : null

  const [vistaM, setVistaM] = useState(parsed?.m || new Date().getMonth()+1)
  const [vistaA, setVistaA] = useState(parsed?.a || new Date().getFullYear())

  // Cerrar al clic fuera
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function seleccionarDia(dia) {
    const mm = String(vistaM).padStart(2,'0')
    const dd = String(dia).padStart(2,'0')
    onChange(`${dd}/${mm}/${vistaA}`)
    setOpen(false)
  }

  function limpiar(e) {
    e.stopPropagation()
    onChange('')
  }

  // Construir grilla de días
  function buildGrid() {
    const totalDias  = diasEnMes(vistaM, vistaA)
    const primerDia  = new Date(vistaA, vistaM-1, 1).getDay() // 0=Dom
    const offset     = primerDia === 0 ? 6 : primerDia - 1   // lunes=0
    const celdas     = []
    for (let i = 0; i < offset; i++) celdas.push(null)
    for (let d = 1; d <= totalDias; d++) celdas.push(d)
    return celdas
  }

  const display = parsed
    ? `${String(parsed.d).padStart(2,'0')}/${String(parsed.m).padStart(2,'0')}/${parsed.a}`
    : ''

  const hoy = new Date()
  const hoyD = hoy.getDate(), hoyM = hoy.getMonth()+1, hoyA = hoy.getFullYear()
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
        <div className="absolute top-full mt-1.5 z-[9999] bg-[#1a2230] border border-white/[0.12] rounded-xl shadow-2xl overflow-hidden"
          style={{ width: 248 }}>
          {/* Navegación mes/año */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.08]">
            <button onClick={() => {
              if (vistaM === 1) { setVistaM(12); setVistaA(a => a-1) }
              else setVistaM(m => m-1)
            }} className="w-6 h-6 flex items-center justify-center rounded text-[#5f6f80] hover:text-[#e8edf2] hover:bg-white/[0.06] text-[14px] font-bold transition-colors">
              ‹
            </button>
            <span className="text-[12px] font-semibold text-[#e8edf2]">
              {MESES[vistaM-1]} {vistaA}
            </span>
            <button onClick={() => {
              if (vistaM === 12) { setVistaM(1); setVistaA(a => a+1) }
              else setVistaM(m => m+1)
            }} className="w-6 h-6 flex items-center justify-center rounded text-[#5f6f80] hover:text-[#e8edf2] hover:bg-white/[0.06] text-[14px] font-bold transition-colors">
              ›
            </button>
          </div>

          {/* Cabecera días */}
          <div className="grid grid-cols-7 px-2 pt-2">
            {['Lu','Ma','Mi','Ju','Vi','Sa','Do'].map(d => (
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
                <button key={dia} onClick={() => seleccionarDia(dia)}
                  className={`w-full aspect-square flex items-center justify-center rounded-lg text-[12px] font-medium transition-all
                    ${esSeleccionado
                      ? 'bg-[#00c896] text-[#082e1e] font-bold shadow-[0_0_8px_rgba(0,200,150,0.4)]'
                      : esHoy
                        ? 'bg-[#00c896]/15 text-[#00c896] font-semibold'
                        : 'text-[#9ba8b6] hover:bg-white/[0.06] hover:text-[#e8edf2]'
                    }`}>
                  {dia}
                </button>
              )
            })}
          </div>

          {/* Ir a hoy */}
          <div className="px-2 pb-2 border-t border-white/[0.06] pt-1.5">
            <button
              onClick={() => { setVistaM(hoyM); setVistaA(hoyA); seleccionarDia(hoyD) }}
              className="w-full py-1.5 text-[11px] font-semibold text-[#00c896] hover:bg-[#00c896]/10 rounded-lg transition-colors">
              Hoy
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Componente de rango (Desde + Hasta)
export default function FechaRango({ desde, hasta, onDesde, onHasta, className = '' }) {
  return (
    <div className={`flex items-end gap-2 ${className}`}>
      <DatePicker value={desde} onChange={onDesde} placeholder="dd/mm/aaaa" label="Desde"/>
      <DatePicker value={hasta} onChange={onHasta} placeholder="dd/mm/aaaa" label="Hasta"/>
    </div>
  )
}

// También exportar DatePicker individual
export { DatePicker }
