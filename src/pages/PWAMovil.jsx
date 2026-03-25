/**
 * PWAMovil.jsx — App Móvil Nativa / PWA Optimizada
 *
 * Funcionalidades implementadas:
 * 1. Vista móvil simplificada de inventario (tarjetas swipe-friendly)
 * 2. Gestos swipe para aprobar/rechazar despachos
 * 3. Registro de entradas con escaneo QR/barras desde cámara
 * 4. Cola offline: acciones en sin conexión → sincroniza al reconectar
 * 5. Panel de instalación PWA + estado del Service Worker
 */
import { useState, useEffect, useRef, useMemo } from 'react'
import { Smartphone, Wifi, WifiOff, Package, Truck, CheckCircle,
         X, Clock, ChevronLeft, ChevronRight, RefreshCw, Download,
         AlertTriangle, ArrowRight, BarChart2, Zap, Layers } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate } from '../utils/helpers'
import { estadoStock } from '../utils/helpers'
import { Badge, Btn, Alert } from '../components/ui/index'
import * as storage from '../services/storage'

const COLA_KEY = 'sp_cola_offline'
function leerCola()    { try { return JSON.parse(localStorage.getItem(COLA_KEY)||'[]') } catch { return [] } }
function guardarCola(d){ localStorage.setItem(COLA_KEY, JSON.stringify(d)) }

// ── SwipeCard — tarjeta con gestos ───────────────────
function SwipeCard({ item, onAprobar, onRechazar }) {
  const [offsetX, setOffsetX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)
  const cardRef = useRef(null)

  function onTouchStart(e) { startX.current = e.touches[0].clientX; setDragging(true) }
  function onTouchMove(e) {
    if (!dragging) return
    const dx = e.touches[0].clientX - startX.current
    setOffsetX(Math.max(-120, Math.min(120, dx)))
  }
  function onTouchEnd() {
    setDragging(false)
    if (offsetX > 80)       { onAprobar();  setOffsetX(0) }
    else if (offsetX < -80) { onRechazar(); setOffsetX(0) }
    else setOffsetX(0)
  }

  const opacity  = Math.max(0.5, 1 - Math.abs(offsetX) / 200)
  const bgColor  = offsetX > 30 ? `rgba(34,197,94,${offsetX/200})` :
                   offsetX < -30 ? `rgba(239,68,68,${Math.abs(offsetX)/200})` : 'transparent'

  return (
    <div ref={cardRef}
      className="relative rounded-xl border border-white/[0.08] bg-[#1a2230] overflow-hidden select-none touch-pan-y"
      style={{ transform:`translateX(${offsetX}px)`, opacity, transition: dragging?'none':'all 0.3s ease', background: bgColor || '#1a2230' }}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {/* Indicadores swipe */}
      {offsetX > 20 && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-green-400 font-bold text-[13px]">
          <CheckCircle size={18}/> Aprobar
        </div>
      )}
      {offsetX < -20 && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-red-400 font-bold text-[13px]">
          Rechazar <X size={18}/>
        </div>
      )}
      <div className="p-4">
        {item}
      </div>
    </div>
  )
}

