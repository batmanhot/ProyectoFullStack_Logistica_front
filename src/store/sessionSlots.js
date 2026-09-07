// Dos slots de sesión independientes en localStorage.
//
// El PlatformAdmin (SuperAdmin) y el usuario de un tenant NO deben pisarse:
// antes ambos escribían la misma clave 'sp_session' y el último login ganaba.
// Efecto visible en el deploy: abrir el SuperAdmin en una pestaña y un negocio
// en otra (o un reload por PWA autoUpdate) hacía que el SuperAdmin, al
// recargar, leyera la sesión del tenant y "se saliera". Los TOKENS ya estaban
// separados (sp_admin_* vs sp_*, ver services/api.js) — faltaba separar el
// objeto de sesión que decide qué app renderizar.
//
// Ahora cada identidad tiene su propia clave y al montar se restaura la que
// corresponde a la URL de esa pestaña.

export const SESSION_KEY_TENANT = 'sp_session'        // sin cambios: no desloguea a los tenants ya logueados
export const SESSION_KEY_ADMIN = 'sp_session_admin'

/** true si la ruta pertenece al espacio del SuperAdmin / Admin SaaS. */
export function esRutaSuperAdmin(pathname = '') {
  return (
    pathname === '/superadmin' ||
    pathname.startsWith('/superadmin/') ||
    pathname.startsWith('/admin-saas') // cubre /admin-saas y /admin-saas-v2
  )
}

/** Clave de storage donde vive (o debe vivir) una sesión dada. */
export function slotParaSesion(sesion) {
  return sesion?.rol?.codigo === 'saas_admin' ? SESSION_KEY_ADMIN : SESSION_KEY_TENANT
}

/** Clave de storage a restaurar al montar, según la URL actual de la pestaña. */
export function slotParaRuta(pathname) {
  return esRutaSuperAdmin(pathname) ? SESSION_KEY_ADMIN : SESSION_KEY_TENANT
}
