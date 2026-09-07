import { useState, useMemo } from 'react'
import { Truck, AlertTriangle, CheckCircle, Calendar, Gauge } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { ConfirmDialog } from '../../components/ui/index'
import {
  useFlotaVehiculos, useCrearVehiculo, useActualizarVehiculo, useEliminarVehiculo,
  useFlotaMantenimientos, useRegistrarMantenimiento, useActualizarMantenimiento, useEliminarMantenimiento,
  useFlotaAlertas,
} from '../../queries/flota.queries'
import { TABS } from './constants'
import TabUnidades from './TabUnidades'
import TabMantenimiento from './TabMantenimiento'
import TabCombustible from './TabCombustible'
import TabAlertas from './TabAlertas'
import ModalUnidad from './ModalUnidad'
import ModalMantenimiento from './ModalMantenimiento'

// ════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════
export default function Flota() {
  const { toast, sesion } = useApp()

  const [tab,          setTab]          = useState('unidades')
  const [modal,        setModal]        = useState(false)
  const [editando,     setEditando]     = useState(null)
  const [confirmDel,   setConfirmDel]   = useState(null)
  const [modalMant,    setModalMant]    = useState(null)
  const [editandoMant, setEditandoMant] = useState(null)
  const [confirmDelMant, setConfirmDelMant] = useState(null)
  const [filtDesde,  setFiltDesde]  = useState('')
  const [filtHasta,  setFiltHasta]  = useState('')

  const { data: flota        = [] } = useFlotaVehiculos(true)
  const { data: mantenimientos = [] } = useFlotaMantenimientos({ desde: filtDesde, hasta: filtHasta })
  const { data: alertas      = [] } = useFlotaAlertas()
  const crearVehiculo               = useCrearVehiculo()
  const actualizarVehiculo          = useActualizarVehiculo()
  const eliminarVehiculo            = useEliminarVehiculo()
  const registrarMantenimiento      = useRegistrarMantenimiento()
  const actualizarMantenimiento     = useActualizarMantenimiento()
  const eliminarMantenimiento       = useEliminarMantenimiento()

  // Último mantenimiento por vehículo
  const ultimoPorVehiculo = useMemo(() => {
    const map = {}
    for (const m of mantenimientos) {
      const key = m.vehiculoId
      if (!map[key] || String(m.fecha) > String(map[key].fecha)) map[key] = m
    }
    return map
  }, [mantenimientos])

  // ── CRUD Vehículos ──────────────────────────────────
  async function handleSave(data) {
    const { id, mantenimientos: _, ...rest } = data
    const res = id
      ? await actualizarVehiculo.mutateAsync({ id, ...rest })
      : await crearVehiculo.mutateAsync(rest)
    if (res.error) { toast(res.error, 'error'); return }
    setModal(false)
    toast(id ? 'Vehículo actualizado' : 'Vehículo creado', 'success')
  }

  async function handleDel(id) {
    const res = await eliminarVehiculo.mutateAsync(id)
    if (res.error) { toast(res.error, 'error'); return }
    setConfirmDel(null)
    toast('Vehículo desactivado', 'success')
  }

  async function handleAddMant(vehiculoId, mantData) {
    const res = await registrarMantenimiento.mutateAsync({ vehiculoId, ...mantData })
    if (res.error) { toast(res.error, 'error'); return }
    setModalMant(null)
    toast('Mantenimiento registrado', 'success')
  }

  async function handleEditMant(id, mantData) {
    const res = await actualizarMantenimiento.mutateAsync({ id, ...mantData })
    if (res.error) { toast(res.error, 'error'); return }
    setEditandoMant(null)
    toast('Mantenimiento actualizado', 'success')
  }

  async function handleDelMant(id) {
    const res = await eliminarMantenimiento.mutateAsync(id)
    if (res.error) { toast(res.error, 'error'); return }
    setConfirmDelMant(null)
    toast('Mantenimiento eliminado', 'success')
  }

  // ── KPIs ─────────────────────────────────────────────
  const kpis = useMemo(() => ({
    total:        flota.length,
    activas:      flota.filter(u => u.activo !== false).length,
    alertasSoat:  alertas.filter(a => a.tipo === 'SOAT').length,
    alertasRevt:  alertas.filter(a => a.tipo === 'Revisión Técnica').length,
    kmTotal:      flota.reduce((s, u) => s + (Number(u.kmActual) || 0), 0),
  }), [flota, alertas])

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          ['Total unidades',     kpis.total,                    '#00c896', Truck        ],
          ['Activas',            kpis.activas,                  '#22c55e', CheckCircle  ],
          ['Alertas SOAT',       kpis.alertasSoat,              kpis.alertasSoat > 0 ? '#ef4444' : '#22c55e', AlertTriangle],
          ['Alertas Rev. Técn.', kpis.alertasRevt,              kpis.alertasRevt > 0 ? '#f59e0b' : '#22c55e', Calendar     ],
          ['Km total flota',     kpis.kmTotal.toLocaleString(), '#3b82f6', Gauge        ],
        ].map(([label, val, color, Icon]) => (
          <div key={label} className="relative bg-[#161d28] border border-white/8 rounded-xl px-4 py-3.5 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.75 rounded-t-xl" style={{ background: color }}/>
            <div className="flex items-center gap-1.5 mb-2">
              <Icon size={11} style={{ color, opacity: 0.8 }}/>
              <span className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.07em]">{label}</span>
            </div>
            <div className="text-[28px] font-semibold text-[#e8edf2]">{val}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-white/8">
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 text-[13px] font-medium border-b-2 -mb-px transition-all
              ${tab === id ? 'text-[#00c896] border-[#00c896]' : 'text-[#5f6f80] border-transparent hover:text-[#9ba8b6]'}`}>
            {label}
            {id === 'alertas' && alertas.length > 0 && (
              <span className="ml-1.5 text-[10px] font-bold bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">{alertas.length}</span>
            )}
            {id === 'mantenimiento' && mantenimientos.length > 0 && (
              <span className="ml-1.5 text-[10px] font-bold bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded-full">{mantenimientos.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB UNIDADES ──────────────────────────────── */}
      {tab === 'unidades' && (
        <TabUnidades
          flota={flota}
          ultimoPorVehiculo={ultimoPorVehiculo}
          setEditando={setEditando}
          setModal={setModal}
          setConfirmDel={setConfirmDel}
          setModalMant={setModalMant}
        />
      )}

      {/* ── TAB MANTENIMIENTO ─────────────────────────── */}
      {tab === 'mantenimiento' && (
        <TabMantenimiento
          mantenimientos={mantenimientos}
          filtDesde={filtDesde}
          filtHasta={filtHasta}
          setFiltDesde={setFiltDesde}
          setFiltHasta={setFiltHasta}
          setEditandoMant={setEditandoMant}
          setConfirmDelMant={setConfirmDelMant}
          empresa={sesion?.nombre}
        />
      )}

      {/* ── TAB COMBUSTIBLE & KM ──────────────────────── */}
      {tab === 'combustible' && (
        <TabCombustible flota={flota} />
      )}

      {/* ── TAB ALERTAS ───────────────────────────────── */}
      {tab === 'alertas' && (
        <TabAlertas alertas={alertas} />
      )}

      {/* ── Guía de uso ───────────────────────────────── */}
      <div className="bg-[#161d28] border border-white/6 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          ¿Cómo funciona el módulo de Flota?
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {[
            ['1. Unidades', 'Registra cada vehículo con placa, conductor asignado y fechas de vencimiento de SOAT y Revisión Técnica.'],
            ['2. Mantenimiento', 'Desde cada unidad, usa "Registrar" para dejar historial de cambios de aceite, afinamientos y otros servicios.'],
            ['3. Alertas', 'Aquí aparecen automáticamente los vencimientos próximos (SOAT, Rev. Técnica, mantenimiento) de todas las unidades activas.'],
            ['4. Combustible', 'Registra cada carga de combustible con el odómetro antes/después para calcular km recorridos y costo por km.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
              <div className="text-[11px] font-semibold text-[#e8edf2] mb-1.5">{t}</div>
              <div className="text-[11px] text-[#5f6f80] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Modales ───────────────────────────────────── */}
      <ModalUnidad
        open={modal}
        onClose={() => { setModal(false); setEditando(null) }}
        editando={editando}
        onSave={handleSave}
      />
      <ModalMantenimiento
        open={!!modalMant}
        onClose={() => setModalMant(null)}
        unidad={modalMant}
        onSave={handleAddMant}
      />
      <ModalMantenimiento
        open={!!editandoMant}
        onClose={() => setEditandoMant(null)}
        unidad={editandoMant?.vehiculo}
        editando={editandoMant}
        onSave={(_vehiculoId, data) => handleEditMant(editandoMant.id, data)}
      />
      <ConfirmDialog
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={() => handleDel(confirmDel)}
        danger
        title="Desactivar unidad"
        message="¿Desactivar esta unidad? Quedará inactiva pero su historial se conserva."
      />
      <ConfirmDialog
        open={!!confirmDelMant}
        onClose={() => setConfirmDelMant(null)}
        onConfirm={() => handleDelMant(confirmDelMant)}
        danger
        title="Eliminar mantenimiento"
        message="¿Eliminar este registro de mantenimiento? Esta acción no se puede deshacer."
      />
    </div>
  )
}
