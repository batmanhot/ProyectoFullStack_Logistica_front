/**
 * PdfSharePanel.jsx — v2 optimizado
 * Compacto, sin nota redundante, acciones en fila horizontal con tooltip.
 */
import { FileText, MessageCircle, Mail, Copy, Check } from 'lucide-react'
import { useState } from 'react'

export default function PdfSharePanel({ onClose, onPrint, numero, tipo = 'documento', extra = null }) {
  const [copied, setCopied] = useState(false)

  function copiarNumero() {
    navigator.clipboard?.writeText(numero).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const acciones = [
    {
      key: 'pdf',
      Icon: FileText,
      label: 'Generar PDF',
      sublabel: 'Imprimir / guardar',
      color: '#00c896',
      bg: 'bg-[#00c896]/10',
      bgHover: 'hover:bg-[#00c896]/18 hover:border-[#00c896]/40',
      onClick: onPrint,
      href: null,
      show: true,
    },
    {
      key: 'wa',
      Icon: MessageCircle,
      label: 'WhatsApp',
      sublabel: 'Enviar al cliente',
      color: '#22c55e',
      bg: 'bg-green-500/10',
      bgHover: 'hover:bg-green-500/15 hover:border-green-500/40',
      onClick: null,
      href: extra?.whatsapp || null,
      show: !!extra?.whatsapp,
    },
    {
      key: 'mail',
      Icon: Mail,
      label: 'Correo',
      sublabel: 'Enviar por email',
      color: '#3b82f6',
      bg: 'bg-blue-500/10',
      bgHover: 'hover:bg-blue-500/15 hover:border-blue-500/40',
      onClick: null,
      href: extra?.mailto || null,
      show: !!extra?.mailto,
    },
  ].filter(a => a.show)

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

      {/* Acciones en grid */}
      <div className={`grid gap-2.5 ${acciones.length === 1 ? 'grid-cols-1' : acciones.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {acciones.map(a => {
          const Inner = (
            <>
              <div className={`w-10 h-10 rounded-xl ${a.bg} flex items-center justify-center mb-2.5 transition-colors`}>
                <a.Icon size={18} style={{ color: a.color }}/>
              </div>
              <div className="text-[12px] font-semibold text-[#e8edf2] leading-tight mb-0.5">{a.label}</div>
              <div className="text-[10px] text-[#5f6f80] leading-snug">{a.sublabel}</div>
            </>
          )

          const cls = `flex flex-col items-center text-center px-3 py-3.5 bg-[#1a2230] border border-white/[0.07] rounded-xl transition-all cursor-pointer ${a.bgHover}`

          return a.href ? (
            <a key={a.key} href={a.href} target="_blank" rel="noopener noreferrer"
              className={cls + ' no-underline'}>
              {Inner}
            </a>
          ) : (
            <button key={a.key} onClick={a.onClick} className={cls}>
              {Inner}
            </button>
          )
        })}
      </div>

      {/* Nota mínima — solo si no hay backend */}
      <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-500/[0.06] border border-amber-500/15 rounded-lg">
        <div className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 shrink-0"/>
        <p className="text-[11px] text-amber-300/70 leading-relaxed">
          El envío automático se activará al conectar el backend. Por ahora el usuario adjunta el PDF manualmente.
        </p>
      </div>

    </div>
  )
}
