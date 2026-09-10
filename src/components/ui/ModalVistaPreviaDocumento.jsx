import { useRef, useState } from 'react'
import { Printer, Download } from 'lucide-react'
import { Modal, Btn } from './index'
import { useGenerarPdf } from '../../queries/email.queries'
import { descargarPdfBase64 } from '../../utils/pdfTemplates'
import { useApp } from '../../store/AppContext'

/**
 * Vista previa de un documento imprimible (Vale de Salida, NDI, Orden de
 * Compra, Guía, etc.) antes de comprometerse a imprimir o descargar — evita
 * el flujo anterior de ir directo al diálogo de impresión del navegador sin
 * que el usuario pueda revisar el contenido primero.
 *
 * Recibe el mismo HTML que ya arman las funciones armarHtmlXXX de
 * pdfTemplates.js: este modal solo decide qué hacer con él (mostrarlo,
 * imprimirlo vía el iframe visible, o mandarlo a /email/generar-pdf para
 * descargarlo como archivo real).
 */
export function ModalVistaPreviaDocumento({ open, onClose, titulo, html, numeroDocumento, zIndex = 60 }) {
  const { toast } = useApp()
  const generarPdf = useGenerarPdf()
  const iframeRef = useRef(null)
  const [cargado, setCargado] = useState(false)

  function handleImprimir() {
    const win = iframeRef.current?.contentWindow
    if (!win) return
    win.focus()
    win.print()
  }

  async function handleDescargar() {
    const res = await generarPdf.mutateAsync({ html, numeroDocumento })
    if (res.error) { toast(res.error, 'error'); return }
    descargarPdfBase64(res.data.pdfBase64, res.data.nombreArchivo)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titulo || 'Vista previa'}
      size="xl"
      zIndex={zIndex}
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>Cerrar</Btn>
          <Btn variant="secondary" onClick={handleDescargar} disabled={!cargado || generarPdf.isPending}>
            <Download size={14}/> {generarPdf.isPending ? 'Generando...' : 'Descargar PDF'}
          </Btn>
          <Btn variant="primary" onClick={handleImprimir} disabled={!cargado}>
            <Printer size={14}/> Imprimir
          </Btn>
        </>
      }
    >
      <div className="rounded-xl overflow-hidden border border-[var(--border)] bg-white" style={{ height: '65vh' }}>
        <iframe
          ref={iframeRef}
          title={titulo || 'Vista previa'}
          srcDoc={html}
          onLoad={() => setCargado(true)}
          // Seguridad: el HTML interpola datos de negocio sin escapar. Sin
          // `allow-scripts` no ejecuta JS (ni `<script>` ni `on*=`); con
          // `allow-same-origin` + `allow-modals` el botón Imprimir sigue
          // funcionando (win.print() desde el padre).
          sandbox="allow-same-origin allow-modals"
          className="w-full h-full border-0"
        />
      </div>
    </Modal>
  )
}
