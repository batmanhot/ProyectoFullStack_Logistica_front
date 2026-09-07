import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HelpCircle, ArrowRight } from 'lucide-react'
import { Modal, Btn } from '../ui/index'
// Import directo (NO desde '../../data/help', el barril) a propósito: este
// componente se monta en el PageHeader de TODAS las pantallas del sistema.
// Si importara del barril, arrastraría al bundle principal los 25 conceptos,
// 11 módulos y 12 procedimientos completos del Centro de Ayuda, que deben
// cargarse solo bajo demanda (lazy) al entrar a /ayuda.
import { MAPEO_PANTALLAS } from '../../data/help/mapeoPantallas'

function resolverDestino(item) {
  if (item.tipo === 'concepto')      return `/ayuda/conceptos#${item.slug}`
  if (item.tipo === 'procedimiento') return `/ayuda/como-hago/${item.slug}`
  if (item.tipo === 'modulo')        return `/ayuda/modulos/${item.slug}`
  return '/ayuda'
}

/**
 * Botón "?" de ayuda contextual (spec sección 21). Se monta en PageHeader
 * (App.jsx) y solo se renderiza si la pantalla actual tiene una entrada en
 * MAPEO_PANTALLAS (data/help/mapeoPantallas.js) — agregar cobertura a una
 * pantalla nueva es solo agregar una entrada ahí, sin tocar este componente.
 */
export default function HelpButton({ pathname }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const cfg = MAPEO_PANTALLAS[pathname]

  if (!cfg) return null

  function ir(to) {
    setOpen(false)
    navigate(to)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Ayuda de esta pantalla"
        className="w-7 h-7 flex items-center justify-center rounded-full border transition-colors hover:bg-white/5 shrink-0"
        style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
      >
        <HelpCircle size={15} />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Ayuda"
        size="sm"
        footer={
          cfg.verProcedimientoCompleto && (
            <Btn variant="primary" onClick={() => ir(cfg.verProcedimientoCompleto)}>
              Ver procedimiento completo <ArrowRight size={13} />
            </Btn>
          )
        }
      >
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5" style={{ color: 'var(--text-muted)' }}>
            ¿Qué es esta pantalla?
          </div>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{cfg.queEsEstaPantalla}</p>
        </div>

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: 'var(--text-muted)' }}>
            Pasos recomendados
          </div>
          <ol className="flex flex-col gap-1.5">
            {cfg.pasosRecomendados.map((paso, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] leading-snug" style={{ color: 'var(--text-primary)' }}>
                <span className="font-semibold shrink-0" style={{ color: 'var(--accent)' }}>{i + 1}.</span>
                <span>{paso}</span>
              </li>
            ))}
          </ol>
        </div>

        {cfg.ayudaRelacionada?.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: 'var(--text-muted)' }}>
              Ayuda relacionada
            </div>
            <div className="flex flex-col gap-1">
              {cfg.ayudaRelacionada.map((item, i) => (
                <button
                  key={i}
                  onClick={() => ir(resolverDestino(item))}
                  className="text-left text-[13px] font-medium py-0.5 hover:underline"
                  style={{ color: 'var(--accent)' }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
