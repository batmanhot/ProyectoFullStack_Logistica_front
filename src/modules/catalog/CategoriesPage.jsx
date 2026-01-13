import React, { useState } from 'react';
import { useCategories } from '../../hooks/useCategories';
import { Tag, Plus, Edit, Trash2, X, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const CategoriesPage = () => {
    const { categories, addCategory, updateCategory, deleteCategory } = useCategories();
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [formData, setFormData] = useState({ nombre: '', descripcion: '', estado: 'Activo' });

    const filteredCategories = categories.filter(c =>
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = (e) => {
        e.preventDefault();

        if (isEditing) {
            updateCategory(editId, formData);
            toast.success('Categoría actualizada');
            cancelEdit();
        } else {
            // Validar duplicados
            if (categories.some(c => c.nombre.toLowerCase() === formData.nombre.toLowerCase())) {
                toast.error('Ya existe una categoría con este nombre');
                return;
            }
            addCategory(formData);
            toast.success('Categoría creada');
            setFormData({ nombre: '', descripcion: '', estado: 'Activo' });
        }
    };

    const handleEdit = (category) => {
        setIsEditing(true);
        setEditId(category.id);
        setFormData({
            nombre: category.nombre,
            descripcion: category.descripcion,
            estado: category.estado
        });
    };

    const cancelEdit = () => {
        setIsEditing(false);
        setEditId(null);
        setFormData({ nombre: '', descripcion: '', estado: 'Activo' });
    };

    const handleDelete = (id) => {
        if (window.confirm('¿Eliminar esta categoría?')) {
            deleteCategory(id);
            toast.success('Categoría eliminada');
        }
    };

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold flex items-center gap-2"><Tag /> Gestión de Categorías</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Formulario */}
                <div className={`p-6 rounded-xl border shadow-sm h-fit transition-colors ${isEditing ? 'bg-orange-50 border-orange-200' : 'bg-white'}`}>
                    <h2 className={`font-bold mb-4 flex justify-between items-center ${isEditing ? 'text-orange-700' : 'text-gray-700'}`}>
                        {isEditing ? 'Editar Categoría' : 'Nueva Categoría'}
                        {isEditing && <button onClick={cancelEdit}><X size={18} /></button>}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Nombre</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded-md"
                                value={formData.nombre}
                                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Descripción</label>
                            <textarea
                                className="w-full p-2 border rounded-md"
                                rows="3"
                                value={formData.descripcion}
                                onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Estado</label>
                            <select
                                className="w-full p-2 border rounded-md bg-white"
                                value={formData.estado}
                                onChange={e => setFormData({ ...formData, estado: e.target.value })}
                            >
                                <option value="Activo">Activo</option>
                                <option value="Inactivo">Inactivo</option>
                            </select>
                        </div>

                        <button className={`w-full py-2 rounded-lg font-bold text-white flex justify-center items-center gap-2 ${isEditing ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                            {isEditing ? <Edit size={18} /> : <Plus size={18} />}
                            {isEditing ? 'Actualizar' : 'Guardar'}
                        </button>
                    </form>
                </div>

                {/* Lista */}
                <div className="md:col-span-2 space-y-4">
                    <div className="bg-white p-4 rounded-xl border text-sm flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar categoría..."
                                className="w-full pl-10 p-2 border rounded-lg"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600 font-bold border-b">
                                <tr>
                                    <th className="p-4">Nombre</th>
                                    <th className="p-4">Descripción</th>
                                    <th className="p-4">Estado</th>
                                    <th className="p-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredCategories.map(cat => (
                                    <tr key={cat.id} className={`hover:bg-gray-50 ${editId === cat.id ? 'bg-orange-50' : ''}`}>
                                        <td className="p-4 font-bold text-gray-800">{cat.nombre}</td>
                                        <td className="p-4 text-gray-600">{cat.descripcion}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${cat.estado === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {cat.estado}
                                            </span>
                                        </td>
                                        <td className="p-4 flex justifying-center gap-2">
                                            <button onClick={() => handleEdit(cat)} className="p-1 text-gray-400 hover:text-blue-600"><Edit size={16} /></button>
                                            <button onClick={() => handleDelete(cat.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredCategories.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="p-8 text-center text-gray-400">No se encontraron categorías</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CategoriesPage;
