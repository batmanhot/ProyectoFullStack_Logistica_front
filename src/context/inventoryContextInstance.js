/**
 * inventoryContextInstance.js — Instancia del contexto de inventario.
 * Separado del Provider y del hook para cumplir con Fast Refresh de Vite.
 */
import { createContext } from 'react';

export const InventoryContext = createContext(null);
