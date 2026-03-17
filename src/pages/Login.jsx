import { useState, useMemo } from 'react'
import { Package, Eye, EyeOff, LogIn, Shield } from 'lucide-react'
import { useApp } from '../store/AppContext'
import * as storage from '../services/storage'

const ROLES_LABEL = {
  admin:      { label: 'Administrador', color: '#00c896' },
  supervisor: { label: 'Supervisor',    color: '#3b82f6' },
  almacenero: { label: 'Almacenero',    color: '#f59e0b' },
}

// Modos en los que se muestra el panel de usuarios demo
const MODOS_DEMO = [
  'Maqueta — localStorage',
  'Desarrollo — API local',
]

export default function Login() {
  const { login, toast, config } = useApp()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const modoActual = config?.modoSistema || 'Maqueta — localStorage'
  const mostrarDemo = MODOS_DEMO.includes(modoActual)

  // Leer usuarios reales desde storage — máx 4, uno por rol diferente
  const usuariosDemo = useMemo(() => {
    if (!mostrarDemo) return []
    const todos = storage.getUsuarios().data || []
    const activos = todos.filter(u => u.activo)
    // Un usuario por cada rol diferente, hasta 4
    const porRol = {}
    activos.forEach(u => {
      if (!porRol[u.rol]) porRol[u.rol] = u
    })
    return Object.values(porRol).slice(0, 4)
  }, [mostrarDemo])

  const SI = 'w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-[14px] text-white placeholder-white/30 outline-none transition-all focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit]'

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !password) { setError('Completa todos los campos'); return }
    setLoading(true)
    setError('')
    await new Promise(r => setTimeout(r, 400))
    const result = login(email, password)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      toast(`Bienvenido, ${result.data.nombre}`, 'success')
    }
  }

  return (
    <div className="min-h-screen bg-[#0e1117] flex items-center justify-center p-5">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#00c896] flex items-center justify-center mb-4">
            <Package size={28} color="#082e1e" strokeWidth={2.5} />
          </div>
          <h1 className="text-[24px] font-semibold text-white">
            {config?.version || 'StockPro v2.0'}
          </h1>
          <p className="text-[13px] text-white/40 mt-1">Sistema de Gestión Logística</p>
        </div>

        {/* Card login */}
        <div className="bg-[#161d28] border border-white/[0.08] rounded-2xl p-8">
          <h2 className="text-[16px] font-semibold text-white mb-6">Iniciar sesión</h2>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Email</label>
              <input
                type="email"
                className={SI}
                placeholder="usuario@empresa.pe"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                autoComplete="email"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className={SI + ' pr-10'}
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
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#00c896] text-[#082e1e] rounded-lg text-[14px] font-semibold transition-all hover:bg-[#009e76] disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {loading
                ? <div className="w-4 h-4 rounded-full border-2 border-[#082e1e]/30 border-t-[#082e1e] animate-spin-slow"/>
                : <LogIn size={16}/>
              }
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        {/* Panel usuarios demo — solo visible en Maqueta y Desarrollo */}
        {mostrarDemo && usuariosDemo.length > 0 && (
          <div className="mt-5 bg-[#161d28] border border-white/[0.08] rounded-xl p-4">

            {/* Cabecera del panel */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield size={12} className="text-[#00c896]"/>
                <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">
                  Acceso rápido — Usuarios de prueba
                </p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/[0.08] text-white/25 font-medium">
                {modoActual}
              </span>
            </div>

            {/* Lista de usuarios leídos desde storage */}
            <div className="flex flex-col gap-2">
              {usuariosDemo.map(u => {
                const rolInfo = ROLES_LABEL[u.rol] || { label: u.rol, color: '#5f6f80' }
                return (
                  <button
                    key={u.id}
                    onClick={() => { setEmail(u.email); setPassword(u.password); setError('') }}
                    className="flex items-center gap-3 px-3 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-lg transition-colors text-left group"
                  >
                    {/* Avatar inicial */}
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                      style={{ background: `${rolInfo.color}20`, color: rolInfo.color }}
                    >
                      {u.nombre.charAt(0).toUpperCase()}
                    </div>

                    {/* Info usuario */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-white/80 truncate">{u.nombre}</span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0"
                          style={{ background: `${rolInfo.color}20`, color: rolInfo.color }}
                        >
                          {rolInfo.label}
                        </span>
                      </div>
                      <div className="text-[11px] text-white/30 truncate mt-0.5">{u.email}</div>
                    </div>

                    {/* Contraseña — visible para pruebas */}
                    <span className="text-[11px] text-white/20 font-mono shrink-0 group-hover:text-white/40 transition-colors">
                      {u.password}
                    </span>
                  </button>
                )
              })}
            </div>

            <p className="text-[10px] text-white/15 mt-3 text-center">
              Este panel se oculta automáticamente en modo Staging y Producción
            </p>
          </div>
        )}

        {/* Pie de página */}
        <p className="text-center text-[11px] text-white/20 mt-5">
          {config?.version || 'StockPro v2.0'}
          {' · '}
          {modoActual}
        </p>
      </div>
    </div>
  )
}
