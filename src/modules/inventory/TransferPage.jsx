import React, { useState } from 'react';
import { useInventory } from '../../hooks/useInventory';
import { Save, ArrowRightLeft, Box, Building2, Clipboard, Plus, Edit, Trash2, X, FileText, Calendar, Hash, Globe, Truck } from 'lucide-react';
import toast from 'react-hot-toast';

const TransferPage = () => {
    const { catalog, almacenes, registrarTransferencia, movements, updateMovement, deleteMovement } = useInventory();

    // Estado para controlar la vista (Listado vs Formulario)
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);

    const [formData, setFormData] = useState({
        sku: '',
        cantidad: '',
        almacenOrigen: '',
        almacenDestino: '',
        destinoExterno: '',
        tipoTransferencia: 'Local', // Local | Externa
        observaciones: '',
        numeroGuia: '',
        transportista: ''
    });

    const resetForm = () => {
        setFormData({
            sku: '',
            cantidad: '',
            almacenOrigen: '',
            almacenDestino: '',
            destinoExterno: '',
            tipoTransferencia: 'Local',
            observaciones: '',
            numeroGuia: '',
            transportista: ''
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

    const handleEdit = (movement) => {
        setFormData({
            sku: movement.sku,
            cantidad: movement.cantidad,
            almacenOrigen: movement.almacen, // Mapped back
            almacenDestino: movement.almacenDestino || '',
            destinoExterno: movement.destinoExterno || '',
            tipoTransferencia: movement.subtipo || 'Local',
            observaciones: movement.observaciones || '',
            numeroGuia: movement.numeroGuia || '',
            transportista: movement.transportista || ''
        });
        setEditId(movement.id);
        setIsEditing(true);
        setIsCreating(true);
    };

    const handleDelete = (id) => {
        if (window.confirm("¿Está seguro de eliminar esta transferencia? Esto revertirá el stock en los almacenes afectados.")) {
            deleteMovement(id);
            toast.success("Transferencia eliminada y stock revertido.");
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validaciones Clave
        if (!formData.sku || !formData.almacenOrigen || !formData.cantidad) {
            toast.error("Complete campos obligatorios (Producto, Origen, Cantidad)");
            return;
        }

        if (parseInt(formData.cantidad) <= 0) {
            toast.error("Cantidad debe ser mayor a 0");
            return;
        }

        if (formData.tipoTransferencia === 'Local') {
            if (!formData.almacenDestino) {
                toast.error("Seleccione Almacén Destino");
                return;
            }
            if (formData.almacenOrigen === formData.almacenDestino) {
                toast.error("Origen y Destino no pueden ser el mismo");
                return;
            }
        } else {
            if (!formData.destinoExterno) {
                toast.error("Ingrese el Destino Externo / Cliente");
                return;
            }
        }

        try {
            const extraData = {
                numeroGuia: formData.numeroGuia,
                transportista: formData.transportista,
                destinoExterno: formData.destinoExterno
            };

            const isLocal = formData.tipoTransferencia === 'Local';

            if (isEditing) {
                updateMovement(editId, {
                    ...formData,
                    cantidad: parseInt(formData.cantidad),
                    tipo: 'transferencia',
                    subtipo: formData.tipoTransferencia,
                    almacen: formData.almacenOrigen, // Map to standard field
                    almacenDestino: isLocal ? formData.almacenDestino : null,
                    ...extraData
                });
                toast.success("Transferencia actualizada correctamente");
            } else {
                registrarTransferencia(
                    formData.sku,
                    parseInt(formData.cantidad),
                    formData.almacenOrigen,
                    isLocal ? formData.almacenDestino : null,
                    isLocal,
                    formData.observaciones,
                    extraData
                );
                toast.success(`Transferencia registrada: ${formData.cantidad} unidades`);
            }
            handleCancel();
        } catch (error) {
            console.error(error);
            toast.error("Error al procesar transferencia");
        }
    };

    // Filtrar solo transferencias
    const transferMovements = movements.filter(m => m.tipo === 'transferencia');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <ArrowRightLeft className="text-orange-600" size={28} />
                    <h1 className="text-2xl font-bold text-gray-800">Transferencias de Almacén</h1>
                </div>
                {!isCreating && (
                    <button
                        onClick={handleCreateNew}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-sm transition-all"
                    >
                        <Plus size={20} /> Nueva Transferencia
                    </button>
                )}
            </div>

            {isCreating ? (
                // --- VISTA FORMULARIO ---
                <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-orange-50 p-4 border-b flex justify-between items-center">
                        <h2 className="font-bold text-orange-800 flex items-center gap-2">
                            {isEditing ? <Edit size={18} /> : <Plus size={18} />}
                            {isEditing ? 'Editar Transferencia' : 'Nueva Transferencia'}
                        </h2>
                        <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* TIPO DE TRANSFERENCIA - RADIO BUTTONS */}
                        <div className="md:col-span-2 flex gap-6 pb-4 border-b border-gray-100">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="tipoTransferencia"
                                    value="Local"
                                    checked={formData.tipoTransferencia === 'Local'}
                                    onChange={() => setFormData({ ...formData, tipoTransferencia: 'Local' })}
                                    className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                                />
                                <span className="font-bold text-gray-700 flex items-center gap-1"><Building2 size={16} /> Interna / Local</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="tipoTransferencia"
                                    value="Externa"
                                    checked={formData.tipoTransferencia === 'Externa'}
                                    onChange={() => setFormData({ ...formData, tipoTransferencia: 'Externa' })}
                                    className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                                />
                                <span className="font-bold text-gray-700 flex items-center gap-1"><Globe size={16} /> Externa</span>
                            </label>
                        </div>

                        {/* PRODUCTO */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <Box size={16} /> Producto
                            </label>
                            <select
                                className="w-full p-2.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.sku}
                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                required
                            >
                                <option value="">Seleccione producto...</option>
                                {catalog.map(item => (
                                    <option key={item.id} value={item.sku}>
                                        {item.sku} - {item.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* CANTIDAD */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Cantidad Transferida</label>
                            <input
                                type="number"
                                className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.cantidad}
                                onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                                required
                                min="1"
                            />
                        </div>

                        {/* ORIGEN */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <Building2 size={16} /> Almacén Origen
                            </label>
                            <select
                                className="w-full p-2.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.almacenOrigen}
                                onChange={(e) => setFormData({ ...formData, almacenOrigen: e.target.value })}
                                required
                            >
                                <option value="">Seleccione origen...</option>
                                {almacenes.map(a => (
                                    <option key={a} value={a}>{a}</option>
                                ))}
                            </select>
                        </div>

                        {/* DESTINO */}
                        {formData.tipoTransferencia === 'Local' ? (
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <Building2 size={16} /> Almacén Destino
                                </label>
                                <select
                                    className="w-full p-2.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.almacenDestino}
                                    onChange={(e) => setFormData({ ...formData, almacenDestino: e.target.value })}
                                    required
                                >
                                    <option value="">Seleccione destino...</option>
                                    {almacenes.filter(a => a !== formData.almacenOrigen).map(a => (
                                        <option key={a} value={a}>{a}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <Globe size={16} /> Destino Externo / Cliente
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ej: Almacén Cliente SAC"
                                    value={formData.destinoExterno}
                                    onChange={(e) => setFormData({ ...formData, destinoExterno: e.target.value })}
                                    required
                                />
                            </div>
                        )}

                        {/* EXTRA DATA */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <Hash size={16} /> Guía de Remisión
                            </label>
                            <input
                                type="text"
                                className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ej: T001-2342"
                                value={formData.numeroGuia}
                                onChange={(e) => setFormData({ ...formData, numeroGuia: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <Truck size={16} /> Transportista
                            </label>
                            <input
                                type="text"
                                className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.transportista}
                                onChange={(e) => setFormData({ ...formData, transportista: e.target.value })}
                            />
                        </div>

                        <div className="md:col-span-2 space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Observaciones</label>
                            <textarea
                                className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                rows="2"
                                value={formData.observaciones}
                                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                            ></textarea>
                        </div>

                        <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t mt-2">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="px-6 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-2 rounded-lg flex items-center gap-2 font-bold transition-all shadow-lg"
                            >
                                <Save size={18} /> {isEditing ? 'Actualizar Op.' : 'Procesar Transferencia'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                // --- VISTA LISTADO (DATALIST) ---
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600 font-bold border-b">
                                <tr>
                                    <th className="p-4">Fecha</th>
                                    <th className="p-4">Tipo</th>
                                    <th className="p-4">SKU / Producto</th>
                                    <th className="p-4">Origen</th>
                                    <th className="p-4 text-center"><ArrowRightLeft size={16} /></th>
                                    <th className="p-4">Destino</th>
                                    <th className="p-4 text-center">Cant.</th>
                                    <th className="p-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {transferMovements.length > 0 ? (
                                    transferMovements.map(item => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="p-4 text-gray-500">
                                                {new Date(item.fecha).toLocaleDateString()}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold border ${item.subtipo === 'Externa' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                                                    {item.subtipo}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-gray-800">{item.sku}</div>
                                                <div className="text-xs text-gray-400">{item.numeroGuia}</div>
                                            </td>
                                            <td className="p-4 font-medium text-gray-700">
                                                {item.almacen}
                                            </td>
                                            <td className="p-4 text-center text-gray-400">
                                                →
                                            </td>
                                            <td className="p-4 font-medium text-gray-700">
                                                {item.subtipo === 'Local' ? item.almacenDestino : item.destinoExterno}
                                            </td>
                                            <td className="p-4 text-center font-mono font-bold text-orange-600">
                                                {item.cantidad}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => handleEdit(item)} className="p-1 text-gray-400 hover:text-blue-600 transition-colors" title="Editar">
                                                        <Edit size={16} />
                                                    </button>
                                                    <button onClick={() => handleDelete(item.id)} className="p-1 text-gray-400 hover:text-red-600 transition-colors" title="Eliminar">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="p-8 text-center text-gray-400 italic">
                                            No hay transferencias registradas.
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

export default TransferPage;
