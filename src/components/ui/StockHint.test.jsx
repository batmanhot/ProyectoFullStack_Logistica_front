import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StockHint from './StockHint'

describe('StockHint', () => {
  it('no renderiza nada si disponible es null (sin producto elegido aún)', () => {
    const { container } = render(<StockHint disponible={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('muestra el disponible y el contexto', () => {
    render(<StockHint disponible={12} unidad="UND" contexto="Almacén Central" />)
    expect(screen.getByText(/Disponible en Almacén Central: 12 UND/)).toBeInTheDocument()
  })

  it('marca "sin stock disponible" cuando es 0', () => {
    render(<StockHint disponible={0} contexto="Huancayo" />)
    expect(screen.getByText(/Sin stock disponible en Huancayo/)).toBeInTheDocument()
  })

  it('avisa cuando lo requerido excede lo disponible', () => {
    render(<StockHint disponible={5} unidad="UND" requerido="10" contexto="Central" />)
    expect(screen.getByText(/pides 10, excede lo disponible/)).toBeInTheDocument()
  })

  it('no avisa de exceso si lo requerido está dentro de lo disponible', () => {
    render(<StockHint disponible={5} requerido="3" contexto="Central" />)
    expect(screen.queryByText(/excede/)).not.toBeInTheDocument()
  })
})
