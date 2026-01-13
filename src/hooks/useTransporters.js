import { useState, useEffect } from 'react';
import { InitialTransporters } from '../data/initialData';
import toast from 'react-hot-toast';

export const useTransporters = () => {
    const [transporters, setTransporters] = useState(() => {
        const saved = localStorage.getItem('transporters');
        return saved ? JSON.parse(saved) : InitialTransporters;
    });

    useEffect(() => {
        localStorage.setItem('transporters', JSON.stringify(transporters));
    }, [transporters]);

    const addTransporter = (data) => {
        const newTransporter = {
            ...data,
            id: Date.now()
        };
        setTransporters(prev => [newTransporter, ...prev]);
        toast.success("Transportista registrado");
    };

    const updateTransporter = (id, updatedData) => {
        setTransporters(prev => prev.map(t =>
            t.id === id ? { ...t, ...updatedData } : t
        ));
        toast.success("Datos actualizados");
    };

    const deleteTransporter = (id) => {
        setTransporters(prev => prev.filter(t => t.id !== id));
        toast.success("Registro eliminado");
    };

    return {
        transporters,
        addTransporter,
        updateTransporter,
        deleteTransporter
    };
};
