import { format, formatDistanceToNowStrict } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  CreditCard, Users, DollarSign, Receipt, DatabaseBackup, Activity,
  ShieldAlert, CheckCircle2, Mail, Phone,
} from 'lucide-react'
import { Modal, Badge } from '../../components/ui/index'
import { money } from './_shared'
import { ESTADO_BADGE, ESTADO_LABEL } from './constants'
import { useVista360 } from '../../queries/admin.queries'

// ══════════════════════════════════════════════════════════
// Vista 360° de un negocio — tarjeta consolidada (solo lectura)
// ══════════════════════════════════════════════════════════

const NIVEL = {
  critica: 'bg-red-500/15 text-red-300 border-red-500/30',
  alta:    'bg-orange-500/15 text-orange-300 border-orange-500/30',
  media:   'bg-amber-500/15 text-amber-300 border-amber-500/30',
}
const fdate = d => (d ? format(new Date(d), "dd MMM yyyy", { locale: es }) : '—')
const rel = d => (d ? formatDistanceToNowStrict(new Date(d), { locale: es, addSuffix: true }) : 'sin registro')

function Card({ icon, title, children }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h4 className="text-[12px] font-semibold text-[var(--text-primary)] uppercase tracking-wide">{title}</h4>
      </div>
      {children}
    </div>
  )
}
const Row = ({ k, v, mono }) => (
  <div className="flex items-baseline justify-between gap-3 py-1 border-b border-white/5 last:border-0">
    <span className="text-[11px] text-[var(--text-muted)] shrink-0">{k}</span>
    <span className={`text-[12px] text-[var(--text-primary)] text-right ${mono ? 'font-mono' : ''}`}>{v}</span>
  </div>
)
function Persona({ label, p }) {
  if (!p) return <Row k={label} v={<span className="text-[var(--text-muted)]">—</span>} />
  return (
    <div className="flex items-center justify-between gap-3 py-1 border-b border-white/5 last:border-0">
      <div className="min-w-0">
        <div className="text-[11px] text-[var(--text-muted)]">{label}</div>
        <div className="text-[12px] text-[var(--text-primary)] truncate">{p.nombre}</div>
        <div className="text-[10px] text-[var(--text-muted)] truncate">{p.email}</div>
      </div>
      <Badge variant={p.activo ? 'success' : 'neutral'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge>
    </div>
  )
}

export default function ModalVista360({ negocioId, onClose }) {
  const { data: v, isLoading } = useVista360(negocioId)

  return (
    <Modal open={!!negocioId} onClose={onClose} title={v ? `Vista 360° · ${v.negocio.nombre}` : 'Vista 360°'} size="xl">
      {isLoading || !v ? (
        <div className="py-10 text-center text-[12px] text-[var(--text-muted)]">Cargando…</div>
      ) : (
        <div className="space-y-4">
          {/* Cabecera */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={ESTADO_BADGE[v.negocio.estadoEfectivo] || 'neutral'}>{ESTADO_LABEL[v.negocio.estadoEfectivo] || v.negocio.estadoEfectivo}</Badge>
            <span className="text-[11px] font-mono text-[var(--text-muted)]">{v.negocio.codigo}</span>
            {v.negocio.ruc && <span className="text-[11px] text-[var(--text-muted)]">RUC {v.negocio.ruc}</span>}
            {v.negocio.origen === 'demo' && <Badge variant="neutral">Demo</Badge>}
            <span className="ml-auto text-[11px] text-[var(--text-muted)] flex items-center gap-3">
              {v.negocio.email && <span className="flex items-center gap-1"><Mail size={11}/>{v.negocio.email}</span>}
              {v.negocio.telefono && <span className="flex items-center gap-1"><Phone size={11}/>{v.negocio.telefono}</span>}
            </span>
          </div>

          {/* Señales */}
          {v.senales.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {v.senales.map((s, i) => (
                <span key={i} className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg border ${NIVEL[s.nivel] || NIVEL.media}`}>
                  <ShieldAlert size={12} />{s.texto}
                </span>
              ))}
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
              <CheckCircle2 size={12} />Sin señales — todo en orden
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Plan & vigencia */}
            <Card icon={<CreditCard size={14} style={{ color: v.plan?.color || "var(--accent)" }} />} title="Plan y vigencia">
              {v.plan ? (
                <>
                  <Row k="Plan" v={<span className="font-semibold" style={{ color: v.plan.color }}>{v.plan.nombre}</span>} />
                  <Row k="Precio" v={`${money(v.plan.ciclo === 'anual' ? v.plan.precioAnual : v.plan.precioMensual, v.plan.moneda)} /${v.plan.ciclo === 'anual' ? 'año' : 'mes'}`} mono />
                  <Row k="Módulos" v={v.plan.modulos} />
                  <Row
                    k="Vence"
                    v={
                      v.negocio.diasVencimiento == null
                        ? 'Sin vencimiento'
                        : <span className={v.negocio.diasVencimiento < 0 ? 'text-red-400' : v.negocio.diasVencimiento <= 15 ? 'text-amber-400' : ''}>
                            {v.negocio.diasVencimiento < 0 ? `hace ${-v.negocio.diasVencimiento} d` : `en ${v.negocio.diasVencimiento} d`} · {fdate(v.negocio.fechaVencimiento)}
                          </span>
                    }
                  />
                </>
              ) : <p className="text-[11px] text-[var(--text-muted)]">Sin plan asignado.</p>}
            </Card>

            {/* Equipo & cupo */}
            <Card icon={<Users size={14} className="text-[var(--accent)]" />} title="Equipo y cupo">
              <Persona label="Propietario" p={v.equipo.owner} />
              <Persona label="Admin del negocio" p={v.equipo.adminNegocio} />
              <div className="pt-2">
                <div className="flex items-baseline justify-between text-[11px] text-[var(--text-muted)]">
                  <span>Usuarios</span>
                  <span className="font-mono text-[var(--text-primary)]">
                    {v.equipo.cupoUsado}{v.equipo.cupoMax === -1 ? ' / ∞' : ` / ${v.equipo.cupoMax}`}
                  </span>
                </div>
                {v.equipo.cupoPct != null && (
                  <div className="mt-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${v.equipo.cupoPct}%`, background: v.equipo.cupoPct >= 100 ? '#ef4444' : v.equipo.cupoPct >= 80 ? '#f59e0b' : '#22c55e' }} />
                  </div>
                )}
              </div>
            </Card>

            {/* Ingresos */}
            <Card icon={<DollarSign size={14} className="text-emerald-400" />} title="Ingresos">
              <div className="text-[22px] font-bold text-[var(--text-primary)]">{money(v.ingresos.mrr)}<span className="text-[11px] text-[var(--text-muted)] font-normal"> MRR</span></div>
              {v.ingresos.ultimaRenovacion ? (
                <div className="mt-2 space-y-0.5">
                  <Row k="Última renovación" v={fdate(v.ingresos.ultimaRenovacion.fecha)} />
                  <Row k="Monto" v={`${money(v.ingresos.ultimaRenovacion.monto, v.ingresos.ultimaRenovacion.moneda)} · ${v.ingresos.ultimaRenovacion.ciclo}`} mono />
                  <Row k="Método" v={<span className="capitalize">{v.ingresos.ultimaRenovacion.metodoPago}</span>} />
                  <Row k="Renovaciones" v={v.ingresos.totalRenovaciones} />
                </div>
              ) : <p className="text-[11px] text-[var(--text-muted)] mt-2">Sin renovaciones registradas.</p>}
            </Card>

            {/* Facturación */}
            <Card icon={<Receipt size={14} className="text-blue-400" />} title="Facturación">
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['Facturado', v.facturacion.facturado, ''],
                  ['Cobrado', v.facturacion.cobrado, 'text-emerald-400'],
                  ['Por cobrar', v.facturacion.porCobrar, 'text-amber-400'],
                  ['Vencido', v.facturacion.vencido, v.facturacion.vencido > 0 ? 'text-red-400' : ''],
                ].map(([k, val, cls]) => (
                  <div key={k} className="rounded-lg bg-white/3 p-2">
                    <div className="text-[10px] text-[var(--text-muted)] uppercase">{k}</div>
                    <div className={`text-[13px] font-semibold ${cls}`}>{money(val)}</div>
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] mt-2">{v.facturacion.emitidas} documento(s) emitido(s)</div>
            </Card>

            {/* Backups */}
            <Card icon={<DatabaseBackup size={14} className="text-violet-400" />} title="Backups">
              {v.backups.ultimoRespaldo ? (
                <>
                  <Row k="Último respaldo" v={fdate(v.backups.ultimoRespaldo.fecha)} />
                  <Row k="Estado" v={<Badge variant={v.backups.ultimoRespaldo.estado === 'COMPLETADO' ? 'success' : v.backups.ultimoRespaldo.estado === 'FALLIDO' ? 'danger' : 'warning'}>{v.backups.ultimoRespaldo.estado}</Badge>} />
                  <Row k="Registros" v={v.backups.totalRespaldos} />
                </>
              ) : <p className="text-[11px] text-[var(--text-muted)]">Sin respaldos registrados.</p>}
              {v.backups.restauracionesPendientes > 0 && (
                <div className="mt-2 text-[11px] text-amber-400">{v.backups.restauracionesPendientes} restauración(es) pendiente(s)</div>
              )}
            </Card>

            {/* Actividad */}
            <Card icon={<Activity size={14} className="text-[var(--accent)]" />} title="Actividad">
              <Row k="Último acceso" v={rel(v.negocio.ultimoAcceso)} />
              <Row k="Registrado" v={`${fdate(v.negocio.fechaRegistro)} (${rel(v.negocio.fechaRegistro)})`} />
              <Row k="Estado guardado" v={ESTADO_LABEL[v.negocio.estado] || v.negocio.estado} />
              <Row k="Origen" v={<span className="capitalize">{v.negocio.origen?.replace('_', ' ')}</span>} />
            </Card>
          </div>
        </div>
      )}
    </Modal>
  )
}
