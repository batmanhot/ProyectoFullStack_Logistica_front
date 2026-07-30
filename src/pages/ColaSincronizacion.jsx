import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Trash2, Clock, CheckCircle2, AlertCircle, Inbox, RotateCcw, Wifi, WifiOff } from 'lucide-react'
import { useApp } from '../store/AppContext'
import {
  getTodasOperaciones,
  limpiarSincronizados,
  reintentarFallidos,
  vaciarCola,
} from '../services/offlineQueue'

// Los estilos de estado (ámbar/verde/rojo/azul) son inline a propósito — son
// colores semánticos fijos, no deben cambiar con el tema. Los de fondo/texto
// neutro SÍ usan las variables CSS del tema (var(--bg-card) etc.) para que la
// página se vea bien tanto en oscuro como en claro.
const ESTADO = {
  PENDIENTE:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.13)',  label: 'Pendiente',    Icon: Clock        },
  SINCRONIZADO: { color: '#10b981', bg: 'rgba(16,185,129,0.13)',  label: 'Sincronizado', Icon: CheckCircle2 },
  ERROR:        { color: '#ef4444', bg: 'rgba(239,68,68,0.13)',   label: 'Error',        Icon: AlertCircle  },
}

const ACCION_STYLE = {
  CREATE: { color: '#10b981', bg: 'rgba(16,185,129,0.13)', label: 'CREAR'    },
  UPDATE: { color: '#3b82f6', bg: 'rgba(59,130,246,0.13)', label: 'EDITAR'   },
  DELETE: { color: '#ef4444', bg: 'rgba(239,68,68,0.13)',  label: 'ELIMINAR' },
}

function formatFechaHora(ts) {
  try {
    const d = new Date(ts)
    return {
      fecha: d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit' }),
      hora:  d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    }
  } catch { return { fecha: '—', hora: ts } }
}

