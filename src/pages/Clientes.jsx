import { useState, useEffect, useMemo } from 'react'
import {
  Plus, Search, Edit2, Trash2, Users, Eye,
  CheckCircle, DollarSign, Truck, Clock,
  Phone, Mail, MapPin, ArrowLeft,
  RotateCcw, XCircle, Star, X, Download, FileText
} from 'lucide-react'
import { useApp } from '../store/AppContext'
import { usePlanLimits } from '../hooks/usePlanLimits'
import { formatCurrency, formatDate } from '../utils/helpers'
import { Modal, ConfirmDialog, Badge, Btn, Field, Input, Select, Textarea, Alert, DataTable } from '../components/ui/index'
import DireccionInput from '../components/ui/DireccionInput'
import { useNavigate } from 'react-router-dom'
import { useClientesList, useCrearCliente, useActualizarCliente, useEliminarCliente } from '../queries/clientes.queries'
import { useDespachosList } from '../queries/despachos.queries'
import { useListasPreciosList } from '../queries/listas-precios.queries'
import { exportarClientesXLSX } from '../utils/exportXLSX'
import { exportarClientesPDF } from '../utils/exportPDF'

function calcularKPI(clienteId, despachos) {
  const des        = despachos.filter(d => d.clienteId === clienteId)
  const total      = des.length
  const entregados = des.filter(d => d.estado === 'ENTREGADO').length
  const enProceso  = des.filter(d => ['PEDIDO','APROBADO','PICKING','LISTO'].includes(d.estado)).length
  const anulados   = des.filter(d => d.estado === 'CANCELADO').length
  const valorTotal = des.filter(d => d.estado !== 'CANCELADO').reduce((s, d) => s + Number(d.total || d.valorTotal || 0), 0)
  const ultimoDes  = des.length > 0 ? [...des].sort((a, b) => (b.createdAt||'').localeCompare(a.createdAt||''))[0] : null
  const tasaEntrega = total > 0 ? ((entregados / total) * 100).toFixed(1) : null
  return { total, entregados, enProceso, anulados, valorTotal, devs: 0, ultimoDes, tasaEntrega }
}

function clasificarCliente(valorTotal) {
  if (valorTotal >= 50000) return { label:'Premium', color:'#f59e0b', badge:'warning' }
  if (valorTotal >= 20000) return { label:'Activo',  color:'#00c896', badge:'success' }
  if (valorTotal >= 5000)  return { label:'Regular', color:'#3b82f6', badge:'info'    }
  return                          { label:'Nuevo',   color:'#5f6f80', badge:'neutral' }
}

