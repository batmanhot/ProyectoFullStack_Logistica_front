/**
 * initialData.js — Datos semilla enriquecidos para demo / presentación.
 *
 * Todos los IDs son strings para ser consistentes con crypto.randomUUID()
 * y con lo que devolverá el backend (MongoDB ObjectId / PostgreSQL UUID).
 *
 * Al migrar a backend, este archivo deja de usarse — los datos vendrán de la API.
 * storageAdapter.js es el único punto que cambia.
 */

// ---------------------------------------------------------------------------
// CATÁLOGO — 10 productos de logística industrial peruana
// ---------------------------------------------------------------------------
export const InitialCatalog = [
    { id: 'seed-cat-01', sku: 'PAL-001', nombre: 'Pallet Plástico HD 1.2x1.0m',  categoria: 'Almacenamiento', barcode: '7750010011', estado: 'Activo', esPerecedero: false, precios: { compraPEN: 85,  ventaPEN: 120,  compraUSD: 22,  ventaUSD: 32  } },
    { id: 'seed-cat-02', sku: 'PAL-002', nombre: 'Pallet Madera Europa 1.2x0.8m', categoria: 'Almacenamiento', barcode: '7750010012', estado: 'Activo', esPerecedero: false, precios: { compraPEN: 35,  ventaPEN: 55,   compraUSD: 9,   ventaUSD: 15  } },
    { id: 'seed-cat-03', sku: 'EMB-001', nombre: 'Film Stretch 50cm x 300m',      categoria: 'Embalaje',       barcode: '7750010021', estado: 'Activo', esPerecedero: false, precios: { compraPEN: 28,  ventaPEN: 42,   compraUSD: 7,   ventaUSD: 11  } },
    { id: 'seed-cat-04', sku: 'EMB-002', nombre: 'Cinta Embalaje 48mm x 100m',    categoria: 'Embalaje',       barcode: '7750010022', estado: 'Activo', esPerecedero: false, precios: { compraPEN: 6,   ventaPEN: 9,    compraUSD: 1.5, ventaUSD: 2.5 } },
    { id: 'seed-cat-05', sku: 'EMB-003', nombre: 'Zuncho PET 16mm x 800m',        categoria: 'Embalaje',       barcode: '7750010023', estado: 'Activo', esPerecedero: false, precios: { compraPEN: 95,  ventaPEN: 140,  compraUSD: 25,  ventaUSD: 37  } },
    { id: 'seed-cat-06', sku: 'INS-001', nombre: 'Lubricante Industrial 5L',      categoria: 'Insumos',        barcode: '7750010031', estado: 'Activo', esPerecedero: true,  precios: { compraPEN: 65,  ventaPEN: 98,   compraUSD: 17,  ventaUSD: 26  } },
    { id: 'seed-cat-07', sku: 'INS-002', nombre: 'Desengrasante Concentrado 1L',  categoria: 'Insumos',        barcode: '7750010032', estado: 'Activo', esPerecedero: true,  precios: { compraPEN: 22,  ventaPEN: 35,   compraUSD: 6,   ventaUSD: 9   } },
    { id: 'seed-cat-08', sku: 'PRO-001', nombre: 'Guantes Nitrilo Caja x100',     categoria: 'Protección',     barcode: '7750010041', estado: 'Activo', esPerecedero: false, precios: { compraPEN: 38,  ventaPEN: 58,   compraUSD: 10,  ventaUSD: 15  } },
    { id: 'seed-cat-09', sku: 'PRO-002', nombre: 'Casco Seguridad ANSI Z89.1',    categoria: 'Protección',     barcode: '7750010042', estado: 'Activo', esPerecedero: false, precios: { compraPEN: 45,  ventaPEN: 70,   compraUSD: 12,  ventaUSD: 18  } },
    { id: 'seed-cat-10', sku: 'PRO-003', nombre: 'Lentes Seguridad Policarbonato',categoria: 'Protección',     barcode: '7750010043', estado: 'Activo', esPerecedero: false, precios: { compraPEN: 12,  ventaPEN: 20,   compraUSD: 3,   ventaUSD: 5   } },
];

export const InitialWarehouses = ['Central', 'Norte', 'Sur', 'Virtual'];

