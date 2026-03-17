import { useState, useEffect } from 'react'
import { Smartphone, Wifi, WifiOff, Download, CheckCircle, Monitor, RefreshCw, Info } from 'lucide-react'
import { Badge, Alert } from '../components/ui/index'

export default function PWA() {
  const [isOnline, setIsOnline]           = useState(navigator.onLine)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [installed, setInstalled]         = useState(false)
  const [swStatus, setSWStatus]           = useState('checking')

  useEffect(() => {
    const onOnline  = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)

    // Detectar si ya está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) setInstalled(true)

    // Capturar prompt de instalación
    const handler = e => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)

    // Estado del Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        setSWStatus(reg ? 'activo' : 'inactivo')
      }).catch(() => setSWStatus('inactivo'))
    } else {
      setSWStatus('no-soportado')
    }

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  async function handleInstall() {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') { setInstalled(true); setInstallPrompt(null) }
  }

  const storage = useMemo_simple_calculo()

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* Estado actual */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {[
          [isOnline ? 'En línea' : 'Sin conexión', isOnline ? 'success' : 'danger', isOnline ? Wifi : WifiOff,
           isOnline ? 'Conectado a internet' : 'Modo offline activo'],
          [installed ? 'Instalada' : 'No instalada', installed ? 'success' : 'neutral', Smartphone,
           installed ? 'App instalada en el dispositivo' : 'Disponible para instalar'],
          [swStatus === 'activo' ? 'SW Activo' : 'SW Inactivo', swStatus === 'activo' ? 'success' : 'neutral', RefreshCw,
           swStatus === 'activo' ? 'Service Worker funcionando' : 'Ejecutar npm run build'],
          [`${storage.usado} MB usados`, 'info', Monitor, `de ~${storage.disponible} MB disponibles`],
        ].map(([label, color, Icon, hint]) => (
          <div key={label} className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-5 py-4 overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-xl ${color === 'success' ? 'bg-green-500' : color === 'danger' ? 'bg-red-500' : color === 'info' ? 'bg-blue-500' : 'bg-[#5f6f80]'}`}/>
            <div className="flex items-center gap-2 mb-2">
              <Icon size={15} className={color === 'success' ? 'text-green-400' : color === 'danger' ? 'text-red-400' : 'text-[#5f6f80]'}/>
              <span className="text-[11px] text-[#5f6f80] uppercase tracking-wide">{label}</span>
            </div>
            <div className="text-[11px] text-[#9ba8b6] leading-snug">{hint}</div>
          </div>
        ))}
      </div>

      {/* Botón instalar */}
      {!installed && installPrompt && (
        <div className="bg-[#00c896]/10 border border-[#00c896]/30 rounded-xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#00c896] flex items-center justify-center shrink-0">
            <Download size={20} color="#082e1e"/>
          </div>
          <div className="flex-1">
            <div className="text-[15px] font-semibold text-[#e8edf2] mb-1">Instalar StockPro como app</div>
            <p className="text-[13px] text-[#9ba8b6] mb-3">
              Instala la app en tu dispositivo para acceso rápido desde el escritorio y uso offline sin necesidad de abrir el navegador.
            </p>
            <button onClick={handleInstall}
              className="flex items-center gap-2 px-4 py-2 bg-[#00c896] text-[#082e1e] rounded-lg text-[13px] font-semibold hover:bg-[#009e76] transition-colors">
              <Download size={15}/> Instalar ahora
            </button>
          </div>
        </div>
      )}

      {/* Capacidades offline */}
      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">
          Funcionalidades Offline
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { modulo: 'Dashboard',         offline: true,  nota: 'Muestra datos del localStorage' },
            { modulo: 'Inventario',        offline: true,  nota: 'Lectura y búsqueda completa' },
            { modulo: 'Entradas / Salidas',offline: true,  nota: 'Registro normal sin conexión' },
            { modulo: 'Ajustes',           offline: true,  nota: 'Funciona completamente offline' },
            { modulo: 'Devoluciones',      offline: true,  nota: 'Funciona completamente offline' },
            { modulo: 'Transferencias',    offline: true,  nota: 'Funciona completamente offline' },
            { modulo: 'Órdenes de Compra', offline: true,  nota: 'Creación y consulta offline' },
            { modulo: 'Reportes',          offline: true,  nota: 'Basado en datos locales' },
            { modulo: 'Kardex',            offline: true,  nota: 'Historial local disponible' },
            { modulo: 'Sincronización API',offline: false, nota: 'Requiere conexión (futuro backend)' },
            { modulo: 'Notificaciones push',offline: false,nota: 'Requiere conexión' },
            { modulo: 'Multi-dispositivo', offline: false, nota: 'Requiere backend para sincronizar' },
          ].map(item => (
            <div key={item.modulo} className="flex items-start gap-3 p-3 bg-[#1a2230] rounded-lg">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${item.offline ? 'bg-green-500/15' : 'bg-[#1e2835]'}`}>
                {item.offline
                  ? <CheckCircle size={12} className="text-green-400"/>
                  : <WifiOff size={11} className="text-[#5f6f80]"/>
                }
              </div>
              <div>
                <div className="text-[13px] font-medium text-[#e8edf2]">{item.modulo}</div>
                <div className="text-[11px] text-[#5f6f80] mt-0.5">{item.nota}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instrucciones de instalación manual */}
      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">
          Instalación Manual por Dispositivo
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { device: 'Android (Chrome)', steps: ['Abrir en Chrome', 'Menú ⋮ → "Añadir a pantalla de inicio"', 'Confirmar instalación', 'Ícono aparece en el launcher'] },
            { device: 'iOS (Safari)', steps: ['Abrir en Safari', 'Botón compartir →', '"Añadir a pantalla de inicio"', 'Confirmar → aparece como app nativa'] },
            { device: 'Windows (Edge/Chrome)', steps: ['Abrir en Edge o Chrome', 'Icono de instalación en barra de URL', 'Clic en "Instalar"', 'App aparece en el menú Inicio'] },
            { device: 'macOS (Chrome/Edge)', steps: ['Abrir en Chrome o Edge', 'Menú → "Instalar StockPro"', 'Confirmar instalación', 'App en el Launchpad'] },
          ].map(({ device, steps }) => (
            <div key={device} className="bg-[#1a2230] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Smartphone size={14} className="text-[#00c896]"/>
                <div className="text-[13px] font-semibold text-[#e8edf2]">{device}</div>
              </div>
              <ol className="flex flex-col gap-1.5">
                {steps.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-[#9ba8b6]">
                    <span className="w-4 h-4 rounded-full bg-[#00c896]/15 text-[#00c896] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i+1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>

      {/* Nota técnica */}
      <div className="flex items-start gap-3 px-4 py-3.5 bg-blue-500/10 border border-blue-500/25 rounded-xl text-[12px] text-blue-300 leading-relaxed">
        <Info size={15} className="shrink-0 mt-0.5"/>
        <div>
          <span className="font-semibold block mb-1">Nota técnica para el desarrollador</span>
          La PWA requiere <code className="bg-white/10 px-1 rounded font-mono text-[11px]">vite-plugin-pwa</code> instalado y un build de producción (<code className="bg-white/10 px-1 rounded font-mono text-[11px]">npm run build</code>) para activar el Service Worker completo.
          En modo dev (<code className="bg-white/10 px-1 rounded font-mono text-[11px]">npm run dev</code>) el SW funciona de forma limitada.
          Todos los datos se almacenan en <code className="bg-white/10 px-1 rounded font-mono text-[11px]">localStorage</code> — disponibles sin conexión.
          Al conectar el backend, migrar a <code className="bg-white/10 px-1 rounded font-mono text-[11px]">IndexedDB + sync queue</code> para soporte offline real.
        </div>
      </div>
    </div>
  )
}

// Helper simple sin hook para calcular uso de storage
function useMemo_simple_calculo() {
  try {
    let total = 0
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) total += (localStorage[key].length * 2) // UTF-16
    }
    return {
      usado: (total / 1024 / 1024).toFixed(2),
      disponible: '5',
    }
  } catch {
    return { usado: '—', disponible: '5' }
  }
}
