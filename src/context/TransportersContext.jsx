/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { InitialTransporters } from '../data/initialData';
import { storageGet, storageSet } from '../services/storageAdapter';
import { STORAGE_KEYS } from '../services/storageKeys';

const TransportersContext = createContext();

export const TransportersProvider = ({ children }) => {
    const [transporters, setTransporters] = useState(() => {
        const stored = storageGet(STORAGE_KEYS.TRANSPORTERS, InitialTransporters);
        // Si no hay datos almacenados o el array está vacío, usar datos iniciales
        if (!stored || stored.length === 0) {
            storageSet(STORAGE_KEYS.TRANSPORTERS, InitialTransporters);
            return InitialTransporters;
        }
        return stored;
    });

    useEffect(() => {
        storageSet(STORAGE_KEYS.TRANSPORTERS, transporters);
    }, [transporters]);

    const addTransporter = (data) => {
        const newTransporter = {
            ...data,
            id: crypto.randomUUID()
        };
        setTransporters(prev => [newTransporter, ...prev]);
    };

    const updateTransporter = (id, updatedData) => {
        setTransporters(prev => prev.map(t =>
            t.id === id ? { ...t, ...updatedData } : t
        ));
    };

    const deleteTransporter = (id) => {
        setTransporters(prev => prev.filter(t => t.id !== id));
    };

    return (
        <TransportersContext.Provider value={{
            transporters,
            addTransporter,
            updateTransporter,
            deleteTransporter
        }}>
            {children}
        </TransportersContext.Provider>
    );
};

export const useTransportersCtx = () => {
    const ctx = useContext(TransportersContext);
    if (!ctx) throw new Error('useTransportersCtx must be used within TransportersProvider');
    return ctx;
};