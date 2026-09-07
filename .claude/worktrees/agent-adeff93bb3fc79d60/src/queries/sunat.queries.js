import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

const KEY = 'sunat'

export function useSunatDocumentos(filtros = {}) {
  const params = new URLSearchParams()
  if (filtros.estado) params.set('estado', filtros.estado)
  const qs = params.toString()
  return useQuery({
    queryKey: [KEY, 'documentos', filtros],
    queryFn:  () => api.get(`/sunat/documentos${qs ? `?${qs}` : ''}`).then(r => r.data ?? []),
  })
}

export function useSunatDespachosConGuia() {
  return useQuery({
    queryKey: [KEY, 'despachos-con-guia'],
    queryFn:  () => api.get('/sunat/despachos-con-guia').then(r => r.data ?? []),
  })
}

export function useGenerarDocumentoSunat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (despachoId) => api.post(`/sunat/documentos/${despachoId}/generar`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useMarcarEnviadoSunat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (despachoId) => api.post(`/sunat/documentos/${despachoId}/marcar-enviado`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useMarcarAceptadoSunat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ despachoId, ...dto }) => api.post(`/sunat/documentos/${despachoId}/marcar-aceptado`, dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useMarcarRechazadoSunat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ despachoId, ...dto }) => api.post(`/sunat/documentos/${despachoId}/marcar-rechazado`, dto),
    onSuccess:  () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
