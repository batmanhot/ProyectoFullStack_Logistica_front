import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, Legend, PieChart, Pie } from 'recharts';
import { useInventory } from '../../hooks/useInventory';
import { useBatches } from '../../hooks/useBatches'; // Agregado
import { LayoutDashboard, FileBarChart, AlertTriangle, History, Search, Download, ArrowRight, ArrowLeft, DollarSign, Package, Activity, AlertCircle, CalendarClock } from 'lucide-react';
import * as XLSX from 'xlsx';

const ReportsPage = () => {
    const { products, movements, catalog, almacenes } = useInventory();
    const { batches } = useBatches(); // Agregado
    const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | stock | replenishment | kardex

    // --- KPIs y ANALÍTICA ---
    const dashboardMetrics = useMemo(() => {
        // 1. Valor Total y Unidades
        const totalValue = products.reduce((acc, p) => {
            const price = p.precioPEN || 0;
            return acc + (p.cantidad * price);
        }, 0);
        const totalUnits = products.reduce((acc, p) => acc + p.cantidad, 0);

        // 2. Alertas
        const lowStockCount = products.filter(p => p.estado === 'Stock Bajo' || p.estado === 'Agotado').length;

        // 3. Movimientos del Mes Actual
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const movementsThisMonth = movements.filter(m => new Date(m.fecha) >= startOfMonth).length;

        // 4. Tendencia de Movimientos (Últimos 14 días)
        const last14Days = [...Array(14)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (13 - i));
            return d.toISOString().split('T')[0];
        });

        const trendData = last14Days.map(date => {
            const dayMovements = movements.filter(m => m.fecha.startsWith(date));
            const entradas = dayMovements.filter(m => m.tipo === 'entrada').reduce((acc, m) => acc + m.cantidad, 0);
            const salidas = dayMovements.filter(m => m.tipo === 'salida').reduce((acc, m) => acc + m.cantidad, 0);
            const transferencias = dayMovements.filter(m => m.tipo === 'transferencia').reduce((acc, m) => acc + m.cantidad, 0);
            return { date: date.slice(5), entradas, salidas, transferencias };
        });

        // 5. Top Productos (Salidas)
        const productExits = {};
        movements.filter(m => m.tipo === 'salida').forEach(m => {
            productExits[m.sku] = (productExits[m.sku] || 0) + m.cantidad;
        });
        const topProducts = Object.entries(productExits)
            .map(([sku, qty]) => {
                const product = catalog.find(c => c.sku === sku);
                return { name: product ? product.nombre : sku, value: qty };
            })
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        // 6. Distribución por Categoría (para Pie Chart)
        // Necesitamos unir products con catalog para obtener categorías
        const categoryDist = {};
        products.forEach(p => {
            const catItem = catalog.find(c => c.sku === p.sku);
            const category = catItem ? catItem.categoria : 'Sin Categoría';
            categoryDist[category] = (categoryDist[category] || 0) + p.cantidad;
        });
        const pieData = Object.entries(categoryDist).map(([name, value]) => ({ name, value }));

        // 7. Lotes por Vencer/Vencidos
        const expiredBatchesCount = batches.filter(b => b.estado === 'Vencido').length;
        const nearExpiryBatchesCount = batches.filter(b => b.estado === 'Por Vencer').length;

        return {
            totalValue,
            totalUnits,
            lowStockCount,
            movementsThisMonth,
            trendData,
            topProducts,
            pieData,
            expiredBatchesCount,
            nearExpiryBatchesCount
        };
    }, [products, movements, catalog, batches]);

    const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];

    // --- REPORTE DE REPOSICIÓN ---
    const stockCritico = products.filter(p => p.estado === 'Stock Bajo' || p.estado === 'Agotado');

    // --- KARDEX LOGIG ---
    const [kardexSearch, setKardexSearch] = useState('');
    const [selectedSku, setSelectedSku] = useState(null);
    const [selectedAlmacen, setSelectedAlmacen] = useState('Todos');

    const kardexData = useMemo(() => {
        if (!selectedSku) return [];
        let filteredMovements = movements.filter(m => m.sku === selectedSku);
        if (selectedAlmacen !== 'Todos') {
            filteredMovements = filteredMovements.filter(m => m.almacen === selectedAlmacen || m.almacenDestino === selectedAlmacen);
        }
        filteredMovements.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        let balance = 0;
        return filteredMovements.map(m => {
            let entrada = 0;
            let salida = 0;
            if (selectedAlmacen === 'Todos') {
                if (m.tipo === 'entrada') { entrada = m.cantidad; balance += m.cantidad; }
                else if (m.tipo === 'salida') { salida = m.cantidad; balance -= m.cantidad; }
                else if (m.tipo === 'transferencia' && m.subtipo !== 'Local') { salida = m.cantidad; balance -= m.cantidad; }
            } else {
                if (m.almacen === selectedAlmacen) { salida = m.cantidad; balance -= m.cantidad; }
                else if (m.almacenDestino === selectedAlmacen) { entrada = m.cantidad; balance += m.cantidad; }
            }
            return { ...m, entrada, salida, saldo: balance };
        });
    }, [selectedSku, selectedAlmacen, movements]);

    const handleExportExcel = (data, filename) => {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
        XLSX.writeFile(workbook, `${filename}.xlsx`);
    };

    const tabTitles = {
        dashboard: 'Panel de Control y Analítica',
        stock: 'Reporte de Stock Detallado',
        replenishment: 'Reporte de Reposición Crítica',
        kardex: 'Reporte de Movimientos (Kardex)'
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-800">{tabTitles[activeTab]}</h1>
                <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                        { id: 'stock', label: 'Stock', icon: FileBarChart },
                        { id: 'replenishment', label: 'Reposición', icon: AlertTriangle },
                        { id: 'kardex', label: 'Kardex', icon: History },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab.id
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <tab.icon size={16} />
                            <span className="hidden md:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* 1. DASHBOARD */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6 animate-in fade-in duration-300">

                    {/* KPI CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Valor Inventario</p>
                                <h3 className="text-2xl font-bold text-gray-800">S/ {dashboardMetrics.totalValue.toLocaleString()}</h3>
                                <span className="text-xs text-green-500 flex items-center gap-1 font-medium mt-1">Estimado</span>
                            </div>
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-full"><DollarSign size={24} /></div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Total Unidades</p>
                                <h3 className="text-2xl font-bold text-gray-800">{dashboardMetrics.totalUnits.toLocaleString()}</h3>
                                <span className="text-xs text-gray-400 mt-1 block">En todos los almacenes</span>
                            </div>
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full"><Package size={24} /></div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Movimientos (Mes)</p>
                                <h3 className="text-2xl font-bold text-gray-800">{dashboardMetrics.movementsThisMonth}</h3>
                                <span className="text-xs text-green-500 flex items-center gap-1 mt-1 font-medium"><Activity size={12} /> Actividad reciente</span>
                            </div>
                            <div className="p-3 bg-green-50 text-green-600 rounded-full"><History size={24} /></div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Lotes / Caducidad</p>
                                <h3 className={`text-2xl font-bold ${dashboardMetrics.expiredBatchesCount > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                                    {dashboardMetrics.expiredBatchesCount} / {dashboardMetrics.nearExpiryBatchesCount}
                                </h3>
                                <div className="flex gap-2 mt-1">
                                    <span className="text-[10px] text-red-500 font-bold uppercase">Vencidos</span>
                                    <span className="text-[10px] text-gray-300">|</span>
                                    <span className="text-[10px] text-orange-500 font-bold uppercase">Por Vencer</span>
                                </div>
                            </div>
                            <div className={`p-3 rounded-full ${dashboardMetrics.expiredBatchesCount > 0 ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                                <CalendarClock size={24} />
                            </div>
                        </div>
                    </div>

                    {/* CHARTS ROW 1 */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* TENDENCIA */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-6">Tendencia de Movimientos (14 Días)</h3>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={dashboardMetrics.trendData}>
                                        <defs>
                                            <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorSalidas" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Legend />
                                        <Area type="monotone" dataKey="entradas" name="Entradas" stroke="#10b981" fillOpacity={1} fill="url(#colorEntradas)" strokeWidth={2} />
                                        <Area type="monotone" dataKey="salidas" name="Salidas" stroke="#ef4444" fillOpacity={1} fill="url(#colorSalidas)" strokeWidth={2} />
                                        <Area type="monotone" dataKey="transferencias" name="Transferencias" stroke="#3b82f6" fillOpacity={0.1} fill="#3b82f6" strokeWidth={2} strokeDasharray="5 5" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* DISTRIBUCIÓN CATEGORÍA */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-6">Stock por Categoría</h3>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={dashboardMetrics.pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {dashboardMetrics.pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* TOP PRODUCTOS */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Top 5 Productos Más Vendidos (Salidas)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            {dashboardMetrics.topProducts.map((p, idx) => (
                                <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex flex-col items-center text-center">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold mb-2">
                                        #{idx + 1}
                                    </div>
                                    <h4 className="text-sm font-bold text-gray-700 line-clamp-2 h-10">{p.name}</h4>
                                    <p className="text-xl font-bold text-blue-600 mt-2">{p.value}</p>
                                    <span className="text-xs text-gray-400">Unidades</span>
                                </div>
                            ))}
                            {dashboardMetrics.topProducts.length === 0 && (
                                <div className="col-span-5 text-center text-gray-400 py-4">No hay datos de salidas aun.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 2. REPORTE DE STOCK */}
            {activeTab === 'stock' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-700">Inventario General Detallado</h3>
                        <button
                            onClick={() => handleExportExcel(products, 'Reporte_Stock')}
                            className="flex items-center gap-2 text-green-600 hover:text-green-700 font-medium text-sm border border-green-200 bg-green-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            <Download size={16} /> Exportar Excel
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100 text-gray-600 font-semibold border-b">
                                <tr>
                                    <th className="p-4">SKU</th>
                                    <th className="p-4">Producto</th>
                                    <th className="p-4">Almacén</th>
                                    <th className="p-4">Ubicación</th>
                                    <th className="p-4 text-center">Cantidad</th>
                                    <th className="p-4">Control Lotes</th>
                                    <th className="p-4">Estado Stock</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {products.map((p, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="p-4 font-mono text-gray-600">{p.sku}</td>
                                        <td className="p-4 font-medium text-gray-800">{p.nombre}</td>
                                        <td className="p-4">{p.almacen}</td>
                                        <td className="p-4">
                                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                                {p.ubicacion || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center font-bold">{p.cantidad}</td>
                                        <td className="p-4">
                                            {(() => {
                                                const productMaster = catalog.find(c => c.sku === p.sku);
                                                if (!productMaster?.esPerecedero) return <span className="text-gray-400 italic text-xs">No aplica</span>;

                                                const productBatches = batches.filter(b => b.sku === p.sku);
                                                if (productBatches.length === 0) return <span className="text-gray-400 text-xs font-semibold px-2 py-1 bg-gray-100 rounded">Sin Lotes</span>;

                                                const hasExpired = productBatches.some(b => b.estado === 'Vencido');
                                                const hasNearExpiry = productBatches.some(b => b.estado === 'Por Vencer');

                                                if (hasExpired) return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold uppercase border border-red-200">❌ Vencido</span>;
                                                if (hasNearExpiry) return <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-[10px] font-bold uppercase border border-orange-200">⚠️ Por Vencer</span>;
                                                return <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold uppercase border border-green-200">✅ Vigente</span>;
                                            })()}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${p.estado === 'Disponible' ? 'bg-green-100 text-green-700' :
                                                p.estado === 'Stock Bajo' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                {p.estado}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 3. REPORTE DE REPOSICIÓN */}
            {activeTab === 'replenishment' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start justify-between gap-3">
                        <div className="flex gap-3">
                            <AlertTriangle className="text-orange-600 mt-1" size={24} />
                            <div>
                                <h4 className="font-bold text-orange-800">Atención Requerida</h4>
                                <p className="text-sm text-orange-700">Se han detectado {stockCritico.length} productos con niveles de stock crítico o agotado que requieren reposición inmediata.</p>
                            </div>
                        </div>
                        {stockCritico.length > 0 && (
                            <button
                                onClick={() => handleExportExcel(stockCritico, 'Reporte_Reposicion')}
                                className="flex items-center gap-2 text-orange-700 hover:text-orange-800 font-medium text-sm border border-orange-200 bg-white px-3 py-1.5 rounded-lg transition-colors shadow-sm shrink-0"
                            >
                                <Download size={16} /> Exportar Excel
                            </button>
                        )}
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-red-50 text-red-800 font-semibold border-b border-red-100">
                                    <tr>
                                        <th className="p-4">SKU</th>
                                        <th className="p-4">Producto</th>
                                        <th className="p-4">Almacén</th>
                                        <th className="p-4">Ubicación</th>
                                        <th className="p-4 text-center">Stock Actual</th>
                                        <th className="p-4">Estado</th>
                                        <th className="p-4 text-center">Sugerido</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {stockCritico.length > 0 ? (
                                        stockCritico.map((p, idx) => (
                                            <tr key={idx} className="hover:bg-red-50/30">
                                                <td className="p-4 font-mono text-gray-600">{p.sku}</td>
                                                <td className="p-4 font-medium text-gray-800">{p.nombre}</td>
                                                <td className="p-4">{p.almacen}</td>
                                                <td className="p-4">
                                                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                                                        {p.ubicacion || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center font-bold text-red-600">{p.cantidad}</td>
                                                <td className="p-4">
                                                    <span className="flex items-center gap-1 text-red-600 font-bold text-xs uppercase">
                                                        <AlertTriangle size={12} /> {p.estado}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center font-mono text-gray-500">
                                                    +{Math.max(0, 50 - p.cantidad)}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="p-12 text-center text-green-600">
                                                <div className="flex flex-col items-center gap-2">
                                                    <FileBarChart size={40} />
                                                    <p className="font-bold">¡Todo en orden! No hay productos con stock crítico.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. KARDEX (HISTORIAL) */}
            {activeTab === 'kardex' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <History className="text-blue-600" /> Tarjeta de Existencias (Kardex)
                        </h3>
                        {selectedSku && kardexData.length > 0 && (
                            <button
                                onClick={() => handleExportExcel(kardexData, `Kardex_${selectedSku}`)}
                                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm border border-blue-200 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                <Download size={16} /> Exportar Excel
                            </button>
                        )}
                    </div>

                    {/* Buscador */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Buscar Producto</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    className="w-full pl-10 p-2 border rounded-md focus:ring-2 focus:ring-blue-200 outline-none"
                                    placeholder="Ingrese SKU o Nombre..."
                                    value={kardexSearch}
                                    onChange={(e) => setKardexSearch(e.target.value)}
                                />
                                {kardexSearch && (
                                    <div className="absolute top-full left-0 w-full bg-white shadow-xl rounded-md border mt-1 max-h-60 overflow-y-auto z-10">
                                        {catalog.filter(c =>
                                            c.nombre.toLowerCase().includes(kardexSearch.toLowerCase()) ||
                                            c.sku.toLowerCase().includes(kardexSearch.toLowerCase())
                                        ).map(item => (
                                            <div
                                                key={item.id}
                                                className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-0"
                                                onClick={() => {
                                                    setSelectedSku(item.sku);
                                                    setKardexSearch(`${item.sku} - ${item.nombre}`);
                                                }}
                                            >
                                                <div className="font-bold text-sm text-gray-800">{item.nombre}</div>
                                                <div className="text-xs text-gray-500">SKU: {item.sku}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="w-full md:w-64">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Filtrar Almacén</label>
                            <select
                                className="w-full p-2 border rounded-md"
                                value={selectedAlmacen}
                                onChange={(e) => setSelectedAlmacen(e.target.value)}
                            >
                                <option value="Todos">Todos los Almacenes</option>
                                {almacenes.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Tabla Kardex */}
                    {selectedSku ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 text-gray-600 border-b border-gray-300">
                                        <th className="p-3 text-left">Fecha</th>
                                        <th className="p-3 text-left">Documento</th>
                                        <th className="p-3 text-left">Movimiento</th>
                                        <th className="p-3 text-center bg-green-50 text-green-800">Entrada</th>
                                        <th className="p-3 text-center bg-red-50 text-red-800">Salida</th>
                                        <th className="p-3 text-center bg-blue-50 text-blue-800 font-bold">Saldo</th>
                                        <th className="p-3 text-left">Almacén</th>
                                        <th className="p-3 text-left">Ubicación</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {kardexData.length > 0 ? (
                                        kardexData.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="p-3 text-gray-500">{new Date(row.fecha).toLocaleDateString()}</td>
                                                <td className="p-3">
                                                    <div className="font-medium text-gray-700">{row.tipoDocumento || '-'}</div>
                                                    <div className="text-xs text-gray-400">{row.numeroDocumento || row.numeroGuia}</div>
                                                </td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-0.5 rounded text-xs border ${row.tipo === 'entrada' ? 'border-green-200 text-green-700 bg-green-50' :
                                                        row.tipo === 'salida' ? 'border-red-200 text-red-700 bg-red-50' :
                                                            'border-orange-200 text-orange-700 bg-orange-50'
                                                        }`}>
                                                        {row.tipo.toUpperCase()} {row.subtipo ? `(${row.subtipo})` : ''}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center text-green-600 font-mono">
                                                    {row.entrada > 0 ? `+${row.entrada}` : '-'}
                                                </td>
                                                <td className="p-3 text-center text-red-600 font-mono">
                                                    {row.salida > 0 ? `-${row.salida}` : '-'}
                                                </td>
                                                <td className="p-3 text-center font-bold text-blue-700 font-mono bg-blue-50/30">
                                                    {row.saldo}
                                                </td>
                                                <td className="p-3 text-xs text-gray-500">
                                                    {row.almacen} {row.almacenDestino ? `→ ${row.almacenDestino}` : ''}
                                                </td>
                                                <td className="p-3">
                                                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                                        {row.ubicacion || row.ubicacionOrigen || '-'}
                                                    </span>
                                                    {row.ubicacionDestino && (
                                                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded ml-1">
                                                            → {row.ubicacionDestino}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="p-8 text-center text-gray-400 italic">
                                                No hay movimientos registrados para este criterio.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                            <Search className="mx-auto mb-2 text-gray-300" size={48} />
                            <p>Utilice el buscador para seleccionar un producto y ver su Kardex.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ReportsPage;