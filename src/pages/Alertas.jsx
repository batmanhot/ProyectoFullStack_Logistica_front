import { useMemo, useState, useEffect } from 'react'
import {
  Bell, CheckCheck, AlertTriangle, Clock, TrendingDown,
  ShoppingCart, Package, Filter, CheckCircle, X
} from 'lucide-react'
import { useApp } from '../store/AppContext'
import { formatDate, diasParaVencer, estadoStock } from '../utils/helpers'
import { Badge, Btn } from '../components/ui/index'
import { useNavigate } from 'react-router-dom'
import * as storage from '../services/storage'

const TIPOS = {
  stock_agotado:   { label: 'Agotado',        color: 'danger',  icon: Package,      path: '/inventario' },
  stock_critico:   { label: 'Stock crítico',   color: 'danger',  icon: AlertTriangle,path: '/inventario' },
  vencimiento:     { label: 'Vencimiento',     color: 'warning', icon: Clock,        path: '/vencimientos'},
  reorden:         { label: 'Punto reorden',   color: 'warning', icon: TrendingDown, path: '/reorden'    },
  oc_pendiente:    { label: 'OC pendiente',    color: 'info',    icon: ShoppingCart, path: '/ordenes'    },
}

function generarAlertas(productos, ordenes, config) {
  const alertas = []
  const diasAlerta = config?.diasAlertaVencimiento || 30

  productos.forEach(p => {
    const e = estadoStock(p.stockActual, p.stockMinimo)
    if (p.stockActual <= 0) {
      alertas.push({ tipo:'stock_agotado', productoId:p.id, titulo:`${p.nombre} — Sin stock`, detalle:`SKU: ${p.sku}`, prioridad:1, fecha:new Date().toISOString().split('T')[0] })
    } else if (e.estado === 'critico') {
      alertas.push({ tipo:'stock_critico', productoId:p.id, titulo:`${p.nombre} — Stock crítico`, detalle:`Actual: ${p.stockActual} ${p.unidadMedida} / Mínimo: ${p.stockMinimo}`, prioridad:1, fecha:new Date().toISOString().split('T')[0] })
    } else if (e.estado === 'bajo') {
      alertas.push({ tipo:'reorden', productoId:p.id, titulo:`${p.nombre} — Stock bajo`, detalle:`Actual: ${p.stockActual} ${p.unidadMedida} / Mínimo: ${p.stockMinimo}`, prioridad:2, fecha:new Date().toISOString().split('T')[0] })
    }

    if (p.tieneVencimiento && p.fechaVencimiento) {
      const dias = diasParaVencer(p.fechaVencimiento)
      if (dias !== null && dias < 0) {
        alertas.push({ tipo:'vencimiento', productoId:p.id, titulo:`${p.nombre} — VENCIDO`, detalle:`Venció hace ${Math.abs(dias)} días (${formatDate(p.fechaVencimiento)})`, prioridad:1, fecha:p.fechaVencimiento })
      } else if (dias !== null && dias <= diasAlerta) {
        alertas.push({ tipo:'vencimiento', productoId:p.id, titulo:`${p.nombre} — Próximo a vencer`, detalle:`Vence en ${dias} días (${formatDate(p.fechaVencimiento)})`, prioridad: dias <= 15 ? 1 : 2, fecha:p.fechaVencimiento })
      }
    }
  })

  ordenes.filter(o => o.estado === 'PENDIENTE').forEach(o => {
    alertas.push({ tipo:'oc_pendiente', titulo:`OC ${o.numero} — Pendiente de aprobación`, detalle:`Total: ${o.total}`, prioridad:3, fecha:o.fecha })
  })

  return alertas.sort((a, b) => a.prioridad - b.prioridad)
}

