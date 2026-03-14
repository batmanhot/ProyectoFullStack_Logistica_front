/**
 * useLocations.js — Hook de consumo del LocationsContext.
 * Separado del Provider para cumplir con Fast Refresh de Vite.
 */
import { useContext } from 'react';
import { LocationsContext } from './locationsContextInstance';

export const useLocations = () => {
    const ctx = useContext(LocationsContext);
    if (!ctx) throw new Error('useLocations must be used within LocationsProvider');
    return ctx;
};
