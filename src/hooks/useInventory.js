import { useState, useEffect } from 'react';

export const useInventory = () => {
    const [products, setProducts] = useState(() => {
        const saved = localStorage.getItem('inventory_data');
        return saved ? JSON.parse(saved) : [
            {
                id: 1, sku: 'PROD-001', nombre: 'Pallets Plásticos',
                almacen: 'Central', cantidad: 450,
                precioPEN: 120.00, precioUSD: 32.50
            },
            {
                id: 2, sku: 'PROD-002', nombre: 'Film Stretch',
                almacen: 'Norte', cantidad: 12,
                precioPEN: 45.00, precioUSD: 12.20
            }
        ];
    });

    const [almacenes] = useState(['Central', 'Norte', 'Sur', 'Virtual']);

    useEffect(() => {
        localStorage.setItem('inventory_data', JSON.stringify(products));
    }, [products]);

    // Modificamos para incluir el almacén en el flujo
    const updateStock = (sku, cantidad, almacen, tipo) => {
        // Lógica para actualizar stock en un almacén específico
    };

    const registrarMovimiento = (sku, cantidad, almacen, tipo) => {
        setProducts(prevProducts => {
            return prevProducts.map(p => {
                // Buscamos el producto que coincida con el SKU Y el Almacén
                if (p.sku === sku && p.almacen === almacen) {
                    const nuevaCantidad = tipo === 'entrada'
                        ? p.cantidad + parseInt(cantidad)
                        : p.cantidad - parseInt(cantidad);

                    return {
                        ...p,
                        cantidad: nuevaCantidad,
                        estado: nuevaCantidad <= 0 ? 'Agotado' : nuevaCantidad < 20 ? 'Stock Bajo' : 'Disponible'
                    };
                }
                return p;
            });
        });
    };


    return { products, almacenes, registrarMovimiento };
};

// const registrarMovimiento = (sku, cantidad, almacen, tipo) => {
//     setProducts(prevProducts => {
//         return prevProducts.map(p => {
//             // Buscamos el producto que coincida con el SKU Y el Almacén
//             if (p.sku === sku && p.almacen === almacen) {
//                 const nuevaCantidad = tipo === 'entrada'
//                     ? p.cantidad + parseInt(cantidad)
//                     : p.cantidad - parseInt(cantidad);

//                 return {
//                     ...p,
//                     cantidad: nuevaCantidad,
//                     estado: nuevaCantidad <= 0 ? 'Agotado' : nuevaCantidad < 20 ? 'Stock Bajo' : 'Disponible'
//                 };
//             }
//             return p;
//         });
//     });
// };

// return { products, almacenes, registrarMovimiento };

