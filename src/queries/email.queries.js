import { useMutation } from '@tanstack/react-query'
import api from '../services/api'

/** Envía un documento (HTML ya armado por pdfTemplates.js) como PDF adjunto real por correo. */
export function useEnviarDocumentoEmail() {
  return useMutation({
    mutationFn: (payload) => api.post('/email/enviar-documento', payload),
  })
}

/** Solo genera el PDF (base64), sin enviarlo — usado por el flujo de WhatsApp. */
export function useGenerarPdf() {
  return useMutation({
    mutationFn: (payload) => api.post('/email/generar-pdf', payload),
  })
}
