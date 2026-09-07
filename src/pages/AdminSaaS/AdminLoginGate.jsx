import { useState } from 'react'
import { Shield, LogIn } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { api } from '../../services/api'
import { Field, Btn, Input } from '../../components/ui/index'

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

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-[var(--bg-base)] p-6">
      <div className="w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-8 shadow-[var(--shadow-modal)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center">
            <Shield size={20} className="text-[var(--accent)]" />
          </div>
          <div>
            <div className="text-[15px] font-bold text-[var(--text-primary)]">Admin SaaS</div>
            <div className="text-[11px] text-[var(--text-muted)]">Acceso de administrador de plataforma</div>
          </div>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <Field label="Email de administrador">
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@stockpro.com" autoFocus />
          </Field>
          <Field label="Contraseña">
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          <Btn variant="primary" type="submit" className="w-full justify-center" disabled={loading}>
            <LogIn size={14}/>{loading ? 'Ingresando…' : 'Ingresar al panel'}
          </Btn>
        </form>
      </div>
    </div>
  )
}
