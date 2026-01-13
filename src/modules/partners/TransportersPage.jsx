import React, { useState } from 'react';
import { useTransporters } from '../../hooks/useTransporters';
import { Truck, Plus, Edit, Trash2, X, Search, Phone, CreditCard, User, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

const TransportersPage = () => {
    const { transporters, addTransporter, updateTransporter, deleteTransporter } = useTransporters();

    // UI State
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        nombre: '',
        ruc: '',
        placa: '',
        chofer: '',
        telefono: '',
        estado: 'Activo'
    });

    const resetForm = () => {
        setFormData({ nombre: '', ruc: '', placa: '', chofer: '', telefono: '', estado: 'Activo' });
        setIsEditing(false);
        setEditId(null);
    };

    const handleEdit = (t) => {
        setFormData({ ...t });
        setEditId(t.id);
        setIsEditing(true);
        setIsCreating(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.nombre || !formData.ruc || !formData.placa) {
            toast.error("Nombre, RUC y Placa son obligatorios");
            return;
        }

        if (isEditing) {
            updateTransporter(editId, formData);
        } else {
            addTransporter(formData);
        }

        setIsCreating(false);
        resetForm();
    };

    const filteredTransporters = transporters.filter(t =>
        t.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.ruc.includes(searchTerm) ||
        t.placa.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
                    <Truck className="text-blue-600" /> Catálogo de Transportistas
                </h1>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <Plus size={18} /> Registrar Transportista
                </button>
            </div>

            {/* BUSCADOR */}
            <div className="bg-white p-4 rounded-xl border">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por Nombre, RUC o Placa..."
                        className="w-full pl-10 p-2 border rounded-lg text-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* FORMULARIO (MODAL) */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
                            <h2 className="font-bold flex items-center gap-2">
                                {isEditing ? <Edit size={18} /> : <Plus size={18} />}
                                {isEditing ? 'Editar Transportista' : 'Nuevo Transportista'}
                            </h2>
                            <button onClick={() => { setIsCreating(false); resetForm(); }}><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Nombre / Razón Social</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded-md"
                                        value={formData.nombre}
                                        onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">RUC</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded-md"
                                        value={formData.ruc}
                                        onChange={e => setFormData({ ...formData, ruc: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Placa del Vehículo</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded-md uppercase"
                                        value={formData.placa}
                                        onChange={e => setFormData({ ...formData, placa: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Chofer</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded-md"
                                        value={formData.chofer}
                                        onChange={e => setFormData({ ...formData, chofer: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Teléfono</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded-md"
                                        value={formData.telefono}
                                        onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => { setIsCreating(false); resetForm(); }}
                                    className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    {isEditing ? 'Actualizar' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* LISTADO */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 font-bold border-b">
                        <tr>
                            <th className="p-4">Transportista</th>
                            <th className="p-4">RUC</th>
                            <th className="p-4">Vehículo</th>
                            <th className="p-4">Chofer</th>
                            <th className="p-4">Contacto</th>
                            <th className="p-4 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredTransporters.map(t => (
                            <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4 font-bold text-gray-800">{t.nombre}</td>
                                <td className="p-4 text-gray-600 font-mono">{t.ruc}</td>
                                <td className="p-4">
                                    <span className="bg-gray-100 px-2 py-1 rounded font-bold border border-gray-200">
                                        {t.placa}
                                    </span>
                                </td>
                                <td className="p-4 flex items-center gap-2">
                                    <User size={14} className="text-gray-400" />
                                    {t.chofer || '-'}
                                </td>
                                <td className="p-4">
                                    {t.telefono && (
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                            <Phone size={12} /> {t.telefono}
                                        </div>
                                    )}
                                </td>
                                <td className="p-4 text-center">
                                    <div className="flex justify-center gap-2">
                                        <button
                                            onClick={() => handleEdit(t)}
                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={() => { if (window.confirm('¿Eliminar transportista?')) deleteTransporter(t.id); }}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TransportersPage;
