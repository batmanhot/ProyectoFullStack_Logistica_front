/**
 * PdfSharePanel.jsx — v4: envío real de correo (adjunto PDF) + WhatsApp/mailto
 *
 * "Generar PDF" es una acción única (el documento es el mismo sin importar
 * quién lo reciba). WhatsApp/Correo se agrupan por destinatario — necesario
 * desde que Despachos comparte la Guía de Remisión con dos audiencias
 * distintas (transportista y cliente), cada una con su propio teléfono/email
 * y su propio mensaje. Se pasa un array `destinatarios`:
 *   [{ label:'Transportista', nombre:'Juan Pérez', whatsapp, email }, …]
 *
 * Correo real: si el destinatario trae `email` (y el caller pasó `getHtml` +
 * `asunto`), el botón de Correo envía el documento de verdad — POST
 * /email/enviar-documento, que re-renderiza el HTML a PDF y lo adjunta
 * (ver EmailService en el backend). Si en cambio trae `mailto` (compatibilidad
 * con Cotizaciones/Ordenes.jsx, que no siempre tienen un único destinatario
 * fijo), se mantiene el link mailto de siempre — sin envío automático.
 *
 * Compatibilidad: si no se pasa `destinatarios`, cae a la API anterior
 * `extra={{ whatsapp, mailto }}` (un solo destinatario sin agrupar).
 */
