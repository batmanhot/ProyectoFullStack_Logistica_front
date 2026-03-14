import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu, LogOut, ChevronDown } from 'lucide-react';
//import { useAuth } from '../../context/AuthContext.js';
import { useAuth } from '../../context/useAuth.js'; // Nuevo hook separado para evitar problemas con Fast Refresh de Vite


import toast from 'react-hot-toast';

const Layout = ({ children }) => {
    const [isOpen, setIsOpen] = useState(true);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const { user, logout, ROLE_PERMISSIONS } = useAuth();
    

    const roleInfo = ROLE_PERMISSIONS[user?.role] || {};

    const handleLogout = () => {
        logout();
        toast.success('Sesión cerrada correctamente.');
    };

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar isOpen={isOpen} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-16 bg-white shadow-sm flex items-center px-6 justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsOpen(!isOpen)} className="p-2 hover:bg-gray-100 rounded-lg">
                            <Menu size={24} className="text-gray-600" />
                        </button>
                    </div>

                    {/* User pill */}
                    <div className="relative">
                        <button
                            onClick={() => setShowUserMenu((v) => !v)}
                            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                                {user?.name?.charAt(0) ?? 'U'}
                            </div>
                            <div className="text-left hidden sm:block">
                                <p className="text-sm font-semibold text-gray-700 leading-none">{user?.name}</p>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${roleInfo.color}`}>
                                    {roleInfo.label}
                                </span>
                            </div>
                            <ChevronDown size={14} className="text-gray-400" />
                        </button>

                        {showUserMenu && (
                            <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                                <div className="px-4 py-3 border-b border-gray-100">
                                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    <LogOut size={16} /> Cerrar sesión
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                <main className="flex-1 overflow-x-hidden overflow-y-auto p-6" onClick={() => setShowUserMenu(false)}>
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;