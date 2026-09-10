// Slots de sesión: SuperAdmin y tenant no se pisan, y cada PESTAÑA de tenant
// tiene su propia sesión de negocio.
//
// - SuperAdmin (identidad única de plataforma) → objeto de sesión en
//   localStorage['sp_session_admin'], se comparte entre pestañas. Su refresh
//   token vive en la cookie httpOnly `sp_admin_rt`.
// - Tenant → objeto de sesión en sessionStorage['sp_session'] (POR PESTAÑA) +
//   sessionStorage['sp_tab_empresa'] con el id de la empresa de esa pestaña.
//   El refresh token vive en la cookie httpOnly `sp_rt_<empresaId>` (una por
//   negocio). Así, Acme en una pestaña y DL Norte en otra conviven: cada F5
//   restaura la empresa de esa pestaña, no "la última que logueó".
//
// Antes todo compartía localStorage['sp_session'] + una sola cookie `sp_rt`, y
// el último login ganaba en todo el navegador.

export const SESSION_KEY_TENANT = 'sp_session'        // ahora en sessionStorage (por pestaña)
export const SESSION_KEY_ADMIN = 'sp_session_admin'   // en localStorage (identidad única)
export const TAB_EMPRESA_KEY = 'sp_tab_empresa'       // sessionStorage: empresa de ESTA pestaña

/** true si la ruta pertenece al espacio del SuperAdmin / Admin SaaS. */
export function esRutaSuperAdmin(pathname = '') {
  return (
    pathname === '/superadmin' ||
    pathname.startsWith('/superadmin/') ||
    pathname.startsWith('/admin-saas')
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

/**
 * Storage donde vive el OBJETO de sesión de una identidad:
 *  - admin  → localStorage  (se comparte entre pestañas)
 *  - tenant → sessionStorage (aislado por pestaña: cada negocio, lo suyo)
 */
export function almacenDeSesion(esAdmin) {
  return esAdmin ? localStorage : sessionStorage
}
