import { useState, useEffect, useCallback } from 'react'
import { X, RefreshCw, Trash2, Clock, CheckCircle2, AlertCircle, Inbox, RotateCcw } from 'lucide-react'
import {
  getTodasOperaciones,
  limpiarSincronizados,
  reintentarFallidos,
  vaciarCola,
} from '../../services/offlineQueue'

// Todos los estilos visuales son inline para ser inmunes a cualquier tema
const C = {
  bg:         '#111827',
  surface:    '#1a2230',
  border:     'rgba(255,255,255,0.09)',
  borderSoft: 'rgba(255,255,255,0.05)',
  textPrimary:'#e8edf2',
  textMuted:  '#9ba8b6',
  textFaint:  '#5f6f80',
  textDim:    '#3d4f60',
}

const ESTADO = {
  PENDIENTE:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.13)',  label: 'Pendiente',    Icon: Clock        },
  SINCRONIZADO: { color: '#10b981', bg: 'rgba(16,185,129,0.13)',  label: 'Sincronizado', Icon: CheckCircle2 },
  ERROR:        { color: '#ef4444', bg: 'rgba(239,68,68,0.13)',   label: 'Error',        Icon: AlertCircle  },
}

const ACCION_STYLE = {
  CREATE: { color: '#10b981', bg: 'rgba(16,185,129,0.13)',  label: 'CREAR'    },
  UPDATE: { color: '#3b82f6', bg: 'rgba(59,130,246,0.13)',  label: 'EDITAR'   },
  DELETE: { color: '#ef4444', bg: 'rgba(239,68,68,0.13)',   label: 'ELIMINAR' },
}

function formatFechaHora(ts) {
  try {
    const d = new Date(ts)
    const fecha = d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' })
    const hora  = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    return { fecha, hora }
  } catch { return { fecha: '—', hora: ts } }
}

