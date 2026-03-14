/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { InitialCategories } from '../data/initialData';
import { storageGet, storageSet } from '../services/storageAdapter';
import { STORAGE_KEYS } from '../services/storageKeys';

const CategoriesContext = createContext();

export const CategoriesProvider = ({ children }) => {
    const [categories, setCategories] = useState(() => {
        const stored = storageGet(STORAGE_KEYS.CATEGORIES, InitialCategories);
        if (!stored || stored.length === 0) {
            storageSet(STORAGE_KEYS.CATEGORIES, InitialCategories);
            return InitialCategories;
        }
        return stored;
    });

    useEffect(() => {
        storageSet(STORAGE_KEYS.CATEGORIES, categories);
    }, [categories]);

    const addCategory = (category) => {
        const newCategory = { ...category, id: crypto.randomUUID() };
        setCategories([...categories, newCategory]);
    };

    const updateCategory = (id, updatedData) => {
        setCategories(categories.map(c => c.id === id ? { ...c, ...updatedData } : c));
    };

    const deleteCategory = (id) => {
        setCategories(categories.filter(c => c.id !== id));
    };

    return (
        <CategoriesContext.Provider value={{
            categories,
            addCategory,
            updateCategory,
            deleteCategory
        }}>
            {children}
        </CategoriesContext.Provider>
    );
};

export const useCategoriesCtx = () => {
    const ctx = useContext(CategoriesContext);
    if (!ctx) throw new Error('useCategoriesCtx must be used within CategoriesProvider');
    return ctx;
};