// ---------------------------------------------------------------------------
// SOCIOS — clientes y proveedores reales del sector logístico
// ---------------------------------------------------------------------------
export const InitialPartners = [
    { id: 'seed-par-01', nombre: 'KOTECO SA',               tipo: 'Cliente',   ruc: '20501234567', telefono: '01-444-5555', email: 'logistica@koteco.com',     direccion: 'Av. Separadora Industrial 1420, ATE',    estado: 'Activo' },
    { id: 'seed-par-02', nombre: 'SODIMAC PERU SAC',         tipo: 'Cliente',   ruc: '20331898008', telefono: '01-611-5000', email: 'compras@sodimac.com.pe',   direccion: 'Av. Benavides 1944, Miraflores',          estado: 'Activo' },
    { id: 'seed-par-03', nombre: 'FERREYROS SAC',            tipo: 'Cliente',   ruc: '20100100290', telefono: '01-215-1300', email: 'pedidos@ferreyros.com.pe', direccion: 'Av. Argentina 3505, Callao',              estado: 'Activo' },
    { id: 'seed-par-04', nombre: 'MAKRO SUPERMAYORISTA',     tipo: 'Cliente',   ruc: '20521299275', telefono: '01-500-8000', email: 'abastecimiento@makro.pe',  direccion: 'Av. Universitaria 6355, Los Olivos',      estado: 'Activo' },
    { id: 'seed-par-05', nombre: 'PLASTICOS DEL SUR SAC',   tipo: 'Proveedor', ruc: '20109876543', telefono: '01-222-3333', email: 'ventas@plasticosdelsur.pe', direccion: 'Calle Los Hornos 456, Villa El Salvador', estado: 'Activo' },
    { id: 'seed-par-06', nombre: 'INDECO SA',                tipo: 'Proveedor', ruc: '20100071140', telefono: '01-319-1000', email: 'ventas@indeco.com.pe',     direccion: 'Av. Néstor Gambetta 6585, Callao',        estado: 'Activo' },
    { id: 'seed-par-07', nombre: 'DINET OPERACIONES SAC',    tipo: 'Proveedor', ruc: '20418896915', telefono: '01-618-9000', email: 'operaciones@dinet.com.pe', direccion: 'Av. Los Eucaliptos 601, Lurín',           estado: 'Activo' },
    { id: 'seed-par-08', nombre: 'RANSA COMERCIAL SA',       tipo: 'Proveedor', ruc: '20100045328', telefono: '01-628-3000', email: 'comercial@ransa.net',      direccion: 'Av. Gambetta 793, Callao',                estado: 'Activo' },
];

// ---------------------------------------------------------------------------
// CATEGORÍAS
// ---------------------------------------------------------------------------
export const InitialCategories = [
    { id: 'seed-ctg-1', nombre: 'General',        descripcion: 'Artículos de uso general',          estado: 'Activo' },
    { id: 'seed-ctg-2', nombre: 'Almacenamiento', descripcion: 'Pallets, Racks, Contenedores',       estado: 'Activo' },
    { id: 'seed-ctg-3', nombre: 'Embalaje',        descripcion: 'Films, Cintas, Zunchos, Esquineros', estado: 'Activo' },
    { id: 'seed-ctg-4', nombre: 'Protección',      descripcion: 'EPP: Guantes, Cascos, Lentes',      estado: 'Activo' },
    { id: 'seed-ctg-5', nombre: 'Insumos',         descripcion: 'Lubricantes, Químicos, Solventes',  estado: 'Activo' },
];

// ---------------------------------------------------------------------------
// LOTES — con distintos estados para demostrar alertas en reportes
// ---------------------------------------------------------------------------
export const InitialBatches = [
    { id: 'seed-bat-01', sku: 'INS-001', numero: 'L-2025-001', fechaVencimiento: '2026-09-30', cantidadOriginal: 200, cantidadActual: 145, estado: 'Vigente'    },
    { id: 'seed-bat-02', sku: 'INS-001', numero: 'L-2025-002', fechaVencimiento: '2025-12-15', cantidadOriginal: 150, cantidadActual: 80,  estado: 'Vigente'    },
    { id: 'seed-bat-03', sku: 'INS-002', numero: 'L-2025-003', fechaVencimiento: '2026-03-10', cantidadOriginal: 300, cantidadActual: 210, estado: 'Vigente'    },
    { id: 'seed-bat-04', sku: 'INS-002', numero: 'L-2024-EXP', fechaVencimiento: '2024-06-01', cantidadOriginal: 100, cantidadActual: 12,  estado: 'Vencido'    },
    { id: 'seed-bat-05', sku: 'EMB-001', numero: 'L-2025-004', fechaVencimiento: '2026-01-20', cantidadOriginal: 500, cantidadActual: 320, estado: 'Vigente'    },
    { id: 'seed-bat-06', sku: 'EMB-003', numero: 'L-NEAR-01',  fechaVencimiento: '2025-04-30', cantidadOriginal: 80,  cantidadActual: 55,  estado: 'Por Vencer' },
    { id: 'seed-bat-07', sku: 'INS-001', numero: 'L-NEAR-02',  fechaVencimiento: '2025-05-15', cantidadOriginal: 120, cantidadActual: 90,  estado: 'Por Vencer' },
];

// ---------------------------------------------------------------------------
// TRANSPORTISTAS
// ---------------------------------------------------------------------------
export const InitialTransporters = [
    { id: 'seed-trp-1', nombre: 'EXPRESO MARVISUR SAC',     ruc: '20501234500', placa: 'V1Z-980', chofer: 'Juan Pérez Quispe',      telefono: '988-777-666', estado: 'Activo'   },
    { id: 'seed-trp-2', nombre: 'LOGISTICA RAPIDA SAC',     ruc: '20109876544', placa: 'B4X-123', chofer: 'Carlos López Huanca',    telefono: '955-444-333', estado: 'Activo'   },
    { id: 'seed-trp-3', nombre: 'TRANSPORTE MILAGROS EIRL', ruc: '20378451290', placa: 'D7T-456', chofer: 'Rosa Mamani Condori',    telefono: '965-321-789', estado: 'Activo'   },
    { id: 'seed-trp-4', nombre: 'GLP CARGO SAC',            ruc: '20456123789', placa: 'F2K-891', chofer: 'Miguel Torres Espinoza', telefono: '944-567-890', estado: 'Inactivo' },
];

