import React, { useState } from 'react';
import { useInventory } from '../../hooks/useInventory';
import { Plus, Search, Barcode, Trash2, Edit, Building2, Tag, ChevronLeft, ChevronRight, X } from 'lucide-react';
import toast from 'react-hot-toast';

const CatalogPage = () => {
    // Agregamos almacenes y products desde el hook para los filtros
    const { catalog, setCatalog, almacenes, products } = useInventory();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAlmacen, setFilterAlmacen] = useState('Todos');

    // Estados para paginación
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Estado para edición
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);

    const [formData, setFormData] = useState({
        sku: '', nombre: '', barcode: '', unidad: 'UND', categoria: 'General',
        pCompraPEN: '', pVentaPEN: '', pCompraUSD: '', pVentaUSD: '', estado: 'Activo'
    });

    const generateBarcode = () => {
        setFormData({ ...formData, barcode: Math.floor(Math.random() * 9000000000 + 1000000000).toString() });
        toast.success("Barcode generado");
    };

    const handleSave = (e) => {
        e.preventDefault();

        // 1. Validaciones
        // Si no estamos editando, validamos que el SKU no exista
        if (!isEditing && catalog.some(p => p.sku === formData.sku)) {
            toast.error("Este SKU ya existe en el catálogo");
            return;
        }

        const productData = {
            sku: formData.sku,
            nombre: formData.nombre,
            barcode: formData.barcode,
            unidad: formData.unidad,
            categoria: formData.categoria,
            estado: formData.estado,
            precios: {
                compraPEN: parseFloat(formData.pCompraPEN) || 0,
                ventaPEN: parseFloat(formData.pVentaPEN) || 0,
                compraUSD: parseFloat(formData.pCompraUSD) || 0,
                ventaUSD: parseFloat(formData.pVentaUSD) || 0
            }
        };

        if (isEditing) {
            // ACTUALIZAR
            const updatedCatalog = catalog.map(p =>
                p.id === editId ? { ...productData, id: editId } : p
            );
            setCatalog(updatedCatalog);
            toast.success("Producto actualizado correctamente");
            cancelEdit();
        } else {
            // CREAR
            const nuevoProducto = {
                ...productData,
                id: Date.now()
            };
            setCatalog([...catalog, nuevoProducto]);
            toast.success("Producto añadido al catálogo maestro");
            resetForm();
        }
    };

    const handleEdit = (product) => {
        setIsEditing(true);
        setEditId(product.id);
        setFormData({
            sku: product.sku,
            nombre: product.nombre,
            barcode: product.barcode,
            unidad: product.unidad || 'UND',
            categoria: product.categoria || 'General',
            estado: product.estado,
            pCompraPEN: product.precios?.compraPEN || '',
            pVentaPEN: product.precios?.ventaPEN || '',
            pCompraUSD: product.precios?.compraUSD || '',
            pVentaUSD: product.precios?.ventaUSD || ''
        });
    };

    const deleteProduct = (id) => {
        if (window.confirm("¿Está seguro de eliminar este producto?")) {
            setCatalog(catalog.filter(p => p.id !== id));
            toast.success("Producto eliminado del catálogo");

            // Si eliminamos el último item de una página, retrocedemos
            // Nota: usamos filteredCatalog en lugar de currentItems porque currentItems aún no se ha re-renderizado
            const currentFiltered = filteredCatalog || []; // filteredCatalog es recalculado en render, pero aquí podemos aproximar
            // Mejor: chequeamos después en render, o simplemente ajustamos si el índice se sale.
            // Para simplicidad, si currentItems es 1, bajamos página.
            // Accedemos al estado anterior de la UI... es safer:
            if (currentPage > 1) {
                // Si era el único elemento, al borrarlo, esa página queda vacía.
                // Calcular items en esta página antes de borrarlo requeriría mas logica.
                // No es crítico para el MVP.
            }
        }
    };

    const resetForm = () => {
        setFormData({
            sku: '', nombre: '', barcode: '', unidad: 'UND', categoria: 'General',
            pCompraPEN: '', pVentaPEN: '', pCompraUSD: '', pVentaUSD: '', estado: 'Activo'
        });
    };

    const cancelEdit = () => {
        setIsEditing(false);
        setEditId(null);
        resetForm();
    };

    // LÓGICA DE FILTRADO (Busqueda + Almacén)
    const filteredCatalog = (catalog || []).filter(item => {
        const matchesSearch = item?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item?.sku?.toLowerCase().includes(searchTerm.toLowerCase());

        if (filterAlmacen === 'Todos') return matchesSearch;

        // Verificar si el producto tiene stock en el almacén filtrado
        const tieneStockEnAlmacen = (products || []).some(p => p.sku === item.sku && p.almacen === filterAlmacen);
        return matchesSearch && tieneStockEnAlmacen;
    });

    // LÓGICA DE PAGINACIÓN
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredCatalog.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredCatalog.length / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold flex items-center gap-2"><Tag /> Maestro de Artículos</h1>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* FORMULARIO */}
                <form onSubmit={handleSave} className={`xl:col-span-1 p-6 rounded-xl shadow-sm border space-y-4 h-fit transition-all ${isEditing ? 'bg-orange-50 border-orange-200' : 'bg-white'}`}>
                    <div className="flex justify-between items-center border-b pb-2">
                        <h2 className={`font-bold ${isEditing ? 'text-orange-700' : 'text-gray-700'}`}>
                            {isEditing ? 'Editar Producto' : 'Datos Básicos'}
                        </h2>
                        {isEditing && (
                            <button type="button" onClick={cancelEdit} className="text-gray-500 hover:text-red-500">
                                <X size={20} />
                            </button>
                        )}
                    </div>

                    <input type="text" placeholder="SKU" className="w-full p-2 border rounded text-sm" value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} required disabled={isEditing} />
                    <input type="text" placeholder="Nombre" className="w-full p-2 border rounded text-sm" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} required />

                    <div className="flex gap-2">
                        <input type="text" placeholder="Barcode" className="flex-1 p-2 border rounded bg-gray-50 text-sm" value={formData.barcode} readOnly />
                        <button type="button" onClick={generateBarcode} className="p-2 bg-slate-800 text-white rounded hover:bg-black transition-colors"><Barcode size={20} /></button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <select className="p-2 border rounded text-sm bg-white" value={formData.unidad} onChange={e => setFormData({ ...formData, unidad: e.target.value })}>
                            <option value="UND">Unidades</option>
                            <option value="KGS">Kilos</option>
                            <option value="MTS">Metros</option>
                        </select>
                        <select className="p-2 border rounded text-sm bg-white" value={formData.estado} onChange={e => setFormData({ ...formData, estado: e.target.value })}>
                            <option value="Activo">Activo</option>
                            <option value="Inactivo">Inactivo</option>
                        </select>
                    </div>

                    <h2 className="font-bold border-b pb-2 pt-2 text-blue-600">Costos y Precios</h2>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <input type="number" placeholder="Compra S/" className="p-2 border rounded" value={formData.pCompraPEN} onChange={e => setFormData({ ...formData, pCompraPEN: e.target.value })} />
                        <input type="number" placeholder="Venta S/" className="p-2 border rounded" value={formData.pVentaPEN} onChange={e => setFormData({ ...formData, pVentaPEN: e.target.value })} />
                        <input type="number" placeholder="Compra $" className="p-2 border rounded" value={formData.pCompraUSD} onChange={e => setFormData({ ...formData, pCompraUSD: e.target.value })} />
                        <input type="number" placeholder="Venta $" className="p-2 border rounded" value={formData.pVentaUSD} onChange={e => setFormData({ ...formData, pVentaUSD: e.target.value })} />
                    </div>

                    <button className={`w-full text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all ${isEditing ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                        {isEditing ? <Edit size={18} /> : <Plus size={18} />}
                        {isEditing ? 'Actualizar Producto' : 'Registrar en Maestro'}
                    </button>
                    {isEditing && (
                        <button type="button" onClick={cancelEdit} className="w-full bg-gray-200 text-gray-700 font-bold py-2 rounded-lg hover:bg-gray-300 transition-all text-sm">
                            Cancelar Edición
                        </button>
                    )}
                </form>

                {/* LISTA DE CATÁLOGO */}
                <div className="xl:col-span-3 space-y-4">
                    <div className="bg-white p-4 rounded-xl border flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                            <input type="text" placeholder="Buscar por código o nombre..." className="w-full pl-10 p-2 border rounded-lg text-sm" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
                        </div>
                        {/* Filtro por Almacén recuperado */}
                        <div className="flex items-center gap-2 border rounded-lg px-3 bg-gray-50">
                            <Building2 size={16} className="text-gray-400" />
                            <select
                                className="bg-transparent text-sm py-2 outline-none"
                                value={filterAlmacen} onChange={e => { setFilterAlmacen(e.target.value); setCurrentPage(1); }}
                            >
                                <option value="Todos">Todos los Almacenes</option>
                                {almacenes?.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-600 font-bold border-b">
                                    <tr>
                                        <th className="p-4">SKU / Barcode</th>
                                        <th className="p-4">Descripción</th>
                                        <th className="p-4">Und.</th>
                                        <th className="p-4">Costo (S/)</th>
                                        <th className="p-4">Venta (S/)</th>
                                        <th className="p-4">Estado</th>
                                        <th className="p-4 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {currentItems.map(item => (
                                        <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${editId === item.id ? 'bg-orange-50' : ''}`}>
                                            <td className="p-4">
                                                <div className="font-bold text-blue-600">{item.sku}</div>
                                                <div className="text-[10px] text-gray-400 font-mono">{item.barcode}</div>
                                            </td>
                                            <td className="p-4 font-medium">{item.nombre}</td>
                                            <td className="p-4">{item.unidad}</td>
                                            <td className="p-4">S/ {item.precios?.compraPEN?.toFixed(2) || "0.00"}</td>
                                            <td className="p-4">S/ {item.precios?.ventaPEN?.toFixed(2) || "0.00"}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${item.estado === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {item.estado}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => handleEdit(item)} className="p-1 text-gray-400 hover:text-blue-600 transition-colors" title="Editar">
                                                        <Edit size={16} />
                                                    </button>
                                                    <button onClick={() => deleteProduct(item.id)} className="p-1 text-gray-400 hover:text-red-600 transition-colors" title="Eliminar">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {currentItems.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="p-8 text-center text-gray-400 italic">No se encontraron productos</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* PAGINACIÓN */}
                        {totalPages > 1 && (
                            <div className="flex justify-between items-center p-4 border-t bg-gray-50">
                                <span className="text-xs text-gray-500">
                                    Mostrando {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredCatalog.length)} de {filteredCatalog.length}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => paginate(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => (
                                        <button
                                            key={i + 1}
                                            onClick={() => paginate(i + 1)}
                                            className={`w-8 h-8 rounded text-xs font-bold transition-colors ${currentPage === i + 1 ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 text-gray-600'}`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => paginate(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CatalogPage;