export default function OfflineQueueModal({ onClose, onActualizar }) {
  const [ops,           setOps]           = useState([])
  const [filtro,        setFiltro]        = useState('')
  const [cargando,      setCargando]      = useState(true)
  const [confirmVaciar, setConfirmVaciar] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    const todas = await getTodasOperaciones()
    setOps([...todas].sort((a, b) => b.timestamp.localeCompare(a.timestamp)))
    setCargando(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function handleLimpiarSinc() {
    await limpiarSincronizados()
    await cargar()
    onActualizar?.()
  }

  async function handleReintentar() {
    await reintentarFallidos()
    await cargar()
    onActualizar?.()
  }

  async function handleVaciar() {
    await vaciarCola()
    setConfirmVaciar(false)
    await cargar()
    onActualizar?.()
  }

  const totales = {
    PENDIENTE:    ops.filter(o => o.estado === 'PENDIENTE').length,
    SINCRONIZADO: ops.filter(o => o.estado === 'SINCRONIZADO').length,
    ERROR:        ops.filter(o => o.estado === 'ERROR').length,
  }

  const mostradas = filtro ? ops.filter(o => o.estado === filtro) : ops

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
      }}
    >
      <div style={{
        position: 'relative',
        background: C.bg, border: `1px solid ${C.border}`,
        boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
        borderRadius: 16, width: '100%', maxWidth: 720,
        maxHeight: '88vh', display: 'flex', flexDirection: 'column',
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px', borderBottom: `1px solid ${C.border}`,
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.textPrimary }}>
              Cola de Sincronización
            </div>
            <div style={{ fontSize: 11, color: C.textFaint, marginTop: 2 }}>
              Operaciones pendientes de enviar al servidor · se actualiza automáticamente
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={cargar}
              title="Actualizar lista"
              style={{
                padding: 6, borderRadius: 8, cursor: 'pointer', border: 'none',
                background: 'transparent', color: C.textFaint, transition: 'background 150ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={onClose}
              style={{
                padding: 6, borderRadius: 8, cursor: 'pointer', border: 'none',
                background: 'transparent', color: C.textFaint, transition: 'background 150ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── KPIs / Filtros ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10,
          padding: '14px 24px', borderBottom: `1px solid ${C.border}`,
        }}>
          {Object.entries(ESTADO).map(([key, { color, bg, label, Icon }]) => {
            const activo = filtro === key
            return (
              <button
                key={key}
                onClick={() => setFiltro(f => f === key ? '' : key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                  background: activo ? bg : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${activo ? color + '50' : 'rgba(255,255,255,0.07)'}`,
                  transition: 'all 150ms',
                }}
              >
                <Icon size={18} style={{ color, flexShrink: 0 }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1 }}>
                    {totales[key]}
                  </div>
                  <div style={{ fontSize: 10, color: C.textFaint, marginTop: 3 }}>{label}</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* ── Tabla ── */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {cargando ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '60px 0', color: C.textFaint, fontSize: 13,
            }}>
              Cargando operaciones…
            </div>
          ) : mostradas.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '60px 0', gap: 12,
            }}>
              <Inbox size={40} style={{ color: C.textDim, opacity: 0.5 }} />
              <div style={{ fontSize: 13, color: C.textFaint }}>
                {filtro
                  ? `Sin operaciones en estado "${ESTADO[filtro]?.label}"`
                  : 'La cola está vacía — no hay operaciones registradas'}
              </div>
              {filtro && (
                <button
                  onClick={() => setFiltro('')}
                  style={{
                    fontSize: 11, color: C.textFaint, background: 'none',
                    border: 'none', cursor: 'pointer', textDecoration: 'underline',
                  }}
                >
                  Ver todas
                </button>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
                  {['Fecha / Hora', 'Módulo', 'Acción', 'Descripción', 'Estado', 'Intentos'].map(h => (
                    <th key={h} style={{
                      padding: '8px 14px', textAlign: 'left', fontSize: 10,
                      fontWeight: 600, color: C.textDim, textTransform: 'uppercase',
                      letterSpacing: '0.05em', position: 'sticky', top: 0,
                      background: C.bg, whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mostradas.map(op => {
                  const est    = ESTADO[op.estado] || ESTADO.PENDIENTE
                  const EstIcon = est.Icon
                  const acc    = ACCION_STYLE[op.accion]
                  const { fecha, hora } = formatFechaHora(op.timestamp)
                  return (
                    <tr
                      key={op.id}
                      style={{ borderBottom: `1px solid ${C.borderSoft}` }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Fecha / Hora */}
                      <td style={{ padding: '9px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 11, color: C.textMuted }}>{hora}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: 10, color: C.textFaint }}>{fecha}</div>
                      </td>

                      {/* Módulo */}
                      <td style={{ padding: '9px 14px', color: C.textMuted, whiteSpace: 'nowrap', fontSize: 12 }}>
                        {op.modulo || '—'}
                      </td>

                      {/* Acción */}
                      <td style={{ padding: '9px 14px', whiteSpace: 'nowrap' }}>
                        {acc ? (
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: '2px 7px',
                            borderRadius: 5, background: acc.bg, color: acc.color,
                          }}>
                            {acc.label}
                          </span>
                        ) : (
                          <span style={{ color: C.textFaint }}>{op.accion || '—'}</span>
                        )}
                      </td>

                      {/* Descripción */}
                      <td style={{ padding: '9px 14px', maxWidth: 220 }}>
                        <div
                          title={op.descripcion || op.endpoint || '—'}
                          style={{
                            overflow: 'hidden', textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap', color: C.textMuted,
                          }}
                        >
                          {op.descripcion || op.endpoint || '—'}
                        </div>
                        {op.ultimoError && (
                          <div style={{ fontSize: 10, color: '#ef4444', marginTop: 2 }}>
                            ⚠ {op.ultimoError}
                          </div>
                        )}
                      </td>

                      {/* Estado */}
                      <td style={{ padding: '9px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          fontSize: 11, color: est.color,
                        }}>
                          <EstIcon size={12} />
                          {est.label}
                        </span>
                      </td>

                      {/* Intentos */}
                      <td style={{
                        padding: '9px 14px', textAlign: 'center',
                        color: (op.intentos ?? 0) > 0 ? '#f59e0b' : C.textFaint,
                        fontWeight: (op.intentos ?? 0) > 0 ? 600 : 400,
                      }}>
                        {op.intentos ?? 0}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 24px', borderTop: `1px solid ${C.border}`, gap: 8,
        }}>
          <div style={{ fontSize: 11, color: C.textDim }}>
            {ops.length} operación{ops.length !== 1 ? 'es' : ''} en total
            {filtro && ` · mostrando ${mostradas.length} (filtro: ${ESTADO[filtro]?.label})`}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {totales.ERROR > 0 && (
              <FooterBtn color="#ef4444" bg="rgba(239,68,68,0.12)" border="rgba(239,68,68,0.25)"
                onClick={handleReintentar} icon={<RotateCcw size={12}/>}>
                Reintentar fallidos ({totales.ERROR})
              </FooterBtn>
            )}
            {totales.SINCRONIZADO > 0 && (
              <FooterBtn color="#10b981" bg="rgba(16,185,129,0.10)" border="rgba(16,185,129,0.22)"
                onClick={handleLimpiarSinc} icon={<Trash2 size={12}/>}>
                Limpiar sincronizados ({totales.SINCRONIZADO})
              </FooterBtn>
            )}
            {ops.length > 0 && (
              <FooterBtn color="#ef4444" bg="rgba(239,68,68,0.07)" border="rgba(239,68,68,0.16)"
                onClick={() => setConfirmVaciar(true)} icon={<Trash2 size={12}/>}>
                Vaciar todo
              </FooterBtn>
            )}
          </div>
        </div>

        {/* ── Overlay confirmación vaciar ── */}
        {confirmVaciar && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 16,
            background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 12, padding: '28px 32px', maxWidth: 340, textAlign: 'center',
            }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.textPrimary, marginBottom: 10 }}>
                ¿Vaciar toda la cola?
              </div>
              <div style={{ fontSize: 12, color: C.textFaint, lineHeight: 1.6, marginBottom: 24 }}>
                Se eliminarán <strong style={{ color: C.textMuted }}>todas</strong> las operaciones,
                incluyendo las pendientes. Esta acción no se puede deshacer.
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button
                  onClick={() => setConfirmVaciar(false)}
                  style={{
                    padding: '8px 18px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                    background: 'transparent', border: `1px solid ${C.border}`, color: C.textMuted,
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleVaciar}
                  style={{
                    padding: '8px 18px', borderRadius: 8, fontSize: 13,
                    fontWeight: 600, cursor: 'pointer', border: 'none',
                    background: '#ef4444', color: '#fff',
                  }}
                >
                  Sí, vaciar cola
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FooterBtn({ children, onClick, color, bg, border, icon }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
        cursor: 'pointer', background: bg, color, border: `1px solid ${border}`,
        transition: 'opacity 150ms',
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
    >
      {icon}{children}
    </button>
  )
}
