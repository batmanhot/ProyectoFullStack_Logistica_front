import { BACKEND_URL, ORG_CODE } from './config'

/**
 * Deja la data demo del tenant en el estado conocido que siembra
 * DatosService.restaurarDemo() (ver back/stockpro-api/src/datos/datos.service.ts)
 * antes de correr la suite — así los flujos E2E no dependen de en qué estado
 * quedó la data demo real tras uso manual previo (política del plan de QA:
 * nunca correr E2E contra la data demo "en uso" sin resetear antes).
 */
export default async function globalSetup() {
  const empresaRes = await fetch(`${BACKEND_URL}/empresas/${ORG_CODE}`)
  const { data: empresa } = await empresaRes.json()
  if (!empresa) throw new Error(`No se encontró la organización demo '${ORG_CODE}' — ¿está el backend corriendo con la data seedeada?`)

  const admin = empresa.usuariosDemo?.find((u: any) => u.rol?.codigo === 'admin')
  if (!admin) throw new Error(`La organización '${ORG_CODE}' no tiene un usuario demo admin`)

  const loginRes = await fetch(`${BACKEND_URL}/auth/demo-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ empresaId: empresa.id, usuarioId: admin.id }),
  })
  const { data: sesion, error: loginError } = await loginRes.json()
  if (loginError || !sesion?.accessToken) throw new Error(`No se pudo autenticar como admin demo: ${loginError}`)

  const resetRes = await fetch(`${BACKEND_URL}/datos/restaurar-demo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${sesion.accessToken}` },
  })
  if (!resetRes.ok) throw new Error(`Falló restaurar-demo (${resetRes.status}) — no se puede garantizar un estado inicial conocido`)
}
