import { WifiOff } from 'lucide-react'
import { useApp } from '../../store/AppContext'

export default function OfflineBanner({ collapsed }) {
  const { online } = useApp()

  if (online) return null

  if (collapsed) {
    return (
      <div className="px-2 py-1 flex justify-center">
        <div
          className="w-8 h-8 flex items-center justify-center rounded-lg"
          title="Sin conexión a internet"
          style={{ background: 'rgba(239,68,68,0.15)' }}
        >
          <WifiOff size={14} style={{ color: '#ef4444' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-3 my-1 rounded-lg px-3 py-2"
         style={{ background: 'rgba(239,68,68,0.10)' }}>
      <div className="flex items-center gap-2">
        <WifiOff size={12} style={{ color: '#ef4444', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#ef4444' }}>Sin conexión</div>
          <div style={{ fontSize: 10, marginTop: 1, color: 'var(--sidebar-fg-muted)' }}>
            Los cambios no se guardarán hasta reconectar
          </div>
        </div>
      </div>
    </div>
  )
}