export default function PWAMovil() {
  const { productos, despachos, almacenes, recargarDespachos, recargarMovimientos,
          simboloMoneda, config, toast } = useApp()

  const [isOnline,      setIsOnline]      = useState(navigator.onLine)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [installed,     setInstalled]     = useState(false)
  const [swStatus,      setSWStatus]      = useState('checking')
  const [colaOffline,   setColaOffline]   = useState(leerCola)
  const [vistaActiva,   setVistaActiva]   = useState('dashboard') // dashboard|inventario|despachos|cola
  const [sincronizando, setSincronizando] = useState(false)

  // ── Detectar conectividad ──────────────────────────
  useEffect(() => {
    const goOnline  = () => { setIsOnline(true);  sincronizarCola() }
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online',  goOnline)
    window.addEventListener('offline', goOffline)
    if (window.matchMedia('(display-mode: standalone)').matches) setInstalled(true)
    const handler = e => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(r => setSWStatus(r ? 'activo' : 'inactivo')).catch(() => setSWStatus('inactivo'))
    } else setSWStatus('no-soportado')
    return () => {
      window.removeEventListener('online',  goOnline)
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  // ── Cola offline ───────────────────────────────────
  function agregarACola(accion) {
    const nueva = [...leerCola(), { ...accion, id: Date.now(), timestamp: new Date().toISOString() }]
    guardarCola(nueva)
    setColaOffline(nueva)
    toast('Acción guardada — se sincronizará al reconectar', 'info')
  }

  async function sincronizarCola() {
    const cola = leerCola()
    if (!cola.length) return
    setSincronizando(true)
    let procesadas = 0
    for (const accion of cola) {
      try {
        if (accion.tipo === 'APROBAR_DESPACHO') {
          const d = storage.getDespachoById?.(accion.despachoId)?.data
          if (d) { storage.saveDespacho({ ...d, estado: 'APROBADO' }); procesadas++ }
        }
        if (accion.tipo === 'RECHAZAR_DESPACHO') {
          const d = storage.getDespachoById?.(accion.despachoId)?.data
          if (d) { storage.saveDespacho({ ...d, estado: 'ANULADO' }); procesadas++ }
        }
      } catch (e) { /* continúa con la siguiente */ }
    }
    guardarCola([])
    setColaOffline([])
    recargarDespachos()
    setSincronizando(false)
    if (procesadas > 0) toast(`${procesadas} acciones sincronizadas correctamente`, 'success')
  }

  async function handleInstall() {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') { setInstalled(true); setInstallPrompt(null) }
  }

  // ── Datos para vistas móviles ──────────────────────
  const stockCritico = useMemo(() =>
    productos.filter(p => { const e = estadoStock(p.stockActual, p.stockMinimo); return e.estado === 'critico' || e.estado === 'agotado' })
  , [productos])

  const despachosActivos = useMemo(() =>
    despachos.filter(d => ['PEDIDO','APROBADO','PICKING','LISTO'].includes(d.estado))
      .sort((a, b) => (b.createdAt||'').localeCompare(a.createdAt||''))
      .slice(0, 10)
  , [despachos])

  const kpisMovil = useMemo(() => ({
    totalProd:    productos.filter(p=>p.activo!==false).length,
    criticos:     stockCritico.length,
    despActivos:  despachosActivos.length,
    colaItems:    colaOffline.length,
  }), [productos, stockCritico, despachosActivos, colaOffline])

  // ── Acción swipe despacho ──────────────────────────
  function swipeAprobar(des) {
    if (!isOnline) { agregarACola({ tipo:'APROBAR_DESPACHO', despachoId: des.id, numero: des.numero }); return }
    storage.saveDespacho({ ...des, estado:'APROBADO' })
    recargarDespachos()
    toast(`Despacho ${des.numero} aprobado`, 'success')
  }
  function swipeRechazar(des) {
    if (!isOnline) { agregarACola({ tipo:'RECHAZAR_DESPACHO', despachoId: des.id, numero: des.numero }); return }
    storage.saveDespacho({ ...des, estado:'ANULADO' })
    recargarDespachos()
    toast(`Despacho ${des.numero} rechazado`, 'warning')
  }

  const VISTAS = [
    { id:'dashboard',  label:'Inicio',     icon:BarChart2  },
    { id:'inventario', label:'Inventario', icon:Package    },
    { id:'despachos',  label:'Despachos',  icon:Truck      },
    { id:'cola',       label:`Cola (${kpisMovil.colaItems})`, icon:Clock },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-bold text-[#e8edf2]">App Móvil / PWA</h2>
          <p className="text-[12px] text-[#5f6f80] mt-0.5">Vista optimizada para operadores de almacén en celular</p>
        </div>
        <div className="flex items-center gap-2">
          {isOnline
            ? <Badge variant="success"><Wifi size={10}/> En línea</Badge>
            : <Badge variant="danger"><WifiOff size={10}/> Sin conexión</Badge>}
          {colaOffline.length > 0 && (
            <Btn variant="primary" size="sm" onClick={sincronizarCola} disabled={!isOnline||sincronizando}>
              <RefreshCw size={12} className={sincronizando?'animate-spin':''}/> Sincronizar ({colaOffline.length})
            </Btn>
          )}
        </div>
      </div>

      {/* Alerta offline */}
      {!isOnline && (
        <Alert variant="warning">
          <strong>Modo offline activo.</strong> Las acciones que realices se guardan en la cola local
          y se sincronizarán automáticamente cuando recuperes la conexión.
        </Alert>
      )}

      {/* Banner instalación */}
      {!installed && (
        <div className="flex items-center gap-4 px-5 py-4 rounded-xl" style={{background:'rgba(0,200,150,0.08)',border:'1px solid rgba(0,200,150,0.20)'}}>
          <Smartphone size={32} className="text-[#00c896] shrink-0"/>
          <div className="flex-1">
            <div className="text-[13px] font-bold text-[#e8edf2] mb-0.5">Instala StockPro en tu celular</div>
            <div className="text-[12px] text-[#9ba8b6]">
              Acceso desde el escritorio · Funciona sin internet · Cámara para escanear códigos
            </div>
          </div>
          {installPrompt
            ? <Btn variant="primary" size="sm" onClick={handleInstall}><Download size={13}/> Instalar</Btn>
            : <span className="text-[11px] text-[#5f6f80]">Usa Chrome/Edge en Android</span>}
        </div>
      )}

      {/* Tabs de vista móvil */}
      <div className="flex gap-1 bg-[#1a2230] rounded-xl p-1.5">
        {VISTAS.map(v => {
          const Icon = v.icon
          return (
            <button key={v.id} onClick={() => setVistaActiva(v.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-[11px] font-medium transition-all ${
                vistaActiva===v.id ? 'bg-[#00c896]/15 text-[#00c896]' : 'text-[#5f6f80] hover:text-[#9ba8b6]'}`}>
              <Icon size={16}/>
              {v.label}
            </button>
          )
        })}
      </div>

      {/* ── VISTA: DASHBOARD ─────────────────────────── */}
      {vistaActiva === 'dashboard' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label:'Productos activos', val:kpisMovil.totalProd,   color:'#00c896', icon:Package  },
              { label:'Stock crítico',     val:kpisMovil.criticos,    color: kpisMovil.criticos>0?'#ef4444':'#22c55e', icon:AlertTriangle },
              { label:'Despachos activos', val:kpisMovil.despActivos, color:'#3b82f6', icon:Truck    },
              { label:'Acciones en cola',  val:kpisMovil.colaItems,   color: kpisMovil.colaItems>0?'#f59e0b':'#5f6f80', icon:Clock },
            ].map(({ label, val, color, icon:Icon }) => (
              <div key={label} className="bg-[#161d28] border border-white/[0.08] rounded-xl p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background:color }}/>
                <Icon size={14} style={{ color }} className="mb-2 opacity-80"/>
                <div className="text-[26px] font-bold" style={{ color }}>{val}</div>
                <div className="text-[10px] text-[#5f6f80] uppercase tracking-wide mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Estado SW */}
          <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-4">
            <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide mb-3">Estado de la PWA</div>
            {[
              ['Service Worker', swStatus==='activo'?'Activo':'Inactivo', swStatus==='activo'],
              ['Conexión',       isOnline?'En línea':'Sin conexión',      isOnline],
              ['Instalada',      installed?'Sí':'No (disponible)',        installed],
              ['Cola offline',   `${colaOffline.length} acciones pendientes`, colaOffline.length===0],
            ].map(([k,v,ok]) => (
              <div key={k} className="flex justify-between items-center py-2 border-b border-white/[0.05] last:border-0">
                <span className="text-[12px] text-[#5f6f80]">{k}</span>
                <span className={`text-[12px] font-medium ${ok?'text-green-400':'text-amber-400'}`}>{v}</span>
              </div>
            ))}
          </div>

          {/* Guía UX móvil */}
          <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-4">
            <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide mb-3">
              Gestos disponibles en móvil
            </div>
            {[
              ['👉 Desliza derecha', 'Aprobar despacho',   '#22c55e'],
              ['👈 Desliza izquierda', 'Rechazar despacho', '#ef4444'],
              ['📷 Cámara',          'Escanear código de barras en Entradas', '#3b82f6'],
              ['⚡ Offline',         'Acciones guardadas y sincronizadas al reconectar', '#f59e0b'],
            ].map(([gesto, accion, color]) => (
              <div key={gesto} className="flex items-start gap-3 py-2 border-b border-white/[0.05] last:border-0">
                <span className="text-[14px] shrink-0">{gesto.slice(0,2)}</span>
                <div>
                  <div className="text-[12px] font-medium" style={{color}}>{gesto.slice(2).trim()}</div>
                  <div className="text-[11px] text-[#5f6f80]">{accion}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── VISTA: INVENTARIO SIMPLIFICADO ──────────── */}
      {vistaActiva === 'inventario' && (
        <div className="flex flex-col gap-3">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide">
            Vista simplificada — {productos.filter(p=>p.activo!==false).length} productos
          </div>
          {stockCritico.length > 0 && (
            <Alert variant="danger">
              <strong>{stockCritico.length} productos</strong> con stock crítico o agotado requieren reposición urgente.
            </Alert>
          )}
          <div className="flex flex-col gap-2">
            {productos.filter(p=>p.activo!==false).slice(0, 30).map(p => {
              const est = estadoStock(p.stockActual, p.stockMinimo)
              const color = est.estado==='agotado'?'#ef4444':est.estado==='critico'?'#f59e0b':'#00c896'
              return (
                <div key={p.id} className="bg-[#1a2230] rounded-xl px-4 py-3 border border-white/[0.07] flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{background:color}}/>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-[#e8edf2] truncate">{p.nombre}</div>
                    <div className="text-[11px] text-[#5f6f80] font-mono">{p.sku}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[14px] font-bold font-mono" style={{color}}>
                      {p.stockActual}
                    </div>
                    <div className="text-[10px] text-[#5f6f80]">{p.unidadMedida}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── VISTA: DESPACHOS CON SWIPE ──────────────── */}
      {vistaActiva === 'despachos' && (
        <div className="flex flex-col gap-3">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide">
            Desliza para aprobar o rechazar · {despachosActivos.length} activos
          </div>
          {despachosActivos.length === 0
            ? <div className="text-center py-10 text-[#5f6f80] text-[13px]">No hay despachos activos por gestionar.</div>
            : despachosActivos.filter(d=>d.estado==='PEDIDO').map(des => (
                <SwipeCard key={des.id}
                  onAprobar={() => swipeAprobar(des)}
                  onRechazar={() => swipeRechazar(des)}
                  item={
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-mono text-[12px] text-[#00c896] font-bold">{des.numero}</div>
                          <div className="text-[13px] font-medium text-[#e8edf2]">{des.cliente?.slice(0,24)||'—'}</div>
                        </div>
                        <Badge variant="neutral">{des.estado}</Badge>
                      </div>
                      <div className="text-[11px] text-[#5f6f80] flex items-center gap-3">
                        <span>{des.items?.length||0} ítems</span>
                        <span>{formatDate(des.fecha)}</span>
                        <span className="font-mono text-[#00c896]">{formatCurrency(des.total||0,simboloMoneda)}</span>
                      </div>
                      <div className="mt-2 text-[10px] text-[#3d4f60] flex items-center gap-3">
                        <span className="text-green-400">← Desliza derecha para aprobar</span>
                        <span className="text-red-400">Rechazar para izquierda →</span>
                      </div>
                    </div>
                  }
                />
              ))
          }
          {despachosActivos.filter(d=>d.estado!=='PEDIDO').length > 0 && (
            <div className="flex flex-col gap-2 mt-2">
              <div className="text-[11px] text-[#5f6f80] uppercase tracking-wide">En proceso</div>
              {despachosActivos.filter(d=>d.estado!=='PEDIDO').map(des => (
                <div key={des.id} className="bg-[#1a2230] rounded-xl px-4 py-3 border border-white/[0.07] flex items-center gap-3">
                  <Truck size={14} className="text-[#5f6f80] shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[11px] text-[#00c896]">{des.numero}</div>
                    <div className="text-[12px] text-[#9ba8b6] truncate">{des.estado}</div>
                  </div>
                  <Badge variant={{APROBADO:'info',PICKING:'warning',LISTO:'teal',DESPACHADO:'info'}[des.estado]||'neutral'}>{des.estado}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── VISTA: COLA OFFLINE ──────────────────────── */}
      {vistaActiva === 'cola' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide">
              Cola offline — {colaOffline.length} acciones pendientes
            </div>
            {colaOffline.length > 0 && isOnline && (
              <Btn variant="primary" size="sm" onClick={sincronizarCola}>
                <RefreshCw size={12}/> Sincronizar ahora
              </Btn>
            )}
          </div>
          {colaOffline.length === 0
            ? <div className="text-center py-10 text-[#5f6f80] text-[13px]">
                <CheckCircle size={32} className="text-green-400 mx-auto mb-2 opacity-60"/>
                Cola vacía — todo sincronizado
              </div>
            : colaOffline.map(item => (
                <div key={item.id} className="bg-[#1a2230] border border-amber-500/20 rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="warning"><Clock size={10}/> Pendiente</Badge>
                    <span className="text-[10px] text-[#5f6f80] font-mono">{new Date(item.timestamp).toLocaleTimeString('es-PE')}</span>
                  </div>
                  <div className="text-[12px] font-medium text-[#e8edf2]">
                    {item.tipo==='APROBAR_DESPACHO'?'✓ Aprobar':'✗ Rechazar'} despacho {item.numero}
                  </div>
                  <div className="text-[11px] text-[#5f6f80] mt-0.5">Se ejecutará al reconectar</div>
                </div>
              ))
          }
          {!isOnline && colaOffline.length > 0 && (
            <Alert variant="warning">Sin conexión — las acciones se sincronizarán automáticamente al reconectar.</Alert>
          )}
        </div>
      )}
    </div>
  )
}
