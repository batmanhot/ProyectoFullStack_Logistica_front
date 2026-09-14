import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// Alcance de roles (2026-09-11): Owner conserva '*' real en el backend —
// esta curación es SOLO de navegación (Sidebar). Se mockea useApp directo
// (como ya hace TabAprobaciones.test.jsx) para controlar el rol/permisos sin
// pasar por AppProvider real.
let sesion
const tienePermiso = vi.fn((modulo) => sesion?.rol?.permisos?.includes('*') || sesion?.rol?.permisos?.includes(modulo))
const logout = vi.fn()

vi.mock('../../store/AppContext', () => ({
  useApp: () => ({ sesion, logout, tienePermiso }),
}))
vi.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({ current: { accent: '#000', emoji: '🎨', label: 'Test' }, applyTheme: vi.fn(), themes: [] }),
}))
vi.mock('../ui/StorageWidget', () => ({ default: () => null }))
vi.mock('../ui/OfflineBanner', () => ({ default: () => null }))
vi.mock('./ModalMiPerfil', () => ({ default: () => null }))

import Sidebar from './Sidebar'

function renderSidebar() {
  return render(
    <MemoryRouter>
      <Sidebar collapsed={false} onToggle={() => {}}/>
    </MemoryRouter>,
  )
}

describe('Sidebar — curación de Owner', () => {
  beforeEach(() => {
    tienePermiso.mockClear()
    localStorage.clear()
  })

  it('Owner ve por defecto la vista curada (Gestión + Admin), no Picking/Despachos/etc.', () => {
    sesion = { nombre: 'Ana', rol: { codigo: 'owner', permisos: ['*'] } }
    renderSidebar()

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Torre de Control de Almacenes')).toBeInTheDocument()
    expect(screen.getByText('Usuarios y Roles')).toBeInTheDocument()
    expect(screen.queryByText('Despachos')).toBeNull()
    expect(screen.queryByText('Inventario Físico')).toBeNull()
    expect(screen.queryByText('Productos')).toBeNull()
  })

  it('el botón "Ver todo" revela el menú completo, y "Vista curada" lo vuelve a acotar', async () => {
    sesion = { nombre: 'Ana', rol: { codigo: 'owner', permisos: ['*'] } }
    renderSidebar()

    expect(screen.queryByText('Despachos')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /ver todo/i }))
    expect(screen.getByText('Despachos')).toBeInTheDocument()
    expect(screen.getByText('Productos')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /vista curada/i }))
    expect(screen.queryByText('Despachos')).toBeNull()
  })

  it('un rol que no es Owner no ve el botón de "Ver todo" y no se le curan módulos', () => {
    sesion = { nombre: 'Bruno', rol: { codigo: 'gerente-operaciones', permisos: ['dashboard', 'kpis', 'despachos', 'inventario'] } }
    renderSidebar()

    expect(screen.queryByRole('button', { name: /ver todo/i })).toBeNull()
    // gerente-operaciones tiene 'despachos' explícito en sus permisos acá —
    // debe verse tal cual el permiso lo permite, sin la curación de Owner.
    expect(screen.getByText('Despachos')).toBeInTheDocument()
  })
})
