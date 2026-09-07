import { useMemo, useState } from 'react'
import {
  Plus, DollarSign, Phone, Mail, MessageSquare,
  Users as UsersIcon, Video, FileText, ChevronRight, Clock,
  Trophy, XCircle, Link2, AlertOctagon, Filter, Target, ArrowRightLeft, UserCog,
  LayoutGrid, List,
} from 'lucide-react'
import { useApp } from '../store/AppContext'
import {
  Badge, Btn, EmptyState, Modal, Field, Input, Select,
  Textarea, Spinner, LineaTiempo, Th, Td,
} from '../components/ui/index'
import { formatCurrency, formatDate } from '../utils/helpers'
import {
  useOportunidadesList, useOportunidad, useCrearOportunidad, useCambiarEstadoOportunidad,
  useRegistrarActividad, useVincularProforma, useResponsablesOportunidad, useActualizarOportunidad,
  useRendimientoPorVendedor,
} from '../queries/oportunidades.queries'
import { useClientesList } from '../queries/clientes.queries'
import { useProformasList } from '../queries/proformas.queries'

// ── Configuración de estados (colores/labels compartidos en toda la pantalla) ──
const ESTADOS = {
  NUEVA:          { label: 'Nueva',          color: '#3b82f6', icon: '✦' },
  CALIFICADA:     { label: 'Calificada',     color: '#8b5cf6', icon: '◐' },
  COTIZADA:       { label: 'Cotizada',       color: '#f59e0b', icon: '$' },
  EN_NEGOCIACION: { label: 'En Negociación', color: '#f97316', icon: '⇄' },
  GANADA:         { label: 'Ganada',         color: '#10b981', icon: '✓' },
  PERDIDA:        { label: 'Perdida',        color: '#ef4444', icon: '✕' },
  CANCELADA:      { label: 'Cancelada',      color: '#6b7280', icon: '–' },
}
const COLUMNAS_PIPELINE = ['NUEVA', 'CALIFICADA', 'COTIZADA', 'EN_NEGOCIACION']
const ESTADOS_CERRADOS = ['GANADA', 'PERDIDA', 'CANCELADA']
const FLUJO_LINEA_TIEMPO = COLUMNAS_PIPELINE.map(id => ({ id, ...ESTADOS[id] })).concat([{ id: 'GANADA', ...ESTADOS.GANADA }])
const FLUJO_CANCELADO = [{ id: 'PERDIDA', ...ESTADOS.PERDIDA }]

const TIPOS_ACTIVIDAD = {
  LLAMADA:               { label: 'Llamada',              icon: Phone },
  WHATSAPP:              { label: 'WhatsApp',             icon: MessageSquare },
  EMAIL:                 { label: 'Email',                icon: Mail },
  REUNION:               { label: 'Reunión',              icon: UsersIcon },
  VISITA:                { label: 'Visita',                icon: UsersIcon },
  VIDEOLLAMADA:          { label: 'Videollamada',          icon: Video },
  COTIZACION_ENVIADA:    { label: 'Cotización enviada',    icon: FileText },
  COTIZACION_MODIFICADA: { label: 'Cotización modificada', icon: FileText },
  NEGOCIACION:           { label: 'Negociación',           icon: DollarSign },
  OTRO:                  { label: 'Otro',                  icon: Clock },
}

const MOTIVOS_PERDIDA_SUGERIDOS = [
  'Precio muy alto', 'Eligió a la competencia', 'Proyecto cancelado por el cliente',
  'Sin respuesta del cliente', 'Fuera de presupuesto', 'Tiempo de entrega', 'Otro',
]

const FUENTES_SUGERIDAS = [
  'Referido', 'Página web', 'Facebook', 'Instagram', 'TikTok', 'WhatsApp',
  'Llamada en frío', 'Feria / Evento', 'Publicidad (Google/Medios)', 'Cliente recurrente', 'Otro',
]

function diasDesde(fecha) {
  if (!fecha) return null
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000)
}

function SemaforoActividad({ fechaUltimaActividad }) {
  const dias = diasDesde(fechaUltimaActividad)
  if (dias === null) return <Badge variant="neutral">Sin actividad</Badge>
  if (dias <= 3) return <Badge variant="success">Al día</Badge>
  if (dias <= 7) return <Badge variant="warning">{dias}d sin seguimiento</Badge>
  return <Badge variant="danger">{dias}d — atención</Badge>
}

// class-validator's @IsOptional() solo omite la validación si el valor es
// undefined/null -- un string vacío '' (lo que deja un <input type="date">
// sin tocar) SIGUE pasando a @IsDateString() y lo rechaza con 400. Limpia
// los campos de fecha opcionales antes de enviar cualquier payload.
function limpiarFechasVacias(obj, campos) {
  const limpio = { ...obj }
  for (const campo of campos) if (limpio[campo] === '') limpio[campo] = undefined
  return limpio
}

