import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ModalPedido } from './ModalPedido'

const AREAS = [{ id: 'area-1', nombre: 'Operaciones', codigo: 'OPS', activo: true }]
const ALMACENES = [{ id: 'a1', nombre: 'Almacén Central' }]
const PRODUCTOS = [{ id: 'p1', nombre: 'Producto Uno', unidadMedida: 'UN', activo: true }]
const SESION = { id: 'u1', rol: { codigo: 'admin' } }

function setup(props = {}) {
  const onSave = vi.fn()
  const onClose = vi.fn()
  render(
    <ModalPedido
      pedido={null}
      onClose={onClose}
      onSave={onSave}
      areas={AREAS}
      productos={PRODUCTOS}
      almacenes={ALMACENES}
      sesion={SESION}
      {...props}
    />,
  )
  return { onSave, onClose }
}

describe('ModalPedido (Pedidos Internos)', () => {
  it('exige área, almacén e ítems antes de guardar', async () => {
    const user = userEvent.setup()
    const { onSave } = setup()

    await user.click(screen.getByRole('button', { name: /Enviar pedido/ }))

    expect(screen.getByText('Área, almacén e ítems son obligatorios.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('con un ítem válido, Enviar pedido llama a onSave con type=create y enviar=true', async () => {
    const user = userEvent.setup()
    const { onSave } = setup()

    await user.selectOptions(screen.getByDisplayValue('Selecciona área...'), 'area-1')
    await user.click(screen.getByRole('button', { name: /Agregar item/ }))
    await user.selectOptions(screen.getByDisplayValue('Producto...'), 'p1')

    await user.click(screen.getByRole('button', { name: /Enviar pedido/ }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'create',
        enviar: true,
        dto: expect.objectContaining({
          areaId: 'area-1',
          almacenId: 'a1',
          items: [expect.objectContaining({ productoId: 'p1', cantidad: 1 })],
        }),
      }),
    )
  })

  it('"Guardar borrador" llama a onSave con enviar=false', async () => {
    const user = userEvent.setup()
    const { onSave } = setup()

    await user.selectOptions(screen.getByDisplayValue('Selecciona área...'), 'area-1')
    await user.click(screen.getByRole('button', { name: /Agregar item/ }))
    await user.selectOptions(screen.getByDisplayValue('Producto...'), 'p1')
    await user.click(screen.getByRole('button', { name: /Guardar borrador/ }))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ enviar: false }))
  })

  it('al editar, los ítems se muestran de solo lectura y solo hay "Guardar cambios"', () => {
    setup({
      pedido: {
        id: 'pi-1', numero: 'PI-00001', estado: 'ENVIADO', areaId: 'area-1', almacenId: 'a1',
        items: [{ productoId: 'p1', cantidad: 3, unidadMedida: 'UN' }],
      },
    })

    expect(screen.getByText('Producto Uno')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Agregar item/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Enviar pedido/ })).not.toBeInTheDocument()
  })
})
