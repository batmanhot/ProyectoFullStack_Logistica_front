import { useState, useEffect, useRef } from 'react'
import { Save, RefreshCw, Trash2, Building2, Settings, Bell, DollarSign, Database,
         Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, Download,
         Plus, X, Pencil, Layers, Tag, Warehouse } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useApp } from '../store/AppContext'
import { FORMULAS_VALORIZACION } from '../utils/valorizacion'
import * as storage from '../services/storage'
import { ConfirmDialog, Toggle, Btn, Field, Badge } from '../components/ui/index'
import { TabCategorias, TabAlmacenes } from './Maestros'

const TABS = [
  ['empresa',           'Empresa',           Building2],
  ['sistema',           'Sistema',           Settings],
  ['valorizacion',      'Valorización',      DollarSign],
  ['alertas',           'Alertas',           Bell],
  ['areas-internas',    'Áreas Internas',    Layers],
  ['categorias',        'Categorías',        Tag],
  ['almacenes',         'Almacenes',         Warehouse],
  ['importar',          'Importar Datos',    Upload],
  ['datos',             'Datos / Reset',     Database],
]

const MONEDAS = [
  { code: 'PEN', simbolo: 'S/',  nombre: 'Sol peruano' },
  { code: 'USD', simbolo: '$',   nombre: 'Dólar americano' },
  { code: 'EUR', simbolo: '€',   nombre: 'Euro' },
]

const SI = 'px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 w-full font-[inherit] placeholder-[#5f6f80]'
const SEL = SI + ' pr-8'
const SI_CI = SI
const DS_CI = { colorScheme: 'dark' }

// ── Pestaña Áreas Internas ───────────────────────────────────
const FORM_AREA_VACIO = { codigo:'', nombre:'', descripcion:'', email:'', activo:true }

