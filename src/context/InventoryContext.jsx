/**
 * InventoryContext — Estado global del inventario.
 *
 * Soluciona el problema crítico de instancias desincronizadas:
 * antes, cada componente que llamaba a useInventory() tenía su propio
 * useState independiente. Ahora hay una sola fuente de verdad.
 *
 * Uso:
 *   import { useInventoryCtx } from '../context/InventoryContext';
 *   const { products, registrarMovimiento } = useInventoryCtx();
 */
import { useState, useEffect, useCallback } from 'react';
import { InitialCatalog, InitialWarehouses, InitialInventory, InitialMovements } from '../data/initialData';
import { storageGet, storageSet } from '../services/storageAdapter';
import { STORAGE_KEYS } from '../services/storageKeys';
import { InventoryContext } from './inventoryContextInstance';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const generateId = () => crypto.randomUUID();

const getStatus = (qty) => {
    if (qty <= 0)  return 'Agotado';
    if (qty < 20)  return 'Stock Bajo';
    return 'Disponible';
};

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export const InventoryProvider = ({ children }) => {
    const [catalog,   setCatalog]   = useState(() => storageGet(STORAGE_KEYS.CATALOG,   InitialCatalog));
    const [products,  setProducts]  = useState(() => storageGet(STORAGE_KEYS.INVENTORY, InitialInventory));
    const [movements, setMovements] = useState(() => storageGet(STORAGE_KEYS.MOVEMENTS, InitialMovements));
    const [almacenes] = useState(InitialWarehouses);

    // Persistencia: sincronizar vía adapter — al migrar a backend, solo se cambia storageAdapter.js
    useEffect(() => { storageSet(STORAGE_KEYS.CATALOG,   catalog);   }, [catalog]);
    useEffect(() => { storageSet(STORAGE_KEYS.INVENTORY, products);  }, [products]);
    useEffect(() => { storageSet(STORAGE_KEYS.MOVEMENTS, movements); }, [movements]);

    // -----------------------------------------------------------------------
    // Catálogo
    // -----------------------------------------------------------------------
    const addProductToCatalog = useCallback((newProduct) => {
        setCatalog((prev) => [...prev, { ...newProduct, id: generateId() }]);
    }, []);

    const updateProductInCatalog = useCallback((id, data) => {
        setCatalog((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
    }, []);

    const deleteProductFromCatalog = useCallback((id) => {
        setCatalog((prev) => prev.filter((p) => p.id !== id));
    }, []);

    // -----------------------------------------------------------------------
    // Stock interno — no exportado; solo se usa dentro de este contexto
    // -----------------------------------------------------------------------
    const updateStockInternal = useCallback((sku, almacen, cantidadDelta, ubicacion = '') => {
        setProducts((prev) => {
            const idx = prev.findIndex(
                (p) => p.sku === sku && p.almacen === almacen && p.ubicacion === ubicacion
            );

            if (idx >= 0) {
                const updated = [...prev];
                const item = updated[idx];
                const newQty = item.cantidad + cantidadDelta;
                updated[idx] = { ...item, cantidad: newQty, estado: getStatus(newQty) };
                return updated;
            }

            if (cantidadDelta > 0) {
                // Nuevo slot de stock
                const catalogItem = catalog.find((c) => c.sku === sku);
                if (!catalogItem) return prev;
                return [
                    ...prev,
                    {
                        id:        generateId(),
                        sku:       catalogItem.sku,
                        nombre:    catalogItem.nombre,
                        almacen,
                        ubicacion,
                        cantidad:  cantidadDelta,
                        estado:    getStatus(cantidadDelta),
                        precioPEN: 0,
                        precioUSD: 0,
                    },
                ];
            }

            return prev; // Salida sobre stock inexistente → no se toca
        });
    }, [catalog]);

    // -----------------------------------------------------------------------
    // Movimientos
    // -----------------------------------------------------------------------
    const registrarMovimiento = useCallback((sku, cantidad, almacen, tipo, proveedor = '', observaciones = '', extraData = {}) => {
        const newMovement = {
            id:          generateId(),
            fecha:       new Date().toISOString(),
            sku, cantidad, almacen, tipo, proveedor, observaciones,
            ...extraData,
        };
        setMovements((prev) => [newMovement, ...prev]);
        const delta = tipo === 'entrada' ? cantidad : -cantidad;
        updateStockInternal(sku, almacen, delta, extraData.ubicacion || '');
    }, [updateStockInternal]);

    const registrarTransferencia = useCallback((sku, cantidad, almacenOrigen, almacenDestino, isLocal, observaciones = '', extraData = {}) => {
        const newMovement = {
            id:               generateId(),
            fecha:            new Date().toISOString(),
            sku, cantidad,
            almacen:          almacenOrigen,
            almacenDestino,
            ubicacionOrigen:  extraData.ubicacionOrigen  || '',
            ubicacionDestino: extraData.ubicacionDestino || '',
            tipo:             'transferencia',
            subtipo:          isLocal ? 'Local' : 'Externa',
            observaciones,
            ...extraData,
        };
        setMovements((prev) => [newMovement, ...prev]);
        updateStockInternal(sku, almacenOrigen,  -cantidad, extraData.ubicacionOrigen  || '');
        if (isLocal && almacenDestino) {
            updateStockInternal(sku, almacenDestino, cantidad, extraData.ubicacionDestino || '');
        }
    }, [updateStockInternal]);

    const updateMovement = useCallback((id, newData) => {
        setMovements((prev) => {
            const old = prev.find((m) => m.id === id);
            if (!old) return prev;

            // A — Revertir el movimiento anterior
            if (old.tipo === 'transferencia') {
                updateStockInternal(old.sku, old.almacen,        old.cantidad,  old.ubicacionOrigen  || '');
                if (old.subtipo === 'Local' && old.almacenDestino) {
                    updateStockInternal(old.sku, old.almacenDestino, -old.cantidad, old.ubicacionDestino || '');
                }
            } else {
                const revert = old.tipo === 'entrada' ? -old.cantidad : old.cantidad;
                updateStockInternal(old.sku, old.almacen, revert, old.ubicacion || '');
            }

            // B — Aplicar el nuevo movimiento
            const tipo    = newData.tipo    || old.tipo;
            const subtipo = newData.subtipo || old.subtipo;
            if (tipo === 'transferencia') {
                updateStockInternal(newData.sku, newData.almacen, -newData.cantidad, newData.ubicacionOrigen || '');
                if (subtipo === 'Local' && newData.almacenDestino) {
                    updateStockInternal(newData.sku, newData.almacenDestino, newData.cantidad, newData.ubicacionDestino || '');
                }
            } else {
                const apply = newData.tipo === 'entrada' ? newData.cantidad : -newData.cantidad;
                updateStockInternal(newData.sku, newData.almacen, apply, newData.ubicacion || '');
            }

            return prev.map((m) => (m.id === id ? { ...m, ...newData } : m));
        });
    }, [updateStockInternal]);

    const deleteMovement = useCallback((id) => {
        setMovements((prev) => {
            const m = prev.find((mv) => mv.id === id);
            if (!m) return prev;

            if (m.tipo === 'transferencia') {
                updateStockInternal(m.sku, m.almacen,        m.cantidad,  m.ubicacionOrigen  || '');
                if (m.subtipo === 'Local' && m.almacenDestino) {
                    updateStockInternal(m.sku, m.almacenDestino, -m.cantidad, m.ubicacionDestino || '');
                }
            } else {
                const revert = m.tipo === 'entrada' ? -m.cantidad : m.cantidad;
                updateStockInternal(m.sku, m.almacen, revert, m.ubicacion || '');
            }

            return prev.filter((mv) => mv.id !== id);
        });
    }, [updateStockInternal]);

    // -----------------------------------------------------------------------
    const value = {
        catalog,  setCatalog,
        products, setProducts,
        movements,
        almacenes,
        addProductToCatalog,
        updateProductInCatalog,
        deleteProductFromCatalog,
        registrarMovimiento,
        registrarTransferencia,
        updateMovement,
        deleteMovement,
    };

    return (
        <InventoryContext.Provider value={value}>
            {children}
        </InventoryContext.Provider>
    );
};
