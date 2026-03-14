import React, { useState, useCallback } from 'react';
import { storageGet, storageSet, storageRemove } from '../services/storageAdapter';
import { STORAGE_KEYS } from '../services/storageKeys';
import { ROLE_PERMISSIONS } from './rolePermissions';
import { AuthContext } from '../hooks/authContextInstance';

// ---------------------------------------------------------------------------
// Usuarios del sistema (simulados — reemplazar por API en producción)
// Las contraseñas están "hasheadas" con una función simple para no tenerlas
// en texto plano. En producción usar bcrypt en el servidor + JWT.
// ---------------------------------------------------------------------------
const hashPassword = (password) => {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        hash = ((hash << 5) - hash) + password.charCodeAt(i);
        hash |= 0;
    }
    return hash.toString(16);
};

const USERS_DB = [
    {
        id: '1',
        username: 'admin',
        passwordHash: hashPassword('Admin2024!'),
        name: 'Administrador General',
        role: 'admin',
        email: 'admin@logiweb.pe',
        permissions: ['*'],
    },
    {
        id: '2',
        username: 'operador',
        passwordHash: hashPassword('Oper2024!'),
        name: 'Operador de Almacén',
        role: 'operador',
        email: 'operador@logiweb.pe',
        permissions: ['inventario', 'entradas', 'salidas', 'transferencias', 'reportes'],
    },
    {
        id: '3',
        username: 'supervisor',
        passwordHash: hashPassword('Super2024!'),
        name: 'Supervisor Logístico',
        role: 'supervisor',
        email: 'supervisor@logiweb.pe',
        permissions: ['inventario', 'entradas', 'salidas', 'transferencias', 'reportes', 'catalogo', 'lotes'],
    },
];

// ---------------------------------------------------------------------------

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => storageGet(STORAGE_KEYS.SESSION, null));

    const login = useCallback((username, password) => {
        const inputHash = hashPassword(password);
        const found = USERS_DB.find(
            (u) => u.username === username && u.passwordHash === inputHash
        );
        if (!found) return { success: false, message: 'Usuario o contraseña incorrectos.' };

        const sessionUser = {
            id:          found.id,
            username:    found.username,
            name:        found.name,
            role:        found.role,
            email:       found.email,
            permissions: found.permissions,
            loginAt:     new Date().toISOString(),
        };
        setUser(sessionUser);
        storageSet(STORAGE_KEYS.SESSION, sessionUser);
        return { success: true };
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        storageRemove(STORAGE_KEYS.SESSION);
    }, []);

    const hasPermission = useCallback((module) => {
        if (!user) return false;
        if (user.permissions.includes('*')) return true;
        return user.permissions.includes(module);
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, login, logout, hasPermission, ROLE_PERMISSIONS }}>
            {children}
        </AuthContext.Provider>
    );
};
