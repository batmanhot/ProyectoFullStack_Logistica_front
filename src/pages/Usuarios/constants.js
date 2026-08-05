// Misma agrupación por secciones que `components/layout/Sidebar.jsx` (NAV, los
// `divider`) — duplicada a mano acá para el editor de permisos por rol, no hay una
// fuente única. Si se reagrupa el menú, replicar el mismo cambio acá (mismos
// `modulo`/`id`) o este editor queda con una clasificación distinta a la del menú real.
export const MODULOS_GRUPOS = [
  {
    grupo: 'General', color: '#00c896',
    items: [
      { id:'dashboard',       label:'Dashboard',              desc:'Panel principal con KPIs'          },
      { id:'alertas',         label:'Alertas',                desc:'Centro de notificaciones'          },
    ]
  },
  {
    grupo: 'Inventario', color: '#3b82f6',
    items: [
      { id:'inventario',      label:'Inventario',             desc:'Catálogo y stock de productos'     },
      { id:'kardex',          label:'Kardex',                 desc:'Historial valorizado por producto' },
      { id:'movimientos',     label:'Movimientos',            desc:'Historial de todos los movimientos'},
      { id:'inv-fisico',      label:'Inventario Físico',      desc:'Conteo cíclico y ajuste masivo'    },
    ]
  },
  {
    grupo: 'Operaciones', color: '#22c55e',
    items: [
      { id:'entradas',        label:'Entradas',               desc:'Registro de ingresos de stock'     },
      { id:'salidas',         label:'Salidas',                desc:'Registro de egresos de stock'      },
      { id:'ajustes',         label:'Ajustes',                desc:'Ajustes de inventario'             },
      { id:'devoluciones',    label:'Devoluciones',           desc:'Devoluciones cliente/proveedor'    },
      { id:'transferencias',  label:'Transferencias',         desc:'Traslados entre almacenes'         },
    ]
  },
  {
    grupo: 'Despachos', color: '#8b5cf6',
    items: [
      { id:'clientes',        label:'Clientes',               desc:'Gestión de clientes'               },
      { id:'despachos',       label:'Despachos',              desc:'Pedidos y guías de remisión'       },
      { id:'pedidos-internos',label:'Pedidos Internos',       desc:'Solicitudes internas al almacén'   },
      { id:'portal-pedidos',  label:'Portal de Pedidos',      desc:'Portal web para clientes'          },
      { id:'picking',         label:'Picking',                desc:'Preparación de pedidos en almacén' },
      { id:'empaque',         label:'Empaque / Packing',      desc:'Control de empaque y embalaje'     },
      { id:'transportes',     label:'Transportes',            desc:'Rutas, transportistas y tracking'  },
      { id:'flota',           label:'Flota',                  desc:'Vehículos y mantenimiento'         },
    ]
  },
  {
    grupo: 'Ventas', color: '#ec4899',
    items: [
      { id:'lista-precios',   label:'Lista de Precios',       desc:'Gestión de precios de venta'       },
      { id:'proformas',       label:'Proformas',              desc:'Cotizaciones comerciales'          },
      { id:'sunat',           label:'SUNAT / Fact.',          desc:'Facturación electrónica'           },
      { id:'cxc',             label:'Cuentas por Cobrar',     desc:'Seguimiento de cobranzas'          },
    ]
  },
  {
    grupo: 'Compras', color: '#f59e0b',
    items: [
      { id:'ordenes',         label:'Órdenes de Compra',      desc:'Ciclo de compras a proveedores'    },
      { id:'cotizaciones',    label:'Cotizaciones',           desc:'RFQ y comparativa de precios'      },
      { id:'proveedores',     label:'Proveedores',            desc:'Gestión de proveedores'            },
    ]
  },
  {
    grupo: 'Almacén', color: '#84cc16',
    items: [
      { id:'mapa-almacen',    label:'Mapa de Almacén',        desc:'Vista visual del almacén'          },
      { id:'lotes-series',    label:'Lotes y Series',         desc:'Trazabilidad de lotes'             },
    ]
  },
  {
    grupo: 'Análisis', color: '#06b6d4',
    items: [
      { id:'vencimientos',    label:'Vencimientos',           desc:'Control de fechas de vencimiento'  },
      { id:'reorden',         label:'Punto de Reorden',       desc:'Alertas de reposición'             },
      { id:'prevision',       label:'Previsión',              desc:'Proyección de demanda'             },
      { id:'reportes',        label:'Reportes',               desc:'ABC, rotación, valorizado'         },
      { id:'kpis',            label:'KPIs Operativos',        desc:'Indicadores clave de operaciones'  },
      { id:'financiero',      label:'Financiero',             desc:'Dashboard financiero'              },
    ]
  },
  {
    grupo: 'Administración', color: '#ef4444',
    items: [
      { id:'usuarios',        label:'Usuarios y Roles',       desc:'Gestión de accesos'                },
      { id:'auditoria',       label:'Auditoría',              desc:'Registro de actividades'           },
      { id:'cola-sync',       label:'Cola de Sincronización', desc:'Monitoreo de operaciones pendientes' },
      { id:'configuracion',   label:'Configuración',          desc:'Parámetros del sistema'            },
      { id:'panel-auditoria', label:'Panel de Auditoría',     desc:'Vista de solo lectura: bitácora, discrepancias, trazabilidad y conciliación' },
      { id:'incidencias',     label:'Incidencias',            desc:'Registro de errores del sistema, con severidad y estado de resolución' },
    ]
  },
]

export const TODOS_MODULOS = MODULOS_GRUPOS.flatMap(g => g.items.map(i => i.id))

// Metadatos visuales para roles del catálogo base — SOLO label/color/desc.
// Los permisos NUNCA se fabrican acá: siempre vienen de la API real (ver
// el useMemo de `roles` en index.jsx). Antes este objeto también inventaba
// `permisos` para supervisor/almacenero, desconectados de la base de datos
// real — ver informe de auditoría de roles.
export const ROLES_BASE_META = {
  owner:                   { label:'Propietario',             color:'#f59e0b', desc:'Dueño del negocio — acceso total sin restricciones' },
  admin:                   { label:'Administrador',           color:'#ef4444', desc:'Acceso total sin restricciones' },
  'gerente-operaciones':   { label:'Gerente de Operaciones',  color:'#3b82f6', desc:'Mando operativo: inventario, compras, despachos, análisis' },
  supervisor:              { label:'Supervisor de Almacén',   color:'#0ea5e9', desc:'Gestión de inventario con autoridad de ajustes' },
  almacenero:              { label:'Operario de Almacén',     color:'#22c55e', desc:'Operaciones de almacén, sin ajustes' },
  'analista-compras':      { label:'Analista de Compras',     color:'#f59e0b', desc:'Órdenes de compra, cotizaciones, proveedores' },
  'ejecutivo-comercial':   { label:'Ejecutivo Comercial',     color:'#ec4899', desc:'Clientes, proformas, cobranzas' },
  'coordinador-transporte':{ label:'Coordinador de Transporte', color:'#8b5cf6', desc:'Despachos, transportes y flota' },
  'contable-finanzas':     { label:'Contable / Finanzas',     color:'#a855f7', desc:'SUNAT, financiero, cobranzas' },
  solicitante:             { label:'Solicitante',              color:'#a855f7', desc:'Solo pedidos internos' },
  auditor:                 { label:'Auditor',                  color:'#06b6d4', desc:'Solo lectura: bitácora, discrepancias, trazabilidad y conciliación' },
}
