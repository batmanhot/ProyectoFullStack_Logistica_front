import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Tag, Warehouse } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { Modal, ConfirmDialog, EmptyState, Badge, Btn, Field } from '../components/ui/index'
import { usePlanLimits } from '../hooks/usePlanLimits'
import {
  useCategoriasList, useCrearCategoria, useActualizarCategoria, useEliminarCategoria,
} from '../queries/categorias.queries'
import {
  useAlmacenesList, useCrearAlmacen, useActualizarAlmacen, useEliminarAlmacen,
} from '../queries/almacenes.queries'

const SI = 'w-full px-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit] placeholder-[#5f6f80]'

export default function Maestros() {
  const [tab, setTab] = useState('categorias')

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">
      <div className="flex gap-0.5 border-b border-white/8">
        {[
          ['categorias', 'Categorías', Tag],
          ['almacenes',  'Almacenes',  Warehouse],
        ].map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-[13px] font-medium border-b-2 -mb-px transition-all
              ${tab === id ? 'text-[#00c896] border-[#00c896]' : 'text-[#5f6f80] border-transparent hover:text-[#9ba8b6]'}`}>
            <Icon size={14}/>{label}
          </button>
        ))}
      </div>

      {tab === 'categorias' && <TabCategorias/>}
      {tab === 'almacenes'  && <TabAlmacenes/>}
    </div>
  )
}

/* ── Tab Categorías ────────────────────────────────── */
export function TabCategorias() {
  const { toast } = useApp()
  const { data: categorias = [], isLoading, isError } = useCategoriasList()
  const crearCategoria      = useCrearCategoria()
  const actualizarCategoria = useActualizarCategoria()
  const eliminarCategoria   = useEliminarCategoria()

  const [modal,      setModal]      = useState(false)
  const [editando,   setEditando]   = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  async function handleSave(data) {
    const res = editando
      ? await actualizarCategoria.mutateAsync({ id: editando.id, ...data })
      : await crearCategoria.mutateAsync(data)
    if (res.error) { toast(res.error, 'error'); return }
    setModal(false)
    toast(editando ? 'Categoría actualizada' : 'Categoría creada', 'success')
  }

  async function handleDel(id) {
    const res = await eliminarCategoria.mutateAsync(id)
    if (res.error) { toast(res.error, 'error'); return }
    toast('Categoría eliminada', 'success')
  }

  if (isError) return (
    <div className="bg-[#161d28] border border-white/8 rounded-xl p-8 text-center text-[#5f6f80] text-[13px]">
      Error al cargar categorías. Verifica la conexión con el servidor.
    </div>
  )

  return (
    <>
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
            Categorías de Productos
          </span>
          <Btn variant="primary" size="sm" onClick={() => { setEditando(null); setModal(true) }}>
            <Plus size={13}/> Nueva Categoría
          </Btn>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-[#5f6f80] text-[13px]">Cargando…</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {categorias.length === 0 && (
              <div className="col-span-2">
                <EmptyState icon={Tag} title="Sin categorías" description="Crea tu primera categoría de productos."/>
              </div>
            )}
            {categorias.map(cat => (
              <div key={cat.id}
                className="flex items-start justify-between p-4 bg-[#1a2230] border border-white/6 rounded-xl hover:border-white/12 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#00c896]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Tag size={14} className="text-[#00c896]"/>
                  </div>
                  <div>
                    <div className="font-medium text-[#e8edf2] text-[14px]">{cat.nombre}</div>
                    {cat.descripcion && (
                      <div className="text-[12px] text-[#5f6f80] mt-0.5 leading-snug">{cat.descripcion}</div>
                    )}
                    <div className="mt-1.5">
                      <Badge variant={cat.activo ? 'success' : 'neutral'}>
                        {cat.activo ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 ml-3">
                  <Btn variant="ghost" size="icon" onClick={() => { setEditando(cat); setModal(true) }}>
                    <Edit2 size={13}/>
                  </Btn>
                  <Btn variant="ghost" size="icon" className="text-red-400 hover:text-red-300"
                    onClick={() => setConfirmDel(cat.id)}>
                    <Trash2 size={13}/>
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ModalCategoria open={modal} onClose={() => setModal(false)} editando={editando} onSave={handleSave}/>
      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)}
        onConfirm={() => handleDel(confirmDel)} danger
        title="Eliminar categoría"
        message="¿Eliminar esta categoría? Los productos asignados a ella quedarán sin categoría."/>
    </>
  )
}

function ModalCategoria({ open, onClose, editando, onSave }) {
  const init = { nombre: '', descripcion: '', activo: true }
  const [form, setForm] = useState(init)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  useEffect(() => { setForm(editando ? { ...init, ...editando } : init) }, [editando, open])

  return (
    <Modal open={open} onClose={onClose} title={editando ? 'Editar Categoría' : 'Nueva Categoría'} size="sm"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" onClick={() => form.nombre.trim() && onSave(form)} disabled={!form.nombre.trim()}>
          Guardar
        </Btn>
      </>}>
      <Field label="Nombre *">
        <input className={SI} value={form.nombre} onChange={e => f('nombre', e.target.value)} placeholder="Electrónica, Herramientas..."/>
      </Field>
      <Field label="Descripción">
        <textarea className={SI + ' resize-y min-h-[60px]'} value={form.descripcion}
          onChange={e => f('descripcion', e.target.value)} placeholder="Descripción opcional..."/>
      </Field>
      <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[#9ba8b6]">
        <input type="checkbox" checked={form.activo} onChange={e => f('activo', e.target.checked)} className="accent-[#00c896]"/>
        Categoría activa
      </label>
    </Modal>
  )
}

/* ── Tab Almacenes ─────────────────────────────────── */
export function TabAlmacenes() {
  const { toast } = useApp()
  const planLimits = usePlanLimits()
  const { data: almacenes = [], isLoading, isError } = useAlmacenesList()
  const crearAlmacen      = useCrearAlmacen()
  const actualizarAlmacen = useActualizarAlmacen()
  const eliminarAlmacen   = useEliminarAlmacen()

  const [modal,      setModal]      = useState(false)
  const [editando,   setEditando]   = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  async function handleSave(data) {
    const res = editando
      ? await actualizarAlmacen.mutateAsync({ id: editando.id, nombre: data.nombre, activo: data.activo })
      : await crearAlmacen.mutateAsync({ nombre: data.nombre })
    if (res.error) { toast(res.error, 'error'); return }
    setModal(false)
    toast(editando ? 'Almacén actualizado' : 'Almacén creado', 'success')
  }

  async function handleDel(id) {
    const res = await eliminarAlmacen.mutateAsync(id)
    if (res.error) { toast(res.error, 'error'); return }
    toast('Almacén eliminado', 'success')
  }

  if (isError) return (
    <div className="bg-[#161d28] border border-white/8 rounded-xl p-8 text-center text-[#5f6f80] text-[13px]">
      Error al cargar almacenes. Verifica la conexión con el servidor.
    </div>
  )

  return (
    <>
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
            Almacenes
          </span>
          <div className="flex items-center gap-2">
            {planLimits.almacenes.maximo !== -1 && (
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                !planLimits.almacenes.permitido ? 'bg-red-500/20 text-red-400' :
                planLimits.almacenes.porcentaje >= 80 ? 'bg-amber-500/20 text-amber-400' :
                'bg-white/6 text-[#5f6f80]'
              }`}>
                {planLimits.almacenes.actual}/{planLimits.almacenes.maximo}
              </span>
            )}
            <Btn variant="primary" size="sm"
              disabled={!planLimits.almacenes.permitido}
              title={planLimits.almacenes.mensaje || undefined}
              onClick={() => { setEditando(null); setModal(true) }}>
              <Plus size={13}/> Nuevo Almacén
            </Btn>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-[#5f6f80] text-[13px]">Cargando…</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {almacenes.length === 0 && (
              <div className="col-span-2">
                <EmptyState icon={Warehouse} title="Sin almacenes" description="Crea tu primer almacén."/>
              </div>
            )}
            {almacenes.map(alm => (
              <div key={alm.id}
                className="p-4 bg-[#1a2230] border border-white/6 rounded-xl hover:border-white/12 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-[#00c896]/10 flex items-center justify-center">
                    <Warehouse size={16} className="text-[#00c896]"/>
                  </div>
                  <Badge variant={alm.activo ? 'success' : 'neutral'}>
                    {alm.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>

                <div className="font-semibold text-[#e8edf2] text-[15px] mb-0.5">{alm.nombre}</div>

                <div className="flex gap-1 mt-3 pt-3 border-t border-white/6 justify-end">
                  <Btn variant="ghost" size="icon" onClick={() => { setEditando(alm); setModal(true) }}>
                    <Edit2 size={13}/>
                  </Btn>
                  <Btn variant="ghost" size="icon" className="text-red-400 hover:text-red-300"
                    onClick={() => setConfirmDel(alm.id)}>
                    <Trash2 size={13}/>
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ModalAlmacen open={modal} onClose={() => setModal(false)} editando={editando} onSave={handleSave}/>
      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)}
        onConfirm={() => handleDel(confirmDel)} danger
        title="Eliminar almacén"
        message="¿Eliminar este almacén? Los productos asignados a él quedarán sin almacén."/>
    </>
  )
}

function ModalAlmacen({ open, onClose, editando, onSave }) {
  const init = { nombre: '', activo: true }
  const [form, setForm] = useState(init)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  useEffect(() => { setForm(editando ? { ...init, ...editando } : init) }, [editando, open])

  return (
    <Modal open={open} onClose={onClose} title={editando ? 'Editar Almacén' : 'Nuevo Almacén'} size="sm"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" onClick={() => form.nombre.trim() && onSave(form)} disabled={!form.nombre.trim()}>
          Guardar
        </Btn>
      </>}>
      <Field label="Nombre *">
        <input className={SI} value={form.nombre} onChange={e => f('nombre', e.target.value)} placeholder="Almacén Principal"/>
      </Field>
      <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[#9ba8b6]">
        <input type="checkbox" checked={form.activo} onChange={e => f('activo', e.target.checked)} className="accent-[#00c896]"/>
        Almacén activo
      </label>
    </Modal>
  )
}
