import { useState } from 'react'
import { Shield, LogIn } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { api } from '../../services/api'
import { Field, Btn } from '../../components/ui/index'

// ── Admin Login Gate ─────────────────────────────────────
export default function AdminLoginGate({ onLogin }) {
  const { toast } = useApp()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !password) { toast('Completa email y contraseña', 'error'); return }
    setLoading(true)
    const res = await api.loginAdmin(email, password)
    setLoading(false)
    if (res.error) { toast(res.error, 'error'); return }
    onLogin()
  }

  const inp = 'w-full px-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[13px] text-[#e8edf2] placeholder-[#5f6f80] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20'

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-[#0e1117] p-6">
      <div className="w-full max-w-sm bg-[#161d28] border border-white/8 rounded-2xl p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#00c896]/15 flex items-center justify-center">
            <Shield size={20} className="text-[#00c896]" />
          </div>
          <div>
            <div className="text-[15px] font-bold text-[#e8edf2]">Admin SaaS</div>
            <div className="text-[11px] text-[#5f6f80]">Acceso de administrador de plataforma</div>
          </div>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <Field label="Email de administrador">
            <input type="email" className={inp} value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@stockpro.com" autoFocus />
          </Field>
          <Field label="Contraseña">
            <input type="password" className={inp} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          <Btn variant="primary" type="submit" className="w-full justify-center" disabled={loading}>
            <LogIn size={14}/>{loading ? 'Ingresando…' : 'Ingresar al panel'}
          </Btn>
        </form>
      </div>
    </div>
  )
}
