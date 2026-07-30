# src/queries/

Un archivo por dominio. Cada archivo exporta hooks de query y mutación.

Patrón base por archivo:

```js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEYS = {
  all:   () => ['dominio'],
  list:  () => ['dominio', 'list'],
  detail:(id) => ['dominio', id],
}

export function useDominioList() {
  return useQuery({
    queryKey: KEYS.list(),
    queryFn:  () => api.get('/dominio').then(r => {
      if (r.error) throw new Error(r.error)
      return r.data
    }),
  })
}

export function useCrearDominio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/dominio', data),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEYS.list() }),
  })
}
```

Archivos previstos (uno por Fase B-I):
- categorias.queries.js   (Fase B)
- almacenes.queries.js    (Fase B)
- proveedores.queries.js  (Fase B)
- productos.queries.js    (Fase C)
- movimientos.queries.js  (Fase C)
- clientes.queries.js     (Fase D)
- ordenes.queries.js      (Fase D)
- despachos.queries.js    (Fase E)
- transportistas.queries.js (Fase E)
- rutas.queries.js        (Fase E)
- areas.queries.js        (Fase F)
- pedidosInternos.queries.js (Fase F)