export default function ColaSincronizacion() {
  const { online } = useApp()

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
  }

  async function handleReintentar() {
    await reintentarFallidos()
    await cargar()
  }

  async function handleVaciar() {
    await vaciarCola()
    setConfirmVaciar(false)
    await cargar()
  }

  const totales = {
    PENDIENTE:    ops.filter(o => o.estado === 'PENDIENTE').length,
    SINCRONIZADO: ops.filter(o => o.estado === 'SINCRONIZADO').length,
    ERROR:        ops.filter(o => o.estado === 'ERROR').length,
  }

  const mostradas = filtro ? ops.filter(o => o.estado === filtro) : ops

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#e8edf2]">Cola de Sincronización</h1>
          <p className="text-[13px] text-[#5f6f80] mt-0.5">
            Operaciones pendientes de enviar al servidor cuando el backend esté activo
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Estado de conexión */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium"
               style={{
                 background: online ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)',
                 border: `1px solid ${online ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                 color: online ? '#10b981' : '#ef4444',
               }}>
            {online ? <Wifi size={13}/> : <WifiOff size={13}/>}
            {online ? 'En línea' : 'Sin conexión'}
          </div>
          {/* Botón refrescar */}
          <button
            onClick={cargar}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors hover:bg-white/5"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            <RefreshCw size={13}/> Actualizar
          </button>
        </div>
      </div>

      {/* KPIs — actúan como filtros */}
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(ESTADO).map(([key, { color, bg, label, Icon }]) => {
          const activo = filtro === key
          return (
            <button
              key={key}
              onClick={() => setFiltro(f => f === key ? '' : key)}
              className="flex items-center gap-4 rounded-xl px-5 py-4 transition-all text-left"
              style={{
                background: activo ? bg : 'var(--bg-card)',
                border: `1px solid ${activo ? color + '50' : 'var(--border)'}`,
                cursor: 'pointer',
              }}
            >
              <Icon size={22} style={{ color, flexShrink: 0 }}/>
              <div>
                <div style={{ fontSize: 30, fontWeight: 700, color, lineHeight: 1 }}>
                  {totales[key]}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  {label}{activo ? ' — clic para ver todas' : ''}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-between">
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {ops.length} operación{ops.length !== 1 ? 'es' : ''} en total
          {filtro && ` · mostrando ${mostradas.length} (${ESTADO[filtro]?.label})`}
        </div>
        <div className="flex items-center gap-2">
          {totales.ERROR > 0 && (
            <ActionBtn color="#ef4444" bg="rgba(239,68,68,0.10)" border="rgba(239,68,68,0.22)"
              onClick={handleReintentar} icon={<RotateCcw size={13}/>}>
              Reintentar fallidos ({totales.ERROR})
            </ActionBtn>
          )}
          {totales.SINCRONIZADO > 0 && (
            <ActionBtn color="#10b981" bg="rgba(16,185,129,0.10)" border="rgba(16,185,129,0.22)"
              onClick={handleLimpiarSinc} icon={<Trash2 size={13}/>}>
              Limpiar sincronizados ({totales.SINCRONIZADO})
            </ActionBtn>
          )}
          {ops.length > 0 && (
            <ActionBtn color="#ef4444" bg="rgba(239,68,68,0.06)" border="rgba(239,68,68,0.15)"
              onClick={() => setConfirmVaciar(true)} icon={<Trash2 size={13}/>}>
              Vaciar todo
            </ActionBtn>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        {cargando ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '60px 0', color: 'var(--text-muted)', fontSize: 13,
          }}>
            Cargando operaciones…
          </div>
        ) : mostradas.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '70px 0', gap: 14,
          }}>
            <Inbox size={44} style={{ color: 'var(--text-faint)', opacity: 0.45 }}/>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>
              {filtro
                ? `Sin operaciones en estado "${ESTADO[filtro]?.label}"`
                : 'La cola está vacía'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-faint)', maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
              {!filtro && 'Las operaciones aparecerán aquí cuando el backend esté activo y se registren acciones mientras el dispositivo está sin conexión.'}
            </div>
            {filtro && (
              <button
                onClick={() => setFiltro('')}
                style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Ver todas las operaciones
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-muted)' }}>
                  {['Fecha', 'Hora', 'Módulo', 'Acción', 'Descripción', 'Estado', 'Intentos'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'left', fontSize: 10,
                      fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase',
                      letterSpacing: '0.05em', whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mostradas.map(op => {
                  const est     = ESTADO[op.estado] || ESTADO.PENDIENTE
                  const EstIcon = est.Icon
                  const acc     = ACCION_STYLE[op.accion]
                  const { fecha, hora } = formatFechaHora(op.timestamp)
                  return (
                    <tr
                      key={op.id}
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-muted)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {fecha}
                      </td>
                      <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {hora}
                      </td>
                      <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {op.modulo || '—'}
                      </td>
                      <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                        {acc ? (
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: '2px 8px',
                            borderRadius: 5, background: acc.bg, color: acc.color,
                          }}>
                            {acc.label}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>{op.accion || '—'}</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 16px', maxWidth: 260 }}>
                        <div title={op.descripcion || op.endpoint || '—'}
                             style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                          {op.descripcion || op.endpoint || '—'}
                        </div>
                        {op.ultimoError && (
                          <div style={{ fontSize: 10, color: '#ef4444', marginTop: 2 }}>
                            ⚠ {op.ultimoError}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: est.color }}>
                          <EstIcon size={13}/>
                          {est.label}
                        </span>
                      </td>
                      <td style={{
                        padding: '10px 16px', textAlign: 'center',
                        color: (op.intentos ?? 0) > 0 ? '#f59e0b' : 'var(--text-muted)',
                        fontWeight: (op.intentos ?? 0) > 0 ? 700 : 400,
                        fontFamily: 'monospace',
                      }}>
                        {op.intentos ?? 0}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Nota informativa */}
      <div style={{
        background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.18)',
        borderRadius: 10, padding: '14px 18px', fontSize: 12, color: '#7aa2c8', lineHeight: 1.7,
      }}>
        <strong style={{ color: '#93c5fd' }}>¿Cuándo aparecen operaciones aquí?</strong><br/>
        Con conexión, todas las operaciones van directo al servidor y esta cola permanece vacía — es lo normal.
        Solo se encola una operación cuando se intenta crear, editar o eliminar algo <strong>sin conexión a internet</strong>;
        al recuperar la conexión se sincroniza sola automáticamente, sin necesidad de recargar la página.
      </div>

      {/* Confirm vaciar */}
      {confirmVaciar && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 400,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-strong)',
            borderRadius: 14, padding: '32px 36px', maxWidth: 360, textAlign: 'center',
            boxShadow: 'var(--shadow-modal)',
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
              ¿Vaciar toda la cola?
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 24 }}>
              Se eliminarán <strong style={{ color: 'var(--text-secondary)' }}>todas</strong> las operaciones,
              incluyendo las pendientes. Esta acción no se puede deshacer.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => setConfirmVaciar(false)}
                style={{
                  padding: '9px 20px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                  background: 'transparent', border: '1px solid var(--border-strong)',
                  color: 'var(--text-secondary)',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleVaciar}
                style={{
                  padding: '9px 20px', borderRadius: 8, fontSize: 13,
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
  )
}

function ActionBtn({ children, onClick, color, bg, border, icon }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '7px 13px', borderRadius: 8, fontSize: 12, fontWeight: 500,
        cursor: 'pointer', background: bg, color, border: `1px solid ${border}`,
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
    >
      {icon}{children}
    </button>
  )
}
