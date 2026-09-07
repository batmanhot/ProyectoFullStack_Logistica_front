import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import '../../index.css'
import SuperAdminV2App from './SuperAdminV2App'

const queryClient = new QueryClient({ defaultOptions:{ queries:{ retry:1, staleTime:30_000 } } })

createRoot(document.getElementById('root')).render(
  <StrictMode><QueryClientProvider client={queryClient}><SuperAdminV2App /><Toaster position="top-right" /></QueryClientProvider></StrictMode>,
)
