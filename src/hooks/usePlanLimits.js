import { useMemo } from 'react'
import { useApp } from '../store/AppContext'
import { getLimitesTenant, verificarLimite, getPlanTenant } from '../services/planLimits'

/**
 * Hook que expone el estado de uso vs. límites del plan del tenant activo.
 *
 * Cada propiedad devuelta sigue la forma:
 *   { permitido: boolean, actual: number, maximo: number, porcentaje: number, mensaje: string }
 */
export function usePlanLimits() {
  const { empresaId, usuarios, productos, almacenes, proveedores, clientes, ordenes } = useApp()

  const plan    = useMemo(() => getPlanTenant(empresaId),    [empresaId])
  const limites = useMemo(() => getLimitesTenant(empresaId), [empresaId])

  const mesActual   = new Date().toISOString().slice(0, 7)
  const ordenesMes  = useMemo(
    () => (ordenes || []).filter(o => (o.createdAt || '').slice(0, 7) === mesActual).length,
    [ordenes, mesActual],
  )

  return useMemo(() => {
    if (!limites) {
      // Sin plan asignado → acceso libre (no bloquear)
      const libre = { permitido: true, actual: 0, maximo: -1, porcentaje: 0, mensaje: '' }
      return { plan: null, limites: null, usuarios: libre, productos: libre, almacenes: libre, proveedores: libre, clientes: libre, ordenesMes: libre }
    }

    return {
      plan,
      limites,
      usuarios:    verificarLimite((usuarios    || []).length, limites.maxUsuarios,    'usuarios'),
      productos:   verificarLimite((productos   || []).length, limites.maxProductos,   'productos'),
      almacenes:   verificarLimite((almacenes   || []).filter(a => a.activo !== false).length, limites.maxAlmacenes,   'almacenes'),
      proveedores: verificarLimite((proveedores || []).length, limites.maxProveedores, 'proveedores'),
      clientes:    verificarLimite((clientes    || []).length, limites.maxClientes,    'clientes'),
      ordenesMes:  verificarLimite(ordenesMes,                 limites.maxOrdenesMes,  'órdenes este mes'),
    }
  }, [plan, limites, usuarios, productos, almacenes, proveedores, clientes, ordenesMes])
}
