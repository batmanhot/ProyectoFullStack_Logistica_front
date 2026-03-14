/**
 * useAuth.js — Hook de consumo del AuthContext.
 * Separado del Provider para cumplir con Fast Refresh de Vite
 * (un archivo no puede exportar componentes y funciones/constantes mezclados).
 */
import { useContext } from 'react';
import { AuthContext } from '../hooks/authContextInstance';

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
