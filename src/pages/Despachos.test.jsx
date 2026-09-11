import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getFieldControl } from '../test/test-utils'
import { ModalNuevoPedido, ModalAsignarGuia } from './Despachos'

const PRODUCTOS = [
  { id: 'p1', sku: 'SKU1', nombre: 'Producto Uno', stockActual: 10, unidadMedida: 'UN', precioVenta: 20, activo: true },
]
const CLIENTES = [{ id: 'c1', razonSocial: 'Cliente Uno', activo: true, direccion: 'Av. Test 123' }]
const ALMACENES = [{ id: 'a1', nombre: 'Almacén Principal' }]
// El selector de producto filtra por stock DEL ALMACÉN elegido, no por el global.
const INVENTARIO = [
  { id: 'inv1', productoId: 'p1', almacenId: 'a1', ubicacionId: null, cantidad: 10, cantidadReservada: 0 },
]

describe('ModalNuevoPedido', () => {
  function setup(props = {}) {
    const onSave = vi.fn()
    const onClose = vi.fn()
    const { rerender } = render(
      <ModalNuevoPedido
        open
        onClose={onClose}
        onSave={onSave}
        productos={PRODUCTOS}
        clientes={CLIENTES}
        almacenes={ALMACENES}
        inventario={INVENTARIO}
        simboloMoneda="S/"
        {...props}
      />,
    )
    return { onSave, onClose, rerender }
  }

  it('Registrar Pedido está deshabilitado sin cliente ni items', () => {
    setup()
    expect(screen.getByRole('button', { name: /Registrar Pedido/ })).toBeDisabled()
  })

  it('sigue deshabilitado con cliente pero sin items', async () => {
    const user = userEvent.setup()
    setup()

    await user.selectOptions(getFieldControl('Cliente *'), 'c1')

    expect(screen.getByRole('button', { name: /Registrar Pedido/ })).toBeDisabled()
  })

  it('agregar un item calcula subtotal/IGV/total y habilita Guardar', async () => {
    const user = userEvent.setup()
    setup()

    await user.selectOptions(getFieldControl('Cliente *'), 'c1')
    await user.selectOptions(getFieldControl('Producto'), 'p1')
    await user.clear(getFieldControl('Cantidad'))
    await user.type(getFieldControl('Cantidad'), '3')
    await user.click(screen.getByRole('button', { name: /Agregar/ }))

    // subtotal = 3 * 20 = 60 (aparece en la fila del item y en el resumen);
    // igv = 60*0.18 = 10.8; total = 70.8 (únicos)
    expect(screen.getAllByText('S/ 60.00').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('S/ 10.80')).toBeInTheDocument()
    // "Total: " y el monto son nodos de texto hermanos sin <span> propio
    expect(screen.getByText((_, el) => el?.textContent === 'Total: S/ 70.80')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Registrar Pedido/ })).toBeEnabled()
  })

  it('el selector muestra el stock DEL almacén elegido, no el global', async () => {
    setup({
      almacenes: [{ id: 'a1', nombre: 'Principal' }, { id: 'a2', nombre: 'Huancayo' }],
      inventario: [
        { id: 'i1', productoId: 'p1', almacenId: 'a1', ubicacionId: null, cantidad: 10, cantidadReservada: 0 },
      ],
    })
    // Almacén por defecto = a1 (tiene 10) → el producto aparece con "Stock: 10".
    expect(screen.getByRole('option', { name: /SKU1 — Producto Uno \(Stock: 10 UN\)/ })).toBeInTheDocument()
  })

  it('bloquea agregar más cantidad que la disponible en el almacén', async () => {
    const user = userEvent.setup()
    setup()
    await user.selectOptions(getFieldControl('Cliente *'), 'c1')
    await user.selectOptions(getFieldControl('Producto'), 'p1')
    await user.clear(getFieldControl('Cantidad'))
    await user.type(getFieldControl('Cantidad'), '15') // solo hay 10
    await user.click(screen.getByRole('button', { name: /Agregar/ }))

    expect(screen.getByText(/Solo hay 10/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Registrar Pedido/ })).toBeDisabled()
  })

  it('no borra los items agregados si `almacenes` recibe una nueva referencia (refetch en segundo plano)', async () => {
    const user = userEvent.setup()
    const { rerender } = setup()

    await user.selectOptions(getFieldControl('Cliente *'), 'c1')
    await user.selectOptions(getFieldControl('Producto'), 'p1')
    await user.clear(getFieldControl('Cantidad'))
    await user.type(getFieldControl('Cantidad'), '2')
    await user.click(screen.getByRole('button', { name: /Agregar/ }))
    expect(screen.getByRole('button', { name: /Registrar Pedido/ })).toBeEnabled()

    // Mismo contenido, OBJETO nuevo — como devolvería un refetch de React Query
    // aunque los almacenes no hayan cambiado. El modal sigue open=true.
    rerender(
      <ModalNuevoPedido
        open
        onClose={() => {}}
        onSave={() => {}}
        productos={PRODUCTOS}
        clientes={CLIENTES}
        almacenes={[...ALMACENES]}
        inventario={INVENTARIO}
        simboloMoneda="S/"
      />,
    )

    // El item agregado (y el total calculado) deben seguir ahí.
    expect(screen.getByRole('button', { name: /Registrar Pedido/ })).toBeEnabled()
    expect(screen.getAllByText('S/ 40.00').length).toBeGreaterThanOrEqual(1)
  })

  it('al confirmar, llama a onSave con el shape esperado', async () => {
    const user = userEvent.setup()
    const { onSave } = setup()

    await user.selectOptions(getFieldControl('Cliente *'), 'c1')
    await user.selectOptions(getFieldControl('Producto'), 'p1')
    await user.clear(getFieldControl('Cantidad'))
    await user.type(getFieldControl('Cantidad'), '2')
    await user.click(screen.getByRole('button', { name: /Agregar/ }))
    await user.click(screen.getByRole('button', { name: /Registrar Pedido/ }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: 'c1',
        almacenId: 'a1',
        estado: 'PEDIDO',
        items: [{ productoId: 'p1', cantidad: 2, precioVenta: 20 }],
        subtotal: 40,
        igv: 7.2,
        total: 47.2,
      }),
    )
  })
})

