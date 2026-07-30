import { useState, useMemo } from 'react'
import {
  Plus, Search, Edit2, Trash2, Truck, ChevronUp, ChevronDown
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { EmptyState, Badge, Btn, ConfirmDialog } from '../../components/ui/index'
import { useTransportistasList, useCrearTransportista, useActualizarTransportista, useEliminarTransportista } from '../../queries/transportistas.queries'
import { SI } from './constants'
import ModalTransportista from './ModalTransportista'

// ════════════════════════════════════════════════════════
// TAB TRANSPORTISTAS
// ════════════════════════════════════════════════════════
export default function TabTransportistas() {
  const { toast } = useApp()

  const { data: transRaw = [], isLoading } = useTransportistasList({ incluirInactivos: true })
  const crearTransportista    = useCrearTransportista()
  const actualizarTransportista= useActualizarTransportista()
  const eliminarTransportista  = useEliminarTransportista()

  const transportistas = useMemo(() => transRaw.map(t => ({ ...t, activo: t.activo !== false })), [transRaw])

  const [modal,      setModal]      = useState(false)
  const [editando,   setEditando]   = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [busq,       setBusq]       = useState('')
  const [sortConfig, setSortConfig] = useState({ key:'nombre', direction:'asc' })

  const handleSort = key => setSortConfig(s => ({ key, direction: s.key === key && s.direction === 'asc' ? 'desc' : 'asc' }))

  const filtered = useMemo(() => {
    let d = transportistas.filter(t => !busq || t.nombre?.toLowerCase().includes(busq.toLowerCase()) || t.placa?.toLowerCase().includes(busq.toLowerCase()))
    d.sort((a, b) => {
      let aV = a[sortConfig.key], bV = b[sortConfig.key]
      if (typeof aV === 'string') { aV = aV.toLowerCase(); bV = bV?.toLowerCase?.() || '' }
      if (aV < bV) return sortConfig.direction === 'asc' ? -1 : 1
      if (aV > bV) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
    return d
  }, [transportistas, busq, sortConfig])

  async function handleSave(form) {
    const payload = { nombre: form.nombre, tipo: form.tipo, placa: form.placa || undefined, vehiculo: form.vehiculo || undefined, telefono: form.telefono || undefined, email: form.email || undefined, licencia: form.licencia || undefined }
    let res
    if (editando) {
      res = await actualizarTransportista.mutateAsync({ id: editando.id, ...payload, activo: form.activo })
    } else {
      res = await crearTransportista.mutateAsync(payload)
    }
    if (res?.error) { toast(res.error, 'error'); return }
    setModal(false)
    toast(editando ? 'Transportista actualizado' : 'Transportista creado', 'success')
  }

  async function handleDelete(id) {
    const res = await eliminarTransportista.mutateAsync(id)
    if (res?.error) { toast(res.error, 'error'); return }
    setConfirmDel(null)
    toast('Transportista eliminado', 'success')
  }

  const kpis = {
    total:   transportistas.length,
    propios: transportistas.filter(t => t.tipo === 'PROPIO').length,
    terceros:transportistas.filter(t => t.tipo === 'TERCERO').length,
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {[['Total', kpis.total, '#00c896'], ['Propios', kpis.propios, '#3b82f6'], ['Terceros', kpis.terceros, '#f59e0b']].map(([l, v, color]) => (
          <div key={l} className="relative bg-[#161d28] border border-white/8 rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }}/>
            <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] mb-2">{l}</div>
            <div className="text-[28px] font-semibold text-[#e8edf2]">{v}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Transportistas</span>
          <Btn variant="primary" size="sm" onClick={() => { setEditando(null); setModal(true) }}><Plus size={13}/> Nuevo</Btn>
        </div>
        <div className="relative mb-3 max-w-sm">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
          <input className={SI + ' pl-8'} placeholder="Buscar nombre, placa..."
            value={busq} onChange={e => setBusq(e.target.value)}/>
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr>
              {[{l:'Nombre',k:'nombre'},{l:'Tipo',k:'tipo'},{l:'Placa',k:'placa'},{l:'Vehículo',k:'vehiculo'},{l:'Teléfono',k:'telefono'},{l:'Licencia',k:'licencia'},{l:'Estado',k:'activo'},{l:'Acciones'}].map(h => (
                <th key={h.l}
                  className="bg-[#1a2230] px-3.5 py-2.5 text-left text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] border-b border-white/8 cursor-pointer hover:bg-white/2 whitespace-nowrap"
                  onClick={() => h.k && handleSort(h.k)}>
                  <div className="flex items-center gap-1.5">
                    {h.l}
                    {sortConfig.key === h.k && (sortConfig.direction === 'asc' ? <ChevronUp size={10}/> : <ChevronDown size={10}/>)}
                  </div>
                </th>
              ))}
            </tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={8} className="text-center text-[#5f6f80] py-8 text-[12px]">Cargando...</td></tr>}
              {!isLoading && filtered.length === 0 && <tr><td colSpan={8}><EmptyState icon={Truck} title="Sin transportistas" description="Agrega el primer transportista."/></td></tr>}
              {filtered.map(t => (
                <tr key={t.id} className="border-b border-white/6 last:border-0 hover:bg-white/2">
                  <td className="px-3.5 py-2.5 font-medium text-[#e8edf2]">{t.nombre}</td>
                  <td className="px-3.5 py-2.5"><Badge variant={t.tipo === 'PROPIO' ? 'teal' : 'neutral'}>{t.tipo}</Badge></td>
                  <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{t.placa || '—'}</td>
                  <td className="px-3.5 py-2.5 text-[12px] text-[#9ba8b6]">{t.vehiculo || '—'}</td>
                  <td className="px-3.5 py-2.5 text-[12px] text-[#9ba8b6]">{t.telefono || '—'}</td>
                  <td className="px-3.5 py-2.5 font-mono text-[12px] text-[#9ba8b6]">{t.licencia || '—'}</td>
                  <td className="px-3.5 py-2.5"><Badge variant={t.activo ? 'success' : 'neutral'}>{t.activo ? 'Activo' : 'Inactivo'}</Badge></td>
                  <td className="px-3.5 py-2.5">
                    <div className="flex gap-1">
                      <Btn variant="ghost" size="icon" onClick={() => { setEditando(t); setModal(true) }}><Edit2 size={13}/></Btn>
                      <Btn variant="ghost" size="icon" className="text-red-400 hover:text-red-300" onClick={() => setConfirmDel(t.id)}><Trash2 size={13}/></Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <ModalTransportista open onClose={() => { setModal(false); setEditando(null) }}
          editando={editando} onSave={handleSave}
          saving={crearTransportista.isPending || actualizarTransportista.isPending}/>
      )}
      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} danger
        title="Eliminar transportista" message="¿Eliminar este transportista?"
        onConfirm={() => handleDelete(confirmDel)}/>
    </>
  )
}
