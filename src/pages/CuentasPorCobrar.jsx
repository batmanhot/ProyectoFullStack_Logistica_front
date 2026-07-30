import { useState, useMemo, useEffect } from 'react'
import { Plus, Search, DollarSign, AlertTriangle, CheckCircle, Clock, Edit2, FileText, Download, X } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate } from '../utils/helpers'
import { Modal, EmptyState, Badge, Btn, Field, Alert } from '../components/ui/index'
import { exportarCxCXLSX } from '../utils/exportXLSX'
import { exportarCxCPDF } from '../utils/exportPDF'
import { useCxCList, useCrearCxC, useActualizarCxC, useRegistrarPago } from '../queries/cuentas-por-cobrar.queries'
import { useClientesList } from '../queries/clientes.queries'

const simboloMoneda = 'S/'
const SI  = 'w-full px-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit] placeholder-[#5f6f80]'
const SEL = SI + ' pr-8'
const TH  = ({ c, r }) => <th className={`bg-[#1a2230] px-3.5 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] whitespace-nowrap border-b border-white/8 ${r ? 'text-right' : 'text-left'}`}>{c}</th>

const ESTADO_META = {
  PENDIENTE: { label: 'Pendiente', color: 'warning' },
  VENCIDA:   { label: 'Vencida',   color: 'danger'  },
  PARCIAL:   { label: 'Parcial',   color: 'info'    },
  COBRADA:   { label: 'Cobrada',   color: 'success' },
}

function diasMora(fechaVencimiento) {
  if (!fechaVencimiento) return 0
  const diff = new Date() - new Date(fechaVencimiento + 'T12:00:00')
  return Math.max(0, Math.ceil(diff / 86400000))
}

