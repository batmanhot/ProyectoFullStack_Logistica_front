import { useState } from 'react'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { TableWrap, Th, Td, EmptyState } from './index'

const DEFAULT_PAGE_SIZE = 25

/** Filas de esqueleto mientras carga — reemplaza el texto plano "Cargando…". */
function SkeletonRows({ columns }) {
  return Array.from({ length: 5 }).map((_, i) => (
    <tr key={`skeleton-${i}`} className="border-b border-white/6 last:border-0">
      {columns.map(col => (
        <td key={col.key} className="px-3.5 py-2.5">
          <div className="h-3.5 rounded bg-white/6 animate-pulse" style={{ width: col.align === 'right' ? '60%' : '80%' }} />
        </td>
      ))}
    </tr>
  ))
}

function PageBtn({ disabled, onClick, children, title }) {
  return (
    <button type="button" title={title} disabled={disabled} onClick={onClick}
      className="flex items-center justify-center w-7 h-7 rounded-lg border border-white/8 text-[#9ba8b6] transition-colors hover:not-disabled:bg-white/6 hover:not-disabled:text-[#e8edf2] disabled:opacity-30 disabled:cursor-not-allowed">
      {children}
    </button>
  )
}

/**
 * Controles de paginación reutilizables — "Mostrando A–B de N" + Anterior/Siguiente.
 * `DataTable` los usa internamente en modo client-side; las pantallas con
 * paginación server-side (ej. Auditoría, Incidencias) los usan directamente,
 * manejando `page` en su propio estado y pidiéndole al backend la página siguiente.
 */
export function Pager({ page, totalPages, onChange, rangeStart, rangeEnd, total }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between mt-3 px-0.5">
      <span className="text-[11px] text-[#5f6f80]">
        Mostrando <span className="text-[#9ba8b6] font-mono">{rangeStart}–{rangeEnd}</span> de <span className="text-[#9ba8b6] font-mono">{total}</span>
      </span>
      <div className="flex items-center gap-1.5">
        <PageBtn title="Anterior" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft size={14}/>
        </PageBtn>
        <span className="text-[11px] text-[#9ba8b6] font-mono px-1 min-w-14 text-center">{page} / {totalPages}</span>
        <PageBtn title="Siguiente" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          <ChevronRight size={14}/>
        </PageBtn>
      </div>
    </div>
  )
}

/**
 * Tabla config-driven compartida por las pantallas de Operaciones/Inventario/Compras.
 * Envuelve TableWrap/Th/Td ya existentes — no reinventa estilos, solo centraliza
 * el esqueleto de carga, el estado vacío, el patrón de fila clicable, el
 * ordenamiento por columna (opcional, vía `sortable` + `sortConfig`/`onSort`)
 * y la paginación client-side (activada por defecto, `paginate={false}` para desactivarla
 * — típicamente porque la pantalla ya pagina del lado del servidor con `Pager` directo).
 */
export function DataTable({
  columns,
  rows,
  rowKey,
  loading,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  onRowClick,
  rowClassName,
  sortConfig,
  onSort,
  footerRow,
  paginate = true,
  pageSize = DEFAULT_PAGE_SIZE,
}) {
  const [page, setPage] = useState(1)

  // `rows` llega ya filtrada/ordenada por la pantalla — si cambia (filtro, búsqueda,
  // orden), la referencia del array cambia y volvemos a la página 1 para no quedar
  // parados en una página que ya no tiene datos. Ajustar el estado durante el render
  // (en vez de un useEffect) evita un segundo render/commit extra.
  const [prevRows, setPrevRows] = useState(rows)
  if (rows !== prevRows) {
    setPrevRows(rows)
    setPage(1)
  }

  const totalPages = paginate ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1
  const pageRows    = paginate ? rows.slice((page - 1) * pageSize, page * pageSize) : rows

  return (
    <>
      <TableWrap>
        <thead><tr>
          {columns.map(col => (
            <Th key={col.key} right={col.align === 'right'} onClick={col.sortable ? () => onSort?.(col.key) : undefined}>
              <div className={`flex items-center gap-1.5 ${col.align === 'right' ? 'justify-end' : ''}`}>
                {col.header}
                {col.sortable && sortConfig?.key === col.key && (
                  sortConfig.direction === 'asc' ? <ChevronUp size={10}/> : <ChevronDown size={10}/>
                )}
              </div>
            </Th>
          ))}
        </tr></thead>
        <tbody>
          {loading && <SkeletonRows columns={columns}/>}
          {!loading && rows.length === 0 && (
            <tr><td colSpan={columns.length}>
              <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription}/>
            </td></tr>
          )}
          {!loading && pageRows.map(row => (
            <tr key={rowKey(row)}
              className={`border-b border-white/6 last:border-0 hover:bg-white/2 ${onRowClick ? 'cursor-pointer transition-colors' : ''} ${rowClassName ? rowClassName(row) : ''}`}
              onClick={onRowClick ? () => onRowClick(row) : undefined}>
              {columns.map(col => (
                <Td key={col.key} right={col.align === 'right'} onClick={col.stopPropagation ? e => e.stopPropagation() : undefined}>
                  {col.render(row)}
                </Td>
              ))}
            </tr>
          ))}
        </tbody>
        {footerRow && !loading && rows.length > 0 && (
          <tfoot>
            <tr className="border-t border-white/8">
              {columns.map((col, i) => (
                <Td key={col.key} right={col.align === 'right'} className="font-semibold">
                  {footerRow[i]}
                </Td>
              ))}
            </tr>
          </tfoot>
        )}
      </TableWrap>

      {paginate && !loading && (
        <Pager
          page={page}
          totalPages={totalPages}
          onChange={setPage}
          rangeStart={(page - 1) * pageSize + 1}
          rangeEnd={Math.min(page * pageSize, rows.length)}
          total={rows.length}
        />
      )}
    </>
  )
}
