import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal, ConfirmDialog, Toggle, Btn } from './index'

describe('Modal', () => {
  it('no renderiza nada cuando open=false', () => {
    const { container } = render(<Modal open={false} onClose={() => {}} title="Título" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renderiza con role="dialog" y el título cuando open=true', () => {
    render(<Modal open onClose={() => {}} title="Nuevo registro">contenido</Modal>)
    expect(screen.getByRole('dialog', { name: 'Nuevo registro' })).toBeInTheDocument()
    expect(screen.getByText('contenido')).toBeInTheDocument()
  })

  it('llama a onClose al presionar Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Modal open onClose={onClose} title="Título" />)

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('llama a onClose al hacer click en el botón Cerrar', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Modal open onClose={onClose} title="Título" />)

    await user.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('ConfirmDialog', () => {
  it('no renderiza nada cuando open=false', () => {
    const { container } = render(
      <ConfirmDialog open={false} onClose={() => {}} onConfirm={() => {}} message="¿Seguro?" />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('Cancelar llama a onClose pero no a onConfirm', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onConfirm = vi.fn()
    render(<ConfirmDialog open onClose={onClose} onConfirm={onConfirm} message="¿Seguro?" />)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('Confirmar llama a onConfirm y luego a onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const onConfirm = vi.fn()
    render(<ConfirmDialog open onClose={onClose} onConfirm={onConfirm} message="¿Seguro?" />)

    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('con danger=true, el botón de acción dice "Eliminar"', () => {
    render(<ConfirmDialog open onClose={() => {}} onConfirm={() => {}} message="¿Seguro?" danger />)
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument()
  })
})

describe('Toggle', () => {
  it('refleja value en aria-checked y dispara onChange con el valor invertido', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Toggle value={false} onChange={onChange} label="Activo" />)

    const sw = screen.getByRole('switch', { name: 'Activo' })
    expect(sw).toHaveAttribute('aria-checked', 'false')

    await user.click(sw)

    expect(onChange).toHaveBeenCalledWith(true)
  })
})

describe('Btn', () => {
  it('dispara onClick cuando no está disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Btn onClick={onClick}>Guardar</Btn>)

    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('no dispara onClick cuando disabled=true', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Btn onClick={onClick} disabled>Guardar</Btn>)

    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(onClick).not.toHaveBeenCalled()
  })

  it('usa el prop title como aria-label', () => {
    render(<Btn title="Eliminar producto">X</Btn>)
    expect(screen.getByRole('button', { name: 'Eliminar producto' })).toBeInTheDocument()
  })
})