describe('ModalAsignarGuia', () => {
  it('prellena el número de guía existente y habilita Guardar', () => {
    const des = { id: 'd1', numero: 'DESP-001', guiaNumero: 'GR-00099' }
    render(<ModalAsignarGuia des={des} onClose={() => {}} onSave={() => {}} />)

    expect(screen.getByDisplayValue('GR-00099')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Asignar Guía/ })).toBeEnabled()
  })

  it('genera un número de guía por defecto si el despacho no tiene uno', () => {
    const des = { id: 'd1', numero: 'DESP-002' }
    render(<ModalAsignarGuia des={des} onClose={() => {}} onSave={() => {}} />)

    const input = screen.getByPlaceholderText('GR-00001')
    expect(input.value).toMatch(/^GR-\d{3}-\d{4}$/)
  })

  it('deshabilita Guardar si se vacía el campo, y llama a onSave con el valor final', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    const des = { id: 'd1', numero: 'DESP-003', guiaNumero: 'GR-00099' }
    render(<ModalAsignarGuia des={des} onClose={() => {}} onSave={onSave} />)

    const input = screen.getByDisplayValue('GR-00099')
    await user.clear(input)
    expect(screen.getByRole('button', { name: /Asignar Guía/ })).toBeDisabled()

    await user.type(input, 'GR-00123')
    await user.click(screen.getByRole('button', { name: /Asignar Guía/ }))

    expect(onSave).toHaveBeenCalledWith('GR-00123')
  })
})
