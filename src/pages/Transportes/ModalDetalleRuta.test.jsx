import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ModalDetalleRuta from './ModalDetalleRuta'

const DESPACHOS = [
  { id: 'd1', numero: 'DESP-1', clienteId: 'c1', direccionEntrega: 'Av. Uno 100', items: [], total: 100 },
]
const CLIENTES = [{ id: 'c1', razonSocial: 'Cliente Uno' }]
const TRANSPORTISTAS = [{ id: 't1', nombre: 'Juan Pérez', placa: 'ABC-123', vehiculo: 'Camión' }]
const ALMACENES = [{ id: 'a1', nombre: 'Almacén Principal' }]

function rutaBase(overrides = {}) {
  return {
    id: 'r1',
    numero: 'RUTA-00001',
    transportistaId: 't1',
    almacenId: 'a1',
    fechaSalida: '2026-07-30T08:00:00',
    estado: 'PROGRAMADA',
    paradas: [{ despachoId: 'd1', orden: 1, estado: 'PENDIENTE' }],
    ...overrides,
  }
}

function setup(props = {}) {
  const onIniciar = vi.fn()
  const onCompletar = vi.fn()
  const onCancelar = vi.fn()
  const onMarcarParada = vi.fn()
  render(
    <ModalDetalleRuta
      ruta={rutaBase(props.ruta)}
      despachos={DESPACHOS}
      clientes={CLIENTES}
      transportistas={TRANSPORTISTAS}
      almacenes={ALMACENES}
      onClose={() => {}}
      onIniciar={onIniciar}
      onCompletar={onCompletar}
      onCancelar={onCancelar}
      onMarcarParada={onMarcarParada}
    />,
  )
  return { onIniciar, onCompletar, onCancelar, onMarcarParada }
}

describe('ModalDetalleRuta', () => {
  it('en PROGRAMADA muestra "Iniciar Ruta" y no "Cerrar Ruta"', () => {
    setup()
    expect(screen.getByRole('button', { name: /Iniciar Ruta/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Cerrar Ruta/ })).not.toBeInTheDocument()
  })

  it('click en "Iniciar Ruta" llama a onIniciar', async () => {
    const user = userEvent.setup()
    const { onIniciar } = setup()

    await user.click(screen.getByRole('button', { name: /Iniciar Ruta/ }))

    expect(onIniciar).toHaveBeenCalledTimes(1)
  })

  it('en EN_RUTA muestra "Cerrar Ruta" y no "Iniciar Ruta", y la parada PENDIENTE ofrece "En Camino"', () => {
    setup({ ruta: { estado: 'EN_RUTA' } })
    expect(screen.getByRole('button', { name: /Cerrar Ruta/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Iniciar Ruta/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /En Camino/ })).toBeInTheDocument()
  })

  it('"En Camino" en una parada llama a onMarcarParada con el despachoId y estado EN_CAMINO', async () => {
    const user = userEvent.setup()
    const { onMarcarParada } = setup({ ruta: { estado: 'EN_RUTA' } })

    await user.click(screen.getByRole('button', { name: /En Camino/ }))

    expect(onMarcarParada).toHaveBeenCalledWith('d1', 'EN_CAMINO', '')
  })

  it('la parada EN_CAMINO ya no ofrece "En Camino" (solo Confirmar/No Entregado)', () => {
    setup({ ruta: { estado: 'EN_RUTA', paradas: [{ despachoId: 'd1', orden: 1, estado: 'EN_CAMINO' }] } })
    expect(screen.queryByRole('button', { name: /^En Camino/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Confirmar Entrega/ })).toBeInTheDocument()
  })
})
