export const InitialCatalog = [
    { id: 1, sku: 'PROD-001', nombre: 'Pallets Plásticos HD', categoria: 'Almacenamiento', barcode: '7750001001', estado: 'Activo', esPerecedero: false },
    { id: 2, sku: 'PROD-002', nombre: 'Film Stretch 50cm', categoria: 'Embalaje', barcode: '7750001002', estado: 'Activo', esPerecedero: true },
    { id: 3, sku: 'PROD-003', nombre: 'Insumo Químico X', categoria: 'Insumos', barcode: '7750001003', estado: 'Activo', esPerecedero: true }
];

export const InitialWarehouses = ['Central', 'Norte', 'Sur', 'Virtual'];

export const InitialPartners = [
    { id: 1, nombre: 'KOTECO SA', tipo: 'Cliente', ruc: '20501234567', telefono: '01-444-5555', email: 'contacto@koteco.com', direccion: 'Av. Industrial 123', estado: 'Activo' },
    { id: 2, nombre: 'PLASTICOS DEL SUR', tipo: 'Proveedor', ruc: '20109876543', telefono: '01-222-3333', email: 'ventas@plasticos.com', direccion: 'Calle Los Hornos 456', estado: 'Activo' },
    { id: 3, nombre: 'LOGITRANS PERU', tipo: 'Proveedor', ruc: '20601122334', telefono: '999-888-777', email: 'operaciones@logitrans.pe', direccion: 'Av. Argentina 888', estado: 'Activo' }
];

export const InitialCategories = [
    { id: 1, nombre: 'General', descripcion: 'Categoría por defecto', estado: 'Activo' },
    { id: 2, nombre: 'Almacenamiento', descripcion: 'Pallets, Racks, Cajas', estado: 'Activo' },
    { id: 3, nombre: 'Embalaje', descripcion: 'Films, Cintas, Zunchos', estado: 'Activo' },
    { id: 4, nombre: 'Protección', descripcion: 'Guantes, Cascos, Lentes', estado: 'Activo' }
];

export const InitialBatches = [
    { id: 1, sku: 'PROD-002', numero: 'L-2024001', fechaVencimiento: '2027-12-31', cantidadOriginal: 100, cantidadActual: 100, estado: 'Vigente' },
    { id: 2, sku: 'PROD-002', numero: 'L-2024-EXP', fechaVencimiento: '2023-01-01', cantidadOriginal: 50, cantidadActual: 10, estado: 'Vencido' },
    { id: 3, sku: 'PROD-003', numero: 'L-NEAR-01', fechaVencimiento: '2026-02-15', cantidadOriginal: 200, cantidadActual: 150, estado: 'Por Vencer' }
];

export const InitialTransporters = [
    { id: 1, nombre: 'EXPRESO MARVISUR', ruc: '20501234500', placa: 'V1Z-980', chofer: 'Juan Perez', telefono: '988-777-666', estado: 'Activo' },
    { id: 2, nombre: 'LOGISTICA RAPIDA SAC', ruc: '20109876544', placa: 'B4X-123', chofer: 'Carlos Lopez', telefono: '955-444-333', estado: 'Activo' }
];

export const InitialLocations = [
    // Almacén Central
    { id: 1, almacen: 'Central', codigo: 'A-01-01', tipo: 'Estantería', zona: 'Picking', capacidadMax: 100, capacidadActual: 0, estado: 'Disponible', observaciones: '' },
    { id: 2, almacen: 'Central', codigo: 'A-01-02', tipo: 'Estantería', zona: 'Picking', capacidadMax: 100, capacidadActual: 0, estado: 'Disponible', observaciones: '' },
    { id: 3, almacen: 'Central', codigo: 'A-02-01', tipo: 'Estantería', zona: 'Picking', capacidadMax: 100, capacidadActual: 0, estado: 'Disponible', observaciones: '' },
    { id: 4, almacen: 'Central', codigo: 'B-01-01', tipo: 'Rack', zona: 'Reserva', capacidadMax: 200, capacidadActual: 0, estado: 'Disponible', observaciones: '' },
    { id: 5, almacen: 'Central', codigo: 'P-01', tipo: 'Piso', zona: 'Reserva', capacidadMax: 50, capacidadActual: 0, estado: 'Disponible', observaciones: 'Pallets en piso' },

    // Almacén Norte
    { id: 6, almacen: 'Norte', codigo: 'A-01-01', tipo: 'Estantería', zona: 'Picking', capacidadMax: 80, capacidadActual: 0, estado: 'Disponible', observaciones: '' },
    { id: 7, almacen: 'Norte', codigo: 'A-01-02', tipo: 'Estantería', zona: 'Picking', capacidadMax: 80, capacidadActual: 0, estado: 'Disponible', observaciones: '' },
    { id: 8, almacen: 'Norte', codigo: 'P-01', tipo: 'Piso', zona: 'Reserva', capacidadMax: 30, capacidadActual: 0, estado: 'Disponible', observaciones: '' },

    // Almacén Sur
    { id: 9, almacen: 'Sur', codigo: 'A-01-01', tipo: 'Estantería', zona: 'Picking', capacidadMax: 60, capacidadActual: 0, estado: 'Disponible', observaciones: '' },
    { id: 10, almacen: 'Sur', codigo: 'P-01', tipo: 'Piso', zona: 'Reserva', capacidadMax: 40, capacidadActual: 0, estado: 'Disponible', observaciones: '' }
];
