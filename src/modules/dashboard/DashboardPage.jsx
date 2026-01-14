import React from 'react';
import { useInventory } from '../../hooks/useInventory';
import { Package, Building2, AlertTriangle, TrendingUp, TrendingDown, Clock, Activity, ArrowRight, Award, ChevronDown } from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import { Link } from 'react-router-dom';

const DashboardPage = () => {
    const { products, movements, almacenes, catalog } = useInventory(); // Importamos catalog para tener nombres completos si necesario

    // --- CÁLCULOS KPI ---
    const totalSoles = products.reduce((acc, item) => {
        const price = item.precioPEN || 0;
        return acc + (item.cantidad * price);
    }, 0);
    const totalUnidades = products.reduce((acc, item) => acc + item.cantidad, 0);
    const lowStockCount = products.filter(p => p.estado === 'Stock Bajo').length;
    const outOfStockCount = products.filter(p => p.estado === 'Agotado').length;

    // --- ESTADÍSTICAS DE VENTAS ---
    // 1. Agrupar salidas por SKU
    const salesBySku = movements
        .filter(m => m.tipo === 'salida')
        .reduce((acc, m) => {
            acc[m.sku] = (acc[m.sku] || 0) + m.cantidad;
            return acc;
        }, {});

    // 2. Crear array de rendimiento incluyendo productos con 0 ventas (del catálogo)
    // Usamos 'products' como base para nombres, o 'catalog' si queremos incluir TODO lo definido.
    // Usaremos 'catalog' para ser más exhaustivos con "Lo menos vendido".
    // Nota: 'products' es stock actual, 'catalog' es la definición maestra.

    const performanceList = (catalog || []).map(item => {
        const totalSold = salesBySku[item.sku] || 0;
        return {
            sku: item.sku,
            nombre: item.nombre,
            totalSold: totalSold
        };
    });

    // 3. Ordenar
    const bestSellers = [...performanceList].sort((a, b) => b.totalSold - a.totalSold).slice(0, 3);
    const leastSellers = [...performanceList].sort((a, b) => a.totalSold - b.totalSold).slice(0, 3);

    // --- MOVIMIENTOS RECIENTES (Últimos 10) ---
    const recentMovements = [...movements]
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .slice(0, 10);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Activity className="text-blue-600" /> Panel de Control
            </h1>

            {/* SECCIÓN KPI PRINCIPALES */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-2xl shadow-lg text-white">
                    <p className="text-blue-100 text-sm font-medium">Valor Inventario (PEN)</p>
                    <h3 className="text-3xl font-bold mt-2">
                        S/ {totalSoles.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                    <p className="text-xs text-blue-200 mt-2 flex items-center gap-1">
                        <TrendingUp size={14} /> Total valorizado actual
                    </p>
                </div>

                <StatCard
                    title="Unidades en Stock"
                    value={totalUnidades.toLocaleString()}
                    icon={<Package className="text-blue-600" />}
                    color="bg-blue-50"
                />

                <StatCard
                    title="Alertas Stock Bajo"
                    value={lowStockCount}
                    icon={<AlertTriangle className="text-orange-500" />}
                    color="bg-orange-50"
                />

                <StatCard
                    title="Productos Agotados"
                    value={outOfStockCount}
                    icon={<AlertTriangle className="text-red-500" />}
                    color="bg-red-50"
                />
            </div>

            {/* SECCIÓN TOP 3 VENTAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* MÁS VENDIDOS */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <Award className="text-green-500" size={20} /> Top 3 Más Vendidos
                    </h3>
                    <div className="space-y-3">
                        {bestSellers.map((item, index) => (
                            <div key={item.sku} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-green-600 text-sm shadow-sm">
                                        #{index + 1}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm">{item.nombre}</p>
                                        <p className="text-[10px] text-gray-500">{item.sku}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block font-bold text-green-700">{item.totalSold}</span>
                                    <span className="text-[10px] text-gray-500 uppercase">Salidas</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* MENOS VENDIDOS */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <ChevronDown className="text-red-500" size={20} /> Top 3 Menos Vendidos
                    </h3>
                    <div className="space-y-3">
                        {leastSellers.map((item, index) => (
                            <div key={item.sku} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-red-600 text-sm shadow-sm">
                                        #{index + 1}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm">{item.nombre}</p>
                                        <p className="text-[10px] text-gray-500">{item.sku}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block font-bold text-red-700">{item.totalSold}</span>
                                    <span className="text-[10px] text-gray-500 uppercase">Salidas</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ÚLTIMOS MOVIMIENTOS */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-700 flex items-center gap-2">
                            <Clock size={18} className="text-gray-400" /> Actividad Reciente
                        </h3>
                        <Link to="/reportes" className="text-xs text-blue-600 font-bold hover:underline">Ver todo</Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-semibold">
                                <tr>
                                    <th className="p-3">Tipo</th>
                                    <th className="p-3">Producto</th>
                                    <th className="p-3">Cantidad</th>
                                    <th className="p-3">Almacén</th>
                                    <th className="p-3">Fecha</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {recentMovements.length > 0 ? (
                                    recentMovements.map(m => (
                                        <tr key={m.id} className="hover:bg-gray-50">
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${m.tipo === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {m.tipo}
                                                </span>
                                            </td>
                                            <td className="p-3 font-medium text-gray-700">
                                                {m.sku}
                                                <div className="text-xs text-gray-400">{m.tipo === 'entrada' ? m.proveedor : m.destino}</div>
                                            </td>
                                            <td className={`p-3 font-bold ${m.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                                                {m.tipo === 'entrada' ? '+' : '-'}{m.cantidad}
                                            </td>
                                            <td className="p-3 text-gray-600">{m.almacen}</td>
                                            <td className="p-3 text-gray-400 text-xs">
                                                {new Date(m.fecha).toLocaleDateString()} {new Date(m.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="p-6 text-center text-gray-400 italic">
                                            No hay movimientos registrados hoy.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ACCESOS RÁPIDOS / ALMACENES */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                        <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                            <Building2 size={18} className="text-gray-400" /> Estado de Almacenes
                        </h3>
                        <div className="space-y-3">
                            {almacenes.map(almacen => {
                                // Cálculo rápido de stock por almacén
                                const stockAlmacen = products
                                    .filter(p => p.almacen === almacen)
                                    .reduce((acc, p) => acc + p.cantidad, 0);

                                return (
                                    <div key={almacen} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-white p-2 rounded shadow-sm">
                                                <Building2 size={16} className="text-blue-500" />
                                            </div>
                                            <span className="font-medium text-gray-700">{almacen}</span>
                                        </div>
                                        <span className="font-bold text-gray-800">{stockAlmacen} u.</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                        <h4 className="font-bold text-blue-800 mb-2">Acciones Rápidas</h4>
                        <div className="space-y-2">
                            <Link to="/entradas" className="block p-2 bg-white rounded text-blue-600 font-medium text-sm hover:shadow-md transition-shadow flex justify-between items-center">
                                Registrar Entrada <ArrowRight size={14} />
                            </Link>
                            <Link to="/salidas" className="block p-2 bg-white rounded text-red-500 font-medium text-sm hover:shadow-md transition-shadow flex justify-between items-center">
                                Registrar Salida <ArrowRight size={14} />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
