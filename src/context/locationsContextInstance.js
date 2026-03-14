/**
 * locationsContextInstance.js — Instancia del contexto de ubicaciones.
 * Separado del Provider y del hook para cumplir con Fast Refresh de Vite.
 */
import { createContext } from 'react';

export const LocationsContext = createContext();
