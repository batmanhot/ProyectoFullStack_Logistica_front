import { useState, useEffect } from 'react'
import { ChevronLeft, Plus, ClipboardList, CheckCircle } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { Badge, Btn } from '../../components/ui/index'
import { useCategoriasList } from '../../queries/categorias.queries'
import { useAlmacenesList } from '../../queries/almacenes.queries'
import {
  useInventarioFisicoList,
  useInventarioFisico,
  useCrearInventarioFisico,
  useActualizarLineaInventario,
  useCerrarInventarioFisico,
} from '../../queries/inventario-fisico.queries'
import { ModalNuevoInventario } from '../InventarioFisico.jsx'

function LineaConteoCard({ linea, valor, onChange, onBlur }) {
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${linea.ajustado ? 'bg-[#161d28] border-white/6 opacity-60' : 'bg-[#161d28] border-white/8'}`}>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-[#e8edf2] truncate">{linea.producto?.nombre}</div>
        <div className="text-[11px] text-[#5f6f80] font-mono">{linea.producto?.sku}</div>
        <div className="text-[11px] text-[#5f6f80] mt-1">Sistema: <span className="font-mono text-[#9ba8b6]">{linea.stockSistema} {linea.producto?.unidadMedida}</span></div>
      </div>
      <input type="number" min="0" step="0.01"
        aria-label={`Conteo físico de ${linea.producto?.nombre || 'producto'}`}
        disabled={linea.ajustado}
        placeholder="—"
        value={valor ?? ''}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        className="w-24 px-3 py-3 bg-[#1e2835] border border-white/10 rounded-lg text-[16px] text-[#e8edf2] outline-none focus:border-[#00c896] font-mono text-center shrink-0"/>
    </div>
  )
}

function ConteoMobile({ inventarioId, onVolver }) {
  const { toast } = useApp()
  const { data: inv, isLoading } = useInventarioFisico(inventarioId)
  const actualizarLinea = useActualizarLineaInventario()
  const cerrar = useCerrarInventarioFisico()

  const [localStock, setLocalStock] = useState({})

  useEffect(() => {
    if (!inv?.lineas) return
    const init = {}
    inv.lineas.forEach(l => {
      init[l.productoId] = l.stockFisico !== null && l.stockFisico !== undefined ? String(l.stockFisico) : ''
    })
    setLocalStock(init)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventarioId])

  async function handleBlur(productoId) {
    const val = localStock[productoId]
    if (val === '' || val === undefined) return
    const res = await actualizarLinea.mutateAsync({ inventarioId, productoId, stockFisico: Number(val) })
    if (res?.error) toast(res.error, 'error')
  }

  async function handleCerrar() {
    const pendientes = (inv?.lineas || []).filter(l => localStock[l.productoId] === '' || localStock[l.productoId] === undefined)
    if (pendientes.length > 0) {
      toast(`Faltan ${pendientes.length} producto(s) sin contar.`, 'warning')
      return
    }
    const res = await cerrar.mutateAsync(inventarioId)
    if (res?.error) { toast(res.error, 'error'); return }
    toast(`Inventario ${inv.numero} cerrado. Ajustes aplicados.`, 'success')
    onVolver()
  }

  if (isLoading) return <div className="text-center text-[#5f6f80] py-16 text-[13px]">Cargando inventario...</div>
  if (!inv) return <div className="text-center text-red-400 py-16 text-[13px]">Error al cargar inventario</div>

  const lineas = inv.lineas || []
  const pendientes = lineas.filter(l => localStock[l.productoId] === '' || localStock[l.productoId] === undefined).length

  return (
    <div className="flex flex-col gap-3">
      <button onClick={onVolver} className="flex items-center gap-1 text-[13px] text-[#9ba8b6] hover:text-[#e8edf2] w-fit py-1">
        <ChevronLeft size={16}/> Volver
      </button>

      <div>
        <div className="text-[14px] font-semibold text-[#e8edf2]">{inv.numero}</div>
        <div className="text-[12px] text-[#5f6f80]">{lineas.length} productos · {pendientes} pendientes de conteo</div>
      </div>

      <div className="flex flex-col gap-2">
        {lineas.map(l => (
          <LineaConteoCard key={l.productoId} linea={l}
            valor={localStock[l.productoId]}
            onChange={v => setLocalStock(prev => ({ ...prev, [l.productoId]: v }))}
            onBlur={() => handleBlur(l.productoId)}/>
        ))}
      </div>

      {inv.estado === 'EN_CURSO' && (
        <Btn variant="primary" disabled={cerrar.isPending} onClick={handleCerrar}
          className="!py-4 !text-[15px] w-full justify-center mt-1">
          {cerrar.isPending ? 'Cerrando...' : pendientes > 0 ? `Faltan ${pendientes} por contar` : 'Cerrar inventario'}
        </Btn>
      )}
      {inv.estado === 'CERRADO' && (
        <div className="text-center text-[12px] text-green-400 py-2">Inventario cerrado — ajustes aplicados.</div>
      )}
    </div>
  )
}

export default function InventarioFisicoTab() {
  const { toast } = useApp()
  const { data: inventarios = [], isLoading } = useInventarioFisicoList()
  const { data: categorias = [] } = useCategoriasList()
  const { data: almacenes = [] } = useAlmacenesList()
  const crearInventario = useCrearInventarioFisico()

  const [activeId, setActiveId] = useState(null)
  const [modal, setModal] = useState(false)

  async function handleCrear(filtros) {
    const res = await crearInventario.mutateAsync(filtros)
    if (res?.error) { toast(res.error, 'error'); return }
    setModal(false)
    setActiveId(res.data?.id)
    toast(`Inventario ${res.data?.numero} iniciado con ${res.data?.lineas?.length || 0} productos`, 'success')
  }

  if (activeId) {
    return <ConteoMobile inventarioId={activeId} onVolver={() => setActiveId(null)}/>
  }

  const enCurso = inventarios.filter(i => i.estado === 'EN_CURSO')

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide">
          {enCurso.length} conteo{enCurso.length !== 1 ? 's' : ''} en curso
        </div>
        <Btn variant="primary" size="sm" onClick={() => setModal(true)}><Plus size={13}/> Nuevo conteo</Btn>
      </div>

      {isLoading && <div className="text-center text-[#5f6f80] py-8 text-[12px]">Cargando...</div>}

      {!isLoading && enCurso.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <ClipboardList size={40} className="text-[#5f6f80] opacity-40"/>
          <div className="text-[13px] text-[#5f6f80]">No hay conteos en curso.</div>
        </div>
      )}

      {!isLoading && enCurso.length > 0 && (
        <div className="flex flex-col gap-2">
          {enCurso.map(inv => (
            <button key={inv.id} onClick={() => setActiveId(inv.id)}
              className="flex items-center gap-3 bg-[#1a2230] rounded-xl px-4 py-4 border border-white/8 text-left active:bg-white/5">
              <ClipboardList size={18} className="text-amber-400 shrink-0"/>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-[#e8edf2]">{inv.numero}</div>
                <div className="text-[11px] text-[#5f6f80]">{inv.almacen?.nombre || '—'} · {inv._count?.lineas ?? inv.lineas?.length ?? 0} productos</div>
              </div>
              <Badge variant="warning"><CheckCircle size={9}/> En curso</Badge>
            </button>
          ))}
        </div>
      )}

      <ModalNuevoInventario
        open={modal} onClose={() => setModal(false)} onCrear={handleCrear}
        almacenes={almacenes} categorias={categorias} saving={crearInventario.isPending}/>
    </div>
  )
}
