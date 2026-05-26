import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Package, Eye, EyeOff, LogIn, Shield, Building2, ArrowLeft, ChevronRight, Crown } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { getEmpresas } from '../services/storage'
import { EMPRESAS_DEMO, USR, USR_ACME } from '../data/demoData'
import { useTheme } from '../hooks/useTheme'
import fondoLogistica from '../assets/Logistica_fondo.webp'

const ROLES_LABEL = {
  owner:       { label: 'Propietario',   color: '#f59e0b' },
  admin:       { label: 'Administrador', color: '#00c896' },
  supervisor:  { label: 'Supervisor',    color: '#3b82f6' },
  almacenero:  { label: 'Almacenero',    color: '#f59e0b' },
  solicitante: { label: 'Solicitante',   color: '#a855f7' },
}

const USERS_BY_TENANT = { dlnorte: USR, acme: USR_ACME }

// Lee usuarios activos de cualquier tenant: demo hardcoded o desde localStorage
function getUsuariosTenant(empresaId) {
  if (!empresaId) return []
  if (USERS_BY_TENANT[empresaId]) return USERS_BY_TENANT[empresaId].filter(u => u.activo)
  try {
    const stored = JSON.parse(localStorage.getItem(`sp_${empresaId}_usuarios`) || 'null')
    if (Array.isArray(stored)) return stored.filter(u => u.activo)
  } catch {}
  return []
}

const MODOS_DEMO = ['Maqueta — localStorage', 'Desarrollo — API local']

const SI_BASE = 'w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-[14px] text-white placeholder-white/30 outline-none transition-all font-[inherit]'

// ── Modo Admin SaaS ──────────────────────────────────────────
function LoginAdmin({ ac, acD, config, modoActual }) {
  const { loginAdmin, toast } = useApp()
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
    await new Promise(r => setTimeout(r, 350))
    const result = loginAdmin(email, password)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      toast(`Bienvenido, ${result.data.nombre}`, 'success')
    }
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

      {/* Hint demo */}
      {MODOS_DEMO.includes(modoActual) && (
        <div className="mt-4 px-3 py-2.5 bg-white/3 border border-white/6 rounded-lg">
          <p className="text-[11px] text-white/30 font-mono">
            Demo: admin@sistema.pe / sistema2024
          </p>
        </div>
      )}
    </div>
  )
}

// Busca un negocio por su empresaId en sp_empresas Y en saas_negocios (AdminSaaS)
function buscarOrgPorId(orgId) {
  // 1. Buscar en el catálogo principal (demo tenants: dlnorte, acme)
  const lista = getEmpresas().data || EMPRESAS_DEMO
  const enLista = lista.find(e => e.id === orgId)
  if (enLista) return enLista

  // 2. Buscar en los negocios registrados por el AdminSaaS
  try {
    const saasNegocios = JSON.parse(localStorage.getItem('saas_negocios') || '[]')
    const neg = saasNegocios.find(n => n.empresaId === orgId)
    if (neg) {
      return {
        id:       neg.empresaId,
        nombre:   neg.nombre,
        contacto: neg.contacto,
        ruc:      neg.ruc,
        plan:     neg.plan,
        email:    neg.email,
        password: neg.password,
        activo:   neg.estado !== 'cancelado' && neg.estado !== 'suspendido',
        _deSaas:  true,
      }
    }
  } catch {}
  return null
}

