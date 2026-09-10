import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TabRoles from './TabRoles'

// `roles` llega ya como el mapa que arma index.jsx a partir del catálogo del
// SuperAdmin (GET /roles solo devuelve empresaId null).
const ROLES = {
  admin:      { id: 'r1', label: 'Administrador',       color: '#ef4444', desc: 'Acceso total', permisos: ['*'] },
  almacenero: { id: 'r2', label: 'Operario de Almacén', color: '#22c55e', desc: 'Operaciones', permisos: ['dashboard', 'inventario'] },
}

function setup(props = {}) {
  render(<TabRoles roles={ROLES} usuarios={[]} getRolCode={u => u.rol?.codigo || u.rol || ''} {...props} />)
}

describe('TabRoles (solo lectura)', () => {
  it('no ofrece ninguna acción de gestión de roles', () => {
    setup()
    expect(screen.queryByRole('button', { name: /Nuevo Rol/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Editar/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Duplicar/ })).toBeNull()
  })

  it('explica que el catálogo lo administra la plataforma', () => {
    setup()
    expect(screen.getByText(/El catálogo lo administra la plataforma/i)).toBeInTheDocument()
  })

  it('lista cada rol con su desglose de módulos', () => {
    setup()
    expect(screen.getByText('Administrador')).toBeInTheDocument()
    expect(screen.getByText('Operario de Almacén')).toBeInTheDocument()
    // el rol con '*' muestra el resumen de acceso total, no la matriz
    expect(screen.getByText(/acceso completo a todos los módulos/i)).toBeInTheDocument()
  })
})
