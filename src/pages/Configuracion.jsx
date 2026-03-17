import { useState, useEffect } from 'react'
import { Save, RefreshCw, Building2, Settings, Bell, DollarSign, Database } from 'lucide-react'
import { useApp } from '../store/AppContext'
import { FORMULAS_VALORIZACION } from '../utils/valorizacion'
import * as storage from '../services/storage'
import { ConfirmDialog, Toggle, Btn, Field, Badge } from '../components/ui/index'

const TABS = [
  ['empresa',      'Empresa',      Building2],
  ['sistema',      'Sistema',      Settings],
  ['valorizacion', 'Valorización', DollarSign],
  ['alertas',      'Alertas',      Bell],
  ['datos',        'Datos / Reset',Database],
]

const MONEDAS = [
  { code: 'PEN', simbolo: 'S/',  nombre: 'Sol peruano' },
  { code: 'USD', simbolo: '$',   nombre: 'Dólar americano' },
  { code: 'EUR', simbolo: '€',   nombre: 'Euro' },
]

const SI = 'px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 w-full font-[inherit] placeholder-[#5f6f80]'
const SEL = SI + ' pr-8'

export default function Configuracion() {
  const { config, saveConfig, toast } = useApp()
  const [form, setForm]           = useState(null)
  const [tab, setTab]             = useState('empresa')
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => { if (config) setForm({ ...config }) }, [config])
  if (!form) return null

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  function handleReset() {
    storage.resetDemo()
    // Borrar la versión demo para que initDemo recargue el dataset completo al recargar
    localStorage.removeItem('sp_demo_version')
    toast('Datos demo restaurados — recargando...', 'info', 5000)
    setTimeout(() => window.location.reload(), 1800)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-white/[0.08] flex-wrap">
        {TABS.map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium border-b-2 -mb-px transition-all whitespace-nowrap
              ${tab === id ? 'text-[#00c896] border-[#00c896]' : 'text-[#5f6f80] border-transparent hover:text-[#9ba8b6]'}`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* ── Empresa ─────────────────────────────────── */}
      {tab === 'empresa' && (
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">Datos de la Empresa</div>
          <div className="flex flex-col gap-3.5">
            <Field label="Razón Social / Nombre de Empresa">
              <input className={SI} value={form.empresa} onChange={e => f('empresa', e.target.value)} placeholder="Mi Empresa S.A.C." />
            </Field>
            <div className="grid grid-cols-2 gap-3.5">
              <Field label="RUC">
                <input className={SI} value={form.ruc} onChange={e => f('ruc', e.target.value)} placeholder="20000000001" maxLength={11} />
              </Field>
              <Field label="Teléfono">
                <input className={SI} value={form.telefono || ''} onChange={e => f('telefono', e.target.value)} placeholder="01-2345678" />
              </Field>
            </div>
            <Field label="Dirección">
              <input className={SI} value={form.direccion || ''} onChange={e => f('direccion', e.target.value)} placeholder="Av. Principal 123, Lima" />
            </Field>
            <Field label="Email">
              <input type="email" className={SI} value={form.email || ''} onChange={e => f('email', e.target.value)} placeholder="contacto@empresa.pe" />
            </Field>
          </div>
        </div>
      )}

      {/* ── Sistema ─────────────────────────────────── */}
      {tab === 'sistema' && (
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">Configuración del Sistema</div>
          <div className="grid grid-cols-2 gap-3.5">
            <Field label="Moneda">
              <select className={SEL} value={form.moneda} onChange={e => {
                const m = MONEDAS.find(x => x.code === e.target.value)
                f('moneda', e.target.value); f('simboloMoneda', m?.simbolo || 'S/')
              }}>
                {MONEDAS.map(m => <option key={m.code} value={m.code}>{m.simbolo} — {m.nombre}</option>)}
              </select>
            </Field>
            <Field label="Símbolo de Moneda">
              <input className={SI} value={form.simboloMoneda} onChange={e => f('simboloMoneda', e.target.value)} placeholder="S/" />
            </Field>
            <Field label="Serie Órdenes de Compra" hint="Prefijo para N° de OC. Ej: OC-001-0001">
              <input className={SI} value={form.serieOC || 'OC'} onChange={e => f('serieOC', e.target.value)} />
            </Field>
            <Field label="Serie Movimientos" hint="Prefijo para movimientos de stock">
              <input className={SI} value={form.serieMov || 'MOV'} onChange={e => f('serieMov', e.target.value)} />
            </Field>
          </div>
        </div>
      )}

      {/* ── Valorización ─────────────────────────────── */}
      {tab === 'valorizacion' && (
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Método de Valorización de Stock</span>
            <Badge variant="teal">Activo: {form.formulaValorizacion}</Badge>
          </div>

          <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg border border-blue-500/25 bg-blue-500/10 text-blue-300 text-[13px] mb-4 leading-snug">
            <span>El método seleccionado se aplica a <b>todas las salidas</b> y al cálculo del valor del stock en dashboards y reportes.
            En Perú, el método más usado y aceptado por SUNAT es el <b>PMP</b>.</span>
          </div>

          <div className="flex flex-col gap-3">
            {FORMULAS_VALORIZACION.map(formula => {
              const activo = form.formulaValorizacion === formula.id
              return (
                <div key={formula.id} onClick={() => f('formulaValorizacion', formula.id)}
                  className={`rounded-xl p-5 cursor-pointer transition-all border ${activo ? 'bg-[#00c896]/10 border-[#00c896]' : 'bg-[#1a2230] border-white/[0.08] hover:border-white/20'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    {/* Radio */}
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${activo ? 'border-[#00c896] bg-[#00c896]' : 'border-white/20 bg-transparent'}`}>
                      {activo && <div className="w-2 h-2 rounded-full bg-[#082e1e]" />}
                    </div>
                    <div>
                      <div className={`font-semibold text-[15px] ${activo ? 'text-[#00c896]' : 'text-[#e8edf2]'}`}>{formula.nombre}</div>
                      <div className="text-[12px] text-[#5f6f80]">Alias: {formula.alias}</div>
                    </div>
                    {formula.recomendado && <Badge variant="teal" className="ml-auto">Recomendado Perú</Badge>}
                  </div>

                  <p className="text-[13px] text-[#9ba8b6] leading-relaxed ml-8">{formula.desc}</p>

                  {formula.id === 'PMP' && (
                    <div className="ml-8 mt-3 px-4 py-3 bg-[#0e1117] rounded-lg">
                      <div className="text-[11px] font-semibold text-[#00c896] mb-1.5 uppercase tracking-wide">Fórmula:</div>
                      <code className="text-[13px] text-[#e8edf2] font-mono">PMP = Σ(cantidad × costo) / Σ(cantidad)</code>
                      <div className="text-[12px] text-[#5f6f80] mt-1.5">Se recalcula automáticamente en cada entrada de mercadería.</div>
                    </div>
                  )}
                  {formula.id === 'FIFO' && (
                    <div className="ml-8 mt-3 px-4 py-3 bg-[#0e1117] rounded-lg">
                      <div className="text-[11px] font-semibold text-blue-400 mb-1 uppercase tracking-wide">Lógica PEPS:</div>
                      <div className="text-[12px] text-[#9ba8b6]">El lote más antiguo se consume primero. Ideal para productos con vencimiento.</div>
                    </div>
                  )}
                  {formula.id === 'LIFO' && (
                    <div className="ml-8 mt-3 px-4 py-3 bg-[#0e1117] rounded-lg">
                      <div className="text-[11px] font-semibold text-[#5f6f80] mb-1 uppercase tracking-wide">Nota:</div>
                      <div className="text-[12px] text-[#9ba8b6]">El lote más reciente se consume primero. Poco común en Perú. No recomendado por las NIIF.</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Alertas ─────────────────────────────────── */}
      {tab === 'alertas' && (
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
          <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">Configuración de Alertas</div>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-4 py-3.5 bg-[#1a2230] rounded-xl">
              <div>
                <div className="text-[14px] font-medium text-[#e8edf2] mb-0.5">Alertas de Stock Mínimo</div>
                <div className="text-[12px] text-[#5f6f80]">Notifica cuando el stock cae por debajo del mínimo configurado</div>
              </div>
              <Toggle value={form.alertaStockMinimo} onChange={v => f('alertaStockMinimo', v)} />
            </div>

            <div className="flex items-center justify-between px-4 py-3.5 bg-[#1a2230] rounded-xl">
              <div>
                <div className="text-[14px] font-medium text-[#e8edf2] mb-0.5">Alertas de Vencimiento</div>
                <div className="text-[12px] text-[#5f6f80]">Avisa cuando un producto está próximo a vencer</div>
              </div>
              <Toggle value={form.alertaVencimiento} onChange={v => f('alertaVencimiento', v)} />
            </div>

            {form.alertaVencimiento && (
              <div className="px-4 py-4 bg-[#1a2230] rounded-xl">
                <div className="text-[12px] font-semibold text-[#5f6f80] uppercase tracking-wide mb-3">
                  Días de anticipación
                </div>
                <div className="flex items-center gap-4">
                  <input type="range" min="7" max="90" step="7"
                    value={form.diasAlertaVencimiento || 30}
                    onChange={e => f('diasAlertaVencimiento', +e.target.value)}
                    className="flex-1"
                    style={{ accentColor: '#00c896' }}
                  />
                  <span className="text-[22px] font-bold text-[#00c896] min-w-[52px] text-right">
                    {form.diasAlertaVencimiento || 30}d
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-[#5f6f80] mt-1.5">
                  <span>7 días</span><span>30 días</span><span>60 días</span><span>90 días</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Datos / Reset ────────────────────────────── */}
      {tab === 'datos' && (
        <div className="flex flex-col gap-5">
          <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
            <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">Exportar Datos</div>
            <p className="text-[13px] text-[#9ba8b6] mb-4 leading-relaxed">
              Descarga una copia de todos los datos del sistema en formato JSON. Útil como respaldo antes de conectar el backend.
            </p>
            <Btn variant="secondary" onClick={() => {
              const datos = storage.exportarDatos().data
              const a = document.createElement('a')
              a.href = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }))
              a.download = `stockpro_backup_${new Date().toISOString().split('T')[0]}.json`
              a.click()
              toast('Backup descargado', 'success')
            }}>
              Descargar Backup JSON
            </Btn>
          </div>

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

          <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
            <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">Información del Sistema</div>

            {/* Versión — editable */}
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3.5">
                <Field label="Versión del Sistema">
                  <input
                    className={SI}
                    value={form.version || 'StockPro v2.0'}
                    onChange={e => setForm(p => ({ ...p, version: e.target.value }))}
                    placeholder="StockPro v2.0"
                  />
                </Field>
                <Field label="Modo / Entorno">
                  <select
                    className={SEL}
                    value={form.modoSistema || 'Maqueta — localStorage'}
                    onChange={e => setForm(p => ({ ...p, modoSistema: e.target.value }))}
                  >
                    <option value="Maqueta — localStorage">Maqueta — localStorage</option>
                    <option value="Desarrollo — API local">Desarrollo — API local</option>
                    <option value="Staging — API test">Staging — API test</option>
                    <option value="Producción — API live">Producción — API live</option>
                  </select>
                </Field>
              </div>

              {/* Info de solo lectura */}
              <div className="bg-[#1a2230] rounded-xl overflow-hidden border border-white/[0.06]">
                {[
                  ['Empresa activa',   form.empresa],
                  ['Fórmula activa',   form.formulaValorizacion],
                  ['Moneda',           `${form.simboloMoneda} (${form.moneda})`],
                  ['Versión',          form.version || 'StockPro v2.0'],
                  ['Modo / Entorno',   form.modoSistema || 'Maqueta — localStorage'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.05] last:border-0 text-[13px]">
                    <span className="text-[#9ba8b6]">{k}</span>
                    <span className="font-medium text-[#e8edf2]">{v}</span>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-[#5f6f80] leading-relaxed">
                La <strong>versión</strong> y el <strong>modo</strong> son etiquetas informativas que se muestran
                en la barra lateral y en el encabezado. No afectan el funcionamiento del sistema.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Botón guardar */}
      {tab !== 'datos' && (
        <div className="flex justify-end">
          <Btn variant="primary" size="lg" onClick={() => saveConfig(form)}>
            <Save size={15} /> Guardar Configuración
          </Btn>
        </div>
      )}

      <ConfirmDialog open={confirmReset} onClose={() => setConfirmReset(false)} onConfirm={handleReset}
        danger title="Restaurar datos demo"
        message="¿Seguro? Se borrarán todos los datos actuales y se restaurarán los datos de demostración. La página se recargará automáticamente." />
    </div>
  )
}