export default function Alertas() {
  const { productos, ordenes, config } = useApp()
  const nav = useNavigate()
  const [filtroTipo, setFiltroTipo] = useState('all')
  const [leidas, setLeidas]         = useState(() => {
    try { return JSON.parse(localStorage.getItem('sp_alertas_leidas') || '[]') } catch { return [] }
  })

  const alertas = useMemo(() => generarAlertas(productos, ordenes, config), [productos, ordenes, config])

  const filtered = useMemo(() =>
    filtroTipo === 'all' ? alertas : alertas.filter(a => a.tipo === filtroTipo)
  , [alertas, filtroTipo])

  const noLeidas = alertas.filter(a => !leidas.includes(a.titulo)).length

  function marcarLeida(titulo) {
    const nuevas = [...new Set([...leidas, titulo])]
    setLeidas(nuevas)
    localStorage.setItem('sp_alertas_leidas', JSON.stringify(nuevas))
  }

  function marcarTodas() {
    const nuevas = alertas.map(a => a.titulo)
    setLeidas(nuevas)
    localStorage.setItem('sp_alertas_leidas', JSON.stringify(nuevas))
  }

  const conteos = useMemo(() => {
    const c = { all: alertas.length }
    Object.keys(TIPOS).forEach(t => { c[t] = alertas.filter(a => a.tipo === t).length })
    return c
  }, [alertas])

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* Header con resumen */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          ['Todas', 'all', '#ef4444', noLeidas],
          ...Object.entries(TIPOS).map(([k, v]) => [v.label, k, '#f59e0b', conteos[k]]),
        ].map(([label, key, _, count]) => {
          const meta = key === 'all' ? null : TIPOS[key]
          const Icon = meta?.icon || Bell
          return (
            <button key={key} onClick={() => setFiltroTipo(key)}
              className={`relative text-left p-4 rounded-xl border transition-all overflow-hidden ${
                filtroTipo === key
                  ? 'bg-[#00c896]/10 border-[#00c896]/40'
                  : 'bg-[#161d28] border-white/[0.08] hover:border-white/[0.16]'
              }`}>
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl" style={{
                background: filtroTipo === key ? '#00c896' : 'transparent'
              }}/>
              <div className="flex items-center justify-between mb-1">
                <Icon size={14} className={filtroTipo === key ? 'text-[#00c896]' : 'text-[#5f6f80]'}/>
                {count > 0 && (
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                    key === 'all' || key === 'stock_agotado' || key === 'vencimiento'
                      ? 'bg-red-500/15 text-red-400'
                      : 'bg-amber-500/15 text-amber-400'
                  }`}>{count}</span>
                )}
              </div>
              <div className={`text-[22px] font-semibold ${filtroTipo === key ? 'text-[#e8edf2]' : 'text-[#9ba8b6]'}`}>{count}</div>
              <div className="text-[11px] text-[#5f6f80] mt-0.5 leading-tight">{label}</div>
            </button>
          )
        })}
      </div>

      <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
              Centro de Alertas
            </span>
            {noLeidas > 0 && (
              <span className="text-[11px] bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full font-semibold">
                {noLeidas} no leídas
              </span>
            )}
          </div>
          {noLeidas > 0 && (
            <Btn variant="ghost" size="sm" onClick={marcarTodas}>
              <CheckCheck size={13}/> Marcar todas leídas
            </Btn>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <CheckCircle size={48} className="text-green-400 opacity-40"/>
            <div className="text-center">
              <p className="text-[14px] font-medium text-[#9ba8b6] mb-1">Sin alertas activas</p>
              <p className="text-[12px] text-[#5f6f80]">Todo el inventario está en orden.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((alerta, i) => {
              const meta    = TIPOS[alerta.tipo]
              const Icon    = meta?.icon || Bell
              const esLeida = leidas.includes(alerta.titulo)
              return (
                <div key={i}
                  className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer group ${
                    esLeida
                      ? 'bg-transparent border-white/[0.04] opacity-50'
                      : alerta.prioridad === 1
                        ? 'bg-red-500/[0.04] border-red-500/20 hover:border-red-500/35'
                        : alerta.prioridad === 2
                          ? 'bg-amber-500/[0.04] border-amber-500/20 hover:border-amber-500/35'
                          : 'bg-blue-500/[0.03] border-blue-500/15 hover:border-blue-500/25'
                  }`}
                  onClick={() => nav(meta?.path || '/')}>

                  {/* Icono */}
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    alerta.prioridad === 1 ? 'bg-red-500/15' :
                    alerta.prioridad === 2 ? 'bg-amber-500/15' : 'bg-blue-500/15'
                  }`}>
                    <Icon size={16} className={
                      alerta.prioridad === 1 ? 'text-red-400' :
                      alerta.prioridad === 2 ? 'text-amber-400' : 'text-blue-400'
                    }/>
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <div className="font-medium text-[#e8edf2] text-[13px] leading-snug">{alerta.titulo}</div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!esLeida && (
                          <div className={`w-2 h-2 rounded-full shrink-0 ${
                            alerta.prioridad === 1 ? 'bg-red-400' :
                            alerta.prioridad === 2 ? 'bg-amber-400' : 'bg-blue-400'
                          }`}/>
                        )}
                        <Badge variant={meta?.color || 'neutral'}>{meta?.label || alerta.tipo}</Badge>
                      </div>
                    </div>
                    <div className="text-[12px] text-[#9ba8b6]">{alerta.detalle}</div>
                    {alerta.fecha && (
                      <div className="text-[11px] text-[#5f6f80] mt-1">{formatDate(alerta.fecha)}</div>
                    )}
                  </div>

                  {/* Acción marcar leída */}
                  <button
                    onClick={e => { e.stopPropagation(); marcarLeida(alerta.titulo) }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white/10 text-[#5f6f80] hover:text-[#e8edf2] transition-all shrink-0"
                    title="Marcar como leída">
                    <X size={13}/>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
