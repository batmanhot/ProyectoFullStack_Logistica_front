/**
 * authContextInstance.js — Instancia del contexto de autenticación.
 * Separado del Provider y del hook para cumplir con Fast Refresh de Vite.
 */
import { createContext } from 'react';

export const AuthContext = createContext();
