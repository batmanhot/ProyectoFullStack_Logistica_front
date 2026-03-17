import { useState, useMemo } from 'react'
import { Plus, ClipboardList, CheckCircle, SlidersHorizontal, Download } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate, fechaHoy, generarNumDoc } from '../utils/helpers'
import { calcularPMP } from '../utils/valorizacion'
import * as storage from '../services/storage'
import { Modal, EmptyState, Badge, Btn, Field, Alert } from '../components/ui/index'

const SEL = 'px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] pr-8'

export default function InventarioFisico() {
  const { productos, almacenes, categorias, sesion, recargarProductos, recargarMovimientos, recargarAjustes, toast, simboloMoneda } = useApp()
  const [inventarios, setInventarios] = useState(() => storage.getInventariosFisicos().data || [])
  const [modal, setModal]     = useState(false)
  const [activo, setActivo]   = useState(null) // inventario en curso

  const recargar = () => setInventarios(storage.getInventariosFisicos().data || [])

  function crearInventario(filtros) {
    const prodsFiltrados = productos.filter(p => {
      if (p.activo === false) return false
      if (filtros.almacenId && p.almacenId !== filtros.almacenId) return false
      if (filtros.categoriaId && p.categoriaId !== filtros.categoriaId) return false
      return true
    })

    const lineas = prodsFiltrados.map(p => ({
      productoId:     p.id,
      sku:            p.sku,
      nombre:         p.nombre,
      unidadMedida:   p.unidadMedida,
      stockSistema:   p.stockActual,
      stockFisico:    null,
      diferencia:     null,
      costoUnitario:  calcularPMP(p.batches || []),
      ajustado:       false,
    }))

    const inv = {
      numero:      generarNumDoc('INV', '001'),
      estado:      'EN_CURSO',
      fecha:       fechaHoy(),
      almacenId:   filtros.almacenId || null,
      categoriaId: filtros.categoriaId || null,
      lineas,
      usuarioId:   sesion?.id || 'usr1',
      notas:       filtros.notas || '',
    }
    storage.saveInventarioFisico(inv)
    recargar()
    setActivo(inv)
    setModal(false)
    toast(`Inventario ${inv.numero} iniciado con ${lineas.length} productos`, 'success')
  }

  function actualizarFisico(numero, productoId, valor) {
    const inv = inventarios.find(i => i.numero === numero) || activo
    if (!inv) return
    const lineas = inv.lineas.map(l => {
      if (l.productoId !== productoId) return l
      const fisico = valor === '' ? null : +valor
      return { ...l, stockFisico: fisico, diferencia: fisico !== null ? fisico - l.stockSistema : null }
    })
    const actualizado = { ...inv, lineas }
    storage.saveInventarioFisico(actualizado)
    setActivo(actualizado)
    setInventarios(prev => prev.map(i => i.numero === numero ? actualizado : i))
  }

  function aplicarAjustes(inv) {
    let aplicados = 0
    const lineas = inv.lineas.map(l => {
      if (l.stockFisico === null || l.diferencia === 0 || l.ajustado) return l
      const prod = storage.getProductoById(l.productoId).data
      if (!prod) return l

      const cantidad = Math.abs(l.diferencia)
      const tipo     = l.diferencia > 0 ? 'POSITIVO' : 'NEGATIVO'
      const doc      = `INV-${inv.numero}`

      if (tipo === 'POSITIVO') {
        const batch = { id: Date.now().toString(36) + l.productoId, cantidad, costo: l.costoUnitario, fecha: inv.fecha, lote: doc }
        storage._actualizarBatchesProducto(prod.id, [...(prod.batches||[]), batch], prod.stockActual + cantidad)
      } else {
        const factor = prod.stockActual > 0 ? (prod.stockActual - cantidad) / prod.stockActual : 0
        const nuevosBatches = (prod.batches||[]).map(b => ({ ...b, cantidad: b.cantidad * factor })).filter(b => b.cantidad > 0.001)
        storage._actualizarBatchesProducto(prod.id, nuevosBatches, Math.max(0, prod.stockActual - cantidad))
      }

      storage.registrarMovimiento({
        tipo: 'AJUSTE', productoId: l.productoId, almacenId: inv.almacenId || prod.almacenId,
        cantidad, costoUnitario: l.costoUnitario, costoTotal: +(l.costoUnitario * cantidad).toFixed(2),
        fecha: inv.fecha, lote: '', motivo: `[INVENTARIO FÍSICO ${inv.numero}] ${tipo === 'POSITIVO' ? 'Sobrante' : 'Faltante'}`,
        documento: doc, notas: '', usuarioId: sesion?.id || 'usr1',
      })
      storage.registrarAjuste({ productoId: l.productoId, almacenId: inv.almacenId || prod.almacenId, tipo, cantidad, motivo: `Inventario físico ${inv.numero}`, documento: doc, fecha: inv.fecha, costoUnitario: l.costoUnitario, costoTotal: +(l.costoUnitario * cantidad).toFixed(2), usuarioId: sesion?.id || 'usr1', notas: '' })
      aplicados++
      return { ...l, ajustado: true }
    })

    const cerrado = { ...inv, lineas, estado: 'CERRADO', fechaCierre: fechaHoy() }
    storage.saveInventarioFisico(cerrado)
    recargarProductos(); recargarMovimientos(); recargarAjustes()
    recargar()
    setActivo(cerrado)
    toast(`${aplicados} ajustes aplicados. Inventario ${inv.numero} cerrado.`, 'success')
  }

  function exportarHoja(inv) {
    const rows = [['SKU','Producto','U.M.','Stock Sistema','Stock Físico','Diferencia','Costo Unit.','Valor Diferencia']]
    inv.lineas.forEach(l => rows.push([l.sku, l.nombre, l.unidadMedida, l.stockSistema, l.stockFisico ?? '', l.diferencia ?? '', l.costoUnitario.toFixed(2), l.diferencia !== null ? (l.diferencia * l.costoUnitario).toFixed(2) : '']))
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' }))
    a.download = `conteo_${inv.numero}.csv`; a.click()
  }

  const catNombre = id => categorias.find(c => c.id === id)?.nombre || 'Todas'
  const almNombre = id => almacenes.find(a => a.id === id)?.nombre  || 'Todos'

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* Inventarios anteriores */}
      {!activo && (
        <>
          <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Inventarios Físicos Realizados</span>
              <Btn variant="primary" size="sm" onClick={() => setModal(true)}><Plus size={13}/> Nuevo Inventario</Btn>
            </div>
            {inventarios.length === 0 ? (
              <EmptyState icon={ClipboardList} title="Sin inventarios realizados" description="Inicia el primer conteo físico para validar tu stock."/>
            ) : (
              <div className="flex flex-col gap-2">
                {inventarios.map(inv => {
                  const conDif = inv.lineas?.filter(l => l.diferencia !== null && l.diferencia !== 0).length || 0
                  return (
                    <div key={inv.id} className="flex items-center justify-between p-4 bg-[#1a2230] border border-white/[0.06] rounded-xl hover:border-white/[0.12] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${inv.estado === 'CERRADO' ? 'bg-green-500/15' : 'bg-amber-500/15'}`}>
                          {inv.estado === 'CERRADO' ? <CheckCircle size={16} className="text-green-400"/> : <ClipboardList size={16} className="text-amber-400"/>}
                        </div>
                        <div>
                          <div className="font-semibold text-[#e8edf2]">{inv.numero}</div>
                          <div className="text-[11px] text-[#5f6f80]">
                            {formatDate(inv.fecha)} · {almNombre(inv.almacenId)} · {inv.lineas?.length} productos · {conDif} diferencias
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={inv.estado === 'CERRADO' ? 'success' : 'warning'}>
                          {inv.estado === 'CERRADO' ? 'Cerrado' : 'En curso'}
                        </Badge>
                        {inv.estado === 'EN_CURSO' && (
                          <Btn variant="primary" size="sm" onClick={() => setActivo(inv)}>Continuar</Btn>
                        )}
                        <Btn variant="ghost" size="sm" onClick={() => exportarHoja(inv)}><Download size={13}/></Btn>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Panel explicativo */}
          <div className="bg-[#161d28] border border-[#00c896]/20 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#00c896]/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[#00c896] text-[14px] font-bold">?</span>
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-semibold text-[#e8edf2] mb-2">¿Para qué sirve el Inventario Físico?</div>
                <p className="text-[12px] text-[#9ba8b6] leading-relaxed mb-3">
                  El <strong className="text-[#e8edf2]">Inventario Físico o Conteo Cíclico</strong> es el proceso de
                  contar manualmente las existencias reales en el almacén y compararlas contra lo que
                  tiene registrado el sistema. Es obligatorio para detectar diferencias por
                  robos, errores de registro, mermas o daños no reportados.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
                  {[
                    ['📋 1. Iniciar conteo', 'Genera una hoja con el stock del sistema. Puedes filtrar por almacén o categoría para hacer conteos parciales.'],
                    ['✏️ 2. Ingresar físico', 'El almacenero cuenta físicamente cada producto e ingresa la cantidad real en la columna "Contado".'],
                    ['🔍 3. Ver diferencias', 'El sistema calcula automáticamente sobrantes (+) y faltantes (−) con su valor monetario estimado.'],
                    ['⚡ 4. Aplicar ajustes', 'Con un clic se registran todos los ajustes al inventario, actualizando el stock y dejando trazabilidad completa.'],
                  ].map(([t, d]) => (
                    <div key={t} className="bg-[#1a2230] rounded-lg p-3">
                      <div className="text-[11px] font-semibold text-[#e8edf2] mb-1">{t}</div>
                      <div className="text-[11px] text-[#9ba8b6] leading-snug">{d}</div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-[#5f6f80] leading-relaxed">
                  <strong className="text-[#9ba8b6]">Recomendación:</strong> Realiza conteos cíclicos mensualmente
                  por categoría (no todo el inventario a la vez). Prioriza los productos <strong className="text-[#9ba8b6]">Clase A</strong> del
                  Análisis ABC — los de mayor valor deben contarse con más frecuencia.
                  Exporta la hoja en CSV para trabajarla offline si lo necesitas.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Conteo activo */}
      {activo && (
        <ConteoCiclico inv={activo} simboloMoneda={simboloMoneda} onFisicoChange={actualizarFisico}
          onAplicar={aplicarAjustes} onExportar={exportarHoja}
          onVolver={() => setActivo(null)}/>
      )}

      <ModalNuevoInventario open={modal} onClose={() => setModal(false)} onCrear={crearInventario}
        almacenes={almacenes} categorias={categorias}/>
    </div>
  )
}

function ConteoCiclico({ inv, simboloMoneda, onFisicoChange, onAplicar, onExportar, onVolver }) {
  const diferencias     = inv.lineas.filter(l => l.diferencia !== null && l.diferencia !== 0)
  const pendientes      = inv.lineas.filter(l => l.stockFisico === null).length
  const valDiferencias  = diferencias.reduce((s, l) => s + Math.abs(l.diferencia * l.costoUnitario), 0)
  const { simboloMoneda: sm } = useApp()

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-semibold text-[#e8edf2]">Conteo: {inv.numero}</h2>
          <p className="text-[12px] text-[#5f6f80] mt-0.5">{inv.lineas.length} productos · {pendientes} pendientes de conteo</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="ghost" size="sm" onClick={onVolver}>← Volver</Btn>
          <Btn variant="secondary" size="sm" onClick={() => onExportar(inv)}><Download size={13}/> Exportar</Btn>
          {inv.estado === 'EN_CURSO' && diferencias.length > 0 && (
            <Btn variant="primary" size="sm" onClick={() => onAplicar(inv)}>
              <SlidersHorizontal size={13}/> Aplicar {diferencias.filter(l=>!l.ajustado).length} ajustes
            </Btn>
          )}
        </div>
      </div>

      {inv.estado === 'EN_CURSO' && pendientes > 0 && (
        <Alert variant="info">Ingresa el conteo físico en la columna "Contado". Las diferencias se calcularán automáticamente.</Alert>
      )}
      {inv.estado === 'CERRADO' && (
        <Alert variant="success">Inventario cerrado. Se aplicaron todos los ajustes.</Alert>
      )}

      {/* KPIs rápidos */}
      <div className="grid grid-cols-4 gap-3">
        {[
          ['Productos', inv.lineas.length, '#00c896'],
          ['Contados', inv.lineas.length - pendientes, '#3b82f6'],
          ['Con diferencia', diferencias.length, diferencias.length > 0 ? '#f59e0b' : '#22c55e'],
          ['Valor diferencias', formatCurrency(valDiferencias, sm), '#ef4444'],
        ].map(([l, v, c]) => (
          <div key={l} className="relative bg-[#161d28] border border-white/[0.08] rounded-xl px-4 py-3 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl" style={{ background: c }}/>
            <div className="text-[10px] text-[#5f6f80] uppercase tracking-wide mb-1">{l}</div>
            <div className={`font-semibold text-[#e8edf2] ${typeof v === 'number' ? 'text-[20px]' : 'text-[14px] font-mono'}`}>{v}</div>
          </div>
        ))}
      </div>

      {/* Tabla de conteo */}
      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {['SKU','Producto','U.M.','Sistema','Contado','Diferencia','Valor Dif.','Estado'].map(h => (
                  <th key={h} className="bg-[#1a2230] px-3 py-2.5 text-left text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] border-b border-white/[0.08] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inv.lineas.map(l => {
                const dif = l.diferencia
                const sinConteo = l.stockFisico === null
                return (
                  <tr key={l.productoId} className={`border-b border-white/[0.06] last:border-0 ${
                    l.ajustado ? 'opacity-50' :
                    dif !== null && dif < 0 ? 'bg-red-500/[0.03]' :
                    dif !== null && dif > 0 ? 'bg-green-500/[0.03]' : 'hover:bg-white/[0.02]'
                  }`}>
                    <td className="px-3 py-2.5 font-mono text-[12px] text-[#00c896]">{l.sku}</td>
                    <td className="px-3 py-2.5 font-medium text-[#e8edf2] max-w-[180px] truncate">{l.nombre}</td>
                    <td className="px-3 py-2.5 text-[#9ba8b6]">{l.unidadMedida}</td>
                    <td className="px-3 py-2.5 font-mono text-[12px] font-semibold">{l.stockSistema}</td>
                    <td className="px-3 py-2.5">
                      {inv.estado === 'CERRADO' ? (
                        <span className="font-mono text-[12px]">{l.stockFisico ?? '—'}</span>
                      ) : (
                        <input
                          type="number" min="0" step="0.01"
                          value={l.stockFisico ?? ''}
                          onChange={e => onFisicoChange(inv.numero, l.productoId, e.target.value)}
                          className="w-24 px-2 py-1 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[12px] text-[#e8edf2] outline-none focus:border-[#00c896] font-mono"
                          placeholder="—"
                          disabled={l.ajustado}
                        />
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[12px]">
                      {dif === null ? <span className="text-[#5f6f80]">—</span> :
                       dif === 0    ? <span className="text-green-400">0</span> :
                       dif > 0      ? <span className="text-green-400 font-semibold">+{dif}</span> :
                                      <span className="text-red-400 font-semibold">{dif}</span>
                      }
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[12px]">
                      {dif !== null && dif !== 0
                        ? <span className={dif > 0 ? 'text-green-400' : 'text-red-400'}>
                            {dif > 0 ? '+' : ''}{formatCurrency(Math.abs(dif * l.costoUnitario), simboloMoneda)}
                          </span>
                        : <span className="text-[#5f6f80]">—</span>
                      }
                    </td>
                    <td className="px-3 py-2.5">
                      {l.ajustado
                        ? <Badge variant="success"><CheckCircle size={9}/> Ajustado</Badge>
                        : sinConteo
                          ? <Badge variant="neutral">Pendiente</Badge>
                          : dif === 0
                            ? <Badge variant="success">OK</Badge>
                            : <Badge variant="warning">Diferencia</Badge>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ModalNuevoInventario({ open, onClose, onCrear, almacenes, categorias }) {
  const [form, setForm] = useState({ almacenId: '', categoriaId: '', notas: '' })
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const SI  = 'w-full px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] font-[inherit] placeholder-[#5f6f80]'

  return (
    <Modal open={open} onClose={onClose} title="Nuevo Inventario Físico" size="sm"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn variant="primary" onClick={() => { onCrear(form); setForm({ almacenId:'', categoriaId:'', notas:'' }) }}>Iniciar Conteo</Btn></>}>
      <Alert variant="info">Se generará una hoja de conteo con el stock actual del sistema. Ingresa el conteo físico para detectar diferencias.</Alert>
      <Field label="Almacén (opcional)" hint="Dejar vacío para todos los almacenes">
        <select className={SI + ' pr-8'} value={form.almacenId} onChange={e => f('almacenId', e.target.value)}>
          <option value="">Todos los almacenes</option>
          {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
      </Field>
      <Field label="Categoría (opcional)" hint="Dejar vacío para todas las categorías">
        <select className={SI + ' pr-8'} value={form.categoriaId} onChange={e => f('categoriaId', e.target.value)}>
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </Field>
      <Field label="Notas">
        <textarea className={SI + ' resize-y min-h-[56px]'} value={form.notas} onChange={e => f('notas', e.target.value)} placeholder="Responsable, observaciones..."/>
      </Field>
    </Modal>
  )
}
