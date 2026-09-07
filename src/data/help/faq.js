// Centro de Ayuda — Preguntas frecuentes (spec sección 24)

export const FAQ = [
  {
    slug: 'diferencia-disponible-comprometido',
    pregunta: '¿Cuál es la diferencia entre stock disponible y stock comprometido?',
    respuesta: 'El stock disponible es lo que se puede vender o usar ahora mismo. El stock comprometido es la parte del stock total que ya está apartada para un pedido u operación aprobada, aunque el despacho físico todavía no ocurra. Disponible = Total − Reservado − Comprometido.',
    relacionados: ['stock-disponible', 'stock-comprometido'],
  },
  {
    slug: 'cuando-actualiza-stock',
    pregunta: '¿Cuándo se actualiza el stock?',
    respuesta: 'El stock se actualiza automáticamente al confirmar una operación: recepción confirmada (suma), despacho confirmado (resta), transferencia confirmada en destino (suma en destino, resta en origen), o ajuste confirmado (suma o resta según el motivo). Mientras una operación esté en borrador o pendiente de confirmación, el stock real no cambia.',
    relacionados: ['stock', 'entrada', 'salida'],
  },
  {
    slug: 'transferencia-en-transito',
    pregunta: '¿Las transferencias entre almacenes quedan "en tránsito"?',
    respuesta: 'No en este sistema. Las transferencias son instantáneas: al registrarlas, un único movimiento resta la cantidad del almacén origen y la suma al almacén destino en el mismo momento. No hay un paso intermedio de "envío" y "confirmación de recepción" por separado.',
    relacionados: ['transferencia', 'almacen'],
  },
  {
    slug: 'modificar-recepcion-confirmada',
    pregunta: '¿Puedo modificar una entrada ya registrada?',
    respuesta: 'No directamente. Una vez registrada, la entrada ya actualizó el stock y el kardex. Si hay un error (cantidad, producto, costo), se usa el botón "Anular" sobre esa fila — genera automáticamente un ajuste negativo equivalente, sin editar ni borrar el registro original, para conservar el historial completo.',
    relacionados: ['entrada', 'ajuste', 'kardex'],
  },
  {
    slug: 'diferencia-inventario',
    pregunta: '¿Qué ocurre cuando existe una diferencia de inventario?',
    respuesta: 'Al comparar el conteo físico contra el stock del sistema, cualquier diferencia (sobrante o faltante) debe registrarse como un ajuste con un motivo documentado. El ajuste corrige el stock del sistema para que coincida con la realidad física, y queda registrado en el kardex del artículo.',
    relacionados: ['ajuste', 'inventario', 'kardex'],
  },
  {
    slug: 'quien-realizo-movimiento',
    pregunta: '¿Cómo puedo saber quién realizó un movimiento?',
    respuesta: 'Cada línea del kardex de un artículo indica el usuario que confirmó la operación, la fecha/hora exacta, el tipo de movimiento y el motivo. Para una vista más amplia por usuario o por módulo del sistema, se usa el módulo de Auditoría.',
    relacionados: ['kardex', 'trazabilidad'],
  },
  {
    slug: 'historial-de-lote',
    pregunta: '¿Cómo consulto los lotes de un producto?',
    respuesta: 'Desde el módulo de Lotes y Series, busca el producto por SKU o nombre (no por número de lote). Verás todos sus lotes con cantidad original, cantidad actual disponible, % consumido y estado (Vigente / Por Vencer / Vencido).',
    relacionados: ['lote', 'fecha-vencimiento'],
  },
]
