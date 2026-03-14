import React, { useState } from 'react';
//import { useAuth } from '../../context/AuthContext';
import { useAuth } from '../../context/useAuth.js'; // Nuevo hook separado para evitar problemas con Fast Refresh de Vite
import { LogIn, Lock, User, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

// Credenciales de demo visibles en pantalla para facilitar pruebas
const DEMO_USERS = [
    { username: 'admin',      password: 'Admin2024!',  role: 'Administrador', color: 'bg-red-50 border-red-200 text-red-700' },
    { username: 'supervisor', password: 'Super2024!',  role: 'Supervisor',    color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { username: 'operador',   password: 'Oper2024!',   role: 'Operador',      color: 'bg-green-50 border-green-200 text-green-700' },
];

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass]   = useState(false);
    const [loading,  setLoading]    = useState(false);
    const { login } = useAuth();

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
            toast.error('Ingresa usuario y contraseña.');
            return;
        }
        setLoading(true);
        // Pequeño delay para simular latencia de red (quitar cuando haya backend real)
        await new Promise((r) => setTimeout(r, 400));
        const result = login(username.trim(), password);
        setLoading(false);

        if (result.success) {
            toast.success('¡Bienvenido al Sistema Logístico!');
        } else {
            toast.error(result.message);
        }
    };

    const fillDemo = (u) => {
        setUsername(u.username);
        setPassword(u.password);
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-blue-600 p-8 text-center">
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <ShieldCheck className="text-blue-200" size={28} />
                        <h1 className="text-white text-3xl font-bold tracking-tight">LOGI-WEB</h1>
                    </div>
                    <p className="text-blue-100 text-sm">Gestión de Operaciones y Almacén</p>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} className="p-8 space-y-5">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                            <User size={16} /> Usuario
                        </label>
                        <input
                            type="text"
                            autoComplete="username"
                            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="Tu usuario"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                            <Lock size={16} /> Contraseña
                        </label>
                        <div className="relative">
                            <input
                                type={showPass ? 'text' : 'password'}
                                autoComplete="current-password"
                                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all pr-12"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                tabIndex={-1}
                            >
                                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                            <><LogIn size={20} /> Ingresar al Sistema</>
                        )}
                    </button>
                </form>

                {/* Demo credentials */}
                <div className="px-8 pb-8">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-3">
                        Usuarios de prueba — haz clic para autocompletar
                    </p>
                    <div className="space-y-2">
                        {DEMO_USERS.map((u) => (
                            <button
                                key={u.username}
                                type="button"
                                onClick={() => fillDemo(u)}
                                className={`w-full text-left px-4 py-2 rounded-lg border text-xs font-mono flex justify-between items-center hover:opacity-80 transition-opacity ${u.color}`}
                            >
                                <span><strong>{u.username}</strong> / {u.password}</span>
                                <span className="font-sans font-semibold text-[10px] uppercase tracking-wide">{u.role}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;