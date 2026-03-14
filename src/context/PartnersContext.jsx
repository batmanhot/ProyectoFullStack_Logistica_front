/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { InitialPartners } from '../data/initialData';
import { storageGet, storageSet } from '../services/storageAdapter';
import { STORAGE_KEYS } from '../services/storageKeys';

const PartnersContext = createContext();

export const PartnersProvider = ({ children }) => {
    const [partners, setPartners] = useState(() => {
        const stored = storageGet(STORAGE_KEYS.PARTNERS, InitialPartners);
        if (!stored || stored.length === 0) {
            storageSet(STORAGE_KEYS.PARTNERS, InitialPartners);
            return InitialPartners;
        }
        return stored;
    });

    useEffect(() => {
        storageSet(STORAGE_KEYS.PARTNERS, partners);
    }, [partners]);

    const addPartner = (partnerData) => {
        const newPartner = {
            id: crypto.randomUUID(),
            estado: 'Activo',
            ...partnerData
        };
        setPartners(prev => [newPartner, ...prev]);
    };

    const updatePartner = (id, updatedData) => {
        setPartners(prev => prev.map(p => p.id === id ? { ...p, ...updatedData } : p));
    };

    const deletePartner = (id) => {
        setPartners(prev => prev.filter(p => p.id !== id));
    };

    const getClients = () => partners.filter(p => p.tipo === 'Cliente');
    const getSuppliers = () => partners.filter(p => p.tipo === 'Proveedor');

    return (
        <PartnersContext.Provider value={{
            partners,
            addPartner,
            updatePartner,
            deletePartner,
            getClients,
            getSuppliers
        }}>
            {children}
        </PartnersContext.Provider>
    );
};

export const usePartnersCtx = () => {
    const ctx = useContext(PartnersContext);
    if (!ctx) throw new Error('usePartnersCtx must be used within PartnersProvider');
    return ctx;
};