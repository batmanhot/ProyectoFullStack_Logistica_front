import { useState, useMemo } from 'react'
import { Package, Printer, CheckCircle, Search, Box, Filter } from 'lucide-react'
import JsBarcode from 'jsbarcode'
import { formatDate } from '../utils/helpers'
import { useApp } from '../store/AppContext'
import { EmptyState, Badge, Btn, Modal, Field, Alert } from '../components/ui/index'
import { useClientesList } from '../queries/clientes.queries'
import { useProductosList } from '../queries/productos.queries'
import { useEmpaquesList, useUpsertEmpaque } from '../queries/empaques.queries'

const SI  = 'w-full px-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit] placeholder-[#5f6f80]'
const SEL = SI + ' pr-8'

const TIPOS_CAJA = [
  { id:'c1', label:'Caja XS',   dim:'20×15×10 cm',   pesoMax:2   },
  { id:'c2', label:'Caja S',    dim:'30×20×15 cm',   pesoMax:5   },
  { id:'c3', label:'Caja M',    dim:'40×30×20 cm',   pesoMax:10  },
  { id:'c4', label:'Caja L',    dim:'50×40×30 cm',   pesoMax:20  },
  { id:'c5', label:'Caja XL',   dim:'60×50×40 cm',   pesoMax:30  },
  { id:'c6', label:'Pallet',    dim:'120×80×150 cm', pesoMax:300 },
  { id:'c7', label:'Bolsa',     dim:'40×30×0 cm',    pesoMax:3   },
  { id:'c8', label:'Sobre',     dim:'25×18×0 cm',    pesoMax:0.5 },
]

const ESTADOS_ACTIVOS = ['PEDIDO','APROBADO','PICKING','LISTO','DESPACHADO']

const ESTADO_COLOR = {
  PEDIDO:     'neutral',
  APROBADO:   'info',
  PICKING:    'warning',
  LISTO:      'teal',
  DESPACHADO: 'info',
  ENTREGADO:  'success',
  CANCELADO:  'danger',
}

