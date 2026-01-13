import { useState, useEffect } from 'react';
import { InitialBatches } from '../data/initialData';
import toast from 'react-hot-toast';

export const useBatches = () => {
    const [batches, setBatches] = useState(() => {
        const saved = localStorage.getItem('batches');
        return saved ? JSON.parse(saved) : InitialBatches;
    });

    useEffect(() => {
        localStorage.setItem('batches', JSON.stringify(batches));
    }, [batches]);

    const addBatch = (batchData) => {
        const newBatch = {
            ...batchData,
            id: Date.now(),
            cantidadActual: batchData.cantidadOriginal,
            estado: calculateStatus(batchData.fechaVencimiento)
        };
        setBatches(prev => [newBatch, ...prev]);
        toast.success("Lote registrado correctamente");
    };

    const updateBatch = (id, updatedData) => {
        setBatches(prev => prev.map(b => {
            if (b.id === id) {
                const newState = updatedData.fechaVencimiento ? calculateStatus(updatedData.fechaVencimiento) : b.estado;
                return { ...b, ...updatedData, estado: newState };
            }
            return b;
        }));
        toast.success("Lote actualizado");
    };

    const deleteBatch = (id) => {
        setBatches(prev => prev.filter(b => b.id !== id));
        toast.success("Lote eliminado");
    };

    const calculateStatus = (dateString) => {
        const today = new Date();
        const expDate = new Date(dateString);
        const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'Vencido';
        if (diffDays <= 30) return 'Por Vencer';
        return 'Vigente';
    };

    // Auto-update status on load (optional, ensures validity)
    useEffect(() => {
        setBatches(prev => prev.map(b => ({
            ...b,
            estado: calculateStatus(b.fechaVencimiento)
        })));
    }, []);

    return {
        batches,
        addBatch,
        updateBatch,
        deleteBatch
    };
};
