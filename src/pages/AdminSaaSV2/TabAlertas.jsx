import { useState } from 'react'
import { Bell, Plus, Clock, CheckCircle, Edit2, Trash2, Save, Send, AlertTriangle, Download } from 'lucide-react'
import {
  PageHeader, Card, Badge, Btn, Field, Input, Textarea, Toggle,
  TableWrap, Th, Td, EmptyState, Modal, ConfirmDialog,
} from './ui'
import { useHistorialAlertasEnvios, useEnviarAlertasPendientes } from '../../queries/admin.queries'
import { exportCsv } from './export-utils'

const SUB_TABS = ['Bandeja', 'Reglas', 'Historial']

/**
 * Alertas de vencimiento — reestructurado en pestañas (Bandeja/Reglas/
 * Historial) siguiendo AlertsRefined del mockup de referencia. La "Bandeja"
 * del mockup son alertas de gobierno de plataforma (backups fallidos, pagos
 * rechazados, seguridad) — datos que no existen en el backend real, así que
 * NO se fabrican: acá "Bandeja" muestra vencimientos próximos reales
 * (useVencimientosProximos), enmarcados como alertas con severidad derivada
 * de los días restantes — dato real, no inventado.
 */
export default function TabAlertas({ alertas, vencimientos, crearAlerta, actualizarAlerta, eliminarAlerta, toast }) {
  const [subTab, setSubTab]     = useState('Bandeja')
  const [modalOpen, setModal]   = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm]         = useState({})
  const [confirmDel, setConfirmDel] = useState(null)
  const CANALES = ['email', 'sistema', 'whatsapp', 'sms']

  const { data: envios = [] } = useHistorialAlertasEnvios()
  const enviarPendientes = useEnviarAlertasPendientes()

  const criticos = vencimientos.filter(v => v.dias <= 1).length
  const fallidos = envios.filter(e => e.estado === 'fallido').length

  async function handleEnviarAhora() {
    const res = await enviarPendientes.mutateAsync()
    if (res?.error) { toast(res.error, 'error'); return }
    const { enviados = 0, fallidos: f = 0, omitidos = 0 } = res?.data ?? {}
    if (enviados === 0 && f === 0) toast(`Nada pendiente de enviar (${omitidos} ya estaban al día o sin regla de email aplicable)`, 'info')
    else toast(`Envío completado: ${enviados} enviado(s)${f ? `, ${f} fallido(s)` : ''}`, f ? 'warning' : 'success')
  }

  function openNew() { setEditItem(null); setForm({ diasAntes:7, activa:true, canales:['email','sistema'], asunto:'', mensaje:'' }); setModal(true) }
  function openEdit(a) { setEditItem(a); setForm({ ...a, canales:[...(a.canales||[])] }); setModal(true) }

  async function save() {
    if (!form.asunto?.trim()) { toast('El asunto es requerido', 'error'); return }
    if (editItem) {
      const res = await actualizarAlerta.mutateAsync({ id: editItem.id, diasAntes: form.diasAntes, activa: form.activa, canales: form.canales, asunto: form.asunto, mensaje: form.mensaje })
      if (res?.error) { toast(res.error, 'error'); return }
      toast('Regla de alerta actualizada', 'success')
    } else {
      const res = await crearAlerta.mutateAsync({ diasAntes: form.diasAntes, activa: form.activa, canales: form.canales, asunto: form.asunto, mensaje: form.mensaje })
      if (res?.error) { toast(res.error, 'error'); return }
      toast('Regla de alerta creada', 'success')
    }
    setModal(false)
  }

  async function remove(id) { const res = await eliminarAlerta.mutateAsync(id); if (res?.error) { toast(res.error, 'error'); return }; toast('Regla eliminada', 'success') }
  async function toggleActiva(id) { const alerta = alertas.find(a => a.id === id); await actualizarAlerta.mutateAsync({ id, activa: !alerta?.activa }) }
  function toggleCanal(canal) { setForm(p => { const cs = p.canales || []; return { ...p, canales: cs.includes(canal) ? cs.filter(c => c !== canal) : [...cs, canal] } }) }

  function exportarHistorial() {
    const rows = [['Empresa','Regla','Canal','Estado','Fecha'], ...envios.map(e => [e.empresa?.nombre||'', e.regla?.asunto||'', e.canal, e.estado, e.enviadoAt||''])]
    exportCsv(rows, 'alertas-historial')
    toast(`${envios.length} envío(s) exportado(s)`, 'success')
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div>
      <PageHeader
        breadcrumb="Centro de alertas"
        title="Alertas de vencimiento"
        description="Cada envío se origina en una regla: desactívala y deja de generarse."
        actions={<Btn variant="primary" onClick={handleEnviarAhora} disabled={enviarPendientes.isPending}><Send size={14}/>{enviarPendientes.isPending ? 'Enviando…' : 'Enviar alertas ahora'}</Btn>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card><p className="text-[13px] font-semibold text-[#687386]">Vencimientos abiertos</p><p className="mt-2 text-[24px] font-bold text-[#172033]">{vencimientos.length}</p><p className="mt-1 text-[12.5px] text-[#8893a3]">Próximos 30 días</p></Card>
        <Card><p className="text-[13px] font-semibold text-[#687386]">Críticos</p><p className={`mt-2 text-[24px] font-bold ${criticos > 0 ? 'text-red-500' : 'text-[#172033]'}`}>{criticos}</p><p className="mt-1 text-[12.5px] text-[#8893a3]">Vencen hoy o ya vencieron</p></Card>
        <Card><p className="text-[13px] font-semibold text-[#687386]">Reglas activas</p><p className="mt-2 text-[24px] font-bold text-[#172033]">{alertas.filter(a=>a.activa).length} / {alertas.length}</p><p className="mt-1 text-[12.5px] text-[#8893a3]">Generando alertas</p></Card>
        <Card><p className="text-[13px] font-semibold text-[#687386]">Envíos fallidos</p><p className={`mt-2 text-[24px] font-bold ${fallidos > 0 ? 'text-amber-600' : 'text-[#172033]'}`}>{fallidos}</p><p className="mt-1 text-[12.5px] text-[#8893a3]">Del historial reciente</p></Card>
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="flex gap-1 overflow-x-auto border-b border-[#eef1f6] px-5 pt-3">
          {SUB_TABS.map(t => (
            <button key={t} onClick={() => setSubTab(t)} className={`whitespace-nowrap border-b-2 px-3 py-3 text-[13.5px] font-semibold transition-colors ${subTab === t ? 'border-[#355fd1] text-[#355fd1]' : 'border-transparent text-[#8893a3] hover:text-[#172033]'}`}>{t}</button>
          ))}
        </div>

        {subTab === 'Bandeja' && (
          vencimientos.length === 0 ? <div className="p-10"><EmptyState icon={Bell} title="Sin vencimientos próximos" description="No hay negocios venciendo en los próximos 30 días." /></div> : (
            <div className="divide-y divide-[#eef1f6]">
              {vencimientos.map(v => (
                <div key={v.empresaId} className="flex flex-wrap items-center gap-4 p-4 md:px-5">
                  <span className={`size-3 rounded-full shrink-0 ${v.dias <= 1 ? 'bg-red-500' : v.dias <= 7 ? 'bg-amber-500' : 'bg-blue-500'}`} />
                  <div className="min-w-[220px] flex-1">
                    <p className="font-semibold text-[#172033]">{v.nombre}</p>
                    <p className="mt-0.5 text-[12.5px] text-[#8893a3]">{v.codigo} · {v.fechaVencimiento ? String(v.fechaVencimiento).slice(0,10) : '—'}</p>
                  </div>
                  <Badge variant={v.dias <= 1 ? 'danger' : v.dias <= 7 ? 'warning' : 'info'}>{v.dias <= 0 ? 'Vencido' : `${v.dias}d restantes`}</Badge>
                  {v.reglaAplicable ? <Badge variant="neutral">{v.reglaAplicable.asunto}</Badge> : <span className="text-[11.5px] text-[#8893a3]">Sin regla aplicable</span>}
                </div>
              ))}
            </div>
          )
        )}

        {subTab === 'Reglas' && (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[12.5px] text-[#8893a3]">Define cuándo y cómo se notifica a los clientes sobre el vencimiento de su plan</p>
              <Btn variant="primary" size="sm" onClick={openNew}><Plus size={13}/>Nueva regla</Btn>
            </div>
            {alertas.length === 0 ? (
              <EmptyState icon={Bell} title="Sin reglas de alerta" action={<Btn variant="primary" onClick={openNew}><Plus size={14}/>Crear regla</Btn>} />
            ) : (
              <div className="space-y-2">
                {[...alertas].sort((a,b) => a.diasAntes - b.diasAntes).map(a => (
                  <div key={a.id} className={`flex items-center gap-4 rounded-xl border border-[#eef1f6] p-4 ${a.activa ? '' : 'opacity-60'}`}>
                    <span className="grid size-10 place-items-center rounded-xl bg-[#eef2ff] text-[#355fd1] shrink-0"><AlertTriangle size={17}/></span>
                    <div className="min-w-[220px] flex-1">
                      <div className="flex items-center gap-2 flex-wrap"><p className="font-semibold text-[#172033]">{a.asunto}</p><Badge variant={a.activa ? 'success' : 'neutral'}>{a.activa ? 'Activa' : 'Inactiva'}</Badge></div>
                      <p className="mt-1 text-[12.5px] text-[#8893a3]">{a.diasAntes} días antes · {a.mensaje}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">{(a.canales||[]).map(c => <span key={c} className="text-[11px] px-2 py-0.5 rounded-full bg-[#eef1f6] text-[#687386]">{c}</span>)}</div>
                    </div>
                    <Toggle value={a.activa} onChange={() => toggleActiva(a.id)} />
                    <Btn variant="ghost" size="icon" onClick={() => openEdit(a)}><Edit2 size={13}/></Btn>
                    <Btn variant="danger" size="icon" onClick={() => setConfirmDel(a)}><Trash2 size={13}/></Btn>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {subTab === 'Historial' && (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[12.5px] text-[#8893a3]">Envíos reales de alertas de vencimiento — corren solas cada mañana, o con "Enviar alertas ahora".</p>
              <Btn variant="secondary" size="sm" onClick={exportarHistorial}><Download size={13}/>Exportar</Btn>
            </div>
            {envios.length === 0 ? <EmptyState icon={Clock} title="Sin envíos todavía" /> : (
              <TableWrap>
                <thead><tr><Th>Empresa</Th><Th>Regla</Th><Th>Canal</Th><Th>Estado</Th><Th>Fecha</Th></tr></thead>
                <tbody>
                  {envios.map(e => (
                    <tr key={e.id} className="border-t border-[#eef1f6] hover:bg-[#f9fafc]">
                      <Td><div className="font-semibold text-[#172033]">{e.empresa?.nombre}</div></Td>
                      <Td muted>{e.regla?.asunto}</Td>
                      <Td muted>{e.canal}</Td>
                      <Td><Badge variant={e.estado === 'enviado' ? 'success' : 'danger'}>{e.estado}</Badge>{e.estado === 'fallido' && e.error && <div className="text-[11px] text-red-500/80 mt-1 max-w-[280px] truncate" title={e.error}>{e.error}</div>}</Td>
                      <Td muted>{e.enviadoAt ? String(e.enviadoAt).slice(0, 16).replace('T', ' ') : '—'}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModal(false)} title={editItem ? 'Editar regla de alerta' : 'Nueva regla de alerta'} size="md"
        footer={<><Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn><Btn variant="primary" onClick={save}><Save size={14}/>{editItem ? 'Guardar cambios' : 'Crear regla'}</Btn></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Días antes del vencimiento"><Input type="number" min="1" max="365" value={form.diasAntes||7} onChange={e => f('diasAntes',parseInt(e.target.value)||1)} /></Field>
            <Field label="Estado"><div className="flex items-center h-10"><Toggle value={!!form.activa} onChange={v => f('activa',v)} label="Regla activa" /></div></Field>
          </div>
          <Field label="Asunto del mensaje *"><Input value={form.asunto||''} onChange={e => f('asunto',e.target.value)} placeholder="¡Plan próximo a vencer!" /></Field>
          <Field label="Mensaje" hint="Variables: {plan} = nombre del plan, {dias} = días restantes, {empresa} = nombre del negocio">
            <Textarea rows={3} value={form.mensaje||''} onChange={e => f('mensaje',e.target.value)} placeholder="Tu plan {plan} vence en {dias} días…" />
          </Field>
          <Field label="Canales de notificación" hint="Solo 'email' se envía de verdad hoy (SMTP configurado). Los demás quedan guardados como intención.">
            <div className="flex flex-wrap gap-2 mt-1">
              {CANALES.map(c => {
                const active = (form.canales||[]).includes(c)
                return (
                  <button key={c} type="button" onClick={() => toggleCanal(c)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-semibold border transition-colors ${active ? 'bg-[#355fd1] border-[#355fd1] text-white' : 'bg-white border-[#dfe4ec] text-[#687386] hover:border-[#355fd1]/40'}`}>
                    {active && <CheckCircle size={12}/>}{c}{c !== 'email' && <span className="opacity-60">*</span>}
                  </button>
                )
              })}
            </div>
          </Field>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={() => remove(confirmDel?.id)} danger title="Eliminar regla" message={`¿Eliminar la regla "${confirmDel?.asunto}"?`} />
    </div>
  )
}
