import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mutateAsync = vi.fn().mockResolvedValue({ data: {} })
const toast = vi.fn()

vi.mock('../../store/AppContext', () => ({ useApp: () => ({ toast }) }))

vi.mock('../../queries/roles.queries', () => ({
  useRolesList: () => ({
    data: [
      { codigo: 'owner', label: 'Propietario' },
      { codigo: 'admin', label: 'Administrador' },
      { codigo: 'supervisor', label: 'Supervisor de Almacén' },
      { codigo: 'gerente-operaciones', label: 'Gerente de Operaciones' },
    ],
  }),
}))

vi.mock('../../queries/aprobaciones.queries', () => ({
  useReglasAprobacion: () => ({
    isLoading: false,
    data: [
      { proceso: 'PEDIDO_INTERNO', label: 'Pedido Interno', descripcion: 'Aprobar o rechazar.', rolesAprobadores: ['supervisor'], porDefecto: false },
      { proceso: 'DESPACHO', label: 'Despacho', descripcion: 'Aprobar un despacho.', rolesAprobadores: [], porDefecto: true },
    ],
  }),
  useActualizarReglaAprobacion: () => ({ mutateAsync, isPending: false }),
}))

import TabAprobaciones from './TabAprobaciones'

describe('TabAprobaciones', () => {
  beforeEach(() => { mutateAsync.mockClear(); toast.mockClear() })

  it('lista cada proceso con su descripción', () => {
    render(<TabAprobaciones />)
    expect(screen.getByText('Pedido Interno')).toBeInTheDocument()
    expect(screen.getByText('Despacho')).toBeInTheDocument()
  })

  // Alcance de roles (2026-09-11): Admin dejó de tener '*' — ya no aprueba
  // "siempre" como Owner, se configura como cualquier otro rol.
  it('no ofrece Propietario (aprueba siempre) pero sí ofrece Administrador', () => {
    render(<TabAprobaciones />)
    expect(screen.queryByRole('button', { name: 'Propietario' })).toBeNull()
    expect(screen.getAllByRole('button', { name: 'Administrador' }).length).toBeGreaterThan(0)
  })

  it('marca "Sin aprobador designado" cuando la lista está vacía', () => {
    render(<TabAprobaciones />)
    expect(screen.getAllByText(/Sin aprobador designado/i).length).toBeGreaterThan(0)
  })

  it('al togglear un rol llama la mutación con la lista actualizada', async () => {
    render(<TabAprobaciones />)
    // en Pedido Interno, 'supervisor' ya está activo → agregar 'gerente-operaciones'
    await userEvent.click(screen.getAllByRole('button', { name: 'Gerente de Operaciones' })[0])
    expect(mutateAsync).toHaveBeenCalledWith({
      proceso: 'PEDIDO_INTERNO',
      rolesAprobadores: ['supervisor', 'gerente-operaciones'],
    })
  })
})