export default function CuentasPorCobrar() {
  const { sesion, toast } = useApp()

  const { data: cxcs     = [], isLoading } = useCxCList()
  const { data: clientes = [] }            = useClientesList()

  const crearCxC      = useCrearCxC()
  const actualizarCxC = useActualizarCxC()
  const registrarPago = useRegistrarPago()

  const [modal,     setModal]     = useState(false)
  const [editando,  setEditando]  = useState(null)
  const [pagoDoc,   setPagoDoc]   = useState(null)
  const [filtro,    setFiltro]    = useState('')
  const [busqueda,  setBusqueda]  = useState('')
  const [filtDesde, setFiltDesde] = useState('')
  const [filtHasta, setFiltHasta] = useState('')

  const cliNombre = id => clientes.find(c => c.id === id)?.razonSocial || '—'

  const filtered = useMemo(() => {
    let d = [...cxcs]
    if (filtro)    d = d.filter(x => x.estado === filtro)
    if (filtDesde) d = d.filter(x => (x.fechaVencimiento || '') >= filtDesde)
    if (filtHasta) d = d.filter(x => (x.fechaVencimiento || '') <= filtHasta)
    if (busqueda) {
      const q = busqueda.toLowerCase()
      d = d.filter(x => x.numero?.toLowerCase().includes(q) || cliNombre(x.clienteId).toLowerCase().includes(q))
    }
    return d
  }, [cxcs, filtro, busqueda, filtDesde, filtHasta, clientes])

  const kpis = useMemo(() => {
    const pendientes = cxcs.filter(x => ['PENDIENTE', 'PARCIAL', 'VENCIDA'].includes(x.estado))
    const vencidas   = cxcs.filter(x => x.estado === 'VENCIDA')
    return {
      total:    pendientes.reduce((s, x) => s + Number(x.saldo || 0), 0),
      mora:     vencidas.reduce((s, x) => s + Number(x.saldo || 0), 0),
      count:    pendientes.length,
      vencidas: vencidas.length,
    }
  }, [cxcs])

  async function handleSave(data) {
    const isEdit = !!data.id
    // UpdateCuentaPorCobrarDto solo admite fechaVencimiento/notas — monto/saldo/estado
    // se manejan exclusivamente vía registrarPago() (ver cuentas-por-cobrar.service.ts).
    const dto = isEdit
      ? {
          fechaVencimiento: data.fechaVencimiento || undefined,
          notas:            data.notas || undefined,
        }
      : {
          clienteId:        data.clienteId,
          monto:            Number(data.monto),
          diasCredito:      data.diasCredito ? Number(data.diasCredito) : undefined,
          fechaVencimiento: data.fechaVencimiento || undefined,
          notas:            data.notas || undefined,
        }
    const res = isEdit
      ? await actualizarCxC.mutateAsync({ id: data.id, ...dto })
      : await crearCxC.mutateAsync(dto)
    if (res?.error) { toast(res.error, 'error'); return }
    setModal(false)
    toast(isEdit ? 'CxC actualizada' : 'CxC registrada', 'success')
  }

  async function handlePagar(doc, monto) {
    const res = await registrarPago.mutateAsync({ id: doc.id, monto })
    if (res?.error) { toast(res.error, 'error'); return }
    setPagoDoc(null)
    const completo = monto >= Number(doc.saldo)
    toast(completo ? `${doc.numero} marcada como cobrada` : `Pago parcial registrado en ${doc.numero}`, 'success')
  }

  const isSaving = crearCxC.isPending || actualizarCxC.isPending

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          { label: 'Por cobrar',      val: formatCurrency(kpis.total, simboloMoneda), color: '#3b82f6', Icon: DollarSign,    mono: true },
          { label: 'En mora',         val: formatCurrency(kpis.mora,  simboloMoneda), color: '#ef4444', Icon: AlertTriangle, mono: true },
          { label: 'Documentos open', val: kpis.count,                               color: '#f59e0b', Icon: Clock              },
          { label: 'Vencidas',        val: kpis.vencidas,                            color: '#ef4444', Icon: AlertTriangle      },
        ].map(({ label, val, color, Icon, mono }) => (
          <div key={label} className="relative bg-[#161d28] border border-white/8 rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }}/>
            <div className="absolute top-3 right-4 opacity-[0.06]"><Icon size={40}/></div>
            <div className="flex items-center gap-1.5 mb-2">
              <Icon size={11} style={{ color, opacity: 0.8 }}/>
              <span className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.07em]">{label}</span>
            </div>
            <div className={`font-semibold text-[#e8edf2] leading-none ${mono ? 'text-[17px] font-mono' : 'text-[28px]'}`}>{val}</div>
          </div>
        ))}
      </div>

      {kpis.vencidas > 0 && (
        <Alert variant="danger">
          <strong>{kpis.vencidas} documento{kpis.vencidas > 1 ? 's' : ''} vencido{kpis.vencidas > 1 ? 's' : ''}.</strong>{' '}
          Total en mora: {formatCurrency(kpis.mora, simboloMoneda)}. Gestionar cobro urgente.
        </Alert>
      )}

      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Cuentas por Cobrar</span>
          <div className="flex items-center gap-2">
            <Btn variant="ghost" size="sm" onClick={async () => { await exportarCxCXLSX(cxcs, clientes, simboloMoneda) }}>
              <Download size={13}/> Excel
            </Btn>
            <Btn variant="ghost" size="sm" onClick={async () => { await exportarCxCPDF(cxcs, clientes, simboloMoneda, sesion?.nombre) }}>
              <FileText size={13}/> PDF
            </Btn>
            <Btn variant="primary" size="sm" onClick={() => { setEditando(null); setModal(true) }}>
              <Plus size={13}/> Nueva CxC
            </Btn>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-50">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <input className={SI + ' pl-8'} placeholder="Buscar número o cliente..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
          </div>
          <select className={SEL} style={{ width: 155, padding: '5px 8px', fontSize: 12 }} value={filtro} onChange={e => setFiltro(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#5f6f80] whitespace-nowrap font-semibold uppercase tracking-wide">Venc. desde</span>
            <input type="date" className={SI + ' py-1.25! text-[12px]'} style={{ width: 138 }} value={filtDesde} onChange={e => setFiltDesde(e.target.value)}/>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#5f6f80] whitespace-nowrap font-semibold uppercase tracking-wide">hasta</span>
            <input type="date" className={SI + ' py-1.25! text-[12px]'} style={{ width: 138 }} value={filtHasta} onChange={e => setFiltHasta(e.target.value)}/>
          </div>
          {(busqueda || filtro || filtDesde || filtHasta) && (
            <Btn variant="ghost" size="sm" onClick={() => { setBusqueda(''); setFiltro(''); setFiltDesde(''); setFiltHasta('') }}>
              <X size={12}/> Limpiar
            </Btn>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full border-collapse text-[12px]">
            <thead><tr>
              <TH c="N° Doc."/><TH c="Cliente"/><TH c="Emisión"/><TH c="Vencimiento"/>
              <TH c="Días mora" r/><TH c="Monto" r/><TH c="Saldo" r/><TH c="Estado"/><TH c="Acciones"/>
            </tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={9} className="text-center text-[#5f6f80] py-8 text-[12px]">Cargando...</td></tr>}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={9}><EmptyState icon={DollarSign} title="Sin documentos" description="Registra la primera factura pendiente."/></td></tr>
              )}
              {filtered.map(doc => {
                const meta = ESTADO_META[doc.estado] || ESTADO_META.PENDIENTE
                const mora = doc.estado === 'VENCIDA' ? diasMora(doc.fechaVencimiento) : 0
                return (
                  <tr key={doc.id} className="border-b border-white/6 last:border-0 hover:bg-white/2">
                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#00c896] font-semibold">{doc.numero}</td>
                    <td className="px-3.5 py-2.5 font-medium text-[#e8edf2]">{cliNombre(doc.clienteId)}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#9ba8b6]">{formatDate(doc.fecha || doc.createdAt)}</td>
                    <td className={`px-3.5 py-2.5 font-mono text-[11px] ${mora > 0 ? 'text-red-400' : 'text-[#9ba8b6]'}`}>
                      {formatDate(doc.fechaVencimiento)}
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      {mora > 0
                        ? <span className="font-mono font-bold text-red-400">{mora}d</span>
                        : <span className="text-[#5f6f80]">—</span>
                      }
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono text-[#9ba8b6]">{formatCurrency(doc.monto, simboloMoneda)}</td>
                    <td className={`px-3.5 py-2.5 text-right font-mono font-bold ${doc.saldo > 0 ? 'text-[#e8edf2]' : 'text-green-600'}`}>
                      {formatCurrency(doc.saldo, simboloMoneda)}
                    </td>
                    <td className="px-3.5 py-2.5"><Badge variant={meta.color}>{meta.label}</Badge></td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex gap-1">
                        {doc.estado !== 'COBRADA' && (
                          <Btn variant="primary" size="sm" disabled={registrarPago.isPending} onClick={() => setPagoDoc(doc)}>
                            <CheckCircle size={11}/> Cobrar
                          </Btn>
                        )}
                        <Btn variant="ghost" size="icon" onClick={() => { setEditando(doc); setModal(true) }}><Edit2 size={12}/></Btn>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ModalCxC
        open={modal}
        onClose={() => setModal(false)}
        editando={editando}
        clientes={clientes}
        simboloMoneda={simboloMoneda}
        saving={isSaving}
        onSave={handleSave}
      />

      <ModalPago
        doc={pagoDoc}
        simboloMoneda={simboloMoneda}
        saving={registrarPago.isPending}
        onClose={() => setPagoDoc(null)}
        onConfirm={monto => handlePagar(pagoDoc, monto)}
      />
    </div>
  )
}

export function ModalPago({ doc, simboloMoneda, saving, onClose, onConfirm }) {
  const [monto, setMonto] = useState('')

  useEffect(() => {
    if (doc) setMonto(String(Number(doc.saldo)))
  }, [doc])

  const montoNum = Number(monto)
  const valido = doc && montoNum > 0 && montoNum <= Number(doc.saldo)

  return (
    <Modal open={!!doc} onClose={onClose} title={`Registrar pago — ${doc?.numero || ''}`} size="sm"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" disabled={!valido || saving} onClick={() => onConfirm(montoNum)}>
          {saving ? 'Registrando...' : 'Confirmar pago'}
        </Btn>
      </>}>
      {doc && (
        <div className="flex flex-col gap-3.5">
          <div className="text-[13px] text-[#9ba8b6]">
            Saldo pendiente: <span className="font-mono font-semibold text-[#e8edf2]">{formatCurrency(doc.saldo, simboloMoneda)}</span>
          </div>
          <Field label="Monto a pagar *" hint="Se acepta un pago parcial — el saldo restante queda como PARCIAL">
            <input type="number" className={SI} value={monto} onChange={e => setMonto(e.target.value)}
              min="0.01" max={Number(doc.saldo)} step="0.01" autoFocus/>
          </Field>
          {!valido && monto !== '' && (
            <Alert variant="error">El monto debe ser mayor a 0 y no puede superar el saldo pendiente.</Alert>
          )}
        </div>
      )}
    </Modal>
  )
}

function ModalCxC({ open, onClose, editando, clientes, simboloMoneda, saving, onSave }) {
  const init = { clienteId: '', monto: 0, diasCredito: 30, fechaVencimiento: '', estado: 'PENDIENTE', notas: '' }
  const [form, setForm] = useState(init)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const isEdit = !!editando

  useEffect(() => {
    if (!open) return
    setForm(editando
      ? { clienteId: editando.clienteId, monto: editando.monto, diasCredito: editando.diasCredito || 30, fechaVencimiento: editando.fechaVencimiento || '', estado: editando.estado || 'PENDIENTE', notas: editando.notas || '' }
      : init
    )
  }, [open, editando])

  function calcVenc() {
    if (!form.diasCredito) return
    // fechaHoy() devuelve 'dd/MM/yyyy' (formato de UI), no sirve para construir un Date aquí.
    const d = new Date()
    d.setHours(12, 0, 0, 0)
    d.setDate(d.getDate() + parseInt(form.diasCredito))
    f('fechaVencimiento', d.toISOString().split('T')[0])
  }

  const canSave = isEdit ? true : (!!form.clienteId && Number(form.monto) > 0)

  return (
    <Modal open={open} onClose={onClose} title={editando ? 'Editar CxC' : 'Nueva Cuenta por Cobrar'} size="md"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" disabled={!canSave || saving} onClick={() => onSave({ ...form, id: editando?.id })}>
          {saving ? 'Guardando...' : 'Guardar'}
        </Btn>
      </>}>
      {/* Cliente, monto, días de crédito y estado se fijan al crear — el backend solo
          permite editar fechaVencimiento y notas (monto/estado cambian vía "Cobrar"). */}
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Cliente *">
          {isEdit
            ? <div className={SI + ' opacity-50 cursor-not-allowed'}>{clientes.find(c => c.id === form.clienteId)?.razonSocial || '—'}</div>
            : <select className={SEL} value={form.clienteId} onChange={e => f('clienteId', e.target.value)}>
                <option value="">Seleccionar...</option>
                {clientes.filter(c => c.activo !== false).map(c => <option key={c.id} value={c.id}>{c.razonSocial}</option>)}
              </select>
          }
        </Field>
        <Field label="Monto total *">
          {isEdit
            ? <div className={SI + ' opacity-50 cursor-not-allowed'}>{formatCurrency(form.monto, simboloMoneda)}</div>
            : <input type="number" className={SI} value={form.monto} onChange={e => f('monto', +e.target.value)} min="0" step="0.01"/>
          }
        </Field>
        {!isEdit && (
          <div>
            <Field label="Días de crédito">
              <div className="flex gap-2">
                <input type="number" className={SI} value={form.diasCredito} onChange={e => f('diasCredito', +e.target.value)} min="0" style={{ flex: 1 }}/>
                <Btn variant="ghost" size="sm" onClick={calcVenc}>Calcular</Btn>
              </div>
            </Field>
          </div>
        )}
        <Field label="Vencimiento">
          <input type="date" className={SI} value={form.fechaVencimiento} onChange={e => f('fechaVencimiento', e.target.value)}/>
        </Field>
        {isEdit && (
          <Field label="Estado">
            <div className={SI + ' opacity-50 cursor-not-allowed'}>{ESTADO_META[form.estado]?.label || form.estado}</div>
          </Field>
        )}
      </div>
      <Field label="Notas">
        <textarea className={SI + ' resize-y min-h-13'} value={form.notas} onChange={e => f('notas', e.target.value)} placeholder="Observaciones..."/>
      </Field>
    </Modal>
  )
}
