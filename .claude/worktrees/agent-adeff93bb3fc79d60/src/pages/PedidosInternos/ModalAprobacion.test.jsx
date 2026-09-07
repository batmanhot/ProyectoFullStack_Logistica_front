import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ModalAprobacion } from './ModalAprobacion'

const PEDIDO = { id: 'pi-1', numero: 'PI-00001' }

function setup(props = {}) {
  const onAprobar = vi.fn().mockResolvedValue({})
  const onRechazar = vi.fn().mockResolvedValue({})
  const onClose = vi.fn()
  render(<ModalAprobacion pedido={PEDIDO} onClose={onClose} onAprobar={onAprobar} onRechazar={onRechazar} {...props} />)
  return { onAprobar, onRechazar, onClose }
}

describe('ModalAprobacion (Pedidos Internos)', () => {
  it('por defecto confirma una aprobación con las notas escritas', async () => {
    const user = userEvent.setup()
    const { onAprobar, onRechazar } = setup()

    await user.type(screen.getByPlaceholderText('Comentarios...'), 'Todo en orden')
    await user.click(screen.getByRole('button', { name: 'Confirmar aprobación' }))

    expect(onAprobar).toHaveBeenCalledWith({ id: 'pi-1', notas: 'Todo en orden' })
    expect(onRechazar).not.toHaveBeenCalled()
  })

  it('al cambiar a Rechazar, exige motivo antes de confirmar', async () => {
    const user = userEvent.setup()
    const { onRechazar } = setup()

    await user.click(screen.getByRole('button', { name: /Rechazar/ }))
    await user.click(screen.getByRole('button', { name: 'Confirmar rechazo' }))

    expect(screen.getByText('El motivo del rechazo es obligatorio.')).toBeInTheDocument()
    expect(onRechazar).not.toHaveBeenCalled()
  })

  it('con motivo, confirma el rechazo', async () => {
    const user = userEvent.setup()
    const { onRechazar } = setup()

    await user.click(screen.getByRole('button', { name: /Rechazar/ }))
    await user.type(screen.getByPlaceholderText('Indica el motivo...'), 'Sin stock disponible')
    await user.click(screen.getByRole('button', { name: 'Confirmar rechazo' }))

    expect(onRechazar).toHaveBeenCalledWith({ id: 'pi-1', motivo: 'Sin stock disponible' })
  })
})
