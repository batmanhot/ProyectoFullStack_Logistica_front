export const InitialCatalog = [
    { id: 1, sku: 'PROD-001', nombre: 'Pallets Plásticos HD', categoria: 'Almacenamiento', barcode: '7750001001', estado: 'Activo' },
    { id: 2, sku: 'PROD-002', nombre: 'Film Stretch 50cm', categoria: 'Embalaje', barcode: '7750001002', estado: 'Activo' }
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
    { id: 1, sku: 'PROD-002', numero: 'L-2024001', fechaVencimiento: '2025-12-31', cantidadOriginal: 100, cantidadActual: 100, estado: 'Vigente' }
];

export const InitialTransporters = [
    { id: 1, nombre: 'EXPRESO MARVISUR', ruc: '20501234500', placa: 'V1Z-980', chofer: 'Juan Perez', telefono: '988-777-666', estado: 'Activo' },
    { id: 2, nombre: 'LOGISTICA RAPIDA SAC', ruc: '20109876544', placa: 'B4X-123', chofer: 'Carlos Lopez', telefono: '955-444-333', estado: 'Activo' }
];
