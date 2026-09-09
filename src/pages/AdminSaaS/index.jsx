import { useState } from 'react'
import { LayoutDashboard, Building2, CreditCard, RefreshCw, SlidersHorizontal, Bell, Globe, Settings } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { tokenManager } from '../../services/api'
import {
  useNegociosList, useCrearNegocio, useActualizarNegocio, useEliminarNegocio, useArchivarNegocio,
  usePlanesAdminList, useCrearPlan, useActualizarPlan, useEliminarPlan,
  useRenovacionesList, useCrearRenovacion, useAnularRenovacion,
  useAlertasList, useVencimientosProximos, useCrearAlerta, useActualizarAlerta, useEliminarAlerta,
  useLanding, useGuardarLanding,
} from '../../queries/admin.queries'
import AdminLoginGate from './AdminLoginGate'
import TabDashboard from './TabDashboard'
import TabNegocios from './TabNegocios'
import TabPlanes from './TabPlanes'
import TabRenovaciones from './TabRenovaciones'
import TabLimites from './TabLimites'
import TabAlertas from './TabAlertas'
import TabLanding from './TabLanding'
import TabAjustes from './TabAjustes'
import { AdminSidebarNav, PageHead } from './ui/Chrome'

// ══════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════
export default function AdminSaaS() {
  const { toast } = useApp()
  const [tab,        setTab]        = useState('dashboard')
  const [adminLogged, setAdminLogged] = useState(() => !!tokenManager.getAdminAccess())

  // ── hooks API ──────────────────────────────────────────
  const { data: negociosRaw = [] } = useNegociosList()
  const negocios = Array.isArray(negociosRaw) ? negociosRaw : []
  const { data: planes       = [] } = usePlanesAdminList()
  const { data: renovaciones = [] } = useRenovacionesList()
  const { data: alertas      = [] } = useAlertasList()
  const { data: landing            } = useLanding()
  const { data: vencimientos = [] } = useVencimientosProximos()

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

  if (!adminLogged) return <AdminLoginGate onLogin={() => setAdminLogged(true)} />

  const TAB_META = {
    dashboard:    { label:'Dashboard',              icon: LayoutDashboard,   count: null,               title:'Vista general',           description:'MRR, riesgo de cartera y actividad reciente de la plataforma.' },
    negocios:     { label:'Negocios',               icon: Building2,         count: negocios.length,    title:'Negocios',                 description:'Tenants registrados, su estado de acceso y su ciclo de facturación.' },
    planes:       { label:'Planes y Precios',       icon: CreditCard,        count: planes.length,      title:'Planes y Precios',         description:'Catálogo de planes comerciales que se ofrecen a los negocios.' },
    renovaciones: { label:'Historial Renovaciones', icon: RefreshCw,         count: renovaciones.length, title:'Historial de Renovaciones', description:'Pagos y renovaciones registradas por cada negocio.' },
    limites:      { label:'Límites del Plan',       icon: SlidersHorizontal, count: null,               title:'Límites del Plan',         description:'Módulos y topes de uso habilitados por cada plan.' },
    alertas:      { label:'Alertas de Vencimiento', icon: Bell,              count: alertas.length,     title:'Alertas de Vencimiento',   description:'Reglas de notificación y envíos reales a negocios por vencer.' },
    landing:      { label:'Landing Page',           icon: Globe,             count: null,               title:'Landing Page',             description:'Contenido público del sitio de marketing.' },
    ajustes:      { label:'Ajustes',                icon: Settings,          count: null,               title:'Ajustes de Plataforma',    description:'Flags operativos que afectan a todos los negocios de esta instalación.' },
  }

  const NAV_GROUPS = [
    { label:'Plataforma',   items:['dashboard', 'negocios', 'ajustes'] },
    { label:'Comercial',    items:['planes', 'limites', 'renovaciones'] },
    { label:'Comunicación', items:['alertas', 'landing'] },
  ].map(group => ({
    label: group.label,
    items: group.items.map(id => ({ id, label: TAB_META[id].label, icon: TAB_META[id].icon, count: TAB_META[id].count })),
  }))

  const active = TAB_META[tab]

  return (
    <div className="flex flex-1 overflow-hidden bg-[var(--bg-base)]">
      <AdminSidebarNav groups={NAV_GROUPS} activeId={tab} onSelect={setTab} />

      <div className="flex-1 overflow-y-auto p-6 min-h-0">
        <PageHead eyebrow="SuperAdmin" title={active.title} description={active.description} />

        {tab === 'dashboard'    && <TabDashboard    negocios={negocios} planes={planes} renovaciones={renovaciones} vencimientos={vencimientos} />}
        {tab === 'negocios'     && <TabNegocios     negocios={negocios} crearNegocio={crearNegocio} actualizarNegocio={actualizarNegocio} eliminarNegocio={eliminarNegocio} archivarNegocio={archivarNegocio} planes={planes} toast={toast} />}
        {tab === 'planes'       && <TabPlanes       planes={planes} crearPlan={crearPlan} actualizarPlan={actualizarPlan} eliminarPlan={eliminarPlan} toast={toast} />}
        {tab === 'renovaciones' && <TabRenovaciones renovaciones={renovaciones} crearRenovacion={crearRenovacion} anularRenovacion={anularRenovacion} negocios={negocios} planes={planes} toast={toast} />}
        {tab === 'limites'      && <TabLimites      planes={planes} actualizarPlan={actualizarPlan} toast={toast} />}
        {tab === 'alertas'      && <TabAlertas      alertas={alertas} vencimientos={vencimientos} crearAlerta={crearAlerta} actualizarAlerta={actualizarAlerta} eliminarAlerta={eliminarAlerta} toast={toast} />}
        {tab === 'landing'      && <TabLanding      landing={landing} guardarLanding={guardarLanding} planes={planes} toast={toast} />}
        {tab === 'ajustes'      && <TabAjustes      toast={toast} />}
      </div>
    </div>
  )
}
