import { RefreshCw, Scale, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import toast from 'react-hot-toast'
import TabLimites from '../pages/AdminSaaS/TabLimites'
import { useActualizarPlan, useNegociosList, usePlanesAdminList } from '../queries/admin.queries'
import PlanComparison from './PlanComparison'

const notify = (message, type) => type === 'error' ? toast.error(message) : toast.success(message)

export default function PlanCapabilitiesManagement({ planes:localPlanes = [], negocios:localBusinesses = [], onUpdatePlan }) {
  const plansQuery = usePlanesAdminList()
  const businessesQuery = useNegociosList()
  const apiActualizarPlan = useActualizarPlan()
  const planes = localPlanes.length ? localPlanes : (Array.isArray(plansQuery.data) ? plansQuery.data : [])
  const actualizarPlan = onUpdatePlan ? { mutateAsync:async ({ id, ...changes }) => { onUpdatePlan(id, changes); return { data:{ id, ...changes }, error:null } } } : apiActualizarPlan

  if (!localPlanes.length && plansQuery.isPending) {
    return <section aria-live="polite" className="rounded-xl border border-white/8 bg-[#161d28] p-8 text-center"><RefreshCw className="mx-auto animate-spin text-[#00c896]" size={22} /><h1 className="mt-4 font-semibold">Cargando capacidades de los planes</h1></section>
  }

  if (!localPlanes.length && plansQuery.isError) {
    return <section role="alert" className="rounded-xl border border-red-500/25 bg-red-500/5 p-6"><h1 className="font-semibold text-red-200">No se pudieron cargar los planes</h1><p className="mt-2 text-sm text-[#9ba8b6]">Verifica la sesión administrativa y la disponibilidad del backend.</p><button type="button" onClick={() => plansQuery.refetch()} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-400/30 px-3 py-2 text-xs text-red-200"><RefreshCw size={14} />Reintentar</button></section>
  }

  return <section>
    <header className="mb-5">
      <p className="text-[12px] font-semibold text-[#00c896]">OFERTA COMERCIAL</p>
      <h1 className="text-2xl font-semibold">Capacidades y módulos por plan</h1>
      <p className="mt-1 max-w-4xl text-sm text-[#9ba8b6]">Configura cuánto puede operar cada cliente, qué áreas funcionales contrata y qué nivel de acompañamiento recibe.</p>
    </header>

    <div className="mb-6 grid gap-3 md:grid-cols-3">
      <article className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4"><Scale size={18} className="text-blue-300" /><h2 className="mt-3 text-sm font-semibold">1. Escala operativa</h2><p className="mt-1 text-xs text-[#9ba8b6]">Usuarios, productos, almacenes, clientes, órdenes y almacenamiento.</p></article>
      <article className="rounded-xl border border-[#00c896]/20 bg-[#00c896]/5 p-4"><SlidersHorizontal size={18} className="text-[#00c896]" /><h2 className="mt-3 text-sm font-semibold">2. Alcance funcional</h2><p className="mt-1 text-xs text-[#9ba8b6]">Módulos contratados, API, exportación, analítica y multiempresa.</p></article>
      <article className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4"><ShieldCheck size={18} className="text-violet-300" /><h2 className="mt-3 text-sm font-semibold">3. Servicio y confianza</h2><p className="mt-1 text-xs text-[#9ba8b6]">Soporte, continuidad y capacidades avanzadas. La seguridad esencial nunca se desactiva.</p></article>
    </div>

    <div className="mb-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100"><strong>Principio comercial:</strong> una empresa pequeña puede contratar pocos usuarios y productos sin recibir una aplicación insegura. Los planes superiores amplían volumen, módulos, automatización, soporte y controles avanzados.</div>
    <PlanComparison plans={planes} />
    <TabLimites planes={planes} negocios={localBusinesses.length ? localBusinesses : (Array.isArray(businessesQuery.data) ? businessesQuery.data : [])} actualizarPlan={actualizarPlan} toast={notify} />
  </section>
}
