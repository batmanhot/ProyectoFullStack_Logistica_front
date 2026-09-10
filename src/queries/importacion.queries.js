import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

// Importación en lote de datos maestros (Configuración → Importar Datos).
// El Excel se parsea en el cliente; el backend valida y hace el upsert
// transaccional. `filas` = [{ "<Encabezado>": valor, ... }].

/** Estructura de la plantilla (columnas + ejemplos) para armar el .xlsx. */
export function obtenerPlantillaImport(entidad) {
  return api.get(`/importacion/${entidad}/plantilla`).then(r => r.data)
}

/** Vista previa — valida y clasifica cada fila, sin escribir. */
export function usePrevisualizarImport() {
  return useMutation({
    mutationFn: ({ entidad, filas }) =>
      api.post(`/importacion/${entidad}/previsualizar`, { filas }),
  })
}

/** Confirma — upsert en una transacción (todo o nada). Invalida los listados. */
export function useConfirmarImport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ entidad, filas }) => api.post(`/importacion/${entidad}`, { filas }),
    onSuccess: (_res, { entidad }) => {
      qc.invalidateQueries({ queryKey: [entidad] })
    },
  })
}
