import { useState } from 'react'
import { Plus, X, Pencil, Layers, Trash2 } from 'lucide-react'
import { ConfirmDialog, Toggle } from '../../components/ui/index'
import {
  useAreasInternasList,
  useCrearAreaInterna,
  useActualizarAreaInterna,
  useEliminarAreaInterna,
} from '../../queries/areas-internas.queries'
import { SI_CI } from './constants'

const FORM_AREA_VACIO = { codigo:'', nombre:'', descripcion:'', email:'', activo:true }

export default function TabAreasInternas({ toast }) {
  const { data: areas = [] } = useAreasInternasList()
  const crearArea      = useCrearAreaInterna()
  const actualizarArea = useActualizarAreaInterna()
  const eliminarArea   = useEliminarAreaInterna()
  const [modal,      setModal]      = useState(false)
  const [editando,   setEditando]   = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [form,       setForm]       = useState(FORM_AREA_VACIO)
  const [error,      setError]      = useState('')

  function abrirNueva() {
    setEditando(null); setForm(FORM_AREA_VACIO); setError(''); setModal(true)
  }
  function abrirEditar(a) {
    setEditando(a)
    setForm({ codigo:a.codigo, nombre:a.nombre, descripcion:a.descripcion||'', email:a.email||'', activo:a.activo })
    setError(''); setModal(true)
  }
  async function handleGuardar() {
    setError('')
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return }
    if (!form.codigo.trim()) { setError('El código es obligatorio'); return }
    const dto = { ...form, codigo: form.codigo.trim().toUpperCase() }
    const res = editando
      ? await actualizarArea.mutateAsync({ id: editando.id, ...dto })
      : await crearArea.mutateAsync(dto)
    if (res?.error) { setError(res.error); return }
    toast(editando ? 'Área actualizada' : 'Área creada', 'success')
    setModal(false)
  }
  async function handleEliminar(id) {
    const res = await eliminarArea.mutateAsync(id)
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Área eliminada', 'success')
    setConfirmDel(null)
  }
  async function toggleActivo(a) {
    await actualizarArea.mutateAsync({ id: a.id, activo: !a.activo })
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Tabla */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div>
            <div className="text-[14px] font-semibold text-[#e8edf2]">Áreas Internas</div>
            <div className="text-[11px] text-[#5f6f80] mt-0.5">
              Departamentos habilitados para solicitar pedidos al almacén
            </div>
          </div>
          <button onClick={abrirNueva}
            className="flex items-center gap-2 px-3 py-2 bg-[#00c896] hover:bg-[#009e76] text-[#082e1e] text-[12px] font-semibold rounded-lg transition-colors">
            <Plus size={13}/> Nueva Área
          </button>
        </div>

        {areas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2 text-[#5f6f80]">
            <Layers size={32}/>
            <div className="text-[13px]">No hay áreas registradas</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr>
                  {['Código','Nombre','Descripción','Email de contacto','Estado','Acciones'].map(h => (
                    <th key={h} className="bg-[#1a2230] px-4 py-2.5 text-left text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] border-b border-white/6 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {areas.map(a => (
                  <tr key={a.id} className="border-b border-white/4 last:border-0 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-[12px] font-bold px-2.5 py-1 rounded-lg"
                        style={{ background:'var(--accent-dim)', color:'var(--accent)' }}>
                        {a.codigo}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-[#e8edf2]">{a.nombre}</td>
                    <td className="px-4 py-3 text-[#9ba8b6] max-w-[240px] truncate">{a.descripcion || '—'}</td>
                    <td className="px-4 py-3 text-[12px] text-[#9ba8b6]">{a.email || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${a.activo ? 'bg-green-500/15 text-green-400' : 'bg-white/5 text-[#5f6f80]'}`}>
                        {a.activo ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => abrirEditar(a)}
                          className="p-1.5 text-[#5f6f80] hover:text-[#00c896] hover:bg-white/5 rounded-lg transition-colors" title="Editar">
                          <Pencil size={13}/>
                        </button>
                        <button onClick={() => toggleActivo(a)}
                          className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap
                            ${a.activo ? 'bg-white/5 text-[#5f6f80] hover:bg-red-500/10 hover:text-red-400'
                                       : 'bg-[#00c896]/10 text-[#00c896] hover:bg-[#00c896]/20'}`}>
                          {a.activo ? 'Desactivar' : 'Activar'}
                        </button>
                        <button onClick={() => setConfirmDel(a.id)}
                          className="p-1.5 text-[#5f6f80] hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-colors" title="Eliminar">
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[11px] text-[#5f6f80] leading-relaxed">
        Las áreas <strong>activas</strong> aparecen disponibles al crear pedidos internos y al asignar usuarios solicitantes.
        Desactiva un área para ocultarla sin eliminar su historial.
      </p>

      {/* Modal crear / editar */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0e1117] border border-white/10 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <h2 className="text-[15px] font-semibold text-white">
                {editando ? 'Editar área' : 'Nueva área interna'}
              </h2>
              <button onClick={() => setModal(false)} className="text-white/30 hover:text-white/60"><X size={18}/></button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Código *</label>
                  <input className={SI_CI}
                    placeholder="Ej: ADM, LOG..."
                    value={form.codigo}
                    onChange={e => setForm(f => ({...f, codigo:e.target.value.toUpperCase().slice(0,6)}))}
                    disabled={!!editando}
                    style={editando ? {opacity:.5} : {}}
                    autoFocus={!editando}
                    maxLength={6}
                  />
                  {editando
                    ? <span className="text-[10px] text-white/25">El código no se puede cambiar</span>
                    : <span className="text-[10px] text-white/25">Máx. 6 caracteres, único</span>
                  }
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Nombre *</label>
                  <input className={SI_CI}
                    placeholder="Ej: Administración"
                    value={form.nombre}
                    onChange={e => setForm(f => ({...f, nombre:e.target.value}))}
                    autoFocus={!!editando}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Descripción</label>
                <input className={SI_CI}
                  placeholder="Ej: Gestión administrativa y secretaría"
                  value={form.descripcion}
                  onChange={e => setForm(f => ({...f, descripcion:e.target.value}))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Email de contacto</label>
                <input type="email" className={SI_CI}
                  placeholder="area@empresa.pe"
                  value={form.email}
                  onChange={e => setForm(f => ({...f, email:e.target.value}))}
                />
              </div>
              <Toggle label="Área activa (disponible para pedidos)"
                checked={form.activo} onChange={v => setForm(f => ({...f, activo:v}))}/>
              {error && (
                <div className="px-3 py-2 bg-red-500/10 border border-red-500/25 rounded-lg text-[13px] text-red-400">{error}</div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 px-6 pb-5">
              <button onClick={() => setModal(false)}
                className="px-4 py-2 text-[13px] text-white/50 hover:text-white/80 transition-colors">Cancelar</button>
              <button onClick={handleGuardar}
                className="px-5 py-2 bg-[#00c896] hover:bg-[#009e76] text-[#082e1e] text-[13px] font-semibold rounded-lg transition-colors">
                {editando ? 'Guardar cambios' : 'Crear área'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDel} onClose={() => setConfirmDel(null)}
        onConfirm={() => handleEliminar(confirmDel)} danger
        title="Eliminar área"
        message="¿Eliminar esta área? Verifica que no tenga usuarios ni pedidos asociados antes de continuar. Esta acción no se puede deshacer."
      />
    </div>
  )
}
