import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Truck, ClipboardList, BarChart3, BookOpen, ArrowRightLeft, Users, Tag, CalendarClock } from 'lucide-react';

const Sidebar = ({ isOpen }) => {
    const location = useLocation(); // Para saber qué ruta está activa
    const menuItems = [
        { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/' },
        { icon: <Package size={20} />, label: 'Inventario', path: '/inventario' },
        { icon: <BookOpen size={20} />, label: 'Catálogo Maestro', path: '/catalogo' },
        { icon: <Tag size={20} />, label: 'Categorías', path: '/categorias' },
        { icon: <CalendarClock size={20} />, label: 'Lotes y Caducidad', path: '/lotes' },
        { icon: <Users size={20} />, label: 'Directorio', path: '/directorio' },
        { icon: <Truck size={20} />, label: 'Entradas', path: '/entradas' },
        { icon: <ClipboardList size={20} />, label: 'Salidas', path: '/salidas' },
        { icon: <ArrowRightLeft size={20} />, label: 'Transferencias', path: '/transferencias' },
        { icon: <BarChart3 size={20} />, label: 'Reportes', path: '/reportes' },
    ];

    return (
        <aside className={`${isOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-300 flex flex-col h-screen`}>
            <div className="p-4 border-b border-slate-700 font-bold text-xl text-blue-400">
                {isOpen ? 'LOGI-WEB' : 'LW'}
            </div>
            <nav className="flex-1 mt-4">
                {menuItems.map((item, index) => (
                    <Link
                        key={index}
                        to={item.path}
                        className={`flex items-center p-4 cursor-pointer transition-colors group
              ${location.pathname === item.path ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-gray-400'}`}
                    >
                        <span>{item.icon}</span>
                        {isOpen && <span className="ml-4 text-sm font-medium">{item.label}</span>}
                    </Link>
                ))}
            </nav>
        </aside>
    );
};

export default Sidebar;