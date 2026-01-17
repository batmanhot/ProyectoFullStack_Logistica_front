import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Truck, ClipboardList, BarChart3, BookOpen, ArrowRightLeft, Users, Tag, CalendarClock, ChevronDown, ChevronRight, Layers, MapPin, Map } from 'lucide-react';

const Sidebar = ({ isOpen }) => {
    const location = useLocation();
    const [openSubmenu, setOpenSubmenu] = useState('maestros'); // Por defecto abierto para visibilidad

    const menuItems = [
        { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/' },
        { icon: <Package size={20} />, label: 'Inventario', path: '/inventario' },
        {
            icon: <Layers size={20} />,
            label: 'Maestros',
            id: 'maestros',
            subItems: [
                { icon: <Users size={18} />, label: 'Directorio (Todos)', path: '/directorio' },
                { icon: <BookOpen size={18} />, label: 'Artículos', path: '/catalogo' },
                { icon: <Tag size={18} />, label: 'Categorías', path: '/categorias' },
                { icon: <Users size={18} />, label: 'Clientes', path: '/clientes' },
                { icon: <Briefcase size={18} />, label: 'Proveedores', path: '/proveedores' },
                { icon: <Truck size={18} />, label: 'Transportistas', path: '/transportistas' },
                { icon: <MapPin size={18} />, label: 'Ubicaciones', path: '/ubicaciones' },
                { icon: <Map size={18} />, label: 'Mapa de Almacén', path: '/mapa-almacen' },
                { icon: <CalendarClock size={18} />, label: 'Lotes y Caducidad', path: '/lotes' },
            ]
        },
        { icon: <Truck size={20} />, label: 'Entradas', path: '/entradas' },
        { icon: <ClipboardList size={20} />, label: 'Salidas', path: '/salidas' },
        { icon: <ArrowRightLeft size={20} />, label: 'Transferencias', path: '/transferencias' },
        { icon: <BarChart3 size={20} />, label: 'Reportes', path: '/reportes' },
    ];

    const toggleSubmenu = (id) => {
        setOpenSubmenu(openSubmenu === id ? null : id);
    };

    return (
        <aside className={`${isOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-300 flex flex-col h-screen overflow-y-auto`}>
            <div className="p-4 border-b border-slate-700 font-bold text-xl text-blue-400 shrink-0">
                {isOpen ? 'ALMACENES-WEB' : 'AW'}
            </div>
            <nav className="flex-1 mt-4">
                {menuItems.map((item, index) => {
                    const hasSubItems = item.subItems && item.subItems.length > 0;
                    const isSubmenuOpen = openSubmenu === item.id;
                    const isActive = location.pathname === item.path;

                    if (hasSubItems) {
                        return (
                            <div key={index} className="flex flex-col">
                                <button
                                    onClick={() => toggleSubmenu(item.id)}
                                    className={`flex items-center justify-between p-4 cursor-pointer transition-colors hover:bg-slate-800 text-gray-400 w-full`}
                                >
                                    <div className="flex items-center">
                                        <span>{item.icon}</span>
                                        {isOpen && <span className="ml-4 text-sm font-medium">{item.label}</span>}
                                    </div>
                                    {isOpen && (isSubmenuOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
                                </button>

                                {isSubmenuOpen && (
                                    <div className={`${isOpen ? 'bg-slate-950/50 py-2' : 'flex flex-col items-center bg-slate-950/30 py-1'}`}>
                                        {item.subItems.map((subItem, subIndex) => (
                                            <Link
                                                key={subIndex}
                                                to={subItem.path}
                                                title={!isOpen ? subItem.label : ''}
                                                className={`flex items-center cursor-pointer transition-colors text-sm
                                                  ${isOpen ? 'pl-12 p-3' : 'p-3 justify-center w-full'}
                                                  ${location.pathname === subItem.path ? 'text-blue-400 font-bold' : 'text-gray-500 hover:text-gray-300'}`}
                                            >
                                                <span className={`${isOpen ? 'mr-3' : ''}`}>{subItem.icon}</span>
                                                {isOpen && subItem.label}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    }

                    return (
                        <Link
                            key={index}
                            to={item.path}
                            className={`flex items-center p-4 cursor-pointer transition-colors group
                ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-gray-400'}`}
                        >
                            <span>{item.icon}</span>
                            {isOpen && <span className="ml-4 text-sm font-medium">{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
};

// Icono faltante en los imports del sidebar original
const Briefcase = ({ size }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
);

export default Sidebar;