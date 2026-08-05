/**
 * PdfSharePanel.jsx — v3: soporta múltiples destinatarios agrupados
 *
 * "Generar PDF" es una acción única (el documento es el mismo sin importar
 * quién lo reciba). WhatsApp/Correo se agrupan por destinatario — necesario
 * desde que Despachos comparte la Guía de Remisión con dos audiencias
 * distintas (transportista y cliente), cada una con su propio teléfono/email
 * y su propio mensaje. Se pasa un array `destinatarios`:
 *   [{ label:'Transportista', nombre:'Juan Pérez', whatsapp, mailto }, …]
 *
 * Compatibilidad: si no se pasa `destinatarios`, cae a la API anterior
 * `extra={{ whatsapp, mailto }}` (un solo destinatario sin agrupar) — usada
 * hoy por Cotizaciones.jsx y Ordenes.jsx (proveedor).
 */
import { FileText, MessageCircle, Mail, Copy, Check } from 'lucide-react'
import { useState } from 'react'

export default function PdfSharePanel({ onClose, onPrint, numero, tipo = 'documento', extra = null, destinatarios = null }) {
  const [copied, setCopied] = useState(false)

  function copiarNumero() {
    navigator.clipboard?.writeText(numero).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
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
        const canales = [
          g.whatsapp && { key: 'wa',   Icon: MessageCircle, label: 'WhatsApp', color: '#22c55e', bg: 'bg-green-500/10', bgHover: 'hover:bg-green-500/15 hover:border-green-500/40', href: g.whatsapp },
          g.mailto   && { key: 'mail', Icon: Mail,          label: 'Correo',   color: '#3b82f6', bg: 'bg-blue-500/10',  bgHover: 'hover:bg-blue-500/15 hover:border-blue-500/40',  href: g.mailto },
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
              {canales.map(c => (
                <a key={c.key} href={c.href} target="_blank" rel="noopener noreferrer"
                  className={`flex flex-col items-center text-center px-3 py-3 bg-[#1a2230] border border-white/7 rounded-xl transition-all cursor-pointer no-underline ${c.bgHover}`}>
                  <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center mb-2 transition-colors`}>
                    <c.Icon size={16} style={{ color: c.color }}/>
                  </div>
                  <div className="text-[12px] font-semibold text-[#e8edf2]">{c.label}</div>
                </a>
              ))}
            </div>
          </div>
        )
      })}

      {/* Nota mínima — solo si no hay backend */}
      <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-500/6 border border-amber-500/15 rounded-lg">
        <div className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 shrink-0"/>
        <p className="text-[11px] text-amber-300/70 leading-relaxed">
          El envío automático se activará al conectar el backend. Por ahora el usuario adjunta el PDF manualmente.
        </p>
      </div>

    </div>
  )
}