function TabAreasInternas({ toast }) {
  const { areas, recargarAreas } = useApp()
  const [modal,      setModal]      = useState(false)
  const [editando,   setEditando]   = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [form,       setForm]       = useState(FORM_AREA_VACIO)
  const [error,      setError]      = useState('')

  function abrirNueva() {
    setEditando(null); setForm(FORM_AREA_VACIO); setError(''); setModal(true)
  }
  function abrirEditar(a) {
    setEditando(a)
    setForm({ codigo:a.codigo, nombre:a.nombre, descripcion:a.descripcion||'', email:a.email||'', activo:a.activo })
    setError(''); setModal(true)
  }
  function handleGuardar() {
    setError('')
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return }
    if (!form.codigo.trim()) { setError('El código es obligatorio'); return }
    const r = storage.saveArea({ ...(editando ? { id:editando.id } : {}), ...form, codigo:form.codigo.trim().toUpperCase() })
    if (r.error) { setError(r.error); return }
    toast(editando ? 'Área actualizada' : 'Área creada', 'success')
    setModal(false); recargarAreas()
  }
  function handleEliminar(id) {
    storage.deleteArea(id)
    toast('Área eliminada', 'success')
    recargarAreas(); setConfirmDel(null)
  }
  function toggleActivo(a) {
    storage.saveArea({ ...a, activo:!a.activo }); recargarAreas()
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Tabla */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div>
            <div className="text-[14px] font-semibold text-[#e8edf2]">Áreas Internas</div>
            <div className="text-[11px] text-[#5f6f80] mt-0.5">
              Departamentos habilitados para solicitar pedidos al almacén
            </div>
          </div>
          <button onClick={abrirNueva}
            className="flex items-center gap-2 px-3 py-2 bg-[#00c896] hover:bg-[#009e76] text-[#082e1e] text-[12px] font-semibold rounded-lg transition-colors">
            <Plus size={13}/> Nueva Área
          </button>
        </div>

        {areas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2 text-[#5f6f80]">
            <Layers size={32}/>
            <div className="text-[13px]">No hay áreas registradas</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr>
                  {['Código','Nombre','Descripción','Email de contacto','Estado','Acciones'].map(h => (
                    <th key={h} className="bg-[#1a2230] px-4 py-2.5 text-left text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.05em] border-b border-white/[0.06] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {areas.map(a => (
                  <tr key={a.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-[12px] font-bold px-2.5 py-1 rounded-lg"
                        style={{ background:'var(--accent-dim)', color:'var(--accent)' }}>
                        {a.codigo}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-[#e8edf2]">{a.nombre}</td>
                    <td className="px-4 py-3 text-[#9ba8b6] max-w-[240px] truncate">{a.descripcion || '—'}</td>
                    <td className="px-4 py-3 text-[12px] text-[#9ba8b6]">{a.email || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${a.activo ? 'bg-green-500/15 text-green-400' : 'bg-white/5 text-[#5f6f80]'}`}>
                        {a.activo ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => abrirEditar(a)}
                          className="p-1.5 text-[#5f6f80] hover:text-[#00c896] hover:bg-white/5 rounded-lg transition-colors" title="Editar">
                          <Pencil size={13}/>
                        </button>
                        <button onClick={() => toggleActivo(a)}
                          className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap
                            ${a.activo ? 'bg-white/5 text-[#5f6f80] hover:bg-red-500/10 hover:text-red-400'
                                       : 'bg-[#00c896]/10 text-[#00c896] hover:bg-[#00c896]/20'}`}>
                          {a.activo ? 'Desactivar' : 'Activar'}
                        </button>
                        <button onClick={() => setConfirmDel(a.id)}
                          className="p-1.5 text-[#5f6f80] hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-colors" title="Eliminar">
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[11px] text-[#5f6f80] leading-relaxed">
        Las áreas <strong>activas</strong> aparecen disponibles al crear pedidos internos y al asignar usuarios solicitantes.
        Desactiva un área para ocultarla sin eliminar su historial.
      </p>

      {/* Modal crear / editar */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0e1117] border border-white/10 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <h2 className="text-[15px] font-semibold text-white">
                {editando ? 'Editar área' : 'Nueva área interna'}
              </h2>
              <button onClick={() => setModal(false)} className="text-white/30 hover:text-white/60"><X size={18}/></button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Código *</label>
                  <input className={SI_CI}
                    placeholder="Ej: ADM, LOG..."
                    value={form.codigo}
                    onChange={e => setForm(f => ({...f, codigo:e.target.value.toUpperCase().slice(0,6)}))}
                    disabled={!!editando}
                    style={editando ? {opacity:.5} : {}}
                    autoFocus={!editando}
                    maxLength={6}
                  />
                  {editando
                    ? <span className="text-[10px] text-white/25">El código no se puede cambiar</span>
                    : <span className="text-[10px] text-white/25">Máx. 6 caracteres, único</span>
                  }
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Nombre *</label>
                  <input className={SI_CI}
                    placeholder="Ej: Administración"
                    value={form.nombre}
                    onChange={e => setForm(f => ({...f, nombre:e.target.value}))}
                    autoFocus={!!editando}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Descripción</label>
                <input className={SI_CI}
                  placeholder="Ej: Gestión administrativa y secretaría"
                  value={form.descripcion}
                  onChange={e => setForm(f => ({...f, descripcion:e.target.value}))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Email de contacto</label>
                <input type="email" className={SI_CI}
                  placeholder="area@empresa.pe"
                  value={form.email}
                  onChange={e => setForm(f => ({...f, email:e.target.value}))}
                />
              </div>
              <Toggle label="Área activa (disponible para pedidos)"
                checked={form.activo} onChange={v => setForm(f => ({...f, activo:v}))}/>
              {error && (
                <div className="px-3 py-2 bg-red-500/10 border border-red-500/25 rounded-lg text-[13px] text-red-400">{error}</div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 px-6 pb-5">
              <button onClick={() => setModal(false)}
                className="px-4 py-2 text-[13px] text-white/50 hover:text-white/80 transition-colors">Cancelar</button>
              <button onClick={handleGuardar}
                className="px-5 py-2 bg-[#00c896] hover:bg-[#009e76] text-[#082e1e] text-[13px] font-semibold rounded-lg transition-colors">
                {editando ? 'Guardar cambios' : 'Crear área'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDel} onClose={() => setConfirmDel(null)}
        onConfirm={() => handleEliminar(confirmDel)} danger
        title="Eliminar área"
        message="¿Eliminar esta área? Verifica que no tenga usuarios ni pedidos asociados antes de continuar. Esta acción no se puede deshacer."
      />
    </div>
  )
}

export default function Configuracion() {
  const { config, saveConfig, toast, sesion } = useApp()
  const tenantId = sesion?.empresaId || 'desconocido'
  const [form, setForm]           = useState(null)
  const [tab, setTab]             = useState('empresa')
  const [confirmReset, setConfirmReset]     = useState(false)
  const [confirmLimpiar, setConfirmLimpiar] = useState(false)
  const [filasImport, setFilasImport]       = useState([])
  const [confirmImport, setConfirmImport]   = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => { if (config) setForm({ ...config }) }, [config])
  if (!form) return null

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  function handleReset() {
    storage.resetDemo()   // resetDemo() ya elimina la clave sp_{tenant}_demo_version
    toast('Datos demo restaurados — recargando...', 'info', 5000)
    setTimeout(() => window.location.reload(), 1800)
  }

  function handleLimpiar() {
    storage.limpiarDatosOperativos()
    toast('Datos operativos eliminados — recargando...', 'success', 5000)
    setTimeout(() => window.location.reload(), 1800)
  }

  function descargarPlantilla() {
    const cats  = storage.getCategorias().data  || []
    const alms  = storage.getAlmacenes().data   || []
    const provs = storage.getProveedores().data || []
    const filas = [
      ['SKU *','Nombre *','Descripción','Categoría','Unidad Medida',
       'Stock Actual','Stock Mínimo','Stock Máximo','Almacén','Proveedor',
       'Precio Venta','Tiene Vencimiento (Si/No)','Fecha Vencimiento (AAAA-MM-DD)'],
      ['PROD-001','Ejemplo Producto 1','Descripción opcional',
       cats[0]?.nombre||'Categoría 1','UND',0,5,100,
       alms[0]?.nombre||'Almacén Central',provs[0]?.razonSocial||'',99.90,'No',''],
      ['PROD-002','Ejemplo con Vencimiento','Producto perecedero',
       cats[0]?.nombre||'Categoría 1','KG',0,10,200,
       alms[0]?.nombre||'Almacén Central','',25.00,'Si','2026-12-31'],
    ]
    const ws = XLSX.utils.aoa_to_sheet(filas)
    ws['!cols'] = [10,30,35,20,14,12,12,12,22,25,12,24,26].map(wch=>({wch}))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Productos')
    XLSX.writeFile(wb, 'plantilla_productos.xlsx')
    toast('Plantilla descargada', 'success')
  }

  function handleArchivoImport(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb   = XLSX.read(ev.target.result, { type: 'binary' })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        if (rows.length < 2) { toast('El archivo no tiene datos', 'error'); return }

        const cats  = storage.getCategorias().data  || []
        const alms  = storage.getAlmacenes().data   || []
        const provs = storage.getProveedores().data || []
        const exist = storage.getProductos().data   || []

        const parsed = rows.slice(1)
          .filter(r => r.some(c => String(c).trim() !== ''))
          .map((row, idx) => {
            const sku        = String(row[0]||'').trim()
            const nombre     = String(row[1]||'').trim()
            const descripcion= String(row[2]||'').trim()
            const catNom     = String(row[3]||'').trim()
            const unidad     = String(row[4]||'UND').trim().toUpperCase()||'UND'
            const stockActual= Math.max(0, parseFloat(row[5])||0)
            const stockMinimo= Math.max(0, parseFloat(row[6])||0)
            const stockMaximo= Math.max(0, parseFloat(row[7])||0)
            const almNom     = String(row[8]||'').trim()
            const provNom    = String(row[9]||'').trim()
            const precioVenta= Math.max(0, parseFloat(row[10])||0)
            const tieneVenc  = ['si','sí'].includes(String(row[11]||'').trim().toLowerCase())
            const fechaVenc  = String(row[12]||'').trim()||null

            const cat  = cats.find(c => c.nombre.toLowerCase()  === catNom.toLowerCase())
            const alm  = alms.find(a => a.nombre.toLowerCase()  === almNom.toLowerCase())
            const prov = provs.find(p => (p.razonSocial||'').toLowerCase() === provNom.toLowerCase())
            const prev = exist.find(p => p.sku === sku)

            const errores = []
            if (!sku)            errores.push('SKU requerido')
            if (!nombre)         errores.push('Nombre requerido')
            if (catNom && !cat)  errores.push(`Categoría "${catNom}" no existe`)
            if (almNom && !alm)  errores.push(`Almacén "${almNom}" no existe`)

            return {
              _fila: idx + 2, _valid: errores.length === 0,
              _errores: errores, _accion: prev ? 'actualizar' : 'crear',
              _existenteId: prev?.id,
              sku, nombre, descripcion,
              categoriaId: cat?.id||'', categoriaNombre: catNom,
              unidadMedida: unidad,
              stockActual, stockMinimo, stockMaximo,
              almacenId: alm?.id||'', almacenNombre: almNom,
              proveedorId: prov?.id||'',
              precioVenta, tieneVencimiento: tieneVenc,
              fechaVencimiento: tieneVenc ? fechaVenc : null,
              activo: true,
            }
          })

        setFilasImport(parsed)
        if (fileInputRef.current) fileInputRef.current.value = ''
        toast(`${parsed.length} fila(s) detectadas — revisa la vista previa`, 'info')
      } catch {
        toast('Error al leer el archivo. Usa la plantilla descargada.', 'error')
      }
    }
    reader.readAsBinaryString(file)
  }

  function ejecutarImport() {
    const validas = filasImport.filter(r => r._valid)
    if (!validas.length) { toast('No hay filas válidas para importar', 'error'); return }
    let creados = 0, actualizados = 0
    validas.forEach(r => {
      const prod = {
        sku: r.sku, nombre: r.nombre, descripcion: r.descripcion,
        categoriaId: r.categoriaId, unidadMedida: r.unidadMedida,
        stockActual: r.stockActual, stockMinimo: r.stockMinimo, stockMaximo: r.stockMaximo,
        almacenId: r.almacenId, proveedorId: r.proveedorId, precioVenta: r.precioVenta,
        tieneVencimiento: r.tieneVencimiento, fechaVencimiento: r.fechaVencimiento,
        activo: true,
      }
      if (r._accion === 'actualizar') {
        storage.saveProducto({ ...prod, id: r._existenteId })
        actualizados++
      } else {
        storage.saveProducto(prod)
        creados++
      }
    })
    toast(`Importación completa: ${creados} creados, ${actualizados} actualizados`, 'success', 6000)
    setFilasImport([])
    setConfirmImport(false)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

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
          <div className="flex items-center justify-between mb-4">
            <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Datos de la Empresa</div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#5f6f80] font-mono">org: {tenantId}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${sesion?.plan === 'pro' ? 'bg-[#00c896]/15 text-[#00c896]' : 'bg-blue-500/15 text-blue-400'}`}>
                {sesion?.plan || 'starter'}
              </span>
            </div>
          </div>
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

            <div className="mt-2 pt-4 border-t border-white/[0.08]">
              <div className="text-[11px] font-bold text-[#5f6f80] uppercase tracking-[0.08em] mb-3">Alertas automáticas</div>
              <div className="grid grid-cols-2 gap-3.5">
                <Field label="WhatsApp responsable (con código país)">
                  <input className={SI} value={form.whatsappResponsable||''} onChange={e=>f('whatsappResponsable',e.target.value)} placeholder="51999888777"/>
                </Field>
                <Field label="Email responsable de alertas">
                  <input type="email" className={SI} value={form.emailResponsable||''} onChange={e=>f('emailResponsable',e.target.value)} placeholder="compras@empresa.pe"/>
                </Field>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer mt-3 px-3.5 py-3 bg-[#1a2230] rounded-xl border border-white/[0.07] hover:border-white/[0.12] transition-colors">
                <input type="checkbox" checked={!!form.alertasAutoWhatsApp} onChange={e=>f('alertasAutoWhatsApp',e.target.checked)} className="accent-[#00c896] w-4 h-4"/>
                <div>
                  <div className="text-[13px] font-medium text-[#e8edf2]">Activar alertas automáticas por WhatsApp</div>
                  <div className="text-[11px] text-[#5f6f80] mt-0.5">Cuando haya stock agotado o crítico, el sistema abrirá WhatsApp con el mensaje pre-llenado al número del responsable.</div>
                </div>
              </label>
            </div>
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
            <div className="flex items-center justify-between py-3 border-b border-white/[0.06]">
              <div>
                <div className="text-[13px] font-medium text-[#e8edf2]">Lector de Código de Barras</div>
                <div className="text-[12px] text-[#5f6f80] mt-0.5">
                  Activa el botón "Scan" en Entradas para escanear con la cámara del celular o lector USB.
                  Cuando está desactivado, solo se muestra el buscador de texto estándar.
                </div>
              </div>
              <Toggle value={!!form.lectorBarras} onChange={v => f('lectorBarras', v)} />
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

      {/* ── Áreas Internas ──────────────────────────── */}
      {tab === 'areas-internas' && <TabAreasInternas toast={toast} />}

      {/* ── Categorías ──────────────────────────────── */}
      {tab === 'categorias' && <TabCategorias />}

      {/* ── Almacenes ───────────────────────────────── */}
      {tab === 'almacenes' && <TabAlmacenes />}

      {/* ── Importar Datos ───────────────────────────── */}
      {tab === 'importar' && (
        <div className="flex flex-col gap-5">

          {/* Instrucciones */}
          <div className="bg-[#0d2137] border border-blue-500/25 rounded-xl p-5">
            <p className="text-[13px] font-semibold text-blue-300 mb-2">¿Cómo importar productos?</p>
            <ol className="text-[12px] text-blue-200/70 flex flex-col gap-1 list-decimal list-inside leading-relaxed">
              <li>Descarga la plantilla Excel con el botón de abajo.</li>
              <li>Rellena tus productos respetando las columnas (no cambies los encabezados).</li>
              <li>Los campos <span className="text-white/80 font-medium">Categoría</span> y <span className="text-white/80 font-medium">Almacén</span> deben coincidir exactamente con los nombres configurados en el sistema.</li>
              <li>Sube el archivo y revisa la vista previa antes de confirmar.</li>
              <li>Si el SKU ya existe, el producto se <span className="text-yellow-300 font-medium">actualiza</span>. Si es nuevo, se <span className="text-emerald-300 font-medium">crea</span>.</li>
            </ol>
          </div>

          {/* Descargar plantilla */}
          <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
            <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-2">Paso 1 — Descargar plantilla</div>
            <p className="text-[13px] text-[#9ba8b6] mb-4">
              Genera una plantilla Excel con las columnas correctas y filas de ejemplo usando los datos de tu sistema (categorías, almacenes y proveedores actuales).
            </p>
            <Btn variant="secondary" onClick={descargarPlantilla}>
              <Download size={14}/> Descargar Plantilla Excel
            </Btn>
          </div>

          {/* Subir archivo */}
          <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
            <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-2">Paso 2 — Subir archivo</div>
            <p className="text-[13px] text-[#9ba8b6] mb-4">Selecciona el archivo Excel (.xlsx) o CSV con tus productos.</p>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv"
              className="hidden" onChange={handleArchivoImport} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-3 w-full px-4 py-6 border-2 border-dashed border-white/[0.12] hover:border-[#00c896]/50 rounded-xl text-[#5f6f80] hover:text-[#00c896] transition-all group"
            >
              <FileSpreadsheet size={28} className="shrink-0 group-hover:scale-110 transition-transform"/>
              <div className="text-left">
                <p className="text-[13px] font-medium">Haz clic para seleccionar un archivo</p>
                <p className="text-[11px] text-[#5f6f80] mt-0.5">Formatos aceptados: .xlsx, .xls, .csv</p>
              </div>
            </button>
          </div>

          {/* Vista previa */}
          {filasImport.length > 0 && (
            <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Paso 3 — Vista previa</div>
                  <div className="flex items-center gap-3 mt-1.5 text-[12px]">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle size={12}/> {filasImport.filter(r=>r._valid&&r._accion==='crear').length} nuevos
                    </span>
                    <span className="flex items-center gap-1 text-yellow-400">
                      <CheckCircle size={12}/> {filasImport.filter(r=>r._valid&&r._accion==='actualizar').length} actualizaciones
                    </span>
                    <span className="flex items-center gap-1 text-red-400">
                      <XCircle size={12}/> {filasImport.filter(r=>!r._valid).length} con error
                    </span>
                  </div>
                </div>
                <button onClick={() => setFilasImport([])}
                  className="text-[11px] text-[#5f6f80] hover:text-white/60 transition-colors">
                  Limpiar
                </button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-[#1a2230]">
                      {['Fila','Estado','Acción','SKU','Nombre','Categoría','Almacén','Stock','Precio'].map(h=>(
                        <th key={h} className="px-3 py-2.5 text-left font-semibold text-[#5f6f80] whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filasImport.map((r,i) => (
                      <tr key={i} className={`border-t border-white/[0.04] ${!r._valid?'bg-red-500/5':''}`}>
                        <td className="px-3 py-2 text-[#5f6f80]">{r._fila}</td>
                        <td className="px-3 py-2">
                          {r._valid
                            ? <span className="flex items-center gap-1 text-emerald-400"><CheckCircle size={11}/>OK</span>
                            : <span className="flex items-center gap-1 text-red-400" title={r._errores.join(' · ')}>
                                <AlertTriangle size={11}/>{r._errores[0]}
                              </span>
                          }
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${r._accion==='crear'?'bg-emerald-500/15 text-emerald-400':'bg-yellow-500/15 text-yellow-400'}`}>
                            {r._accion==='crear'?'NUEVO':'ACTUALIZAR'}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-[#9ba8b6]">{r.sku}</td>
                        <td className="px-3 py-2 text-[#e8edf2] max-w-[180px] truncate">{r.nombre}</td>
                        <td className="px-3 py-2 text-[#9ba8b6]">{r.categoriaNombre||'—'}</td>
                        <td className="px-3 py-2 text-[#9ba8b6]">{r.almacenNombre||'—'}</td>
                        <td className="px-3 py-2 text-[#9ba8b6]">{r.stockActual}</td>
                        <td className="px-3 py-2 text-[#9ba8b6]">{r.precioVenta.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filasImport.some(r=>r._valid) && (
                <div className="flex justify-end mt-4">
                  <Btn variant="primary" onClick={() => setConfirmImport(true)}>
                    <Upload size={14}/> Confirmar Importación ({filasImport.filter(r=>r._valid).length} productos)
                  </Btn>
                </div>
              )}
            </div>
          )}
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
              a.download = `stockpro_${tenantId}_backup_${new Date().toISOString().split('T')[0]}.json`
              a.click()
              toast('Backup descargado', 'success')
            }}>
              Descargar Backup JSON
            </Btn>
          </div>

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
                ['Elimina',  ['Productos · Proveedores','Movimientos (entradas/salidas)','Órdenes · Cotizaciones','Clientes · Despachos · Transportes','Pedidos Internos · Auditoría'], 'text-red-400'],
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

          <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-5">
            <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-4">Información del Sistema</div>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3.5">
                <Field label="Versión del Sistema">
                  <div className={`${SI} flex items-center justify-between opacity-70 cursor-not-allowed select-none`}>
                    <span>{config?.version || 'StockPro v2.0'}</span>
                    <span className="text-[11px] text-[#5f6f80] shrink-0 ml-2">desde AdminSaaS</span>
                  </div>
                </Field>
                <Field label="Modo / Entorno">
                  <div className="flex gap-2">
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
                    <Btn variant="primary" onClick={() => saveConfig({ modoSistema: form.modoSistema })}>
                      <Save size={13}/>
                    </Btn>
                  </div>
                </Field>
              </div>

              {/* Info de solo lectura */}
              <div className="bg-[#1a2230] rounded-xl overflow-hidden border border-white/[0.06]">
                {[
                  ['Organización (tenant)', tenantId],
                  ['Plan',                 sesion?.plan || 'starter'],
                  ['Empresa activa',        form.empresa],
                  ['Fórmula activa',        form.formulaValorizacion],
                  ['Moneda',                `${form.simboloMoneda} (${form.moneda})`],
                  ['Versión',               form.version || 'StockPro v2.0'],
                  ['Modo / Entorno',        form.modoSistema || 'Maqueta — localStorage'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.05] last:border-0 text-[13px]">
                    <span className="text-[#9ba8b6]">{k}</span>
                    <span className="font-medium text-[#e8edf2]">{v}</span>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-[#5f6f80] leading-relaxed">
                La <strong>versión</strong> se establece desde la sección <strong>AdminSaaS → Negocios</strong> y se refleja automáticamente en la barra lateral y en el encabezado de login.
                El <strong>modo/entorno</strong> es una etiqueta informativa local — guárdala con el botón de la derecha.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Botón guardar */}
      {tab !== 'datos' && tab !== 'importar' && tab !== 'areas-internas' && tab !== 'categorias' && tab !== 'almacenes' && (
        <div className="flex justify-end">
          <Btn variant="primary" size="lg" onClick={() => saveConfig(form)}>
            <Save size={15} /> Guardar Configuración
          </Btn>
        </div>
      )}

      <ConfirmDialog open={confirmReset} onClose={() => setConfirmReset(false)} onConfirm={handleReset}
        danger title="Restaurar datos demo"
        message={`Se borrarán TODOS los datos de la organización "${tenantId}" y se restaurarán los datos de demostración. Solo afecta a esta empresa — los demás tenants no se ven afectados. La página se recargará automáticamente.`} />

      <ConfirmDialog open={confirmLimpiar} onClose={() => setConfirmLimpiar(false)} onConfirm={handleLimpiar}
        danger title="Limpiar datos operativos"
        message={`Se eliminarán productos, movimientos, órdenes, clientes, despachos y transportes de la organización "${tenantId}". Se conservarán configuración, categorías, almacenes y usuarios. Solo afecta a esta empresa. Esta acción no se puede deshacer.`} />

      <ConfirmDialog open={confirmImport} onClose={() => setConfirmImport(false)} onConfirm={ejecutarImport}
        title="Confirmar importación"
        message={`Se importarán ${filasImport.filter(r=>r._valid&&r._accion==='crear').length} productos nuevos y se actualizarán ${filasImport.filter(r=>r._valid&&r._accion==='actualizar').length}. Las filas con error serán ignoradas. ¿Continuar?`} />
    </div>
  )
}
