import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const toast = vi.fn()
const crear = vi.fn()
const actualizar = vi.fn()
const eliminar = vi.fn()
let niveles

vi.mock('../../store/AppContext', () => ({ useApp: () => ({ toast }) }))

vi.mock('../../queries/roles.queries', () => ({
  useRolesList: () => ({
    data: [
      { codigo: 'owner', label: 'Propietario' },
      { codigo: 'supervisor', label: 'Supervisor de Almacén' },
      { codigo: 'gerente-operaciones', label: 'Gerente de Operaciones' },
    ],
  }),
}))

vi.mock('../../queries/niveles-aprobacion-compra.queries', () => ({
  useNivelesAprobacionCompra: () => ({ data: niveles, isLoading: false }),
  useCrearNivelAprobacionCompra: () => ({ mutateAsync: crear, isPending: false }),
  useActualizarNivelAprobacionCompra: () => ({ mutateAsync: actualizar, isPending: false }),
  useEliminarNivelAprobacionCompra: () => ({ mutateAsync: eliminar, isPending: false }),
}))

import TabAprobacionCompras from './TabAprobacionCompras'

describe('TabAprobacionCompras', () => {
  beforeEach(() => {
    toast.mockClear()
    crear.mockReset().mockResolvedValue({})
    actualizar.mockReset().mockResolvedValue({})
    eliminar.mockReset().mockResolvedValue({})
    niveles = []
  })

  it('sin niveles explica que la OC se aprueba directo', () => {
    render(<TabAprobacionCompras />)
    expect(screen.getByText(/Todavía no hay niveles configurados/i)).toBeInTheDocument()
    expect(screen.getByText(/Agregar nivel 1/i)).toBeInTheDocument()
  })

  it('no ofrece Propietario (aprueba siempre) pero sí los demás roles', () => {
    render(<TabAprobacionCompras />)
    expect(screen.queryByRole('button', { name: 'Propietario' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Supervisor de Almacén' })).toBeInTheDocument()
  })

  it('rechaza un monto vacío sin llamar a la API', async () => {
    render(<TabAprobacionCompras />)
    await userEvent.click(screen.getByRole('button', { name: /agregar nivel$/i }))
    expect(crear).not.toHaveBeenCalled()
    expect(toast).toHaveBeenCalledWith('Ingresa un monto mínimo válido', 'error')
  })

  it('crea un nivel con el monto y los roles elegidos', async () => {
    render(<TabAprobacionCompras />)
    await userEvent.type(screen.getByPlaceholderText('0.00'), '5000')
    await userEvent.click(screen.getByRole('button', { name: 'Gerente de Operaciones' }))
    await userEvent.click(screen.getByRole('button', { name: /agregar nivel$/i }))

    expect(crear).toHaveBeenCalledWith({ montoMinimo: 5000, rolesAprobadores: ['gerente-operaciones'] })
    expect(toast).toHaveBeenCalledWith('Nivel de aprobación agregado', 'success')
  })

  it('al togglear un rol de un nivel existente actualiza la lista completa', async () => {
    niveles = [{ id: 'n1', nivel: 1, montoMinimo: '1000', rolesAprobadores: ['supervisor'] }]
    render(<TabAprobacionCompras />)
    expect(screen.getByText('Nivel 1')).toBeInTheDocument()

    // Hay un botón por rol en el nivel y otro en el formulario de alta; el primero es el del nivel.
    await userEvent.click(screen.getAllByRole('button', { name: 'Gerente de Operaciones' })[0])
    expect(actualizar).toHaveBeenCalledWith({ id: 'n1', rolesAprobadores: ['supervisor', 'gerente-operaciones'] })
  })

  it('eliminar pide confirmación y luego borra el nivel', async () => {
    niveles = [{ id: 'n1', nivel: 1, montoMinimo: '1000', rolesAprobadores: [] }]
    render(<TabAprobacionCompras />)
    await userEvent.click(screen.getByTitle('Eliminar nivel'))
    expect(eliminar).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }))
    expect(eliminar).toHaveBeenCalledWith('n1')
  })
})
