import React, { useState } from 'react';
import { useBatches } from '../../hooks/useBatches';
import { useInventory } from '../../hooks/useInventory';
import { CalendarClock, Plus, Search, AlertTriangle, CheckCircle, XCircle, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

const BatchPage = () => {
    const { batches, addBatch, updateBatch, deleteBatch } = useBatches();
    const { catalog } = useInventory();

    // Filtramos solo productos perecederos para el combo de selección
    const perishableProducts = catalog.filter(p => p.esPerecedero);

    const [searchTerm, setSearchTerm] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);

    const [formData, setFormData] = useState({
        sku: '',
        numero: '',
        fechaVencimiento: '',
        cantidadOriginal: '',
    });

    const filteredBatches = batches.filter(b =>
        b.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Métricas rápidas
    const expiredCount = batches.filter(b => b.estado === 'Vencido').length;
    const nearExpiryCount = batches.filter(b => b.estado === 'Por Vencer').length;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.sku) {
            toast.error("Debe seleccionar un producto");
            return;
        }

        if (isEditing) {
            updateBatch(editId, {
                ...formData,
                cantidadOriginal: parseInt(formData.cantidadOriginal),
            });
            setIsEditing(false);
            setEditId(null);
        } else {
            addBatch({
                ...formData,
                cantidadOriginal: parseInt(formData.cantidadOriginal),
                cantidadActual: parseInt(formData.cantidadOriginal)
            });
        }

        setIsCreating(false);
        setFormData({ sku: '', numero: '', fechaVencimiento: '', cantidadOriginal: '' });
    };

    const handleEdit = (batch) => {
        setFormData({
            sku: batch.sku,
            numero: batch.numero,
            fechaVencimiento: batch.fechaVencimiento,
            cantidadOriginal: batch.cantidadOriginal
        });
        setEditId(batch.id);
        setIsEditing(true);
        setIsCreating(true);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Vencido': return 'bg-red-100 text-red-700 border-red-200';
            case 'Por Vencer': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Vigente': return 'bg-green-100 text-green-700 border-green-200';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
                <CalendarClock className="text-blue-600" /> Gestión de Lotes y Caducidad
            </h1>

            {/* TARJETAS DE ESTADO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-4">
                    <div className="p-3 bg-red-100 text-red-600 rounded-full"><XCircle size={24} /></div>
                    <div>
                        <p className="text-sm font-medium text-red-600 font-bold uppercase">Lotes Vencidos</p>
                        <p className="text-2xl font-bold text-red-800">{expiredCount}</p>
                    </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl flex items-center gap-4">
                    <div className="p-3 bg-yellow-100 text-yellow-600 rounded-full"><AlertTriangle size={24} /></div>
                    <div>
                        <p className="text-sm font-medium text-yellow-600 font-bold uppercase">Por Vencer (30 días)</p>
                        <p className="text-2xl font-bold text-yellow-800">{nearExpiryCount}</p>
                    </div>
                </div>
                <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex items-center gap-4">
                    <div className="p-3 bg-green-100 text-green-600 rounded-full"><CheckCircle size={24} /></div>
                    <div>
                        <p className="text-sm font-medium text-green-600 font-bold uppercase">Lotes Vigentes</p>
                        <p className="text-2xl font-bold text-green-800">{batches.length - expiredCount - nearExpiryCount}</p>
                    </div>
                </div>
            </div>

            {/* CONTROLES PRINCIPALES */}
            <div className="bg-white p-4 rounded-xl border flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por Lote o SKU..."
                        className="w-full pl-10 p-2 border rounded-lg text-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors"
                >
                    <Plus size={18} /> Registrar Nuevo Lote
                </button>
            </div>

            {/* FORMULARIO FLOTANTE (MODAL SIMPLE) */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4 text-gray-800">Registrar Lote</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">Producto (Solo Perecederos)</label>
                                <select
                                    className="w-full p-2 border rounded-md"
                                    value={formData.sku}
                                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                    required
                                >
                                    <option value="">Seleccione un producto...</option>
                                    {perishableProducts.map(p => (
                                        <option key={p.id} value={p.sku}>{p.nombre} ({p.sku})</option>
                                    ))}
                                </select>
                                {perishableProducts.length === 0 && (
                                    <p className="text-xs text-red-500 mt-1">No hay productos marcados como perecederos en el catálogo.</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">Número de Lote</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border rounded-md"
                                    placeholder="Ej. L-2024-001"
                                    value={formData.numero}
                                    onChange={e => setFormData({ ...formData, numero: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-1">Fecha Vencimiento</label>
                                    <input
                                        type="date"
                                        className="w-full p-2 border rounded-md"
                                        value={formData.fechaVencimiento}
                                        onChange={e => setFormData({ ...formData, fechaVencimiento: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-1">Cantidad Inicial</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 border rounded-md"
                                        placeholder="0"
                                        value={formData.cantidadOriginal}
                                        onChange={e => setFormData({ ...formData, cantidadOriginal: e.target.value })}
                                        required
                                        min="1"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"
                                >
                                    Guardar Lote
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* LISTADO DE LOTES */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 font-bold border-b">
                        <tr>
                            <th className="p-4">Nro. Lote</th>
                            <th className="p-4">Producto</th>
                            <th className="p-4">F. Vencimiento</th>
                            <th className="p-4 text-center">Cantidad Original</th>
                            <th className="p-4 text-center">Cantidad Actual</th>
                            <th className="p-4">Estado</th>
                            <th className="p-4 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredBatches.map(batch => {
                            const product = catalog.find(p => p.sku === batch.sku);
                            return (
                                <tr key={batch.id} className="hover:bg-gray-50">
                                    <td className="p-4 font-mono font-bold text-gray-700">{batch.numero}</td>
                                    <td className="p-4">
                                        <div className="font-bold text-gray-800">{product ? product.nombre : 'Producto Desconocido'}</div>
                                        <div className="text-xs text-gray-500">{batch.sku}</div>
                                    </td>
                                    <td className="p-4 font-mono">
                                        {new Date(batch.fechaVencimiento).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-center text-gray-500">{batch.cantidadOriginal}</td>
                                    <td className="p-4 text-center font-bold text-black">{batch.cantidadActual}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold border ${getStatusColor(batch.estado)}`}>
                                            {batch.estado.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="p-4 flex gap-2 justify-center">
                                        <button
                                            onClick={() => handleEdit(batch)}
                                            className="text-gray-400 hover:text-blue-600 transition-colors"
                                            title="Editar Lote"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={() => deleteBatch(batch.id)}
                                            className="text-gray-400 hover:text-red-600 transition-colors"
                                            title="Eliminar Lote"
                                        >
                                            <XCircle size={18} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredBatches.length === 0 && (
                            <tr>
                                <td colSpan="7" className="p-12 text-center text-gray-400 italic">
                                    No se encontraron lotes registrados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BatchPage;
