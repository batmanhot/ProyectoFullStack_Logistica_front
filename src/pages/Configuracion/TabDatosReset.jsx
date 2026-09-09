import { RefreshCw, Trash2 } from 'lucide-react'
import { ConfirmDialog, Btn } from '../../components/ui/index'
import { APP_VERSION } from '../../config/constants'

export default function TabDatosReset({
  tenantId, sesion, configApi,
  form,
  confirmReset, setConfirmReset,
  confirmLimpiar, setConfirmLimpiar,
  handleReset, handleLimpiar,
}) {
  return (
    <div className="flex flex-col gap-5">
      {/* ── Limpiar datos operativos ── */}
      <div className="bg-[#161d28] border border-amber-500/25 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-[0.06em] mb-3">Limpiar Datos Operativos</div>
        <p className="text-[13px] text-[#9ba8b6] mb-3 leading-relaxed">
          Elimina todos los datos ingresados y deja el sistema listo para comenzar con información real.
          Se conserva la configuración de la empresa, categorías, almacenes y usuarios.
        </p>
        <div className="grid grid-cols-2 gap-2 mb-4 text-[12px]">
          {[
            ['Conserva', ['Configuración empresa','Categorías','Almacenes','Usuarios y roles','Áreas internas'], 'text-emerald-400'],
            ['Elimina',  ['Productos · Proveedores','Movimientos (entradas/salidas)','Órdenes · Cotizaciones','Clientes · Despachos · Transportes','Oportunidades comerciales','Pedidos Internos · Proyectos · CDR','Auditoría'], 'text-red-400'],
          ].map(([titulo, items, color]) => (
            <div key={titulo} className="bg-black/20 rounded-lg p-3">
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${color}`}>{titulo}</p>
              {items.map(i => (
                <p key={i} className="text-[11px] text-white/50 leading-relaxed">· {i}</p>
              ))}
            </div>
          ))}
        </div>
        <Btn variant="secondary" onClick={() => setConfirmLimpiar(true)}>
          <Trash2 size={14} /> Limpiar Datos Operativos
        </Btn>
      </div>

      {/* ── Zona de peligro: restaurar demo ── */}
      <div className="bg-[#161d28] border border-red-500/20 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-red-400 uppercase tracking-[0.06em] mb-3">Zona de Peligro</div>
        <p className="text-[13px] text-[#9ba8b6] mb-4 leading-relaxed">
          Restaurar los datos demo borrará <span className="text-red-400 font-medium">todos los cambios</span> y recargará el sistema con los datos iniciales de ejemplo.
          Útil para reiniciar la presentación comercial.
        </p>
        <Btn variant="danger" onClick={() => setConfirmReset(true)}>
          <RefreshCw size={14} /> Restaurar Datos Demo
        </Btn>
      </div>

      {/* ── Información del sistema (solo lectura) ── */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">Información del Sistema</div>
        <div className="bg-[#1a2230] rounded-xl overflow-hidden border border-white/6">
          {[
            ['Organización (tenant)', tenantId],
            ['Plan',                  sesion?.plan || 'starter'],
            ['Empresa activa',        form.empresa || configApi?.nombre || '—'],
            ['Versión',               APP_VERSION],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 last:border-0 text-[13px]">
              <span className="text-[#9ba8b6]">{k}</span>
              <span className="font-medium text-[#e8edf2]">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog open={confirmReset} onClose={() => setConfirmReset(false)} onConfirm={handleReset}
        danger title="Restaurar datos demo"
        message={`Se borrarán TODOS los datos de la organización "${tenantId}" y se restaurarán los datos de demostración. Solo afecta a esta empresa — los demás tenants no se ven afectados. La página se recargará automáticamente.`} />

      <ConfirmDialog open={confirmLimpiar} onClose={() => setConfirmLimpiar(false)} onConfirm={handleLimpiar}
        danger title="Limpiar datos operativos"
        message={`Se eliminarán productos, movimientos, órdenes, clientes, despachos y transportes de la organización "${tenantId}". Se conservarán configuración, categorías, almacenes y usuarios. Solo afecta a esta empresa. Esta acción no se puede deshacer.`} />
    </div>
  )
}
