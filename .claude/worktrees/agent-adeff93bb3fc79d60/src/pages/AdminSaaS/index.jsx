import { useState } from 'react'
import { Building2, CreditCard, RefreshCw, SlidersHorizontal, Bell, Globe } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { tokenManager } from '../../services/api'
import {
  useNegociosList, useCrearNegocio, useActualizarNegocio, useEliminarNegocio,
  usePlanesAdminList, useCrearPlan, useActualizarPlan, useEliminarPlan,
  useRenovacionesList, useCrearRenovacion, useAnularRenovacion,
  useAlertasList, useVencimientosProximos, useCrearAlerta, useActualizarAlerta, useEliminarAlerta,
  useLanding, useGuardarLanding,
} from '../../queries/admin.queries'
import AdminLoginGate from './AdminLoginGate'
import TabNegocios from './TabNegocios'
import TabPlanes from './TabPlanes'
import TabRenovaciones from './TabRenovaciones'
import TabLimites from './TabLimites'
import TabAlertas from './TabAlertas'
import TabLanding from './TabLanding'

// ══════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════
export default function AdminSaaS() {
  const { toast } = useApp()
  const [tab,        setTab]        = useState('negocios')
  const [adminLogged, setAdminLogged] = useState(() => !!tokenManager.getAdminAccess())

  // ── hooks API ──────────────────────────────────────────
  const { data: negocios     = [] } = useNegociosList()
  const { data: planes       = [] } = usePlanesAdminList()
  const { data: renovaciones = [] } = useRenovacionesList()
  const { data: alertas      = [] } = useAlertasList()
  const { data: landing            } = useLanding()
  const { data: vencimientos = [] } = useVencimientosProximos()

  const crearNegocio      = useCrearNegocio()
  const actualizarNegocio = useActualizarNegocio()
  const eliminarNegocio   = useEliminarNegocio()
  const crearPlan         = useCrearPlan()
  const actualizarPlan    = useActualizarPlan()
  const eliminarPlan      = useEliminarPlan()
  const crearRenovacion   = useCrearRenovacion()
  const anularRenovacion  = useAnularRenovacion()
  const crearAlerta       = useCrearAlerta()
  const actualizarAlerta  = useActualizarAlerta()
  const eliminarAlerta    = useEliminarAlerta()
  const guardarLanding    = useGuardarLanding()

  if (!adminLogged) return <AdminLoginGate onLogin={() => setAdminLogged(true)} />

  const TABS = [
    { id:'negocios',     label:'Negocios',              icon: Building2,         desc:`${negocios.length} registrados` },
    { id:'planes',       label:'Planes y Precios',      icon: CreditCard,        desc:`${planes.length} planes` },
    { id:'renovaciones', label:'Historial Renovaciones', icon: RefreshCw,        desc:`${renovaciones.length} registros` },
    { id:'limites',      label:'Límites del Plan',      icon: SlidersHorizontal, desc:'Configurar límites' },
    { id:'alertas',      label:'Alertas de Vencimiento', icon: Bell,             desc:`${alertas.length} reglas` },
    { id:'landing',      label:'Landing Page',          icon: Globe,             desc:'Config. sitio web' },
  ]

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#0e1117]">
      {/* Tab bar */}
      <div className="flex gap-0.5 px-5 pt-4 border-b border-white/8 overflow-x-auto shrink-0">
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium rounded-t-lg border-b-2 -mb-px whitespace-nowrap transition-colors ${
                active ? 'text-[#00c896] border-[#00c896] bg-[#00c896]/5' : 'text-[#8899a6] border-transparent hover:text-[#e8edf2] hover:bg-white/5'
              }`}>
              <Icon size={15} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6 min-h-0">
        {tab === 'negocios'     && <TabNegocios     negocios={negocios} crearNegocio={crearNegocio} actualizarNegocio={actualizarNegocio} eliminarNegocio={eliminarNegocio} planes={planes} toast={toast} />}
        {tab === 'planes'       && <TabPlanes       planes={planes} crearPlan={crearPlan} actualizarPlan={actualizarPlan} eliminarPlan={eliminarPlan} toast={toast} />}
        {tab === 'renovaciones' && <TabRenovaciones renovaciones={renovaciones} crearRenovacion={crearRenovacion} anularRenovacion={anularRenovacion} negocios={negocios} planes={planes} toast={toast} />}
        {tab === 'limites'      && <TabLimites      planes={planes} actualizarPlan={actualizarPlan} toast={toast} />}
        {tab === 'alertas'      && <TabAlertas      alertas={alertas} vencimientos={vencimientos} crearAlerta={crearAlerta} actualizarAlerta={actualizarAlerta} eliminarAlerta={eliminarAlerta} toast={toast} />}
        {tab === 'landing'      && <TabLanding      landing={landing} guardarLanding={guardarLanding} planes={planes} toast={toast} />}
      </div>
    </div>
  )
}
