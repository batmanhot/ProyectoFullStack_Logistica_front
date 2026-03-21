import { useState, useMemo } from 'react'
import { Plus, Search, DollarSign, AlertTriangle, CheckCircle, Clock, Edit2, Trash2, FileText, Download, X } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate, fechaHoy } from '../utils/helpers'
import * as storage from '../services/storage'
import { Modal, ConfirmDialog, EmptyState, Badge, Btn, Field, Alert } from '../components/ui/index'
import { exportarCxCXLSX } from '../utils/exportXLSX'
import { exportarCxCPDF } from '../utils/exportPDF'

const SI  = 'w-full px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit] placeholder-[#5f6f80]'
const SEL = SI + ' pr-8'
const TH  = ({c,r}) => <th className={`bg-[#1a2230] px-3.5 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] whitespace-nowrap border-b border-white/[0.08] ${r?'text-right':'text-left'}`}>{c}</th>

const ESTADO_META = {
  PENDIENTE: { label:'Pendiente', color:'warning' },
  VENCIDA:   { label:'Vencida',   color:'danger'  },
  PARCIAL:   { label:'Parcial',   color:'info'    },
  COBRADA:   { label:'Cobrada',   color:'success' },
}

function diasMora(fechaVencimiento) {
  if (!fechaVencimiento) return 0
  const diff = new Date() - new Date(fechaVencimiento + 'T12:00:00')
  return Math.max(0, Math.ceil(diff / 86400000))
}

