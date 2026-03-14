/**
 * useInventory — Wrapper de compatibilidad hacia atrás.
 *
 * Todos los módulos que ya usan `useInventory()` siguen funcionando sin cambios.
 * Internamente delega al InventoryContext global (fuente de verdad única).
 *
 * NOTA: Si vas a crear nuevos módulos, importa directamente `useInventoryCtx`
 * desde el contexto en lugar de este hook.
 */
import { useInventoryCtx } from '../context/useInventoryCtx';

export const useInventory = () => useInventoryCtx();

