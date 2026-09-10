import { useQuery } from '@tanstack/react-query'
import api from '../services/api'

const KEY = 'roles'

// Solo lectura: el catálogo de roles lo gobierna el SuperAdmin
// (pages/AdminSaaS/TabRolesSistema.jsx → /admin/roles-base). El tenant solo
// lista los roles para asignarlos a usuarios y consultarlos.
export function useRolesList() {
  return useQuery({
    queryKey: [KEY],
    queryFn:  () => api.get('/roles').then(r => r.data ?? []),
  })
}
