import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AppProvider } from '../store/AppContext'

/** QueryClient nuevo por test: sin reintentos ni cache entre tests. */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

/**
 * render() con los providers que casi todo componente de página necesita
 * (useApp() vía AppProvider, hooks de queries/*.js vía QueryClientProvider,
 * useNavigate/useParams vía MemoryRouter) — hoy no existía ningún harness
 * compartido para tests de componentes.
 */
export function renderWithProviders(ui, { route = '/', queryClient = createTestQueryClient(), ...options } = {}) {
  function Wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <QueryClientProvider client={queryClient}>
          <AppProvider>{children}</AppProvider>
        </QueryClientProvider>
      </MemoryRouter>
    )
  }
  return render(ui, { wrapper: Wrapper, ...options })
}

/**
 * `Field` (components/ui/index.jsx) no asocia su <label> al control interno
 * vía htmlFor/id, así que getByLabelText no funciona — ambos son hijos
 * directos del mismo contenedor, por eso se busca el control a partir del
 * texto de la etiqueta.
 */
export function getFieldControl(labelText) {
  return screen.getByText(labelText).closest('div').querySelector('input, select, textarea')
}

export * from '@testing-library/react'
