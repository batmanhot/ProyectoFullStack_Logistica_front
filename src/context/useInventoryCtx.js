/**
 * useInventoryCtx.js — Hook de consumo del InventoryContext.
 * Separado del Provider para cumplir con Fast Refresh de Vite.
 */
import { useContext } from 'react';
import { InventoryContext } from './inventoryContextInstance';

export const useInventoryCtx = () => {
    const ctx = useContext(InventoryContext);
    if (!ctx) throw new Error('useInventoryCtx must be used within InventoryProvider');
    return ctx;
};
