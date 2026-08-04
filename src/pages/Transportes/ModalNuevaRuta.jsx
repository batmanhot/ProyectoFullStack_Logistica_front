import { useState } from 'react'
import { Navigation as NavIcon } from 'lucide-react'
import { fechaHoyISO } from '../../utils/helpers'
import { Modal, Btn, Field, Alert, Input, Select, Textarea } from '../../components/ui/index'

// ── Modal Nueva Ruta ─────────────────────────────────────
export default function ModalNuevaRuta({ onClose, onSave, despachos, transportistas, clientes, almacenes, saving }) {
  const [form, setForm]     = useState({ transportistaId:'', almacenId:'', fechaSalida: fechaHoyISO(), horaSalida:'08:00', costoViaje:'', observaciones:'' })
  const [optimizar, setOptimizar] = useState(false)
  const [selDes, setSelDes] = useState([])
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const disponibles = despachos.filter(d => d.estado === 'LISTO')
  // El empaque (Empaque.estado) y el estado del Despacho son dos flags
  // independientes — confirmar el packing NO avanza el despacho a LISTO,
  // eso exige el botón "Marcar Listo" en Despachos. Detectamos el caso más
  // confuso (packing ya confirmado, pero el despacho sigue en Picking) para
  // no dejar al usuario adivinando por qué no aparece en esta lista.
  const empacadosSinListo = despachos.filter(d => d.estado === 'PICKING' && d.empaque?.estado === 'CONFIRMADO')
  const cliNombre   = id => clientes.find(c => c.id === id)?.razonSocial?.slice(0,30) || '—'
  const toggleDes   = id => setSelDes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  function handleSave() {
    if (!form.transportistaId || selDes.length === 0) return
    const ordenados = optimizar
      ? [...selDes].sort((a, b) => {
          const da = disponibles.find(d => d.id === a)
          const db = disponibles.find(d => d.id === b)
          const za = (da?.direccionEntrega || '').split(',').pop()?.trim() || ''
          const zb = (db?.direccionEntrega || '').split(',').pop()?.trim() || ''
          return za.localeCompare(zb)
        })
      : selDes
    const paradas = ordenados.map((dId, i) => ({ despachoId:dId, orden:i+1, estado:'PENDIENTE', horaLlegada:null, horaPartida:null, observacion:'' }))
    onSave({
      transportistaId: form.transportistaId,
      almacenId: form.almacenId || undefined,
      fechaSalida: `${form.fechaSalida}T${form.horaSalida}`,
      costoViaje: +form.costoViaje || 0,
      observaciones: form.observaciones,
      despachoIds: selDes,
      paradas,
    })
  }

  return (
    <Modal open onClose={onClose} title="Programar Nueva Ruta de Entrega" size="lg"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn variant="primary" disabled={!form.transportistaId || selDes.length === 0 || saving} onClick={handleSave}><NavIcon size={13}/> {saving ? 'Programando...' : 'Programar Ruta'}</Btn></>}>

      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Transportista *">
          <Select value={form.transportistaId} onChange={e => f('transportistaId', e.target.value)}>
            <option value="">Seleccionar...</option>
            {transportistas.map(t => <option key={t.id} value={t.id}>{t.nombre}{t.placa ? ` · ${t.placa}` : ''}</option>)}
          </Select>
        </Field>
        <Field label="Almacén de Origen">
          <Select value={form.almacenId} onChange={e => f('almacenId', e.target.value)}>
            <option value="">Seleccionar...</option>
            {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </Select>
        </Field>
        <Field label="Fecha de Salida">
          <Input type="date" value={form.fechaSalida} onChange={e => f('fechaSalida', e.target.value)}/>
        </Field>
        <Field label="Hora de Salida">
          <Input type="time" value={form.horaSalida} onChange={e => f('horaSalida', e.target.value)}/>
        </Field>
        <Field label="Costo del Viaje (S/)">
          <Input type="number" value={form.costoViaje} onChange={e => f('costoViaje', e.target.value)} min="0" step="0.50"/>
          {selDes.length > 1 && (
            <div className="col-span-2 mt-1">
              <label className="flex items-center gap-2.5 cursor-pointer px-3.5 py-3 bg-[#1a2230] rounded-xl border border-white/7 hover:border-white/12 transition-colors">
                <input type="checkbox" checked={optimizar} onChange={e => setOptimizar(e.target.checked)} className="accent-[#00c896] w-4 h-4"/>
                <div>
                  <div className="text-[13px] font-medium text-[#e8edf2]">Optimizar orden de paradas por zona</div>
                  <div className="text-[11px] text-[#5f6f80] mt-0.5">Ordena paradas por distrito para reducir km recorridos.</div>
                </div>
                {optimizar && <span className="ml-auto text-[10px] bg-[#00c896]/15 text-[#00c896] px-2 py-1 rounded-lg font-semibold shrink-0">ACTIVO</span>}
              </label>
            </div>
          )}
        </Field>
      </div>

      <div className="text-[13px] font-semibold text-[#e8edf2]">
        Despachos a incluir
        <span className="ml-2 text-[11px] text-[#5f6f80] font-normal">Solo despachos en estado "Listo"</span>
      </div>

      {disponibles.length === 0 ? (
        <Alert variant="warning">
          {empacadosSinListo.length > 0
            ? `Hay ${empacadosSinListo.length} despacho${empacadosSinListo.length !== 1 ? 's' : ''} con el empaque ya confirmado, pero el estado del pedido sigue en "Picking" — confirmar el empaque no lo avanza automáticamente. Ve a Despachos y usa "Marcar Listo" en ${empacadosSinListo.length !== 1 ? 'esos pedidos' : 'ese pedido'} (${empacadosSinListo.map(d => d.numero).join(', ')}) para poder incluirlo${empacadosSinListo.length !== 1 ? 's' : ''} aquí.`
            : 'No hay despachos en estado "Listo". Avanza el estado de los despachos primero.'}
        </Alert>
      ) : (
        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
          {disponibles.map(d => (
            <label key={d.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
              selDes.includes(d.id) ? 'bg-[#00c896]/10 border-[#00c896]/40' : 'bg-[#1a2230] border-white/6 hover:border-white/12'
            }`}>
              <input type="checkbox" checked={selDes.includes(d.id)} onChange={() => toggleDes(d.id)} className="accent-[#00c896]"/>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] text-[#00c896]">{d.numero}</span>
                  <span className="text-[12px] text-[#e8edf2] truncate">{cliNombre(d.clienteId)}</span>
                </div>
                <div className="text-[11px] text-[#5f6f80] truncate">{d.direccionEntrega}</div>
              </div>
              <span className="text-[11px] text-[#9ba8b6] font-mono shrink-0">{d.items?.length} ítem(s)</span>
            </label>
          ))}
        </div>
      )}

      <Field label="Observaciones">
        <Textarea className="min-h-13" value={form.observaciones}
          onChange={e => f('observaciones', e.target.value)} placeholder="Instrucciones para el conductor..."/>
      </Field>
    </Modal>
  )
}
