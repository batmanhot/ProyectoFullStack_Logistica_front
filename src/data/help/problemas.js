// Centro de Ayuda — Problemas frecuentes (spec sección 23)

export const PROBLEMAS = [
  {
    slug: 'no-puedo-registrar-recepcion',
    problema: 'No puedo registrar una recepción',
    causas: [
      'No se seleccionó un almacén de destino.',
      'El documento (orden de compra / guía) es inválido o no coincide.',
      'El artículo está desactivado en el catálogo.',
      'El periodo contable/operativo está cerrado.',
      'El usuario no tiene el permiso de "Entradas" asignado en su rol.',
    ],
    solucion: 'Revisa el mensaje de error específico que muestra el formulario — casi siempre apunta exactamente a cuál de las causas aplica. Verifica en este orden: almacén seleccionado → estado del artículo (Configuración → Artículos) → tu rol y permisos (Usuarios y Roles). Si el periodo está cerrado, contacta a un administrador para reabrirlo o para registrar la recepción en el periodo correcto.',
    prevencion: 'Antes de recibir mercadería, confirma que la orden de compra esté aprobada y que los artículos involucrados estén activos en el catálogo.',
    relacionados: ['recepcion', 'entrada'],
  },
  {
    slug: 'stock-aparece-en-cero',
    problema: 'El stock aparece en cero',
    causas: [
      'Estás viendo un almacén distinto al que realmente tiene el stock.',
      'El stock está en una ubicación distinta a la esperada.',
      'El stock pertenece a un lote específico que no aparece con los filtros actuales.',
      'El artículo está desactivado (algunos reportes ocultan artículos inactivos).',
      'Hay filtros de búsqueda aplicados (categoría, marca, fecha) que excluyen el resultado.',
    ],
    solucion: 'Quita todos los filtros de la pantalla de Inventario y busca el artículo por SKU exacto. Revisa el selector de almacén en la parte superior — es la causa más común. Si sigue en cero, consulta el Kardex del artículo: ahí se ve el último movimiento y en qué almacén quedó el saldo.',
    prevencion: 'Al reportar "stock en cero" a soporte, incluye siempre el SKU exacto y el almacén — reduce drásticamente el tiempo de diagnóstico.',
    relacionados: ['stock', 'kardex', 'almacen'],
  },
  {
    slug: 'no-puedo-transferir-productos',
    problema: 'No puedo transferir productos',
    causas: [
      'No hay suficiente stock disponible en el almacén origen (puede estar reservado o comprometido).',
      'El almacén origen seleccionado no es el correcto.',
      'El usuario no tiene permiso sobre el módulo de Transferencias.',
      'La transferencia ya tiene un estado distinto a "pendiente" (por ejemplo, ya fue cancelada).',
    ],
    solucion: 'Verifica el stock disponible (no el total) del artículo en el almacén origen desde el módulo de Inventario. Si el stock está reservado por otra operación, esa reserva debe liberarse antes de poder transferirlo. Confirma también tu rol en Usuarios y Roles.',
    prevencion: 'Antes de crear una transferencia grande, consulta el stock disponible del artículo en el almacén origen para confirmar que alcanza.',
    relacionados: ['transferencia', 'stock-disponible'],
  },
]
