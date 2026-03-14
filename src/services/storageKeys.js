/**
 * storageKeys.js — Registro centralizado de todas las claves de persistencia.
 *
 * Razón de existir: evitar strings mágicos dispersos por el código.
 * Al migrar a backend, este archivo también documenta qué entidades
 * necesitan un endpoint REST equivalente.
 *
 * Mapa de migración futura:
 *   CATALOG       → GET/POST/PUT/DELETE  /api/catalog
 *   INVENTORY     → GET                  /api/inventory
 *   MOVEMENTS     → GET/POST/PUT/DELETE  /api/movements
 *   LOCATIONS     → GET/POST/PUT/DELETE  /api/locations
 *   BATCHES       → GET/POST/PUT/DELETE  /api/batches
 *   CATEGORIES    → GET/POST/PUT/DELETE  /api/categories
 *   PARTNERS      → GET/POST/PUT/DELETE  /api/partners
 *   TRANSPORTERS  → GET/POST/PUT/DELETE  /api/transporters
 *   SESSION       → POST /api/auth/login · DELETE /api/auth/logout
 */

export const STORAGE_KEYS = {
    // Inventario
    CATALOG:      'logi_catalog',
    INVENTORY:    'inventory_data',
    MOVEMENTS:    'inventory_movements',

    // Maestros
    LOCATIONS:    'logi_locations',
    BATCHES:      'logi_batches',
    CATEGORIES:   'logi_categories',
    PARTNERS:     'logi_partners',
    TRANSPORTERS: 'logi_transporters',

    // Sesión
    SESSION:      'logi_session',
};
