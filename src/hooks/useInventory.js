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

    return { products, almacenes, setProducts };
};


// import { useState, useEffect } from 'react';

// export const useInventory = () => {
//     // Intentar cargar datos desde LocalStorage o usar iniciales
//     const [products, setProducts] = useState(() => {
//         const saved = localStorage.getItem('inventory_data');
//         return saved ? JSON.parse(saved) : [
//             { id: 1, sku: 'PROD-001', nombre: 'Pallets Plásticos HD', cantidad: 450, estado: 'Disponible' },
//             { id: 2, sku: 'PROD-002', nombre: 'Film Stretch 50cm', cantidad: 12, estado: 'Stock Bajo' }
//         ];
//     });

//     // Guardar en LocalStorage cada vez que cambien los productos
//     useEffect(() => {
//         localStorage.setItem('inventory_data', JSON.stringify(products));
//     }, [products]);

//     const updateStock = (sku, cantidad, tipo) => {
//         setProducts(prev => prev.map(p => {
//             if (p.sku === sku) {
//                 const nuevaCant = tipo === 'entrada' ? p.cantidad + cantidad : p.cantidad - cantidad;
//                 return {
//                     ...p,
//                     cantidad: nuevaCant,
//                     estado: nuevaCant <= 0 ? 'Agotado' : nuevaCant < 20 ? 'Stock Bajo' : 'Disponible'
//                 };
//             }
//             return p;
//         }));
//     };

//     return { products, updateStock };
// };