export default function Clientes() {
  const { toast, sesion } = useApp()
  const planLimits = usePlanLimits()
  const nav = useNavigate()
  const simboloMoneda = 'S/'

  const { data: clientesRaw = [], isLoading } = useClientesList({ incluirInactivos: true })
  const { data: despachos   = [] }            = useDespachosList()
  const { data: listasPrecios = [] }          = useListasPreciosList()
  const crearCliente     = useCrearCliente()
  const actualizarCliente = useActualizarCliente()
  const eliminarCliente  = useEliminarCliente()

  const [modal,      setModal]      = useState(false)
  const [editando,   setEditando]   = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [busqueda,   setBusqueda]   = useState('')
  const [filtro,     setFiltro]     = useState('todos')
  const [filtClasif, setFiltClasif] = useState('')
  const [perfilId,   setPerfilId]   = useState(null)

  const clientes = useMemo(() =>
    clientesRaw.map(c => ({ ...c, activo: c.activo === true }))
  , [clientesRaw])

  const enriquecidos = useMemo(() =>
    clientes.map(c => {
      const kpi  = calcularKPI(c.id, despachos)
      const clase = clasificarCliente(kpi.valorTotal)
      return { ...c, kpi, clase }
    })
  , [clientes, despachos])

  const filtered = useMemo(() => {
    let d = enriquecidos
    if (busqueda) {
      const q = busqueda.toLowerCase()
      d = d.filter(c =>
        c.razonSocial?.toLowerCase().includes(q) ||
        c.ruc?.includes(busqueda) ||
        c.contacto?.toLowerCase().includes(q)
      )
    }
    if (filtro === 'activos') d = d.filter(c => c.activo)
    if (filtro === 'premium') d = d.filter(c => c.kpi.valorTotal >= 20000)
    if (filtro === 'riesgo')  d = d.filter(c => c.kpi.tasaEntrega !== null && parseFloat(c.kpi.tasaEntrega) < 80)
    if (filtClasif) d = d.filter(c => c.clase.label === filtClasif)
    return [...d].sort((a, b) => b.kpi.valorTotal - a.kpi.valorTotal)
  }, [enriquecidos, busqueda, filtro, filtClasif])

  const kpis = useMemo(() => ({
    total:     clientes.length,
    activos:   clientes.filter(c => c.activo).length,
    premium:   enriquecidos.filter(c => c.kpi.valorTotal >= 20000).length,
    valorTotal:enriquecidos.reduce((s, c) => s + c.kpi.valorTotal, 0),
    enProceso: enriquecidos.reduce((s, c) => s + c.kpi.enProceso, 0),
  }), [clientes, enriquecidos])

  async function handleSave(form) {
    const payload = {
      razonSocial:    form.razonSocial?.trim(),
      ruc:            form.ruc        || undefined,
      contacto:       form.contacto   || undefined,
      telefono:       form.telefono   || undefined,
      email:          form.email      || undefined,
      direccion:      form.direccion  || undefined,
      condicionPago:  form.condicionPago || undefined,
      limiteCredito:  form.limiteCredito ? +form.limiteCredito : undefined,
      notas:          form.notas      || undefined,
    }
    let res
    if (editando) {
      res = await actualizarCliente.mutateAsync({ id: editando.id, ...payload, activo: form.activo, listaPrecioId: form.listaPrecioId || null })
    } else {
      payload.listaPrecioId = form.listaPrecioId || undefined
      res = await crearCliente.mutateAsync(payload)
    }
    if (res.error) { toast(res.error, 'error'); return }
    setModal(false)
    toast(editando ? 'Cliente actualizado' : 'Cliente creado', 'success')
  }

  async function handleDelete(id) {
    const res = await eliminarCliente.mutateAsync(id)
    if (res.error) { toast(res.error, 'error'); return }
    setConfirmDel(null)
    toast('Cliente eliminado', 'success')
  }

  if (perfilId) {
    const cli = enriquecidos.find(c => c.id === perfilId)
    if (!cli) { setPerfilId(null); return null }
    return (
      <PerfilCliente
        cliente={cli}
        despachos={despachos.filter(d => d.clienteId === perfilId)}
        simboloMoneda={simboloMoneda}
        onVolver={() => setPerfilId(null)}
        onEditar={() => { setEditando(cli); setModal(true); setPerfilId(null) }}
        onNuevoPedido={() => nav('/despachos')}
      />
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {[
          { label:'Total clientes',    val:kpis.total,                                     color:'#00c896', Icon:Users        },
          { label:'Activos',           val:kpis.activos,                                   color:'#22c55e', Icon:CheckCircle  },
          { label:'Premium/Activos',   val:kpis.premium,                                   color:'#f59e0b', Icon:Star         },
          { label:'Valor facturado',   val:formatCurrency(kpis.valorTotal, simboloMoneda), color:'#3b82f6', Icon:DollarSign, mono:true },
          { label:'Pedidos en proceso',val:kpis.enProceso,                                 color:'#8b5cf6', Icon:Truck        },
        ].map(({ label, val, color, Icon, mono }) => (
          <div key={label} className="relative bg-[#161d28] border border-white/8 rounded-xl px-5 py-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{ background: color }}/>
            <div className="absolute top-3 right-4 opacity-[0.06]"><Icon size={40}/></div>
            <div className="flex items-center gap-1.5 mb-2">
              <Icon size={11} style={{ color, opacity:0.8 }}/>
              <span className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.07em]">{label}</span>
            </div>
            <div className={`font-semibold text-[#e8edf2] leading-none ${mono ? 'text-[17px] font-mono' : 'text-[28px]'}`}>{val}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] whitespace-nowrap">Directorio de Clientes</span>
          <div className="flex items-center gap-2">
            <Btn variant="ghost" size="sm" onClick={() => exportarClientesXLSX(filtered)}>
              <Download size={13}/> Excel
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => exportarClientesPDF(filtered, sesion?.nombre)}>
              <FileText size={13}/> PDF
            </Btn>
            {planLimits.clientes.maximo !== -1 && (
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                !planLimits.clientes.permitido ? 'bg-red-500/20 text-red-400' :
                planLimits.clientes.porcentaje >= 80 ? 'bg-amber-500/20 text-amber-400' :
                'bg-white/6 text-[#5f6f80]'
              }`}>
                {planLimits.clientes.actual}/{planLimits.clientes.maximo}
              </span>
            )}
            <Btn variant="primary" size="sm"
              disabled={!planLimits.clientes.permitido}
              title={planLimits.clientes.mensaje || undefined}
              onClick={() => { setEditando(null); setModal(true) }}>
              <Plus size={13}/> Nuevo Cliente
            </Btn>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5f6f80] pointer-events-none"/>
            <Input className="pl-8 !py-[5px] text-[12px]" placeholder="Razón social, RUC, contacto..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
          </div>
          <Select style={{ width:165, padding:'5px 8px', fontSize:12 }} value={filtro} onChange={e => setFiltro(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="activos">Solo activos</option>
            <option value="premium">Premium (S/20k+)</option>
            <option value="riesgo">Bajo rendimiento</option>
          </Select>
          <Select style={{ width:148, padding:'5px 8px', fontSize:12 }} value={filtClasif} onChange={e => setFiltClasif(e.target.value)}>
            <option value="">Clasificación: todas</option>
            <option value="Premium">Premium</option>
            <option value="Activo">Activo</option>
            <option value="Regular">Regular</option>
            <option value="Nuevo">Nuevo</option>
          </Select>
          <span className="text-[11px] text-[#5f6f80] whitespace-nowrap">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
          {(busqueda || filtro !== 'todos' || filtClasif) && (
            <Btn variant="ghost" size="sm" onClick={() => { setBusqueda(''); setFiltro('todos'); setFiltClasif('') }}>
              <X size={12}/> Limpiar
            </Btn>
          )}
        </div>

        <DataTable
          loading={isLoading}
          rows={filtered}
          rowKey={cli => cli.id}
          onRowClick={cli => setPerfilId(cli.id)}
          emptyIcon={Users}
          emptyTitle="Sin clientes"
          emptyDescription="Agrega el primer cliente."
          columns={[
            { key:'razonSocial', header:'Razón Social', render: cli => (
              <>
                <div className="font-medium text-[#e8edf2]">{cli.razonSocial}</div>
                <div className="text-[11px] text-[#5f6f80] font-mono">{cli.ruc || '—'}</div>
              </>
            ) },
            { key:'contacto', header:'Contacto', render: cli => (
              <>
                <div className="text-[12px] text-[#9ba8b6]">{cli.contacto || '—'}</div>
                <div className="text-[11px] text-[#5f6f80]">{cli.telefono || '—'}</div>
              </>
            ) },
            { key:'clase', header:'Clasificación', render: cli => <Badge variant={cli.clase.badge}>{cli.clase.label}</Badge> },
            { key:'despachos', header:'Despachos', align:'right', render: cli => <span className="font-mono text-[#e8edf2]">{cli.kpi.total}</span> },
            { key:'enProceso', header:'En proceso', align:'right', render: cli => (
              cli.kpi.enProceso > 0
                ? <span className="font-mono font-semibold text-amber-400">{cli.kpi.enProceso}</span>
                : <span className="text-[#5f6f80]">—</span>
            ) },
            { key:'valorTotal', header:'Valor total', align:'right', render: cli => <span className="font-mono text-[12px] font-semibold text-[#00c896]">{formatCurrency(cli.kpi.valorTotal, simboloMoneda)}</span> },
            { key:'tasaEntrega', header:'Tasa entrega', align:'right', render: cli => {
              const tasa = cli.kpi.tasaEntrega !== null ? parseFloat(cli.kpi.tasaEntrega) : null
              const tasaColor = tasa === null ? '#5f6f80' : tasa >= 90 ? '#22c55e' : tasa >= 70 ? '#f59e0b' : '#ef4444'
              return tasa !== null
                ? <span className="font-mono font-semibold" style={{ color: tasaColor }}>{tasa}%</span>
                : <span className="text-[#5f6f80]">—</span>
            } },
            { key:'ultimoPedido', header:'Último pedido', render: cli => (
              <span className="text-[12px] text-[#9ba8b6]">{cli.kpi.ultimoDes ? formatDate(cli.kpi.ultimoDes.fecha || cli.kpi.ultimoDes.createdAt?.slice(0,10)) : '—'}</span>
            ) },
            { key:'estado', header:'Estado', render: cli => <Badge variant={cli.activo ? 'success' : 'neutral'}>{cli.activo ? 'Activo' : 'Inactivo'}</Badge> },
            { key:'acciones', header:'Acciones', stopPropagation:true, render: cli => (
              <div className="flex gap-1">
                <Btn variant="ghost" size="icon" title="Ver perfil" onClick={() => setPerfilId(cli.id)}><Eye size={13}/></Btn>
                <Btn variant="ghost" size="icon" title="Editar" onClick={() => { setEditando(cli); setModal(true) }}><Edit2 size={13}/></Btn>
                <Btn variant="ghost" size="icon" title="Eliminar" className="text-red-400 hover:text-red-300" onClick={() => setConfirmDel(cli.id)}><Trash2 size={13}/></Btn>
              </div>
            ) },
          ]}
        />

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-2.5 mt-5 bg-[#1a2230] border border-[#00c896]/15 rounded-xl text-[12px]">
          <div className="flex items-center gap-1.5 text-[#9ba8b6] font-medium shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00c896" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            Clasificación automática:
          </div>
          {[
            { nivel:'Premium', color:'#f59e0b', desc:'S/ 50,000+' },
            { nivel:'Activo',  color:'#22c55e', desc:'S/ 20,000+' },
            { nivel:'Regular', color:'#3b82f6', desc:'S/ 5,000+'  },
            { nivel:'Nuevo',   color:'#5f6f80', desc:'Sin historial' },
          ].map(({ nivel, color, desc }) => (
            <div key={nivel} className="flex items-center gap-1.5 text-[11px] shrink-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }}/>
              <span className="font-semibold" style={{ color }}>{nivel}</span>
              <span className="text-[#5f6f80]">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Guía de uso */}
      <div className="bg-[#161d28] border border-white/6 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">
          ¿Cómo funciona el módulo de Clientes?
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {[
            ['1. Registrar cliente', 'Solo la Razón Social es obligatoria. RUC, contacto, condición de pago y límite de crédito son opcionales pero recomendados para Despachos.'],
            ['2. Clasificación automática', 'El sistema clasifica a cada cliente (Premium/Activo/Regular/Nuevo) según el valor total facturado — ver la leyenda arriba.'],
            ['3. Ver perfil', 'Haz clic en la fila para abrir el perfil completo: volumen mensual, tasa de entrega e historial de despachos.'],
            ['4. Editar o desactivar', 'Un cliente inactivo queda oculto de los selectores de Despachos pero conserva todo su historial.'],
          ].map(([t, d]) => (
            <div key={t} className="bg-[#1a2230] rounded-lg p-3.5 border-l-2 border-[#00c896]/30">
              <div className="text-[11px] font-semibold text-[#e8edf2] mb-1.5">{t}</div>
              <div className="text-[11px] text-[#5f6f80] leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </div>

      <ModalCliente
        open={modal}
        onClose={() => { setModal(false); setEditando(null) }}
        editando={editando}
        listasPrecios={listasPrecios}
        onSave={handleSave}
        saving={crearCliente.isPending || actualizarCliente.isPending}
      />
      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={() => handleDelete(confirmDel)}
        danger title="Eliminar cliente" message="¿Eliminar este cliente? Esta acción no se puede deshacer."/>
    </div>
  )
}

// ── Perfil de Cliente ─────────────────────────────────────────
function PerfilCliente({ cliente, despachos, simboloMoneda, onVolver, onEditar, onNuevoPedido }) {
  const { kpi, clase } = cliente
  const ESTADO_META = {
    PEDIDO:     { label:'Pedido',    color:'neutral' },
    APROBADO:   { label:'Aprobado',  color:'info'    },
    PICKING:    { label:'Picking',   color:'warning' },
    LISTO:      { label:'Listo',     color:'teal'    },
    DESPACHADO: { label:'Despachado',color:'info'    },
    ENTREGADO:  { label:'Entregado', color:'success' },
    CANCELADO:  { label:'Anulado',   color:'danger'  },
  }

  const ultimos = [...despachos].sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||'')).slice(0,10)
  const tasa = kpi.tasaEntrega !== null ? parseFloat(kpi.tasaEntrega) : null
  const tasaColor = tasa === null ? '#5f6f80' : tasa >= 90 ? '#22c55e' : tasa >= 70 ? '#f59e0b' : '#ef4444'

  const volumenMensual = useMemo(() => {
    const meses = []
    const hoy = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
      const clave = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      const label = d.toLocaleDateString('es-PE', { month:'short' }).toUpperCase()
      const desMes = despachos.filter(des => (des.fecha || des.createdAt?.slice(0,10) || '').startsWith(clave) && des.estado !== 'CANCELADO')
      meses.push({ label, total: desMes.length, valor: desMes.reduce((s,des) => s + Number(des.total || des.valorTotal || 0), 0) })
    }
    return meses
  }, [despachos])

  const maxValor = Math.max(...volumenMensual.map(m => m.valor), 1)

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Btn variant="ghost" size="sm" onClick={onVolver}><ArrowLeft size={13}/> Volver</Btn>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[16px] font-black text-white" style={{ background: clase.color }}>
            {cliente.razonSocial.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-[18px] font-bold text-[#e8edf2] leading-tight">{cliente.razonSocial}</div>
            <div className="text-[12px] text-[#5f6f80] flex items-center gap-2 flex-wrap">
              <span className="font-mono">{cliente.ruc || 'Sin RUC'}</span>
              <span>·</span>
              <Badge variant={clase.badge}>{clase.label}</Badge>
              <Badge variant={cliente.activo ? 'success' : 'neutral'}>{cliente.activo ? 'Activo' : 'Inactivo'}</Badge>
              {cliente.condicionPago && cliente.condicionPago !== '0' && (
                <span className="text-[#5f6f80]">· Pago: {cliente.condicionPago} días</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Btn variant="ghost" size="sm" onClick={onEditar}><Edit2 size={13}/> Editar</Btn>
          <Btn variant="primary" size="sm" onClick={onNuevoPedido}><Plus size={13}/> Nuevo Pedido</Btn>
        </div>
      </div>

      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">Información de contacto</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { Icon:Users,  label:'Contacto',  val:cliente.contacto || '—' },
            { Icon:Phone,  label:'Teléfono',  val:cliente.telefono || '—' },
            { Icon:Mail,   label:'Email',     val:cliente.email    || '—' },
            { Icon:MapPin, label:'Dirección', val:cliente.direccion|| '—' },
          ].map(({ Icon, label, val }) => (
            <div key={label} className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#1a2230] flex items-center justify-center shrink-0 mt-0.5"><Icon size={13} className="text-[#5f6f80]"/></div>
              <div>
                <div className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-wide mb-0.5">{label}</div>
                <div className="text-[12px] text-[#e8edf2]">{val}</div>
              </div>
            </div>
          ))}
        </div>
        {cliente.notas && (
          <div className="mt-4 px-3.5 py-2.5 bg-[#1a2230] rounded-lg border-l-2 border-[#00c896]/40 text-[12px] text-[#9ba8b6]">
            <span className="text-[10px] font-bold text-[#5f6f80] uppercase tracking-wide block mb-1">Notas</span>
            {cliente.notas}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label:'Total pedidos',   val:kpi.total,                                     color:'#00c896' },
          { label:'Entregados',      val:kpi.entregados,                                color:'#22c55e' },
          { label:'En proceso',      val:kpi.enProceso,                                 color:'#f59e0b' },
          { label:'Valor total',     val:formatCurrency(kpi.valorTotal, simboloMoneda), color:'#3b82f6', mono:true },
          { label:'Tasa de entrega', val:tasa !== null ? `${tasa}%` : '—',             color:tasaColor },
        ].map(({ label, val, color, mono }) => (
          <div key={label} className="bg-[#1a2230] rounded-xl p-4 text-center">
            <div className="text-[10px] font-semibold text-[#5f6f80] uppercase tracking-wide mb-2">{label}</div>
            <div className={`font-bold leading-none ${mono ? 'text-[13px] font-mono' : 'text-[22px]'}`} style={{ color }}>{val}</div>
          </div>
        ))}
      </div>

      {tasa !== null && tasa < 80 && (
        <Alert variant="warning"><strong>Tasa de entrega baja ({tasa}%).</strong> Más del 20% de pedidos sin completar correctamente.</Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">Volumen — últimos 6 meses</div>
          <div className="flex items-end gap-2" style={{ height:90 }}>
            {volumenMensual.map((m, i) => {
              const pct = m.valor / maxValor
              const isLast = i === volumenMensual.length - 1
              return (
                <div key={m.label} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  {m.valor > 0 && <div className="text-[9px] text-[#5f6f80]">{m.total}</div>}
                  <div className="w-full rounded-t-sm" style={{
                    height: m.valor > 0 ? `${Math.max(pct * 70, 8)}px` : '4px',
                    background: isLast ? '#00c896' : m.valor > 0 ? 'rgba(0,200,150,0.3)' : 'rgba(255,255,255,0.05)',
                  }}/>
                  <div className="text-[9px]" style={{ color: isLast ? '#00c896' : '#3d4f60' }}>{m.label}</div>
                </div>
              )
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-white/6 flex justify-between text-[11px]">
            <span className="text-[#5f6f80]">Total acumulado</span>
            <span className="font-semibold text-[#00c896] font-mono">{formatCurrency(kpi.valorTotal, simboloMoneda)}</span>
          </div>
        </div>

        <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">Distribución de pedidos</div>
          <div className="flex flex-col gap-2.5">
            {[
              { label:'Entregados', val:kpi.entregados, color:'#22c55e', Icon:CheckCircle },
              { label:'En proceso', val:kpi.enProceso,  color:'#f59e0b', Icon:Clock       },
              { label:'Anulados',   val:kpi.anulados,   color:'#ef4444', Icon:XCircle     },
              { label:'Devoluciones',val:0,             color:'#8b5cf6', Icon:RotateCcw   },
            ].map(({ label, val, color, Icon }) => {
              const base = Math.max(kpi.total, 1)
              return (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2"><Icon size={11} style={{ color }}/><span className="text-[12px] text-[#9ba8b6]">{label}</span></div>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold" style={{ color }}>{val}</span>
                      <span className="text-[10px] text-[#5f6f80]">{((val/base)*100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-[#0e1117] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width:`${(val/base)*100}%`, background:color }}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">
          Historial de despachos <span className="ml-2 text-[#3d4f60]">({ultimos.length} más recientes)</span>
        </div>
        {ultimos.length === 0 ? (
          <EmptyState icon={Truck} title="Sin despachos" description="Este cliente aún no tiene pedidos registrados."/>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/8">
            <table className="w-full border-collapse text-[12px]">
              <thead><tr>
                {['N° Despacho','Fecha','F. Entrega','Ítems','Total','Estado','Guía'].map((h, i) => (
                  <th key={h} className={`bg-[#1a2230] px-3.5 py-2.5 text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] whitespace-nowrap border-b border-white/8 ${[3,4].includes(i) ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {ultimos.map(des => {
                  const meta = ESTADO_META[des.estado] || ESTADO_META.PEDIDO
                  return (
                    <tr key={des.id} className="border-b border-white/6 last:border-0 hover:bg-white/2">
                      <td className="px-3.5 py-2.5 font-mono text-[12px] font-semibold text-[#00c896]">{des.numero}</td>
                      <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#9ba8b6]">{formatDate(des.fecha)}</td>
                      <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#9ba8b6]">{des.fechaEntrega ? formatDate(des.fechaEntrega) : '—'}</td>
                      <td className="px-3.5 py-2.5 text-right text-[#9ba8b6]">{des.items?.length || des._count?.items || 0}</td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-semibold text-[#e8edf2]">{formatCurrency(Number(des.total || des.valorTotal || 0), simboloMoneda)}</td>
                      <td className="px-3.5 py-2.5"><Badge variant={meta.color}>{meta.label}</Badge></td>
                      <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#5f6f80]">{des.guiaNumero || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Modal Crear/Editar Cliente ────────────────────────────────
function ModalCliente({ open, onClose, editando, listasPrecios = [], onSave, saving }) {
  const init = { razonSocial:'', ruc:'', contacto:'', telefono:'', email:'', direccion:'', condicionPago:'30', limiteCredito:'', notas:'', activo:true, listaPrecioId:'' }
  const [form, setForm] = useState(init)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  useEffect(() => {
    if (!open) return
    setForm(editando ? {
      ...init, ...editando,
      ruc:           editando.ruc           || '',
      contacto:      editando.contacto      || '',
      telefono:      editando.telefono      || '',
      email:         editando.email         || '',
      direccion:     editando.direccion     || '',
      notas:         editando.notas         || '',
      limiteCredito: editando.limiteCredito ?? '',
      activo:        editando.activo === true,
      listaPrecioId: editando.listaPrecioId || '',
    } : init)
  }, [editando, open]) // eslint-disable-line
  return (
    <Modal open={open} onClose={onClose} title={editando ? 'Editar Cliente' : 'Nuevo Cliente'} size="lg"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancelar</Btn><Btn variant="primary" disabled={!form.razonSocial.trim() || saving} onClick={() => onSave(form)}>{saving ? 'Guardando...' : 'Guardar'}</Btn></>}>
      <div className="grid grid-cols-2 gap-3.5">
        <div className="col-span-2"><Field label="Razón Social *"><Input value={form.razonSocial} onChange={e => f('razonSocial', e.target.value)} placeholder="Empresa XYZ S.A.C."/></Field></div>
        <Field label="RUC / DNI"><Input value={form.ruc} onChange={e => f('ruc', e.target.value)} placeholder="20123456789" maxLength={11}/></Field>
        <Field label="Persona de Contacto"><Input value={form.contacto} onChange={e => f('contacto', e.target.value)} placeholder="Nombre del contacto"/></Field>
        <Field label="Teléfono"><Input value={form.telefono} onChange={e => f('telefono', e.target.value)} placeholder="01-2345678"/></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="contacto@empresa.pe"/></Field>
        <Field label="Condición de Pago">
          <Select value={form.condicionPago} onChange={e => f('condicionPago', e.target.value)}>
            {[['0','Contado'],['15','15 días'],['30','30 días'],['45','45 días'],['60','60 días'],['90','90 días']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Límite de Crédito (S/)"><Input type="number" value={form.limiteCredito} onChange={e => f('limiteCredito', e.target.value)} placeholder="Sin límite" min="0"/></Field>
        <Field label="Lista de precios" hint="Si el cliente tiene una lista asignada, sus precios se sugieren automáticamente al armar una Proforma.">
          <Select value={form.listaPrecioId} onChange={e => f('listaPrecioId', e.target.value)}>
            <option value="">Sin lista asignada (usa el precio de catálogo)</option>
            {listasPrecios.filter(l => l.activa !== false).map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
          </Select>
        </Field>
      </div>
      <DireccionInput label="Dirección de entrega principal" value={form.direccion} onChange={v => f('direccion', v)} placeholder="Av. Principal 123, Distrito, Lima"/>
      <Field label="Notas internas"><Textarea className="min-h-14" value={form.notas} onChange={e => f('notas', e.target.value)} placeholder="Instrucciones especiales, condiciones, observaciones..."/></Field>
      <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[#9ba8b6] mt-4 mb-2">
        <input type="checkbox" checked={!!form.activo} onChange={e => f('activo', e.target.checked)} className="accent-[#00c896]"/>
        Cliente activo
      </label>
    </Modal>
  )
}
