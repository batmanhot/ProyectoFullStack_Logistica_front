import { useState } from 'react'
import { User, Building2, ShieldCheck, Activity, Boxes, Phone, IdCard, Briefcase } from 'lucide-react'
import { Modal, Badge, Spinner } from '../ui/index'
import { usePerfil } from '../../queries/perfil.queries'

const fdate = d => {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return '—' }
}
const money = n => (n == null ? '—' : `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)

function Card({ icon: Icon, title, children }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#161d28] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} className="text-[#00c896]" />
        <h4 className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">{title}</h4>
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  )
}
const Row = ({ k, v }) => (
  <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-white/5 last:border-0">
    <span className="text-[11px] text-[#5f6f80] shrink-0">{k}</span>
    <span className="text-[12px] text-[#e8edf2] text-right break-words">{v || <span className="text-[#5f6f80]">—</span>}</span>
  </div>
)

const ESTADO_LABEL = {
  activo: 'Activo', trial: 'Prueba', por_vencer: 'Por vencer', gracia: 'En gracia',
  suspendido: 'Suspendido', cancelado: 'Cancelado', archivado: 'Archivado',
}

export default function ModalMiPerfil({ open, onClose }) {
  const { data: p, isLoading, isError } = usePerfil({ enabled: open })
  const [verModulos, setVerModulos] = useState(false)

  return (
    <Modal open={open} onClose={onClose} title="Mi Perfil" size="lg">
      {isLoading && <div className="flex justify-center p-10"><Spinner /></div>}
      {isError && <div className="p-6 text-[13px] text-red-400">No se pudo cargar tu perfil. Intenta de nuevo.</div>}

      {p && !isLoading && (
        <div className="flex flex-col gap-4">
          {/* Cabecera */}
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-[22px] font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #00c896, #0a7f63)' }}>
              {p.nombre?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-[16px] font-bold text-[#e8edf2] truncate">{p.nombre}</div>
              <div className="text-[12px] text-[#9ba8b6] truncate">{p.email}</div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Badge variant="teal">{p.rol?.label}</Badge>
                <Badge variant={p.activo ? 'success' : 'neutral'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card icon={User} title="Perfil">
              <Row k={<span className="flex items-center gap-1"><Phone size={11} /> Teléfono</span>} v={p.telefono} />
              <Row k={<span className="flex items-center gap-1"><IdCard size={11} /> Documento</span>} v={p.documento} />
              <Row k={<span className="flex items-center gap-1"><Briefcase size={11} /> Cargo</span>} v={p.cargo} />
              <Row k="Miembro desde" v={fdate(p.miembroDesde)} />
            </Card>

            <Card icon={Building2} title="Empresa">
              <Row k="Negocio" v={p.empresa?.nombre} />
              <Row k="Código" v={p.empresa?.codigo} />
              <Row k="Plan" v={p.empresa?.plan} />
              <Row k="Estado" v={ESTADO_LABEL[p.empresa?.estado] || p.empresa?.estado} />
              {p.empresa?.fechaVencimiento && <Row k="Vence" v={fdate(p.empresa.fechaVencimiento)} />}
            </Card>

            <Card icon={ShieldCheck} title="Acceso">
              <Row k="Rol" v={p.rol?.label} />
              {p.accesoTotal ? (
                <div className="text-[12px] text-[#00c896] py-1.5">Acceso total a todos los módulos</div>
              ) : (
                <>
                  <Row k="Módulos habilitados" v={`${p.modulos?.length || 0}`} />
                  {p.modulos?.length > 0 && (
                    <div className="mt-2">
                      <button onClick={() => setVerModulos(v => !v)}
                        className="text-[11px] text-[#9ba8b6] hover:text-[#e8edf2] transition-colors">
                        {verModulos ? 'Ocultar' : 'Ver'} lista
                      </button>
                      {verModulos && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {p.modulos.map(m => (
                            <span key={m} className="px-1.5 py-0.5 rounded bg-[#1a2230] border border-white/8 text-[10px] text-[#9ba8b6]">{m}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </Card>

            <Card icon={Activity} title="Actividad">
              <Row k="Último acceso previo" v={p.ultimoAccesoPrevio ? fdate(p.ultimoAccesoPrevio) : 'Es tu primer inicio de sesión'} />
              <Row k="Acciones registradas" v={`${p.accionesRegistradas ?? 0}`} />
            </Card>

            {(p.area || p.transportista || p.metaVentasMensual != null) && (
              <Card icon={Boxes} title="Contexto del rol">
                {p.area && <Row k="Área interna" v={`${p.area.nombre}${p.area.codigo ? ` (${p.area.codigo})` : ''}`} />}
                {p.transportista && <Row k="Transportista" v={`${p.transportista.nombre}${p.transportista.placa ? ` — ${p.transportista.placa}` : ''}`} />}
                {p.metaVentasMensual != null && <Row k="Meta de ventas mensual" v={money(p.metaVentasMensual)} />}
              </Card>
            )}
          </div>

          <p className="text-[11px] text-[#5f6f80] leading-relaxed">
            Vista de solo lectura. Para actualizar tus datos, contacta al administrador de tu empresa.
          </p>
        </div>
      )}
    </Modal>
  )
}
