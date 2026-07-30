import { useMemo } from 'react'
import { useConfiguracion } from '../queries/configuracion.queries'
import { verificarLimite } from '../services/planLimits'
import { useUsuariosList } from '../queries/usuarios.queries'
import { useProductosList } from '../queries/productos.queries'
import { useAlmacenesList } from '../queries/almacenes.queries'
import { useProveedoresList } from '../queries/proveedores.queries'
import { useClientesList } from '../queries/clientes.queries'
import { useOrdenesCompraList } from '../queries/ordenes-compra.queries'

/**
 * Hook que expone el estado de uso vs. límites del plan del tenant activo.
 *
 * Cada propiedad devuelta sigue la forma:
 *   { permitido: boolean, actual: number, maximo: number, porcentaje: number, mensaje: string }
 */
export function usePlanLimits() {
  // useApp() ya no expone datos de negocio (solo sesión/UI-state) — antes esto
  // destructuraba usuarios/productos/etc. de ahí y siempre daba undefined,
  // así que el uso reportado quedaba en 0 sin importar los datos reales.
  const { data: usuarios    = [] } = useUsuariosList()
  const { data: productos   = [] } = useProductosList()
  const { data: almacenes   = [] } = useAlmacenesList()
  const { data: proveedores = [] } = useProveedoresList()
  const { data: clientes    = [] } = useClientesList()
  const { data: ordenes     = [] } = useOrdenesCompraList()
  const { data: configApi } = useConfiguracion()

  const plan    = configApi?.plan    ?? null
  const limites = configApi?.limites ?? null

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