export default function Empaque() {
  const { toast } = useApp()

  const { data: apiDespachos = [] } = useEmpaquesList()
  const { data: clientes     = [] } = useClientesList({ incluirInactivos: true })
  const { data: productos    = [] } = useProductosList()
  const upsertEmpaque               = useUpsertEmpaque()

  const [modal,   setModal]   = useState(null)
  const [busq,    setBusq]    = useState('')
  const [filtEst, setFiltEst] = useState('')
  const [filtEmp, setFiltEmp] = useState('')

  // Despachos activos ya vienen del endpoint /empaques con empaque embebido
  const despActivos = useMemo(() =>
    apiDespachos
      .filter(d => ESTADOS_ACTIVOS.includes(d.estado))
      .sort((a, b) => {
        const orden = { PICKING:0, LISTO:1, APROBADO:2, PEDIDO:3, DESPACHADO:4 }
        return (orden[a.estado] ?? 9) - (orden[b.estado] ?? 9)
      })
  , [apiDespachos])

  const filtered = useMemo(() => {
    let d = despActivos
    if (busq) {
      const q = busq.toLowerCase()
      d = d.filter(x =>
        x.numero?.toLowerCase().includes(q) ||
        clientes.find(c=>c.id===x.clienteId)?.razonSocial?.toLowerCase().includes(q)
      )
    }
    if (filtEst) d = d.filter(x => x.estado === filtEst)
    if (filtEmp) d = d.filter(x => x.empaqueEstado === filtEmp)
    return d
  }, [despActivos, busq, filtEst, filtEmp, clientes])

  const kpis = useMemo(() => ({
    sinEmpaque: despActivos.filter(d => d.empaqueEstado === 'sin').length,
    pendiente:  despActivos.filter(d => d.empaqueEstado === 'pendiente').length,
    confirmado: despActivos.filter(d => d.empaqueEstado === 'confirmado').length,
    total:      despActivos.length,
  }), [despActivos])

  async function guardarEmpaque(despachoId, data) {
    const res = await upsertEmpaque.mutateAsync({ despachoId, ...data })
    if (res.error) { toast(res.error, 'error'); return }
    setModal(null)
    toast(data.confirmar ? 'Empaque confirmado' : 'Empaque guardado', 'success')
  }

  function generarBarcodeSVG(valor) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    JsBarcode(svg, valor, {
      format: 'CODE128',
      displayValue: true,
      fontSize: 14,
      height: 45,
      margin: 4,
      background: '#ffffff',
      lineColor: '#111111',
    })
    return svg.outerHTML
  }

  function imprimirEtiqueta(des, emp) {
    const cli  = clientes.find(c=>c.id===des.clienteId)
    const caja = TIPOS_CAJA.find(c=>c.id===emp.tipoCajaId) || {}
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;padding:20px;background:#fff}
  .label{border:3px solid #111;border-radius:10px;padding:18px;max-width:420px}
  .title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#888;margin-bottom:4px}
  .big{font-size:26px;font-weight:900;color:#111;letter-spacing:-0.5px;margin-bottom:12px}
  .sep{border-top:2px dashed #ccc;margin:12px 0}
  .row{display:flex;justify-content:space-between;margin-bottom:6px}
  .label-k{font-size:11px;color:#888;font-weight:600;text-transform:uppercase}
  .label-v{font-size:13px;font-weight:700;color:#111}
  .barcode{text-align:center;margin:12px 0}
  .barcode svg{max-width:100%}
  .footer{font-size:10px;color:#aaa;text-align:center;margin-top:8px}
  ${emp.fragil ? '.fragil{background:#fff3cd;border:2px solid #f59e0b;border-radius:6px;padding:8px 12px;margin:10px 0;font-weight:900;font-size:14px;color:#b45309;text-align:center}' : ''}
</style></head><body>
<div class="label">
  <div class="title">Etiqueta de Despacho — StockPro</div>
  <div class="big">${des.numero}</div>
  ${emp.fragil ? '<div class="fragil">⚠️ FRÁGIL — MANEJAR CON CUIDADO</div>' : ''}
  <div class="sep"/>
  <div class="row"><span class="label-k">Cliente</span><span class="label-v">${cli?.razonSocial||'—'}</span></div>
  <div class="row"><span class="label-k">Dirección</span><span class="label-v" style="max-width:250px;text-align:right;font-size:11px">${des.direccionEntrega||cli?.direccion||'—'}</span></div>
  <div class="row"><span class="label-k">Contacto</span><span class="label-v">${cli?.contacto||'—'} · ${cli?.telefono||'—'}</span></div>
  <div class="sep"/>
  <div class="row"><span class="label-k">Tipo empaque</span><span class="label-v">${caja.label||'—'}</span></div>
  <div class="row"><span class="label-k">Dimensiones</span><span class="label-v">${caja.dim||'—'}</span></div>
  <div class="row"><span class="label-k">Bultos</span><span class="label-v">${emp.bultos||1} bulto${(emp.bultos||1)>1?'s':''}</span></div>
  <div class="row"><span class="label-k">Peso total</span><span class="label-v">${emp.pesoTotal||'—'} kg</span></div>
  ${emp.instrucciones ? `<div class="sep"/><div style="font-size:11px;color:#555"><b>Instrucciones:</b> ${emp.instrucciones}</div>` : ''}
  <div class="sep"/>
  <div class="barcode">${generarBarcodeSVG(des.numero)}</div>
  <div class="footer">Generado por StockPro · ${new Date().toLocaleDateString('es-PE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
</div>
<script>window.onload=()=>window.print()</script>
</body></html>`
    const w = window.open('','_blank','width=500,height=650')
    if (w) { w.document.write(html); w.document.close() }
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          { label:'Sin empaque',       val:kpis.sinEmpaque, color:'#ef4444', onClick:()=>setFiltEmp('sin')        },
          { label:'Empaque pendiente', val:kpis.pendiente,  color:'#f59e0b', onClick:()=>setFiltEmp('pendiente')  },
          { label:'Empaque confirmado',val:kpis.confirmado, color:'#00c896', onClick:()=>setFiltEmp('confirmado') },
          { label:'Despachos activos', val:kpis.total,      color:'#3b82f6', onClick:()=>setFiltEmp('')           },
        ].map(({ label, val, color, onClick }) => (
          <div key={label} onClick={onClick}
            className="relative bg-[#161d28] border border-white/8 rounded-xl px-5 py-4 overflow-hidden cursor-pointer hover:border-white/14 transition-all">
            <div className="absolute top-0 left-0 right-0 h-0.75 rounded-t-xl" style={{ background: color }}/>
            <div className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.07em] mb-2">{label}</div>
            <div className="text-[28px] font-semibold" style={{ color }}>{val}</div>
          </div>
        ))}
      </div>

      {kpis.sinEmpaque > 0 && (
        <Alert variant="warning">
          <strong>{kpis.sinEmpaque} despacho{kpis.sinEmpaque>1?'s':''} activo{kpis.sinEmpaque>1?'s':''} sin empaque registrado.</strong>{' '}
          Haz clic en "Registrar empaque" para completar el packing antes del despacho.
        </Alert>
      )}

      {/* Tabla principal */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Despachos activos</span>
            <span className="ml-2 text-[#3d4f60] text-[11px]">({filtered.length} de {despActivos.length})</span>
          </div>
          <div className="text-[11px] text-[#5f6f80] flex items-center gap-1.5">
            <Filter size={11}/> Clic en un KPI para filtrar
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <input className={SI+' pl-7'} placeholder="Buscar número o cliente..."
              value={busq} onChange={e=>setBusq(e.target.value)}/>
          </div>
          <select className={SEL} style={{width:160}} value={filtEst} onChange={e=>setFiltEst(e.target.value)}>
            <option value="">Estado despacho</option>
            {ESTADOS_ACTIVOS.map(e=><option key={e} value={e}>{e}</option>)}
          </select>
          <select className={SEL} style={{width:160}} value={filtEmp} onChange={e=>setFiltEmp(e.target.value)}>
            <option value="">Estado empaque</option>
            <option value="sin">Sin empaque</option>
            <option value="pendiente">Pendiente</option>
            <option value="confirmado">Confirmado</option>
          </select>
          {(busq||filtEst||filtEmp) && (
            <Btn variant="ghost" size="sm" onClick={()=>{setBusq('');setFiltEst('');setFiltEmp('')}}>Limpiar</Btn>
          )}
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={Box} title="Sin despachos activos"
            description="No hay despachos en los estados PEDIDO, APROBADO, PICKING, LISTO o DESPACHADO."/>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map(des => {
              const cli       = clientes.find(c=>c.id===des.clienteId)
              const emp       = des.empaque
              const caja      = emp ? TIPOS_CAJA.find(c=>c.id===emp.tipoCajaId) : null
              const empEstado = des.empaqueEstado || 'sin'
              const EMP_BADGE = {
                sin:        { label:'Sin empaque',   color:'danger'  },
                pendiente:  { label:'Pend. empaque', color:'warning' },
                confirmado: { label:'Empaque OK',    color:'success' },
              }
              return (
                <div key={des.id} className={`bg-[#1a2230] border rounded-xl p-4 transition-all ${
                  empEstado==='confirmado' ? 'border-[#00c896]/20' :
                  empEstado==='pendiente'  ? 'border-amber-500/20' :
                  'border-red-500/15'
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-mono text-[12px] text-[#00c896] font-bold">{des.numero}</div>
                      <div className="text-[13px] font-medium text-[#e8edf2] mt-0.5 leading-tight">
                        {cli?.razonSocial?.slice(0,28) || '—'}
                      </div>
                      <div className="text-[11px] text-[#5f6f80] mt-0.5">
                        {des.items?.length||0} ítem{(des.items?.length||0)!==1?'s':''} ·{' '}
                        {des.items?.reduce((s,i)=>s+i.cantidad,0)||0} unidades
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge variant={ESTADO_COLOR[des.estado]||'neutral'}>{des.estado}</Badge>
                      <Badge variant={EMP_BADGE[empEstado].color}>{EMP_BADGE[empEstado].label}</Badge>
                    </div>
                  </div>

                  {emp && (
                    <div className={`flex items-center gap-2 mb-3 px-2.5 py-2 rounded-lg border ${
                      emp.estado==='CONFIRMADO'
                        ? 'bg-[#00c896]/8 border-[#00c896]/20 text-[#00c896]'
                        : 'bg-amber-500/8 border-amber-500/20 text-amber-400'
                    }`}>
                      <Package size={12}/>
                      <span className="text-[11px] font-medium">
                        {caja?.label||'—'} · {emp.bultos||1} bulto{(emp.bultos||1)>1?'s':''} · {emp.pesoTotal||'—'} kg
                      </span>
                      {emp.fragil && <span className="text-[10px] ml-auto">⚠️ Frágil</span>}
                    </div>
                  )}

                  {des.fechaEntrega && (
                    <div className="text-[11px] text-[#5f6f80] mb-3">
                      Entrega: <span className="text-[#9ba8b6]">{formatDate(des.fechaEntrega)}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Btn variant={emp ? 'ghost' : 'primary'} size="sm" onClick={() => setModal(des)}>
                      <Package size={12}/>
                      {emp ? 'Editar empaque' : 'Registrar empaque'}
                    </Btn>
                    {emp && (
                      <Btn variant="ghost" size="sm" onClick={() => imprimirEtiqueta(des, emp)}>
                        <Printer size={12}/> Etiqueta
                      </Btn>
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
          ¿Cómo funciona el módulo de empaque?
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {[
            ['1. Despacho activo',   'Este módulo muestra todos los despachos que están en curso: PEDIDO, APROBADO, PICKING, LISTO o DESPACHADO.'],
            ['2. Registrar empaque', 'Haz clic en "Registrar empaque" en cualquier despacho. Elige el tipo de caja, número de bultos y peso total.'],
            ['3. Confirmar packing', 'Usa "Confirmar empaque" para marcar el packing como finalizado. Eso actualiza el badge a "Empaque OK".'],
            ['4. Imprimir etiqueta', 'Una vez confirmado, el botón "Etiqueta" genera e imprime la etiqueta de envío con todos los datos del destinatario.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
              <div className="text-[11px] font-semibold text-[#e8edf2] mb-1.5">{t}</div>
              <div className="text-[11px] text-[#5f6f80] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <ModalEmpaque
          despacho={modal}
          productos={productos}
          empaque={modal.empaque || null}
          tiposCaja={TIPOS_CAJA}
          onClose={() => setModal(null)}
          onSave={(data) => guardarEmpaque(modal.id, data)}
        />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════
// MODAL EMPAQUE
// ════════════════════════════════════════════════════════
function ModalEmpaque({ despacho, productos, empaque, tiposCaja, onClose, onSave }) {
  const init = {
    tipoCajaId:    empaque?.tipoCajaId    || 'c3',
    bultos:        empaque?.bultos        || 1,
    pesoTotal:     empaque?.pesoTotal     || '',
    instrucciones: empaque?.instrucciones || '',
    fragil:        empaque?.fragil        || false,
  }
  const [form, setForm] = useState(init)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const cajaSelected = tiposCaja.find(c => c.id === form.tipoCajaId)

  return (
    <Modal open title={`Empaque — ${despacho.numero}`} onClose={onClose} size="md"
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="ghost" onClick={() => onSave({ ...form, confirmar:false })}>
          Guardar borrador
        </Btn>
        <Btn variant="primary" onClick={() => onSave({ ...form, confirmar:true })}>
          <CheckCircle size={13}/> Confirmar empaque
        </Btn>
      </>}>

      <div className="grid grid-cols-2 gap-2 mb-1">
        {[
          ['N° Despacho', despacho.numero],
          ['Estado',      despacho.estado],
          ['Ítems',       `${despacho.items?.length||0} líneas · ${despacho.items?.reduce((s,i)=>s+i.cantidad,0)||0} unidades`],
          ['F. Entrega',  despacho.fechaEntrega ? formatDate(despacho.fechaEntrega) : '—'],
        ].map(([k,v]) => (
          <div key={k} className="bg-[#1a2230] rounded-lg px-3 py-2">
            <div className="text-[10px] text-[#5f6f80] mb-0.5">{k}</div>
            <div className="text-[12px] font-medium text-[#e8edf2]">{v}</div>
          </div>
        ))}
      </div>

      <Field label="Tipo de caja / empaque">
        <select className={SEL} value={form.tipoCajaId} onChange={e=>f('tipoCajaId',e.target.value)}>
          {tiposCaja.map(c=>(
            <option key={c.id} value={c.id}>{c.label} — {c.dim} (máx {c.pesoMax} kg)</option>
          ))}
        </select>
      </Field>
      {cajaSelected && (
        <div className="flex gap-4 text-[11px] text-[#5f6f80] -mt-2">
          <span>Dim: <span className="text-[#9ba8b6]">{cajaSelected.dim}</span></span>
          <span>Peso máx: <span className="text-[#9ba8b6]">{cajaSelected.pesoMax} kg</span></span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3.5">
        <Field label="N° de bultos">
          <input type="number" className={SI} value={form.bultos}
            onChange={e=>f('bultos',Math.max(1,+e.target.value))} min="1"/>
        </Field>
        <Field label="Peso total (kg)">
          <input type="number" className={SI} value={form.pesoTotal}
            onChange={e=>f('pesoTotal', e.target.value ? +e.target.value : '')} min="0" step="0.1" placeholder="0.0"/>
        </Field>
      </div>

      <Field label="Instrucciones especiales">
        <input className={SI} value={form.instrucciones}
          onChange={e=>f('instrucciones',e.target.value)}
          placeholder="Ej: No apilar, mantener frío, frágil arriba..."/>
      </Field>

      <label className="flex items-center gap-2.5 cursor-pointer px-3.5 py-3 bg-[#1a2230] rounded-xl border border-white/8 hover:border-white/12 transition-colors">
        <input type="checkbox" checked={form.fragil} onChange={e=>f('fragil',e.target.checked)} className="accent-[#f59e0b] w-4 h-4"/>
        <div>
          <div className="text-[13px] font-medium text-[#e8edf2]">⚠️ Mercadería frágil</div>
          <div className="text-[11px] text-[#5f6f80]">Se imprimirá la advertencia en la etiqueta de envío</div>
        </div>
      </label>

      <div className="bg-[#1a2230] rounded-lg p-3">
        <div className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-wide mb-2">Contenido del despacho</div>
        <div className="flex flex-col divide-y divide-white/4">
          {(despacho.items||[]).map((item, i) => {
            const p = productos.find(x=>x.id===item.productoId)
            return (
              <div key={i} className="flex justify-between text-[11px] py-1.5 first:pt-0">
                <span className="text-[#9ba8b6]">{p?.nombre||item.productoId}</span>
                <span className="text-[#e8edf2] font-mono">{item.cantidad} {p?.unidadMedida||''}</span>
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
