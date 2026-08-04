import { useState, useEffect } from 'react'
import { Plus, ClipboardList, CheckCircle, SlidersHorizontal, Download, FileText } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatCurrency, formatDate } from '../utils/helpers'
import { Modal, EmptyState, Badge, Btn, Field, Alert, Select, Textarea, DataTable } from '../components/ui/index'
import { useCategoriasList } from '../queries/categorias.queries'
import { useAlmacenesList } from '../queries/almacenes.queries'
import {
  useInventarioFisicoList,
  useInventarioFisico,
  useCrearInventarioFisico,
  useActualizarLineaInventario,
  useCerrarInventarioFisico,
} from '../queries/inventario-fisico.queries'
import { exportarInventarioFisicoXLSX } from '../utils/exportXLSX'
import { exportarInventarioFisicoPDF } from '../utils/exportPDF'

export default function InventarioFisico() {
  const { toast } = useApp()
  const simboloMoneda = 'S/'

  const { data: inventarios = [], isLoading } = useInventarioFisicoList()
  const { data: categorias  = [] }            = useCategoriasList()
  const { data: almacenes   = [] }            = useAlmacenesList()
  const crearInventario = useCrearInventarioFisico()

  const [activeId, setActiveId] = useState(null)
  const [modal,    setModal]    = useState(false)

  async function handleCrear(filtros) {
    const res = await crearInventario.mutateAsync(filtros)
    if (res?.error) { toast(res.error, 'error'); return }
    setModal(false)
    setActiveId(res.data?.id)
    toast(`Inventario ${res.data?.numero} iniciado con ${res.data?.lineas?.length || 0} productos`, 'success')
  }

  const almNombre = id => almacenes.find(a => a.id === id)?.nombre || '—'

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      {!activeId && (
        <>
          <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Inventarios Físicos Realizados</span>
              <Btn variant="primary" size="sm" onClick={() => setModal(true)}><Plus size={13}/> Nuevo Inventario</Btn>
            </div>
            {isLoading && <div className="text-center text-[#5f6f80] py-8 text-[12px]">Cargando inventarios...</div>}
            {!isLoading && inventarios.length === 0 && (
              <EmptyState icon={ClipboardList} title="Sin inventarios realizados" description="Inicia el primer conteo físico para validar tu stock."/>
            )}
            {!isLoading && inventarios.length > 0 && (
              <div className="flex flex-col gap-2">
                {inventarios.map(inv => {
                  const totalLineas = inv._count?.lineas ?? inv.lineas?.length ?? 0
                  return (
                    <div key={inv.id} onClick={() => setActiveId(inv.id)}
                      className="flex items-center justify-between p-4 bg-[#1a2230] border border-white/6 rounded-xl hover:border-white/12 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${inv.estado === 'CERRADO' ? 'bg-green-500/15' : 'bg-amber-500/15'}`}>
                          {inv.estado === 'CERRADO' ? <CheckCircle size={16} className="text-green-400"/> : <ClipboardList size={16} className="text-amber-400"/>}
                        </div>
                        <div>
                          <div className="font-semibold text-[#e8edf2]">{inv.numero}</div>
                          <div className="text-[11px] text-[#5f6f80]">
                            {formatDate(inv.fecha || inv.createdAt)} · {inv.almacen?.nombre || almNombre(inv.almacenId)} · {totalLineas} productos
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 items-center" onClick={e => e.stopPropagation()}>
                        <Badge variant={inv.estado === 'CERRADO' ? 'success' : 'warning'}>
                          {inv.estado === 'CERRADO' ? 'Cerrado' : 'En curso'}
                        </Badge>
                        {inv.estado === 'EN_CURSO' && (
                          <Btn variant="primary" size="sm" onClick={() => setActiveId(inv.id)}>Continuar</Btn>
                        )}
                        {inv.estado === 'CERRADO' && (
                          <Btn variant="ghost" size="sm" onClick={() => setActiveId(inv.id)}>Ver</Btn>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Guía de uso */}
          <div className="bg-[#161d28] border border-white/6 rounded-xl p-5">
            <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
              ¿Cómo funciona el módulo de Inventario Físico?
            </div>
            <p className="text-[12px] text-[#9ba8b6] leading-relaxed mb-3">
              El <strong className="text-[#e8edf2]">Inventario Físico o Conteo Cíclico</strong> es el proceso de
              contar manualmente las existencias reales en el almacén y compararlas contra lo que
              tiene registrado el sistema. Es obligatorio para detectar diferencias por
              robos, errores de registro, mermas o daños no reportados.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
              {[
                ['1. Iniciar conteo',     'Selecciona el almacén y categoría. El sistema genera una hoja con el stock actual registrado.'],
                ['2. Ingresar físico',    'El almacenero cuenta físicamente cada producto e ingresa la cantidad real contada.'],
                ['3. Ver diferencias',    'El sistema calcula automáticamente sobrantes (+) y faltantes (−) con su valor monetario estimado.'],
                ['4. Cerrar inventario',  'Al cerrar se registran todos los ajustes al inventario, actualizando el stock con trazabilidad completa.'],
              ].map(([t, d]) => (
                <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
                  <div className="text-[11px] font-semibold text-[#e8edf2] mb-1.5">{t}</div>
                  <div className="text-[11px] text-[#5f6f80] leading-relaxed">{d}</div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[#5f6f80] leading-relaxed mt-3">
              <strong className="text-[#9ba8b6]">Nota:</strong> Se debe ingresar el conteo de TODOS los productos antes de poder cerrar el inventario.
            </p>
          </div>
        </>
      )}

      {activeId && (
        <ConteoCiclico
          inventarioId={activeId}
          simboloMoneda={simboloMoneda}
          onVolver={() => setActiveId(null)}
        />
      )}

      <ModalNuevoInventario
        open={modal} onClose={() => setModal(false)} onCrear={handleCrear}
        almacenes={almacenes} categorias={categorias} saving={crearInventario.isPending}/>
    </div>
  )
}

// ── Conteo cíclico (vista de detalle) ────────────────────────
function ConteoCiclico({ inventarioId, simboloMoneda, onVolver }) {
  const { toast, sesion } = useApp()

  const { data: inv, isLoading } = useInventarioFisico(inventarioId)
  const actualizarLinea = useActualizarLineaInventario()
  const cerrar          = useCerrarInventarioFisico()

  // localStock: source of truth para los inputs (productoId → string)
  const [localStock, setLocalStock] = useState({})

  useEffect(() => {
    if (!inv?.lineas) return
    const init = {}
    inv.lineas.forEach(l => {
      init[l.productoId] = l.stockFisico !== null && l.stockFisico !== undefined
        ? String(l.stockFisico)
        : ''
    })
    setLocalStock(init)
  }, [inventarioId]) // solo reinicializar al cambiar de inventario

  async function handleBlur(productoId) {
    const val = localStock[productoId]
    if (val === '' || val === undefined) return
    const res = await actualizarLinea.mutateAsync({
      inventarioId,
      productoId,
      stockFisico: Number(val),
    })
    if (res?.error) toast(res.error, 'error')
  }

  async function handleCerrar() {
    const pendientes = (inv?.lineas || []).filter(l => {
      const valLocal = localStock[l.productoId]
      return valLocal === '' || valLocal === undefined
    })
    if (pendientes.length > 0) {
      toast(`Faltan ${pendientes.length} producto(s) sin contar. Ingresa el conteo de todos antes de cerrar.`, 'warning')
      return
    }
    const res = await cerrar.mutateAsync(inventarioId)
    if (res?.error) { toast(res.error, 'error'); return }
    toast(`Inventario ${inv.numero} cerrado. Ajustes aplicados.`, 'success')
    onVolver()
  }

  if (isLoading) {
    return <div className="text-center text-[#5f6f80] py-16 text-[13px]">Cargando inventario...</div>
  }
  if (!inv) {
    return <div className="text-center text-red-400 py-16 text-[13px]">Error al cargar inventario</div>
  }

  const lineas         = inv.lineas || []
  const pendientes     = lineas.filter(l => {
    const v = localStock[l.productoId]
    return v === '' || v === undefined
  }).length
  const diferencias    = lineas.filter(l => l.diferencia !== null && l.diferencia !== undefined && Number(l.diferencia) !== 0)
  const valDiferencias = diferencias.reduce((s, l) => s + Math.abs(Number(l.diferencia) * Number(l.costoUnitario || 0)), 0)
  const contados       = lineas.length - pendientes

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-semibold text-[#e8edf2]">Conteo: {inv.numero}</h2>
          <p className="text-[12px] text-[#5f6f80] mt-0.5">{lineas.length} productos · {pendientes} pendientes de conteo</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="ghost" size="sm" onClick={onVolver}>← Volver</Btn>
          <Btn variant="secondary" size="sm" onClick={() => exportarInventarioFisicoXLSX(lineas, inv, simboloMoneda)}><Download size={13}/> Excel</Btn>
          <Btn variant="secondary" size="sm" onClick={() => exportarInventarioFisicoPDF(lineas, inv, simboloMoneda, sesion?.nombre)}><FileText size={13}/> PDF</Btn>
          {inv.estado === 'EN_CURSO' && (
            <Btn variant="primary" size="sm" onClick={handleCerrar} disabled={cerrar.isPending}>
              <SlidersHorizontal size={13}/> {cerrar.isPending ? 'Cerrando...' : `Cerrar inventario`}
            </Btn>
          )}
        </div>
      </div>

      {inv.estado === 'EN_CURSO' && pendientes > 0 && (
        <Alert variant="info">Ingresa el conteo físico en la columna "Contado". Debes completar todos los productos antes de cerrar.</Alert>
      )}
      {inv.estado === 'CERRADO' && (
        <Alert variant="success">Inventario cerrado. Se aplicaron todos los ajustes al stock.</Alert>
      )}

      <div className="grid grid-cols-4 gap-3">
        {[
          ['Productos',         lineas.length,                                           '#00c896'],
          ['Contados',          contados,                                                '#3b82f6'],
          ['Con diferencia',    diferencias.length, diferencias.length > 0 ? '#f59e0b' : '#22c55e'],
          ['Valor diferencias', formatCurrency(valDiferencias, simboloMoneda),           '#ef4444'],
        ].map(([l, v, c]) => (
          <div key={l} className="relative bg-[#161d28] border border-white/8 rounded-xl px-4 py-3 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl" style={{ background: c }}/>
            <div className="text-[10px] text-[#5f6f80] uppercase tracking-wide mb-1">{l}</div>
            <div className={`font-semibold text-[#e8edf2] ${typeof v === 'number' ? 'text-[20px]' : 'text-[14px] font-mono'}`}>{v}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <DataTable
          rows={lineas}
          rowKey={l => l.productoId}
          emptyIcon={ClipboardList}
          emptyTitle="Sin productos"
          emptyDescription="Este inventario no tiene productos en su hoja de conteo."
          rowClassName={l => {
            const dif = l.diferencia !== null && l.diferencia !== undefined ? Number(l.diferencia) : null
            return l.ajustado ? 'opacity-50' : dif !== null && dif < 0 ? 'bg-red-500/3' : dif !== null && dif > 0 ? 'bg-green-500/3' : ''
          }}
          columns={[
            { key:'sku', header:'SKU', render: l => <span className="font-mono text-[12px] text-[#00c896]">{l.producto?.sku}</span> },
            { key:'producto', header:'Producto', render: l => <span className="font-medium text-[#e8edf2] max-w-45 truncate block">{l.producto?.nombre}</span> },
            { key:'um', header:'U.M.', render: l => <span className="text-[#9ba8b6]">{l.producto?.unidadMedida}</span> },
            { key:'sistema', header:'Sistema', render: l => <span className="font-mono text-[12px] font-semibold">{l.stockSistema}</span> },
            { key:'contado', header:'Contado', render: l => (
              inv.estado === 'CERRADO' ? (
                <span className="font-mono text-[12px]">{l.stockFisico ?? '—'}</span>
              ) : (
                <input type="number" min="0" step="0.01"
                  value={localStock[l.productoId] ?? ''}
                  placeholder="—"
                  disabled={l.ajustado}
                  onChange={e => setLocalStock(prev => ({ ...prev, [l.productoId]: e.target.value }))}
                  onBlur={() => handleBlur(l.productoId)}
                  className="w-24 px-2 py-1 bg-[#1e2835] border border-white/8 rounded-lg text-[12px] text-[#e8edf2] outline-none focus:border-[#00c896] font-mono"
                />
              )
            ) },
            { key:'diferencia', header:'Diferencia', render: l => {
              const dif = l.diferencia !== null && l.diferencia !== undefined ? Number(l.diferencia) : null
              return (
                <span className="font-mono text-[12px]">
                  {dif === null ? <span className="text-[#5f6f80]">—</span> :
                   dif === 0   ? <span className="text-green-400">0</span> :
                   dif > 0     ? <span className="text-green-400 font-semibold">+{dif}</span> :
                                 <span className="text-red-400 font-semibold">{dif}</span>}
                </span>
              )
            } },
            { key:'valorDif', header:'Valor Dif.', render: l => {
              const dif = l.diferencia !== null && l.diferencia !== undefined ? Number(l.diferencia) : null
              return (
                <span className="font-mono text-[12px]">
                  {dif !== null && dif !== 0
                    ? <span className={dif > 0 ? 'text-green-400' : 'text-red-400'}>
                        {dif > 0 ? '+' : ''}{formatCurrency(Math.abs(dif * Number(l.costoUnitario || 0)), simboloMoneda)}
                      </span>
                    : <span className="text-[#5f6f80]">—</span>
                  }
                </span>
              )
            } },
            { key:'estado', header:'Estado', render: l => {
              const dif       = l.diferencia !== null && l.diferencia !== undefined ? Number(l.diferencia) : null
              const sinConteo = localStock[l.productoId] === '' || localStock[l.productoId] === undefined
              return l.ajustado    ? <Badge variant="success"><CheckCircle size={9}/> Ajustado</Badge>
                   : sinConteo   ? <Badge variant="neutral">Pendiente</Badge>
                   : dif === 0   ? <Badge variant="success">OK</Badge>
                                 : <Badge variant="warning">Diferencia</Badge>
            } },
          ]}
        />
      </div>
    </div>
  )
}

// ── Modal Nuevo Inventario ───────────────────────────────────
function ModalNuevoInventario({ open, onClose, onCrear, almacenes, categorias, saving }) {
  const [form, setForm] = useState({ almacenId: '', categoriaId: '', notas: '' })
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (open) setForm({ almacenId: almacenes[0]?.id || '', categoriaId: '', notas: '' })
  }, [open, almacenes])

  return (
    <Modal open={open} onClose={onClose} title="Nuevo Inventario Físico" size="sm"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" disabled={!form.almacenId || saving}
          onClick={() => onCrear(form)}>
          {saving ? 'Iniciando...' : 'Iniciar Conteo'}
        </Btn>
      </>}>
      <Alert variant="info">Se generará una hoja de conteo con el stock actual del almacén seleccionado. Ingresa el conteo físico para detectar diferencias.</Alert>
      <Field label="Almacén *" hint="Obligatorio — el conteo es por almacén específico">
        <Select value={form.almacenId} onChange={e => f('almacenId', e.target.value)}>
          <option value="">Seleccionar almacén...</option>
          {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </Select>
      </Field>
      <Field label="Categoría (opcional)" hint="Dejar vacío para todas las categorías">
        <Select value={form.categoriaId} onChange={e => f('categoriaId', e.target.value)}>
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </Select>
      </Field>
      <Field label="Notas">
        <Textarea className="min-h-14" value={form.notas}
          onChange={e => f('notas', e.target.value)} placeholder="Responsable, observaciones..."/>
      </Field>
    </Modal>
  )
}
