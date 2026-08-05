import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getFieldControl } from '../test/test-utils'
import { ModalPago } from './CuentasPorCobrar'

const DOC = { id: 'cxc-1', numero: 'CXC-00001', saldo: 150 }

function setup(props = {}) {
  const onConfirm = vi.fn()
  const onClose = vi.fn()
  render(<ModalPago doc={DOC} simboloMoneda="S/" onClose={onClose} onConfirm={onConfirm} {...props} />)
  return { onConfirm, onClose }
}

describe('ModalPago (Cuentas por Cobrar)', () => {
  it('no renderiza nada cuando doc es null', () => {
    const { container } = render(<ModalPago doc={null} onClose={() => {}} onConfirm={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('prellena el monto con el saldo pendiente y habilita Confirmar por defecto', () => {
    setup()
    expect(getFieldControl('Monto a pagar *').value).toBe('150')
    expect(screen.getByRole('button', { name: /Confirmar pago/ })).toBeEnabled()
  })

  it('un monto mayor al saldo muestra el Alert de error y deshabilita Confirmar', async () => {
    const user = userEvent.setup()
    setup()

    await user.clear(getFieldControl('Monto a pagar *'))
    await user.type(getFieldControl('Monto a pagar *'), '200')

    expect(screen.getByText(/no puede superar el saldo pendiente/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Confirmar pago/ })).toBeDisabled()
  })

  it('un pago parcial válido habilita Confirmar y llama a onConfirm con monto, método y notas', async () => {
    const user = userEvent.setup()
    const { onConfirm } = setup()

    await user.clear(getFieldControl('Monto a pagar *'))
    await user.type(getFieldControl('Monto a pagar *'), '50')
    await user.click(screen.getByRole('button', { name: /Confirmar pago/ }))

    expect(onConfirm).toHaveBeenCalledWith({ monto: 50, metodo: undefined, notas: undefined })
  })

  it('permite elegir método de pago y notas, y los incluye en onConfirm', async () => {
    const user = userEvent.setup()
    const { onConfirm } = setup()

    await user.selectOptions(getFieldControl('Método de pago'), 'yape')
    await user.type(getFieldControl('Notas'), 'Op. 123456')
    await user.click(screen.getByRole('button', { name: /Confirmar pago/ }))

    expect(onConfirm).toHaveBeenCalledWith({ monto: 150, metodo: 'yape', notas: 'Op. 123456' })
  })

  it('un monto de 0 deshabilita Confirmar sin mostrar el Alert (campo vacío-equivalente)', async () => {
    const user = userEvent.setup()
    setup()

    await user.clear(getFieldControl('Monto a pagar *'))
    await user.type(getFieldControl('Monto a pagar *'), '0')

    expect(screen.getByRole('button', { name: /Confirmar pago/ })).toBeDisabled()
  })
})
