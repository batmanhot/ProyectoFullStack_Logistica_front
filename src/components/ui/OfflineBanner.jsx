import { useState } from 'react'
import { WifiOff, RefreshCw, Clock } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import OfflineQueueModal from './OfflineQueueModal'

export default function OfflineBanner({ collapsed }) {
  const { online, pendientesSinc, refrescarPendientes } = useApp()
  const [modalAbierto, setModalAbierto] = useState(false)

  if (online && pendientesSinc === 0) return null

  function abrirModal() { setModalAbierto(true) }
  function cerrarModal() { setModalAbierto(false) }

  function handleActualizar() {
    refrescarPendientes()
  }

  // ── Modo colapsado — ícono con badge ──────────────────
  if (collapsed) {
    return (
      <>
        <div className="px-2 py-1 flex justify-center">
          <button
            onClick={abrirModal}
            className="w-8 h-8 flex items-center justify-center rounded-lg relative transition-opacity hover:opacity-80"
            title={online ? `${pendientesSinc} operaciones pendientes — clic para ver` : 'Sin conexión a internet'}
            style={{ background: online ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)', border: 'none', cursor: 'pointer' }}
          >
            {online
              ? <Clock   size={14} style={{ color: '#f59e0b' }} />
              : <WifiOff size={14} style={{ color: '#ef4444' }} />}
            {pendientesSinc > 0 && (
              <span style={{
                position: 'absolute', top: -2, right: -2,
                width: 14, height: 14, borderRadius: '50%',
                background: '#ef4444', color: '#fff',
                fontSize: 8, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {pendientesSinc > 9 ? '9+' : pendientesSinc}
              </span>
            )}
          </button>
        </div>

        {modalAbierto && (
          <OfflineQueueModal onClose={cerrarModal} onActualizar={handleActualizar} />
        )}
      </>
    )
  }

  // ── Modo expandido — banner con botón ────────────────
  return (
    <>
      <div className="mx-3 my-1 rounded-lg overflow-hidden"
           style={{ background: online ? 'rgba(245,158,11,0.10)' : 'rgba(239,68,68,0.10)' }}>
        <button
          onClick={abrirModal}
          className="w-full flex items-center gap-2 px-3 py-2 text-left transition-opacity hover:opacity-80"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {online
            ? <RefreshCw size={12} style={{ color: '#f59e0b', flexShrink: 0 }} />
            : <WifiOff   size={12} style={{ color: '#ef4444', flexShrink: 0 }} />}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: online ? '#f59e0b' : '#ef4444' }}>
              {online ? 'Operaciones en cola' : 'Sin conexión'}
            </div>
            <div style={{ fontSize: 10, marginTop: 1, color: 'var(--sidebar-fg-muted)' }}>
              {online && pendientesSinc > 0
                ? `${pendientesSinc} ${pendientesSinc === 1 ? 'operación pendiente' : 'operaciones pendientes'} · ver detalle`
                : 'Los cambios se guardan localmente'}
            </div>
          </div>
        </button>
      </div>

      {modalAbierto && (
        <OfflineQueueModal onClose={cerrarModal} onActualizar={handleActualizar} />
      )}
    </>
  )
}
