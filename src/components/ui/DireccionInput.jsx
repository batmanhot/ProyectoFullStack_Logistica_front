/**
 * DireccionInput.jsx — Campo de dirección con geocodificación dual
 *
 * MODO ONLINE  → Autocompletado en tiempo real con Nominatim (OSM), sin API key.
 *                Debounce 600ms · Restringido a Perú · Validación visual.
 *
 * MODO OFFLINE → Si no hay internet (o Nominatim falla), cambia automáticamente
 *                al dataset local de distritos peruanos (INEI).
 *                Cubre los 1874 distritos del Perú con coordenadas aproximadas.
 *                Permite escribir "Miraflores", "San Isidro Lima", "Cusco", etc.
 *                y obtener la ubicación sin necesidad de conexión.
 *
 * El modo activo se indica con un badge pequeño junto al input.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, CheckCircle, AlertCircle, Loader, Wifi, WifiOff } from 'lucide-react'
import { buscarDistritosOffline } from '../../data/distritosPeruanos'

const SI_BASE = 'w-full px-3 py-2 bg-[#1e2835] border rounded-lg text-[13px] text-[#e8edf2] outline-none focus:ring-2 font-[inherit] placeholder-[#5f6f80] transition-all pr-9'

export default function DireccionInput({
  value,
  onChange,
  placeholder = 'Ej: Av. Javier Prado 1520, San Isidro, Lima',
  label = 'Dirección',
  required = false,
}) {
  const [query,        setQuery]        = useState(value || '')
  const [sugerencias,  setSugerencias]  = useState([])
  const [estado,       setEstado]       = useState('idle') // idle|buscando|valida|invalida
  const [abierto,      setAbierto]      = useState(false)
  const [seleccionado, setSeleccionado] = useState(!!value)
  const [modoOffline,  setModoOffline]  = useState(!navigator.onLine)

  const debounceRef = useRef(null)
  const inputRef    = useRef(null)
  const dropRef     = useRef(null)

  // ── Detectar cambios de conectividad en tiempo real ────
  useEffect(() => {
    const goOnline  = () => setModoOffline(false)
    const goOffline = () => setModoOffline(true)
    window.addEventListener('online',  goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online',  goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  // ── Sincronizar si el padre cambia value ───────────────
  useEffect(() => {
    if (value && value !== query) {
      setQuery(value)
      setSeleccionado(true)
      setEstado('valida')
    }
  }, [value])

  // ── Cerrar dropdown al clic fuera ──────────────────────
  useEffect(() => {
    function handler(e) {
      if (dropRef.current  && !dropRef.current.contains(e.target) &&
          inputRef.current  && !inputRef.current.contains(e.target)) {
        setAbierto(false)
        if (query && !seleccionado) validarDireccion(query)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [query, seleccionado])

  // ── Búsqueda ONLINE con Nominatim ─────────────────────
  const buscarOnline = useCallback(async (texto) => {
    if (texto.length < 6) { setSugerencias([]); setEstado('idle'); return }
    setEstado('buscando')
    try {
      const q = encodeURIComponent(texto + ', Perú')
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${q}&countrycodes=pe&addressdetails=1`,
        { headers: { 'Accept-Language': 'es', 'User-Agent': 'StockPro/1.0' },
          signal: AbortSignal.timeout(5000) }
      )
      const d = await r.json()
      if (d?.length > 0) {
        setSugerencias(d.map(item => ({
          display: formatearDireccion(item),
          lat: item.lat,
          lon: item.lon,
          fuente: 'nominatim',
        })))
        setAbierto(true)
        setEstado('idle')
      } else {
        setSugerencias([])
        setAbierto(false)
        setEstado('invalida')
      }
    } catch {
      // Si Nominatim falla, caer a offline
      setModoOffline(true)
      buscarOffline(texto)
    }
  }, [])

  // ── Búsqueda OFFLINE con dataset INEI ─────────────────
  const buscarOffline = useCallback((texto) => {
    if (texto.length < 3) { setSugerencias([]); setEstado('idle'); return }
    setEstado('buscando')
    const resultados = buscarDistritosOffline(texto, 6)
    if (resultados.length > 0) {
      setSugerencias(resultados.map(r => ({
        display:   r.display,
        lat:       r.lat,
        lon:       r.lon,
        ubigeo:    r.ubigeo,
        distrito:  r.distrito,
        provincia: r.provincia,
        fuente:    'offline',
      })))
      setAbierto(true)
      setEstado('idle')
    } else {
      setSugerencias([])
      setAbierto(false)
      setEstado('invalida')
    }
  }, [])

  // ── Validar dirección (al salir del campo sin seleccionar) ─
  async function validarDireccion(texto) {
    if (!texto || texto.length < 4) return
    if (modoOffline) {
      const r = buscarDistritosOffline(texto, 1)
      setEstado(r.length > 0 ? 'valida' : 'invalida')
      return
    }
    setEstado('buscando')
    try {
      const q = encodeURIComponent(texto + ', Perú')
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}&countrycodes=pe`,
        { headers: { 'Accept-Language': 'es', 'User-Agent': 'StockPro/1.0' },
          signal: AbortSignal.timeout(4000) }
      )
      const d = await r.json()
      setEstado(d?.length > 0 ? 'valida' : 'invalida')
    } catch {
      setModoOffline(true)
      const r = buscarDistritosOffline(texto, 1)
      setEstado(r.length > 0 ? 'valida' : 'invalida')
    }
  }

  function formatearDireccion(item) {
    const a = item.address || {}
    const partes = []
    if (a.road)         partes.push(a.road)
    if (a.house_number) partes.push(a.house_number)
    if (a.suburb || a.neighbourhood) partes.push(a.suburb || a.neighbourhood)
    if (a.city_district || a.town || a.city) partes.push(a.city_district || a.town || a.city)
    return partes.length >= 2
      ? partes.join(', ')
      : item.display_name.split(',').slice(0, 3).join(',').trim()
  }

  function handleChange(e) {
    const val = e.target.value
    setQuery(val)
    setSeleccionado(false)
    setEstado('idle')
    onChange(val)

    clearTimeout(debounceRef.current)
    const minLen = modoOffline ? 3 : 6
    if (val.length >= minLen) {
      debounceRef.current = setTimeout(() => {
        modoOffline ? buscarOffline(val) : buscarOnline(val)
      }, modoOffline ? 200 : 600)
    } else {
      setSugerencias([])
      setAbierto(false)
    }
  }

  function handleSelect(sug) {
    setQuery(sug.display)
    setSeleccionado(true)
    setEstado('valida')
    setSugerencias([])
    setAbierto(false)
    onChange(sug.display)
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') { setAbierto(false); setSugerencias([]) }
  }

  const borderClass =
    estado === 'valida'   ? 'border-green-500 focus:border-green-400 focus:ring-green-500/20'   :
    estado === 'invalida' ? 'border-red-500   focus:border-red-400   focus:ring-red-500/20'     :
    estado === 'buscando' ? 'border-blue-400  focus:border-blue-400  focus:ring-blue-400/20'    :
                            'border-white/[0.08] focus:border-[#00c896] focus:ring-[#00c896]/20'

  return (
    <div className="flex flex-col gap-1">
      {/* Label + badge modo */}
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
            {label}{required && <span className="text-red-400 ml-0.5">*</span>}
          </label>
          {/* Badge online/offline */}
          <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide
            ${modoOffline
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              : 'bg-[#00c896]/10 text-[#00c896] border border-[#00c896]/20'}`}>
            {modoOffline
              ? <><WifiOff size={8}/> Offline · INEI</>
              : <><Wifi size={8}/> Online · OSM</>}
          </div>
        </div>
      )}

      <div className="relative">
        <MapPin size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none z-10"/>

        <input
          ref={inputRef}
          type="text"
          className={`${SI_BASE} pl-8 ${borderClass}`}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => sugerencias.length > 0 && setAbierto(true)}
          placeholder={modoOffline ? 'Ej: San Isidro, Lima · Miraflores · Cusco' : placeholder}
          autoComplete="off"
        />

        {/* Ícono de estado */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
          {estado === 'buscando' && <Loader size={13} className="text-blue-400 animate-spin"/>}
          {estado === 'valida'   && <CheckCircle size={13} className="text-green-400"/>}
          {estado === 'invalida' && <AlertCircle size={13} className="text-red-400"/>}
        </div>

        {/* Dropdown de sugerencias */}
        {abierto && sugerencias.length > 0 && (
          <div ref={dropRef}
            className="absolute top-full left-0 right-0 mt-1 bg-[#1a2230] border border-white/[0.12] rounded-xl shadow-2xl z-[9999] overflow-hidden">
            <div className="px-3 py-1.5 border-b border-white/[0.06] flex items-center gap-1.5">
              {modoOffline
                ? <><WifiOff size={9} className="text-amber-400"/>
                    <span className="text-[10px] text-amber-400 uppercase tracking-wide font-semibold">
                      Modo offline — dataset INEI
                    </span></>
                : <><MapPin size={9} className="text-[#00c896]"/>
                    <span className="text-[10px] text-[#5f6f80] uppercase tracking-wide font-semibold">
                      Sugerencias — clic para seleccionar
                    </span></>}
            </div>

            {sugerencias.map((sug, i) => (
              <button key={i} type="button"
                className="w-full flex items-start gap-2.5 px-3 py-2.5 hover:bg-[#00c896]/10 transition-colors text-left border-b border-white/[0.04] last:border-0"
                onMouseDown={e => { e.preventDefault(); handleSelect(sug) }}>
                <MapPin size={12} className={`shrink-0 mt-0.5 ${modoOffline ? 'text-amber-400' : 'text-[#00c896]'}`}/>
                <div>
                  <div className="text-[12px] text-[#e8edf2] leading-snug">{sug.display}</div>
                  {sug.fuente === 'offline' && (
                    <div className="text-[10px] text-[#5f6f80] mt-0.5">
                      Ubigeo: {sug.ubigeo} · {sug.lat?.toFixed(4)}, {sug.lon?.toFixed(4)}
                    </div>
                  )}
                </div>
              </button>
            ))}

            <div className="px-3 py-1.5 text-[10px] border-t border-white/[0.04]">
              {modoOffline
                ? <span className="text-amber-400/70">Dataset INEI offline — {sugerencias.length} resultados · Perú</span>
                : <span className="text-[#3d4f60]">Fuente: OpenStreetMap · Nominatim</span>}
            </div>
          </div>
        )}
      </div>

      {/* Mensaje de estado */}
      {estado === 'valida' && (
        <p className="text-[11px] text-green-400 flex items-center gap-1">
          <CheckCircle size={10}/>
          {modoOffline
            ? 'Distrito encontrado en dataset INEI'
            : 'Dirección verificada — aparecerá correctamente en el mapa'}
        </p>
      )}
      {estado === 'invalida' && (
        <p className="text-[11px] text-red-400 flex items-center gap-1">
          <AlertCircle size={10}/>
          {modoOffline
            ? 'Distrito no encontrado. Prueba: Miraflores · San Isidro · La Molina'
            : 'Dirección no encontrada. Formato: Av./Jr./Calle + número + distrito'}
        </p>
      )}
      {modoOffline && estado === 'idle' && !seleccionado && (
        <p className="text-[11px] text-amber-400/80 flex items-center gap-1">
          <WifiOff size={10}/> Sin conexión — usando dataset offline INEI ({'>'}1800 distritos peruanos)
        </p>
      )}
    </div>
  )
}
