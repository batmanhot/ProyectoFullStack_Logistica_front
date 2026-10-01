import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('../../queries/roles.queries', () => ({
  useRolesList: () => ({
    data: [
      { codigo: 'supervisor', label: 'Supervisor de Almacén' },
      { codigo: 'gerente-operaciones', label: 'Gerente de Operaciones' },
    ],
  }),
}))

import { ModalAprobacionOC } from './ModalAprobacionOC'

const onAprobar  = vi.fn()
const onRechazar = vi.fn()
const onClose    = vi.fn()

function renderModal(oc) {
  return render(<ModalAprobacionOC oc={oc} onClose={onClose} onAprobar={onAprobar} onRechazar={onRechazar} saving={false} />)
}

describe('ModalAprobacionOC', () => {
  beforeEach(() => {
    onAprobar.mockReset().mockResolvedValue({})
    onRechazar.mockReset().mockResolvedValue({})
    onClose.mockClear()
  })

  it('sin niveles no muestra la cadena y aprueba en un solo paso', async () => {
    renderModal({ id: 'oc1', numero: 'OC-001', aprobaciones: [] })
    expect(screen.queryByText(/Cadena de aprobación/i)).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: /confirmar aprobación/i }))
    expect(onAprobar).toHaveBeenCalledWith({ id: 'oc1', notas: '' })
  })

  it('con niveles muestra la cadena en orden y avisa qué nivel toca', () => {
    renderModal({
      id: 'oc1', numero: 'OC-002',
      aprobaciones: [
        { nivel: 2, estado: 'PENDIENTE', rolesAprobadores: ['gerente-operaciones'] },
        { nivel: 1, estado: 'APROBADO',  rolesAprobadores: ['supervisor'] },
      ],
    })
    expect(screen.getByText(/Cadena de aprobación/i)).toBeInTheDocument()
    const niveles = screen.getAllByText(/^Nivel \d/)
    expect(niveles[0]).toHaveTextContent('Nivel 1 — Supervisor de Almacén')
    expect(niveles[1]).toHaveTextContent('Nivel 2 — Gerente de Operaciones')
    expect(screen.getByText(/Te toca aprobar\/rechazar el nivel 2/i)).toBeInTheDocument()
  })

  it('un nivel sin roles se describe como "cualquier usuario con permiso de Órdenes"', () => {
    renderModal({ id: 'oc1', numero: 'OC-003', aprobaciones: [{ nivel: 1, estado: 'PENDIENTE', rolesAprobadores: [] }] })
    expect(screen.getByText(/cualquier usuario con permiso de Órdenes/i)).toBeInTheDocument()
  })

  it('rechazar exige motivo y no llama al callback sin él', async () => {
    renderModal({ id: 'oc1', numero: 'OC-004', aprobaciones: [] })
    await userEvent.click(screen.getByRole('button', { name: /^rechazar$/i }))
    await userEvent.click(screen.getByRole('button', { name: /confirmar rechazo/i }))

    expect(screen.getByText(/motivo del rechazo es obligatorio/i)).toBeInTheDocument()
    expect(onRechazar).not.toHaveBeenCalled()
  })

  it('rechazar con motivo llama onRechazar con el motivo', async () => {
    renderModal({ id: 'oc1', numero: 'OC-005', aprobaciones: [] })
    await userEvent.click(screen.getByRole('button', { name: /^rechazar$/i }))
    await userEvent.type(screen.getByPlaceholderText('Indica el motivo...'), 'Precio fuera de presupuesto')
    await userEvent.click(screen.getByRole('button', { name: /confirmar rechazo/i }))

    expect(onRechazar).toHaveBeenCalledWith({ id: 'oc1', motivo: 'Precio fuera de presupuesto' })
  })

  it('muestra el error devuelto por el backend al aprobar', async () => {
    onAprobar.mockResolvedValue({ error: 'No te corresponde aprobar este nivel' })
    renderModal({ id: 'oc1', numero: 'OC-006', aprobaciones: [] })
    await userEvent.click(screen.getByRole('button', { name: /confirmar aprobación/i }))

    expect(await screen.findByText('No te corresponde aprobar este nivel')).toBeInTheDocument()
  })
})
