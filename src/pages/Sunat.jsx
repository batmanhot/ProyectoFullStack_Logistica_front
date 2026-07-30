import { useState, useMemo } from 'react'
import { FileText, Send, CheckCircle, Download, Copy, Eye, ExternalLink } from 'lucide-react'
import { formatDate } from '../utils/helpers'
import { useApp } from '../store/AppContext'
import { Modal, Badge, Btn, Alert } from '../components/ui/index'
import { useClientesList } from '../queries/clientes.queries'
import { useProductosList } from '../queries/productos.queries'
import {
  useSunatDocumentos, useSunatDespachosConGuia,
  useGenerarDocumentoSunat, useMarcarEnviadoSunat,
  useMarcarAceptadoSunat, useMarcarRechazadoSunat,
} from '../queries/sunat.queries'

const TH = ({c}) => <th className="bg-[#1a2230] px-3.5 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] whitespace-nowrap border-b border-white/8 text-left">{c}</th>

const ESTADO_META = {
  PENDIENTE: { label:'Pendiente', color:'warning' },
  ENVIADO:   { label:'Enviado',   color:'info'    },
  ACEPTADO:  { label:'Aceptado',  color:'success' },
  RECHAZADO: { label:'Rechazado', color:'danger'  },
}

// Genera JSON GRE compatible con Nubefact/Factura.com
function generarJSONGRE({ des, cliente, productos, config }) {
  const items = (des.items || []).map((item, i) => {
    const p = productos.find(x => x.id === item.productoId)
    return {
      orden:            i + 1,
      codigo:           p?.sku || `PROD-${i+1}`,
      descripcion:      p?.nombre || 'Producto',
      unidad_medida:    p?.unidadMedida === 'KG'  ? 'KGM' :
                        p?.unidadMedida === 'LT'  ? 'LTR' :
                        p?.unidadMedida === 'MTR' ? 'MTR' : 'NIU',
      cantidad:         item.cantidad,
      codigo_producto_sunat: p?.codigoProductoSunat || null,
    }
  })
  return {
    _metadata: {
      tipo_documento:  'GUIA_REMISION_REMITENTE',
      formato_version: '2.0',
      ose_compatible:  ['Nubefact','Factura.com','SUNAT_REST'],
      generado_por:    'StockPro v2.0',
      fecha_generacion: new Date().toISOString(),
    },
    ruc_remitente:          config?.ruc || '',
    razon_social_remitente: config?.empresa || '',
    tipo_guia:              '09',
    serie:                  'T001',
    correlativo:            des.guiaNumero?.split('-').pop() || '001',
    fecha_emision:          des.fechaDespacho || des.fecha || new Date().toISOString().split('T')[0],
    modalidad_traslado:     '01',
    motivo_traslado:        '01',
    descripcion_motivo:     'VENTA',
    fecha_inicio_traslado:  des.fechaDespacho || des.fecha || new Date().toISOString().split('T')[0],
    peso_bruto_total:       null,
    unidad_peso:            'KGM',
    numero_bultos:          des.empaque?.bultos || 1,
    transportista: {
      tipo_documento:    '6',
      numero_documento:  des.transportistaRuc || '',
      razon_social:      des.transportista || 'POR DEFINIR',
    },
    destinatario: {
      tipo_documento:    cliente?.ruc?.length === 11 ? '6' : '1',
      numero_documento:  cliente?.ruc || '',
      razon_social:      cliente?.razonSocial || '',
      direccion:         des.direccionEntrega || cliente?.direccion || '',
      ubigeo:            null,
    },
    punto_partida:  { direccion: config?.direccion || '', ubigeo: null },
    punto_llegada:  { direccion: des.direccionEntrega || cliente?.direccion || '', ubigeo: null },
    referencia_venta: des.guiaNumero || des.numero,
    items,
  }
}

