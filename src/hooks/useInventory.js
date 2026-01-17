import { useState, useEffect } from 'react';
import { InitialCatalog, InitialWarehouses } from '../data/initialData';

export const useInventory = () => {
    // MAESTRO DE PRODUCTOS (Catálogo)
    const [catalog, setCatalog] = useState(() => {
        const saved = localStorage.getItem('logi_catalog');
        return saved ? JSON.parse(saved) : InitialCatalog;
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

    const [almacenes] = useState(InitialWarehouses);

    useEffect(() => {
        localStorage.setItem('logi_catalog', JSON.stringify(catalog));
        localStorage.setItem('inventory_data', JSON.stringify(products));
        localStorage.setItem('inventory_movements', JSON.stringify(movements));
    }, [catalog, products, movements]);

    const addProductToCatalog = (newProduct) => {
        setCatalog([...catalog, { ...newProduct, id: Date.now() }]);
    };

    // Helper para actualizar el stock (No exportado)
    const updateStockInternal = (sku, almacen, cantidadDelta, ubicacion = '') => {
        setProducts(prevProducts => {
            const existingIndex = prevProducts.findIndex(p => p.sku === sku && p.almacen === almacen && p.ubicacion === ubicacion);
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
                        ubicacion: ubicacion || '', // Nueva ubicación
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
            ...extraData // tipoEntrada, tipoDocumento, numeroDocumento, fechaDocumento, ubicacion
        };

        setMovements(prev => [newMovement, ...prev]);

        // Actualizar Stock
        const delta = tipo === 'entrada' ? cantidad : -cantidad;
        updateStockInternal(sku, almacen, delta, extraData.ubicacion || '');
    };

    // Registrar Transferencia
    const registrarTransferencia = (sku, cantidad, almacenOrigen, almacenDestino, isLocal, observaciones = '', extraData = {}) => {
        const newMovement = {
            id: Date.now(),
            fecha: new Date().toISOString(),
            sku,
            cantidad,
            almacen: almacenOrigen, // Principal warehouse reference (Source)
            almacenDestino: almacenDestino, // Secondary, only if Local
            ubicacionOrigen: extraData.ubicacionOrigen || '',
            ubicacionDestino: extraData.ubicacionDestino || '',
            tipo: 'transferencia',
            subtipo: isLocal ? 'Local' : 'Externa',
            observaciones,
            ...extraData // numeroGuia, transportista, etc.
        };

        setMovements(prev => [newMovement, ...prev]);

        // 1. Descontar de Origen
        updateStockInternal(sku, almacenOrigen, -cantidad, extraData.ubicacionOrigen || '');

        // 2. Si es Local, Sumar a Destino
        if (isLocal && almacenDestino) {
            updateStockInternal(sku, almacenDestino, cantidad, extraData.ubicacionDestino || '');
        }
    };

    // Actualizar movimiento existente (Edición)
    const updateMovement = (id, newData) => {
        const oldMovement = movements.find(m => m.id === id);
        if (!oldMovement) return;

        // --- A. REVERTIR ANTERIOR ---
        if (oldMovement.tipo === 'transferencia') {
            // Revertir Origen: Sumar lo que se restó (usando su ubicación de origen)
            updateStockInternal(oldMovement.sku, oldMovement.almacen, oldMovement.cantidad, oldMovement.ubicacionOrigen || '');
            // Revertir Destino (si era Local): Restar lo que se sumó (en su ubicación de destino)
            if (oldMovement.subtipo === 'Local' && oldMovement.almacenDestino) {
                updateStockInternal(oldMovement.sku, oldMovement.almacenDestino, -oldMovement.cantidad, oldMovement.ubicacionDestino || '');
            }
        } else {
            // Entrada/Salida normal
            const revertDelta = oldMovement.tipo === 'entrada' ? -oldMovement.cantidad : oldMovement.cantidad;
            updateStockInternal(oldMovement.sku, oldMovement.almacen, revertDelta, oldMovement.ubicacion || '');
        }

        // --- B. APLICAR NUEVO ---
        const currentType = newData.tipo || oldMovement.tipo;
        const currentSubtype = newData.subtipo || oldMovement.subtipo;

        if (currentType === 'transferencia') {
            // Aplicar Origen: Restar
            updateStockInternal(newData.sku, newData.almacen, -newData.cantidad, newData.ubicacionOrigen || '');
            // Aplicar Destino (si Local): Sumar
            if (currentSubtype === 'Local' && newData.almacenDestino) {
                updateStockInternal(newData.sku, newData.almacenDestino, newData.cantidad, newData.ubicacionDestino || '');
            }
        } else {
            const applyDelta = newData.tipo === 'entrada' ? newData.cantidad : -newData.cantidad;
            updateStockInternal(newData.sku, newData.almacen, applyDelta, newData.ubicacion || '');
        }

        // 3. Actualizar historial
        setMovements(prev => prev.map(m => m.id === id ? { ...m, ...newData } : m));
    };

    // Eliminar movimiento
    const deleteMovement = (id) => {
        const movementToDelete = movements.find(m => m.id === id);
        if (!movementToDelete) return;

        // Revertir impacto en stock
        if (movementToDelete.tipo === 'transferencia') {
            // Revertir Origen: Sumar
            updateStockInternal(movementToDelete.sku, movementToDelete.almacen, movementToDelete.cantidad, movementToDelete.ubicacionOrigen || '');
            // Revertir Destino (si Local): Restar
            if (movementToDelete.subtipo === 'Local' && movementToDelete.almacenDestino) {
                updateStockInternal(movementToDelete.sku, movementToDelete.almacenDestino, -movementToDelete.cantidad, movementToDelete.ubicacionDestino || '');
            }
        } else {
            const revertDelta = movementToDelete.tipo === 'entrada' ? -movementToDelete.cantidad : movementToDelete.cantidad;
            updateStockInternal(movementToDelete.sku, movementToDelete.almacen, revertDelta, movementToDelete.ubicacion || '');
        }

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
        registrarTransferencia,
        updateMovement,
        deleteMovement
    };
};
