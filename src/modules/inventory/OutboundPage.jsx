import React, { useState } from 'react';
import { ClipboardList, Send, AlertCircle, Box, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useInventory } from '../../hooks/useInventory';

const OutboundPage = () => {

    const { registrarMovimiento, products, almacenes } = useInventory();
    // const [formData, setFormData] = useState({ sku: '', cantidad: '', almacen: '' });

    // Simulación de stock actual para validación
    const [currentStock] = useState({
        'PROD-001': 450,
        'PROD-002': 12,
        'PROD-003': 0
    });

    const [formData, setFormData] = useState({
        sku: '',
        cantidad: '',
        destino: '',
        almacen: '',
    });

    const handleSalida = (e) => {
        e.preventDefault();

        // 1. Buscamos el producto específicamente en el almacén seleccionado
        // const productoEnAlmacen = products.find(
        //     p => p.sku === formData.sku && p.almacen === formData.almacen
        // );

        const productoEnAlmacen = products.find(p => p.sku === formData.sku && p.almacen === formData.almacen);

        // 2. Validaciones críticas antes de grabar
        if (!productoEnAlmacen) {
            toast.error(`El SKU ${formData.sku} no existe en el Almacén ${formData.almacen}`);
            return;
        }

        if (parseInt(formData.cantidad) > productoEnAlmacen.cantidad) {
            toast.error(`Stock insuficiente en ${formData.almacen}. Disponible: ${productoEnAlmacen.cantidad}`);
            return;
        }

        // 3. Procedimiento de grabación en LocalStorage (vía registrarMovimiento)
        registrarMovimiento(
            formData.sku,
            formData.cantidad,
            formData.almacen,
            'salida'
        );

        toast.success(`Despacho registrado: ${formData.cantidad} unidades retiradas de ${formData.almacen}`);

        // Limpiar formulario tras éxito
        setFormData({ sku: '', cantidad: '', almacen: '', destino: '' });
    };

    // e.preventDefault();
    // const skuEncontrado = currentStock[formData.sku];
    // const cantidadSolicitada = parseInt(formData.cantidad);

    // // Buscar el producto específico en el almacén seleccionado para validar stock
    // const productoActual = products.find(p => p.sku === formData.sku && p.almacen === formData.almacen);

    // if (!productoActual) {
    //     toast.error("El producto no existe en el almacén seleccionado");
    //     return;
    // }

    // if (parseInt(formData.cantidad) > productoActual.cantidad) {
    //     toast.error(`Stock insuficiente en ${formData.almacen}. Disponible: ${productoActual.cantidad}`);
    //     return;
    // }

    // // Si pasa la validación, grabamos
    // registrarMovimiento(formData.sku, formData.cantidad, formData.almacen, 'salida');
    // toast.success(`Despacho exitoso: -${formData.cantidad} unidades de ${formData.almacen}`);

    // // Si pasa las validaciones
    // const loading = toast.loading('Procesando despacho...');
    // setTimeout(() => {
    //     toast.dismiss(loading);
    //     toast.success(`Salida de ${cantidadSolicitada} unidades exitosa para ${formData.destino}`);
    // }, 1000);
    //};

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
                <ClipboardList className="text-red-600" size={28} />
                <h1 className="text-2xl font-bold text-gray-800">Orden de Salida (Picking)</h1>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100">
                <form onSubmit={handleSalida} className="space-y-5">

                    {/* SELECCIÓN DE ALMACÉN DE ORIGEN */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                            <Building2 size={16} /> Almacén de Origen
                        </label>
                        <select
                            className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none bg-white"
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
                            className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                            placeholder="Ej: PROD-001"
                            value={formData.sku}
                            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                            required
                        />
                    </div>

                    {/* CANTIDAD Y DESTINO */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Cantidad</label>
                            <input
                                type="number"
                                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                placeholder="0"
                                value={formData.cantidad}
                                onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Destino</label>
                            <input
                                type="text"
                                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                placeholder="Cliente / Sucursal"
                                value={formData.destino}
                                onChange={(e) => setFormData({ ...formData, destino: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-100"
                    >
                        <Send size={18} /> Confirmar Salida de Almacén
                    </button>
                </form>
            </div>
        </div>
    )
    //     <div className="max-w-2xl mx-auto space-y-6">
    //         <div className="flex items-center gap-3">
    //             <ClipboardList className="text-red-600" size={28} />
    //             <h1 className="text-2xl font-bold text-gray-800">Orden de Salida (Picking)</h1>
    //         </div>

    //         <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100">
    //             <form onSubmit={handleSalida} className="space-y-5">
    //                 <div>
    //                     <label className="block text-sm font-semibold text-gray-700 mb-1 italic">
    //                         * SKU a Despachar (Prueba con PROD-002)
    //                     </label>
    //                     <div className="relative">
    //                         <Box className="absolute left-3 top-3 text-gray-400" size={18} />
    //                         <input
    //                             type="text"
    //                             className="w-full pl-10 p-2.5 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
    //                             placeholder="Ej: PROD-002"
    //                             onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
    //                             required
    //                         />
    //                     </div>
    //                 </div>

    //                 <div>
    //                     <label className="block text-sm font-semibold text-gray-700 mb-1">Cantidad</label>
    //                     <input
    //                         type="number"
    //                         className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
    //                         placeholder="¿Cuántas unidades salen?"
    //                         onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
    //                         required
    //                     />
    //                 </div>

    //                 <div>
    //                     <label className="block text-sm font-semibold text-gray-700 mb-1">Cliente / Destino</label>
    //                     <input
    //                         type="text"
    //                         className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
    //                         placeholder="Nombre del cliente o sucursal"
    //                         onChange={(e) => setFormData({ ...formData, destino: e.target.value })}
    //                         required
    //                     />
    //                 </div>

    //                 <button
    //                     type="submit"
    //                     className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-100"
    //                 >
    //                     <Send size={18} /> Confirmar Despacho
    //                 </button>
    //             </form>
    //         </div>

    //         <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg flex gap-3">
    //             <AlertCircle className="text-blue-500 shrink-0" />
    //             <p className="text-sm text-blue-700">
    //                 <strong>Nota de ayuda:</strong> Si ingresas una cantidad mayor a 12 para el SKU <strong>PROD-002</strong>, el sistema bloqueará la operación para evitar stock negativo.
    //             </p>
    //         </div>
    //     </div>
    // );
};

export default OutboundPage;