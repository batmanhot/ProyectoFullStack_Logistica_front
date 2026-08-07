import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getFieldControl } from '../../test/test-utils'
import ModalUsuario from './ModalUsuario'

vi.mock('../../queries/areas-internas.queries', () => ({
  useAreasInternasList: () => ({ data: [{ id: 'area-1', nombre: 'Compras', codigo: 'COMP', activo: true }] }),
}))

vi.mock('../../queries/transportistas.queries', () => ({
  useTransportistasList: () => ({ data: [{ id: 'trans-1', nombre: 'Juan Pérez', activo: true }] }),
}))

const ROLES = {
  almacenero: { label: 'Operario de Almacén', permisos: ['inventario'] },
  admin: { label: 'Administrador', permisos: ['*'] },
  solicitante: { label: 'Solicitante', permisos: ['pedidos-internos'] },
}

function setup(props = {}) {
  const onSave = vi.fn()
  const onClose = vi.fn()
  render(
    <ModalUsuario open onClose={onClose} onSave={onSave} editando={null} sesionId="me" roles={ROLES} {...props} />,
  )
  return { onSave, onClose }
}

describe('ModalUsuario', () => {
  it('Guardar está deshabilitado sin nombre/email/password', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  })

  it('con password menor a 8 caracteres, Guardar sigue deshabilitado', async () => {
    const user = userEvent.setup()
    setup()

    await user.type(getFieldControl('Nombre completo *'), 'Juan Pérez')
    await user.type(getFieldControl('Email *'), 'juan@empresa.pe')
    await user.type(getFieldControl('Contraseña *'), '1234567')

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  })

  it('con todos los campos válidos, habilita Guardar y llama a onSave', async () => {
    const user = userEvent.setup()
    const { onSave } = setup()

    await user.type(getFieldControl('Nombre completo *'), 'Juan Pérez')
    await user.type(getFieldControl('Email *'), 'juan@empresa.pe')
    await user.type(getFieldControl('Contraseña *'), '12345678')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: 'Juan Pérez', email: 'juan@empresa.pe', password: '12345678', rol: 'almacenero' }),
    )
  })

  it('rol admin (permisos *) muestra "Acceso completo a todos los módulos"', async () => {
    const user = userEvent.setup()
    setup()

    await user.selectOptions(getFieldControl('Rol *'), 'admin')

    expect(screen.getByText(/Acceso completo a todos los módulos/)).toBeInTheDocument()
  })

  it('rol solicitante exige Área asignada y mantiene Guardar deshabilitado hasta elegirla', async () => {
    const user = userEvent.setup()
    setup()

    await user.type(getFieldControl('Nombre completo *'), 'Juan Pérez')
    await user.type(getFieldControl('Email *'), 'juan@empresa.pe')
    await user.type(getFieldControl('Contraseña *'), '12345678')
    await user.selectOptions(getFieldControl('Rol *'), 'solicitante')

    expect(screen.getByText('Área asignada *')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()

    await user.selectOptions(getFieldControl('Área asignada *'), 'area-1')

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled()
  })

  it('al editar, el campo Email está deshabilitado y el password es opcional', async () => {
    const user = userEvent.setup()
    setup({ editando: { id: 'u1', nombre: 'Ana', email: 'ana@empresa.pe', rol: 'almacenero', activo: true } })

    expect(getFieldControl('Email *')).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    // sin tocar el password, sigue siendo válido (edición no exige cambiarlo)
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled()
  })
})
