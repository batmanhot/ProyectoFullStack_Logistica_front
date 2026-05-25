import { useState } from 'react'
import { HardDrive, Download, ChevronUp, ChevronDown } from 'lucide-react'
import { NIVEL_COLOR } from '../../utils/storageMonitor'
import { useApp } from '../../store/AppContext'
import { exportarDatos } from '../../services/storage'

export default function StorageWidget({ collapsed }) {
  const { storageInfo, textoUltimoRespaldo, registrarRespaldo, refrescarStorage } = useApp()
  const [expandido, setExpandido] = useState(false)

  const { porcentaje, usadoMB, libreKB, nivel } = storageInfo
  const colores = NIVEL_COLOR[nivel]

  // Solo mostrar si el uso supera 30% o si hay alerta
  const mostrar = porcentaje >= 30 || nivel !== 'ok'
  if (!mostrar && !expandido) return null

  function handleExportar() {
    const { data } = exportarDatos()
    if (!data) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `stockpro_respaldo_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    registrarRespaldo()
    refrescarStorage()
  }

  if (collapsed) {
    // Modo colapsado — solo ícono con color de alerta
    if (nivel === 'ok' && porcentaje < 50) return null
    return (
      <div className="px-2 py-1 flex justify-center" title={`Almacenamiento: ${porcentaje}%`}>
        <div className="w-8 h-8 flex items-center justify-center rounded-lg"
          style={{ background: colores.bg }}>
          <HardDrive size={14} style={{ color: colores.text }}/>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 py-2">
      {/* Cabecera del widget */}
      <button
        onClick={() => setExpandido(v => !v)}
        className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5 transition-colors">
        <HardDrive size={13} style={{ color: colores.text, flexShrink: 0 }}/>
        <div className="flex-1 min-w-0">
          {/* Barra de progreso */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold" style={{ color: colores.text }}>
              Almacenamiento
            </span>
            <span className="text-[10px] font-bold" style={{ color: colores.text }}>
              {porcentaje}%
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${porcentaje}%`, background: colores.bar }}
            />
          </div>
        </div>
        <div style={{ color: 'var(--sidebar-fg-faint)', flexShrink: 0 }}>
          {expandido ? <ChevronUp size={11}/> : <ChevronDown size={11}/>}
        </div>
      </button>

      {/* Detalle expandido */}
      {expandido && (
        <div className="mt-1 px-2 pb-1 space-y-1.5">
          <div className="flex justify-between text-[10px]">
            <span style={{ color: 'var(--sidebar-fg-muted)' }}>Usado</span>
            <span style={{ color: 'var(--sidebar-fg)' }}>{usadoMB} MB</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span style={{ color: 'var(--sidebar-fg-muted)' }}>Disponible</span>
            <span style={{ color: 'var(--sidebar-fg)' }}>~{libreKB > 1024 ? `${(libreKB/1024).toFixed(1)} MB` : `${libreKB} KB`}</span>
          </div>
          <div className="text-[9.5px] italic" style={{ color: 'var(--sidebar-fg-faint)' }}>
            {textoUltimoRespaldo()}
          </div>
          <button
            onClick={handleExportar}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors hover:opacity-90 mt-1"
            style={{ background: colores.bg, color: colores.text }}>
            <Download size={11}/>
            Exportar respaldo
          </button>
        </div>
      )}
    </div>
  )
}
