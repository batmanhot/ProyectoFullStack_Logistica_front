// Centro de Ayuda — Relación pantalla → artículos de ayuda (spec sección 31)
// Cada entrada usa como clave la ruta exacta de App.jsx (location.pathname).
// `tipo` indica a qué colección de src/data/help apunta cada ítem de
// "ayudaRelacionada": 'concepto' | 'procedimiento' | 'modulo'.

export const MAPEO_PANTALLAS = {
  '/entradas': {
    queEsEstaPantalla: 'Permite registrar la recepción física de mercadería que llega al almacén, para que el stock del sistema quede actualizado y trazable.',
    pasosRecomendados: [
      'Seleccione el proveedor.',
      'Seleccione el almacén de destino.',
      'Registre el documento de referencia.',
      'Ingrese los productos y cantidades.',
      'Valide las cantidades contra el documento.',
      'Confirme la recepción.',
    ],
    ayudaRelacionada: [
      { tipo: 'concepto',      slug: 'recepcion',           label: '¿Qué es una recepción?' },
      { tipo: 'procedimiento', slug: 'registrar-recepcion',  label: 'Registrar una recepción' },
      { tipo: 'modulo',        slug: 'entradas',             label: 'Ver documentación completa del módulo' },
    ],
    verProcedimientoCompleto: '/ayuda/como-hago/registrar-recepcion',
  },
  '/despachos': {
    queEsEstaPantalla: 'Gestiona el ciclo completo de un pedido de despacho: Pedido → Aprobado → Picking → Listo → Despachado → Entregado.',
    pasosRecomendados: [
      'Registre el pedido con cliente, almacén y productos.',
      'Apruebe el pedido.',
      'Ejecute el Picking, confirmando el 100% de las líneas.',
      'Marque "Listo" y luego "Despachar" (emite la Guía de Remisión).',
      'Al confirmar la entrega, registre la foto de evidencia y el nombre del receptor.',
    ],
    ayudaRelacionada: [
      { tipo: 'concepto', slug: 'despacho', label: '¿Qué es un despacho?' },
      { tipo: 'concepto', slug: 'picking',  label: '¿Qué es el picking?' },
      { tipo: 'modulo',   slug: 'despachos', label: 'Ver documentación completa del módulo' },
    ],
    verProcedimientoCompleto: '/ayuda/modulos/despachos',
  },
  '/inv-fisico': {
    queEsEstaPantalla: 'Permite contar físicamente el stock del almacén y compararlo contra el stock del sistema, generando los ajustes necesarios ante cualquier diferencia.',
    pasosRecomendados: [
      'Cree un nuevo inventario indicando almacén (obligatorio) y categoría (opcional).',
      'Recorra el almacén e ingrese la cantidad contada de cada producto.',
      'Revise la columna "Diferencia", calculada automáticamente.',
      'Complete el conteo de TODOS los productos — es obligatorio para poder cerrar.',
      'Cierre el inventario — los ajustes se generan automáticamente.',
    ],
    ayudaRelacionada: [
      { tipo: 'concepto',      slug: 'inventario',            label: '¿Qué es un inventario físico?' },
      { tipo: 'concepto',      slug: 'ajuste',                label: '¿Qué es un ajuste?' },
      { tipo: 'procedimiento', slug: 'hacer-inventario-fisico', label: 'Hacer un inventario físico' },
      { tipo: 'procedimiento', slug: 'corregir-diferencia',   label: 'Corregir una diferencia' },
      { tipo: 'modulo',        slug: 'inv-fisico',            label: 'Ver documentación completa del módulo' },
    ],
    verProcedimientoCompleto: '/ayuda/como-hago/hacer-inventario-fisico',
  },
  '/transferencias': {
    queEsEstaPantalla: 'Permite mover stock de un producto desde un almacén origen hacia un almacén destino, en un solo movimiento instantáneo (sin estado "en tránsito").',
    pasosRecomendados: [
      'Seleccione el producto.',
      'Seleccione el almacén origen y el almacén destino (deben ser distintos).',
      'Ingrese la cantidad y el motivo.',
      'Registre la transferencia — el stock se mueve de inmediato.',
    ],
    ayudaRelacionada: [
      { tipo: 'concepto',      slug: 'transferencia',    label: '¿Qué es una transferencia?' },
      { tipo: 'procedimiento', slug: 'realizar-transferencia', label: 'Realizar una transferencia' },
      { tipo: 'modulo',        slug: 'transferencias',   label: 'Ver documentación completa del módulo' },
    ],
    verProcedimientoCompleto: '/ayuda/como-hago/realizar-transferencia',
  },
  '/kardex': {
    queEsEstaPantalla: 'Muestra el historial cronológico de todos los movimientos de UN producto (entradas, salidas, transferencias, ajustes), con el saldo después de cada uno.',
    pasosRecomendados: [
      'Busque y seleccione el producto por nombre o SKU — es obligatorio para ver algo.',
      'Opcionalmente, filtre por rango de fechas (Desde / Hasta).',
      'Revise cada línea: tipo, documento, entrada/salida y saldo resultante.',
      'Recuerde que se muestra el movimiento más reciente primero.',
    ],
    ayudaRelacionada: [
      { tipo: 'concepto',      slug: 'kardex',   label: '¿Qué es el kardex?' },
      { tipo: 'concepto',      slug: 'stock',    label: '¿Qué es el stock?' },
      { tipo: 'procedimiento', slug: 'consultar-kardex', label: 'Consultar el kardex' },
      { tipo: 'modulo',        slug: 'kardex',   label: 'Ver documentación completa del módulo' },
    ],
    verProcedimientoCompleto: '/ayuda/como-hago/consultar-kardex',
  },
  '/vencimientos': {
    queEsEstaPantalla: 'Muestra los lotes próximos a vencer, ordenados por fecha, para priorizar su salida (política FEFO: primero en vencer, primero en salir) antes de que se conviertan en merma.',
    pasosRecomendados: [
      'Revise el listado ordenado por fecha de vencimiento más próxima.',
      'Filtre por almacén, categoría o rango de días restantes.',
      'Use esta lista como prioridad al hacer picking.',
      'Para lotes ya vencidos, registre la baja mediante un ajuste.',
    ],
    ayudaRelacionada: [
      { tipo: 'concepto',      slug: 'fecha-vencimiento', label: '¿Qué es la fecha de vencimiento?' },
      { tipo: 'concepto',      slug: 'lote',              label: '¿Qué es un lote?' },
      { tipo: 'procedimiento', slug: 'consultar-proximos-vencer', label: 'Consultar productos próximos a vencer' },
    ],
    verProcedimientoCompleto: '/ayuda/como-hago/consultar-proximos-vencer',
  },
  '/reportes': {
    queEsEstaPantalla: 'Reportes analíticos: Rentabilidad, Inventario Valorizado, Movimientos por Período, Análisis ABC y Rotación por Categoría.',
    pasosRecomendados: [
      'Elija la pestaña del reporte que necesita.',
      'Revise el resultado en pantalla (gráficos y tablas).',
      'Expórtelo a Excel o PDF si lo necesita fuera del sistema.',
    ],
    ayudaRelacionada: [
      { tipo: 'modulo', slug: 'reportes', label: 'Ver documentación completa del módulo' },
    ],
    verProcedimientoCompleto: '/ayuda/modulos/reportes',
  },
  '/inventario': {
    queEsEstaPantalla: 'El maestro de artículos: aquí se crea y configura cada producto que la empresa maneja, con su SKU, código de barras, unidad de medida, categoría, proveedor y precios.',
    pasosRecomendados: [
      'Al crear un artículo, defina primero el SKU y la unidad de medida.',
      'Marque "Producto perecedero" si el artículo tiene fecha de vencimiento.',
      'Defina el stock mínimo para recibir alertas de reposición.',
      'El stock inicial no se define aquí: se carga después con una Entrada.',
    ],
    ayudaRelacionada: [
      { tipo: 'concepto', slug: 'articulo',       label: '¿Qué es un artículo?' },
      { tipo: 'concepto', slug: 'sku',            label: '¿Qué es el SKU?' },
      { tipo: 'modulo',   slug: 'articulos',      label: 'Ver documentación completa del módulo' },
    ],
    verProcedimientoCompleto: '/ayuda/modulos/articulos',
  },
  '/maestros': {
    queEsEstaPantalla: 'Pantalla "Categorías y Almacenes" con dos pestañas: Categorías (se abre por defecto) y Almacenes. Aquí se crean los almacenes de la empresa — por ahora solo con nombre y estado activo/inactivo, sin sub-ubicaciones.',
    pasosRecomendados: [
      'Haga clic en la pestaña "Almacenes" arriba (Categorías es la que se ve por defecto).',
      'Cree el almacén indicando únicamente su nombre.',
      'No desactive un almacén con stock activo sin antes transferirlo.',
    ],
    ayudaRelacionada: [
      { tipo: 'concepto', slug: 'almacen',   label: '¿Qué es un almacén?' },
      { tipo: 'modulo',   slug: 'almacenes', label: 'Ver documentación completa del módulo' },
    ],
    verProcedimientoCompleto: '/ayuda/modulos/almacenes',
  },
  '/usuarios': {
    queEsEstaPantalla: 'Gestión de cuentas de acceso (Usuarios) y de los roles que determinan qué módulos puede ver y usar cada persona (Roles y Permisos).',
    pasosRecomendados: [
      'Al crear un usuario, asígnele un rol existente o cree uno nuevo.',
      'Revise qué módulos tiene habilitados ese rol antes de asignarlo.',
      'Los roles base del sistema no se pueden eliminar, solo editar sus permisos.',
    ],
    ayudaRelacionada: [
      { tipo: 'modulo', slug: 'usuarios', label: 'Ver documentación completa del módulo' },
    ],
    verProcedimientoCompleto: '/ayuda/modulos/usuarios',
  },
  '/ajustes': {
    queEsEstaPantalla: 'Permite registrar correcciones manuales de stock: ajustes positivos (sobrante, devolución no registrada) o negativos (merma, daño, robo, producto vencido).',
    pasosRecomendados: [
      'Elija el tipo: Positivo o Negativo.',
      'Seleccione el producto y el almacén.',
      'Elija el motivo específico de la lista (evite "Otro" cuando pueda).',
      'Ingrese la cantidad (siempre en positivo) y, si aplica, el costo unitario.',
      'Registre el ajuste.',
    ],
    ayudaRelacionada: [
      { tipo: 'concepto', slug: 'ajuste',  label: '¿Qué es un ajuste?' },
      { tipo: 'modulo',   slug: 'ajustes', label: 'Ver documentación completa del módulo' },
    ],
    verProcedimientoCompleto: '/ayuda/como-hago/corregir-diferencia',
  },
  '/lista-precios': {
    queEsEstaPantalla: 'Define listas de precios de venta (descuento % o markup %) y permite fijar precios especiales por producto dentro de cada lista.',
    pasosRecomendados: [
      'Elige la lista con las pestañas superiores, o crea una nueva.',
      'Define un Descuento % (sobre el precio base) o un Markup % (sobre el costo) — son excluyentes.',
      'Ajusta el precio de un producto puntual con el ícono de edición si necesita un valor especial.',
      'Usa "Reset" para quitar un precio especial y volver al cálculo general de la lista.',
    ],
    ayudaRelacionada: [
      { tipo: 'concepto', slug: 'lista-precio', label: '¿Qué es una Lista de Precios?' },
      { tipo: 'modulo',   slug: 'lista-precios', label: 'Ver documentación completa del módulo' },
    ],
    verProcedimientoCompleto: '/ayuda/modulos/lista-precios',
  },
  '/proformas': {
    queEsEstaPantalla: 'Gestiona cotizaciones de venta: crear, enviar, aceptar/rechazar y convertir en Despacho real una vez aceptadas.',
    pasosRecomendados: [
      'Crea la proforma con cliente, lista de precios (opcional) e ítems.',
      'Cuando el cliente responde, márcala como Aceptada o Rechazada.',
      'Si fue Aceptada, usa "Convertir a Despacho" para generar la salida real (reserva stock).',
      'Comparte por WhatsApp o descarga el PDF cuando lo necesites.',
    ],
    ayudaRelacionada: [
      { tipo: 'concepto', slug: 'proforma', label: '¿Qué es una proforma?' },
      { tipo: 'concepto', slug: 'despacho', label: '¿Qué es un despacho?' },
      { tipo: 'modulo',   slug: 'proformas', label: 'Ver documentación completa del módulo' },
    ],
    verProcedimientoCompleto: '/ayuda/modulos/proformas',
  },
  '/cxc': {
    queEsEstaPantalla: 'Seguimiento de cobranza: cada cuenta por cobrar muestra el monto, saldo pendiente y estado (Pendiente, Parcial, Cobrada, Vencida) de una deuda de cliente.',
    pasosRecomendados: [
      'Crea la cuenta indicando cliente, monto y días de crédito (o genérala directo desde un Despacho a crédito).',
      'Registra cada abono recibido con "Registrar pago".',
      'Revisa el filtro "Vencida" para priorizar la gestión de cobranza.',
    ],
    ayudaRelacionada: [
      { tipo: 'concepto', slug: 'cuenta-por-cobrar', label: '¿Qué es una Cuenta por Cobrar?' },
      { tipo: 'modulo',   slug: 'cxc', label: 'Ver documentación completa del módulo' },
    ],
    verProcedimientoCompleto: '/ayuda/modulos/cxc',
  },
  '/sunat': {
    queEsEstaPantalla: 'Seguimiento de Guías de Remisión Electrónica (GRE): genera el JSON con el formato SUNAT para cada despacho y registra su estado (Pendiente, Enviado, Aceptado, Rechazado).',
    pasosRecomendados: [
      'Genera el documento de un despacho que ya tenga número de guía asignado.',
      'Copia o exporta el JSON y envíalo a través de tu proveedor OSE (Nubefact, Factura.com, etc.).',
      'Actualiza el estado (Enviado, luego Aceptado o Rechazado) según la respuesta real que recibas del OSE.',
    ],
    ayudaRelacionada: [
      { tipo: 'concepto', slug: 'despacho', label: '¿Qué es un despacho?' },
      { tipo: 'modulo',   slug: 'sunat', label: 'Ver documentación completa del módulo' },
    ],
    verProcedimientoCompleto: '/ayuda/modulos/sunat',
  },
  '/oportunidades': {
    queEsEstaPantalla: 'Pipeline comercial: cada oportunidad es un trato en seguimiento, con actividades registradas y un estado que va de Nueva a Ganada/Perdida/Cancelada.',
    pasosRecomendados: [
      'Crea la oportunidad con cliente, contacto y valor estimado.',
      'Registra cada actividad de seguimiento (llamada, reunión, etc.) con su próxima acción.',
      'Avanza el estado (Calificada, Cotizada, En Negociación) a medida que progresa el trato.',
      'Vincula una Proforma cuando envíes una cotización real.',
      'Cierra como Ganada o Perdida (con motivo) cuando se defina.',
    ],
    ayudaRelacionada: [
      { tipo: 'concepto', slug: 'oportunidad', label: '¿Qué es una oportunidad?' },
      { tipo: 'modulo',   slug: 'oportunidades', label: 'Ver documentación completa del módulo' },
    ],
    verProcedimientoCompleto: '/ayuda/modulos/oportunidades',
  },
  '/pedidos-internos': {
    queEsEstaPantalla: 'Solicitudes de materiales de un área hacia el almacén, para consumo interno (no venta) — con aprobación, picking y entrega, opcionalmente etiquetadas a un Proyecto.',
    pasosRecomendados: [
      'Crea el pedido con área, almacén, productos y, si aplica, el proyecto al que corresponde.',
      'Envíalo y espera la Aprobación (o Rechazo con motivo).',
      'Almacén inicia el Picking y luego Marca Entregado — ahí se descuenta el stock real.',
      'Quien pidió el material confirma su recibo desde el aviso o el detalle del pedido.',
    ],
    ayudaRelacionada: [
      { tipo: 'concepto', slug: 'pedido-interno', label: '¿Qué es un Pedido Interno?' },
      { tipo: 'modulo',   slug: 'pedidos-internos', label: 'Ver documentación completa del módulo' },
    ],
    verProcedimientoCompleto: '/ayuda/modulos/pedidos-internos',
  },
}
