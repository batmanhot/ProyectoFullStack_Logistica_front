/**
 * storageAdapter.js — Capa única de persistencia.
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  GUÍA DE MIGRACIÓN A BACKEND                                │
 * │                                                             │
 * │  HOY   → todas las funciones leen/escriben localStorage.    │
 * │  FUTURO → reemplaza el cuerpo de cada función por una       │
 * │           llamada HTTP (axios / fetch) a tu API REST.       │
 * │                                                             │
 * │  Los contextos y hooks que consumen este adapter            │
 * │  NO necesitan ningún cambio al migrar.                      │
 * │                                                             │
 * │  Ejemplo de migración de storageGet():                      │
 * │    HOY:    return JSON.parse(localStorage.getItem(key))     │
 * │    FUTURO: return (await axios.get(`/api/${key}`)).data     │
 * └─────────────────────────────────────────────────────────────┘
 */

// ---------------------------------------------------------------------------
// VERSIÓN DE DATOS SEMILLA
// Incrementar este número cada vez que se actualicen los datos iniciales
// (InitialCatalog, InitialInventory, InitialMovements, etc.).
// Al detectar una versión anterior, el adapter limpia las claves afectadas
// y fuerza la recarga desde los nuevos datos semilla.
// ---------------------------------------------------------------------------
const SEED_VERSION     = 5;
const SEED_VERSION_KEY = 'logi_seed_version';

// Claves antiguas que deben ser eliminadas al migrar
// (renombres históricos de versiones anteriores del proyecto)
const LEGACY_KEYS = [
    'categories',        // → ahora STORAGE_KEYS.CATEGORIES = 'logi_categories'
    'transporters',      // → ahora STORAGE_KEYS.TRANSPORTERS = 'logi_transporters'
    'batches',           // → ahora STORAGE_KEYS.BATCHES = 'logi_batches'
    'inventory_data',    // conservado como STORAGE_KEYS.INVENTORY — se limpia igual al resetear
    'inventory_movements',
    'logi_catalog',
    'logi_locations',
    'logi_partners',
    'logi_session',
];

// Claves de datos que deben resetearse cuando sube la versión semilla
// (NO incluye SESSION — no queremos desloguear al usuario)
const SEED_DATA_KEYS = [
    'logi_catalog',
    'inventory_data',
    'inventory_movements',
    'logi_locations',
    'logi_batches',
    'logi_categories',
    'logi_partners',
    'logi_transporters',
];

/**
 * Ejecuta la migración de datos al arrancar la app.
 * - Elimina claves legacy (nombres viejos)
 * - Si la versión semilla cambió, limpia los datos para forzar recarga
 *   desde InitialData con los nuevos registros enriquecidos
 */
export const runStorageMigration = () => {
    try {
        // 1. Limpiar siempre las claves legacy (nombres viejos de versiones anteriores)
        LEGACY_KEYS.forEach(key => {
            if (localStorage.getItem(key) !== null) {
                localStorage.removeItem(key);
            }
        });

        // 2. Comprobar versión semilla
        const storedVersion = parseInt(localStorage.getItem(SEED_VERSION_KEY) || '0', 10);

        if (storedVersion < SEED_VERSION) {
            // Versión antigua → limpiar datos para forzar recarga desde InitialData
            SEED_DATA_KEYS.forEach(key => localStorage.removeItem(key));
            localStorage.setItem(SEED_VERSION_KEY, String(SEED_VERSION));
            console.info(`[storageAdapter] Datos semilla actualizados a v${SEED_VERSION}`);
        }
    } catch {
        console.warn('[storageAdapter] Error durante la migración de storage.');
    }
};

// ---------------------------------------------------------------------------
// Operaciones síncronas (localStorage) — fase actual: maqueta / prototipo
// ---------------------------------------------------------------------------

/**
 * Lee un valor del storage.
 * @param {string} key      - Clave (usar STORAGE_KEYS)
 * @param {*}      fallback - Valor por defecto si la clave no existe o está vacía
 * @returns {*} El valor almacenado o el fallback
 */
export const storageGet = (key, fallback = null) => {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return fallback;
        const parsed = JSON.parse(raw);
        // Si el valor guardado es un array vacío y hay fallback con datos, usar fallback
        if (Array.isArray(parsed) && parsed.length === 0 && Array.isArray(fallback) && fallback.length > 0) {
            return fallback;
        }
        return parsed;
    } catch {
        console.warn(`[storageAdapter] Error leyendo clave "${key}". Retornando fallback.`);
        return fallback;
    }
};

/**
 * Escribe un valor en el storage.
 * @param {string} key   - Clave (usar STORAGE_KEYS)
 * @param {*}      value - Valor a persistir (será serializado a JSON)
 */
export const storageSet = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        console.warn(`[storageAdapter] Error escribiendo clave "${key}".`);
    }
};

/**
 * Elimina una clave del storage.
 * @param {string} key - Clave a eliminar
 */
export const storageRemove = (key) => {
    try {
        localStorage.removeItem(key);
    } catch {
        console.warn(`[storageAdapter] Error eliminando clave "${key}".`);
    }
};

/**
 * Limpia todas las claves de datos de la aplicación.
 * Útil para el botón "Resetear demo" en presentaciones.
 * @param {string[]} keys - Array de claves (usar Object.values(STORAGE_KEYS))
 */
export const storageClearAll = (keys = []) => {
    keys.forEach(key => storageRemove(key));
    // Resetear también la versión para forzar recarga de semilla
    storageRemove(SEED_VERSION_KEY);
};

// ---------------------------------------------------------------------------
// Interfaz agrupada (opcional) — para quienes prefieren el estilo db.get()
// ---------------------------------------------------------------------------
export const db = {
    get:       storageGet,
    set:       storageSet,
    remove:    storageRemove,
    clearAll:  storageClearAll,
};

export default db;
