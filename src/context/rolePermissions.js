/**
 * rolePermissions.js — Mapa de permisos por rol.
 * Separado del AuthContext para cumplir con Fast Refresh de Vite.
 */
export const ROLE_PERMISSIONS = {
    admin:      { label: 'Administrador', color: 'bg-red-100 text-red-700',    canManageMasters: true,  canViewReports: true,  canDelete: true  },
    supervisor: { label: 'Supervisor',    color: 'bg-blue-100 text-blue-700',  canManageMasters: true,  canViewReports: true,  canDelete: false },
    operador:   { label: 'Operador',      color: 'bg-green-100 text-green-700',canManageMasters: false, canViewReports: true,  canDelete: false },
};