export default function Sunat() {
  const { toast } = useApp()

  const { data: docs        = [] } = useSunatDocumentos()
  const { data: despConGuia = [] } = useSunatDespachosConGuia()
  const { data: clientes    = [] } = useClientesList({ incluirInactivos: true })
  const { data: productos   = [] } = useProductosList()

  const generarDocumento  = useGenerarDocumentoSunat()
  const marcarEnviado     = useMarcarEnviadoSunat()
  const marcarAceptado    = useMarcarAceptadoSunat()
  const marcarRechazado   = useMarcarRechazadoSunat()

  const config  = null   // empresa config — campos GRE quedan vacíos sin configurar
  const [preview,  setPreview]  = useState(null)
  const [copied,   setCopied]   = useState(false)
  const [tab,      setTab]      = useState('documentos')
  const [rechazandoId, setRechazandoId] = useState(null)
  const [motivoRechazado, setMotivoRechazado] = useState('')

  function buildPreview(des, docMeta = {}) {
    const cliente = clientes.find(c => c.id === des.clienteId)
    const json    = generarJSONGRE({ des, cliente, productos, config })
    return {
      ...docMeta,
      guiaNumero: des.guiaNumero || docMeta.guiaNumero,
      despachoId: des.id,
      estado:     docMeta.estado || 'PENDIENTE',
      json:       JSON.stringify(json, null, 2),
    }
  }

  async function generarDoc(des) {
    const res = await generarDocumento.mutateAsync(des.id)
    if (res.error) { toast(res.error, 'error'); return }
    const docMeta = docs.find(d => d.despachoId === des.id) || {}
    setPreview(buildPreview(des, docMeta))
    toast('Documento GRE generado', 'success')
  }

  function abrirPreview(doc) {
    const des = despConGuia.find(d => d.id === doc.despachoId)
    if (!des) {
      toast('Vista previa no disponible: regenera el documento', 'warning')
      return
    }
    setPreview(buildPreview(des, doc))
  }

  function descargarJSON(previewData) {
    const blob = new Blob([previewData.json], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `GRE_${previewData.guiaNumero}.json`
    a.click(); URL.revokeObjectURL(url)
  }

  function descargarDocJSON(doc) {
    const des = despConGuia.find(d => d.id === doc.despachoId)
    if (!des) { toast('Despacho no disponible para descarga', 'warning'); return }
    descargarJSON(buildPreview(des, doc))
  }

  function copiarJSON(previewData) {
    navigator.clipboard?.writeText(previewData.json).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  async function handleMarcarEnviado(doc) {
    const res = await marcarEnviado.mutateAsync(doc.despachoId)
    if (res.error) { toast(res.error, 'error'); return }
    toast('Marcado como enviado', 'success')
  }

  async function handleMarcarAceptado(doc) {
    const res = await marcarAceptado.mutateAsync({ despachoId: doc.despachoId })
    if (res.error) { toast(res.error, 'error'); return }
    toast('Marcado como aceptado por SUNAT', 'success')
  }

  async function handleConfirmarRechazado() {
    const res = await marcarRechazado.mutateAsync({ despachoId: rechazandoId, motivo: motivoRechazado })
    if (res.error) { toast(res.error, 'error'); return }
    setRechazandoId(null)
    setMotivoRechazado('')
    toast('Marcado como rechazado', 'success')
  }

  const kpis = useMemo(() => ({
    total:     docs.length,
    pendiente: docs.filter(d=>d.estado==='PENDIENTE').length,
    enviado:   docs.filter(d=>d.estado==='ENVIADO').length,
    aceptado:  docs.filter(d=>d.estado==='ACEPTADO').length,
    rechazado: docs.filter(d=>d.estado==='RECHAZADO').length,
  }), [docs])

  const SI = 'w-full px-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit] placeholder-[#5f6f80]'

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      <Alert variant="info">
        <strong>Modo de integración:</strong> StockPro genera el JSON/estructura de la Guía de Remisión Electrónica compatible con OSE peruanos (Nubefact, Factura.com, SUNAT REST API). Para envío automático, conecta tu clave API del OSE en Configuración → SUNAT.
      </Alert>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label:'Total documentos', val:kpis.total,     color:'#3b82f6' },
          { label:'Pendientes',       val:kpis.pendiente, color:'#f59e0b' },
          { label:'Enviados',         val:kpis.enviado,   color:'#6366f1' },
          { label:'Aceptados SUNAT',  val:kpis.aceptado,  color:'#22c55e' },
          { label:'Rechazados',       val:kpis.rechazado, color:'#ef4444' },
        ].map(({ label, val, color }) => (
          <div key={label} className="relative bg-[#161d28] border border-white/8 rounded-xl px-4 py-3.5 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.75 rounded-t-xl" style={{ background: color }}/>
            <div className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.07em] mb-2">{label}</div>
            <div className="text-[28px] font-semibold" style={{ color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-white/8">
        {[['documentos','Documentos GRE'],['generar','Generar desde despachos'],['guia','Guía de integración']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-[13px] font-medium border-b-2 -mb-px transition-all ${
              tab===t?'text-[#00c896] border-[#00c896]':'text-[#5f6f80] border-transparent hover:text-[#9ba8b6]'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ── TAB DOCUMENTOS ──────────────────────────────── */}
      {tab === 'documentos' && (
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">
            Guías de Remisión Electrónica generadas ({docs.length})
          </div>
          {docs.length === 0 ? (
            <div className="text-center py-10 text-[#5f6f80] text-[12px]">
              Ve a la pestaña "Generar desde despachos" para crear los documentos electrónicos.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/8">
              <table className="w-full border-collapse text-[12px]">
                <thead><tr><TH c="N° Guía"/><TH c="Cliente"/><TH c="Fecha"/><TH c="Estado SUNAT"/><TH c="Acciones"/></tr></thead>
                <tbody>
                  {docs.map(doc => {
                    const meta   = ESTADO_META[doc.estado] || ESTADO_META.PENDIENTE
                    const cli    = clientes.find(c => c.id === (doc.despacho?.clienteId || doc.clienteId))
                    const nombre = cli?.razonSocial || doc.despacho?.cliente?.razonSocial || '—'
                    const fecha  = doc.despacho?.fechaDespacho || doc.createdAt
                    return (
                      <tr key={doc.id} className="border-b border-white/5 last:border-0 hover:bg-white/2">
                        <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#00c896] font-bold">{doc.guiaNumero}</td>
                        <td className="px-3.5 py-2.5 text-[#e8edf2]">{nombre}</td>
                        <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#9ba8b6]">{formatDate(fecha)}</td>
                        <td className="px-3.5 py-2.5"><Badge variant={meta.color}>{meta.label}</Badge></td>
                        <td className="px-3.5 py-2.5">
                          <div className="flex gap-1.5 flex-wrap">
                            <Btn variant="ghost" size="sm" onClick={() => abrirPreview(doc)}>
                              <Eye size={11}/> Ver JSON
                            </Btn>
                            <Btn variant="ghost" size="sm" onClick={() => descargarDocJSON(doc)}>
                              <Download size={11}/> Descargar
                            </Btn>
                            {doc.estado === 'PENDIENTE' && (
                              <Btn variant="primary" size="sm" onClick={() => handleMarcarEnviado(doc)}>
                                <Send size={11}/> Marcar enviado
                              </Btn>
                            )}
                            {doc.estado === 'ENVIADO' && (
                              <>
                                <Btn variant="ghost" size="sm" className="text-green-400"
                                  onClick={() => handleMarcarAceptado(doc)}>✓ Aceptado</Btn>
                                <Btn variant="ghost" size="sm" className="text-red-400"
                                  onClick={() => { setRechazandoId(doc.despachoId); setMotivoRechazado('') }}>
                                  ✕ Rechazado
                                </Btn>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB GENERAR ─────────────────────────────────── */}
      {tab === 'generar' && (
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">
            Despachos con guía de remisión — generar JSON electrónico
          </div>
          {despConGuia.length === 0 ? (
            <div className="text-center py-8 text-[12px] text-[#5f6f80]">
              No hay despachos despachados aún. Los despachos con guía de remisión aparecen aquí.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/8">
              <table className="w-full border-collapse text-[12px]">
                <thead><tr><TH c="N° Guía"/><TH c="Despacho"/><TH c="Cliente"/><TH c="Fecha despacho"/><TH c="Estado despacho"/><TH c="JSON GRE"/></tr></thead>
                <tbody>
                  {despConGuia.map(des => {
                    const cli    = clientes.find(c=>c.id===des.clienteId)
                    const docGen = docs.find(d=>d.despachoId===des.id)
                    return (
                      <tr key={des.id} className="border-b border-white/5 last:border-0 hover:bg-white/2">
                        <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#00c896] font-bold">{des.guiaNumero}</td>
                        <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#9ba8b6]">{des.numero}</td>
                        <td className="px-3.5 py-2.5 text-[#e8edf2]">{cli?.razonSocial?.slice(0,25)||'—'}</td>
                        <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#9ba8b6]">{formatDate(des.fechaDespacho||des.fecha)}</td>
                        <td className="px-3.5 py-2.5">
                          <Badge variant={{ENTREGADO:'success',DESPACHADO:'info',CANCELADO:'danger'}[des.estado]||'neutral'}>{des.estado}</Badge>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <div className="flex gap-1.5 items-center">
                            <Btn variant="primary" size="sm"
                              disabled={generarDocumento.isPending}
                              onClick={() => generarDoc(des)}>
                              <FileText size={11}/> {docGen ? 'Regenerar' : 'Generar JSON'}
                            </Btn>
                            {docGen && (
                              <Badge variant={ESTADO_META[docGen.estado]?.color||'neutral'}>
                                {ESTADO_META[docGen.estado]?.label}
                              </Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB GUÍA DE INTEGRACIÓN ──────────────────────── */}
      {tab === 'guia' && (
        <div className="flex flex-col gap-4">
          <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
            <div className="text-[13px] font-semibold text-[#e8edf2] mb-4">Proveedores OSE recomendados para PyMEs peruanas</div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {[
                { name:'Nubefact', url:'https://nubefact.com', precio:'Desde S/ 0 (plan gratuito)', pros:['API REST bien documentada','SDK PHP y Node.js','Soporte técnico en español','Panel web incluido'], color:'#3b82f6' },
                { name:'Factura.com', url:'https://factura.com.pe', precio:'Desde S/ 29/mes', pros:['Más fácil de integrar','Plan por volumen de docs','Validación en tiempo real','Notificaciones automáticas'], color:'#00c896' },
                { name:'SUNAT REST API', url:'https://cpe.sunat.gob.pe', precio:'Gratuito (directo SUNAT)', pros:['Sin intermediario','Documentación SUNAT oficial','Requiere certificado digital','Más complejo de implementar'], color:'#f59e0b' },
              ].map(o => (
                <div key={o.name} className="bg-[#1a2230] rounded-xl p-4 border border-white/7">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[14px] font-bold text-[#e8edf2]">{o.name}</div>
                    <a href={o.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] text-[#5f6f80] hover:text-[#00c896] transition-colors">
                      <ExternalLink size={10}/> Visitar
                    </a>
                  </div>
                  <div className="text-[11px] text-[#00c896] font-medium mb-3">{o.precio}</div>
                  <div className="flex flex-col gap-1.5">
                    {o.pros.map(p => (
                      <div key={p} className="flex items-start gap-2 text-[11px] text-[#9ba8b6]">
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: o.color }}/>
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
            <div className="text-[13px] font-semibold text-[#e8edf2] mb-4">Pasos para activar el envío automático</div>
            <div className="flex flex-col gap-3">
              {[
                { paso:'1', titulo:'Obtener credenciales OSE', desc:'Crea una cuenta en el OSE elegido (Nubefact recomendado). Obtén el token de API desde su panel de control.', estado:'listo' },
                { paso:'2', titulo:'Configurar en StockPro', desc:'Ve a Configuración → SUNAT → ingresa tu RUC, token API, ambiente (Beta/Producción) y serie de guías (T001).', estado:'pendiente' },
                { paso:'3', titulo:'Activar envío automático', desc:'Con las credenciales configuradas, el botón "Marcar enviado" se reemplaza por "Enviar al OSE" que hace la llamada API automáticamente.', estado:'pendiente' },
                { paso:'4', titulo:'Monitorear respuestas', desc:'SUNAT responde con código de aceptación o rechazo. StockPro actualiza el estado del documento y guarda el CDR (comprobante digital).', estado:'pendiente' },
              ].map(({ paso, titulo, desc, estado }) => (
                <div key={paso} className="flex items-start gap-4 p-3.5 bg-[#1a2230] rounded-xl border border-white/7">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[13px] shrink-0 ${estado==='listo'?'bg-[#00c896]/20 text-[#00c896]':'bg-[#1e2835] text-[#5f6f80]'}`}>
                    {estado === 'listo' ? <CheckCircle size={16}/> : paso}
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-[#e8edf2] mb-0.5">{titulo}</div>
                    <div className="text-[11px] text-[#5f6f80] leading-relaxed">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
            <div className="text-[13px] font-semibold text-[#e8edf2] mb-3">Ejemplo de llamada a Nubefact (Node.js)</div>
            <pre className="bg-[#0e1117] rounded-xl p-4 text-[11px] text-[#00c896] font-mono overflow-x-auto leading-relaxed border border-white/6">{`// Enviar GRE a Nubefact
const response = await fetch('https://api.nubefact.com/v1/guia-remision', {
  method: 'POST',
  headers: {
    'Authorization': 'Token TU_TOKEN_NUBEFACT',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(jsonGRE), // el JSON generado por StockPro
})

const result = await response.json()
if (result.aceptada) {
  // Guardar CDR y marcar como ACEPTADA en StockPro
  await api.post(\`/sunat/documentos/\${despachoId}/marcar-aceptado\`)
} else {
  // Mostrar error de SUNAT
  toast(result.descripcion_error, 'error')
}`}</pre>
          </div>
        </div>
      )}

      {/* Modal Preview JSON */}
      {preview && (
        <Modal open title={`JSON GRE — ${preview.guiaNumero}`} onClose={() => setPreview(null)} size="xl"
          footer={<>
            <Btn variant="secondary" onClick={() => setPreview(null)}>Cerrar</Btn>
            <Btn variant="ghost" onClick={() => copiarJSON(preview)}>
              <Copy size={13}/> {copied ? '¡Copiado!' : 'Copiar JSON'}
            </Btn>
            <Btn variant="primary" onClick={() => descargarJSON(preview)}>
              <Download size={13}/> Descargar .json
            </Btn>
          </>}>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={ESTADO_META[preview.estado]?.color||'neutral'}>{ESTADO_META[preview.estado]?.label}</Badge>
            <span className="text-[11px] text-[#5f6f80]">Compatible con Nubefact · Factura.com · SUNAT REST</span>
          </div>
          <pre className="bg-[#0e1117] rounded-xl p-4 text-[11px] text-[#00c896] font-mono overflow-auto max-h-[55vh] leading-relaxed border border-white/6">
            {preview.json}
          </pre>
        </Modal>
      )}

      {/* Modal Rechazar */}
      {rechazandoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#161d28] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 flex flex-col gap-4">
            <div className="text-[14px] font-semibold text-[#e8edf2]">Marcar como rechazado por SUNAT</div>
            <div>
              <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1.5">
                Motivo del rechazo (opcional)
              </label>
              <textarea className={SI + ' resize-none'} rows={2}
                value={motivoRechazado}
                onChange={e => setMotivoRechazado(e.target.value)}
                placeholder="Ej: Código de producto inválido, error en RUC destinatario..."/>
            </div>
            <div className="flex justify-end gap-2">
              <Btn variant="secondary" onClick={() => setRechazandoId(null)}>Cancelar</Btn>
              <Btn variant="danger" onClick={handleConfirmarRechazado}>Confirmar rechazo</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
