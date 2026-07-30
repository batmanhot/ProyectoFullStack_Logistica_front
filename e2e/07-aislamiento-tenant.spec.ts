import { test, expect, APIRequestContext } from '@playwright/test'
import { BACKEND_URL } from './config'

// Test HTTP puro (sin UI) — complementa el test de integración de RLS
// (back/stockpro-api/test/integration/rls.integration.spec.ts, que ya
// prueba el aislamiento a nivel de query cruda) verificando el mismo
// contrato mirado desde la capa HTTP real que consume el frontend, con
// dos tenants demo reales (dlnorte/acme) en vez de fixtures ad-hoc.

async function loginDemo(request: APIRequestContext, orgCodigo: string) {
  const empresaRes = await request.get(`${BACKEND_URL}/empresas/${orgCodigo}`)
  const { data: empresa } = await empresaRes.json()
  const admin = empresa.usuariosDemo.find((u: any) => u.rol?.codigo === 'admin')
  const loginRes = await request.post(`${BACKEND_URL}/auth/demo-login`, {
    data: { empresaId: empresa.id, usuarioId: admin.id },
  })
  const { data } = await loginRes.json()
  return { empresaId: empresa.id, token: data.accessToken as string }
}

test.describe('Aislamiento de tenant — capa HTTP', () => {
  test('el JWT de un tenant no puede leer ni modificar un recurso de otro tenant (404, no 403)', async ({ request }) => {
    const dlnorte = await loginDemo(request, 'dlnorte')
    const acme = await loginDemo(request, 'acme')

    const clientesRes = await request.get(`${BACKEND_URL}/clientes`, {
      headers: { Authorization: `Bearer ${dlnorte.token}` },
    })
    const { data: clientesDlnorte } = await clientesRes.json()
    expect(clientesDlnorte.length).toBeGreaterThan(0)
    const clienteAjenoId = clientesDlnorte[0].id

    // GET con el JWT de acme sobre un id que pertenece a dlnorte
    const getCruzado = await request.get(`${BACKEND_URL}/clientes/${clienteAjenoId}`, {
      headers: { Authorization: `Bearer ${acme.token}` },
    })
    expect(getCruzado.status()).toBe(404)

    // PUT con el JWT de acme sobre el mismo recurso ajeno — ni siquiera se filtra por RLS+404, no debe mutar nada
    const putCruzado = await request.put(`${BACKEND_URL}/clientes/${clienteAjenoId}`, {
      headers: { Authorization: `Bearer ${acme.token}` },
      data: { razonSocial: 'Hackeado desde otro tenant' },
    })
    expect(putCruzado.status()).toBe(404)

    // El recurso sigue intacto visto desde su propio tenant
    const verificacion = await request.get(`${BACKEND_URL}/clientes/${clienteAjenoId}`, {
      headers: { Authorization: `Bearer ${dlnorte.token}` },
    })
    const { data: clienteIntacto } = await verificacion.json()
    expect(clienteIntacto.razonSocial).not.toBe('Hackeado desde otro tenant')
  })

  test('un JWT con el empresaId manipulado falla por firma inválida (401)', async ({ request }) => {
    const dlnorte = await loginDemo(request, 'dlnorte')
    const [header, payload, signature] = dlnorte.token.split('.')
    const payloadDecodificado = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'))
    const payloadManipulado = Buffer.from(
      JSON.stringify({ ...payloadDecodificado, empresaId: 'otra-empresa-cualquiera' }),
    ).toString('base64url')
    const tokenManipulado = `${header}.${payloadManipulado}.${signature}`

    const res = await request.get(`${BACKEND_URL}/clientes`, {
      headers: { Authorization: `Bearer ${tokenManipulado}` },
    })
    expect(res.status()).toBe(401)
  })
})
