import React, { useState } from 'react';
import { Save, Truck, Box, User, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

const InboundPage = () => {

    const [formData, setFormData] = useState({
        sku: '',
        cantidad: '',
        proveedor: '',
        observaciones: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        // Simulamos una carga
        const loadingToast = toast.loading('Registrando en sistema...');

        setTimeout(() => {
            toast.dismiss(loadingToast);
            toast.success(`Entrada de ${formData.sku} registrada correctamente`, {
                duration: 4000,
                icon: '✅',
            });
            // Limpiar formulario opcionalmente
        }, 1000);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-2">
                <Truck className="text-blue-600" size={28} />
                <h1 className="text-2xl font-bold text-gray-800">Recepción de Mercancía</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Campo SKU */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Box size={16} /> SKU del Producto
                        </label>
                        <input
                            type="text"
                            required
                            className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="Ej: PROD-123"
                            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        />
                    </div>

                    {/* Campo Cantidad */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Cantidad Recibida</label>
                        <input
                            type="number"
                            required
                            className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="0"
                            onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                        />
                    </div>

                    {/* Campo Proveedor */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <User size={16} /> Proveedor / Origen
                        </label>
                        <select
                            className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
                        >
                            <option value="">Seleccionar proveedor...</option>
                            <option value="prov1">Logística Norte S.A.</option>
                            <option value="prov2">Importaciones Global</option>
                        </select>
                    </div>

                    {/* Campo Almacén de Destino */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Building2 size={16} /> Almacén de Destino
                        </label>
                        <select
                            className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            required
                        >
                            <option value="">Seleccione almacén...</option>
                            <option value="Central">Almacén Central</option>
                            <option value="Norte">Almacén Norte</option>
                            <option value="Sur">Almacén Sur</option>
                        </select>
                    </div>

                    {/* Campo Precio (Bimonetario) */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Costo Unitario (Soles)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-gray-400 text-sm font-bold">S/</span>
                            <input
                                type="number"
                                step="0.01"
                                className="w-full pl-8 p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* Campo Observaciones */}
                    <div className="md:col-span-2 space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Observaciones</label>
                        <textarea
                            className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            rows="3"
                            placeholder="Detalles sobre el estado de la carga..."
                            onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                        ></textarea>
                    </div>
                </div>

                <div className="bg-gray-50 p-4 px-8 flex justify-end gap-3 border-t border-gray-100">
                    <button type="button" className="px-6 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
                        Cancelar
                    </button>
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg flex items-center gap-2 font-medium transition-all shadow-lg shadow-blue-200">
                        <Save size={18} /> Registrar Ingreso
                    </button>
                </div>
            </form>
        </div>
    );
};

export default InboundPage;