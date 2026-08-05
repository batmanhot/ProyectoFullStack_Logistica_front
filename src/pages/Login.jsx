import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Package, Eye, EyeOff, LogIn, Shield, Building2, ArrowLeft, ChevronRight, Crown, Wrench } from 'lucide-react'
import { useApp } from '../store/AppContext'
import api from '../services/api'
import { useTheme } from '../hooks/useTheme'
import fondoLogistica from '../assets/Logistica_fondo.webp'

const ROLES_LABEL = {
  owner:       { label: 'Propietario',   color: '#f59e0b' },
  admin:       { label: 'Administrador', color: '#00c896' },
  supervisor:  { label: 'Supervisor',    color: '#3b82f6' },
  almacenero:  { label: 'Almacenero',    color: '#f59e0b' },
  solicitante: { label: 'Solicitante',   color: '#a855f7' },
}

const SI_BASE = 'w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-[14px] text-white placeholder-white/30 outline-none transition-all font-[inherit]'

// ── Modo Admin SaaS ──────────────────────────────────────────
function LoginAdmin({ ac }) {
  const { setSesion, toast } = useApp()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !password) { setError('Completa todos los campos'); return }
    setLoading(true)
    setError('')
    const res = await api.loginAdmin(email, password)
    setLoading(false)
    if (res.error || !res.data) {
      setError(res.error || 'Error al iniciar sesión')
      return
    }
    const sesion = {
      ...res.data.admin,
      rol: { codigo: 'saas_admin', label: 'Super Admin', permisos: ['*'] },
    }
    setSesion(sesion)
    toast(`Bienvenido, ${res.data.admin?.nombre || 'Admin'}`, 'success')
  }

  return (
    <div className="border border-white/8 rounded-2xl p-8" style={{ background: 'var(--bg-card)' }}>
      <div className="flex items-center gap-2 mb-6">
        <Crown size={18} style={{ color: ac }}/>
        <h2 className="text-[16px] font-semibold text-white">Acceso Administrador</h2>
      </div>

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Email</label>
          <input
            type="email"
            className={SI_BASE}
            placeholder="admin@sistema.pe"
            value={email}
            onChange={e => { setEmail(e.target.value); setError('') }}
            autoComplete="email"
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Contraseña</label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              className={SI_BASE + ' pr-10'}
              placeholder="••••••••"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPass(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
            </button>
          </div>
        </div>

        {error && (
          <div className="px-3 py-2.5 bg-red-500/10 border border-red-500/25 rounded-lg text-[13px] text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[14px] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          style={{ background: ac, color: 'rgba(0,0,0,0.75)' }}
        >
          {loading
            ? <div className="w-4 h-4 rounded-full border-2 border-black/20 border-t-black/60 animate-spin-slow"/>
            : <Crown size={16}/>
          }
          {loading ? 'Verificando...' : 'Ingresar al Panel'}
        </button>
      </form>
    </div>
  )
}

// ── Login principal ──────────────────────────────────────────
export default function Login({ adminMode = false }) {
  const { orgId } = useParams()
  const { setSesion, toast } = useApp()
  const { current: tema } = useTheme()
  const ac  = tema.accent
  const acD = tema.preview?.[0]

  const [paso,        setPaso]        = useState('empresa')
  const [empresa,     setEmpresa]     = useState(null)
  const [codigoInput, setCodigoInput] = useState('')
  const [errEmpresa,  setErrEmpresa]  = useState('')
  const [buscando,    setBuscando]    = useState(false)

  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [showPass,   setShowPass]   = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [demoLoading,setDemoLoading]= useState('') // id del usuario demo en curso

  // Auto-seleccionar empresa si viene por URL /app/:orgId
  useEffect(() => {
    if (!orgId) return
    setBuscando(true)
    api.buscarEmpresa(orgId).then(res => {
      setBuscando(false)
      if (res.data) {
        setEmpresa(res.data)
        setCodigoInput(res.data.codigo || orgId)
        setPaso('credenciales')
      } else {
        setErrEmpresa(res.error || `No existe ninguna organización con el código '${orgId}'`)
      }
    })
  }, [orgId])

  async function continuarConCodigo() {
    const codigo = codigoInput.trim().toLowerCase()
    if (!codigo) { setErrEmpresa('Ingresa el código de tu organización'); return }
    setBuscando(true)
    setErrEmpresa('')
    const res = await api.buscarEmpresa(codigo)
    setBuscando(false)
    if (res.error || !res.data) {
      setErrEmpresa(res.error || `No existe ninguna organización con el código '${codigo}'`)
      return
    }
    const emp = res.data
    setEmpresa(emp)
    setCodigoInput(emp.codigo || codigo)
    setErrEmpresa('')
    setPaso('credenciales')
    setEmail('')
    setPassword('')
    setError('')
  }

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !password) { setError('Completa todos los campos'); return }
    setLoading(true)
    setError('')
    const res = await api.login(empresa.id, email, password)
    setLoading(false)
    if (res.error || !res.data) {
      setError(res.error || 'Credenciales incorrectas')
      return
    }
    const sesion = { ...res.data.usuario, empresaCodigo: empresa.codigo, empresaNombre: empresa.nombre, empresaNombreCorto: empresa.nombreCorto, plan: empresa.plan }
    setSesion(sesion)
    toast(`Bienvenido, ${sesion.nombre}`, 'success')
  }

  // Acceso rápido de "modo desarrollo" — sin password; el backend valida
  // igualmente que la empresa sea demo y tenga el switch activo (Configuración
  // → Sistema), así que esto no funciona aunque alguien arme el request a mano.
  async function handleDemoLogin(usuarioDemo) {
    setDemoLoading(usuarioDemo.id)
    setError('')
    const res = await api.demoLogin(empresa.id, usuarioDemo.id)
    setDemoLoading('')
    if (res.error || !res.data) {
      setError(res.error || 'No se pudo iniciar sesión con este usuario demo')
      return
    }
    const sesion = { ...res.data.usuario, empresaCodigo: empresa.codigo, empresaNombre: empresa.nombre, empresaNombreCorto: empresa.nombreCorto, plan: empresa.plan }
    setSesion(sesion)
    toast(`Bienvenido, ${sesion.nombre}`, 'success')
  }

  return (
    <div
      className="min-h-screen w-full flex relative"
      style={{ backgroundImage: `url(${fondoLogistica})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="absolute inset-0 bg-black/30" />

      {/* Panel izquierdo — solo desktop */}
      <div className="hidden lg:flex flex-1 relative items-end pb-12 pl-12 pr-4">
        <div className="relative z-10 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
               style={{ background: 'rgba(0,200,150,0.18)', border: '1px solid rgba(0,200,150,0.45)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00c896' }} />
            <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: '#00e6b0' }}>Sistema en línea</span>
          </div>
          <p className="text-[32px] font-bold leading-tight"
             style={{ color: '#ffffff', textShadow: '0 2px 24px rgba(0,0,0,0.98), 0 1px 4px rgba(0,0,0,0.9)' }}>
            {adminMode
              ? 'Panel de Administración\nSaaS'
              : 'Gestión inteligente\nde tu cadena logística'}
          </p>
          <p className="text-[14px] mt-3 leading-relaxed"
             style={{ color: 'rgba(255,255,255,0.82)', textShadow: '0 1px 12px rgba(0,0,0,0.95)' }}>
            {adminMode
              ? 'Gestión de clientes · Planes · Facturación'
              : 'Control de inventario · Despachos\nTransportes · Reportes · KPIs'}
          </p>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="relative z-10 w-full lg:w-auto lg:min-w-100 lg:max-w-110 flex items-center justify-center p-6"
           style={{ background: `color-mix(in srgb, ${acD} 90%, transparent)`, backdropFilter: 'blur(18px)', borderLeft: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="w-full max-w-sm">

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: ac }}>
              {adminMode
                ? <Crown size={28} color="rgba(0,0,0,0.7)" strokeWidth={2.5} />
                : <Package size={28} color="rgba(0,0,0,0.7)" strokeWidth={2.5} />
              }
            </div>
            <h1 className="text-[24px] font-semibold text-white">
              {adminMode ? 'Admin Sistema' : 'StockPro'}
            </h1>
            <p className="text-[13px] text-white/40 mt-1">
              {adminMode ? 'Acceso exclusivo administrador' : 'Sistema de Gestión Logística'}
            </p>
          </div>

          {/* ── MODO ADMIN ── */}
          {adminMode && <LoginAdmin ac={ac} />}

          {/* ── MODO TENANT: PASO 1 — Código de organización ── */}
          {!adminMode && paso === 'empresa' && (
            <div className="border border-white/8 rounded-2xl p-8" style={{ background: 'var(--bg-card)' }}>
              <h2 className="text-[16px] font-semibold text-white mb-1">Ingresa a tu organización</h2>
              <p className="text-[12px] text-white/35 mb-6">Escribe el código de tu empresa</p>

              <div className="flex flex-col gap-1.5 mb-4">
                <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">
                  Código de organización
                </label>
                <input
                  className={SI_BASE}
                  placeholder="ej: dlnorte, acme..."
                  value={codigoInput}
                  onChange={e => { setCodigoInput(e.target.value); setErrEmpresa('') }}
                  onKeyDown={e => e.key === 'Enter' && continuarConCodigo()}
                  autoComplete="organization"
                  autoFocus
                  disabled={buscando}
                />
              </div>

              {errEmpresa && (
                <div className="px-3 py-2.5 mb-4 bg-red-500/10 border border-red-500/25 rounded-lg text-[13px] text-red-400">
                  {errEmpresa}
                </div>
              )}

              <button
                onClick={continuarConCodigo}
                disabled={buscando}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[14px] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: ac, color: 'rgba(0,0,0,0.75)' }}
              >
                {buscando
                  ? <div className="w-4 h-4 rounded-full border-2 border-black/20 border-t-black/60 animate-spin-slow"/>
                  : <ChevronRight size={16}/>
                }
                {buscando ? 'Buscando...' : 'Continuar'}
              </button>
            </div>
          )}

          {/* ── MODO TENANT: PASO 2 — Credenciales ── */}
          {!adminMode && paso === 'credenciales' && empresa && (
            <>
              {/* Empresa seleccionada */}
              <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-xl"
                   style={{ background: ac + '1a', border: `1px solid ${ac}40` }}>
                <Building2 size={16} style={{ color: ac }} className="shrink-0"/>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-white truncate">{empresa.nombre}</div>
                  <div className="text-[11px] text-white/40 font-mono">{empresa.codigo || empresa.id}</div>
                </div>
                {!orgId && (
                  <button
                    onClick={() => { setPaso('empresa'); setError('') }}
                    className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white/70 transition-colors shrink-0"
                  >
                    <ArrowLeft size={12}/> Cambiar
                  </button>
                )}
              </div>

              {/* Acceso rápido — solo empresas demo con el switch de Configuración activo */}
              {empresa.modoDesarrollo && empresa.usuariosDemo?.length > 0 && (
                <div className="mb-4 rounded-2xl p-5 border border-amber-500/25" style={{ background: 'rgba(245,158,11,0.08)' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Wrench size={13} className="text-amber-400"/>
                    <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wide">Modo desarrollo — acceso rápido</span>
                  </div>
                  <p className="text-[11px] text-white/40 mb-3 leading-relaxed">
                    Entra directo como cualquiera de los usuarios de prueba de esta empresa, sin escribir contraseña.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {empresa.usuariosDemo.map(u => {
                      const meta = ROLES_LABEL[u.rol?.codigo] || { label: u.rol?.label || 'Usuario', color: '#9ba8b6' }
                      return (
                        <button key={u.id} type="button" disabled={!!demoLoading}
                          onClick={() => handleDemoLogin(u)}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/25 hover:bg-white/8 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0"
                            style={{ background: meta.color + '26', color: meta.color }}>
                            {u.nombre?.charAt(0) || '?'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[12px] font-medium text-white truncate">{u.nombre}</div>
                            <div className="text-[10px] truncate" style={{ color: meta.color }}>{meta.label}</div>
                          </div>
                          {demoLoading === u.id && (
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white/60 animate-spin-slow shrink-0"/>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="border border-white/8 rounded-2xl p-8" style={{ background: 'var(--bg-card)' }}>
                <h2 className="text-[16px] font-semibold text-white mb-6">Iniciar sesión</h2>

                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Email</label>
                    <input
                      type="email"
                      className={SI_BASE}
                      placeholder="usuario@empresa.pe"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError('') }}
                      autoComplete="email"
                      autoFocus
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Contraseña</label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        className={SI_BASE + ' pr-10'}
                        placeholder="••••••••"
                        value={password}
                        onChange={e => { setPassword(e.target.value); setError('') }}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                      >
                        {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="px-3 py-2.5 bg-red-500/10 border border-red-500/25 rounded-lg text-[13px] text-red-400">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[14px] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                    style={{ background: ac, color: 'rgba(0,0,0,0.75)' }}
                  >
                    {loading
                      ? <div className="w-4 h-4 rounded-full border-2 border-black/20 border-t-black/60 animate-spin-slow"/>
                      : <LogIn size={16}/>
                    }
                    {loading ? 'Ingresando...' : 'Ingresar'}
                  </button>
                </form>
              </div>
            </>
          )}

          {/* Pie */}
          <p className="text-center text-[11px] text-white/20 mt-5">
            StockPro · Sistema de Gestión Logística
          </p>
        </div>
      </div>
    </div>
  )
}
