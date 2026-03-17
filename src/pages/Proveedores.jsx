import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Edit2, Trash2, Building2 } from 'lucide-react'
import { useApp } from '../store/AppContext'
import * as storage from '../services/storage'
import { Modal, ConfirmDialog, EmptyState, Badge, Btn, Field } from '../components/ui/index'

const TH = ({c}) => <th className="bg-[#1a2230] px-3.5 py-2.5 text-left text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] whitespace-nowrap border-b border-white/[0.08] sticky top-0">{c}</th>
const SI = 'px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 w-full font-[inherit] placeholder-[#5f6f80]'

export default function Proveedores() {
  const { proveedores, recargarProveedores } = useApp()
  const [modal,      setModal]      = useState(false)
  const [editando,   setEditando]   = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [busqueda,   setBusqueda]   = useState('')

  const filtered = useMemo(() =>
    proveedores.filter(p =>
      !busqueda ||
      p.razonSocial.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.ruc?.includes(busqueda) ||
      p.contacto?.toLowerCase().includes(busqueda.toLowerCase())
    )
  , [proveedores, busqueda])

  function handleSave(data) {
    storage.saveProveedor(data)
    recargarProveedores()
    setModal(false)
  }

  function handleDelete(id) {
    storage.deleteProveedor(id)
    recargarProveedores()
    setConfirmDel(null)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Proveedores</span>
          <Btn variant="primary" size="sm" onClick={() => { setEditando(null); setModal(true) }}>
            <Plus size={13}/> Nuevo Proveedor
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
              <TH c="Teléfono"/><TH c="Email"/><TH c="Plazo"/><TH c="Estado"/><TH c="Acciones"/>
            </tr></thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8}>
                  <EmptyState icon={Building2} title="Sin proveedores" description="Agrega tu primer proveedor."/>
                </td></tr>
              )}
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]">
                  <td className="px-3.5 py-2.5 font-medium text-[#e8edf2]">{p.razonSocial}</td>
                  <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{p.ruc || '—'}</td>
                  <td className="px-3.5 py-2.5 text-[#9ba8b6]">{p.contacto || '—'}</td>
                  <td className="px-3.5 py-2.5 text-[#9ba8b6]">{p.telefono || '—'}</td>
                  <td className="px-3.5 py-2.5 text-[12px] text-blue-400">{p.email || '—'}</td>
                  <td className="px-3.5 py-2.5 text-center text-[#9ba8b6]">{p.plazoEntrega ? `${p.plazoEntrega}d` : '—'}</td>
                  <td className="px-3.5 py-2.5">
                    <Badge variant={p.activo ? 'success' : 'neutral'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <div className="flex gap-1">
                      <Btn variant="ghost" size="icon" title="Editar"
                        onClick={() => { setEditando(p); setModal(true) }}>
                        <Edit2 size={13}/>
                      </Btn>
                      <Btn variant="ghost" size="icon" title="Eliminar"
                        className="text-red-400 hover:text-red-300"
                        onClick={() => setConfirmDel(p.id)}>
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

      <ModalProveedor
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
        title="Eliminar proveedor"
        message="¿Eliminar este proveedor? Esta acción no se puede deshacer."
      />
    </div>
  )
}

function ModalProveedor({ open, onClose, editando, onSave }) {
  const init = { razonSocial:'', ruc:'', contacto:'', telefono:'', email:'', plazoEntrega:'', activo:true }
  const [form, setForm] = useState(init)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // useEffect correcto — se dispara cuando cambia editando o cuando se abre el modal
  useEffect(() => {
    setForm(editando ? { ...init, ...editando } : init)
  }, [editando, open])

  const canSave = form.razonSocial.trim().length > 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editando ? 'Editar Proveedor' : 'Nuevo Proveedor'}
      size="md"
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" onClick={() => canSave && onSave(form)} disabled={!canSave}>
            Guardar
          </Btn>
        </>
      }
    >
      <Field label="Razón Social *">
        <input className={SI} value={form.razonSocial}
          onChange={e => f('razonSocial', e.target.value)}
          placeholder="Importaciones XYZ S.A.C."/>
      </Field>

      <div className="grid grid-cols-2 gap-3.5">
        <Field label="RUC">
          <input className={SI} value={form.ruc}
            onChange={e => f('ruc', e.target.value)}
            placeholder="20123456789" maxLength={11}/>
        </Field>
        <Field label="Plazo de Entrega (días)">
          <input type="number" className={SI} value={form.plazoEntrega}
            onChange={e => f('plazoEntrega', e.target.value)} min="0"/>
        </Field>
        <Field label="Persona de Contacto">
          <input className={SI} value={form.contacto}
            onChange={e => f('contacto', e.target.value)}
            placeholder="Nombre del contacto"/>
        </Field>
        <Field label="Teléfono">
          <input className={SI} value={form.telefono}
            onChange={e => f('telefono', e.target.value)}
            placeholder="01-2345678 / 987654321"/>
        </Field>
      </div>

      <Field label="Email">
        <input type="email" className={SI} value={form.email}
          onChange={e => f('email', e.target.value)}
          placeholder="ventas@proveedor.pe"/>
      </Field>

      <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[#9ba8b6]">
        <input type="checkbox" checked={form.activo}
          onChange={e => f('activo', e.target.checked)}
          className="accent-[#00c896]"/>
        Proveedor activo
      </label>
    </Modal>
  )
}
