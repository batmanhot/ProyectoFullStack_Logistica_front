import { useState, useEffect } from 'react';
import { InitialPartners } from '../data/initialData';

export const usePartners = () => {
    // Estado de Socios (Clientes y Proveedores)
    const [partners, setPartners] = useState(() => {
        const saved = localStorage.getItem('logi_partners');
        return saved ? JSON.parse(saved) : InitialPartners;
    });

    // Persistencia Local
    useEffect(() => {
        localStorage.setItem('logi_partners', JSON.stringify(partners));
    }, [partners]);

    // --- CRUD ---

    const addPartner = (partnerData) => {
        const newPartner = {
            id: Date.now(),
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

    return {
        partners,
        addPartner,
        updatePartner,
        deletePartner,
        getClients,
        getSuppliers
    };
};
