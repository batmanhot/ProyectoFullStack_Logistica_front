import { useState, useEffect, useCallback } from 'react';
import { InitialLocations } from '../data/initialData';
import { storageGet, storageSet } from '../services/storageAdapter';
import { STORAGE_KEYS } from '../services/storageKeys';
import { LocationsContext } from './locationsContextInstance';

export const LocationsProvider = ({ children }) => {
    const [locations, setLocations] = useState(() => storageGet(STORAGE_KEYS.LOCATIONS, InitialLocations));

    useEffect(() => {
        storageSet(STORAGE_KEYS.LOCATIONS, locations);
    }, [locations]);

    const addLocation = (locationData) => {
        const newLocation = {
            id: crypto.randomUUID(),
            capacidadActual: 0,
            estado: 'Disponible',
            observaciones: '',
            ...locationData
        };
        setLocations(prev => [newLocation, ...prev]);
    };

    const updateLocation = (id, updatedData) => {
        setLocations(prev => prev.map(loc => {
            if (loc.id === id) {
                // Preserve capacidadActual — solo recalculateCapacities debe actualizarla
                const { capacidadActual: _cap, ...safeUpdates } = updatedData;
                return { ...loc, ...safeUpdates };
            }
            return loc;
        }));
    };

    const deleteLocation = (id) => {
        setLocations(prev => prev.filter(loc => loc.id !== id));
    };

    const getLocationsByWarehouse = (almacen) => {
        return locations.filter(loc => loc.almacen === almacen);
    };

    const getAvailableLocations = (almacen) => {
        return locations.filter(loc =>
            loc.almacen === almacen &&
            loc.estado === 'Disponible' &&
            loc.capacidadActual < loc.capacidadMax
        );
    };

    const updateLocationCapacity = (codigo, almacen, delta) => {
        setLocations(prev => prev.map(loc => {
            if (loc.codigo === codigo && loc.almacen === almacen) {
                return {
                    ...loc,
                    capacidadActual: Math.max(0, loc.capacidadActual + delta)
                };
            }
            return loc;
        }));
    };

    // Nueva función: Recalcular capacidades desde el inventario
    const recalculateCapacities = useCallback((products) => {
        setLocations(prev => {
            return prev.map(loc => {
                // Sumar todas las cantidades de productos en esta ubicación
                const totalInLocation = products
                    .filter(p => p.ubicacion === loc.codigo && p.almacen === loc.almacen)
                    .reduce((sum, p) => sum + p.cantidad, 0);

                return {
                    ...loc,
                    capacidadActual: totalInLocation
                };
            });
        });
    }, []);

    const value = {
        locations,
        addLocation,
        updateLocation,
        deleteLocation,
        getLocationsByWarehouse,
        getAvailableLocations,
        updateLocationCapacity,
        recalculateCapacities
    };

    return (
        <LocationsContext.Provider value={value}>
            {children}
        </LocationsContext.Provider>
    );
};


