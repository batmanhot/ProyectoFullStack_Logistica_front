/**
 * PdfSharePanel.jsx
 * Panel de acciones: Generar PDF · Enviar por WhatsApp · Enviar por Correo
 * El PDF se genera en el navegador (window.print) con CSS @media print.
 * El envío lo hace el usuario manualmente — el sistema abre los links prefilled.
 */
import { FileText, MessageCircle, Mail, Printer, X } from 'lucide-react'

export default function PdfSharePanel({ onClose, onPrint, numero, tipo = 'documento', extra = null }) {
  return (
    <div className="flex flex-col gap-3">

      {/* Título */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <div className="text-[14px] font-semibold text-[#e8edf2]">Compartir {tipo}</div>
          <div className="text-[12px] text-[#5f6f80] mt-0.5">{numero}</div>
        </div>
        {onClose && (
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-[#5f6f80] hover:text-[#9ba8b6] hover:bg-white/[0.05] transition-colors">
            <X size={14}/>
          </button>
        )}
      </div>

      {/* Nota */}
      <div className="px-3.5 py-3 bg-amber-500/[0.08] border border-amber-500/20 rounded-xl text-[12px] text-amber-300 leading-relaxed">
        <span className="font-semibold">Nota:</span> El envío es manual — el sistema genera el PDF y abre WhatsApp/Correo con el asunto prellenado. El usuario adjunta el PDF y lo envía.
      </div>

      {/* Botones de acción */}
      <div className="flex flex-col gap-2">

        {/* Generar / Imprimir PDF */}
        <button
          onClick={onPrint}
          className="flex items-center gap-3 px-4 py-3 bg-[#1a2230] border border-white/[0.08] rounded-xl hover:border-[#00c896]/40 hover:bg-[#00c896]/5 transition-all group text-left"
        >
          <div className="w-9 h-9 rounded-lg bg-[#00c896]/10 flex items-center justify-center shrink-0 group-hover:bg-[#00c896]/20 transition-colors">
            <FileText size={16} className="text-[#00c896]"/>
          </div>
          <div>
            <div className="text-[13px] font-medium text-[#e8edf2]">Generar PDF</div>
            <div className="text-[11px] text-[#5f6f80]">Abre la vista de impresión del navegador · Guardar como PDF</div>
          </div>
        </button>

        {/* WhatsApp */}
        {extra?.whatsapp && (
          <a
            href={extra.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 bg-[#1a2230] border border-white/[0.08] rounded-xl hover:border-green-500/40 hover:bg-green-500/5 transition-all group text-left no-underline"
          >
            <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0 group-hover:bg-green-500/20 transition-colors">
              <MessageCircle size={16} className="text-green-400"/>
            </div>
            <div>
              <div className="text-[13px] font-medium text-[#e8edf2]">Enviar por WhatsApp</div>
              <div className="text-[11px] text-[#5f6f80]">Abre WhatsApp Web · Adjunta el PDF generado</div>
            </div>
          </a>
        )}

        {/* Correo */}
        {extra?.mailto && (
          <a
            href={extra.mailto}
            className="flex items-center gap-3 px-4 py-3 bg-[#1a2230] border border-white/[0.08] rounded-xl hover:border-blue-500/40 hover:bg-blue-500/5 transition-all group text-left no-underline"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
              <Mail size={16} className="text-blue-400"/>
            </div>
            <div>
              <div className="text-[13px] font-medium text-[#e8edf2]">Enviar por Correo</div>
              <div className="text-[11px] text-[#5f6f80]">Abre el cliente de correo · Adjunta el PDF generado</div>
            </div>
          </a>
        )}

      </div>

      {/* Nota futura */}
      <p className="text-[11px] text-[#5f6f80] text-center leading-relaxed">
        El envío automático se habilitará cuando se conecte el backend.
        <br/>Por ahora el usuario realiza el envío de forma manual.
      </p>
    </div>
  )
}
