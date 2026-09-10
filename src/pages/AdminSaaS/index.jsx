import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
import TabSuscripciones from './TabSuscripciones'
import TabFacturacion from './TabFacturacion'
import TabLimites from './TabLimites'
import TabAlertas from './TabAlertas'
import TabMonitor from './TabMonitor'
import TabBackups from './TabBackups'
import TabAuditoria from './TabAuditoria'
import TabLanding from './TabLanding'
import TabAjustes from './TabAjustes'
import TabPlatformAdmins from './TabPlatformAdmins'
import TabRolesSistema from './TabRolesSistema'
import { PageHead } from './ui/Chrome'

const TABS_VALIDOS = new Set([
  'dashboard', 'negocios', 'planes', 'suscripciones', 'facturacion', 'limites',
  'alertas', 'monitor', 'backups', 'auditoria', 'landing', 'ajustes', 'platform-admins', 'roles',
])

// ══════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════
export default function AdminSaaS() {
  const { toast } = useApp()
  const navigate = useNavigate()
  const { tab: tabParam } = useParams()
  const tab = TABS_VALIDOS.has(tabParam) ? tabParam : 'dashboard'
  const setTab = (id) => navigate(`/admin-saas/${id}`)
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

  // Título + descripción por sección. La navegación vive en el sidebar oficial
  // (NAV_SAAS_ADMIN en components/layout/Sidebar.jsx).
  const TAB_META = {
    dashboard:    { title:'Vista general',           description:'MRR, riesgo de cartera y actividad reciente de la plataforma.' },
    negocios:     { title:'Negocios',                description:'Tenants registrados, su estado de acceso y su ciclo de facturación.' },
    planes:       { title:'Planes y Precios',        description:'Catálogo de planes comerciales que se ofrecen a los negocios.' },
    suscripciones:{ title:'Suscripciones',           description:'Registra contratos, pagos y renovaciones que gobiernan la vigencia de cada negocio.' },
    facturacion:  { title:'Facturación',             description:'Emite, controla y cobra los documentos generados a partir de las suscripciones.' },
    limites:      { title:'Límites del Plan',        description:'Módulos y topes de uso habilitados por cada plan.' },
    alertas:      { title:'Centro de Alertas',       description:'Salud del sistema: vencimientos, topes de plan superados, correos rebotando y problemas de configuración.' },
    monitor:      { title:'Monitor en Vivo',         description:'Telemetría en tiempo real de APIs, accesos y peticiones de toda la plataforma.' },
    backups:      { title:'Backups',                 description:'Registra y gobierna los respaldos de cada negocio y el flujo de restauración con aprobación del cliente.' },
    auditoria:    { title:'Bitácora de plataforma',  description:'Cada acción de gobierno (reglas, alertas, cuentas privilegiadas) e incidentes del sistema quedan registrados aquí.' },
    landing:      { title:'Landing Page',            description:'Contenido público del sitio de marketing.' },
    ajustes:      { title:'Ajustes de Plataforma',   description:'Flags operativos que afectan a todos los negocios de esta instalación.' },
    'platform-admins': { title:'Administradores de Plataforma', description:'Hasta 2 SuperAdmins. Son quienes crean los negocios y sus administradores.' },
    roles:        { title:'Roles del sistema',       description:'Plantillas de rol que heredan todos los negocios. Los tenants las usan o las duplican; nunca las editan.' },
  }

  const active = TAB_META[tab]

  return (
    <div className="flex-1 overflow-y-auto min-h-0 bg-[var(--bg-base)]">
      <div className="p-6">
        <PageHead eyebrow="SuperAdmin" title={active.title} description={active.description} />

        {tab === 'dashboard'    && <TabDashboard    negocios={negocios} planes={planes} renovaciones={renovaciones} vencimientos={vencimientos} onNavigate={setTab} />}
        {tab === 'negocios'     && <TabNegocios     negocios={negocios} crearNegocio={crearNegocio} actualizarNegocio={actualizarNegocio} eliminarNegocio={eliminarNegocio} archivarNegocio={archivarNegocio} planes={planes} toast={toast} />}
        {tab === 'planes'       && <TabPlanes       planes={planes} crearPlan={crearPlan} actualizarPlan={actualizarPlan} eliminarPlan={eliminarPlan} toast={toast} />}
        {tab === 'suscripciones' && <TabSuscripciones renovaciones={renovaciones} crearRenovacion={crearRenovacion} anularRenovacion={anularRenovacion} negocios={negocios} planes={planes} toast={toast} />}
        {tab === 'facturacion'  && <TabFacturacion  negocios={negocios} planes={planes} renovaciones={renovaciones} toast={toast} />}
        {tab === 'limites'      && <TabLimites      planes={planes} negocios={negocios} actualizarPlan={actualizarPlan} toast={toast} />}
        {tab === 'alertas'      && <TabAlertas      alertas={alertas} vencimientos={vencimientos} crearAlerta={crearAlerta} actualizarAlerta={actualizarAlerta} eliminarAlerta={eliminarAlerta} toast={toast} />}
        {tab === 'monitor'      && <TabMonitor />}
        {tab === 'backups'      && <TabBackups      negocios={negocios} toast={toast} />}
        {tab === 'auditoria'    && <TabAuditoria    negocios={negocios} toast={toast} />}
        {tab === 'landing'      && <TabLanding      landing={landing} guardarLanding={guardarLanding} toast={toast} />}
        {tab === 'ajustes'      && <TabAjustes      toast={toast} />}
        {tab === 'platform-admins' && <TabPlatformAdmins />}
        {tab === 'roles'        && <TabRolesSistema toast={toast} />}
      </div>
    </div>
  )
}
