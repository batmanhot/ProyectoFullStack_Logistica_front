import { useState, useEffect } from 'react';
import { InitialCategories } from '../data/initialData';

export const useCategories = () => {
    const [categories, setCategories] = useState(() => {
        const saved = localStorage.getItem('categories');
        return saved ? JSON.parse(saved) : InitialCategories;
    });

    useEffect(() => {
        localStorage.setItem('categories', JSON.stringify(categories));
    }, [categories]);

    const addCategory = (category) => {
        const newCategory = { ...category, id: Date.now() };
        setCategories([...categories, newCategory]);
    };

    const updateCategory = (id, updatedData) => {
        setCategories(categories.map(c => c.id === id ? { ...c, ...updatedData } : c));
    };

    const deleteCategory = (id) => {
        setCategories(categories.filter(c => c.id !== id));
    };

    return {
        categories,
        addCategory,
        updateCategory,
        deleteCategory
    };
};
