/**
 * MapaAlmacenes — mapa real (Leaflet + tiles de OpenStreetMap) con un pin por
 * almacén que tenga latitud/longitud cargada (Maestros → Almacenes). Sin eso
 * no hay nada que dibujar — se muestra un estado vacío en vez de un mapa en
 * blanco. Los pins se colorean con el mismo criterio de salud que las
 * tarjetas de abajo (verde/ámbar/rojo/gris).
 *
 * Aparte de la librería (bundleada, sirve de 'self'), los tiles vienen de
 * OpenStreetMap — es la única pieza que necesitó abrir la CSP (`img-src`,
 * ver vite.config.js). Sin API key, pero con la cuota gratuita/pública de
 * OSM: si el uso crece mucho, conviene pasar a un proveedor de pago.
 */
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin } from 'lucide-react'
import { formatCurrency } from '../../utils/helpers'

const CENTRO_PERU = [-9.19, -75.0152]
const COLOR_SALUD = { ok: '#22c55e', alerta: '#f59e0b', critico: '#ef4444', inactivo: '#5f6f80' }

function colorSalud(a) {
  if (!a.activo) return COLOR_SALUD.inactivo
  if (a.agotados > 0) return COLOR_SALUD.critico
  if (a.criticos > 0 || a.porVencer30d > 0) return COLOR_SALUD.alerta
  return COLOR_SALUD.ok
}

function iconoAlmacen(color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid #0e1117;box-shadow:0 0 0 3px ${color}40"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]))
}

export default function MapaAlmacenes({ almacenes, onAbrir }) {
  const containerRef = useRef(null)
  const conCoordenadas = (almacenes ?? []).filter(a => a.latitud != null && a.longitud != null)

  useEffect(() => {
    if (!containerRef.current || conCoordenadas.length === 0) return

    const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(CENTRO_PERU, 5)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map)

    const markers = conCoordenadas.map(a => {
      const marker = L.marker([Number(a.latitud), Number(a.longitud)], { icon: iconoAlmacen(colorSalud(a)) }).addTo(map)
      const alertas = [
        a.agotados > 0 && `${a.agotados} agotado${a.agotados === 1 ? '' : 's'}`,
        a.criticos > 0 && `${a.criticos} crítico${a.criticos === 1 ? '' : 's'}`,
      ].filter(Boolean).join(' · ') || 'En orden'
      const ubic = [a.ciudad, a.region].filter(Boolean).join(', ')
      marker.bindPopup(`
        <div style="font:12px/1.4 inherit;min-width:170px">
          <strong style="font-size:13px">${escapeHtml(a.nombre)}</strong><br/>
          ${ubic ? `<span style="color:#64748b">${escapeHtml(ubic)}</span><br/>` : ''}
          <span style="color:#334155">Valor stock: ${escapeHtml(formatCurrency(a.valorInventario))}</span><br/>
          <span style="color:${colorSalud(a)};font-weight:600">${escapeHtml(alertas)}</span>
        </div>
      `)
      marker.on('click', () => onAbrir?.(a))
      return marker
    })

    if (markers.length === 1) {
      map.setView(markers[0].getLatLng(), 12)
    } else {
      map.fitBounds(L.featureGroup(markers).getBounds().pad(0.25))
    }

    return () => map.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [almacenes])

  if (conCoordenadas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 h-[260px] text-center px-6">
        <MapPin size={22} className="text-[#5f6f80]"/>
        <p className="text-[12px] text-[#5f6f80] max-w-sm">
          Ningún almacén tiene coordenadas cargadas todavía. Agrégalas en <span className="text-[#9ba8b6]">Categorías y Almacenes</span> (Latitud / Longitud) para verlos en el mapa.
        </p>
      </div>
    )
  }

  return <div ref={containerRef} className="h-[280px] rounded-xl overflow-hidden"/>
}
