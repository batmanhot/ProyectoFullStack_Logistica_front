import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import SuperAdminV2App from './SuperAdminV2App'

function renderApp() {
  const client = new QueryClient({ defaultOptions:{ queries:{ retry:false } } })
  return render(<QueryClientProvider client={client}><SuperAdminV2App /></QueryClientProvider>)
}

describe('formularios del SuperAdmin V2', () => {
  beforeEach(() => localStorage.clear())

  it('abre el modal de nuevo negocio', () => {
    window.location.hash = '#/negocios/listado'
    renderApp()
    fireEvent.click(screen.getByRole('button', { name:'Nuevo negocio' }))
    expect(screen.getByRole('dialog', { name:'Nuevo negocio' })).toBeInTheDocument()
    expect(screen.getByLabelText('RUC')).toBeInTheDocument()
  })

  it('abre el modal de nuevo administrador', () => {
    window.location.hash = '#/usuarios/administradores-tenant'
    renderApp()
    fireEvent.click(screen.getByRole('button', { name:'Nuevo administrador' }))
    expect(screen.getByRole('dialog', { name:'Nuevo administrador' })).toBeInTheDocument()
    expect(screen.getByLabelText('Negocio')).toBeInTheDocument()
  })
})