// ═══════════════════════════════════════════════════════════════════════
// Tarjeta de oportunidad (pipeline)
// ═══════════════════════════════════════════════════════════════════════
function TarjetaOportunidad({ op, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex flex-col gap-2 p-3.5 rounded-xl border border-white/8 bg-[#1a2230] transition-colors hover:border-white/20"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-mono text-[#5f6f80]">{op.codigo}</span>
        <SemaforoActividad fechaUltimaActividad={op.fechaUltimaActividad} />
      </div>
      <div className="text-[13.5px] font-semibold leading-snug text-[#e8edf2]">{op.cliente?.razonSocial}</div>
      <div className="text-[12px] text-[#9ba8b6] line-clamp-2">{op.descripcion}</div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[13px] font-mono font-semibold text-[#00c896]">{formatCurrency(op.valorEstimado)}</span>
        <span className="text-[11px] text-[#5f6f80]">{op.responsable?.nombre?.split(' ')[0]}</span>
      </div>
      {op.proximaAccion && (
        <div className="flex items-center gap-1.5 text-[11px] pt-1.5 border-t border-white/6 text-[#9ba8b6]">
          <Clock size={11} /> {op.proximaAccion}
        </div>
      )}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Vista de pipeline en tabla (alternativa compacta a las tarjetas)
// ═══════════════════════════════════════════════════════════════════════
// Rango de urgencia para ordenar por "Seguimiento": sin actividad se trata
// como equivalente a ~8 días (mismo umbral que el semáforo rojo) para que
// no quede escondida al fondo de la lista.
function rankSeguimiento(fecha) {
  const dias = diasDesde(fecha)
  return dias === null ? 8 : dias
}

function TablaPipeline({ porEstado, onSelect }) {
  const [orden, setOrden] = useState({ campo: 'etapa', dir: 'asc' })

  const filas = useMemo(() => {
    const base = COLUMNAS_PIPELINE.flatMap(col => porEstado[col] || [])
    const dir = orden.dir === 'asc' ? 1 : -1
    const cmp = {
      etapa:       (a, b) => (COLUMNAS_PIPELINE.indexOf(a.estado) - COLUMNAS_PIPELINE.indexOf(b.estado))
                             || (Number(b.valorEstimado || 0) - Number(a.valorEstimado || 0)),
      cliente:     (a, b) => (a.cliente?.razonSocial || '').localeCompare(b.cliente?.razonSocial || '', 'es'),
      valor:       (a, b) => Number(a.valorEstimado || 0) - Number(b.valorEstimado || 0),
      responsable: (a, b) => (a.responsable?.nombre || '').localeCompare(b.responsable?.nombre || '', 'es'),
      seguimiento: (a, b) => rankSeguimiento(a.fechaUltimaActividad) - rankSeguimiento(b.fechaUltimaActividad),
    }[orden.campo] || (() => 0)
    return [...base].sort((a, b) => cmp(a, b) * dir || 0)
  }, [porEstado, orden])

  function toggle(campo) {
    setOrden(o => ({ campo, dir: o.campo === campo && o.dir === 'asc' ? 'desc' : 'asc' }))
  }
  const flecha = campo => (orden.campo === campo ? (orden.dir === 'asc' ? ' ↑' : ' ↓') : '')

  if (filas.length === 0) {
    return <div className="text-center py-10 text-[12px] text-[#5f6f80]">Sin oportunidades abiertas.</div>
  }

  return (
    <div className="overflow-auto rounded-xl border border-white/8" style={{ maxHeight: 560 }}>
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            <Th onClick={() => toggle('etapa')}>Etapa{flecha('etapa')}</Th>
            <Th>Código</Th>
            <Th onClick={() => toggle('cliente')}>Cliente{flecha('cliente')}</Th>
            <Th>Descripción</Th>
            <Th right onClick={() => toggle('valor')}>Valor est.{flecha('valor')}</Th>
            <Th onClick={() => toggle('responsable')}>Responsable{flecha('responsable')}</Th>
            <Th onClick={() => toggle('seguimiento')}>Seguimiento{flecha('seguimiento')}</Th>
            <Th>Próxima acción</Th>
          </tr>
        </thead>
        <tbody>
          {filas.map(op => {
            const est = ESTADOS[op.estado] || {}
            return (
              <tr key={op.id} onClick={() => onSelect(op.id)}
                className="border-b border-white/6 last:border-0 cursor-pointer hover:bg-white/5 transition-colors">
                <Td>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
                    style={{ color: est.color, background: `${est.color}1a` }}>
                    {est.icon} {est.label}
                  </span>
                </Td>
                <Td mono muted>{op.codigo}</Td>
                <Td className="font-medium whitespace-nowrap">{op.cliente?.razonSocial}</Td>
                <Td muted><span className="block max-w-[280px] truncate">{op.descripcion}</span></Td>
                <Td right mono className="font-semibold text-[#00c896] whitespace-nowrap">{formatCurrency(op.valorEstimado)}</Td>
                <Td muted className="whitespace-nowrap">{op.responsable?.nombre?.split(' ')[0]}</Td>
                <Td><SemaforoActividad fechaUltimaActividad={op.fechaUltimaActividad} /></Td>
                <Td muted>
                  {op.proximaAccion
                    ? <span className="inline-flex items-center gap-1 whitespace-nowrap"><Clock size={11} /> {op.proximaAccion}</span>
                    : <span className="text-[#5f6f80]">—</span>}
                </Td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Modal: Nueva oportunidad
// ═══════════════════════════════════════════════════════════════════════
function ModalNuevaOportunidad({ open, onClose }) {
  const { sesion, toast } = useApp()
  const esVendedorBase = sesion?.rol?.codigo === 'ejecutivo-comercial'
  const { data: clientes = [] } = useClientesList({ enabled: open })
  const { data: usuarios = [] } = useResponsablesOportunidad({ enabled: open && !esVendedorBase })
  const crear = useCrearOportunidad()

  const [form, setForm] = useState(() => ({
    clienteId: '', contacto: '', descripcion: '', necesidad: '',
    responsableId: sesion?.id || '', valorEstimado: '', fuente: '',
    fechaEstimadaCierre: '', observaciones: '',
  }))
  const [fuenteCustom, setFuenteCustom] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function guardar() {
    if (!form.clienteId || !form.descripcion.trim() || !form.responsableId || !form.valorEstimado) {
      toast('Cliente, descripción, responsable y valor estimado son obligatorios', 'error')
      return
    }
    const fuenteFinal = form.fuente === 'Otro' ? fuenteCustom : form.fuente
    const r = await crear.mutateAsync(limpiarFechasVacias({ ...form, fuente: fuenteFinal, valorEstimado: Number(form.valorEstimado) }, ['fechaEstimadaCierre']))
    if (r.error) { toast(r.error, 'error'); return }
    toast('Oportunidad creada', 'success')
    onClose()
    setForm({ clienteId: '', contacto: '', descripcion: '', necesidad: '', responsableId: sesion?.id || '', valorEstimado: '', fuente: '', fechaEstimadaCierre: '', observaciones: '' })
    setFuenteCustom('')
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva oportunidad" size="lg"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={guardar} disabled={crear.isPending}>Crear oportunidad</Btn></>}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Cliente *">
          <Select value={form.clienteId} onChange={e => set('clienteId', e.target.value)}>
            <option value="">Selecciona un cliente...</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.razonSocial}</option>)}
          </Select>
        </Field>
        <Field label="Contacto puntual" hint="Si difiere del contacto general del cliente">
          <Input value={form.contacto} onChange={e => set('contacto', e.target.value)} placeholder="Nombre de la persona de contacto" />
        </Field>
      </div>
      <Field label="Descripción *">
        <Textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)} placeholder="¿Qué necesita el cliente?" />
      </Field>
      <Field label="Necesidad detectada">
        <Textarea value={form.necesidad} onChange={e => set('necesidad', e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        {esVendedorBase ? (
          <Field label="Responsable">
            <Input value={sesion?.nombre || ''} disabled/>
            <span className="text-[10px] text-[#5f6f80] mt-1">Solo Gerente de Operaciones, Admin o Propietario pueden crear oportunidades a nombre de otro vendedor</span>
          </Field>
        ) : (
          <Field label="Responsable *">
            <Select value={form.responsableId} onChange={e => set('responsableId', e.target.value)}>
              <option value="">Selecciona...</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Valor estimado (S/) *">
          <Input type="number" min="0" value={form.valorEstimado} onChange={e => set('valorEstimado', e.target.value)} placeholder="0" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Fuente / origen">
          <Select value={form.fuente} onChange={e => set('fuente', e.target.value)}>
            <option value="">Sin especificar</option>
            {FUENTES_SUGERIDAS.map(f => <option key={f} value={f}>{f}</option>)}
          </Select>
          {form.fuente === 'Otro' && (
            <Input className="mt-2" value={fuenteCustom} onChange={e => setFuenteCustom(e.target.value)} placeholder="Especifica la fuente" />
          )}
        </Field>
        <Field label="Fecha estimada de cierre">
          <Input type="date" value={form.fechaEstimadaCierre} onChange={e => set('fechaEstimadaCierre', e.target.value)} />
        </Field>
      </div>
      <Field label="Observaciones">
        <Textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)} />
      </Field>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Modal: Registrar actividad
// ═══════════════════════════════════════════════════════════════════════
function ModalRegistrarActividad({ open, onClose, oportunidadId }) {
  const { toast } = useApp()
  const registrar = useRegistrarActividad()
  const [form, setForm] = useState({ tipo: 'LLAMADA', resultado: '', comentarios: '', proximaAccion: '', fechaProximaAccion: '' })

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function guardar() {
    if (!form.resultado.trim()) { toast('Describe el resultado de la actividad', 'error'); return }
    const r = await registrar.mutateAsync(limpiarFechasVacias({ id: oportunidadId, ...form }, ['fechaProximaAccion']))
    if (r.error) { toast(r.error, 'error'); return }
    toast('Actividad registrada', 'success')
    onClose()
    setForm({ tipo: 'LLAMADA', resultado: '', comentarios: '', proximaAccion: '', fechaProximaAccion: '' })
  }

  return (
    <Modal open={open} onClose={onClose} title="Registrar actividad" size="md"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={guardar} disabled={registrar.isPending}>Guardar</Btn></>}>
      <Field label="Tipo de actividad">
        <Select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
          {Object.entries(TIPOS_ACTIVIDAD).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
      </Field>
      <Field label="Resultado *" hint="¿Qué pasó en esta interacción?">
        <Textarea value={form.resultado} onChange={e => set('resultado', e.target.value)} />
      </Field>
      <Field label="Comentarios adicionales">
        <Textarea value={form.comentarios} onChange={e => set('comentarios', e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Próxima acción">
          <Input value={form.proximaAccion} onChange={e => set('proximaAccion', e.target.value)} placeholder="Ej: Enviar cotización" />
        </Field>
        <Field label="Fecha de la próxima acción">
          <Input type="date" value={form.fechaProximaAccion} onChange={e => set('fechaProximaAccion', e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Modal: Cambiar estado (cierre)
// ═══════════════════════════════════════════════════════════════════════
function ModalCambiarEstado({ open, onClose, oportunidadId, estadoDestino }) {
  const { toast } = useApp()
  const cambiar = useCambiarEstadoOportunidad()
  const [motivo, setMotivo] = useState('')
  const [motivoCustom, setMotivoCustom] = useState('')
  const esPerdida = estadoDestino === 'PERDIDA'

  async function confirmar() {
    const motivoFinal = motivo === 'Otro' ? motivoCustom : motivo
    if (esPerdida && !motivoFinal.trim()) { toast('El motivo de pérdida es obligatorio', 'error'); return }
    const r = await cambiar.mutateAsync({ id: oportunidadId, estado: estadoDestino, motivoPerdida: esPerdida ? motivoFinal : undefined })
    if (r.error) { toast(r.error, 'error'); return }
    toast(
      ESTADOS_CERRADOS.includes(estadoDestino)
        ? `Oportunidad marcada como ${ESTADOS[estadoDestino]?.label}`
        : `Oportunidad movida a "${ESTADOS[estadoDestino]?.label}"`,
      'success',
    )
    onClose()
    setMotivo(''); setMotivoCustom('')
  }

  if (!estadoDestino) return null
  const esCierre = ESTADOS_CERRADOS.includes(estadoDestino)
  return (
    <Modal open={open} onClose={onClose} title={esCierre ? `Marcar como ${ESTADOS[estadoDestino]?.label}` : `Mover a "${ESTADOS[estadoDestino]?.label}"`} size="sm"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn variant={esPerdida ? 'danger' : 'primary'} onClick={confirmar} disabled={cambiar.isPending}>Confirmar</Btn></>}>
      {esPerdida ? (
        <>
          <Field label="Motivo de pérdida *">
            <Select value={motivo} onChange={e => setMotivo(e.target.value)}>
              <option value="">Selecciona un motivo...</option>
              {MOTIVOS_PERDIDA_SUGERIDOS.map(m => <option key={m} value={m}>{m}</option>)}
            </Select>
          </Field>
          {motivo === 'Otro' && (
            <Field label="Especifica el motivo">
              <Textarea value={motivoCustom} onChange={e => setMotivoCustom(e.target.value)} />
            </Field>
          )}
        </>
      ) : esCierre ? (
        <p className="text-[13px] text-[#9ba8b6]">
          Esta acción cierra la oportunidad como <strong className="text-[#e8edf2]">{ESTADOS[estadoDestino]?.label}</strong> y ya no podrá editarse.
        </p>
      ) : (
        <p className="text-[13px] text-[#9ba8b6]">
          La oportunidad pasará a la etapa <strong className="text-[#e8edf2]">{ESTADOS[estadoDestino]?.label}</strong>. Sigue abierta — puedes seguir registrando actividades y cambiarla de etapa cuando quieras.
        </p>
      )}
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Modal: Vincular cotización existente
// ═══════════════════════════════════════════════════════════════════════
function ModalVincularProforma({ open, onClose, oportunidad }) {
  const { toast } = useApp()
  const { data: proformas = [] } = useProformasList({ clienteId: oportunidad?.clienteId })
  const vincular = useVincularProforma()
  const [proformaId, setProformaId] = useState('')

  const disponibles = useMemo(() => proformas.filter(p => !p.oportunidadId), [proformas])

  async function confirmar() {
    if (!proformaId) { toast('Selecciona una cotización', 'error'); return }
    const r = await vincular.mutateAsync({ id: oportunidad.id, proformaId })
    if (r.error) { toast(r.error, 'error'); return }
    toast('Cotización vinculada', 'success')
    onClose()
    setProformaId('')
  }

  return (
    <Modal open={open} onClose={onClose} title="Vincular cotización existente" size="sm"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={confirmar} disabled={vincular.isPending}>Vincular</Btn></>}>
      {disponibles.length === 0 ? (
        <EmptyState icon={FileText} title="Sin cotizaciones disponibles" description="Este cliente no tiene proformas sin vincular. Crea una nueva desde Proformas." />
      ) : (
        <Field label="Cotización">
          <Select value={proformaId} onChange={e => setProformaId(e.target.value)}>
            <option value="">Selecciona...</option>
            {disponibles.map(p => <option key={p.id} value={p.id}>{p.numero} — {formatCurrency(p.total)}</option>)}
          </Select>
        </Field>
      )}
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Modal: Reasignar responsable (transferir la oportunidad a otro vendedor)
// ═══════════════════════════════════════════════════════════════════════
function ModalReasignarResponsable({ open, onClose, oportunidad }) {
  const { toast } = useApp()
  const { data: usuarios = [] } = useResponsablesOportunidad({ enabled: open })
  const actualizar = useActualizarOportunidad()
  const [responsableId, setResponsableId] = useState(oportunidad?.responsableId || oportunidad?.responsable?.id || '')

  const otros = useMemo(() => usuarios.filter(u => u.id !== (oportunidad?.responsable?.id || oportunidad?.responsableId)), [usuarios, oportunidad])

  async function confirmar() {
    if (!responsableId) { toast('Selecciona un vendedor', 'error'); return }
    const r = await actualizar.mutateAsync({ id: oportunidad.id, responsableId })
    if (r.error) { toast(r.error, 'error'); return }
    toast('Oportunidad reasignada', 'success')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Reasignar responsable" size="sm"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={confirmar} disabled={actualizar.isPending || !responsableId}>Reasignar</Btn></>}>
      <p className="text-[12.5px] text-[#9ba8b6] mb-1">
        Responsable actual: <strong className="text-[#e8edf2]">{oportunidad?.responsable?.nombre}</strong>
      </p>
      {otros.length === 0 ? (
        <EmptyState icon={UserCog} title="Sin otro vendedor disponible" description="No hay otro usuario con acceso a Oportunidades en esta empresa todavía." />
      ) : (
        <Field label="Nuevo responsable">
          <Select value={responsableId} onChange={e => setResponsableId(e.target.value)}>
            <option value="">Selecciona...</option>
            {otros.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </Select>
        </Field>
      )}
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Panel de detalle de una oportunidad
// ═══════════════════════════════════════════════════════════════════════
function DetalleOportunidad({ id, onClose }) {
  const { sesion } = useApp()
  const esVendedorBase = sesion?.rol?.codigo === 'ejecutivo-comercial'
  const { data: op, isLoading, isError, error } = useOportunidad(id)
  const [modalActividad, setModalActividad] = useState(false)
  const [modalVincular, setModalVincular] = useState(false)
  const [modalReasignar, setModalReasignar] = useState(false)
  const [estadoDestino, setEstadoDestino] = useState(null)

  if (isLoading) {
    return <Modal open onClose={onClose} title="Cargando..."><Spinner /></Modal>
  }

  if (isError || !op) {
    return (
      <Modal open onClose={onClose} title="No se pudo cargar">
        <EmptyState
          icon={AlertOctagon}
          title="Error al cargar la oportunidad"
          description={error?.message || 'La oportunidad no existe o no se pudo obtener. Intenta cerrar y volver a abrirla.'}
        />
      </Modal>
    )
  }

  const esFinal = ['GANADA', 'PERDIDA', 'CANCELADA'].includes(op.estado)

  return (
    <>
      <Modal open onClose={onClose} title={`${op.codigo} — ${op.cliente?.razonSocial}`} size="xl">
        <div>
          <LineaTiempo
            flujo={FLUJO_LINEA_TIEMPO}
            flujoCancelado={FLUJO_CANCELADO}
            estadoActual={op.estado === 'CANCELADA' ? 'PERDIDA' : op.estado}
            cancelado={['PERDIDA', 'CANCELADA'].includes(op.estado)}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#1a2230] rounded-lg px-3.5 py-2.5">
            <div className="text-[10px] text-[#5f6f80] uppercase tracking-wide mb-0.5">Valor estimado</div>
            <div className="text-[16px] font-mono font-bold text-[#00c896]">{formatCurrency(op.valorEstimado)}</div>
          </div>
          <div className="bg-[#1a2230] rounded-lg px-3.5 py-2.5">
            <div className="text-[10px] text-[#5f6f80] uppercase tracking-wide mb-0.5">Probabilidad</div>
            <div className="text-[16px] font-bold text-[#e8edf2]">{op.probabilidad}%</div>
          </div>
          <div className="bg-[#1a2230] rounded-lg px-3.5 py-2.5">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className="text-[10px] text-[#5f6f80] uppercase tracking-wide">Responsable</span>
              {!esFinal && !esVendedorBase && (
                <button onClick={() => setModalReasignar(true)} title="Reasignar a otro vendedor"
                  className="text-[#5f6f80] hover:text-[#00c896] transition-colors shrink-0">
                  <UserCog size={13}/>
                </button>
              )}
            </div>
            <div className="text-[14px] font-semibold text-[#e8edf2]">{op.responsable?.nombre}</div>
          </div>
        </div>

        {op.motivoPerdida && (
          <div className="px-3.5 py-2.5 rounded-lg text-[12.5px]" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
            <strong>Motivo de pérdida:</strong> {op.motivoPerdida}
          </div>
        )}

        <div>
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide mb-1.5">Descripción</div>
          <p className="text-[13px] text-[#9ba8b6]">{op.descripcion}</p>
        </div>

        {!esFinal && (
          <div className="flex flex-wrap items-center gap-2">
            <Btn variant="primary" onClick={() => setModalActividad(true)}><Clock size={13} /> Registrar actividad</Btn>
            {op.estado === 'NUEVA' && (
              <Btn
                variant="secondary"
                disabled={!op.fechaUltimaActividad}
                title={!op.fechaUltimaActividad ? 'Registra un seguimiento antes de calificar' : undefined}
                onClick={() => setEstadoDestino('CALIFICADA')}
              ><Target size={13} /> Calificar oportunidad</Btn>
            )}
            <Btn variant="secondary" onClick={() => setModalVincular(true)}><Link2 size={13} /> Vincular cotización</Btn>
            {op.estado === 'COTIZADA' && (
              <Btn variant="secondary" onClick={() => setEstadoDestino('EN_NEGOCIACION')}><ArrowRightLeft size={13} /> Iniciar negociación</Btn>
            )}
            <Btn variant="secondary" onClick={() => setEstadoDestino('GANADA')}><Trophy size={13} /> Marcar ganada</Btn>
            <Btn variant="danger" onClick={() => setEstadoDestino('PERDIDA')}><XCircle size={13} /> Marcar perdida</Btn>
          </div>
        )}

        <div>
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide mb-2">Cotizaciones vinculadas ({op.proformas?.length || 0})</div>
          {op.proformas?.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {op.proformas.map(p => (
                <div key={p.id} className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-white/8">
                  <span className="text-[13px] font-medium text-[#e8edf2]">{p.numero} — {formatCurrency(p.total)}</span>
                  <Badge variant="neutral">{p.estado}</Badge>
                </div>
              ))}
            </div>
          ) : <p className="text-[12px] text-[#5f6f80]">Sin cotizaciones vinculadas todavía.</p>}
        </div>

        <div>
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide mb-2">Historial de actividades ({op.actividades?.length || 0})</div>
          {op.actividades?.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {op.actividades.map(a => {
                const Icon = TIPOS_ACTIVIDAD[a.tipo]?.icon || Clock
                return (
                  <div key={a.id} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-[#00c896]/10">
                      <Icon size={13} className="text-[#00c896]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12.5px] font-semibold text-[#e8edf2]">{TIPOS_ACTIVIDAD[a.tipo]?.label}</span>
                        <span className="text-[11px] text-[#5f6f80]">{formatDate(a.fecha)} · {a.usuario?.nombre}</span>
                      </div>
                      <p className="text-[12.5px] text-[#9ba8b6]">{a.resultado}</p>
                      {a.proximaAccion && (
                        <div className="mt-1 text-[11.5px] flex items-center gap-1 text-[#00c896]">
                          <ChevronRight size={11} /> Próximo: {a.proximaAccion} {a.fechaProximaAccion && `(${formatDate(a.fechaProximaAccion)})`}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : <EmptyState icon={Clock} title="Sin actividades registradas" description="Registra la primera interacción con este cliente." />}
        </div>
      </Modal>

      <ModalRegistrarActividad open={modalActividad} onClose={() => setModalActividad(false)} oportunidadId={id} />
      <ModalVincularProforma open={modalVincular} onClose={() => setModalVincular(false)} oportunidad={op} />
      <ModalCambiarEstado open={!!estadoDestino} onClose={() => setEstadoDestino(null)} oportunidadId={id} estadoDestino={estadoDestino} />
      <ModalReasignarResponsable open={modalReasignar} onClose={() => setModalReasignar(false)} oportunidad={op} />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Página principal
// ═══════════════════════════════════════════════════════════════════════
export default function Oportunidades() {
  const { sesion } = useApp()
  // Un vendedor raso (Ejecutivo Comercial) ya no elige a quién ver — el
  // backend le fuerza `responsableId = él mismo` en cualquier caso (ver
  // oportunidades.service.ts#findAll) — el selector de abajo se oculta para
  // no sugerir una opción que en la práctica no existe.
  const esVendedorBase = sesion?.rol?.codigo === 'ejecutivo-comercial'
  const [filtroResponsable, setFiltroResponsable] = useState('')
  // Vista del pipeline: 'tarjetas' (kanban, por defecto) | 'tabla' (compacta).
  // La preferencia se recuerda por navegador para no re-elegirla cada visita.
  const [vista, setVista] = useState(() => {
    try { return localStorage.getItem('op_pipeline_vista') || 'tarjetas' } catch { return 'tarjetas' }
  })
  function cambiarVista(v) {
    setVista(v)
    try { localStorage.setItem('op_pipeline_vista', v) } catch { /* modo privado / storage bloqueado */ }
  }
  const [modalNueva, setModalNueva] = useState(false)
  const [seleccionada, setSeleccionada] = useState(null)
  const [verCerradas, setVerCerradas] = useState(null) // 'ganadas' | 'perdidas' | null
  const { data: usuarios = [] } = useResponsablesOportunidad({ enabled: !esVendedorBase })
  const { data: oportunidades = [], isLoading } = useOportunidadesList({ responsableId: filtroResponsable || undefined })

  const porEstado = useMemo(() => {
    const m = {}
    for (const col of COLUMNAS_PIPELINE) m[col] = []
    for (const op of oportunidades) if (m[op.estado]) m[op.estado].push(op)
    return m
  }, [oportunidades])

  const cerradas = useMemo(
    () => ({
      ganadas: oportunidades.filter(o => o.estado === 'GANADA'),
      perdidas: oportunidades.filter(o => o.estado === 'PERDIDA' || o.estado === 'CANCELADA'),
    }),
    [oportunidades],
  )

  const kpis = useMemo(() => {
    const abiertas = COLUMNAS_PIPELINE.reduce((s, col) => s + porEstado[col].length, 0)
    const valorPipeline = COLUMNAS_PIPELINE.reduce((s, col) => s + porEstado[col].reduce((ss, o) => ss + Number(o.valorEstimado || 0), 0), 0)
    const totalCerradas = cerradas.ganadas.length + cerradas.perdidas.length
    const tasaConversion = totalCerradas > 0 ? Math.round((cerradas.ganadas.length / totalCerradas) * 100) : 0
    const valorGanado = cerradas.ganadas.reduce((s, o) => s + Number(o.valorEstimado || 0), 0)
    return { abiertas, valorPipeline, tasaConversion, valorGanado }
  }, [porEstado, cerradas])

  // Rendimiento por vendedor — endpoint agregado propio (ver
  // oportunidades.service.ts#rendimientoPorVendedor): un vendedor raso ya no
  // puede pedir la lista de oportunidades de otro, pero SÍ puede comparar
  // números agregados (nunca detalle de cliente/descripción) contra el
  // equipo, incluida la meta mensual configurada por Admin/Owner.
  const { data: rendimientoRaw = [] } = useRendimientoPorVendedor()
  const rendimientoPorVendedor = useMemo(() =>
    rendimientoRaw.map(r => ({ ...r, meta: r.meta != null ? Number(r.meta) : null }))
  , [rendimientoRaw])

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['Oportunidades abiertas', kpis.abiertas,                              '#3b82f6', Filter],
          ['Pipeline abierto',       formatCurrency(kpis.valorPipeline),         '#00c896', DollarSign],
          ['Tasa de conversión',     `${kpis.tasaConversion}%`,                  '#8b5cf6', Trophy],
          ['Valor ganado',           formatCurrency(kpis.valorGanado),           '#22c55e', Target],
        ].map(([label, val, color, Icon]) => (
          <div key={label} className="relative bg-[#161d28] border border-white/8 rounded-xl px-4 py-3.5 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }} />
            <div className="flex items-center gap-1.5 mb-2">
              {Icon && <Icon size={12} style={{ color }} className="opacity-70" />}
              <span className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em]">{label}</span>
            </div>
            <div className={`font-semibold text-[#e8edf2] ${typeof val === 'number' ? 'text-[28px]' : 'text-[17px] font-mono'}`}>{val}</div>
          </div>
        ))}
      </div>

      {/* Pipeline */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Pipeline</span>
            <button onClick={() => cerradas.ganadas.length > 0 && setVerCerradas('ganadas')} disabled={cerradas.ganadas.length === 0}>
              <Badge variant="success">{cerradas.ganadas.length} ganadas</Badge>
            </button>
            <button onClick={() => cerradas.perdidas.length > 0 && setVerCerradas('perdidas')} disabled={cerradas.perdidas.length === 0}>
              <Badge variant="danger">{cerradas.perdidas.length} perdidas</Badge>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-[#1a2230] rounded-lg p-1">
              {['tarjetas', 'tabla'].map(v => {
                const Icon = v === 'tarjetas' ? LayoutGrid : List
                const lbl = v === 'tarjetas' ? 'Vista de tarjetas' : 'Vista de tabla'
                return (
                  <button key={v} type="button" onClick={() => cambiarVista(v)} title={lbl} aria-label={lbl} aria-pressed={vista === v}
                    className={`p-1.5 rounded-md transition-all ${vista === v ? 'bg-[#00c896]/15 text-[#00c896]' : 'text-[#5f6f80] hover:text-[#9ba8b6]'}`}>
                    <Icon size={14} />
                  </button>
                )
              })}
            </div>
            {!esVendedorBase && (
              <Select aria-label="Filtrar por responsable" style={{ width: 180, padding: '5px 8px', fontSize: 12 }} value={filtroResponsable} onChange={e => setFiltroResponsable(e.target.value)}>
                <option value="">Todos los responsables</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              </Select>
            )}
            <Btn variant="primary" size="sm" onClick={() => setModalNueva(true)}><Plus size={13} /> Nueva oportunidad</Btn>
          </div>
        </div>

        {isLoading ? <Spinner /> : oportunidades.length === 0 ? (
          <EmptyState icon={DollarSign} title="Sin oportunidades todavía" description="Crea la primera oportunidad para empezar a hacer seguimiento comercial." />
        ) : vista === 'tabla' ? (
          <TablaPipeline porEstado={porEstado} onSelect={setSeleccionada} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {COLUMNAS_PIPELINE.map(col => (
              <div key={col} className="flex flex-col gap-3 min-h-0">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[12.5px] font-semibold flex items-center gap-1.5" style={{ color: ESTADOS[col].color }}>
                    {ESTADOS[col].icon} {ESTADOS[col].label}
                  </span>
                  <Badge variant="neutral">{porEstado[col].length}</Badge>
                </div>
                {/* Scroll propio por columna: con muchas oportunidades la columna
                    ya no crece sin límite ni empuja las secciones de abajo. */}
                <div className="flex flex-col gap-2.5 overflow-y-auto pr-1 -mr-1" style={{ maxHeight: 620 }}>
                  {porEstado[col].map(op => (
                    <TarjetaOportunidad key={op.id} op={op} onClick={() => setSeleccionada(op.id)} />
                  ))}
                  {porEstado[col].length === 0 && (
                    <div className="text-center py-6 text-[11.5px] text-[#5f6f80]">Sin oportunidades</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rendimiento por vendedor */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">Rendimiento por vendedor</div>
        {rendimientoPorVendedor.length === 0 ? (
          <p className="text-[12px] text-[#5f6f80]">Sin datos todavía.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/8">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {['Vendedor', 'Abiertas', 'Pipeline', 'Ganadas', 'Valor ganado', 'Perdidas', 'Conversión', 'Meta del mes'].map(h => (
                    <th key={h} className="bg-[#1a2230] px-3.5 py-2 text-left text-[11px] font-semibold text-[#5f6f80] uppercase border-b border-white/8">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rendimientoPorVendedor.map(r => {
                  const totalCerr = r.ganadas + r.perdidas
                  const conv = totalCerr > 0 ? Math.round((r.ganadas / totalCerr) * 100) : null
                  const cumplioMeta = r.meta != null && r.meta > 0 ? r.valorGanadoMes >= r.meta : null
                  return (
                    <tr key={r.id} className="border-b border-white/6 last:border-0">
                      <td className="px-3.5 py-2.5 font-medium text-[#e8edf2]">{r.nombre}</td>
                      <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{r.abiertas}</td>
                      <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{formatCurrency(r.valorPipeline)}</td>
                      <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#22c55e]">{r.ganadas}</td>
                      <td className="px-3.5 py-2.5 font-mono text-[12px] font-semibold text-[#00c896]">{formatCurrency(r.valorGanado)}</td>
                      <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#ef4444]">{r.perdidas}</td>
                      <td className="px-3.5 py-2.5">{conv === null ? <span className="text-[#5f6f80] text-[12px]">—</span> : <Badge variant={conv >= 50 ? 'success' : 'warning'}>{conv}%</Badge>}</td>
                      <td className="px-3.5 py-2.5">
                        {cumplioMeta === null ? (
                          <span className="text-[#5f6f80] text-[12px]">Sin meta</span>
                        ) : (
                          <span className={`font-mono text-[12px] font-semibold ${cumplioMeta ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                            {formatCurrency(r.valorGanadoMes)} / {formatCurrency(r.meta)}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 px-3.5 py-2.5 bg-[#1a2230] rounded-lg text-[11px] text-[#5f6f80] flex items-start gap-2">
          <Target size={13} className="shrink-0 mt-0.5 text-[#5f6f80]" />
          <span>La meta mensual es opcional y se configura por vendedor desde Usuarios y Roles (solo Admin/Propietario) — un vendedor sin meta configurada no se compara contra ningún objetivo.</span>
        </div>
      </div>

      {/* Guía de uso */}
      <div className="bg-[#161d28] border border-white/6 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          ¿Cómo funciona el módulo de Oportunidades?
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          {[
            ['1. Nueva',          'Se registra la oportunidad con el cliente, la necesidad detectada y el valor estimado.'],
            ['2. Calificada',     'Registra el primer seguimiento y confirma que existe necesidad comercial real. Luego usa “Calificar oportunidad”.'],
            ['3. Cotizada',       'Se vincula una cotización real del módulo de Proformas — la oportunidad avanza automáticamente a este estado.'],
            ['4. En negociación', 'Idas y vueltas de precio/condiciones — se documentan como actividades con su resultado.'],
            ['5. Cierre',         'Se marca Ganada o Perdida (con motivo obligatorio). La oportunidad queda de solo lectura.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
              <div className="text-[11px] font-semibold text-[#e8edf2] mb-1.5">{t}</div>
              <div className="text-[11px] text-[#5f6f80] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>

      <ModalNuevaOportunidad open={modalNueva} onClose={() => setModalNueva(false)} />
      {seleccionada && <DetalleOportunidad id={seleccionada} onClose={() => setSeleccionada(null)} />}

      <Modal open={!!verCerradas} onClose={() => setVerCerradas(null)} title={verCerradas === 'ganadas' ? 'Oportunidades ganadas' : 'Oportunidades perdidas / canceladas'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {(verCerradas === 'ganadas' ? cerradas.ganadas : cerradas.perdidas).map(op => (
            <TarjetaOportunidad key={op.id} op={op} onClick={() => { setSeleccionada(op.id); setVerCerradas(null) }} />
          ))}
        </div>
      </Modal>
    </div>
  )
}
