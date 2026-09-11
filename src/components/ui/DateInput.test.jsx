import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DateInput from './DateInput'

describe('DateInput', () => {
  it('muestra el value (YYYY-MM-DD) como dd/mm/aaaa', () => {
    render(<DateInput value="2026-03-18" onChange={() => {}}/>)
    expect(screen.getByDisplayValue('18/03/2026')).toBeInTheDocument()
  })

  it('al escribir una fecha completa y válida, emite YYYY-MM-DD', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DateInput value="" onChange={onChange}/>)
    await user.type(screen.getByPlaceholderText('dd/mm/aaaa'), '18032026')
    expect(onChange).toHaveBeenCalledWith('2026-03-18')
  })

  it('no emite onChange mientras la fecha está incompleta', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DateInput value="" onChange={onChange}/>)
    await user.type(screen.getByPlaceholderText('dd/mm/aaaa'), '1803')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('no emite onChange para una fecha inválida en el calendario (31/02)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DateInput value="" onChange={onChange}/>)
    await user.type(screen.getByPlaceholderText('dd/mm/aaaa'), '31022026')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('limpiar el campo emite string vacío', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DateInput value="2026-03-18" onChange={onChange}/>)
    const input = screen.getByDisplayValue('18/03/2026')
    await user.clear(input)
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('el picker nativo (ícono calendario) emite YYYY-MM-DD, no dd/mm/aaaa', () => {
    const onChange = vi.fn()
    const { container } = render(<DateInput value="" onChange={onChange}/>)
    const nativeInput = container.querySelector('input[type="date"]')
    fireEvent.change(nativeInput, { target: { value: '2026-03-18' } })
    expect(onChange).toHaveBeenCalledWith('2026-03-18')
  })
})
