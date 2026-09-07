import { useState } from 'react'
import { ChevronLeft, MapPin, CheckCircle, Package } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { Badge, Btn } from '../../components/ui/index'
import { useMarcarListo } from '../../queries/despachos.queries'
import { usePickingByDespacho, useConfirmarLineaPicking } from '../../queries/picking.queries'

function LineaPickingCard({ linea, onConfirmar, confirmando }) {
  const lineaCompleta = linea.estado === 'COMPLETA'
  const [cantidad, setCantidad] = useState(Number(linea.cantidadRequerida))

  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-3 ${lineaCompleta ? 'bg-[#161d28] border-white/6 opacity-60' : 'bg-[#161d28] border-white/8'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-[#e8edf2] truncate">{linea.producto?.nombre}</div>
          <div className="text-[11px] text-[#5f6f80] font-mono">{linea.producto?.sku}</div>
        </div>
        <Badge variant={lineaCompleta ? 'success' : linea.estado === 'PARCIAL' ? 'warning' : 'neutral'}>
          {lineaCompleta && <CheckCircle size={9}/>} {linea.estado}
        </Badge>
      </div>

      <div className="text-[12px] text-[#9ba8b6]">
        {linea.ubicacion
          ? <span className="inline-flex items-center gap-1"><MapPin size={12}/> {linea.ubicacion.codigo} <span className="text-[11px] text-[#5f6f80]">({linea.ubicacion.zona})</span></span>
          : <span className="text-[#5f6f80]">Sin ubicar (stock general)</span>}
      </div>

      <div className="text-[12px] text-[#5f6f80]">
        Requerido: <span className="font-mono text-[#e8edf2]">{Number(linea.cantidadRequerida)} {linea.producto?.unidadMedida}</span>
      </div>

      {!lineaCompleta && (
        <div className="flex items-center gap-2">
          <input type="number" min="0" max={Number(linea.cantidadRequerida)} step="0.01"
            aria-label={`Cantidad pickeada de ${linea.producto?.nombre || 'producto'}`}
            className="flex-1 px-3 py-3 bg-[#1e2835] border border-white/10 rounded-lg text-[16px] text-[#e8edf2] outline-none focus:border-[#00c896] font-mono text-center"
            value={cantidad}
            onChange={e => setCantidad(e.target.value === '' ? '' : +e.target.value)}/>
          <Btn variant="primary" disabled={confirmando} onClick={() => onConfirmar(cantidad)}
            className="!py-3.5 !px-5 !text-[14px]">
            Confirmar
          </Btn>
        </div>
      )}
    </div>
  )
}

function PickingDetalle({ despacho, onVolver }) {
  const { toast } = useApp()
  const { data: lista, isLoading } = usePickingByDespacho(despacho.id)
  const confirmarLinea = useConfirmarLineaPicking()
  const marcarListo = useMarcarListo()

  const completa = lista?.estado === 'COMPLETADA'

  async function confirmar(linea, cantidad) {
    const res = await confirmarLinea.mutateAsync({ despachoId: despacho.id, lineaId: linea.id, cantidad })
    if (res.error) toast(res.error, 'error')
  }

  async function handleMarcarListo() {
    const res = await marcarListo.mutateAsync(despacho.id)
    if (res.error) { toast(res.error, 'error'); return }
    toast(`${despacho.numero} listo para despachar`, 'success')
    onVolver()
  }

  return (
    <div className="flex flex-col gap-3">
      <button onClick={onVolver} className="flex items-center gap-1 text-[13px] text-[#9ba8b6] hover:text-[#e8edf2] w-fit py-1">
        <ChevronLeft size={16}/> Volver
      </button>

      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-[12px] text-[#00c896] font-bold">{despacho.numero}</div>
          <div className="text-[13px] text-[#9ba8b6]">{despacho.cliente?.razonSocial?.slice(0, 30) || '—'}</div>
        </div>
      </div>

      {isLoading && <div className="text-center text-[#5f6f80] py-6 text-[12px]">Cargando lista de picking...</div>}

      {lista && (
        <>
          <div className="flex flex-col gap-2">
            {lista.lineas.map(linea => (
              <LineaPickingCard key={linea.id} linea={linea}
                confirmando={confirmarLinea.isPending}
                onConfirmar={cantidad => confirmar(linea, cantidad)}/>
            ))}
          </div>

          <Btn variant="primary" disabled={!completa || marcarListo.isPending} onClick={handleMarcarListo}
            className="!py-4 !text-[15px] w-full justify-center mt-1">
            <Package size={15}/> {marcarListo.isPending ? 'Guardando...' : completa ? 'Marcar Listo para despachar' : 'Completa todas las líneas para continuar'}
          </Btn>
        </>
      )}
    </div>
  )
}

export default function PickingTab({ despachos }) {
  const [activo, setActivo] = useState(null)
  const enPicking = despachos.filter(d => d.estado === 'PICKING')

  if (activo) {
    return <PickingDetalle despacho={activo} onVolver={() => setActivo(null)}/>
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide">
        {enPicking.length} despacho{enPicking.length !== 1 ? 's' : ''} en picking
      </div>

      {enPicking.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <CheckCircle size={40} className="text-green-400 opacity-40"/>
          <div className="text-[13px] text-[#5f6f80]">No hay despachos esperando picking.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {enPicking.map(d => (
            <button key={d.id} onClick={() => setActivo(d)}
              className="flex items-center gap-3 bg-[#1a2230] rounded-xl px-4 py-4 border border-white/8 text-left active:bg-white/5">
              <Package size={18} className="text-[#f59e0b] shrink-0"/>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[12px] text-[#00c896] font-bold">{d.numero}</div>
                <div className="text-[13px] text-[#e8edf2] truncate">{d.cliente?.razonSocial?.slice(0, 30) || '—'}</div>
              </div>
              <Badge variant="warning">PICKING</Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
