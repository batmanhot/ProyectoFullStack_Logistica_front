import React, { useState } from 'react';
import { usePartners } from '../../hooks/usePartners';
import { Users, Plus, Edit, Trash2, X, Search, Briefcase, Truck, Phone, Mail, MapPin, Building } from 'lucide-react';
import toast from 'react-hot-toast';

const PartnersPage = ({ initialTab = 'Todos' }) => {
    const { partners, addPartner, updatePartner, deletePartner } = usePartners();

    // UI State
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState(initialTab); // Todos | Cliente | Proveedor

    // Sincronizar tab si cambia el prop
    React.useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    const [formData, setFormData] = useState({
        nombre: '',
        tipo: 'Cliente',
        ruc: '',
        telefono: '',
        email: '',
        direccion: ''
    });

    // --- MANEJADORES ---
    const resetForm = () => {
        setFormData({
            nombre: '',
            tipo: 'Cliente',
            ruc: '',
            telefono: '',
            email: '',
            direccion: ''
        });
        setIsEditing(false);
        setEditId(null);
    };

    const handleCreateNew = () => {
        resetForm();
        setIsCreating(true);
    };

    const handleCancel = () => {
        resetForm();
        setIsCreating(false);
    };

    const handleEdit = (partner) => {
        setFormData({
            nombre: partner.nombre,
            tipo: partner.tipo,
            ruc: partner.ruc || '',
            telefono: partner.telefono || '',
            email: partner.email || '',
            direccion: partner.direccion || ''
        });
        setEditId(partner.id);
        setIsEditing(true);
        setIsCreating(true);
    };

    const handleDelete = (id) => {
        if (window.confirm("¿Está seguro de eliminar este socio de negocio?")) {
            deletePartner(id);
            toast.success("Eliminado correctamente.");
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.nombre || !formData.ruc) {
            toast.error("Razón Social y RUC son obligatorios");
            return;
        }

        try {
            if (isEditing) {
                updatePartner(editId, formData);
                toast.success("Datos actualizados");
            } else {
                addPartner(formData);
                toast.success("Nuevo socio registrado");
            }
            handleCancel();
        } catch (error) {
            toast.error("Error al guardar");
        }
    };

    // --- FILTRADO ---
    const filteredPartners = partners.filter(p => {
        const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.ruc.includes(searchTerm);

        if (activeTab === 'Todos') return matchesSearch;
        return matchesSearch && p.tipo === activeTab;
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Users className="text-blue-600" size={28} />
                    <h1 className="text-2xl font-bold text-gray-800">Directorio de Socios</h1>
                </div>
                {!isCreating && (
                    <button
                        onClick={handleCreateNew}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-sm transition-all"
                    >
                        <Plus size={20} /> Nuevo Socio
                    </button>
                )}
            </div>

            {isCreating ? (
                // --- FORMULARIO ---
                <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-4xl mx-auto">
                    <div className="bg-blue-50 p-4 border-b flex justify-between items-center">
                        <h2 className="font-bold text-blue-800 flex items-center gap-2">
                            {isEditing ? <Edit size={18} /> : <Plus size={18} />}
                            {isEditing ? 'Editar Datos' : 'Registrar Nuevo Socio'}
                        </h2>
                        <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* TIPO */}
                        <div className="md:col-span-2 flex gap-6 pb-4 border-b border-gray-100">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="tipo"
                                    value="Cliente"
                                    checked={formData.tipo === 'Cliente'}
                                    onChange={() => setFormData({ ...formData, tipo: 'Cliente' })}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="font-bold text-gray-700 flex items-center gap-1"><Briefcase size={16} /> Cliente</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="tipo"
                                    value="Proveedor"
                                    checked={formData.tipo === 'Proveedor'}
                                    onChange={() => setFormData({ ...formData, tipo: 'Proveedor' })}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="font-bold text-gray-700 flex items-center gap-1"><Truck size={16} /> Proveedor</span>
                            </label>
                        </div>

                        {/* DATOS PRINCIPALES */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Razón Social / Nombre</label>
                            <div className="relative">
                                <Building className="absolute left-3 top-3 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    className="w-full pl-10 p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Ej: DISPRO SAC"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">RUC / ID Fiscal</label>
                            <div className="relative">
                                <div className="absolute left-3 top-3 text-gray-400 font-bold text-xs">ID</div>
                                <input
                                    type="text"
                                    className="w-full pl-10 p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Ej: 20123456789"
                                    value={formData.ruc}
                                    onChange={(e) => setFormData({ ...formData, ruc: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        {/* CONTACTO */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Teléfono</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    className="w-full pl-10 p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="+51 999 000 000"
                                    value={formData.telefono}
                                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                                <input
                                    type="email"
                                    className="w-full pl-10 p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="contacto@empresa.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Dirección Fiscal / Entrega</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    className="w-full pl-10 p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Av. Principal 123, Lima"
                                    value={formData.direccion}
                                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2 flex justify-end gap-3 pt-6 border-t">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="px-6 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg font-bold shadow-md transition-all"
                            >
                                {isEditing ? 'Guardar Cambios' : 'Registrar Socio'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                // --- LISTADO ---
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between bg-gray-50/50">
                        <div className="flex gap-2">
                            {['Todos', 'Cliente', 'Proveedor'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab
                                        ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200'
                                        : 'text-gray-500 hover:bg-gray-100'
                                        }`}
                                >
                                    {tab === 'Todos' ? 'Todos' : tab + 's'}
                                </button>
                            ))}
                        </div>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar socio..."
                                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600 font-bold border-b">
                                <tr>
                                    <th className="p-4 w-12">#</th>
                                    <th className="p-4">Razón Social</th>
                                    <th className="p-4">Tipo</th>
                                    <th className="p-4">RUC</th>
                                    <th className="p-4">Contacto</th>
                                    <th className="p-4 md:table-cell hidden">Dirección</th>
                                    <th className="p-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredPartners.length > 0 ? (
                                    filteredPartners.map((partner, index) => (
                                        <tr key={partner.id} className="hover:bg-gray-50 group transition-colors">
                                            <td className="p-4 text-gray-400 font-mono text-xs">{index + 1}</td>
                                            <td className="p-4 font-bold text-gray-800">
                                                {partner.nombre}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-md text-xs font-bold border ${partner.tipo === 'Cliente'
                                                    ? 'bg-blue-50 text-blue-700 border-blue-100'
                                                    : 'bg-purple-50 text-purple-700 border-purple-100'
                                                    }`}>
                                                    {partner.tipo.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="p-4 font-mono text-gray-600">{partner.ruc}</td>
                                            <td className="p-4">
                                                <div className="flex flex-col gap-1">
                                                    {partner.telefono && (
                                                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                            <Phone size={12} /> {partner.telefono}
                                                        </div>
                                                    )}
                                                    {partner.email && (
                                                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                            <Mail size={12} /> {partner.email}
                                                        </div>
                                                    )}
                                                    {!partner.telefono && !partner.email && <span className="text-gray-400 italic">-</span>}
                                                </div>
                                            </td>
                                            <td className="p-4 text-gray-500 text-xs md:table-cell hidden max-w-xs truncate">
                                                {partner.direccion || '-'}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => handleEdit(partner)}
                                                        className="p-1.5 bg-white border rounded hover:border-blue-300 hover:text-blue-600 text-gray-400 shadow-sm transition-all"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(partner.id)}
                                                        className="p-1.5 bg-white border rounded hover:border-red-300 hover:text-red-600 text-gray-400 shadow-sm transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="p-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <Search size={40} className="text-gray-200" />
                                                <p>No se encontraron socios con ese criterio.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PartnersPage;
