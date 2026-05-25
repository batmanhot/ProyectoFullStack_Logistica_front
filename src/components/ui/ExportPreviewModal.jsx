import { X, Download, FileText, FileSpreadsheet } from 'lucide-react'

const MAX_PREVIEW = 10

export default function ExportPreviewModal({ titulo, cabeceras, filas, totales, empresa, tipo, onConfirm, onClose }) {
  const preview = filas.slice(0, MAX_PREVIEW)
  const extras  = filas.length - MAX_PREVIEW
  const vacio   = filas.length === 0
  const hoy     = new Date().toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>


      <div className="w-full max-w-6xl flex flex-col rounded-2xl"
        style={{ background: 'var(--bg-base)', border: '1px solid var(--border-strong)', maxHeight: '88vh', boxShadow: 'var(--shadow-modal)' }}>

        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
              tipo === 'excel' ? 'bg-green-500/15 text-green-500' : 'bg-red-500/15 text-red-500'
            }`}>
              {tipo === 'excel' ? <FileSpreadsheet size={12}/> : <FileText size={12}/>}
              {tipo === 'excel' ? 'Excel' : 'PDF'}
            </span>
            <div>
              <div className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                {titulo}
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {empresa || 'StockPro'}&nbsp;·&nbsp;{hoy}&nbsp;·&nbsp;
                <span className="font-medium" style={{ color: 'var(--accent)' }}>
                  {filas.length} {filas.length === 1 ? 'registro' : 'registros'}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:opacity-80"
            style={{ color: 'var(--text-muted)', background: 'transparent' }}>
            <X size={16}/>
          </button>
        </div>

        {/* ── Etiqueta vista previa ───────────────────────── */}
        <div className="px-6 py-2 shrink-0"
          style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em]"
            style={{ color: 'var(--text-muted)' }}>
            Vista Previa del Contenido
          </span>
          {extras > 0 && (
            <span className="text-[11px] font-normal normal-case" style={{ color: 'var(--text-faint)' }}>
              {' '}— mostrando {MAX_PREVIEW} de {filas.length} filas
            </span>
          )}
        </div>

        {/* ── Tabla ──────────────────────────────────────── */}
        <div className="flex-1 overflow-auto min-h-0">
          {vacio ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2"
              style={{ color: 'var(--text-muted)' }}>
              <FileSpreadsheet size={32}/>
              <div className="text-[14px]">No hay datos para exportar</div>
              <div className="text-[12px]" style={{ color: 'var(--text-faint)' }}>
                Ajusta los filtros para obtener resultados
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px] border-collapse">
                  <thead>
                    <tr>
                      {/* Columna # */}
                      <th className="text-[10px] font-semibold px-3 py-2 text-center w-8 sticky left-0"
                        style={{
                          background: 'var(--bg-surface)',
                          color: 'var(--text-faint)',
                          borderBottom: '1px solid var(--border)',
                          borderRight: '1px solid var(--border)',
                        }}>
                        #
                      </th>
                      {cabeceras.map((h, i) => (
                        <th key={i}
                          className="text-[10px] font-semibold uppercase tracking-[0.05em] px-3 py-2.5 text-left whitespace-nowrap"
                          style={{
                            background: 'var(--accent-dim)',
                            color: 'var(--accent)',
                            borderBottom: '1px solid var(--border)',
                          }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((fila, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-muted)' }}
                        className="transition-colors hover:opacity-90">
                        <td className="px-3 py-2 text-center text-[10px] sticky left-0"
                          style={{
                            color: 'var(--text-faint)',
                            borderBottom: '1px solid var(--border)',
                            borderRight: '1px solid var(--border)',
                            background: 'inherit',
                          }}>
                          {i + 1}
                        </td>
                        {fila.map((celda, j) => (
                          <td key={j} className="px-3 py-2 whitespace-nowrap"
                            style={{
                              color: 'var(--text-secondary)',
                              borderBottom: '1px solid var(--border)',
                              maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>
                            {celda === null || celda === undefined || celda === ''
                              ? <span style={{ color: 'var(--text-faint)' }}>—</span>
                              : String(celda)}
                          </td>
                        ))}
                      </tr>
                    ))}

                    {/* Fila de totales */}
                    {totales && totales.length > 0 && (
                      <tr style={{
                        background: 'var(--accent-dim)',
                        borderTop: '2px solid var(--accent)',
                      }}>
                        <td className="px-3 py-2.5 text-center text-[11px] sticky left-0"
                          style={{
                            color: 'var(--accent)',
                            opacity: 0.6,
                            borderRight: '1px solid var(--border)',
                            background: 'var(--accent-dim)',
                          }}>
                          Σ
                        </td>
                        {totales.map((celda, j) => (
                          <td key={j} className="px-3 py-2.5 font-semibold whitespace-nowrap text-[11px]"
                            style={{ color: 'var(--accent)' }}>
                            {celda === null || celda === undefined || celda === '' ? '' : String(celda)}
                          </td>
                        ))}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {extras > 0 && (
                <div className="text-center py-3 text-[11px]"
                  style={{ color: 'var(--text-faint)', borderTop: '1px solid var(--border)' }}>
                  ···&nbsp;&nbsp;{extras} {extras === 1 ? 'registro adicional' : 'registros adicionales'} no mostrados en la vista previa&nbsp;&nbsp;···
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderTop: '1px solid var(--border)' }}>
          <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            {!vacio && (
              <>
                El archivo incluirá&nbsp;
                <strong style={{ color: 'var(--text-secondary)' }}>
                  {filas.length} {filas.length === 1 ? 'fila' : 'filas'}
                </strong>
                {totales && totales.length > 0 ? ' + fila de totales' : ''}.
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose}
              className="px-4 py-2 text-[13px] transition-colors rounded-lg hover:opacity-80"
              style={{ color: 'var(--text-muted)' }}>
              Cancelar
            </button>
            <button onClick={onConfirm} disabled={vacio}
              className={`flex items-center gap-2 px-5 py-2 text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                tipo === 'excel'
                  ? 'bg-[#1a6b3c] hover:bg-[#1e7b47] text-white'
                  : 'bg-[#7a1a1a] hover:bg-[#922020] text-white'
              }`}>
              {tipo === 'excel'
                ? <><Download size={14}/> Descargar Excel</>
                : <><FileText size={14}/> Generar PDF</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
