import { createRoot } from 'react-dom/client'
import ExportPreviewModal from '../components/ui/ExportPreviewModal'

/**
 * Muestra un modal de vista previa antes de exportar.
 * Retorna true si el usuario confirma, false si cancela.
 */
export function mostrarPreviewExport({ titulo, cabeceras, filas, totales = null, empresa = '', tipo }) {
  return new Promise((resolve) => {
    const container = document.createElement('div')
    container.setAttribute('data-export-preview', '1')
    document.body.appendChild(container)
    const root = createRoot(container)

    function cleanup() {
      root.unmount()
      setTimeout(() => {
        if (document.body.contains(container)) document.body.removeChild(container)
      }, 50)
    }

    root.render(
      <ExportPreviewModal
        titulo={titulo}
        cabeceras={cabeceras}
        filas={filas}
        totales={totales}
        empresa={empresa}
        tipo={tipo}
        onConfirm={() => { cleanup(); resolve(true) }}
        onClose={() => { cleanup(); resolve(false) }}
      />
    )
  })
}
