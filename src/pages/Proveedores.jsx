import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Edit2, Trash2, Building2, Download, FileText } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { Modal, ConfirmDialog, Badge, Btn, Field, Input, DataTable } from '../components/ui/index'
import { usePlanLimits } from '../hooks/usePlanLimits'
import { exportarProveedoresXLSX } from '../utils/exportXLSX'
import { exportarProveedoresPDF } from '../utils/exportPDF'
import {
  useProveedoresList, useCrearProveedor, useActualizarProveedor, useEliminarProveedor,
} from '../queries/proveedores.queries'

export default function Proveedores() {
  const { toast, sesion } = useApp()
  const planLimits = usePlanLimits()
  const { data: proveedores = [], isLoading, isError } = useProveedoresList()
  const crearProveedor      = useCrearProveedor()
  const actualizarProveedor = useActualizarProveedor()
  const eliminarProveedor   = useEliminarProveedor()

  const [modal,      setModal]      = useState(false)
  const [editando,   setEditando]   = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [busqueda,   setBusqueda]   = useState('')

  const filtered = useMemo(() =>
    proveedores.filter(p =>
      !busqueda ||
      p.razonSocial.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.ruc?.includes(busqueda) ||
      p.direccion?.toLowerCase().includes(busqueda.toLowerCase())
    )
  , [proveedores, busqueda])

  async function handleSave(data) {
    const res = editando
      ? await actualizarProveedor.mutateAsync({ id: editando.id, ...data })
      : await crearProveedor.mutateAsync(data)
    if (res.error) { toast(res.error, 'error'); return }
    setModal(false)
    toast(editando ? 'Proveedor actualizado' : 'Proveedor creado', 'success')
  }

  async function handleDelete(id) {
    const res = await eliminarProveedor.mutateAsync(id)
    if (res.error) { toast(res.error, 'error'); return }
    setConfirmDel(null)
    toast('Proveedor eliminado', 'success')
  }

  if (isError) return (
    <div className="flex-1 p-4 md:p-6">
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-8 text-center text-[#5f6f80] text-[13px]">
        Error al cargar proveedores. Verifica la conexión con el servidor.
      </div>
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] whitespace-nowrap">Proveedores</span>
            <div className="relative w-[220px]">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
              <Input className="pl-8 !py-[5px] text-[12px]" placeholder="Buscar razón social, RUC..."
                value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Btn variant="ghost" size="sm" onClick={() => exportarProveedoresXLSX(proveedores)}>
              <Download size={13}/> Excel
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => exportarProveedoresPDF(proveedores, sesion?.nombre)}>
              <FileText size={13}/> PDF
            </Btn>
            <div className="flex items-center gap-2">
              {planLimits.proveedores.maximo !== -1 && (
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  !planLimits.proveedores.permitido ? 'bg-red-500/20 text-red-400' :
                  planLimits.proveedores.porcentaje >= 80 ? 'bg-amber-500/20 text-amber-400' :
                  'bg-white/6 text-[#5f6f80]'
                }`}>
                  {planLimits.proveedores.actual}/{planLimits.proveedores.maximo}
                </span>
              )}
              <Btn variant="primary" size="sm"
                disabled={!planLimits.proveedores.permitido}
                title={planLimits.proveedores.mensaje || undefined}
                onClick={() => { setEditando(null); setModal(true) }}>
                <Plus size={13}/> Nuevo Proveedor
              </Btn>
            </div>
          </div>
        </div>

        <DataTable
          loading={isLoading}
          rows={filtered}
          rowKey={p => p.id}
          onRowClick={p => { setEditando(p); setModal(true) }}
          emptyIcon={Building2}
          emptyTitle="Sin proveedores"
          emptyDescription="Agrega tu primer proveedor."
          columns={[
            { key:'razonSocial', header:'Razón Social', render: p => <span className="font-medium text-[#e8edf2]">{p.razonSocial}</span> },
            { key:'ruc', header:'RUC', render: p => <span className="font-mono text-[12px] text-[#9ba8b6]">{p.ruc || '—'}</span> },
            { key:'telefono', header:'Teléfono', render: p => <span className="text-[#9ba8b6]">{p.telefono || '—'}</span> },
            { key:'email', header:'Email', render: p => <span className="text-[12px] text-blue-400">{p.email || '—'}</span> },
            { key:'direccion', header:'Dirección', render: p => <span className="text-[#9ba8b6] max-w-[180px] truncate block">{p.direccion || '—'}</span> },
            { key:'estado', header:'Estado', render: p => <Badge variant={p.activo ? 'success' : 'neutral'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge> },
            { key:'acciones', header:'Acciones', stopPropagation:true, render: p => (
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
            ) },
          ]}
        />
      </div>

      {/* Guía de uso */}
      <div className="bg-[#161d28] border border-white/6 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          ¿Cómo funciona el módulo de Proveedores?
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {[
            ['1. Registrar proveedor', 'Solo la Razón Social es obligatoria — RUC, teléfono, email y dirección son opcionales pero recomendados para las Órdenes de Compra y Cotizaciones.'],
            ['2. Usar en el sistema',  'Un proveedor activo aparece en los selectores de Entradas, Órdenes de Compra y Cotizaciones. Uno inactivo queda oculto de esos formularios pero conserva su historial.'],
            ['3. Editar o eliminar',   'Haz clic en la fila (o en el ícono de editar) para actualizar sus datos. Eliminar es permanente — revisa que no tenga movimientos u OC en curso antes de borrarlo.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
              <div className="text-[11px] font-semibold text-[#e8edf2] mb-1.5">{t}</div>
              <div className="text-[11px] text-[#5f6f80] leading-relaxed">{d}</div>
            </div>
          ))}
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
  const init = { razonSocial: '', ruc: '', telefono: '', email: '', direccion: '', activo: true }
  const [form, setForm] = useState(init)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    setForm(editando ? {
      ...init, ...editando,
      ruc:       editando.ruc       || '',
      telefono:  editando.telefono  || '',
      email:     editando.email     || '',
      direccion: editando.direccion || '',
    } : init)
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
        <Input value={form.razonSocial}
          onChange={e => f('razonSocial', e.target.value)}
          placeholder="Importaciones XYZ S.A.C."/>
      </Field>

      <div className="grid grid-cols-2 gap-3.5">
        <Field label="RUC">
          <Input value={form.ruc}
            onChange={e => f('ruc', e.target.value)}
            placeholder="20123456789" maxLength={11}/>
        </Field>
        <Field label="Teléfono">
          <Input value={form.telefono}
            onChange={e => f('telefono', e.target.value)}
            placeholder="01-2345678 / 987654321"/>
        </Field>
      </div>

      <Field label="Email">
        <Input type="email" value={form.email}
          onChange={e => f('email', e.target.value)}
          placeholder="ventas@proveedor.pe"/>
      </Field>

      <Field label="Dirección">
        <Input value={form.direccion}
          onChange={e => f('direccion', e.target.value)}
          placeholder="Av. Industrial 123, Lima"/>
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
