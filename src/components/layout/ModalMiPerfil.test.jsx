import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

let perfilData
vi.mock('../../queries/perfil.queries', () => ({
  usePerfil: () => ({ data: perfilData, isLoading: !perfilData, isError: false }),
}))

import ModalMiPerfil from './ModalMiPerfil'

const BASE = {
  id: 'u1', nombre: 'Ana Torres', email: 'ana@dlnorte.pe',
  telefono: '999888777', documento: '12345678', cargo: 'Jefa de Almacén',
  activo: true, miembroDesde: '2026-01-15T00:00:00Z',
  rol: { codigo: 'supervisor', label: 'Supervisor de Almacén' },
  accesoTotal: false, modulos: ['inventario', 'despachos', 'ajustes'],
  area: null, transportista: null, metaVentasMensual: null,
  empresa: { nombre: 'Distribuidora Lima Norte', codigo: 'dlnorte', plan: 'empresarial', estado: 'activo', fechaVencimiento: null },
  ultimoAccesoPrevio: '2026-09-09T12:00:00Z', accionesRegistradas: 128,
}

describe('ModalMiPerfil', () => {
  it('no renderiza nada si open=false', () => {
    perfilData = BASE
    const { container } = render(<ModalMiPerfil open={false} onClose={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('muestra identidad, rol, empresa y actividad', () => {
    perfilData = BASE
    render(<ModalMiPerfil open onClose={() => {}} />)
    expect(screen.getByText('Ana Torres')).toBeInTheDocument()
    expect(screen.getByText('ana@dlnorte.pe')).toBeInTheDocument()
    expect(screen.getAllByText('Supervisor de Almacén').length).toBeGreaterThan(0)
    expect(screen.getByText('Distribuidora Lima Norte')).toBeInTheDocument()
    expect(screen.getByText('128')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument() // módulos habilitados
  })

  it('despliega la lista de módulos al hacer clic en "Ver lista"', async () => {
    perfilData = BASE
    render(<ModalMiPerfil open onClose={() => {}} />)
    expect(screen.queryByText('despachos')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /Ver lista/ }))
    expect(screen.getByText('despachos')).toBeInTheDocument()
  })

  it('muestra "Acceso total" para un rol con comodín y omite la tarjeta de contexto', () => {
    perfilData = { ...BASE, accesoTotal: true, modulos: [], rol: { codigo: 'admin', label: 'Administrador' } }
    render(<ModalMiPerfil open onClose={() => {}} />)
    expect(screen.getByText(/Acceso total a todos los módulos/)).toBeInTheDocument()
    expect(screen.queryByText('Contexto del rol')).toBeNull()
  })

  it('muestra la tarjeta de contexto cuando hay área asignada', () => {
    perfilData = { ...BASE, area: { nombre: 'Operaciones', codigo: 'OPS' } }
    render(<ModalMiPerfil open onClose={() => {}} />)
    expect(screen.getByText('Contexto del rol')).toBeInTheDocument()
    expect(screen.getByText('Operaciones (OPS)')).toBeInTheDocument()
  })
})
