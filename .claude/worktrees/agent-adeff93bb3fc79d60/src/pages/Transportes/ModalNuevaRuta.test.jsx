import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getFieldControl } from '../../test/test-utils'
import ModalNuevaRuta from './ModalNuevaRuta'

const DESPACHOS = [
  { id: 'd1', numero: 'DESP-1', clienteId: 'c1', direccionEntrega: 'Av. Uno 100', estado: 'LISTO', items: [{ productoId: 'p1' }] },
]
const TRANSPORTISTAS = [{ id: 't1', nombre: 'Juan Pérez', placa: 'ABC-123' }]
const CLIENTES = [{ id: 'c1', razonSocial: 'Cliente Uno' }]
const ALMACENES = [{ id: 'a1', nombre: 'Almacén Principal' }]

function setup(props = {}) {
  const onSave = vi.fn()
  const onClose = vi.fn()
  render(
    <ModalNuevaRuta
      onClose={onClose}
      onSave={onSave}
      despachos={DESPACHOS}
      transportistas={TRANSPORTISTAS}
      clientes={CLIENTES}
      almacenes={ALMACENES}
      {...props}
    />,
  )
  return { onSave, onClose }
}

describe('ModalNuevaRuta', () => {
  it('Programar Ruta está deshabilitado sin transportista ni despachos seleccionados', () => {
    setup()
    expect(screen.getByRole('button', { name: /Programar Ruta/ })).toBeDisabled()
  })

  it('solo lista despachos en estado LISTO', () => {
    setup({ despachos: [...DESPACHOS, { id: 'd2', numero: 'DESP-2', clienteId: 'c1', estado: 'DESPACHADO', items: [] }] })
    expect(screen.getByText(/DESP-1/)).toBeInTheDocument()
    expect(screen.queryByText(/DESP-2/)).not.toBeInTheDocument()
  })

  it('si no hay despachos LISTO pero sí empacados en Picking, avisa con el número del despacho a marcar Listo', () => {
    setup({
      despachos: [
        { id: 'd2', numero: 'DESP-2', clienteId: 'c1', estado: 'PICKING', empaque: { estado: 'CONFIRMADO' }, items: [] },
      ],
    })
    expect(screen.getByText(/empaque ya confirmado/)).toBeInTheDocument()
    expect(screen.getByText(/DESP-2/)).toBeInTheDocument()
    expect(screen.getByText(/Marcar Listo/)).toBeInTheDocument()
  })

  it('seleccionar transportista + despacho habilita Guardar y onSave recibe el shape esperado', async () => {
    const user = userEvent.setup()
    const { onSave } = setup()

    await user.selectOptions(getFieldControl('Transportista *'), 't1')
    await user.click(screen.getByRole('checkbox', { name: /DESP-1/ }))

    expect(screen.getByRole('button', { name: /Programar Ruta/ })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: /Programar Ruta/ }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        transportistaId: 't1',
        despachoIds: ['d1'],
        paradas: [{ despachoId: 'd1', orden: 1, estado: 'PENDIENTE', horaLlegada: null, horaPartida: null, observacion: '' }],
      }),
    )
  })
})
