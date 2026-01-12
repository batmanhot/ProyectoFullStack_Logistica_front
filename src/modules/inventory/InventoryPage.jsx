import React, { useState, useEffect } from 'react';
import { useInventory } from '../../hooks/useInventory';
import { Package, Building2, AlertTriangle, ArrowUp, ArrowDown, Search } from 'lucide-react';
import StatCard from '../../components/ui/StatCard';

const InventoryPage = () => {

    const { products, almacenes } = useInventory();
    const [filtroAlmacen, setFiltroAlmacen] = useState('Todos');
    const [moneda, setMoneda] = useState('PEN'); // 'PEN' o 'USD'

    const [searchTerm, setSearchTerm] = useState('');

    const filteredData = products.filter(item =>
        filtroAlmacen === 'Todos' ? true : item.almacen === filtroAlmacen
    );

    // 1. Calculamos el Valor Total del Inventario Filtrado
    const valorTotal = filteredData.reduce((acc, item) => {
        const precio = moneda === 'PEN' ? item.precioPEN : item.precioUSD;
        return acc + (item.cantidad * precio);
    }, 0);


    // 2. Calculamos el Stock Total (unidades físicas)
    const unidadesTotales = filteredData.reduce((acc, item) => acc + item.cantidad, 0);

    //const cantidadStockAgotado = filteredData.filter(item => item.cantidad === 0).length;
    //const cantidadStockBajo = filteredData.filter(item => item.cantidad > 0 && item.cantidad < 10).length;
    //const cantidadStockDisponible = filteredData.filter(item => item.cantidad > 0).length;
    const cantidadStockDisponible = filteredData.filter(item => item.estado === 'Disponible').length;
    const cantidadStockBajo = filteredData.filter(item => item.estado === 'Stock Bajo').length;
    const cantidadStockAgotado = filteredData.filter(item => item.estado === 'Agotado').length;

    return (
        <div className="space-y-6">
            {/* TITULO */}
            <div className="flex flex-col md:flex-row justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Inventario Multialmacén</h1>

                {/* SELECTOR DE MONEDA */}
                <div className="flex bg-gray-200 p-1 rounded-lg w-fit">
                    <button
                        onClick={() => setMoneda('PEN')}
                        className={`px-4 py-1 rounded-md text-sm font-bold transition-all ${moneda === 'PEN' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
                    >
                        Soles (S/)
                    </button>
                    <button
                        onClick={() => setMoneda('USD')}
                        className={`px-4 py-1 rounded-md text-sm font-bold transition-all ${moneda === 'USD' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500'}`}
                    >
                        Dólares ($)
                    </button>
                </div>
            </div>

            {/* FILTRO DE ALMACÉN */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
                <Building2 className="text-gray-400" size={20} />
                <select
                    className="bg-transparent outline-none text-gray-700 font-medium"
                    value={filtroAlmacen}
                    onChange={(e) => setFiltroAlmacen(e.target.value)}
                >
                    <option value="Todos">Todos los almacenes</option>
                    {almacenes.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
            </div>
            {/* END TITULO */}

            {/* Buscador Real */}
            {/* <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, SKU o categoría..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div> */}

            {/* SECCIÓN DE RESUMEN FINANCIERO */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-2xl shadow-lg text-white">
                    <p className="text-blue-100 text-sm font-medium">Valorización Total ({moneda})</p>
                    <h3 className="text-2xl font-bold mt-1">
                        {moneda === 'PEN' ? 'S/' : '$'} {valorTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </h3>
                    <p className="text-xs text-blue-200 mt-2 italic">* Basado en stock actual y filtros aplicados</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-sm font-medium">Unidades en Stock</p>
                        <h3 className="text-2xl font-bold text-gray-800 mt-1">{unidadesTotales.toLocaleString()}</h3>
                    </div>
                    <div className="bg-gray-100 p-3 rounded-lg text-gray-600">
                        <Package size={24} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-sm font-medium">Almacenes Activos</p>
                        <h3 className="text-2xl font-bold text-gray-800 mt-1">{almacenes.length}</h3>
                    </div>
                    <div className="bg-gray-100 p-3 rounded-lg text-gray-600">
                        <Building2 size={24} />
                    </div>
                </div>
                <StatCard title="Total SKU" value={products.length} icon={<Package className="text-blue-600" />} color="bg-blue-50" />
                <StatCard title="Stock Disponible" value={cantidadStockDisponible} icon={<Package className="text-orange-600" />} color="bg-orange-50" />
                <StatCard title="Stock Bajo" value={cantidadStockBajo} icon={<AlertTriangle className="text-orange-600" />} color="bg-orange-50" />
                <StatCard title="Stock Agotado" value={cantidadStockAgotado} icon={<AlertTriangle className="text-orange-600" />} color="bg-orange-50" />
            </div>

            {/* Tabla con Resultados Filtrados */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="p-4 text-gray-600 font-semibold text-sm">SKU</th>
                            <th className="p-4 text-gray-600 font-semibold text-sm">Producto</th>
                            <th className="p-4 text-gray-600 font-semibold text-sm">Stock</th>
                            <th className="p-4 text-gray-600 font-semibold text-sm">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredData.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                                <td className="p-4">
                                    <div className="font-mono text-xs text-blue-600 font-bold">{item.sku}</div>
                                    <div className="text-[10px] text-gray-400 uppercase font-semibold">{item.almacen}</div>
                                </td>
                                <td className="p-4 font-medium text-gray-700">{item.nombre}</td>
                                <td className="p-4 font-bold text-gray-900">{item.cantidad}</td>

                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase
                                    ${item.estado === 'Disponible' ? 'bg-green-100 text-green-700' :
                                            item.estado === 'Stock Bajo' ? 'bg-orange-100 text-orange-700' :
                                                'bg-red-100 text-red-700'}`}>
                                        {item.estado}
                                    </span>
                                </td>

                                {/* <td className="p-4">
                                    <span className="font-mono font-bold text-gray-700">
                                        {moneda === 'PEN'
                                            ? `S/ ${item.precioPEN.toFixed(2)}`
                                            : `$ ${item.precioUSD.toFixed(2)}`
                                        }
                                    </span>
                                </td> */}
                            </tr>
                        ))}

                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default InventoryPage;