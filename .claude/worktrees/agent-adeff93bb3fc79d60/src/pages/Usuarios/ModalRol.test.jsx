import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ModalRol from './ModalRol'

function setup(props = {}) {
  const onSave = vi.fn()
  const onClose = vi.fn()
  render(<ModalRol open onClose={onClose} onSave={onSave} editando={null} {...props} />)
  return { onSave, onClose }
}

describe('ModalRol', () => {
  it('Guardar Rol está deshabilitado sin nombre', () => {
    setup()
    expect(screen.getByRole('button', { name: /Guardar Rol/ })).toBeDisabled()
  })

  it('con nombre, habilita Guardar y llama a onSave con los permisos individuales elegidos', async () => {
    const user = userEvent.setup()
    const { onSave } = setup()

    await user.type(screen.getByPlaceholderText('Ej: Vendedor, Auditor...'), 'Vendedor')
    // activa el grupo "General" completo (dashboard + alertas) vía el checkbox de grupo
    await user.click(screen.getByRole('button', { name: /General/ }))
    await user.click(screen.getByRole('button', { name: /Guardar Rol/ }))

    expect(onSave).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        label: 'Vendedor',
        permisos: expect.arrayContaining(['dashboard', 'alertas']),
      }),
    )
  })

  it('"Acceso total (administrador)" fuerza permisos: ["*"] al guardar', async () => {
    const user = userEvent.setup()
    const { onSave } = setup()

    await user.type(screen.getByPlaceholderText('Ej: Vendedor, Auditor...'), 'Super Admin')
    await user.click(screen.getByRole('checkbox', { name: /Acceso total \(administrador\)/ }))
    await user.click(screen.getByRole('button', { name: /Guardar Rol/ }))

    expect(onSave).toHaveBeenCalledWith(null, expect.objectContaining({ permisos: ['*'] }))
  })

  it('al editar un rol base, el nombre queda bloqueado pero los permisos siguen editables', () => {
    setup({ editando: { id: 'r1', codigo: 'admin', label: 'Administrador', permisos: ['*'] } })

    expect(screen.getByPlaceholderText('Ej: Vendedor, Auditor...')).toBeDisabled()
    expect(screen.getByText(/Nombre y descripción bloqueados en roles base/)).toBeInTheDocument()
  })

  it('editando un rol no-base precarga label y permisos existentes', () => {
    setup({ editando: { id: 'r2', codigo: null, label: 'Ventas', permisos: ['dashboard', 'cxc'] } })

    expect(screen.getByDisplayValue('Ventas')).toBeInTheDocument()
    expect(screen.getByText(/Módulos accesibles — 2\//)).toBeInTheDocument()
  })
})
