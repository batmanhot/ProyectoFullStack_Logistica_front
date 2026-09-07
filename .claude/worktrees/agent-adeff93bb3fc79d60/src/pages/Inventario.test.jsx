import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, getFieldControl } from '../test/test-utils'
import { ModalProducto } from './Inventario'

vi.mock('../hooks/usePlanLimits', () => ({
  usePlanLimits: () => ({
    proveedores: { permitido: true, mensaje: '' },
    almacenes: { permitido: true, mensaje: '' },
  }),
}))

const CATEGORIAS = [{ id: 'c1', nombre: 'Electrónicos' }]
const ALMACENES = [{ id: 'a1', nombre: 'Almacén Central' }]
const PROVEEDORES = [{ id: 'p1', razonSocial: 'Proveedor Uno' }]

function setup(props = {}) {
  const onSaved = vi.fn()
  const onClose = vi.fn()
  renderWithProviders(
    <ModalProducto
      open
      onClose={onClose}
      editando={null}
      categorias={CATEGORIAS}
      almacenes={ALMACENES}
      proveedores={PROVEEDORES}
      onSaved={onSaved}
      {...props}
    />,
  )
  return { onSaved, onClose }
}

describe('ModalProducto (Inventario)', () => {
  it('no llama a onSaved y muestra errores si faltan SKU, nombre y categoría', async () => {
    const user = userEvent.setup()
    const { onSaved } = setup()

    await user.click(screen.getByRole('button', { name: 'Crear Producto' }))

    expect(onSaved).not.toHaveBeenCalled()
    expect(screen.getAllByText('Requerido')).toHaveLength(3)
  })

  it('con los campos requeridos completos, llama a onSaved con el form', async () => {
    const user = userEvent.setup()
    const { onSaved } = setup()

    await user.type(getFieldControl('SKU *'), 'ELEC-999')
    await user.type(getFieldControl('Nombre del Producto *'), 'Producto de prueba')
    await user.selectOptions(getFieldControl('Categoría *'), 'c1')
    await user.click(screen.getByRole('button', { name: 'Crear Producto' }))

    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({ sku: 'ELEC-999', nombre: 'Producto de prueba', categoriaId: 'c1' }),
    )
  })

  it('al editar, precarga el form y muestra el checkbox "Producto activo"', () => {
    setup({
      editando: { id: 'prod-1', sku: 'ELEC-001', nombre: 'Laptop', categoriaId: 'c1', activo: true },
    })

    expect(screen.getByDisplayValue('ELEC-001')).toBeInTheDocument()
    expect(screen.getByText('Producto activo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar Cambios' })).toBeInTheDocument()
  })
})
