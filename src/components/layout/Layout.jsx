import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

const Layout = ({ children }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <>
            <div className="flex h-screen bg-gray-50">
                <Sidebar isOpen={isOpen} />
                <div className="flex-1 flex flex-col overflow-hidden">

                    <header className="h-16 bg-white shadow-sm flex items-center px-6 justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setIsOpen(!isOpen)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <Menu size={24} className="text-gray-600" />
                            </button>
                            <h2 className="text-sm font-bold text-gray-400 uppercase">
                                Usuario: Admin Logística
                            </h2>
                        </div>
                    </header>
                    <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
                        {children}
                    </main>
                </div>
            </div>
        </>
    );
};

export default Layout;