/**
 * DataTable — Tabla reutilizable con sort, filtro de texto y paginación.
 *
 * Props:
 *   columns   Array<{ key, label, right?, render? }>
 *   data      Array<object>
 *   rowKey    string — campo único para key de fila (default 'id')
 *   emptyIcon LucideIcon
 *   emptyText string
 *   pageSize  number (default 20)
 *   actions   (row) => ReactNode  — columna de acciones
 *   search    { value, onChange, placeholder }
 *   filters   ReactNode — controles adicionales de filtro (select, etc.)
 *   toolbar   ReactNode — botones de la barra derecha (Nueva, Export…)
 *   title     string
 */
import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, Search, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { EmptyState, Btn } from './index'

const TH_BASE = 'bg-[#1a2230] px-3.5 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] whitespace-nowrap border-b border-white/[0.08]'

export function DataTable({
  columns = [],
  data = [],
  rowKey = 'id',
  emptyIcon,
  emptyText = 'Sin resultados',
  pageSize = 20,
  actions,
  search,
  filters,
  toolbar,
  title,
}) {
  const [sort, setSort]       = useState({ key: null, dir: 'asc' })
  const [page, setPage]       = useState(1)

  const allColumns = actions
    ? [...columns, { key: '__actions', label: 'Acciones', nosort: true }]
    : columns

  function toggleSort(key) {
    setSort(prev =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' },
    )
    setPage(1)
  }

  const sorted = useMemo(() => {
    if (!sort.key) return data
    return [...data].sort((a, b) => {
      const va = a[sort.key] ?? ''
      const vb = b[sort.key] ?? ''
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb))
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [data, sort])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage   = Math.min(page, totalPages)
  const slice      = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)

  return (
    <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">

      {/* ── Barra superior ── */}
      <div className="flex items-center justify-between gap-3 mb-3">
        {title && (
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] whitespace-nowrap">
            {title}
          </span>
        )}
        {toolbar && <div className="flex items-center gap-2 shrink-0 ml-auto">{toolbar}</div>}
      </div>

      {/* ── Barra de filtros ── */}
      {(search || filters) && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {search && (
            <div className="relative flex-1 min-w-[180px]">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none" />
              <input
                className="px-3 py-[5px] pl-8 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[12px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 w-full placeholder-[#5f6f80]"
                placeholder={search.placeholder || 'Buscar...'}
                value={search.value}
                onChange={e => { search.onChange(e.target.value); setPage(1) }}
              />
              {search.value && (
                <button
                  onClick={() => { search.onChange(''); setPage(1) }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5f6f80] hover:text-[#e8edf2]"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          )}
          {filters}
          <span className="text-[11px] text-[#5f6f80] whitespace-nowrap ml-auto">
            {data.length} resultado{data.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* ── Tabla ── */}
      <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {allColumns.map(col => (
                <th
                  key={col.key}
                  className={`${TH_BASE} ${col.right ? 'text-right' : 'text-left'} ${!col.nosort ? 'cursor-pointer select-none hover:text-[#e8edf2]' : ''}`}
                  onClick={col.nosort ? undefined : () => toggleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {!col.nosort && sort.key === col.key && (
                      sort.dir === 'asc'
                        ? <ChevronUp size={10} className="text-[#00c896]" />
                        : <ChevronDown size={10} className="text-[#00c896]" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 && (
              <tr>
                <td colSpan={allColumns.length}>
                  <EmptyState icon={emptyIcon} title={emptyText} />
                </td>
              </tr>
            )}
            {slice.map(row => (
              <tr key={row[rowKey]} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]">
                {columns.map(col => (
                  <td
                    key={col.key}
                    className={`px-3.5 py-2.5 ${col.mono ? 'font-mono text-[12px]' : ''} ${col.right ? 'text-right' : ''} ${col.muted ? 'text-[#9ba8b6]' : 'text-[#e8edf2]'}`}
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
                {actions && (
                  <td className="px-3.5 py-2.5">
                    <div className="flex gap-1">{actions(row)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Paginación ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 text-[12px] text-[#5f6f80]">
          <span>Página {safePage} de {totalPages}</span>
          <div className="flex gap-1">
            <Btn variant="ghost" size="icon" disabled={safePage <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft size={13} />
            </Btn>
            <Btn variant="ghost" size="icon" disabled={safePage >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight size={13} />
            </Btn>
          </div>
        </div>
      )}
    </div>
  )
}