// ---------------------------------------------------------------------------
// UBICACIONES — capacidades actuales reflejan el stock semilla
// ---------------------------------------------------------------------------
export const InitialLocations = [
    // Almacén Central
    { id: 'seed-loc-01', almacen: 'Central', codigo: 'A-01-01', tipo: 'Estantería', zona: 'Picking',     capacidadMax: 100, capacidadActual: 72,  estado: 'Disponible', observaciones: '' },
    { id: 'seed-loc-02', almacen: 'Central', codigo: 'A-01-02', tipo: 'Estantería', zona: 'Picking',     capacidadMax: 100, capacidadActual: 58,  estado: 'Disponible', observaciones: '' },
    { id: 'seed-loc-03', almacen: 'Central', codigo: 'A-02-01', tipo: 'Estantería', zona: 'Picking',     capacidadMax: 100, capacidadActual: 45,  estado: 'Disponible', observaciones: '' },
    { id: 'seed-loc-04', almacen: 'Central', codigo: 'B-01-01', tipo: 'Rack',       zona: 'Reserva',     capacidadMax: 200, capacidadActual: 160, estado: 'Disponible', observaciones: '' },
    { id: 'seed-loc-05', almacen: 'Central', codigo: 'B-01-02', tipo: 'Rack',       zona: 'Reserva',     capacidadMax: 200, capacidadActual: 95,  estado: 'Disponible', observaciones: '' },
    { id: 'seed-loc-06', almacen: 'Central', codigo: 'P-01',    tipo: 'Piso',       zona: 'Reserva',     capacidadMax: 50,  capacidadActual: 50,  estado: 'Lleno',      observaciones: 'Pallets europeos en espera despacho' },
    { id: 'seed-loc-07', almacen: 'Central', codigo: 'C-01-01', tipo: 'Estantería', zona: 'Cuarentena',  capacidadMax: 60,  capacidadActual: 12,  estado: 'Disponible', observaciones: 'Lotes pendientes inspección QC' },
    // Almacén Norte
    { id: 'seed-loc-08', almacen: 'Norte', codigo: 'A-01-01', tipo: 'Estantería', zona: 'Picking',  capacidadMax: 80,  capacidadActual: 60,  estado: 'Disponible', observaciones: '' },
    { id: 'seed-loc-09', almacen: 'Norte', codigo: 'A-01-02', tipo: 'Estantería', zona: 'Picking',  capacidadMax: 80,  capacidadActual: 35,  estado: 'Disponible', observaciones: '' },
    { id: 'seed-loc-10', almacen: 'Norte', codigo: 'B-01-01', tipo: 'Rack',       zona: 'Reserva',  capacidadMax: 150, capacidadActual: 80,  estado: 'Disponible', observaciones: '' },
    { id: 'seed-loc-11', almacen: 'Norte', codigo: 'P-01',    tipo: 'Piso',       zona: 'Reserva',  capacidadMax: 30,  capacidadActual: 18,  estado: 'Disponible', observaciones: '' },
    // Almacén Sur
    { id: 'seed-loc-12', almacen: 'Sur', codigo: 'A-01-01', tipo: 'Estantería', zona: 'Picking', capacidadMax: 60, capacidadActual: 28, estado: 'Disponible', observaciones: '' },
    { id: 'seed-loc-13', almacen: 'Sur', codigo: 'P-01',    tipo: 'Piso',       zona: 'Reserva', capacidadMax: 40, capacidadActual: 10, estado: 'Disponible', observaciones: '' },
];

