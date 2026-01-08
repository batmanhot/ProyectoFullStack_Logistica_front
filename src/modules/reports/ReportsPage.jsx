import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useInventory } from '../../hooks/useInventory';


const ReportsPage = () => {
    const { products } = useInventory();

    const [almacenes] = useState(['Central', 'Norte', 'Sur', 'Virtual']);
    // Preparamos datos para el gráfico
    const dataGrafico = products.map(p => ({
        name: p.sku,
        stock: p.cantidad
    }));

    const dataPorAlmacen = almacenes.map(alm => {
        const productosAlm = products.filter(p => p.almacen === alm);
        const valor = productosAlm.reduce((acc, p) => acc + (p.cantidad * p.precioPEN), 0);
        return { name: alm, valor: valor };
    });

    const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981'];

    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-bold text-gray-800">Analítica de Almacén</h1>

            {/* <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"> */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">

                    <h3 className="text-lg font-semibold text-gray-700 mb-6">Niveles de Stock por SKU</h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dataGrafico}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="stock" radius={[4, 4, 0, 0]}>
                                    {dataGrafico.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* NUEVO: Gráfico de Valorización por Almacén */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-700 mb-6">Valorización por Almacén (Soles)</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dataPorAlmacen} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" fontSize={12} width={80} />
                                <Tooltip currency="PEN" />
                                <Bar dataKey="valor" fill="#10b981" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-100">
                    <h4 className="font-bold text-gray-800 mb-2">Resumen de Operación</h4>
                    <p className="text-sm text-gray-500">Total de productos únicos: <strong>{products.length}</strong></p>
                    <p className="text-sm text-gray-500">Productos con stock crítico: <strong>{products.filter(p => p.cantidad < 20).length}</strong></p>
                </div>
            </div>
        </div>
    );
};

export default ReportsPage;