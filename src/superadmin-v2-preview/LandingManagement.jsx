import { ExternalLink, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import TabLanding from '../pages/AdminSaaS/TabLanding'
import { useGuardarLanding, useLanding } from '../queries/admin.queries'

const notify = (message, type) => type === 'error' ? toast.error(message) : toast.success(message)

export default function LandingManagement() {
  const landingQuery = useLanding()
  const guardarLanding = useGuardarLanding()

  if (landingQuery.isPending) {
    return <section aria-live="polite" className="rounded-xl border border-white/8 bg-[#161d28] p-8 text-center">
      <RefreshCw className="mx-auto animate-spin text-[#00c896]" size={22} />
      <h1 className="mt-4 font-semibold">Cargando configuración de la Landing Page</h1>
      <p className="mt-1 text-sm text-[#9ba8b6]">Consultando la configuración publicada actualmente.</p>
    </section>
  }

  if (landingQuery.isError) {
    return <section role="alert" className="rounded-xl border border-red-500/25 bg-red-500/5 p-6">
      <h1 className="font-semibold text-red-200">No se pudo cargar la Landing Page</h1>
      <p className="mt-2 text-sm text-[#9ba8b6]">Verifica que la sesión de administrador de plataforma siga activa y que el backend esté disponible.</p>
      <button type="button" onClick={() => landingQuery.refetch()} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-400/30 px-3 py-2 text-xs text-red-200"><RefreshCw size={14} />Reintentar</button>
    </section>
  }

  return <section>
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-[12px] font-semibold text-[#00c896]">CONTENIDO PÚBLICO</p>
        <h1 className="text-2xl font-semibold">Landing Page</h1>
        <p className="mt-1 text-sm text-[#9ba8b6]">La configuración guardada aquí alimenta directamente la presentación pública de StockPro.</p>
      </div>
      <a href="/landing" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-white/8 bg-[#161d28] px-3 py-2 text-xs text-[#e8edf2] hover:bg-white/5"><ExternalLink size={14} />Abrir vista pública</a>
    </header>
    <TabLanding landing={landingQuery.data} guardarLanding={guardarLanding} planes={[]} toast={notify} />
  </section>
}