// ---------------------------------------------------------------------------
// INVENTARIO — stock por almacén y ubicación
// Refleja el resultado acumulado de los movimientos semilla.
// ---------------------------------------------------------------------------
export const InitialInventory = [
    // Central
    { id: 'seed-inv-01', sku: 'PAL-001', nombre: 'Pallet Plástico HD 1.2x1.0m',   almacen: 'Central', ubicacion: 'B-01-01', cantidad: 80,  estado: 'Disponible', precioPEN: 120,  precioUSD: 32  },
    { id: 'seed-inv-02', sku: 'PAL-002', nombre: 'Pallet Madera Europa 1.2x0.8m', almacen: 'Central', ubicacion: 'P-01',    cantidad: 50,  estado: 'Disponible', precioPEN: 55,   precioUSD: 15  },
    { id: 'seed-inv-03', sku: 'EMB-001', nombre: 'Film Stretch 50cm x 300m',      almacen: 'Central', ubicacion: 'A-01-01', cantidad: 72,  estado: 'Disponible', precioPEN: 42,   precioUSD: 11  },
    { id: 'seed-inv-04', sku: 'EMB-002', nombre: 'Cinta Embalaje 48mm x 100m',    almacen: 'Central', ubicacion: 'A-01-02', cantidad: 58,  estado: 'Disponible', precioPEN: 9,    precioUSD: 2.5 },
    { id: 'seed-inv-05', sku: 'EMB-003', nombre: 'Zuncho PET 16mm x 800m',        almacen: 'Central', ubicacion: 'B-01-02', cantidad: 45,  estado: 'Disponible', precioPEN: 140,  precioUSD: 37  },
    { id: 'seed-inv-06', sku: 'INS-001', nombre: 'Lubricante Industrial 5L',      almacen: 'Central', ubicacion: 'A-02-01', cantidad: 45,  estado: 'Disponible', precioPEN: 98,   precioUSD: 26  },
    { id: 'seed-inv-07', sku: 'INS-002', nombre: 'Desengrasante Concentrado 1L',  almacen: 'Central', ubicacion: 'A-02-01', cantidad: 12,  estado: 'Stock Bajo', precioPEN: 35,   precioUSD: 9   },
    { id: 'seed-inv-08', sku: 'PRO-001', nombre: 'Guantes Nitrilo Caja x100',     almacen: 'Central', ubicacion: 'A-01-02', cantidad: 30,  estado: 'Disponible', precioPEN: 58,   precioUSD: 15  },
    { id: 'seed-inv-09', sku: 'PRO-002', nombre: 'Casco Seguridad ANSI Z89.1',    almacen: 'Central', ubicacion: 'B-01-02', cantidad: 50,  estado: 'Disponible', precioPEN: 70,   precioUSD: 18  },
    { id: 'seed-inv-10', sku: 'PRO-003', nombre: 'Lentes Seguridad Policarbonato',almacen: 'Central', ubicacion: 'A-01-01', cantidad: 0,   estado: 'Agotado',    precioPEN: 20,   precioUSD: 5   },
    // Norte
    { id: 'seed-inv-11', sku: 'PAL-001', nombre: 'Pallet Plástico HD 1.2x1.0m',   almacen: 'Norte',   ubicacion: 'B-01-01', cantidad: 40,  estado: 'Disponible', precioPEN: 120,  precioUSD: 32  },
    { id: 'seed-inv-12', sku: 'EMB-001', nombre: 'Film Stretch 50cm x 300m',      almacen: 'Norte',   ubicacion: 'A-01-01', cantidad: 60,  estado: 'Disponible', precioPEN: 42,   precioUSD: 11  },
    { id: 'seed-inv-13', sku: 'EMB-002', nombre: 'Cinta Embalaje 48mm x 100m',    almacen: 'Norte',   ubicacion: 'A-01-02', cantidad: 35,  estado: 'Disponible', precioPEN: 9,    precioUSD: 2.5 },
    { id: 'seed-inv-14', sku: 'PRO-001', nombre: 'Guantes Nitrilo Caja x100',     almacen: 'Norte',   ubicacion: 'A-01-01', cantidad: 18,  estado: 'Stock Bajo', precioPEN: 58,   precioUSD: 15  },
    { id: 'seed-inv-15', sku: 'INS-001', nombre: 'Lubricante Industrial 5L',      almacen: 'Norte',   ubicacion: 'P-01',    cantidad: 18,  estado: 'Stock Bajo', precioPEN: 98,   precioUSD: 26  },
    // Sur
    { id: 'seed-inv-16', sku: 'PAL-002', nombre: 'Pallet Madera Europa 1.2x0.8m', almacen: 'Sur',     ubicacion: 'A-01-01', cantidad: 28,  estado: 'Disponible', precioPEN: 55,   precioUSD: 15  },
    { id: 'seed-inv-17', sku: 'EMB-003', nombre: 'Zuncho PET 16mm x 800m',        almacen: 'Sur',     ubicacion: 'P-01',    cantidad: 10,  estado: 'Stock Bajo', precioPEN: 140,  precioUSD: 37  },
    { id: 'seed-inv-18', sku: 'PRO-002', nombre: 'Casco Seguridad ANSI Z89.1',    almacen: 'Sur',     ubicacion: 'A-01-01', cantidad: 22,  estado: 'Disponible', precioPEN: 70,   precioUSD: 18  },
];

// ---------------------------------------------------------------------------
// MOVIMIENTOS — 45 registros distribuidos en los últimos 14 días
// Diseñados para que los gráficos de tendencia y KPIs del reporte
// muestren datos visualmente representativos.
// ---------------------------------------------------------------------------

// Helper local para generar fechas relativas al día de hoy
const daysAgo = (n, hour = 9, min = 0) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(hour, min, 0, 0);
    return d.toISOString();
};

