import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Target, Building2 } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { Modal, ConfirmDialog, EmptyState, Badge, Btn, Field, Select } from '../../components/ui/index'
import { useCdrList, useCrearCdr, useActualizarCdr, useEliminarCdr } from '../../queries/cdr.queries'
import {
  useProyectosList, useCrearProyecto, useActualizarProyecto, useEliminarProyecto,
} from '../../queries/proyectos.queries'
import { useClientesList } from '../../queries/clientes.queries'

const SI = 'w-full px-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit] placeholder-[#5f6f80]'

export default function Proyectos() {
  const [tab, setTab] = useState('proyectos')

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">
      <div>
        <h1 className="text-[18px] font-bold text-[#e8edf2]">Proyectos y CDR</h1>
        <p className="text-[12px] text-[#5f6f80] mt-0.5">Catálogo usado en Pedidos Internos para etiquetar consumo por proyecto — alimenta el reporte de Consumo por Proyecto.</p>
      </div>

      <div className="flex gap-0.5 border-b border-white/8">
        {[
          ['proyectos', 'Proyectos', Target],
          ['cdr',       'CDR',       Building2],
        ].map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-[13px] font-medium border-b-2 -mb-px transition-all
              ${tab === id ? 'text-[#00c896] border-[#00c896]' : 'text-[#5f6f80] border-transparent hover:text-[#9ba8b6]'}`}>
            <Icon size={14}/>{label}
          </button>
        ))}
      </div>

      {tab === 'proyectos' && <TabProyectos/>}
      {tab === 'cdr'       && <TabCdr/>}
    </div>
  )
}

/* ── Tab Proyectos ─────────────────────────────────── */
function TabProyectos() {
  const { toast } = useApp()
  const { data: proyectos = [], isLoading } = useProyectosList({ incluirInactivos: true })
  const { data: cdrs      = [] } = useCdrList()
  const { data: clientes  = [] } = useClientesList()
  const crear      = useCrearProyecto()
  const actualizar = useActualizarProyecto()
  const eliminar   = useEliminarProyecto()

  const [modal,      setModal]      = useState(false)
  const [editando,   setEditando]   = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  async function handleSave(data) {
    const dto = {
      codigo: data.codigo, nombre: data.nombre,
      clienteId: data.clienteId || undefined, cdrId: data.cdrId || undefined,
      estado: data.estado, fechaInicio: data.fechaInicio || undefined, fechaFin: data.fechaFin || undefined,
    }
    const res = editando
      ? await actualizar.mutateAsync({ id: editando.id, ...dto, activo: data.activo })
      : await crear.mutateAsync(dto)
    if (res.error) { toast(res.error, 'error'); return }
    setModal(false)
    toast(editando ? 'Proyecto actualizado' : 'Proyecto creado', 'success')
  }

  async function handleDel(id) {
    const res = await eliminar.mutateAsync(id)
    if (res.error) { toast(res.error, 'error'); return }
    toast('Proyecto eliminado', 'success')
  }

  return (
    <>
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Proyectos</span>
          <Btn variant="primary" size="sm" onClick={() => { setEditando(null); setModal(true) }}><Plus size={13}/> Nuevo Proyecto</Btn>
        </div>
        {isLoading ? <div className="text-center py-8 text-[#5f6f80] text-[13px]">Cargando…</div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {proyectos.length === 0 && (
              <div className="md:col-span-2">
                <EmptyState icon={Target} title="Sin proyectos" description="Crea el primer proyecto para poder etiquetar Pedidos Internos."/>
              </div>
            )}
            {proyectos.map(p => (
              <div key={p.id} className="flex items-start justify-between p-4 bg-[#1a2230] border border-white/6 rounded-xl hover:border-white/12 transition-colors">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#f97316]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Target size={14} className="text-[#f97316]"/>
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-[#e8edf2] text-[14px] truncate">{p.codigo} — {p.nombre}</div>
                    <div className="text-[12px] text-[#5f6f80] mt-0.5 truncate">{p.cdr?.nombre || 'Sin CDR'} · {p.cliente?.razonSocial || 'Sin cliente'}</div>
                    <div className="mt-1.5 flex gap-1.5">
                      <Badge variant={p.estado === 'EN_EJECUCION' ? 'info' : 'neutral'}>{p.estado === 'EN_EJECUCION' ? 'En ejecución' : 'Cerrado'}</Badge>
                      <Badge variant={p.activo ? 'success' : 'neutral'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 ml-3">
                  <Btn variant="ghost" size="icon" onClick={() => { setEditando(p); setModal(true) }}><Edit2 size={13}/></Btn>
                  <Btn variant="ghost" size="icon" className="text-red-400 hover:text-red-300" onClick={() => setConfirmDel(p.id)}><Trash2 size={13}/></Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ModalProyecto open={modal} onClose={() => setModal(false)} editando={editando} onSave={handleSave} cdrs={cdrs} clientes={clientes}/>
      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={() => handleDel(confirmDel)} danger
        title="Eliminar proyecto" message="¿Eliminar este proyecto? Los Pedidos Internos ya etiquetados con él lo conservan como referencia histórica."/>
    </>
  )
}

function ModalProyecto({ open, onClose, editando, onSave, cdrs, clientes }) {
  const init = { codigo: '', nombre: '', clienteId: '', cdrId: '', estado: 'EN_EJECUCION', fechaInicio: '', fechaFin: '', activo: true }
  const [form, setForm] = useState(init)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  useEffect(() => {
    setForm(editando ? {
      ...init, ...editando,
      clienteId: editando.cliente?.id || '', cdrId: editando.cdr?.id || '',
      fechaInicio: editando.fechaInicio?.split('T')[0] || '', fechaFin: editando.fechaFin?.split('T')[0] || '',
    } : init)
  }, [editando, open]) // eslint-disable-line

  const puedeGuardar = form.codigo.trim() && form.nombre.trim()

  return (
    <Modal open={open} onClose={onClose} title={editando ? 'Editar Proyecto' : 'Nuevo Proyecto'} size="md"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" onClick={() => puedeGuardar && onSave(form)} disabled={!puedeGuardar}>Guardar</Btn>
      </>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Código *">
          <input className={SI} value={form.codigo} onChange={e => f('codigo', e.target.value)} placeholder="PRY-01"/>
        </Field>
        <Field label="Estado">
          <Select value={form.estado} onChange={e => f('estado', e.target.value)}>
            <option value="EN_EJECUCION">En ejecución</option>
            <option value="CERRADO">Cerrado</option>
          </Select>
        </Field>
      </div>
      <Field label="Nombre *">
        <input className={SI} value={form.nombre} onChange={e => f('nombre', e.target.value)} placeholder="Ampliación Tajo Norte"/>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cliente (minera)" hint="Opcional">
          <Select value={form.clienteId} onChange={e => f('clienteId', e.target.value)}>
            <option value="">Sin cliente</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.razonSocial}</option>)}
          </Select>
        </Field>
        <Field label="CDR" hint="Centro de Responsabilidad">
          <Select value={form.cdrId} onChange={e => f('cdrId', e.target.value)}>
            <option value="">Sin CDR</option>
            {cdrs.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>)}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha inicio">
          <input type="date" className={SI} value={form.fechaInicio} onChange={e => f('fechaInicio', e.target.value)}/>
        </Field>
        <Field label="Fecha fin">
          <input type="date" className={SI} value={form.fechaFin} onChange={e => f('fechaFin', e.target.value)}/>
        </Field>
      </div>
      {editando && (
        <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[#9ba8b6]">
          <input type="checkbox" checked={form.activo} onChange={e => f('activo', e.target.checked)} className="accent-[#00c896]"/>
          Proyecto activo
        </label>
      )}
    </Modal>
  )
}

/* ── Tab CDR ────────────────────────────────────────── */
function TabCdr() {
  const { toast } = useApp()
  const { data: cdrs = [], isLoading } = useCdrList({ incluirInactivos: true })
  const crear      = useCrearCdr()
  const actualizar = useActualizarCdr()
  const eliminar   = useEliminarCdr()

  const [modal,      setModal]      = useState(false)
  const [editando,   setEditando]   = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  async function handleSave(data) {
    const res = editando
      ? await actualizar.mutateAsync({ id: editando.id, ...data })
      : await crear.mutateAsync(data)
    if (res.error) { toast(res.error, 'error'); return }
    setModal(false)
    toast(editando ? 'CDR actualizado' : 'CDR creado', 'success')
  }

  async function handleDel(id) {
    const res = await eliminar.mutateAsync(id)
    if (res.error) { toast(res.error, 'error'); return }
    toast('CDR eliminado', 'success')
  }

  return (
    <>
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Centros de Responsabilidad (CDR)</span>
          <Btn variant="primary" size="sm" onClick={() => { setEditando(null); setModal(true) }}><Plus size={13}/> Nuevo CDR</Btn>
        </div>
        {isLoading ? <div className="text-center py-8 text-[#5f6f80] text-[13px]">Cargando…</div> : (
          <div className="grid grid-cols-2 gap-3">
            {cdrs.length === 0 && (
              <div className="col-span-2">
                <EmptyState icon={Building2} title="Sin CDR" description="Crea el primer Centro de Responsabilidad."/>
              </div>
            )}
            {cdrs.map(c => (
              <div key={c.id} className="flex items-start justify-between p-4 bg-[#1a2230] border border-white/6 rounded-xl hover:border-white/12 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#f97316]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 size={14} className="text-[#f97316]"/>
                  </div>
                  <div>
                    <div className="font-medium text-[#e8edf2] text-[14px]">{c.codigo} — {c.nombre}</div>
                    {c.responsable && <div className="text-[12px] text-[#5f6f80] mt-0.5">Responsable: {c.responsable}</div>}
                    <div className="mt-1.5"><Badge variant={c.activo ? 'success' : 'neutral'}>{c.activo ? 'Activo' : 'Inactivo'}</Badge></div>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 ml-3">
                  <Btn variant="ghost" size="icon" onClick={() => { setEditando(c); setModal(true) }}><Edit2 size={13}/></Btn>
                  <Btn variant="ghost" size="icon" className="text-red-400 hover:text-red-300" onClick={() => setConfirmDel(c.id)}><Trash2 size={13}/></Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ModalCdr open={modal} onClose={() => setModal(false)} editando={editando} onSave={handleSave}/>
      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={() => handleDel(confirmDel)} danger
        title="Eliminar CDR" message="¿Eliminar este CDR? Los proyectos que ya lo tienen asignado lo conservan como referencia histórica."/>
    </>
  )
}

function ModalCdr({ open, onClose, editando, onSave }) {
  const init = { codigo: '', nombre: '', responsable: '', activo: true }
  const [form, setForm] = useState(init)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  useEffect(() => { setForm(editando ? { ...init, ...editando } : init) }, [editando, open]) // eslint-disable-line

  const puedeGuardar = form.codigo.trim() && form.nombre.trim()

  return (
    <Modal open={open} onClose={onClose} title={editando ? 'Editar CDR' : 'Nuevo CDR'} size="sm"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" onClick={() => puedeGuardar && onSave(form)} disabled={!puedeGuardar}>Guardar</Btn>
      </>}>
      <Field label="Código *">
        <input className={SI} value={form.codigo} onChange={e => f('codigo', e.target.value)} placeholder="CDR-01"/>
      </Field>
      <Field label="Nombre *">
        <input className={SI} value={form.nombre} onChange={e => f('nombre', e.target.value)} placeholder="Gerencia de Obras Civiles"/>
      </Field>
      <Field label="Responsable">
        <input className={SI} value={form.responsable} onChange={e => f('responsable', e.target.value)} placeholder="Nombre del responsable"/>
      </Field>
      {editando && (
        <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[#9ba8b6]">
          <input type="checkbox" checked={form.activo} onChange={e => f('activo', e.target.checked)} className="accent-[#00c896]"/>
          CDR activo
        </label>
      )}
    </Modal>
  )
}
