import React, { useState } from 'react';
import { useLocations } from '../../context/LocationsContext';
import { MapPin, Plus, Edit, Trash2, X, Save, Building2, Package, AlertCircle, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const LocationsPage = () => {
    const { locations, addLocation, updateLocation, deleteLocation } = useLocations();
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [filterAlmacen, setFilterAlmacen] = useState('');
    const [filterZona, setFilterZona] = useState('');
    const [filterEstado, setFilterEstado] = useState('');

    const [formData, setFormData] = useState({
        almacen: '',
        codigo: '',
        tipo: 'Estantería',
        zona: 'Picking',
        capacidadMax: '',
        estado: 'Disponible',
        observaciones: ''
    });

    const almacenes = ['Central', 'Norte', 'Sur', 'Virtual'];
    const tipos = ['Estantería', 'Rack', 'Piso', 'Cámara'];
    const zonas = ['Picking', 'Reserva', 'Cuarentena'];
    const estados = ['Disponible', 'Bloqueada', 'Mantenimiento'];

    const resetForm = () => {
        setFormData({
            almacen: '',
            codigo: '',
            tipo: 'Estantería',
            zona: 'Picking',
            capacidadMax: '',
            estado: 'Disponible',
            observaciones: ''
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

    const handleEdit = (location) => {
        setFormData({
            almacen: location.almacen,
            codigo: location.codigo,
            tipo: location.tipo,
            zona: location.zona,
            capacidadMax: location.capacidadMax,
            estado: location.estado,
            observaciones: location.observaciones || ''
        });
        setEditId(location.id);
        setIsEditing(true);
        setIsCreating(true);
    };

    const handleDelete = (id) => {
        const location = locations.find(l => l.id === id);
        if (location.capacidadActual > 0) {
            toast.error('No se puede eliminar una ubicación con stock asignado');
            return;
        }
        if (window.confirm(`¿Eliminar ubicación ${location.codigo}?`)) {
            deleteLocation(id);
            toast.success('Ubicación eliminada');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.almacen || !formData.codigo || !formData.capacidadMax) {
            toast.error('Complete todos los campos obligatorios');
            return;
        }

        if (parseInt(formData.capacidadMax) <= 0) {
            toast.error('La capacidad debe ser mayor a 0');
            return;
        }

        // Validar código único por almacén
        const duplicado = locations.find(loc =>
            loc.codigo === formData.codigo &&
            loc.almacen === formData.almacen &&
            loc.id !== editId
        );

        if (duplicado) {
            toast.error(`El código ${formData.codigo} ya existe en ${formData.almacen}`);
            return;
        }

        try {
            if (isEditing) {
                updateLocation(editId, {
                    ...formData,
                    capacidadMax: parseInt(formData.capacidadMax)
                });
                toast.success('Ubicación actualizada');
            } else {
                addLocation({
                    ...formData,
                    capacidadMax: parseInt(formData.capacidadMax)
                });
                toast.success('Ubicación creada');
            }
            handleCancel();
        } catch (error) {
            toast.error('Error al guardar ubicación');
        }
    };

    const handleExportExcel = () => {
        const dataToExport = filteredLocations.map(loc => ({
            'Código': loc.codigo,
            'Almacén': loc.almacen,
            'Tipo': loc.tipo,
            'Zona': loc.zona,
            'Capacidad Máxima': loc.capacidadMax,
            'Capacidad Actual': loc.capacidadActual,
            'Ocupación %': Math.round((loc.capacidadActual / loc.capacidadMax) * 100),
            'Estado': loc.estado,
            'Observaciones': loc.observaciones || ''
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Ubicaciones');
        XLSX.writeFile(wb, `ubicaciones_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success('Exportado a Excel');
    };

    // Filtrado
    const filteredLocations = locations.filter(loc => {
        if (filterAlmacen && loc.almacen !== filterAlmacen) return false;
        if (filterZona && loc.zona !== filterZona) return false;
        if (filterEstado && loc.estado !== filterEstado) return false;
        return true;
    });

    const getOccupancyColor = (current, max) => {
        const percentage = (current / max) * 100;
        if (percentage >= 90) return 'bg-red-500';
        if (percentage >= 70) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <MapPin className="text-purple-600" size={28} />
                    <h1 className="text-2xl font-bold text-gray-800">Gestión de Ubicaciones</h1>
                </div>
                {!isCreating && (
                    <div className="flex gap-2">
                        <button
                            onClick={handleExportExcel}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-sm transition-all"
                        >
                            <Download size={18} /> Exportar Excel
                        </button>
                        <button
                            onClick={handleCreateNew}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-sm transition-all"
                        >
                            <Plus size={20} /> Nueva Ubicación
                        </button>
                    </div>
                )}
            </div>

            {isCreating ? (
                // FORMULARIO
                <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                    <div className="bg-purple-50 p-4 border-b flex justify-between items-center">
                        <h2 className="font-bold text-purple-800 flex items-center gap-2">
                            {isEditing ? <Edit size={18} /> : <Plus size={18} />}
                            {isEditing ? 'Editar Ubicación' : 'Nueva Ubicación'}
                        </h2>
                        <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <Building2 size={16} /> Almacén *
                            </label>
                            <select
                                className="w-full p-2.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-purple-500"
                                value={formData.almacen}
                                onChange={(e) => setFormData({ ...formData, almacen: e.target.value })}
                                required
                            >
                                <option value="">Seleccione almacén...</option>
                                {almacenes.map(a => (
                                    <option key={a} value={a}>{a}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <MapPin size={16} /> Código *
                            </label>
                            <input
                                type="text"
                                className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="Ej: A-01-05"
                                value={formData.codigo}
                                onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                                required
                            />
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs">
                                <p className="font-bold text-blue-800 mb-1">📋 Nomenclatura sugerida:</p>
                                <ul className="text-blue-700 space-y-1">
                                    <li><strong>Estanterías/Racks:</strong> [Pasillo]-[Rack]-[Nivel] → <code className="bg-blue-100 px-1 rounded">A-01-05</code></li>
                                    <li><strong>Piso:</strong> P-[Número] → <code className="bg-blue-100 px-1 rounded">P-01</code></li>
                                    <li><strong>Cámaras:</strong> C-[Número] → <code className="bg-blue-100 px-1 rounded">C-01</code></li>
                                    <li><strong>Cuarentena:</strong> Q-[Número] → <code className="bg-blue-100 px-1 rounded">Q-01</code></li>
                                </ul>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Tipo</label>
                            <select
                                className="w-full p-2.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-purple-500"
                                value={formData.tipo}
                                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                            >
                                {tipos.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Zona</label>
                            <select
                                className="w-full p-2.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-purple-500"
                                value={formData.zona}
                                onChange={(e) => setFormData({ ...formData, zona: e.target.value })}
                            >
                                {zonas.map(z => (
                                    <option key={z} value={z}>{z}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <Package size={16} /> Capacidad Máxima *
                            </label>
                            <input
                                type="number"
                                className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                                value={formData.capacidadMax}
                                onChange={(e) => setFormData({ ...formData, capacidadMax: e.target.value })}
                                required
                                min="1"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Estado</label>
                            <select
                                className="w-full p-2.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-purple-500"
                                value={formData.estado}
                                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                            >
                                {estados.map(e => (
                                    <option key={e} value={e}>{e}</option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-2 space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Observaciones</label>
                            <textarea
                                className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                                rows="2"
                                value={formData.observaciones}
                                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                            />
                        </div>

                        <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="px-6 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-2 rounded-lg flex items-center gap-2 font-bold transition-all shadow-lg"
                            >
                                <Save size={18} /> {isEditing ? 'Actualizar' : 'Guardar'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                // LISTADO
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Filtros */}
                    <div className="p-4 bg-gray-50 border-b flex gap-4">
                        <select
                            className="px-3 py-2 border rounded-lg bg-white text-sm"
                            value={filterAlmacen}
                            onChange={(e) => setFilterAlmacen(e.target.value)}
                        >
                            <option value="">Todos los almacenes</option>
                            {almacenes.map(a => (
                                <option key={a} value={a}>{a}</option>
                            ))}
                        </select>

                        <select
                            className="px-3 py-2 border rounded-lg bg-white text-sm"
                            value={filterZona}
                            onChange={(e) => setFilterZona(e.target.value)}
                        >
                            <option value="">Todas las zonas</option>
                            {zonas.map(z => (
                                <option key={z} value={z}>{z}</option>
                            ))}
                        </select>

                        <select
                            className="px-3 py-2 border rounded-lg bg-white text-sm"
                            value={filterEstado}
                            onChange={(e) => setFilterEstado(e.target.value)}
                        >
                            <option value="">Todos los estados</option>
                            {estados.map(e => (
                                <option key={e} value={e}>{e}</option>
                            ))}
                        </select>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600 font-bold border-b">
                                <tr>
                                    <th className="p-4">Código</th>
                                    <th className="p-4">Almacén</th>
                                    <th className="p-4">Tipo</th>
                                    <th className="p-4">Zona</th>
                                    <th className="p-4" title="La capacidad actual se calcula automáticamente desde el inventario">
                                        Ocupación
                                        <span className="text-xs text-gray-400 ml-1">(Auto)</span>
                                    </th>
                                    <th className="p-4">Estado</th>
                                    <th className="p-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredLocations.length > 0 ? (
                                    filteredLocations.map(loc => {
                                        const percentage = (loc.capacidadActual / loc.capacidadMax) * 100;
                                        return (
                                            <tr key={loc.id} className="hover:bg-gray-50">
                                                <td className="p-4 font-mono font-bold text-purple-700">{loc.codigo}</td>
                                                <td className="p-4 font-medium text-gray-700">{loc.almacen}</td>
                                                <td className="p-4 text-gray-600">{loc.tipo}</td>
                                                <td className="p-4">
                                                    <span className="px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-700">
                                                        {loc.zona}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between text-xs">
                                                            <span className="font-medium">{loc.capacidadActual} / {loc.capacidadMax}</span>
                                                            <span className="text-gray-500">{Math.round(percentage)}%</span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                                            <div
                                                                className={`h-2 rounded-full transition-all ${getOccupancyColor(loc.capacidadActual, loc.capacidadMax)}`}
                                                                style={{ width: `${Math.min(percentage, 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${loc.estado === 'Disponible' ? 'bg-green-100 text-green-700' :
                                                        loc.estado === 'Bloqueada' ? 'bg-red-100 text-red-700' :
                                                            'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                        {loc.estado}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex justify-center gap-2">
                                                        <button
                                                            onClick={() => handleEdit(loc)}
                                                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                                            title="Editar"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(loc.id)}
                                                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="p-8 text-center text-gray-400 italic">
                                            No hay ubicaciones registradas.
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

export default LocationsPage;