export const InitialMovements = [
    // --- ENTRADAS (últimos 14 días) ---
    { id: 'seed-mov-01', fecha: daysAgo(14, 8,  30), sku: 'PAL-001', nombre: 'Pallet Plástico HD 1.2x1.0m',   cantidad: 100, almacen: 'Central', tipo: 'entrada', proveedor: 'DINET OPERACIONES SAC',  observaciones: 'OC-2025-0314', tipoEntrada: 'Compra',       tipoDocumento: 'Factura', numeroDocumento: 'F001-00451', fechaDocumento: daysAgo(15).split('T')[0], ubicacion: 'B-01-01' },
    { id: 'seed-mov-02', fecha: daysAgo(13, 9,  15), sku: 'EMB-001', nombre: 'Film Stretch 50cm x 300m',      cantidad: 200, almacen: 'Central', tipo: 'entrada', proveedor: 'PLASTICOS DEL SUR SAC',  observaciones: 'OC-2025-0315', tipoEntrada: 'Compra',       tipoDocumento: 'Factura', numeroDocumento: 'F003-01122', fechaDocumento: daysAgo(14).split('T')[0], ubicacion: 'A-01-01' },
    { id: 'seed-mov-03', fecha: daysAgo(12, 10, 0),  sku: 'EMB-002', nombre: 'Cinta Embalaje 48mm x 100m',    cantidad: 150, almacen: 'Central', tipo: 'entrada', proveedor: 'INDECO SA',              observaciones: '',             tipoEntrada: 'Compra',       tipoDocumento: 'Factura', numeroDocumento: 'F002-00890', fechaDocumento: daysAgo(13).split('T')[0], ubicacion: 'A-01-02' },
    { id: 'seed-mov-04', fecha: daysAgo(12, 14, 30), sku: 'PRO-001', nombre: 'Guantes Nitrilo Caja x100',     cantidad: 80,  almacen: 'Central', tipo: 'entrada', proveedor: 'RANSA COMERCIAL SA',     observaciones: 'Reposición EPP', tipoEntrada: 'Compra',     tipoDocumento: 'Factura', numeroDocumento: 'F004-00234', fechaDocumento: daysAgo(13).split('T')[0], ubicacion: 'A-01-02' },
    { id: 'seed-mov-05', fecha: daysAgo(11, 9,  0),  sku: 'INS-001', nombre: 'Lubricante Industrial 5L',      cantidad: 120, almacen: 'Central', tipo: 'entrada', proveedor: 'PLASTICOS DEL SUR SAC',  observaciones: 'Lote L-2025-001', tipoEntrada: 'Compra',    tipoDocumento: 'Factura', numeroDocumento: 'F003-01145', fechaDocumento: daysAgo(12).split('T')[0], ubicacion: 'A-02-01' },
    { id: 'seed-mov-06', fecha: daysAgo(10, 11, 0),  sku: 'EMB-003', nombre: 'Zuncho PET 16mm x 800m',        cantidad: 60,  almacen: 'Central', tipo: 'entrada', proveedor: 'INDECO SA',              observaciones: '',             tipoEntrada: 'Compra',       tipoDocumento: 'Factura', numeroDocumento: 'F002-00901', fechaDocumento: daysAgo(11).split('T')[0], ubicacion: 'B-01-02' },
    { id: 'seed-mov-07', fecha: daysAgo(10, 15, 0),  sku: 'PAL-002', nombre: 'Pallet Madera Europa 1.2x0.8m', cantidad: 80,  almacen: 'Central', tipo: 'entrada', proveedor: 'DINET OPERACIONES SAC',  observaciones: 'Devolución cliente',  tipoEntrada: 'Devolución', tipoDocumento: 'Guía',   numeroDocumento: 'G001-00567', fechaDocumento: daysAgo(10).split('T')[0], ubicacion: 'P-01' },
    { id: 'seed-mov-08', fecha: daysAgo(9,  8,  30), sku: 'PRO-002', nombre: 'Casco Seguridad ANSI Z89.1',    cantidad: 90,  almacen: 'Central', tipo: 'entrada', proveedor: 'RANSA COMERCIAL SA',     observaciones: '',             tipoEntrada: 'Compra',       tipoDocumento: 'Factura', numeroDocumento: 'F004-00241', fechaDocumento: daysAgo(10).split('T')[0], ubicacion: 'B-01-02' },
    { id: 'seed-mov-09', fecha: daysAgo(9,  10, 0),  sku: 'INS-002', nombre: 'Desengrasante Concentrado 1L',  cantidad: 100, almacen: 'Central', tipo: 'entrada', proveedor: 'PLASTICOS DEL SUR SAC',  observaciones: 'Lote L-2025-003', tipoEntrada: 'Compra',    tipoDocumento: 'Factura', numeroDocumento: 'F003-01167', fechaDocumento: daysAgo(10).split('T')[0], ubicacion: 'A-02-01' },
    { id: 'seed-mov-10', fecha: daysAgo(7,  9,  0),  sku: 'PRO-003', nombre: 'Lentes Seguridad Policarbonato',cantidad: 50,  almacen: 'Central', tipo: 'entrada', proveedor: 'INDECO SA',              observaciones: 'Stock mínimo repuesto', tipoEntrada: 'Compra', tipoDocumento: 'Factura', numeroDocumento: 'F002-00918', fechaDocumento: daysAgo(8).split('T')[0],  ubicacion: 'A-01-01' },
    { id: 'seed-mov-11', fecha: daysAgo(6,  11, 0),  sku: 'PAL-001', nombre: 'Pallet Plástico HD 1.2x1.0m',   cantidad: 50,  almacen: 'Norte',   tipo: 'entrada', proveedor: 'DINET OPERACIONES SAC',  observaciones: '',             tipoEntrada: 'Compra',       tipoDocumento: 'Factura', numeroDocumento: 'F001-00468', fechaDocumento: daysAgo(7).split('T')[0],  ubicacion: 'B-01-01' },
    { id: 'seed-mov-12', fecha: daysAgo(5,  9,  30), sku: 'EMB-001', nombre: 'Film Stretch 50cm x 300m',      cantidad: 100, almacen: 'Norte',   tipo: 'entrada', proveedor: 'PLASTICOS DEL SUR SAC',  observaciones: '',             tipoEntrada: 'Compra',       tipoDocumento: 'Factura', numeroDocumento: 'F003-01189', fechaDocumento: daysAgo(6).split('T')[0],  ubicacion: 'A-01-01' },
    { id: 'seed-mov-13', fecha: daysAgo(4,  10, 0),  sku: 'PAL-002', nombre: 'Pallet Madera Europa 1.2x0.8m', cantidad: 40,  almacen: 'Sur',     tipo: 'entrada', proveedor: 'DINET OPERACIONES SAC',  observaciones: '',             tipoEntrada: 'Compra',       tipoDocumento: 'Factura', numeroDocumento: 'F001-00479', fechaDocumento: daysAgo(5).split('T')[0],  ubicacion: 'A-01-01' },
    { id: 'seed-mov-14', fecha: daysAgo(3,  8,  0),  sku: 'EMB-002', nombre: 'Cinta Embalaje 48mm x 100m',    cantidad: 60,  almacen: 'Norte',   tipo: 'entrada', proveedor: 'INDECO SA',              observaciones: '',             tipoEntrada: 'Compra',       tipoDocumento: 'Factura', numeroDocumento: 'F002-00934', fechaDocumento: daysAgo(4).split('T')[0],  ubicacion: 'A-01-02' },
    { id: 'seed-mov-15', fecha: daysAgo(2,  9,  0),  sku: 'PRO-001', nombre: 'Guantes Nitrilo Caja x100',     cantidad: 40,  almacen: 'Norte',   tipo: 'entrada', proveedor: 'RANSA COMERCIAL SA',     observaciones: 'Reposición EPP Norte', tipoEntrada: 'Compra', tipoDocumento: 'Factura', numeroDocumento: 'F004-00258', fechaDocumento: daysAgo(3).split('T')[0],  ubicacion: 'A-01-01' },
    { id: 'seed-mov-16', fecha: daysAgo(1,  10, 30), sku: 'INS-001', nombre: 'Lubricante Industrial 5L',      cantidad: 30,  almacen: 'Norte',   tipo: 'entrada', proveedor: 'PLASTICOS DEL SUR SAC',  observaciones: '',             tipoEntrada: 'Compra',       tipoDocumento: 'Factura', numeroDocumento: 'F003-01201', fechaDocumento: daysAgo(2).split('T')[0],  ubicacion: 'P-01' },
    { id: 'seed-mov-17', fecha: daysAgo(1,  14, 0),  sku: 'EMB-003', nombre: 'Zuncho PET 16mm x 800m',        cantidad: 20,  almacen: 'Sur',     tipo: 'entrada', proveedor: 'INDECO SA',              observaciones: '',             tipoEntrada: 'Compra',       tipoDocumento: 'Factura', numeroDocumento: 'F002-00947', fechaDocumento: daysAgo(2).split('T')[0],  ubicacion: 'P-01' },
    { id: 'seed-mov-18', fecha: daysAgo(0,  8,  30), sku: 'PRO-002', nombre: 'Casco Seguridad ANSI Z89.1',    cantidad: 25,  almacen: 'Sur',     tipo: 'entrada', proveedor: 'RANSA COMERCIAL SA',     observaciones: '',             tipoEntrada: 'Compra',       tipoDocumento: 'Factura', numeroDocumento: 'F004-00265', fechaDocumento: daysAgo(1).split('T')[0],  ubicacion: 'A-01-01' },

    // --- SALIDAS (distribuidas en los últimos 12 días) ---
    { id: 'seed-mov-19', fecha: daysAgo(13, 11, 0),  sku: 'PAL-001', nombre: 'Pallet Plástico HD 1.2x1.0m',   cantidad: 20,  almacen: 'Central', tipo: 'salida', destino: 'KOTECO SA',           observaciones: 'OV-2025-0891', tipoSalida: 'Venta',      tipoDocumento: 'Factura', numeroDocumento: 'FV01-00234', fechaDocumento: daysAgo(13).split('T')[0], ubicacion: 'B-01-01' },
    { id: 'seed-mov-20', fecha: daysAgo(12, 13, 0),  sku: 'EMB-001', nombre: 'Film Stretch 50cm x 300m',      cantidad: 50,  almacen: 'Central', tipo: 'salida', destino: 'SODIMAC PERU SAC',    observaciones: 'OV-2025-0892', tipoSalida: 'Venta',      tipoDocumento: 'Factura', numeroDocumento: 'FV01-00235', fechaDocumento: daysAgo(12).split('T')[0], ubicacion: 'A-01-01' },
    { id: 'seed-mov-21', fecha: daysAgo(11, 10, 30), sku: 'PRO-001', nombre: 'Guantes Nitrilo Caja x100',     cantidad: 30,  almacen: 'Central', tipo: 'salida', destino: 'FERREYROS SAC',       observaciones: '',             tipoSalida: 'Venta',      tipoDocumento: 'Factura', numeroDocumento: 'FV01-00236', fechaDocumento: daysAgo(11).split('T')[0], ubicacion: 'A-01-02' },
    { id: 'seed-mov-22', fecha: daysAgo(10, 9,  0),  sku: 'EMB-002', nombre: 'Cinta Embalaje 48mm x 100m',    cantidad: 40,  almacen: 'Central', tipo: 'salida', destino: 'MAKRO SUPERMAYORISTA', observaciones: 'Despacho masivo', tipoSalida: 'Venta',    tipoDocumento: 'Factura', numeroDocumento: 'FV01-00237', fechaDocumento: daysAgo(10).split('T')[0], ubicacion: 'A-01-02' },
    { id: 'seed-mov-23', fecha: daysAgo(10, 16, 0),  sku: 'PAL-002', nombre: 'Pallet Madera Europa 1.2x0.8m', cantidad: 30,  almacen: 'Central', tipo: 'salida', destino: 'KOTECO SA',           observaciones: '',             tipoSalida: 'Venta',      tipoDocumento: 'Guía',    numeroDocumento: 'GV01-00112', fechaDocumento: daysAgo(10).split('T')[0], ubicacion: 'P-01' },
    { id: 'seed-mov-24', fecha: daysAgo(9,  11, 0),  sku: 'INS-001', nombre: 'Lubricante Industrial 5L',      cantidad: 35,  almacen: 'Central', tipo: 'salida', destino: 'FERREYROS SAC',       observaciones: 'Contrato mantenimiento', tipoSalida: 'Venta', tipoDocumento: 'Factura', numeroDocumento: 'FV01-00238', fechaDocumento: daysAgo(9).split('T')[0],  ubicacion: 'A-02-01' },
    { id: 'seed-mov-25', fecha: daysAgo(8,  10, 0),  sku: 'EMB-003', nombre: 'Zuncho PET 16mm x 800m',        cantidad: 15,  almacen: 'Central', tipo: 'salida', destino: 'SODIMAC PERU SAC',    observaciones: '',             tipoSalida: 'Venta',      tipoDocumento: 'Factura', numeroDocumento: 'FV01-00239', fechaDocumento: daysAgo(8).split('T')[0],  ubicacion: 'B-01-02' },
    { id: 'seed-mov-26', fecha: daysAgo(7,  14, 30), sku: 'PRO-002', nombre: 'Casco Seguridad ANSI Z89.1',    cantidad: 18,  almacen: 'Central', tipo: 'salida', destino: 'MAKRO SUPERMAYORISTA', observaciones: '',             tipoSalida: 'Venta',      tipoDocumento: 'Factura', numeroDocumento: 'FV01-00240', fechaDocumento: daysAgo(7).split('T')[0],  ubicacion: 'B-01-02' },
    { id: 'seed-mov-27', fecha: daysAgo(7,  9,  0),  sku: 'PRO-003', nombre: 'Lentes Seguridad Policarbonato',cantidad: 50,  almacen: 'Central', tipo: 'salida', destino: 'FERREYROS SAC',       observaciones: 'Agotó stock', tipoSalida: 'Venta',       tipoDocumento: 'Factura', numeroDocumento: 'FV01-00241', fechaDocumento: daysAgo(7).split('T')[0],  ubicacion: 'A-01-01' },
    { id: 'seed-mov-28', fecha: daysAgo(6,  11, 0),  sku: 'INS-002', nombre: 'Desengrasante Concentrado 1L',  cantidad: 55,  almacen: 'Central', tipo: 'salida', destino: 'KOTECO SA',           observaciones: '',             tipoSalida: 'Venta',      tipoDocumento: 'Factura', numeroDocumento: 'FV01-00242', fechaDocumento: daysAgo(6).split('T')[0],  ubicacion: 'A-02-01' },
    { id: 'seed-mov-29', fecha: daysAgo(5,  10, 0),  sku: 'PAL-001', nombre: 'Pallet Plástico HD 1.2x1.0m',   cantidad: 30,  almacen: 'Central', tipo: 'salida', destino: 'SODIMAC PERU SAC',    observaciones: '',             tipoSalida: 'Venta',      tipoDocumento: 'Guía',    numeroDocumento: 'GV01-00118', fechaDocumento: daysAgo(5).split('T')[0],  ubicacion: 'B-01-01' },
    { id: 'seed-mov-30', fecha: daysAgo(4,  15, 0),  sku: 'EMB-001', nombre: 'Film Stretch 50cm x 300m',      cantidad: 78,  almacen: 'Central', tipo: 'salida', destino: 'MAKRO SUPERMAYORISTA', observaciones: 'Pedido urgente', tipoSalida: 'Venta',    tipoDocumento: 'Factura', numeroDocumento: 'FV01-00243', fechaDocumento: daysAgo(4).split('T')[0],  ubicacion: 'A-01-01' },
    { id: 'seed-mov-31', fecha: daysAgo(3,  11, 0),  sku: 'PRO-001', nombre: 'Guantes Nitrilo Caja x100',     cantidad: 20,  almacen: 'Norte',   tipo: 'salida', destino: 'FERREYROS SAC',       observaciones: 'Sucursal Norte', tipoSalida: 'Venta',     tipoDocumento: 'Factura', numeroDocumento: 'FV01-00244', fechaDocumento: daysAgo(3).split('T')[0],  ubicacion: 'A-01-01' },
    { id: 'seed-mov-32', fecha: daysAgo(2,  13, 0),  sku: 'EMB-002', nombre: 'Cinta Embalaje 48mm x 100m',    cantidad: 25,  almacen: 'Norte',   tipo: 'salida', destino: 'KOTECO SA',           observaciones: '',             tipoSalida: 'Venta',      tipoDocumento: 'Factura', numeroDocumento: 'FV01-00245', fechaDocumento: daysAgo(2).split('T')[0],  ubicacion: 'A-01-02' },
    { id: 'seed-mov-33', fecha: daysAgo(1,  9,  30), sku: 'PAL-002', nombre: 'Pallet Madera Europa 1.2x0.8m', cantidad: 12,  almacen: 'Sur',     tipo: 'salida', destino: 'SODIMAC PERU SAC',    observaciones: '',             tipoSalida: 'Venta',      tipoDocumento: 'Guía',    numeroDocumento: 'GV01-00124', fechaDocumento: daysAgo(1).split('T')[0],  ubicacion: 'A-01-01' },
    { id: 'seed-mov-34', fecha: daysAgo(0,  10, 0),  sku: 'EMB-003', nombre: 'Zuncho PET 16mm x 800m',        cantidad: 10,  almacen: 'Sur',     tipo: 'salida', destino: 'MAKRO SUPERMAYORISTA', observaciones: '',             tipoSalida: 'Venta',      tipoDocumento: 'Factura', numeroDocumento: 'FV01-00246', fechaDocumento: daysAgo(0).split('T')[0],  ubicacion: 'P-01' },

    // --- TRANSFERENCIAS (últimos 8 días) ---
    { id: 'seed-mov-35', fecha: daysAgo(8,  12, 0),  sku: 'PAL-001', cantidad: 20,  almacen: 'Central', almacenDestino: 'Norte',   tipo: 'transferencia', subtipo: 'Local',   ubicacionOrigen: 'B-01-01', ubicacionDestino: 'B-01-01', observaciones: 'Balance de stock',          numeroGuia: 'GT-2025-001', transportista: 'EXPRESO MARVISUR SAC'     },
    { id: 'seed-mov-36', fecha: daysAgo(7,  14, 0),  sku: 'EMB-002', cantidad: 30,  almacen: 'Central', almacenDestino: 'Sur',     tipo: 'transferencia', subtipo: 'Local',   ubicacionOrigen: 'A-01-02', ubicacionDestino: 'A-01-01', observaciones: 'Reabastecimiento Sur',       numeroGuia: 'GT-2025-002', transportista: 'LOGISTICA RAPIDA SAC'     },
    { id: 'seed-mov-37', fecha: daysAgo(6,  10, 0),  sku: 'PRO-002', cantidad: 22,  almacen: 'Central', almacenDestino: 'Sur',     tipo: 'transferencia', subtipo: 'Local',   ubicacionOrigen: 'B-01-02', ubicacionDestino: 'A-01-01', observaciones: 'EPP sucursal Sur',           numeroGuia: 'GT-2025-003', transportista: 'TRANSPORTE MILAGROS EIRL' },
    { id: 'seed-mov-38', fecha: daysAgo(5,  11, 30), sku: 'EMB-001', cantidad: 40,  almacen: 'Central', almacenDestino: 'Norte',   tipo: 'transferencia', subtipo: 'Local',   ubicacionOrigen: 'A-01-01', ubicacionDestino: 'A-01-01', observaciones: 'Campaña promocional Norte',  numeroGuia: 'GT-2025-004', transportista: 'EXPRESO MARVISUR SAC'     },
    { id: 'seed-mov-39', fecha: daysAgo(4,  9,  0),  sku: 'INS-001', cantidad: 22,  almacen: 'Central', almacenDestino: null,      tipo: 'transferencia', subtipo: 'Externa', ubicacionOrigen: 'A-02-01', ubicacionDestino: '',        observaciones: 'Merma por vencimiento',      numeroGuia: 'GT-2025-005', transportista: 'LOGISTICA RAPIDA SAC',    destinoExterno: 'DESTRUCCIÓN / MERMA' },
    { id: 'seed-mov-40', fecha: daysAgo(3,  15, 0),  sku: 'PAL-002', cantidad: 10,  almacen: 'Norte',   almacenDestino: 'Sur',     tipo: 'transferencia', subtipo: 'Local',   ubicacionOrigen: 'P-01',    ubicacionDestino: 'A-01-01', observaciones: 'Nivelación de inventario',   numeroGuia: 'GT-2025-006', transportista: 'TRANSPORTE MILAGROS EIRL' },
    { id: 'seed-mov-41', fecha: daysAgo(2,  10, 30), sku: 'PRO-001', cantidad: 15,  almacen: 'Central', almacenDestino: 'Norte',   tipo: 'transferencia', subtipo: 'Local',   ubicacionOrigen: 'A-01-02', ubicacionDestino: 'A-01-01', observaciones: 'Reposición EPP Norte',       numeroGuia: 'GT-2025-007', transportista: 'EXPRESO MARVISUR SAC'     },
    { id: 'seed-mov-42', fecha: daysAgo(1,  13, 0),  sku: 'EMB-003', cantidad: 5,   almacen: 'Central', almacenDestino: 'Sur',     tipo: 'transferencia', subtipo: 'Local',   ubicacionOrigen: 'B-01-02', ubicacionDestino: 'P-01',    observaciones: '',                           numeroGuia: 'GT-2025-008', transportista: 'LOGISTICA RAPIDA SAC'     },
    { id: 'seed-mov-43', fecha: daysAgo(0,  11, 0),  sku: 'EMB-002', cantidad: 20,  almacen: 'Norte',   almacenDestino: null,      tipo: 'transferencia', subtipo: 'Externa', ubicacionOrigen: 'A-01-02', ubicacionDestino: '',        observaciones: 'Préstamo temporal cliente',  numeroGuia: 'GT-2025-009', transportista: 'TRANSPORTE MILAGROS EIRL', destinoExterno: 'KOTECO SA - PRÉSTAMO'  },
];
