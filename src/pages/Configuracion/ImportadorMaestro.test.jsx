import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const previsualizarMock = vi.fn()
const confirmarMock = vi.fn()
const toast = vi.fn()

const PLANTILLA = {
  entidad: 'clientes', label: 'Clientes',
  columnas: ['Razón Social', 'RUC'],
  requeridas: ['Razón Social'],
  campos: [
    { columna: 'Razón Social', campo: 'razonSocial', requerido: true, tipo: 'texto' },
    { columna: 'RUC', campo: 'ruc', requerido: false, tipo: 'ruc' },
  ],
  ejemplos: [['ACME SAC', '20512345678']],
}

vi.mock('../../queries/importacion.queries', () => ({
  obtenerPlantillaImport: vi.fn(() => Promise.resolve(PLANTILLA)),
  usePrevisualizarImport: () => ({ mutateAsync: previsualizarMock, isPending: false }),
  useConfirmarImport: () => ({ mutateAsync: confirmarMock, isPending: false }),
}))

vi.mock('xlsx', () => ({
  read: vi.fn(() => ({ SheetNames: ['S'], Sheets: { S: {} } })),
  utils: {
    sheet_to_json: vi.fn(() => [{ 'Razón Social': 'ACME', RUC: '20512345678' }]),
    aoa_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}))

class FakeFileReader {
  readAsBinaryString() { this.onload({ target: { result: 'binario' } }) }
}

import ImportadorMaestro from './ImportadorMaestro'

describe('ImportadorMaestro', () => {
  beforeEach(() => {
    previsualizarMock.mockReset()
    confirmarMock.mockReset()
    toast.mockReset()
    vi.stubGlobal('FileReader', FakeFileReader)
  })

  it('carga la plantilla y muestra las columnas obligatorias', async () => {
    render(<ImportadorMaestro entidad="clientes" label="Clientes" toast={toast} />)
    expect(await screen.findByText(/Descargar Plantilla Excel/)).toBeInTheDocument()
    expect(screen.getByText('Razón Social')).toBeInTheDocument()
  })

  it('sube un archivo, previsualiza y muestra la fila analizada', async () => {
    previsualizarMock.mockResolvedValue({
      data: {
        resumen: { total: 1, crear: 1, actualizar: 0, error: 0 },
        filas: [{ fila: 2, valido: true, errores: [], datos: { razonSocial: 'ACME', ruc: '20512345678' }, accion: 'crear' }],
      },
    })
    const { container } = render(<ImportadorMaestro entidad="clientes" label="Clientes" toast={toast} />)
    await screen.findByText(/Descargar Plantilla Excel/)

    const input = container.querySelector('input[type="file"]')
    fireEvent.change(input, { target: { files: [new File(['x'], 'clientes.xlsx')] } })

    await waitFor(() => expect(previsualizarMock).toHaveBeenCalledWith({
      entidad: 'clientes',
      filas: [{ 'Razón Social': 'ACME', RUC: '20512345678' }],
    }))
    expect(await screen.findByText('ACME')).toBeInTheDocument()
    expect(screen.getByText('1 nuevos')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Confirmar Importación/ })).toBeEnabled()
  })

  it('no deja confirmar si hay filas con error', async () => {
    previsualizarMock.mockResolvedValue({
      data: {
        resumen: { total: 1, crear: 0, actualizar: 0, error: 1 },
        filas: [{ fila: 2, valido: false, errores: ['"Razón Social" es obligatorio'], datos: {}, accion: 'omitir' }],
      },
    })
    const { container } = render(<ImportadorMaestro entidad="clientes" label="Clientes" toast={toast} />)
    await screen.findByText(/Descargar Plantilla Excel/)
    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [new File(['x'], 'c.xlsx')] } })

    expect(await screen.findByText(/1 fila\(s\) con error/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Confirmar Importación/ })).toBeNull()
  })
})
