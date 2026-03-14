/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { InitialBatches } from '../data/initialData';
import { storageGet, storageSet } from '../services/storageAdapter';
import { STORAGE_KEYS } from '../services/storageKeys';

const BatchesContext = createContext();

// Función helper para calcular el estado de un lote
const calculateStatus = (dateString) => {
    const today = new Date();
    const expDate = new Date(dateString);
    const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Vencido';
    if (diffDays <= 30) return 'Por Vencer';
    return 'Vigente';
};

export const BatchesProvider = ({ children }) => {
    const [batches, setBatches] = useState(() => {
        const stored = storageGet(STORAGE_KEYS.BATCHES, InitialBatches);
        if (!stored || stored.length === 0) {
            storageSet(STORAGE_KEYS.BATCHES, InitialBatches);
            return InitialBatches;
        }
        return stored;
    });

    useEffect(() => {
        storageSet(STORAGE_KEYS.BATCHES, batches);
    }, [batches]);

    const addBatch = (batchData) => {
        const newBatch = {
            ...batchData,
            id: crypto.randomUUID(),
            cantidadActual: batchData.cantidadOriginal,
            estado: calculateStatus(batchData.fechaVencimiento)
        };
        setBatches(prev => [newBatch, ...prev]);
    };

    const updateBatch = (id, updatedData) => {
        setBatches(prev => prev.map(b => {
            if (b.id === id) {
                const newState = updatedData.fechaVencimiento ? calculateStatus(updatedData.fechaVencimiento) : b.estado;
                return { ...b, ...updatedData, estado: newState };
            }
            return b;
        }));
    };

    const deleteBatch = (id) => {
        setBatches(prev => prev.filter(b => b.id !== id));
    };

    return (
        <BatchesContext.Provider value={{
            batches,
            addBatch,
            updateBatch,
            deleteBatch
        }}>
            {children}
        </BatchesContext.Provider>
    );
};

export const useBatchesCtx = () => {
    const ctx = useContext(BatchesContext);
    if (!ctx) throw new Error('useBatchesCtx must be used within BatchesProvider');
    return ctx;
};