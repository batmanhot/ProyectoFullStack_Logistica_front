/**
 * DireccionInput.jsx
 * Campo de dirección con:
 * - Autocompletado en tiempo real usando Nominatim (OSM) — sin API key
 * - Validación visual: verde = encontrada en mapa, rojo = no encontrada
 * - Restringido a Perú (countrycodes=pe)
 * - Debounce de 600ms para no saturar Nominatim
 * - Permite escribir libremente y seleccionar sugerencia del dropdown
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, CheckCircle, AlertCircle, Loader } from 'lucide-react'

const SI_BASE = 'w-full px-3 py-2 bg-[#1e2835] border rounded-lg text-[13px] text-[#e8edf2] outline-none focus:ring-2 font-[inherit] placeholder-[#5f6f80] transition-all pr-9'

export default function DireccionInput({
  value,
  onChange,
  placeholder = 'Ej: Av. Javier Prado 1520, San Isidro, Lima',
  label = 'Dirección',
  required = false,
}) {
  const [query,       setQuery]       = useState(value || '')
  const [sugerencias, setSugerencias] = useState([])
  const [estado,      setEstado]      = useState('idle') // idle | buscando | valida | invalida
  const [abierto,     setAbierto]     = useState(false)
  const [seleccionado,setSeleccionado]= useState(!!value)
  const debounceRef = useRef(null)
  const inputRef    = useRef(null)
  const dropRef     = useRef(null)

  // Sincronizar si el padre cambia value externamente
  useEffect(() => {
    if (value && value !== query) {
      setQuery(value)
      setSeleccionado(true)
      setEstado('valida')
    }
  }, [value])

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handler(e) {
      if (dropRef.current && !dropRef.current.contains(e.target) &&
          inputRef.current  && !inputRef.current.contains(e.target)) {
        setAbierto(false)
        // Si el usuario escribió pero no seleccionó, validar lo que quedó
        if (query && !seleccionado) validarDireccion(query)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [query, seleccionado])

  // Buscar sugerencias con debounce
  const buscarSugerencias = useCallback(async (texto) => {
    if (texto.length < 6) { setSugerencias([]); setEstado('idle'); return }
    setEstado('buscando')
    try {
      const q = encodeURIComponent(texto + ', Lima, Peru')
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${q}&countrycodes=pe&addressdetails=1`,
        { headers: { 'Accept-Language': 'es', 'User-Agent': 'StockPro/1.0' } }
      )
      const d = await r.json()
      if (d?.length > 0) {
        setSugerencias(d.map(item => ({
          display: formatearDireccion(item),
          raw:     item.display_name,
          lat:     item.lat,
          lon:     item.lon,
        })))
        setAbierto(true)
        setEstado('idle')
      } else {
        setSugerencias([])
        setAbierto(false)
        setEstado('invalida')
      }
    } catch {
      setSugerencias([])
      setEstado('idle')
    }
  }, [])

  // Validar dirección exacta (cuando el usuario sale del campo sin seleccionar)
  async function validarDireccion(texto) {
    if (!texto || texto.length < 6) return
    setEstado('buscando')
    try {
      const q = encodeURIComponent(texto + ', Lima, Peru')
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}&countrycodes=pe`,
        { headers: { 'Accept-Language': 'es', 'User-Agent': 'StockPro/1.0' } }
      )
      const d = await r.json()
      setEstado(d?.length > 0 ? 'valida' : 'invalida')
    } catch {
      setEstado('idle')
    }
  }

  function formatearDireccion(item) {
    const a = item.address || {}
    const partes = []
    if (a.road)           partes.push(a.road)
    if (a.house_number)   partes.push(a.house_number)
    if (a.suburb || a.neighbourhood) partes.push(a.suburb || a.neighbourhood)
    if (a.city_district || a.town || a.city) partes.push(a.city_district || a.town || a.city)
    return partes.length >= 2 ? partes.join(', ') : item.display_name.split(',').slice(0, 3).join(',').trim()
  }

  function handleChange(e) {
    const val = e.target.value
    setQuery(val)
    setSeleccionado(false)
    setEstado('idle')
    onChange(val) // notificar al padre inmediatamente

    clearTimeout(debounceRef.current)
    if (val.length >= 6) {
      debounceRef.current = setTimeout(() => buscarSugerencias(val), 600)
    } else {
      setSugerencias([])
      setAbierto(false)
    }
  }

  function handleSelect(sug) {
    const dir = sug.display
    setQuery(dir)
    setSeleccionado(true)
    setEstado('valida')
    setSugerencias([])
    setAbierto(false)
    onChange(dir)
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') { setAbierto(false); setSugerencias([]) }
  }

  // Estilos del borde según estado
  const borderClass =
    estado === 'valida'   ? 'border-green-500 focus:border-green-400 focus:ring-green-500/20' :
    estado === 'invalida' ? 'border-red-500   focus:border-red-400   focus:ring-red-500/20'   :
    estado === 'buscando' ? 'border-blue-500  focus:border-blue-400  focus:ring-blue-500/20'  :
                            'border-white/[0.08] focus:border-[#00c896] focus:ring-[#00c896]/20'

  return (
    <div className="flex flex-col gap-1">
      {/* Label */}
      {label && (
        <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Ícono izquierda */}
        <MapPin size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none z-10"/>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          className={`${SI_BASE} pl-8 ${borderClass}`}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => sugerencias.length > 0 && setAbierto(true)}
          placeholder={placeholder}
          autoComplete="off"
        />

        {/* Ícono estado derecha */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
          {estado === 'buscando' && (
            <Loader size={13} className="text-blue-400 animate-spin"/>
          )}
          {estado === 'valida' && (
            <CheckCircle size={13} className="text-green-400"/>
          )}
          {estado === 'invalida' && (
            <AlertCircle size={13} className="text-red-400"/>
          )}
        </div>

        {/* Dropdown de sugerencias */}
        {abierto && sugerencias.length > 0 && (
          <div
            ref={dropRef}
            className="absolute top-full left-0 right-0 mt-1 bg-[#1a2230] border border-white/[0.12] rounded-xl shadow-2xl z-[9999] overflow-hidden"
          >
            <div className="px-3 py-1.5 border-b border-white/[0.06] flex items-center gap-1.5">
              <MapPin size={10} className="text-[#00c896]"/>
              <span className="text-[10px] text-[#5f6f80] uppercase tracking-wide font-semibold">
                Sugerencias — click para seleccionar
              </span>
            </div>
            {sugerencias.map((sug, i) => (
              <button
                key={i}
                type="button"
                className="w-full flex items-start gap-2.5 px-3 py-2.5 hover:bg-[#00c896]/10 transition-colors text-left border-b border-white/[0.04] last:border-0"
                onMouseDown={e => { e.preventDefault(); handleSelect(sug) }}
              >
                <MapPin size={12} className="text-[#00c896] shrink-0 mt-0.5"/>
                <span className="text-[12px] text-[#e8edf2] leading-snug">{sug.display}</span>
              </button>
            ))}
            <div className="px-3 py-1.5 text-[10px] text-[#3d4f60] border-t border-white/[0.04]">
              Fuente: OpenStreetMap · Nominatim
            </div>
          </div>
        )}
      </div>

      {/* Mensaje de estado */}
      {estado === 'valida' && (
        <p className="text-[11px] text-green-400 flex items-center gap-1">
          <CheckCircle size={10}/> Dirección verificada — aparecerá correctamente en el mapa
        </p>
      )}
      {estado === 'invalida' && (
        <p className="text-[11px] text-red-400 flex items-center gap-1">
          <AlertCircle size={10}/> Dirección no encontrada en Lima. Usa el formato: Av./Jr./Calle + número + distrito
        </p>
      )}
      {estado === 'idle' && query.length >= 6 && !seleccionado && (
        <p className="text-[11px] text-[#5f6f80]">
          Escribe al menos 6 caracteres para ver sugerencias
        </p>
      )}
    </div>
  )
}
