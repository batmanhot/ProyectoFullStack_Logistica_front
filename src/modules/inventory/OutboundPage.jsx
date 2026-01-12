import React, { useState } from 'react';
import { ClipboardList, Send, Box, Building2, Plus, Edit, Trash2, X, ArrowLeft, User, FileText, Calendar, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import { useInventory } from '../../hooks/useInventory';

const OutboundPage = () => {

    const { registrarMovimiento, updateMovement, deleteMovement, products, almacenes, movements } = useInventory();

    // Estado para controlar la vista (Listado vs Formulario)
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);

    const [formData, setFormData] = useState({
        sku: '',
        cantidad: '',
        almacen: '',
        destino: '',
        tipoSalida: '',
        tipoDocumento: '',
        numeroDocumento: '',
        fechaDocumento: ''
    });

    const resetForm = () => {
        setFormData({
            sku: '',
            cantidad: '',
            almacen: '',
            destino: '',
            tipoSalida: '',
            tipoDocumento: '',
            numeroDocumento: '',
            fechaDocumento: ''
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
            almacen: movement.almacen,
            destino: movement.destino || '',
            tipoSalida: movement.tipoSalida || '',
            tipoDocumento: movement.tipoDocumento || '',
            numeroDocumento: movement.numeroDocumento || '',
            fechaDocumento: movement.fechaDocumento || ''
        });
        setEditId(movement.id);
        setIsEditing(true);
        setIsCreating(true);
    };

    const handleDelete = (id) => {
        if (window.confirm("¿Está seguro de eliminar esta salida? El stock será devuelto al almacén.")) {
            deleteMovement(id);
            toast.success("Salida eliminada y stock restaurado.");
        }
    };

    const handleSalida = (e) => {
        e.preventDefault();

        // 1. Buscamos el producto en el almacén seleccionado
        const productoEnAlmacen = products.find(p => p.sku === formData.sku && p.almacen === formData.almacen);

        // 2. Validaciones
        if (!productoEnAlmacen && !isEditing) {
            toast.error(`El SKU ${formData.sku} no tiene registro en ${formData.almacen}`);
            return;
        }

        const cantidadSolicitada = parseInt(formData.cantidad);
        if (isNaN(cantidadSolicitada) || cantidadSolicitada <= 0) {
            toast.error("La cantidad debe ser mayor a 0");
            return;
        }

        // Calculamos stock disponible considerando si estamos editando
        let stockDisponible = productoEnAlmacen ? productoEnAlmacen.cantidad : 0;

        if (isEditing) {
            const movimientoOriginal = movements.find(m => m.id === editId);
            if (movimientoOriginal && movimientoOriginal.almacen === formData.almacen && movimientoOriginal.sku === formData.sku) {
                stockDisponible += movimientoOriginal.cantidad;
            }
        }

        if (cantidadSolicitada > stockDisponible) {
            toast.error(`Stock insuficiente en ${formData.almacen}. Disponible: ${stockDisponible}`);
            return;
        }

        // 3. Grabación
        try {
            const extraData = {
                destino: formData.destino,
                tipoSalida: formData.tipoSalida,
                tipoDocumento: formData.tipoDocumento,
                numeroDocumento: formData.numeroDocumento,
                fechaDocumento: formData.fechaDocumento
            };

            if (isEditing) {
                updateMovement(editId, {
                    sku: formData.sku,
                    cantidad: cantidadSolicitada,
                    almacen: formData.almacen,
                    tipo: 'salida',
                    fecha: new Date().toISOString(), // Actualizar fecha
                    ...extraData
                });
                toast.success("Salida actualizada correctamente");
            } else {
                registrarMovimiento(
                    formData.sku,
                    cantidadSolicitada,
                    formData.almacen,
                    'salida',
                    '', // proveedor (vacío para salida)
                    '', // observaciones
                    extraData
                );
                toast.success(`Despacho registrado: -${cantidadSolicitada} unidades`);
            }
            handleCancel();
        } catch (error) {
            console.error(error);
            toast.error("Error al procesar la salida");
        }
    };

    // Filtrar solo salidas
    const outboundMovements = movements.filter(m => m.tipo === 'salida');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <ClipboardList className="text-red-600" size={28} />
                    <h1 className="text-2xl font-bold text-gray-800">Orden de Salida (Picking)</h1>
                </div>
                {!isCreating && (
                    <button
                        onClick={handleCreateNew}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-sm transition-all"
                    >
                        <Plus size={20} /> Nueva Salida
                    </button>
                )}
            </div>

            {isCreating ? (
                // --- VISTA FORMULARIO ---
                <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex justify-between items-center mb-6 border-b pb-4">
                        <h2 className="font-bold text-gray-700 flex items-center gap-2 text-lg">
                            {isEditing ? <Edit size={20} /> : <Send size={20} />}
                            {isEditing ? 'Editar Orden de Salida' : 'Registrar Nueva Salida'}
                        </h2>
                        <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSalida} className="space-y-6 max-w-3xl mx-auto">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* SELECCIÓN DE ALMACÉN DE ORIGEN */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                                    <Building2 size={16} /> Almacén de Origen
                                </label>
                                <select
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none bg-white"
                                    value={formData.almacen}
                                    onChange={(e) => setFormData({ ...formData, almacen: e.target.value })}
                                    required
                                >
                                    <option value="">Seleccione el almacén...</option>
                                    {almacenes.map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                            </div>

                            {/* SKU DEL PRODUCTO */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                                    <Box size={16} /> SKU del Producto
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                    placeholder="Ej: PROD-001"
                                    value={formData.sku}
                                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        {/* NUEVOS CAMPOS: TIPOS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                                    <FileText size={16} /> Tipo de Salida
                                </label>
                                <select
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none bg-white"
                                    value={formData.tipoSalida}
                                    onChange={(e) => setFormData({ ...formData, tipoSalida: e.target.value })}
                                >
                                    <option value="">Seleccione tipo...</option>
                                    <option value="Venta">Venta</option>
                                    <option value="Transferencia">Transferencia</option>
                                    <option value="Merma">Merma</option>
                                    <option value="Devolución a Proveedor">Devolución a Proveedor</option>
                                    <option value="Uso Interno">Uso Interno</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                                    <FileText size={16} /> Tipo de Documento
                                </label>
                                <select
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none bg-white"
                                    value={formData.tipoDocumento}
                                    onChange={(e) => setFormData({ ...formData, tipoDocumento: e.target.value })}
                                >
                                    <option value="">Seleccione documento...</option>
                                    <option value="Guía de Remisión">Guía de Remisión</option>
                                    <option value="Factura">Factura</option>
                                    <option value="Boleta">Boleta</option>
                                    <option value="Nota de Salida">Nota de Salida</option>
                                    <option value="Ticket">Ticket</option>
                                </select>
                            </div>
                        </div>

                        {/* DOCUMENTO INFO */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                                    <Hash size={16} /> Número Documento
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                    placeholder="Ej: 001-00432"
                                    value={formData.numeroDocumento}
                                    onChange={(e) => setFormData({ ...formData, numeroDocumento: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                                    <Calendar size={16} /> Fecha Documento
                                </label>
                                <input
                                    type="date"
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                    value={formData.fechaDocumento}
                                    onChange={(e) => setFormData({ ...formData, fechaDocumento: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* CANTIDAD Y DESTINO */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Cantidad</label>
                                <input
                                    type="number"
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                    placeholder="0"
                                    value={formData.cantidad}
                                    onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                                    <User size={16} /> Cliente / Destino
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                    placeholder="Cliente / Sucursal"
                                    value={formData.destino}
                                    onChange={(e) => setFormData({ ...formData, destino: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="px-6 py-3 rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg flex items-center gap-2 font-bold transition-all shadow-lg shadow-red-100"
                            >
                                <Send size={18} /> {isEditing ? 'Actualizar Salida' : 'Confirmar Salida'}
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
                                    <th className="p-4">SKU / Destino</th>
                                    <th className="p-4">Tipo Salida</th>
                                    <th className="p-4">Documento</th>
                                    <th className="p-4">Almacén</th>
                                    <th className="p-4">Cant.</th>
                                    <th className="p-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {outboundMovements.length > 0 ? (
                                    outboundMovements.map(item => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="p-4 text-gray-500">
                                                {new Date(item.fecha).toLocaleDateString()}
                                                <div className="text-xs text-gray-400">{new Date(item.fecha).toLocaleTimeString()}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-blue-600">{item.sku}</div>
                                                <div className="text-xs text-gray-500 italic">{item.destino}</div>
                                            </td>
                                            <td className="p-4 text-gray-600">{item.tipoSalida || '-'}</td>
                                            <td className="p-4 text-gray-600">
                                                <div className="font-medium">{item.tipoDocumento || '-'}</div>
                                                <div className="text-xs text-gray-400">{item.numeroDocumento}</div>
                                            </td>
                                            <td className="p-4">{item.almacen}</td>
                                            <td className="p-4 font-mono font-bold text-red-600">-{item.cantidad}</td>
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
                                        <td colSpan="7" className="p-8 text-center text-gray-400 italic">
                                            No hay registros de salidas.
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

export default OutboundPage;