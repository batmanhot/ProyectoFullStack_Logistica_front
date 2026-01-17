import React, { useState, useMemo } from 'react';
import { useInventory } from '../../hooks/useInventory';
import {
    Package,
    Building2,
    ArrowUp,
    ArrowDown,
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    Download,
    ArrowUpDown,
    Boxes
} from 'lucide-react';
import StatCard from '../../components/ui/StatCard';

const InventoryPage = () => {

    const { products, almacenes, catalog } = useInventory();

    // Estados de UI
    const [filtroAlmacen, setFiltroAlmacen] = useState('Todos');
    const [filtroCategoria, setFiltroCategoria] = useState('Todas');
    const [moneda, setMoneda] = useState('PEN'); // 'PEN' o 'USD'
    const [searchTerm, setSearchTerm] = useState('');

    // Estados de Tabla
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [sortConfig, setSortConfig] = useState({ key: 'cantidad', direction: 'desc' });

    // 1. Enriquecer datos con el Catálogo (para obtener categorías)
    const productsEnhanced = useMemo(() => {
        return products.map(p => {
            const catalogItem = catalog.find(c => c.sku === p.sku);
            return {
                ...p,
                categoria: catalogItem ? catalogItem.categoria : 'Sin Categoría',
                // Aseguramos valores numéricos para ordenamiento correcto
                cantidad: Number(p.cantidad),
                precioPEN: Number(p.precioPEN || 0),
                precioUSD: Number(p.precioUSD || 0)
            };
        });
    }, [products, catalog]);

    // 2. Obtener lista única de categorías para el filtro
    const categorias = useMemo(() => {
        const cats = new Set(catalog.map(c => c.categoria));
        return ['Todas', ...Array.from(cats)];
    }, [catalog]);

    // 3. Filtrado y Búsqueda
    const filteredData = useMemo(() => {
        return productsEnhanced.filter(item => {
            const matchAlmacen = filtroAlmacen === 'Todos' ? true : item.almacen === filtroAlmacen;
            const matchCategoria = filtroCategoria === 'Todas' ? true : item.categoria === filtroCategoria;
            const matchSearch = searchTerm === '' ? true :
                item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.ubicacion && item.ubicacion.toLowerCase().includes(searchTerm.toLowerCase()));

            return matchAlmacen && matchCategoria && matchSearch;
        });
    }, [productsEnhanced, filtroAlmacen, filtroCategoria, searchTerm]);

    // 4. Ordenamiento
    const sortedData = useMemo(() => {
        let sortableItems = [...filteredData];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Mamejo de strings para ordenamiento case-insensitive
                if (typeof aValue === 'string') {
                    aValue = aValue.toLowerCase();
                    bValue = bValue.toLowerCase();
                    if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                    if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                    return 0;
                }

                // Manejo de números
                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredData, sortConfig]);

    // 5. Paginación
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = sortedData.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(sortedData.length / itemsPerPage);

    // Handlers
    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    // Cálculos de KPI Globales (sobre filteredData)
    const valorTotal = filteredData.reduce((acc, item) => {
        const precio = moneda === 'PEN' ? item.precioPEN : item.precioUSD;
        return acc + (item.cantidad * precio);
    }, 0);

    const unidadesTotales = filteredData.reduce((acc, item) => acc + item.cantidad, 0);
    const cantidadStockDisponible = filteredData.filter(item => item.estado === 'Disponible').length;
    const cantidadStockBajo = filteredData.filter(item => item.estado === 'Stock Bajo').length;
    const cantidadStockAgotado = filteredData.filter(item => item.estado === 'Agotado').length;


    // Helper para iconos de sort
    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="text-gray-400 ml-2 inline" />;
        return sortConfig.direction === 'ascending'
            ? <ArrowUp size={14} className="text-blue-600 ml-2 inline" />
            : <ArrowDown size={14} className="text-blue-600 ml-2 inline" />;
    };

    return (
        <div className="space-y-6">
            {/* HEADER SUPERIOR */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Reporte de Inventario</h1>
                    <p className="text-gray-500 text-sm mt-1">Gestión y monitoreo de existencias en tiempo real</p>
                </div>

                {/* SELECTOR DE MONEDA */}
                <div className="bg-white p-1 rounded-xl border border-gray-200 shadow-sm flex">
                    <button
                        onClick={() => setMoneda('PEN')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${moneda === 'PEN' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        S/ Soles
                    </button>
                    <button
                        onClick={() => setMoneda('USD')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${moneda === 'USD' ? 'bg-green-50 text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        $ Dólares
                    </button>
                </div>
            </div>

            {/* SECCIÓN KPI PREMIUM */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* TARJETA PRINCIPAL: VALORIZACIÓN */}
                <div className="md:col-span-1 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Boxes size={100} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-indigo-100 text-sm font-medium mb-1">Valorización Total ({moneda})</p>
                        <h2 className="text-3xl font-bold tracking-tight">
                            {moneda === 'PEN' ? 'S/' : '$'} {valorTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </h2>
                        <div className="mt-4 flex items-center gap-2 text-xs text-indigo-200 bg-white/20 w-fit px-2 py-1 rounded-full">
                            <Filter size={12} />
                            <span>{filteredData.length} SKUs filtrados</span>
                        </div>
                    </div>
                </div>

                {/* TARJETAS SECUNDARIAS */}
                <StatCard
                    title="Unidades en Stock"
                    value={unidadesTotales.toLocaleString()}
                    icon={<Package className="text-blue-600" />}
                    color="bg-white border-blue-100" // Override styles if needed inside StatCard or pass class
                    trend="Total físico"
                />
                <StatCard
                    title="Almacenes Activos"
                    value={almacenes.length}
                    icon={<Building2 className="text-purple-600" />}
                    color="bg-white border-purple-100"
                    trend="Sedes operativas"
                />
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm font-medium">Estado del Stock</p>
                    <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-xs items-center">
                            <span className="text-green-700 font-medium">Disponible</span>
                            <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-bold">{cantidadStockDisponible}</span>
                        </div>
                        <div className="flex justify-between text-xs items-center">
                            <span className="text-orange-600 font-medium">Bajo</span>
                            <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-bold">{cantidadStockBajo}</span>
                        </div>
                        <div className="flex justify-between text-xs items-center">
                            <span className="text-red-600 font-medium">Agotado</span>
                            <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold">{cantidadStockAgotado}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* BARRA DE HERRAMIENTAS Y FILTROS */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-4 justify-between items-center">
                {/* BUSCADOR */}
                <div className="relative w-full lg:w-96 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por SKU, Producto o Categoría..."
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1); // Reset page on search
                        }}
                    />
                </div>

                {/* FILTROS DROPDOWN */}
                <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
                        <Building2 size={16} className="text-gray-500" />
                        <select
                            className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer min-w-[120px]"
                            value={filtroAlmacen}
                            onChange={(e) => {
                                setFiltroAlmacen(e.target.value);
                                setCurrentPage(1);
                            }}
                        >
                            <option value="Todos">Almacén: Todos</option>
                            {almacenes.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
                        <Boxes size={16} className="text-gray-500" />
                        <select
                            className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer min-w-[120px]"
                            value={filtroCategoria}
                            onChange={(e) => {
                                setFiltroCategoria(e.target.value);
                                setCurrentPage(1);
                            }}
                        >
                            <option value="Todas">Categoría: Todas</option>
                            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <button className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-gray-200" title="Exportar Reporte">
                        <Download size={20} />
                    </button>
                </div>
            </div>

            {/* TABLA DE RESULTADOS */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th
                                    className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => requestSort('sku')}
                                >
                                    SKU / Almacén <SortIcon columnKey="sku" />
                                </th>
                                <th
                                    className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => requestSort('nombre')}
                                >
                                    Producto <SortIcon columnKey="nombre" />
                                </th>
                                <th
                                    className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => requestSort('categoria')}
                                >
                                    Categoría <SortIcon columnKey="categoria" />
                                </th>
                                <th
                                    className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors text-right"
                                    onClick={() => requestSort('cantidad')}
                                >
                                    Stock Físico <SortIcon columnKey="cantidad" />
                                </th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Ubicación</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {currentItems.length > 0 ? (
                                currentItems.map((item) => (
                                    <tr key={`${item.id}-${item.almacen}`} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="font-mono text-xs font-bold text-blue-600 group-hover:text-blue-700">{item.sku}</span>
                                                <span className="text-[10px] text-gray-400 font-semibold uppercase flex items-center gap-1 mt-0.5">
                                                    <Building2 size={10} /> {item.almacen}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-medium text-gray-800">{item.nombre}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                                                {item.categoria}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="font-bold text-gray-900">{item.cantidad.toLocaleString()}</div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                {item.ubicacion || 'Sin Ubicación'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${item.estado === 'Disponible'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                : item.estado === 'Stock Bajo'
                                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${item.estado === 'Disponible' ? 'bg-emerald-500' :
                                                    item.estado === 'Stock Bajo' ? 'bg-amber-500' : 'bg-rose-500'
                                                    }`}></span>
                                                {item.estado}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="p-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <Search size={32} className="opacity-20" />
                                            <p>No se encontraron productos con los filtros actuales.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINACIÓN */}
                {sortedData.length > 0 && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-xs text-gray-500">
                            Mostrando <span className="font-bold text-gray-700">{indexOfFirstItem + 1}</span> a <span className="font-bold text-gray-700">{Math.min(indexOfLastItem, sortedData.length)}</span> de <span className="font-bold text-gray-700">{sortedData.length}</span> resultados
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>

                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                // Lógica simple de paginación para mostrar ventanas pequeñas sería más compleja,
                                // aquí mostramos las primeras 5 o todas si son menso de 5 para simplicidad visual inicial 
                                // o adaptar lógica si son muchas páginas.
                                // Para este snippet, mostramos páginas dinámicas simples.
                                let pageNum = i + 1;
                                if (totalPages > 5 && currentPage > 3) {
                                    pageNum = currentPage - 3 + i;
                                }
                                if (pageNum > totalPages) return null;

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => handlePageChange(pageNum)}
                                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === pageNum
                                            ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-100'
                                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}

                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InventoryPage;