export default function CuentasPorCobrar() {
  const { clientes, simboloMoneda, toast, config } = useApp()
  const [docs, setDocs] = useState(() => storage.getCxC().data || [])
  const [modal, setModal]   = useState(false)
  const [editando, setEditando] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [filtro,    setFiltro]    = useState('')
  const [busqueda,  setBusqueda]  = useState('')
  const [filtDesde, setFiltDesde] = useState('')
  const [filtHasta, setFiltHasta] = useState('')

  function reload() { setDocs(storage.getCxC().data || []) }

  const filtered = useMemo(() => {
    let d = [...docs]
    if (filtro)    d = d.filter(x => x.estado === filtro)
    if (filtDesde) d = d.filter(x => (x.fechaVencimiento||'') >= filtDesde)
    if (filtHasta) d = d.filter(x => (x.fechaVencimiento||'') <= filtHasta)
    if (busqueda) {
      const q = busqueda.toLowerCase()
      d = d.filter(x => x.numero?.toLowerCase().includes(q) ||
        clientes.find(c=>c.id===x.clienteId)?.razonSocial?.toLowerCase().includes(q))
    }
    return d
  }, [docs, filtro, busqueda, filtDesde, filtHasta, clientes])

  const kpis = useMemo(() => {
    const pendientes = docs.filter(x => ['PENDIENTE','PARCIAL','VENCIDA'].includes(x.estado))
    const vencidas   = docs.filter(x => x.estado === 'VENCIDA')
    const total      = pendientes.reduce((s, x) => s + (x.saldo || 0), 0)
    const mora       = vencidas.reduce((s, x) => s + (x.saldo || 0), 0)
    return { total, mora, count: pendientes.length, vencidas: vencidas.length }
  }, [docs])

  function handleSave(data) {
    storage.saveCxC(data)
    reload()
    setModal(false)
    toast(data.id ? 'CxC actualizada' : 'CxC registrada', 'success')
  }

  function handlePagar(doc) {
    storage.saveCxC({ ...doc, estado: 'COBRADA', saldo: 0 })
    reload()
    toast(`${doc.numero} marcada como cobrada`, 'success')
  }

  function cliNombre(id) { return clientes.find(c=>c.id===id)?.razonSocial || '—' }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          { label:'Por cobrar',      val:formatCurrency(kpis.total, simboloMoneda), color:'#3b82f6', Icon:DollarSign, mono:true },
          { label:'En mora',         val:formatCurrency(kpis.mora,  simboloMoneda), color:'#ef4444', Icon:AlertTriangle, mono:true },
          { label:'Documentos open', val:kpis.count,    color:'#f59e0b', Icon:Clock   },
          { label:'Vencidas',        val:kpis.vencidas, color:'#ef4444', Icon:AlertTriangle },
        ].map(({ label, val, color, Icon, mono }) => (
          <div key={label} className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }}/>
            <div className="absolute top-3 right-4 opacity-[0.06]"><Icon size={40}/></div>
            <div className="flex items-center gap-1.5 mb-2">
              <Icon size={11} style={{ color, opacity:0.8 }}/>
              <span className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.07em]">{label}</span>
            </div>
            <div className={`font-bold text-[#e8edf2] leading-none ${mono?'text-[15px] font-mono':'text-[26px]'}`}>{val}</div>
          </div>
        ))}
      </div>

      {kpis.vencidas > 0 && (
        <Alert variant="danger">
          <strong>{kpis.vencidas} documento{kpis.vencidas>1?'s':''} vencido{kpis.vencidas>1?'s':''}.</strong> Total en mora: {formatCurrency(kpis.mora, simboloMoneda)}. Gestionar cobro urgente.
        </Alert>
      )}

      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Cuentas por Cobrar</span>
          <div className="flex items-center gap-2">
            <Btn variant="ghost" size="sm" onClick={async()=>{ await exportarCxCXLSX(docs, clientes, simboloMoneda) }}>
              <Download size={13}/> Excel
            </Btn>
            <Btn variant="ghost" size="sm" onClick={async()=>{ await exportarCxCPDF(docs, clientes, simboloMoneda, config?.empresa) }}>
              <FileText size={13}/> PDF
            </Btn>
            <Btn variant="primary" size="sm" onClick={() => { setEditando(null); setModal(true) }}>
            <Plus size={13}/> Nueva CxC
          </Btn>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <input className={SI + ' pl-8'} placeholder="Buscar número o cliente..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
          </div>
          <select className={SEL} style={{ width:155,padding:'5px 8px',fontSize:12 }} value={filtro} onChange={e => setFiltro(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_META).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {/* Rango fechas vencimiento */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#5f6f80] whitespace-nowrap font-semibold uppercase tracking-wide">Venc. desde</span>
            <input type="date" className={SI+' !py-[5px] text-[12px]'} style={{width:138}}
              value={filtDesde} onChange={e=>setFiltDesde(e.target.value)}/>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#5f6f80] whitespace-nowrap font-semibold uppercase tracking-wide">hasta</span>
            <input type="date" className={SI+' !py-[5px] text-[12px]'} style={{width:138}}
              value={filtHasta} onChange={e=>setFiltHasta(e.target.value)}/>
          </div>
          {(busqueda||filtro||filtDesde||filtHasta) && (
            <Btn variant="ghost" size="sm" onClick={()=>{setBusqueda('');setFiltro('');setFiltDesde('');setFiltHasta('')}}>
              <X size={12}/> Limpiar
            </Btn>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full border-collapse text-[12px]">
            <thead><tr>
              <TH c="N° Doc."/><TH c="Cliente"/><TH c="Emisión"/><TH c="Vencimiento"/>
              <TH c="Días mora" r/><TH c="Monto" r/><TH c="Saldo" r/><TH c="Estado"/><TH c="Acciones"/>
            </tr></thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9}><EmptyState icon={DollarSign} title="Sin documentos" description="Registra la primera factura pendiente."/></td></tr>
              )}
              {filtered.map(doc => {
                const meta  = ESTADO_META[doc.estado] || ESTADO_META.PENDIENTE
                const mora  = ['VENCIDA'].includes(doc.estado) ? diasMora(doc.fechaVencimiento) : 0
                return (
                  <tr key={doc.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]">
                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#00c896] font-semibold">{doc.numero}</td>
                    <td className="px-3.5 py-2.5 font-medium text-[#e8edf2]">{cliNombre(doc.clienteId)}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#9ba8b6]">{formatDate(doc.fechaEmision)}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[11px]" style={{ color: mora > 0 ? '#ef4444' : '#9ba8b6' }}>
                      {formatDate(doc.fechaVencimiento)}
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      {mora > 0
                        ? <span className="font-mono font-bold text-red-400">{mora}d</span>
                        : <span className="text-[#5f6f80]">—</span>
                      }
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono text-[#9ba8b6]">{formatCurrency(doc.monto, simboloMoneda)}</td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-bold" style={{ color: doc.saldo > 0 ? '#e8edf2' : '#22c55e' }}>
                      {formatCurrency(doc.saldo, simboloMoneda)}
                    </td>
                    <td className="px-3.5 py-2.5"><Badge variant={meta.color}>{meta.label}</Badge></td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex gap-1">
                        {doc.estado !== 'COBRADA' && (
                          <Btn variant="primary" size="sm" onClick={() => handlePagar(doc)}>
                            <CheckCircle size={11}/> Cobrar
                          </Btn>
                        )}
                        <Btn variant="ghost" size="icon" onClick={() => { setEditando(doc); setModal(true) }}><Edit2 size={12}/></Btn>
                        <Btn variant="ghost" size="icon" className="text-red-400 hover:text-red-300" onClick={() => setConfirmDel(doc.id)}><Trash2 size={12}/></Btn>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ModalCxC open={modal} onClose={() => setModal(false)} editando={editando} clientes={clientes} simboloMoneda={simboloMoneda} onSave={handleSave}/>
      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={() => { storage.deleteCxC(confirmDel); reload(); setConfirmDel(null) }} danger title="Eliminar documento" message="¿Eliminar este documento de cobranza?"/>
    </div>
  )
}

function ModalCxC({ open, onClose, editando, clientes, simboloMoneda, onSave }) {
  const init = { numero:'', clienteId:'', monto:0, saldo:0, fechaEmision:fechaHoy(), fechaVencimiento:'', diasCredito:30, estado:'PENDIENTE', notas:'' }
  const [form, setForm] = useState(init)
  const f = (k,v) => setForm(p => ({ ...p, [k]: v }))
  useState(() => { setForm(editando ? { ...init, ...editando } : init) }, [editando, open])

  function calcVenc() {
    if (!form.fechaEmision || !form.diasCredito) return
    const d = new Date(form.fechaEmision + 'T12:00:00')
    d.setDate(d.getDate() + parseInt(form.diasCredito))
    f('fechaVencimiento', d.toISOString().split('T')[0])
  }

  return (
    <Modal open={open} onClose={onClose} title={editando ? 'Editar CxC' : 'Nueva Cuenta por Cobrar'} size="md"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn variant="primary" disabled={!form.numero||!form.clienteId} onClick={() => onSave(form)}>Guardar</Btn></>}>
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="N° Documento *"><input className={SI} value={form.numero} onChange={e=>f('numero',e.target.value)} placeholder="FAC-001-0006"/></Field>
        <Field label="Cliente *">
          <select className={SEL} value={form.clienteId} onChange={e=>f('clienteId',e.target.value)}>
            <option value="">Seleccionar...</option>
            {clientes.filter(c=>c.activo).map(c=><option key={c.id} value={c.id}>{c.razonSocial}</option>)}
          </select>
        </Field>
        <Field label="Monto total"><input type="number" className={SI} value={form.monto} onChange={e=>{f('monto',+e.target.value);f('saldo',+e.target.value)}} min="0" step="0.01"/></Field>
        <Field label="Saldo pendiente"><input type="number" className={SI} value={form.saldo} onChange={e=>f('saldo',+e.target.value)} min="0" step="0.01"/></Field>
        <Field label="Fecha emisión"><input type="date" className={SI} value={form.fechaEmision} onChange={e=>f('fechaEmision',e.target.value)} onBlur={calcVenc}/></Field>
        <div>
          <Field label="Días de crédito">
            <div className="flex gap-2">
              <input type="number" className={SI} value={form.diasCredito} onChange={e=>f('diasCredito',+e.target.value)} min="0" style={{flex:1}}/>
              <Btn variant="ghost" size="sm" onClick={calcVenc}>Calcular</Btn>
            </div>
          </Field>
        </div>
        <Field label="Vencimiento"><input type="date" className={SI} value={form.fechaVencimiento} onChange={e=>f('fechaVencimiento',e.target.value)}/></Field>
        <Field label="Estado">
          <select className={SEL} value={form.estado} onChange={e=>f('estado',e.target.value)}>
            {Object.entries(ESTADO_META).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Notas"><textarea className={SI+' resize-y min-h-[52px]'} value={form.notas} onChange={e=>f('notas',e.target.value)} placeholder="Observaciones..."/></Field>
    </Modal>
  )
}