// ── Login principal ──────────────────────────────────────────
export default function Login({ adminMode = false }) {
  const { orgId } = useParams()
  const { login, toast, config } = useApp()
  const { current: tema } = useTheme()
  const ac  = tema.accent
  const acD = tema.preview?.[0]

  // Paso 1: empresa  |  Paso 2: credenciales
  const [paso,        setPaso]        = useState('empresa')
  const [empresa,     setEmpresa]     = useState(null)
  const [codigoInput, setCodigoInput] = useState('')
  const [errEmpresa,  setErrEmpresa]  = useState('')

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const modoActual  = config?.modoSistema || 'Maqueta — localStorage'
  const mostrarDemo = MODOS_DEMO.includes(modoActual)

  // Auto-seleccionar empresa si viene por URL /app/:orgId
  useEffect(() => {
    if (!orgId) return
    const encontrada = buscarOrgPorId(orgId)
    if (encontrada) {
      setEmpresa(encontrada)
      setCodigoInput(encontrada.id)
      setPaso('credenciales')
    }
  }, [orgId])

  function seleccionarEmpresa(emp) {
    setEmpresa(emp)
    setCodigoInput(emp.id)
    setErrEmpresa('')
    setPaso('credenciales')
    setEmail('')
    setPassword('')
    setError('')
  }

  function continuarConCodigo() {
    const codigo = codigoInput.trim().toLowerCase()
    if (!codigo) { setErrEmpresa('Ingresa el código de tu organización'); return }
    const encontrada = buscarOrgPorId(codigo)
    if (!encontrada) { setErrEmpresa(`No existe ninguna organización con el código '${codigo}'`); return }
    seleccionarEmpresa(encontrada)
  }

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !password) { setError('Completa todos los campos'); return }
    setLoading(true)
    setError('')
    await new Promise(r => setTimeout(r, 350))
    const result = login(empresa.id, email, password)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      toast(`Bienvenido, ${result.data.nombre}`, 'success')
    }
  }

  function fillDemo(u) {
    setEmail(u.email)
    setPassword(u.password)
    setError('')
  }

  // Para tenants _deSaas excluir el email del propietario (ya aparece en su propia tarjeta)
  const usuariosDemo = mostrarDemo
    ? getUsuariosTenant(empresa?.id).filter(u =>
        !empresa?._deSaas || u.email !== empresa?.email
      )
    : []

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
              {adminMode ? 'Admin Sistema' : (config?.version || 'StockPro v2.0')}
            </h1>
            <p className="text-[13px] text-white/40 mt-1">
              {adminMode ? 'Acceso exclusivo administrador' : 'Sistema de Gestión Logística'}
            </p>
          </div>

          {/* ── MODO ADMIN ── */}
          {adminMode && (
            <LoginAdmin ac={ac} acD={acD} config={config} modoActual={modoActual} />
          )}

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
                />
              </div>

              {errEmpresa && (
                <div className="px-3 py-2.5 mb-4 bg-red-500/10 border border-red-500/25 rounded-lg text-[13px] text-red-400">
                  {errEmpresa}
                </div>
              )}

              <button
                onClick={continuarConCodigo}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[14px] font-semibold transition-all"
                style={{ background: ac, color: 'rgba(0,0,0,0.75)' }}
              >
                Continuar <ChevronRight size={16}/>
              </button>
            </div>
          )}

          {/* ── MODO TENANT: PASO 2 — Credenciales ── */}
          {!adminMode && paso === 'credenciales' && (
            <>
              {/* Empresa seleccionada */}
              <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-xl"
                   style={{ background: ac + '1a', border: `1px solid ${ac}40` }}>
                <Building2 size={16} style={{ color: ac }} className="shrink-0"/>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-white truncate">{empresa.nombre}</div>
                  <div className="text-[11px] text-white/40 font-mono">{empresa.id}</div>
                </div>
                {/* Solo mostrar "Cambiar" si no vino por URL directa */}
                {!orgId && (
                  <button
                    onClick={() => { setPaso('empresa'); setError('') }}
                    className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white/70 transition-colors shrink-0"
                  >
                    <ArrowLeft size={12}/> Cambiar
                  </button>
                )}
              </div>

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

              {/* Usuarios demo — tenants con dataset propio (dlnorte, acme) */}
              {mostrarDemo && usuariosDemo.length > 0 && (
                <div className="mt-5 border border-white/8 rounded-xl p-4" style={{ background: 'var(--bg-card)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield size={12} style={{ color: ac }}/>
                    <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">
                      Usuarios de {empresa.nombre.split(' ')[0]}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {usuariosDemo.map(u => {
                      const rolInfo = ROLES_LABEL[u.rol] || { label: u.rol, color: '#5f6f80' }
                      return (
                        <button
                          key={u.id}
                          onClick={() => fillDemo(u)}
                          className="flex items-center gap-3 px-3 py-2.5 bg-white/3 hover:bg-white/6 border border-white/6 rounded-lg transition-colors text-left group"
                        >
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                            style={{ background: `${rolInfo.color}20`, color: rolInfo.color }}
                          >
                            {u.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-medium text-white/80 truncate">{u.nombre}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0"
                                    style={{ background: `${rolInfo.color}20`, color: rolInfo.color }}>
                                {rolInfo.label}
                              </span>
                            </div>
                            <div className="text-[11px] text-white/30 truncate mt-0.5">{u.email}</div>
                          </div>
                          <span className="text-[11px] text-white/20 font-mono shrink-0 group-hover:text-white/40 transition-colors">
                            {u.password}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[10px] text-white/15 mt-3 text-center">
                    Este panel se oculta en Staging y Producción
                  </p>
                </div>
              )}

              {/* Acceso rápido — tenants registrados en AdminSaaS (propietario del negocio) */}
              {mostrarDemo && empresa?._deSaas && empresa?.email && (
                <div className="mt-5 border border-white/8 rounded-xl p-4" style={{ background: 'var(--bg-card)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield size={12} style={{ color: '#f59e0b' }}/>
                    <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">
                      Propietario — {empresa.nombre.split(' ')[0]}
                    </p>
                  </div>
                  <button
                    onClick={() => fillDemo({ email: empresa.email, password: empresa.password })}
                    className="w-full flex items-center gap-3 px-3 py-2.5 bg-white/3 hover:bg-white/6 border border-white/6 rounded-lg transition-colors text-left group"
                  >
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                         style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                      {(empresa.nombre || 'P').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-white/80 truncate">
                          {empresa.contacto || empresa.nombre}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0"
                              style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                          propietario
                        </span>
                      </div>
                      <div className="text-[11px] text-white/30 truncate mt-0.5">{empresa.email}</div>
                    </div>
                    <span className="text-[11px] text-white/20 font-mono shrink-0 group-hover:text-white/40 transition-colors">
                      {empresa.password}
                    </span>
                  </button>
                  <p className="text-[10px] text-white/15 mt-3 text-center">
                    Este panel se oculta en Staging y Producción
                  </p>
                </div>
              )}
            </>
          )}

          {/* Pie */}
          <p className="text-center text-[11px] text-white/20 mt-5">
            {config?.version || 'StockPro v2.0'} · {modoActual}
          </p>
        </div>
      </div>
    </div>
  )
}
