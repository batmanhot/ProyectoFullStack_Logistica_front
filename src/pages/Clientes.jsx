import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Edit2, Trash2, Users } from 'lucide-react'
import { useApp } from '../store/AppContext'
import * as storage from '../services/storage'
import { Modal, ConfirmDialog, EmptyState, Badge, Btn, Field } from '../components/ui/index'
import DireccionInput from '../components/ui/DireccionInput'

const SI  = 'w-full px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit] placeholder-[#5f6f80]'
const TH  = ({c}) => <th className="bg-[#1a2230] px-3.5 py-2.5 text-left text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] whitespace-nowrap border-b border-white/[0.08]">{c}</th>

export default function Clientes() {
  const { clientes, recargarClientes } = useApp()
  const [modal,      setModal]      = useState(false)
  const [editando,   setEditando]   = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [busqueda,   setBusqueda]   = useState('')

  const filtered = useMemo(() =>
    clientes.filter(c =>
      !busqueda ||
      c.razonSocial?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.ruc?.includes(busqueda) ||
      c.contacto?.toLowerCase().includes(busqueda.toLowerCase())
    )
  , [clientes, busqueda])

  function handleSave(data) {
    storage.saveCliente(data)
    recargarClientes()
    setModal(false)
  }

  function handleDelete(id) {
    storage.deleteCliente(id)
    recargarClientes()
    setConfirmDel(null)
  }

  const kpis = useMemo(() => ({
    total:   clientes.length,
    activos: clientes.filter(c => c.activo).length,
  }), [clientes])

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          ['Total clientes',  kpis.total,   '#00c896', Users],
          ['Clientes activos',kpis.activos, '#22c55e', Users],
          ['Inactivos',       kpis.total - kpis.activos, '#5f6f80', Users],
          ['Mostrando',       filtered.length, '#3b82f6', Users],
        ].map(([label, val, color, Icon]) => (
          <div key={label} className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }}/>
            <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] mb-2">{label}</div>
            <div className="text-[28px] font-semibold text-[#e8edf2]">{val}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Clientes</span>
          <Btn variant="primary" size="sm" onClick={() => { setEditando(null); setModal(true) }}>
            <Plus size={13}/> Nuevo Cliente
          </Btn>
        </div>

        <div className="relative mb-3 max-w-sm">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
          <input className={SI + ' pl-8'} placeholder="Buscar razón social, RUC..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr>
              <TH c="Razón Social"/><TH c="RUC"/><TH c="Contacto"/>
              <TH c="Teléfono"/><TH c="Email"/><TH c="Dirección"/><TH c="Estado"/><TH c="Acciones"/>
            </tr></thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8}>
                  <EmptyState icon={Users} title="Sin clientes" description="Agrega el primer cliente."/>
                </td></tr>
              )}
              {filtered.map(cli => (
                <tr key={cli.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]">
                  <td className="px-3.5 py-2.5 font-medium text-[#e8edf2]">{cli.razonSocial}</td>
                  <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{cli.ruc || '—'}</td>
                  <td className="px-3.5 py-2.5 text-[#9ba8b6]">{cli.contacto || '—'}</td>
                  <td className="px-3.5 py-2.5 text-[#9ba8b6]">{cli.telefono || '—'}</td>
                  <td className="px-3.5 py-2.5 text-[12px] text-blue-400">{cli.email || '—'}</td>
                  <td className="px-3.5 py-2.5 text-[12px] text-[#9ba8b6] max-w-[180px] truncate">{cli.direccion || '—'}</td>
                  <td className="px-3.5 py-2.5">
                    <Badge variant={cli.activo ? 'success' : 'neutral'}>{cli.activo ? 'Activo' : 'Inactivo'}</Badge>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <div className="flex gap-1">
                      <Btn variant="ghost" size="icon" title="Editar"
                        onClick={() => { setEditando(cli); setModal(true) }}>
                        <Edit2 size={13}/>
                      </Btn>
                      <Btn variant="ghost" size="icon" title="Eliminar"
                        className="text-red-400 hover:text-red-300"
                        onClick={() => setConfirmDel(cli.id)}>
                        <Trash2 size={13}/>
                      </Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ModalCliente
        open={modal}
        onClose={() => { setModal(false); setEditando(null) }}
        editando={editando}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => handleDelete(confirmDel)}
        danger
        title="Eliminar cliente"
        message="¿Eliminar este cliente? Esta acción no se puede deshacer."
      />
    </div>
  )
}

function ModalCliente({ open, onClose, editando, onSave }) {
  const init = { razonSocial:'', ruc:'', contacto:'', telefono:'', email:'', direccion:'', activo:true }
  const [form, setForm] = useState(init)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    setForm(editando ? { ...init, ...editando } : init)
  }, [editando, open])

  return (
    <Modal
      open={open} onClose={onClose}
      title={editando ? 'Editar Cliente' : 'Nuevo Cliente'}
      size="md"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" disabled={!form.razonSocial.trim()}
          onClick={() => form.razonSocial.trim() && onSave(form)}>
          Guardar
        </Btn>
      </>}
    >
      <Field label="Razón Social *">
        <input className={SI} value={form.razonSocial}
          onChange={e => f('razonSocial', e.target.value)} placeholder="Empresa XYZ S.A.C."/>
      </Field>
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="RUC / DNI">
          <input className={SI} value={form.ruc}
            onChange={e => f('ruc', e.target.value)} placeholder="20123456789" maxLength={11}/>
        </Field>
        <Field label="Persona de Contacto">
          <input className={SI} value={form.contacto}
            onChange={e => f('contacto', e.target.value)} placeholder="Nombre del contacto"/>
        </Field>
        <Field label="Teléfono">
          <input className={SI} value={form.telefono}
            onChange={e => f('telefono', e.target.value)} placeholder="01-2345678"/>
        </Field>
        <Field label="Email">
          <input type="email" className={SI} value={form.email}
            onChange={e => f('email', e.target.value)} placeholder="contacto@empresa.pe"/>
        </Field>
      </div>
      <DireccionInput
        label="Dirección de entrega"
        value={form.direccion}
        onChange={v => f('direccion', v)}
        placeholder="Av. Principal 123, Distrito, Lima"
      />
      <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[#9ba8b6]">
        <input type="checkbox" checked={form.activo}
          onChange={e => f('activo', e.target.checked)} className="accent-[#00c896]"/>
        Cliente activo
      </label>
    </Modal>
  )
}