import { FileText, MessageCircle, Mail, Copy, Check, Loader2, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../../store/AppContext'
import { useEnviarDocumentoEmail } from '../../queries/email.queries'

export default function PdfSharePanel({
  onClose, onPrint, numero, tipo = 'documento', extra = null, destinatarios = null,
  getHtml = null, asunto = null, empresaNombre = null,
}) {
  const { toast } = useApp()
  const enviarEmail = useEnviarDocumentoEmail()
  const [copied, setCopied]     = useState(false)
  const [estados, setEstados]   = useState({}) // { [key]: 'enviando' | 'enviado' | 'error' }

  function copiarNumero() {
    navigator.clipboard?.writeText(numero).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function enviarCorreo(key, destinatario) {
    if (!getHtml) return
    setEstados(p => ({ ...p, [key]: 'enviando' }))
    const res = await enviarEmail.mutateAsync({
      destinatarioEmail: destinatario.email,
      destinatarioNombre: destinatario.nombre || undefined,
      asunto: asunto || `${tipo} ${numero}`,
      mensaje: destinatario.mensaje || undefined,
      tipoDocumento: tipo,
      empresaNombre: empresaNombre || undefined,
      html: getHtml(),
      numeroDocumento: numero,
    })
    if (res.error) {
      setEstados(p => ({ ...p, [key]: 'error' }))
      toast(res.error, 'error')
      return
    }
    setEstados(p => ({ ...p, [key]: 'enviado' }))
    toast(`Correo enviado a ${destinatario.email}`, 'success')
  }

  const grupos = destinatarios || (extra ? [{ label: null, whatsapp: extra.whatsapp, mailto: extra.mailto }] : [])

  return (
    <div className="flex flex-col gap-4">

      {/* Cabecera compacta */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#00c896]/10 flex items-center justify-center shrink-0">
          <FileText size={15} className="text-[#00c896]"/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-[#e8edf2] capitalize">{tipo}</div>
          <button
            onClick={copiarNumero}
            className="flex items-center gap-1.5 text-[11px] text-[#5f6f80] hover:text-[#00c896] transition-colors group"
            title="Copiar número">
            <span className="font-mono">{numero}</span>
            {copied
              ? <Check size={10} className="text-[#00c896]"/>
              : <Copy size={10} className="opacity-0 group-hover:opacity-100 transition-opacity"/>
            }
          </button>
        </div>
      </div>

      {/* Generar PDF — acción única, independiente del destinatario */}
      <button onClick={onPrint}
        className="w-full flex items-center gap-3 px-3.5 py-3 bg-[#1a2230] border border-white/7 rounded-xl hover:bg-[#00c896]/10 hover:border-[#00c896]/40 transition-all text-left">
        <div className="w-9 h-9 rounded-lg bg-[#00c896]/12 flex items-center justify-center shrink-0">
          <FileText size={16} className="text-[#00c896]"/>
        </div>
        <div>
          <div className="text-[12px] font-semibold text-[#e8edf2]">Generar PDF</div>
          <div className="text-[10px] text-[#5f6f80]">Imprimir / guardar</div>
        </div>
      </button>

      {/* Grupos por destinatario */}
      {grupos.map((g, i) => {
        const key = `${i}`
        const estado = estados[key]
        const puedeEnviarReal = !!(g.email && getHtml)

        const canales = [
          g.whatsapp && { tipo: 'wa', key: 'wa' },
          (puedeEnviarReal || g.mailto) && { tipo: 'correo', key: 'mail' },
        ].filter(Boolean)
        if (canales.length === 0) return null

        return (
          <div key={i} className="flex flex-col gap-1.5">
            {g.label && (
              <div className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-wide">
                {g.label}{g.nombre && ` · ${g.nombre}`}
              </div>
            )}
            <div className={`grid gap-2.5 ${canales.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {g.whatsapp && (
                <a href={g.whatsapp} target="_blank" rel="noopener noreferrer"
                  className="flex flex-col items-center text-center px-3 py-3 bg-[#1a2230] border border-white/7 rounded-xl transition-all cursor-pointer no-underline hover:bg-green-500/15 hover:border-green-500/40">
                  <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center mb-2 transition-colors">
                    <MessageCircle size={16} style={{ color: '#22c55e' }}/>
                  </div>
                  <div className="text-[12px] font-semibold text-[#e8edf2]">WhatsApp</div>
                </a>
              )}

              {puedeEnviarReal ? (
                <button type="button" onClick={() => enviarCorreo(key, g)} disabled={estado === 'enviando'}
                  className={`flex flex-col items-center text-center px-3 py-3 bg-[#1a2230] border rounded-xl transition-all cursor-pointer disabled:cursor-wait ${
                    estado === 'enviado' ? 'border-green-500/40 bg-green-500/10'
                    : estado === 'error' ? 'border-red-500/40 bg-red-500/10'
                    : 'border-white/7 hover:bg-blue-500/15 hover:border-blue-500/40'
                  }`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 transition-colors ${
                    estado === 'enviado' ? 'bg-green-500/15' : estado === 'error' ? 'bg-red-500/15' : 'bg-blue-500/10'
                  }`}>
                    {estado === 'enviando' && <Loader2 size={16} className="text-blue-400 animate-spin"/>}
                    {estado === 'enviado'  && <Check size={16} className="text-green-400"/>}
                    {estado === 'error'    && <AlertCircle size={16} className="text-red-400"/>}
                    {!estado && <Mail size={16} style={{ color: '#3b82f6' }}/>}
                  </div>
                  <div className="text-[12px] font-semibold text-[#e8edf2]">
                    {estado === 'enviando' ? 'Enviando...' : estado === 'enviado' ? 'Enviado ✓' : estado === 'error' ? 'Reintentar' : 'Correo'}
                  </div>
                  {estado === 'enviado' && <div className="text-[9px] text-green-400/80 mt-0.5 truncate max-w-full">{g.email}</div>}
                </button>
              ) : null}
              {!puedeEnviarReal && g.mailto && (
                <a href={g.mailto} target="_blank" rel="noopener noreferrer"
                  className="flex flex-col items-center text-center px-3 py-3 bg-[#1a2230] border border-white/7 rounded-xl transition-all cursor-pointer no-underline hover:bg-blue-500/15 hover:border-blue-500/40">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center mb-2 transition-colors">
                    <Mail size={16} style={{ color: '#3b82f6' }}/>
                  </div>
                  <div className="text-[12px] font-semibold text-[#e8edf2]">Correo</div>
                </a>
              )}
            </div>
          </div>
        )
      })}

    </div>
  )
}
