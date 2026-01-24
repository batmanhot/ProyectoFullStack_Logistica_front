import React, { useState } from 'react';
import { useInventory } from '../../hooks/useInventory';
import { usePartners } from '../../hooks/usePartners';
import { useLocations } from '../../context/LocationsContext';
import { Save, Truck, Box, Building2, Clipboard, Plus, Edit, Trash2, X, FileText, Calendar, Hash, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

const InboundPage = () => {
    const { catalog, almacenes, registrarMovimiento, movements, updateMovement, deleteMovement } = useInventory();
    const { getSuppliers } = usePartners();
    const { getAvailableLocations } = useLocations();
    const suppliers = getSuppliers();

    // Estado para controlar la vista (Listado vs Formulario)
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);

    const [formData, setFormData] = useState({
        sku: '',
        cantidad: '',
        almacen: '',
        ubicacion: '',
        proveedor: '',
        observaciones: '',
        tipoEntrada: '',
        tipoDocumento: '',
        numeroDocumento: '',
        fechaDocumento: ''
    });

    const resetForm = () => {
        setFormData({
            sku: '',
            cantidad: '',
            almacen: '',
            ubicacion: '',
            proveedor: '',
            observaciones: '',
            tipoEntrada: '',
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
            ubicacion: movement.ubicacion || '',
            proveedor: movement.proveedor || '',
            observaciones: movement.observaciones || '',
            tipoEntrada: movement.tipoEntrada || '',
            tipoDocumento: movement.tipoDocumento || '',
            numeroDocumento: movement.numeroDocumento || '',
            fechaDocumento: movement.fechaDocumento || ''
        });
        setEditId(movement.id);
        setIsEditing(true);
        setIsCreating(true);
    };

    const handleDelete = (id) => {
        if (window.confirm("¿Está seguro de eliminar este registro de ingreso? Esto revertirá el stock.")) {
            deleteMovement(id);
            toast.success("Registro eliminado y stock revertido.");
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validaciones
        if (!formData.sku || !formData.almacen || !formData.cantidad) {
            toast.error("Complete campos obligatorios");
            return;
        }

        if (parseInt(formData.cantidad) <= 0) {
            toast.error("Cantidad debe ser mayor a 0");
            return;
        }

        try {
            const extraData = {
                tipoEntrada: formData.tipoEntrada,
                tipoDocumento: formData.tipoDocumento,
                numeroDocumento: formData.numeroDocumento,
                fechaDocumento: formData.fechaDocumento,
                ubicacion: formData.ubicacion
            };

            if (isEditing) {
                updateMovement(editId, {
                    ...formData,
                    cantidad: parseInt(formData.cantidad),
                    tipo: 'entrada',
                    fecha: new Date().toISOString(), // Opcional
                    ...extraData
                });
                toast.success("Movimiento actualizado correctamente");
            } else {
                registrarMovimiento(
                    formData.sku,
                    parseInt(formData.cantidad),
                    formData.almacen,
                    'entrada',
                    formData.proveedor,
                    formData.observaciones,
                    extraData
                );
                toast.success(`Ingreso registrado: +${formData.cantidad} unidades`);
            }
            handleCancel(); // Regresar al listado
        } catch (error) {
            console.error(error);
            toast.error("Error al procesar");
        }
    };

    // Filtrar solo entradas
    const inboundMovements = movements.filter(m => m.tipo === 'entrada');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Truck className="text-blue-600" size={28} />
                    <h1 className="text-2xl font-bold text-gray-800">Módulo de Entradas</h1>
                </div>
                {!isCreating && (
                    <button
                        onClick={handleCreateNew}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-sm transition-all"
                    >
                        <Plus size={20} /> Nueva Entrada
                    </button>
                )}
            </div>

            {isCreating ? (
                // --- VISTA FORMULARIO ---
                <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                        <h2 className="font-bold text-gray-700 flex items-center gap-2">
                            {isEditing ? <Edit size={18} /> : <Plus size={18} />}
                            {isEditing ? 'Editar Ingreso' : 'Registrar Nuevo Ingreso'}
                        </h2>
                        <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-8 max-w-5xl mx-auto">

                        {/* SECCIÓN 1: PRODUCTO Y DESTINO */}
                        <div className="bg-gray-200 p-6 rounded-xl border border-gray-300 space-y-4 shadow-sm">
                            <h3 className="text-sm font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2 mb-4">
                                <Box size={18} /> Producto y Destino
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Producto</label>
                                    <select
                                        className="w-full p-3 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
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

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Almacén Destino</label>
                                    <select
                                        className="w-full p-3 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                        value={formData.almacen}
                                        onChange={(e) => setFormData({ ...formData, almacen: e.target.value, ubicacion: '' })}
                                        required
                                    >
                                        <option value="">Seleccione almacén...</option>
                                        {almacenes.map(a => (
                                            <option key={a} value={a}>{a}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Ubicación</label>
                                    <select
                                        className="w-full p-3 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                        value={formData.ubicacion}
                                        onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                                        disabled={!formData.almacen}
                                    >
                                        <option value="">Sin ubicación específica</option>
                                        {formData.almacen && getAvailableLocations(formData.almacen).map(loc => (
                                            <option key={loc.id} value={loc.codigo}>
                                                {loc.codigo} - {loc.zona} ({loc.capacidadActual}/{loc.capacidadMax})
                                            </option>
                                        ))}
                                    </select>
                                    {formData.almacen && getAvailableLocations(formData.almacen).length === 0 && (
                                        <p className="text-xs text-orange-600 mt-1 italic">⚠️ Sin ubicaciones disponibles</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN 2: DOCUMENTACIÓN DEL INGRESO */}
                        <div className="bg-gray-200 p-6 rounded-xl border border-gray-300 space-y-4 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2 mb-4">
                                <FileText size={18} /> Documentación del Ingreso
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Tipo de Entrada</label>
                                    <select
                                        className="w-full p-3 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                        value={formData.tipoEntrada}
                                        onChange={(e) => setFormData({ ...formData, tipoEntrada: e.target.value })}
                                    >
                                        <option value="">Seleccione...</option>
                                        <option value="Compra Nacional">Compra Nacional</option>
                                        <option value="Importación">Importación</option>
                                        <option value="Devolución">Devolución</option>
                                        <option value="Transferencia">Transferencia</option>
                                        <option value="Ajuste de Inventario">Ajuste de Inventario</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Tipo de Documento</label>
                                    <select
                                        className="w-full p-3 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                        value={formData.tipoDocumento}
                                        onChange={(e) => setFormData({ ...formData, tipoDocumento: e.target.value })}
                                    >
                                        <option value="">Seleccione...</option>
                                        <option value="Factura">Factura</option>
                                        <option value="Guía de Remisión">Guía de Remisión</option>
                                        <option value="Boleta">Boleta</option>
                                        <option value="Orden de Compra">Orden de Compra</option>
                                        <option value="Nota de Crédito">Nota de Crédito</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Número Documento</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                                        placeholder="Ej: F001-4523"
                                        value={formData.numeroDocumento}
                                        onChange={(e) => setFormData({ ...formData, numeroDocumento: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Fecha Documento</label>
                                    <input
                                        type="date"
                                        className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                                        value={formData.fechaDocumento}
                                        onChange={(e) => setFormData({ ...formData, fechaDocumento: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN 3: DETALLES DE RECEPCIÓN */}
                        <div className="bg-gray-200 p-6 rounded-xl border border-gray-300 space-y-4 shadow-sm">
                            <h3 className="text-sm font-bold text-green-700 uppercase tracking-wider flex items-center gap-2 mb-4">
                                <Clipboard size={18} /> Detalles de Recepción
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Cantidad Recibida</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                                        placeholder="0"
                                        value={formData.cantidad}
                                        onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Proveedor</label>
                                    <select
                                        className="w-full p-3 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                        value={formData.proveedor}
                                        onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
                                    >
                                        <option value="">Seleccione proveedor...</option>
                                        {suppliers.map(p => (
                                            <option key={p.id} value={p.nombre}>
                                                {p.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Observaciones</label>
                                    <textarea
                                        className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                                        rows="2"
                                        placeholder="Información adicional sobre la recepción..."
                                        value={formData.observaciones}
                                        onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                                    ></textarea>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="order-2 sm:order-1 px-8 py-3 rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="order-1 sm:order-2 bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-lg flex items-center justify-center gap-2 font-bold transition-all shadow-lg shadow-blue-100"
                            >
                                <Save size={18} /> {isEditing ? 'Actualizar Ingreso' : 'Confirmar Ingreso'}
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
                                    <th className="p-4">SKU</th>
                                    <th className="p-4">Tipo</th>
                                    <th className="p-4">Documento</th>
                                    <th className="p-4">Almacén</th>
                                    <th className="p-4">Cant.</th>
                                    <th className="p-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {inboundMovements.length > 0 ? (
                                    inboundMovements.map(item => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="p-4 text-gray-500">
                                                {new Date(item.fecha).toLocaleDateString()}
                                                <div className="text-xs text-gray-400">{new Date(item.fecha).toLocaleTimeString()}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-blue-600">{item.sku}</div>
                                                <div className="text-xs text-gray-500">{item.proveedor}</div>
                                            </td>
                                            <td className="p-4 text-gray-600">
                                                {item.tipoEntrada || '-'}
                                            </td>
                                            <td className="p-4 text-gray-600">
                                                <div className="font-medium">{item.tipoDocumento || '-'}</div>
                                                <div className="text-xs text-gray-400">{item.numeroDocumento}</div>
                                            </td>
                                            <td className="p-4">{item.almacen}</td>
                                            <td className="p-4 font-mono font-bold text-green-700">+{item.cantidad}</td>
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
                                            No hay registros de entradas.
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

export default InboundPage;