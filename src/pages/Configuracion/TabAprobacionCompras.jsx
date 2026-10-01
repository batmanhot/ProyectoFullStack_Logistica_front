import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { Badge, Btn, Field, Input, Spinner, ConfirmDialog } from '../../components/ui/index'
import { useRolesList } from '../../queries/roles.queries'
import {
  useNivelesAprobacionCompra,
  useCrearNivelAprobacionCompra,
  useActualizarNivelAprobacionCompra,
  useEliminarNivelAprobacionCompra,
} from '../../queries/niveles-aprobacion-compra.queries'
import { formatCurrency } from '../../utils/helpers'

// Owner aprueba siempre (comodín '*') — no se ofrece como opción, igual que TabAprobaciones.
const ROLES_SIEMPRE = ['owner']

export default function TabAprobacionCompras() {
  const { toast } = useApp()
  const { data: niveles = [], isLoading } = useNivelesAprobacionCompra()
  const { data: rolesApi = [] } = useRolesList()
  const crear = useCrearNivelAprobacionCompra()
  const actualizar = useActualizarNivelAprobacionCompra()
  const eliminar = useEliminarNivelAprobacionCompra()

  const [nuevoMonto, setNuevoMonto] = useState('')
  const [nuevoRoles, setNuevoRoles] = useState([])
  const [confirmEliminar, setConfirmEliminar] = useState(null)

  const rolesAsignables = rolesApi
    .filter(r => !ROLES_SIEMPRE.includes(r.codigo))
    .map(r => ({ codigo: r.codigo, label: r.label || r.codigo }))

  function toggleRolNuevo(codigo) {
    setNuevoRoles(p => p.includes(codigo) ? p.filter(c => c !== codigo) : [...p, codigo])
  }

  async function toggleRolNivel(nivel, codigo) {
    const yaEsta = nivel.rolesAprobadores.includes(codigo)
    const siguiente = yaEsta
      ? nivel.rolesAprobadores.filter(c => c !== codigo)
      : [...nivel.rolesAprobadores, codigo]
    const res = await actualizar.mutateAsync({ id: nivel.id, rolesAprobadores: siguiente })
    if (res?.error) { toast(res.error, 'error'); return }
  }

  async function agregarNivel() {
    const monto = Number(nuevoMonto)
    if (nuevoMonto === '' || Number.isNaN(monto) || monto < 0) {
      toast('Ingresa un monto mínimo válido', 'error')
      return
    }
    const res = await crear.mutateAsync({ montoMinimo: monto, rolesAprobadores: nuevoRoles })
    if (res?.error) { toast(res.error, 'error'); return }
    setNuevoMonto('')
    setNuevoRoles([])
    toast('Nivel de aprobación agregado', 'success')
  }

  async function confirmarEliminar() {
    const id = confirmEliminar
    setConfirmEliminar(null)
    const res = await eliminar.mutateAsync(id)
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Nivel eliminado', 'success')
  }

  if (isLoading) return <div className="flex justify-center p-8"><Spinner /></div>

  const ultimoMonto = niveles.length ? Number(niveles[niveles.length - 1].montoMinimo) : null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg border border-blue-500/25 bg-blue-500/10 text-blue-300 text-[13px] leading-snug">
        <span>Define desde qué <b>monto</b> de Orden de Compra se necesita cada aprobación. Es una <b>cadena
        acumulativa</b>: a mayor monto, se suman más niveles — todos deben aprobar en orden. Sin niveles
        configurados, una OC se aprueba con un solo click, igual que siempre.</span>
      </div>

      {niveles.length === 0 && (
        <div className="text-[13px] text-[#5f6f80] px-1">
          Todavía no hay niveles configurados — cualquier Orden de Compra se aprueba directo, sin cadena.
        </div>
      )}

      {niveles.map(nivel => (
        <div key={nivel.id} className="bg-[#161d28] border border-white/8 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge variant="teal">Nivel {nivel.nivel}</Badge>
              <span className="text-[13px] text-[#9ba8b6]">desde {formatCurrency(Number(nivel.montoMinimo), 'S/')}</span>
            </div>
            <button
              type="button"
              onClick={() => setConfirmEliminar(nivel.id)}
              title="Eliminar nivel"
              className="text-red-400/70 hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {rolesAsignables.map(rol => {
              const activo = nivel.rolesAprobadores.includes(rol.codigo)
              return (
                <button
                  key={rol.codigo}
                  type="button"
                  disabled={actualizar.isPending}
                  onClick={() => toggleRolNivel(nivel, rol.codigo)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all disabled:opacity-50
                    ${activo
                      ? 'bg-[#00c896]/12 border-[#00c896] text-[#00c896]'
                      : 'bg-[#1a2230] border-white/8 text-[#9ba8b6] hover:border-white/20'}`}
                >
                  {rol.label}
                </button>
              )
            })}
          </div>

          {nivel.rolesAprobadores.length === 0 && (
            <div className="text-[12px] text-[#5f6f80] mt-3">
              Cualquier usuario con el permiso de Órdenes puede aprobar este nivel.
            </div>
          )}
        </div>
      ))}

      <div className="bg-[#161d28] border border-dashed border-white/15 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          Agregar nivel {niveles.length + 1}
        </div>
        <div className="flex flex-col gap-3">
          <Field label={`Monto mínimo${ultimoMonto != null ? ` — mayor a ${formatCurrency(ultimoMonto, 'S/')}` : ''}`}>
            <Input
              type="number" min="0" step="0.01" placeholder="0.00"
              value={nuevoMonto} onChange={e => setNuevoMonto(e.target.value)}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            {rolesAsignables.map(rol => {
              const activo = nuevoRoles.includes(rol.codigo)
              return (
                <button
                  key={rol.codigo}
                  type="button"
                  onClick={() => toggleRolNuevo(rol.codigo)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all
                    ${activo
                      ? 'bg-[#00c896]/12 border-[#00c896] text-[#00c896]'
                      : 'bg-[#1a2230] border-white/8 text-[#9ba8b6] hover:border-white/20'}`}
                >
                  {rol.label}
                </button>
              )
            })}
          </div>
          <Btn variant="primary" size="sm" onClick={agregarNivel} disabled={crear.isPending} className="self-start">
            <Plus size={13} /> Agregar nivel
          </Btn>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmEliminar} onClose={() => setConfirmEliminar(null)} onConfirm={confirmarEliminar}
        danger title="Eliminar nivel de aprobación"
        message="Se eliminará este nivel y se renumerarán los siguientes. Las Órdenes de Compra que ya tienen este nivel en su cadena (creadas antes de eliminarlo) no se ven afectadas — conservan el snapshot con el que se crearon."
      />
    </div>
  )
}
