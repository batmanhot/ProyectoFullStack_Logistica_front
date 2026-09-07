import { useState } from 'react'
import { LayoutDashboard, Building2, CreditCard, RefreshCw, Bell, Globe } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import {
  useNegociosList, useCrearNegocio, useActualizarNegocio, useEliminarNegocio, useArchivarNegocio,
  usePlanesAdminList, useCrearPlan, useActualizarPlan, useEliminarPlan,
  useRenovacionesList, useCrearRenovacion, useAnularRenovacion,
  useAlertasList, useVencimientosProximos, useCrearAlerta, useActualizarAlerta, useEliminarAlerta,
  useLanding, useGuardarLanding,
} from '../../queries/admin.queries'
import { SidebarNav, TopBar } from './ui'
import TabDashboard from './TabDashboard'
import TabNegocios from './TabNegocios'
import TabPlanesLimites from './TabPlanesLimites'
import TabSuscripciones from './TabSuscripciones'
import TabAlertas from './TabAlertas'
import TabLanding from './TabLanding'

// ══════════════════════════════════════════════════════════
// SuperAdmin V2 — panel aislado, propia identidad visual
// (referencia: Proyectos Full Stacks Diseños/front/stockpro-superadmin-v2).
// No comparte componentes visuales con pages/AdminSaaS/ (el panel clásico,
// que sigue intacto en /admin-saas) — solo reutiliza la capa de datos real
// (admin.queries.js) y utilidades de negocio puras (constants.js,
// planCapabilities.js) para no duplicar ni divergir la lógica.
//
// "Planes y límites" del panel clásico eran dos tabs separadas — acá son
// una sola (como en el mockup de referencia), porque en el dato real ambas
// cosas viven en el mismo PlanSaaS.
// ══════════════════════════════════════════════════════════
export default function AdminSaaSV2() {
  const { toast, sesion } = useApp()
  const [tab, setTab] = useState('dashboard')

  const { data: negociosRaw = [] } = useNegociosList()
  const negocios = Array.isArray(negociosRaw) ? negociosRaw : []
  const { data: planes       = [] } = usePlanesAdminList()
  const { data: renovaciones = [] } = useRenovacionesList()
  const { data: alertas      = [] } = useAlertasList()
  const { data: vencimientos = [] } = useVencimientosProximos()
  const { data: landing            } = useLanding()

  const crearNegocio      = useCrearNegocio()
  const actualizarNegocio = useActualizarNegocio()
  const eliminarNegocio   = useEliminarNegocio()
  const archivarNegocio   = useArchivarNegocio()
  const crearPlan         = useCrearPlan()
  const actualizarPlan    = useActualizarPlan()
  const eliminarPlan      = useEliminarPlan()
  const crearRenovacion   = useCrearRenovacion()
  const anularRenovacion  = useAnularRenovacion()
  const crearAlerta       = useCrearAlerta()
  const actualizarAlerta  = useActualizarAlerta()
  const eliminarAlerta    = useEliminarAlerta()
  const guardarLanding    = useGuardarLanding()

  const TAB_META = {
    dashboard:    { label:'Vista general',    icon: LayoutDashboard, count: null },
    negocios:     { label:'Negocios',         icon: Building2,       count: negocios.length },
    planes:       { label:'Planes y límites', icon: CreditCard,      count: planes.length },
    renovaciones: { label:'Suscripciones',    icon: RefreshCw,       count: renovaciones.length },
    alertas:      { label:'Alertas',          icon: Bell,            count: alertas.length },
    landing:      { label:'Landing CMS',      icon: Globe,           count: null },
  }

  const NAV_GROUPS = [
    { label:'Plataforma',   items:['dashboard', 'negocios'] },
    { label:'Comercial',    items:['planes', 'renovaciones'] },
    { label:'Comunicación', items:['alertas', 'landing'] },
  ].map(group => ({
    label: group.label,
    items: group.items.map(id => ({ id, label: TAB_META[id].label, icon: TAB_META[id].icon, count: TAB_META[id].count })),
  }))

  return (
    <div className="flex w-full h-screen overflow-hidden" style={{ background: '#f5f7fb' }}>
      <SidebarNav groups={NAV_GROUPS} activeId={tab} onSelect={setTab} />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <TopBar userName={sesion?.nombre || 'Super Admin'} userRole="SuperAdmin" />
        <div className="flex-1 overflow-y-auto p-8">
          {tab === 'dashboard' && (
            <TabDashboard negocios={negocios} planes={planes} renovaciones={renovaciones} vencimientos={vencimientos} />
          )}
          {tab === 'negocios' && (
            <TabNegocios
              negocios={negocios} planes={planes}
              crearNegocio={crearNegocio} actualizarNegocio={actualizarNegocio}
              eliminarNegocio={eliminarNegocio} archivarNegocio={archivarNegocio}
              toast={toast}
            />
          )}
          {tab === 'planes' && (
            <TabPlanesLimites
              planes={planes} negocios={negocios}
              crearPlan={crearPlan} actualizarPlan={actualizarPlan} eliminarPlan={eliminarPlan}
              toast={toast}
            />
          )}
          {tab === 'renovaciones' && (
            <TabSuscripciones
              renovaciones={renovaciones} negocios={negocios} planes={planes}
              crearRenovacion={crearRenovacion} anularRenovacion={anularRenovacion}
              toast={toast}
            />
          )}
          {tab === 'alertas' && (
            <TabAlertas
              alertas={alertas} vencimientos={vencimientos}
              crearAlerta={crearAlerta} actualizarAlerta={actualizarAlerta} eliminarAlerta={eliminarAlerta}
              toast={toast}
            />
          )}
          {tab === 'landing' && (
            <TabLanding landing={landing} guardarLanding={guardarLanding} toast={toast} />
          )}
        </div>
      </div>
    </div>
  )
}
