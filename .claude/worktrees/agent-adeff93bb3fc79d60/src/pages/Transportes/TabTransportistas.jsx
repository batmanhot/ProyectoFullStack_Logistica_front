import { useState, useMemo } from 'react'
import {
  Plus, Search, Edit2, Trash2, Truck, Download, FileText
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { Badge, Btn, ConfirmDialog, Input, DataTable } from '../../components/ui/index'
import { useTransportistasList, useCrearTransportista, useActualizarTransportista, useEliminarTransportista } from '../../queries/transportistas.queries'
import { exportarTransportistasXLSX } from '../../utils/exportXLSX'
import { exportarTransportistasPDF } from '../../utils/exportPDF'
import ModalTransportista from './ModalTransportista'

// ════════════════════════════════════════════════════════
// TAB TRANSPORTISTAS
// ════════════════════════════════════════════════════════
export default function TabTransportistas() {
  const { toast, sesion } = useApp()

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
          <div className="flex items-center gap-2">
            <Btn variant="ghost" size="sm" onClick={() => exportarTransportistasXLSX(filtered)}>
              <Download size={13}/> Excel
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => exportarTransportistasPDF(filtered, sesion?.nombre)}>
              <FileText size={13}/> PDF
            </Btn>
            <Btn variant="primary" size="sm" onClick={() => { setEditando(null); setModal(true) }}><Plus size={13}/> Nuevo</Btn>
          </div>
        </div>
        <div className="relative mb-3 max-w-sm">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
          <Input className="pl-8" placeholder="Buscar nombre, placa..."
            value={busq} onChange={e => setBusq(e.target.value)}/>
        </div>
        <DataTable
          loading={isLoading}
          rows={filtered}
          rowKey={t => t.id}
          onRowClick={t => { setEditando(t); setModal(true) }}
          sortConfig={sortConfig}
          onSort={handleSort}
          emptyIcon={Truck}
          emptyTitle="Sin transportistas"
          emptyDescription="Agrega el primer transportista."
          columns={[
            { key: 'nombre',   header: 'Nombre', sortable: true, render: t => <span className="font-medium text-[#e8edf2]">{t.nombre}</span> },
            { key: 'tipo',     header: 'Tipo', sortable: true, render: t => <Badge variant={t.tipo === 'PROPIO' ? 'teal' : 'neutral'}>{t.tipo}</Badge> },
            { key: 'placa',    header: 'Placa', sortable: true, render: t => <span className="font-mono text-[12px] text-[#9ba8b6]">{t.placa || '—'}</span> },
            { key: 'vehiculo', header: 'Vehículo', sortable: true, render: t => <span className="text-[12px] text-[#9ba8b6]">{t.vehiculo || '—'}</span> },
            { key: 'telefono', header: 'Teléfono', sortable: true, render: t => <span className="text-[12px] text-[#9ba8b6]">{t.telefono || '—'}</span> },
            { key: 'licencia', header: 'Licencia', sortable: true, render: t => <span className="font-mono text-[12px] text-[#9ba8b6]">{t.licencia || '—'}</span> },
            { key: 'activo',   header: 'Estado', sortable: true, render: t => <Badge variant={t.activo ? 'success' : 'neutral'}>{t.activo ? 'Activo' : 'Inactivo'}</Badge> },
            { key: 'acciones', header: 'Acciones', stopPropagation: true, render: t => (
                <div className="flex gap-1">
                  <Btn variant="ghost" size="icon" onClick={() => { setEditando(t); setModal(true) }}><Edit2 size={13}/></Btn>
                  <Btn variant="ghost" size="icon" className="text-red-400 hover:text-red-300" onClick={() => setConfirmDel(t.id)}><Trash2 size={13}/></Btn>
                </div>
              ) },
          ]}
        />
      </div>

      <div className="bg-[#161d28] border border-white/6 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          ¿Cómo funciona el módulo de Transportistas?
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {[
            ['1. Registrar', 'Agrega cada transportista con su tipo (Propio o Tercero), placa, vehículo y datos de contacto.'],
            ['2. Asignar', 'Al programar una Ruta, eliges el transportista de esta lista — solo se listan los activos.'],
            ['3. Mantener', 'Marca como inactivo al transportista que ya no opera, sin perder su historial de rutas pasadas.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
              <div className="text-[11px] font-semibold text-[#e8edf2] mb-1.5">{t}</div>
              <div className="text-[11px] text-[#5f6f80] leading-relaxed">{d}</div>
            </div>
          ))}
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
