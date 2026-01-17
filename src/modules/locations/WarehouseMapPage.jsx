import React, { useEffect } from 'react';
import { useLocations } from '../../context/LocationsContext';
import { useInventory } from '../../hooks/useInventory';
import { MapPin, Building2, Package, Search, Grid3x3, List } from 'lucide-react';

const WarehouseMapPage = () => {
    const { locations, recalculateCapacities } = useLocations();
    const { products } = useInventory();
    const [selectedWarehouse, setSelectedWarehouse] = React.useState('Central');
    const [selectedZone, setSelectedZone] = React.useState('');
    const [viewMode, setViewMode] = React.useState('grid'); // grid | list
    const [searchTerm, setSearchTerm] = React.useState('');

    // Recalcular capacidades cuando cambie el inventario
    useEffect(() => {
        recalculateCapacities(products);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [products]);

    const almacenes = ['Central', 'Norte', 'Sur', 'Virtual'];
    const zonas = ['Picking', 'Reserva', 'Cuarentena'];

    // Filtrar ubicaciones
    const filteredLocations = locations.filter(loc => {
        if (loc.almacen !== selectedWarehouse) return false;
        if (selectedZone && loc.zona !== selectedZone) return false;
        if (searchTerm && !loc.codigo.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    // Agrupar por zona
    const locationsByZone = filteredLocations.reduce((acc, loc) => {
        if (!acc[loc.zona]) acc[loc.zona] = [];
        acc[loc.zona].push(loc);
        return acc;
    }, {});

    // Obtener productos en una ubicación
    const getProductsInLocation = (codigo, almacen) => {
        return products.filter(p => p.ubicacion === codigo && p.almacen === almacen);
    };

    // Calcular color según ocupación
    const getOccupancyColor = (current, max) => {
        const percentage = (current / max) * 100;
        if (percentage === 0) return 'bg-gray-100 border-gray-300 text-gray-400';
        if (percentage >= 90) return 'bg-red-100 border-red-400 text-red-700';
        if (percentage >= 70) return 'bg-yellow-100 border-yellow-400 text-yellow-700';
        if (percentage >= 40) return 'bg-blue-100 border-blue-400 text-blue-700';
        return 'bg-green-100 border-green-400 text-green-700';
    };

    const getOccupancyLabel = (current, max) => {
        const percentage = (current / max) * 100;
        if (percentage === 0) return 'Vacía';
        if (percentage >= 90) return 'Crítica';
        if (percentage >= 70) return 'Alta';
        if (percentage >= 40) return 'Media';
        return 'Baja';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <MapPin className="text-indigo-600" size={28} />
                    <h1 className="text-2xl font-bold text-gray-800">Mapa de Ubicaciones</h1>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-all ${viewMode === 'grid'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        <Grid3x3 size={18} /> Mapa
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-all ${viewMode === 'list'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        <List size={18} /> Lista
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Building2 size={16} /> Almacén
                        </label>
                        <select
                            className="w-full px-3 py-2 border rounded-lg bg-white text-sm"
                            value={selectedWarehouse}
                            onChange={(e) => setSelectedWarehouse(e.target.value)}
                        >
                            {almacenes.map(a => (
                                <option key={a} value={a}>{a}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Zona</label>
                        <select
                            className="w-full px-3 py-2 border rounded-lg bg-white text-sm"
                            value={selectedZone}
                            onChange={(e) => setSelectedZone(e.target.value)}
                        >
                            <option value="">Todas las zonas</option>
                            {zonas.map(z => (
                                <option key={z} value={z}>{z}</option>
                            ))}
                        </select>
                    </div>

                    <div className="md:col-span-2 space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Search size={16} /> Buscar ubicación
                        </label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Ej: A-01-05"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-4">
                <h3 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
                    <Package size={16} /> Leyenda de Ocupación
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-gray-100 border-2 border-gray-300"></div>
                        <span className="text-sm text-gray-700">Vacía (0%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-green-100 border-2 border-green-400"></div>
                        <span className="text-sm text-gray-700">Baja (1-39%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-blue-100 border-2 border-blue-400"></div>
                        <span className="text-sm text-gray-700">Media (40-69%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-yellow-100 border-2 border-yellow-400"></div>
                        <span className="text-sm text-gray-700">Alta (70-89%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-red-100 border-2 border-red-400"></div>
                        <span className="text-sm text-gray-700">Crítica (90-100%)</span>
                    </div>
                </div>
            </div>

            {/* Map Content */}
            {viewMode === 'grid' ? (
                // VISTA MAPA (Grid)
                <div className="space-y-6">
                    {Object.keys(locationsByZone).length > 0 ? (
                        Object.entries(locationsByZone).map(([zona, locs]) => (
                            <div key={zona} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4">
                                    <h2 className="text-white font-bold text-lg flex items-center gap-2">
                                        <MapPin size={20} /> Zona: {zona}
                                        <span className="ml-auto text-sm bg-white/20 px-3 py-1 rounded-full">
                                            {locs.length} ubicaciones
                                        </span>
                                    </h2>
                                </div>
                                <div className="p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {locs.map(loc => {
                                        const productsHere = getProductsInLocation(loc.codigo, loc.almacen);
                                        const percentage = (loc.capacidadActual / loc.capacidadMax) * 100;

                                        return (
                                            <div
                                                key={loc.id}
                                                className={`relative border-2 rounded-lg p-4 transition-all hover:shadow-lg cursor-pointer ${getOccupancyColor(loc.capacidadActual, loc.capacidadMax)}`}
                                                title={`${loc.codigo} - ${loc.tipo}`}
                                            >
                                                {/* Status Badge */}
                                                {loc.estado !== 'Disponible' && (
                                                    <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                                                        {loc.estado === 'Bloqueada' ? '🔒' : '🔧'}
                                                    </div>
                                                )}

                                                {/* Location Code */}
                                                <div className="font-mono font-bold text-lg mb-2">
                                                    {loc.codigo}
                                                </div>

                                                {/* Type */}
                                                <div className="text-xs opacity-75 mb-2">
                                                    {loc.tipo}
                                                </div>

                                                {/* Capacity Bar */}
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-xs font-medium">
                                                        <span>{loc.capacidadActual}/{loc.capacidadMax}</span>
                                                        <span>{Math.round(percentage)}%</span>
                                                    </div>
                                                    <div className="w-full bg-white/50 rounded-full h-2">
                                                        <div
                                                            className="bg-current h-2 rounded-full transition-all"
                                                            style={{ width: `${Math.min(percentage, 100)}%` }}
                                                        />
                                                    </div>
                                                    <div className="text-xs font-bold text-center mt-1">
                                                        {getOccupancyLabel(loc.capacidadActual, loc.capacidadMax)}
                                                    </div>
                                                </div>

                                                {/* Products Count */}
                                                {productsHere.length > 0 && (
                                                    <div className="mt-3 pt-3 border-t border-current/20">
                                                        <div className="text-xs font-bold mb-1">
                                                            {productsHere.length} SKU{productsHere.length > 1 ? 's' : ''}
                                                        </div>
                                                        <div className="text-xs space-y-0.5 max-h-16 overflow-y-auto">
                                                            {productsHere.slice(0, 3).map(p => (
                                                                <div key={p.id} className="truncate">
                                                                    • {p.sku} ({p.cantidad})
                                                                </div>
                                                            ))}
                                                            {productsHere.length > 3 && (
                                                                <div className="italic">+{productsHere.length - 3} más...</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                            <MapPin className="mx-auto text-gray-300 mb-4" size={48} />
                            <p className="text-gray-400 italic">No hay ubicaciones en este almacén</p>
                        </div>
                    )}
                </div>
            ) : (
                // VISTA LISTA
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-bold border-b">
                            <tr>
                                <th className="p-4">Código</th>
                                <th className="p-4">Zona</th>
                                <th className="p-4">Tipo</th>
                                <th className="p-4">Ocupación</th>
                                <th className="p-4">Productos</th>
                                <th className="p-4">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredLocations.length > 0 ? (
                                filteredLocations.map(loc => {
                                    const productsHere = getProductsInLocation(loc.codigo, loc.almacen);
                                    const percentage = (loc.capacidadActual / loc.capacidadMax) * 100;

                                    return (
                                        <tr key={loc.id} className="hover:bg-gray-50">
                                            <td className="p-4 font-mono font-bold text-indigo-700">{loc.codigo}</td>
                                            <td className="p-4">
                                                <span className="px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-700">
                                                    {loc.zona}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-600">{loc.tipo}</td>
                                            <td className="p-4">
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-xs">
                                                        <span className="font-medium">{loc.capacidadActual} / {loc.capacidadMax}</span>
                                                        <span className="text-gray-500">{Math.round(percentage)}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className={`h-2 rounded-full transition-all ${percentage >= 90 ? 'bg-red-500' :
                                                                percentage >= 70 ? 'bg-yellow-500' :
                                                                    percentage >= 40 ? 'bg-blue-500' :
                                                                        percentage > 0 ? 'bg-green-500' : 'bg-gray-300'
                                                                }`}
                                                            style={{ width: `${Math.min(percentage, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {productsHere.length > 0 ? (
                                                    <div className="text-xs">
                                                        <div className="font-bold text-indigo-700 mb-1">
                                                            {productsHere.length} SKU{productsHere.length > 1 ? 's' : ''}
                                                        </div>
                                                        {productsHere.slice(0, 2).map(p => (
                                                            <div key={p.id} className="text-gray-600">
                                                                {p.sku} ({p.cantidad} u.)
                                                            </div>
                                                        ))}
                                                        {productsHere.length > 2 && (
                                                            <div className="text-gray-400 italic">+{productsHere.length - 2} más</div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic text-xs">Vacía</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${loc.estado === 'Disponible' ? 'bg-green-100 text-green-700' :
                                                    loc.estado === 'Bloqueada' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {loc.estado}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-gray-400 italic">
                                        No se encontraron ubicaciones
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default WarehouseMapPage;
