/**
 * DateInput.jsx
 * Input de fecha con formato dd/mm/aaaa (Perú / Latinoamérica).
 * - Muestra la fecha en formato dd/mm/aaaa visualmente
 * - Internamente maneja YYYY-MM-DD para compatibilidad con filtros
 * - Aplica máscara automática al escribir: 18/03/2026
 * - value y onChange usan formato YYYY-MM-DD (igual que <input type="date">)
 */
import { useState, useEffect, useRef } from 'react'
import { Calendar } from 'lucide-react'

export default function DateInput({
  value = '',           // YYYY-MM-DD
  onChange,             // fn(YYYY-MM-DD)
  placeholder = 'dd/mm/aaaa',
  className = '',
  style = {},
  title = '',
}) {
  // Convertir YYYY-MM-DD → dd/mm/aaaa para mostrar
  function toDisplay(iso) {
    if (!iso || iso.length < 10) return ''
    const [y, m, d] = iso.split('-')
    if (!y || !m || !d) return ''
    return `${d}/${m}/${y}`
  }

  // Convertir dd/mm/aaaa → YYYY-MM-DD para native date input
  function toNative(display) {
    if (!display || display.length < 10) return ''
    const [d, m, y] = display.split('/')
    return `${y}-${m}-${d}`
  }

  const [display, setDisplay] = useState(() => toDisplay(value))
  const inputRef = useRef(null)

  // Sincronizar cuando el padre cambia value externamente
  useEffect(() => {
    setDisplay(toDisplay(value))
  }, [value])

  function handleChange(e) {
    const raw   = e.target.value
    const digits = raw.replace(/\D/g, '').slice(0, 8)

    // Aplicar máscara dd/mm/aaaa
    let masked = ''
    if (digits.length <= 2) {
      masked = digits
    } else if (digits.length <= 4) {
      masked = digits.slice(0, 2) + '/' + digits.slice(2)
    } else {
      masked = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4)
    }

    setDisplay(masked)

    // Emitir solo si la fecha es completa y válida
    const iso = toISO(masked)
    if (iso) {
      onChange?.(iso)
    } else if (digits.length === 0) {
      onChange?.('')
    }
  }

  function handleBlur() {
    // Al salir: si está incompleto limpiar o reformatear
    const iso = toISO(display)
    if (iso) {
      setDisplay(toDisplay(iso))
      onChange?.(iso)
    } else if (display.trim() === '') {
      onChange?.('')
    }
  }

  // Al hacer clic en el ícono, abrir el date picker nativo oculto
  const nativeRef = useRef(null)

  function handleIconClick() {
    nativeRef.current?.showPicker?.()
    nativeRef.current?.click()
  }

  function handleNativeChange(e) {
    const iso = e.target.value // YYYY-MM-DD
    const [y, m, d] = iso.split('-')
    const display = `${d}/${m}/${y}`
    setDisplay(display)
    onChange?.(display)
  }

  return (
    <div className="relative inline-flex items-center" style={style}>
      {/* Input visible con máscara */}
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        title={title}
        className={`pr-8 ${className}`}
        maxLength={10}
        autoComplete="off"
      />

      {/* Ícono calendario — abre el picker nativo oculto */}
      <button
        type="button"
        onClick={handleIconClick}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] hover:text-[#9ba8b6] transition-colors"
        tabIndex={-1}
        title="Abrir calendario"
      >
        <Calendar size={13}/>
      </button>

      <input
        ref={nativeRef}
        type="date"
        value={toNative(value)}
        onChange={handleNativeChange}
        className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  )
}
