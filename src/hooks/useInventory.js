import { useState, useEffect } from 'react';

export const useInventory = () => {
    // MAESTRO DE PRODUCTOS (Catálogo)
    const [catalog, setCatalog] = useState(() => {
        const saved = localStorage.getItem('logi_catalog');
        return saved ? JSON.parse(saved) : [
            { id: 1, sku: 'PROD-001', nombre: 'Pallets Plásticos HD', categoria: 'Almacenamiento', barcode: '7750001001', estado: 'Activo' },
            { id: 2, sku: 'PROD-002', nombre: 'Film Stretch 50cm', categoria: 'Embalaje', barcode: '7750001002', estado: 'Activo' }
        ];
    });

    // STOCK POR ALMACÉN (Snapshot actual)
    const [products, setProducts] = useState(() => {
        const saved = localStorage.getItem('inventory_data');
        return saved ? JSON.parse(saved) : [];
    });

    // HISTORIAL DE MOVIMIENTOS
    const [movements, setMovements] = useState(() => {
        const saved = localStorage.getItem('inventory_movements');
        return saved ? JSON.parse(saved) : [];
    });

    const [almacenes] = useState(['Central', 'Norte', 'Sur', 'Virtual']);

    useEffect(() => {
        localStorage.setItem('logi_catalog', JSON.stringify(catalog));
        localStorage.setItem('inventory_data', JSON.stringify(products));
        localStorage.setItem('inventory_movements', JSON.stringify(movements));
    }, [catalog, products, movements]);

    const addProductToCatalog = (newProduct) => {
        setCatalog([...catalog, { ...newProduct, id: Date.now() }]);
    };

    // Helper para actualizar el stock (No exportado)
    const updateStockInternal = (sku, almacen, cantidadDelta) => {
        setProducts(prevProducts => {
            const existingIndex = prevProducts.findIndex(p => p.sku === sku && p.almacen === almacen);
            const getStatus = (qty) => qty <= 0 ? 'Agotado' : qty < 20 ? 'Stock Bajo' : 'Disponible';

            if (existingIndex >= 0) {
                // Actualizar existente
                const updatedProducts = [...prevProducts];
                const product = updatedProducts[existingIndex];
                const newQty = product.cantidad + cantidadDelta;

                updatedProducts[existingIndex] = {
                    ...product,
                    cantidad: newQty,
                    estado: getStatus(newQty)
                };
                return updatedProducts;
            } else {
                // Crear nuevo slot de stock si el delta es positivo (entradas)
                if (cantidadDelta > 0) {
                    const catalogoItem = catalog.find(c => c.sku === sku);
                    if (!catalogoItem) return prevProducts; // Si no existe en catálogo, ignorar

                    return [...prevProducts, {
                        id: Date.now(),
                        sku: catalogoItem.sku,
                        nombre: catalogoItem.nombre,
                        almacen: almacen,
                        cantidad: cantidadDelta,
                        estado: getStatus(cantidadDelta),
                        precioPEN: 0,
                        precioUSD: 0
                    }];
                }
                return prevProducts; // Si es salida y no existe, no hacemos nada (o error)
            }
        });
    };

    // Registrar nuevo movimiento
    const registrarMovimiento = (sku, cantidad, almacen, tipo, proveedor = '', observaciones = '', extraData = {}) => {
        const newMovement = {
            id: Date.now(),
            fecha: new Date().toISOString(),
            sku,
            cantidad,
            almacen,
            tipo, // 'entrada' | 'salida'
            proveedor,
            observaciones,
            ...extraData // tipoEntrada, tipoDocumento, numeroDocumento, fechaDocumento
        };

        setMovements(prev => [newMovement, ...prev]);

        // Actualizar Stock
        const delta = tipo === 'entrada' ? cantidad : -cantidad;
        updateStockInternal(sku, almacen, delta);
    };

    // Actualizar movimiento existente (Edición)
    const updateMovement = (id, newData) => {
        const oldMovement = movements.find(m => m.id === id);
        if (!oldMovement) return;

        // 1. Revertir impacto del movimiento anterior en el stock
        const revertDelta = oldMovement.tipo === 'entrada' ? -oldMovement.cantidad : oldMovement.cantidad;
        updateStockInternal(oldMovement.sku, oldMovement.almacen, revertDelta);

        // 2. Aplicar impacto del nuevo movimiento
        const applyDelta = newData.tipo === 'entrada' ? newData.cantidad : -newData.cantidad;
        // Nota: usamos setTimeout o promises si updateStockInternal fuera async, pero aquí el setState de React en batch
        // podría ser tricky si llamamos dos veces seguidas a setProducts.
        // Mejor approach para evitar race conditions en setState: hacer todo en un solo paso o usar functional updates cuidadosamente.
        // Como updateStockInternal usa functional update, debería encolarse correctamente.
        updateStockInternal(newData.sku, newData.almacen, applyDelta);

        // 3. Actualizar historial
        setMovements(prev => prev.map(m => m.id === id ? { ...m, ...newData } : m));
    };

    // Eliminar movimiento
    const deleteMovement = (id) => {
        const movementToDelete = movements.find(m => m.id === id);
        if (!movementToDelete) return;

        // Revertir impacto en stock
        const revertDelta = movementToDelete.tipo === 'entrada' ? -movementToDelete.cantidad : movementToDelete.cantidad;
        updateStockInternal(movementToDelete.sku, movementToDelete.almacen, revertDelta);

        // Eliminar del historial
        setMovements(prev => prev.filter(m => m.id !== id));
    };

    return {
        catalog,
        products,
        almacenes,
        movements,
        addProductToCatalog,
        setCatalog,
        registrarMovimiento,
        updateMovement,
        deleteMovement
    };
};
