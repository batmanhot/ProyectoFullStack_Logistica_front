import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogIn, Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useAuth();

    const handleLogin = (e) => {
        e.preventDefault();
        if (login(username, password)) {
            toast.success('¡Bienvenido al Sistema Logístico!');
        } else {
            toast.error('Credenciales incorrectas (Prueba admin/1234)');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                <div className="bg-blue-600 p-8 text-center">
                    <h1 className="text-white text-3xl font-bold tracking-tight">LOGI-WEB</h1>
                    <p className="text-blue-100 mt-2 text-sm">Gestión de Operaciones y Almacén</p>
                </div>

                <form onSubmit={handleLogin} className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                            <User size={16} /> Usuario
                        </label>
                        <input
                            type="text"
                            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="admin"
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                            <Lock size={16} /> Contraseña
                        </label>
                        <input
                            type="password"
                            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="••••••••"
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2">
                        <LogIn size={20} /> Ingresar al Sistema
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;