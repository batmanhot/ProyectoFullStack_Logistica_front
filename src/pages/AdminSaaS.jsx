import { useState, useMemo, useEffect } from 'react'
import {
  Building2, CreditCard, RefreshCw, SlidersHorizontal, Bell, Globe,
  Plus, Edit2, Trash2, Search, Save, Eye, EyeOff,
  DollarSign, Calendar, Mail, Phone, Star,
  AlertTriangle, Clock, Package, Database, Users,
  CheckCircle, Tag, Hash, Link2, Type, MessageSquare,
  Megaphone, Settings, Twitter, Linkedin, Facebook,
  Instagram, Youtube, BarChart3, ChevronUp, ChevronDown,
  Shield, Zap, RefreshCcw, TrendingUp, Info
} from 'lucide-react'
import { differenceInDays, format, addDays } from 'date-fns'
import { useApp } from '../store/AppContext'
import {
  Modal, ConfirmDialog, EmptyState, Badge, Btn,
  Field, Input, Select, Textarea, Card, CardHeader,
  TableWrap, Th, Td, Alert, KpiCard, Toggle
} from '../components/ui/index'

// ── LocalStorage helpers ────────────────────────────────
const LS = {
  negocios:     'saas_negocios',
  planes:       'saas_planes',
  renovaciones: 'saas_renovaciones',
  limites:      'saas_limites',
  alertas:      'saas_alertas',
  landing:      'saas_landing',
}
const loadLS = (key, fb) => { try { return JSON.parse(localStorage.getItem(key)) ?? fb } catch { return fb } }
const saveLS = (key, val) => localStorage.setItem(key, JSON.stringify(val))
const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
const today = () => format(new Date(), 'yyyy-MM-dd')

// ── Initial demo data ───────────────────────────────────
const PLANES_INIT = [
  { id:'trial',        nombre:'Prueba Gratuita', descripcion:'Evalúa el sistema sin compromiso', precioMensual:0,   precioAnual:0,    moneda:'PEN', color:'#6366f1', destacado:false, activo:true, vigenciaDias:30, caracteristicas:['1 usuario','Hasta 100 productos','1 almacén','Soporte email','Solo modo demo'] },
  { id:'basico',       nombre:'Básico',          descripcion:'Para pequeñas empresas en crecimiento', precioMensual:49,  precioAnual:490,  moneda:'PEN', color:'#3b82f6', destacado:false, activo:true, vigenciaDias:30, caracteristicas:['Hasta 3 usuarios','Hasta 500 productos','2 almacenes','Soporte email','Exportación básica'] },
  { id:'profesional',  nombre:'Profesional',     descripcion:'Ideal para empresas en expansión',    precioMensual:99,  precioAnual:990,  moneda:'PEN', color:'#00c896', destacado:true,  activo:true, vigenciaDias:30, caracteristicas:['Hasta 10 usuarios','Hasta 2,000 productos','5 almacenes','Soporte prioritario','Reportes avanzados','Exportación avanzada'] },
  { id:'empresarial',  nombre:'Empresarial',     descripcion:'Potencia sin límites para grandes operaciones', precioMensual:199, precioAnual:1990, moneda:'PEN', color:'#f59e0b', destacado:false, activo:true, vigenciaDias:30, caracteristicas:['Usuarios ilimitados','Productos ilimitados','Almacenes ilimitados','Multi-empresa','API Access','SLA garantizado','Soporte 24/7','Onboarding dedicado'] },
]

const NEGOCIOS_INIT = [
  { id:'neg_1', nombre:'Distribuidora Lima Norte S.A.C.', ruc:'20512345678', contacto:'Carlos Mendoza', email:'carlos@dlnorte.com', telefono:'+51 944 123 456', plan:'profesional', estado:'activo',    fechaRegistro:'2024-03-15', fechaVencimiento:'2027-03-15', empresaId:'dlnorte',  password:'demo123',    notas:'Renovación automática activa.' },
  { id:'neg_2', nombre:'ACME Distribuciones E.I.R.L.',   ruc:'20598765432', contacto:'María Rodríguez', email:'maria@acme.com',    telefono:'+51 955 987 654', plan:'empresarial',  estado:'activo',    fechaRegistro:'2023-11-01', fechaVencimiento:'2027-11-01', empresaId:'acme',      password:'acme2025',   notas:'Plan personalizado. Facturación anual.' },
  { id:'neg_3', nombre:'Ferretería San Martín E.I.R.L.', ruc:'20111222333', contacto:'Pedro Torres',    email:'pedro@sanmartin.pe', telefono:'+51 966 555 444', plan:'trial',         estado:'trial',     fechaRegistro:'2026-05-25', fechaVencimiento:'2026-06-24', empresaId:'sanmartin', password:'trial123',   notas:'Prueba gratuita de 30 días activa.' },
  { id:'neg_4', nombre:'Ferrmax Industrial S.A.',         ruc:'20444555666', contacto:'Ana Gutiérrez',   email:'ana@ferrmax.com',    telefono:'+51 977 111 222', plan:'profesional',   estado:'suspendido',fechaRegistro:'2025-01-15', fechaVencimiento:'2026-05-31', empresaId:'ferrmax',   password:'ferrmax2026',notas:'Suspendido por falta de pago.' },
  { id:'neg_5', nombre:'TechInventarios SRL',             ruc:'20777888999', contacto:'Luis Paredes',    email:'luis@techinv.com',   telefono:'+51 988 333 444', plan:'basico',         estado:'vencido',   fechaRegistro:'2025-06-01', fechaVencimiento:'2026-05-10', empresaId:'techinv',   password:'tech2025',   notas:'Contrato vencido.' },
]

const RENOVACIONES_INIT = [
  { id:'ren_1', negocioId:'neg_1', negocioNombre:'Distribuidora Lima Norte S.A.C.', plan:'profesional', monto:990,  moneda:'PEN', ciclo:'anual', fechaPago:'2026-03-15', metodoPago:'tarjeta',        periodoInicio:'2026-03-15', periodoFin:'2027-03-15', estado:'pagado', comprobante:'REC-2026-031' },
  { id:'ren_2', negocioId:'neg_2', negocioNombre:'ACME Distribuciones E.I.R.L.',    plan:'empresarial', monto:1990, moneda:'PEN', ciclo:'anual', fechaPago:'2026-11-01', metodoPago:'transferencia',  periodoInicio:'2026-11-01', periodoFin:'2027-11-01', estado:'pagado', comprobante:'REC-2026-110' },
  { id:'ren_3', negocioId:'neg_2', negocioNombre:'ACME Distribuciones E.I.R.L.',    plan:'empresarial', monto:1990, moneda:'PEN', ciclo:'anual', fechaPago:'2025-11-01', metodoPago:'transferencia',  periodoInicio:'2025-11-01', periodoFin:'2026-11-01', estado:'pagado', comprobante:'REC-2025-110' },
  { id:'ren_4', negocioId:'neg_1', negocioNombre:'Distribuidora Lima Norte S.A.C.', plan:'profesional', monto:990,  moneda:'PEN', ciclo:'anual', fechaPago:'2025-03-15', metodoPago:'tarjeta',        periodoInicio:'2025-03-15', periodoFin:'2026-03-15', estado:'pagado', comprobante:'REC-2025-031' },
]

const LIMITES_INIT = {
  trial:       { maxUsuarios:1,  maxProductos:100,   maxAlmacenes:1,  maxProveedores:10,  maxClientes:20,   maxOrdenesMes:50,   almacenamientoGB:1,   soporte:'email',        apiAccess:false, multiEmpresa:false, exportAvanzada:false, reportesAvanzados:false },
  basico:      { maxUsuarios:3,  maxProductos:500,   maxAlmacenes:2,  maxProveedores:50,  maxClientes:100,  maxOrdenesMes:300,  almacenamientoGB:5,   soporte:'email',        apiAccess:false, multiEmpresa:false, exportAvanzada:false, reportesAvanzados:false },
  profesional: { maxUsuarios:10, maxProductos:2000,  maxAlmacenes:5,  maxProveedores:200, maxClientes:500,  maxOrdenesMes:2000, almacenamientoGB:25,  soporte:'prioritario',  apiAccess:true,  multiEmpresa:false, exportAvanzada:true,  reportesAvanzados:true  },
  empresarial: { maxUsuarios:-1, maxProductos:-1,    maxAlmacenes:-1, maxProveedores:-1,  maxClientes:-1,   maxOrdenesMes:-1,   almacenamientoGB:200, soporte:'24/7',         apiAccess:true,  multiEmpresa:true,  exportAvanzada:true,  reportesAvanzados:true  },
}

const ALERTAS_INIT = [
  { id:'al_1', diasAntes:30, activa:true, canales:['email','sistema'], asunto:'Plan próximo a vencer', mensaje:'Tu plan {plan} vence en {dias} días. Renueva para continuar sin interrupciones.' },
  { id:'al_2', diasAntes:15, activa:true, canales:['email','sistema'], asunto:'Recordatorio de renovación', mensaje:'Quedan {dias} días para que venza tu plan {plan}. ¡No pierdas el acceso!' },
  { id:'al_3', diasAntes:7, activa:true, canales:['email','sistema','whatsapp'], asunto:'¡Plan por vencer pronto!', mensaje:'Tu plan vence en {dias} días. Contáctanos para renovar.' },
  { id:'al_4', diasAntes:1, activa:true, canales:['email','sistema','whatsapp'], asunto:'¡Tu plan vence mañana!', mensaje:'Mañana vence tu acceso. Renueva ahora para no perder tu información.' }
]

const LANDING_INIT = {
  sitio: { nombre:'StockPro', tagline:'Logística inteligente para tu empresa', descripcion:'Sistema SaaS de gestión de inventario, despachos y operaciones logísticas para empresas modernas.', colorPrimario:'#00c896', logoUrl:'' },
  hero: { titulo:'Controla tu logística con precisión', subtitulo:'Sistema completo de gestión de inventario, pedidos y despachos para empresas que quieren crecer sin límites.', ctaTexto:'Comenzar prueba gratis', ctaUrl:'#planes', ctaTexto2:'Ver demo en vivo', ctaUrl2:'#demo', imagenUrl:'' },
  caracteristicas: [
    { id:'cf_1', icono:'📦', titulo:'Inventario en Tiempo Real', descripcion:'Control de stock con alertas automáticas y kardex valorizado completo.' },
    { id:'cf_2', icono:'🚚', titulo:'Gestión de Despachos', descripcion:'Planifica rutas, controla tu flota y rastrea entregas en tiempo real.' },
    { id:'cf_3', icono:'📊', titulo:'Reportes y KPIs', descripcion:'Dashboards con indicadores clave: OTIF, Fill Rate, Perfect Order y más.' },
    { id:'cf_4', icono:'🌐', titulo:'Portal B2B de Clientes', descripcion:'Tus clientes hacen pedidos directamente desde un portal personalizado. Sin llamadas, sin errores, con trazabilidad en tiempo real.' },
    { id:'cf_5', icono:'👥', titulo:'Multi-usuario', descripcion:'Gestión de roles y permisos por módulo para todo tu equipo.' },
    { id:'cf_6', icono:'☁️', titulo:'100% en la Nube', descripcion:'Accede desde cualquier dispositivo, sin instalaciones ni actualizaciones.' },
    { id:'cf_7', icono:'🔮', titulo:'Previsión de Demanda', descripcion:'Anticipa la demanda con análisis histórico de movimientos. Reabastécete antes de que el stock se agote y reduce el capital inmovilizado.' }
  ],
  contacto: { email:'ventas@stockpro.com', telefono:'+51 1 234 5678', whatsapp:'+51 999 000 111', direccion:'Lima, Perú' },
  redesSociales: { linkedin:'', twitter:'', facebook:'', instagram:'', youtube:'' },
  seo: { titulo:'StockPro — Sistema Logístico SaaS', descripcion:'Gestiona tu inventario, despachos y logística con StockPro. Prueba gratis por 14 días.', keywords:'logística, inventario, saas, gestión almacén, stockpro, peru' },
  footer: { textoLegal:'© 2026 StockPro. Todos los derechos reservados.', mostrarPrecios:true, moneda:'USD', probarGratisDias:14 }
}

const ESTADO_BADGE = { activo:'success', trial:'info', suspendido:'warning', vencido:'danger', cancelado:'neutral' }

function estadoEfectivo(n) {
  if (n.estado === 'cancelado' || n.estado === 'suspendido') return n.estado
  if (n.fechaVencimiento && new Date(n.fechaVencimiento) < new Date(new Date().toDateString())) return 'vencido'
  return n.estado
}

// ══════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════
export default function AdminSaaS() {
  const { toast } = useApp()
  const [tab, setTab] = useState('negocios')

  const [negocios,     setNegocios]     = useState(() => loadLS(LS.negocios,     NEGOCIOS_INIT))
  const [planes,       setPlanes]       = useState(() => loadLS(LS.planes,       PLANES_INIT))
  const [renovaciones, setRenovaciones] = useState(() => loadLS(LS.renovaciones, RENOVACIONES_INIT))
  const [limites,      setLimites]      = useState(() => loadLS(LS.limites,      LIMITES_INIT))
  const [alertas,      setAlertas]      = useState(() => loadLS(LS.alertas,      ALERTAS_INIT))
  const [landing,      setLanding]      = useState(() => loadLS(LS.landing,      LANDING_INIT))

  useEffect(() => saveLS(LS.negocios,     negocios),     [negocios])
  useEffect(() => saveLS(LS.planes,       planes),       [planes])
  useEffect(() => saveLS(LS.renovaciones, renovaciones), [renovaciones])
  useEffect(() => saveLS(LS.limites,      limites),      [limites])
  useEffect(() => saveLS(LS.alertas,      alertas),      [alertas])
  useEffect(() => saveLS(LS.landing,      landing),      [landing])

  const TABS = [
    { id:'negocios',     label:'Negocios',             icon: Building2,        desc:`${negocios.length} registrados` },
    { id:'planes',       label:'Planes y Precios',     icon: CreditCard,       desc:`${planes.length} planes` },
    { id:'renovaciones', label:'Historial Renovaciones',icon: RefreshCw,       desc:`${renovaciones.length} registros` },
    { id:'limites',      label:'Límites del Plan',     icon: SlidersHorizontal,desc:'Configurar límites' },
    { id:'alertas',      label:'Alertas de Vencimiento',icon: Bell,            desc:`${alertas.length} reglas` },
    { id:'landing',      label:'Landing Page',         icon: Globe,            desc:'Config. sitio web' },
  ]

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#0e1117]">
      {/* Tab bar */}
      <div className="flex gap-0.5 px-5 pt-4 border-b border-white/[0.08] overflow-x-auto shrink-0">
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium rounded-t-lg border-b-2 -mb-px whitespace-nowrap transition-colors ${
                active ? 'text-[#00c896] border-[#00c896] bg-[#00c896]/5' : 'text-[#8899a6] border-transparent hover:text-[#e8edf2] hover:bg-white/5'
              }`}>
              <Icon size={15} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6 min-h-0">
        {tab === 'negocios'     && <TabNegocios     negocios={negocios} setNegocios={setNegocios} planes={planes} setRenovaciones={setRenovaciones} toast={toast} />}
        {tab === 'planes'       && <TabPlanes       planes={planes} setPlanes={setPlanes} toast={toast} />}
        {tab === 'renovaciones' && <TabRenovaciones renovaciones={renovaciones} setRenovaciones={setRenovaciones} negocios={negocios} planes={planes} toast={toast} />}
        {tab === 'limites'      && <TabLimites      limites={limites} setLimites={setLimites} planes={planes} toast={toast} />}
        {tab === 'alertas'      && <TabAlertas      alertas={alertas} setAlertas={setAlertas} negocios={negocios} planes={planes} toast={toast} />}
        {tab === 'landing'      && <TabLanding      landing={landing} setLanding={setLanding} planes={planes} toast={toast} />}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// TAB: NEGOCIOS
// ══════════════════════════════════════════════════════════
function TabNegocios({ negocios, setNegocios, planes, setRenovaciones, toast }) {
  const [search, setSearch]     = useState('')
  const [filtroEstado, setFE]   = useState('todos')
  const [filtroPlan,   setFP]   = useState('todos')
  const [modalOpen, setModal]   = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm]         = useState({})
  const [showPass, setShowPass] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)

  const stats = useMemo(() => ({
    total:    negocios.length,
    activos:  negocios.filter(n => n.estado === 'activo').length,
    trial:    negocios.filter(n => n.estado === 'trial').length,
    porVencer: negocios.filter(n => {
      if (!n.fechaVencimiento) return false
      const d = differenceInDays(new Date(n.fechaVencimiento), new Date())
      return d >= 0 && d <= 30
    }).length,
    vencidos: negocios.filter(n => estadoEfectivo(n) === 'vencido').length,
  }), [negocios])

  const filtered = useMemo(() => {
    let r = negocios
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(n => n.nombre.toLowerCase().includes(q) || n.ruc?.includes(q) || n.email?.toLowerCase().includes(q) || n.empresaId?.toLowerCase().includes(q))
    }
    if (filtroEstado !== 'todos') r = r.filter(n => estadoEfectivo(n) === filtroEstado)
    if (filtroPlan   !== 'todos') r = r.filter(n => n.plan   === filtroPlan)
    return r
  }, [negocios, search, filtroEstado, filtroPlan])

  function getAccessLink(empresaId) {
    return `${window.location.origin}/app/${empresaId}`
  }

  function copyLink(empresaId) {
    navigator.clipboard.writeText(getAccessLink(empresaId)).then(() => toast('Link copiado al portapapeles', 'success'))
  }

  function openNew() {
    setEditItem(null)
    setForm({ nombre:'', ruc:'', contacto:'', email:'', telefono:'', plan:'trial', estado:'trial', fechaRegistro:today(), fechaVencimiento:format(addDays(new Date(), 30), 'yyyy-MM-dd'), empresaId:'', password:'', notas:'', version:'StockPro v2.0' })
    setModal(true)
  }

  function openEdit(item) { setEditItem(item); setForm({ version:'StockPro v2.0', ...item }); setModal(true) }

  function save() {
    if (!form.nombre?.trim()) { toast('El nombre es requerido', 'error'); return }
    if (!form.empresaId?.trim()) { toast('El ID de empresa es requerido', 'error'); return }
    if (editItem) {
      setNegocios(prev => prev.map(n => n.id === editItem.id ? { ...form, id: editItem.id } : n))
      toast('Negocio actualizado', 'success')
    } else {
      setNegocios(prev => [...prev, { ...form, id: `neg_${uid()}` }])
      toast('Negocio registrado correctamente', 'success')
    }
    if (form.version?.trim() && form.empresaId?.trim()) {
      try {
        const key = `sp_${form.empresaId}_config`
        const existing = JSON.parse(localStorage.getItem(key) || 'null') || {}
        localStorage.setItem(key, JSON.stringify({ ...existing, version: form.version.trim() }))
      } catch {}
    }
    setModal(false)
  }

  function remove(id) {
    setNegocios(prev => prev.filter(n => n.id !== id))
    toast('Negocio eliminado', 'success')
  }

  const inp = 'w-full px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] placeholder-[#5f6f80] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20'
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const kpis = [
    { label:'Total registrados', value:stats.total,    color:'#3b82f6', icon:<Building2 size={32}/> },
    { label:'Activos',           value:stats.activos,  color:'#10b981', icon:<CheckCircle size={32}/> },
    { label:'Trial activo',      value:stats.trial,    color:'#6366f1', icon:<Clock size={32}/> },
    { label:'Por vencer (≤30d)', value:stats.porVencer,color:'#f59e0b', icon:<AlertTriangle size={32}/> },
    { label:'Vencidos',          value:stats.vencidos, color:'#ef4444', icon:<AlertTriangle size={32}/> },
  ]

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {kpis.map(k => <KpiCard key={k.label} label={k.label} value={k.value} accentColor={k.color} icon={k.icon} />)}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5f6f80]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, RUC, email o ID…" className={`${inp} pl-8`} />
        </div>
        <select value={filtroEstado} onChange={e => setFE(e.target.value)} className={`${inp} w-auto`}>
          <option value="todos">Todos los estados</option>
          {['activo','trial','suspendido','vencido','cancelado'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
        <select value={filtroPlan} onChange={e => setFP(e.target.value)} className={`${inp} w-auto`}>
          <option value="todos">Todos los planes</option>
          {planes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <Btn variant="primary" onClick={openNew}><Plus size={14}/> Nuevo negocio</Btn>
      </div>

      {/* Table */}
      {filtered.length === 0
        ? <EmptyState icon={Building2} title="No hay negocios" description="Registra el primer negocio para comenzar." action={<Btn variant="primary" onClick={openNew}><Plus size={14}/>Registrar negocio</Btn>} />
        : (
          <TableWrap>
            <thead>
              <tr><Th>Empresa</Th><Th>Plan</Th><Th>Estado</Th><Th>Vencimiento</Th><Th>Link de acceso</Th><Th>Contacto</Th><Th></Th></tr>
            </thead>
            <tbody>
              {filtered.map(n => {
                const plan  = planes.find(p => p.id === n.plan)
                const dias  = n.fechaVencimiento ? differenceInDays(new Date(n.fechaVencimiento), new Date()) : null
                const link  = n.empresaId ? getAccessLink(n.empresaId) : null
                return (
                  <tr key={n.id} className="border-t border-white/[0.05] hover:bg-white/[0.025] transition-colors">
                    <Td>
                      <div className="font-medium text-[#e8edf2]">{n.nombre}</div>
                      <div className="text-[11px] text-[#5f6f80]">ID: {n.empresaId} {n.ruc && `· RUC: ${n.ruc}`}</div>
                    </Td>
                    <Td>
                      {plan && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-semibold" style={{ background:`${plan.color}20`, color:plan.color }}>
                          {plan.nombre}
                        </span>
                      )}
                    </Td>
                    <Td><Badge variant={ESTADO_BADGE[estadoEfectivo(n)] || 'neutral'}>{estadoEfectivo(n)}</Badge></Td>
                    <Td>
                      {dias !== null ? (
                        <div>
                          <div className="text-[13px] text-[#e8edf2]">{n.fechaVencimiento}</div>
                          <div className={`text-[11px] ${dias < 0 ? 'text-red-400' : dias <= 7 ? 'text-red-400' : dias <= 30 ? 'text-yellow-400' : 'text-[#5f6f80]'}`}>
                            {dias < 0 ? `Vencido hace ${-dias}d` : dias === 0 ? 'Vence hoy' : `${dias}d restantes`}
                          </div>
                        </div>
                      ) : '—'}
                    </Td>
                    <Td>
                      {link ? (
                        <div className="flex items-center gap-1.5 max-w-[200px]">
                          <span className="text-[11px] text-[#5f6f80] font-mono truncate" title={link}>
                            /app/{n.empresaId}
                          </span>
                          <button
                            onClick={() => copyLink(n.empresaId)}
                            title="Copiar link de acceso"
                            className="shrink-0 p-1 rounded hover:bg-white/10 text-[#5f6f80] hover:text-[#00c896] transition-colors"
                          >
                            <Link2 size={12}/>
                          </button>
                        </div>
                      ) : '—'}
                    </Td>
                    <Td muted>
                      <div className="text-[12px]">{n.contacto}</div>
                      <div className="text-[11px] text-[#5f6f80]">{n.email}</div>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1 justify-end">
                        <Btn variant="ghost" size="icon" onClick={() => openEdit(n)} title="Editar"><Edit2 size={13}/></Btn>
                        <Btn variant="danger" size="icon" onClick={() => setConfirmDel(n)} title="Eliminar"><Trash2 size={13}/></Btn>
                      </div>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </TableWrap>
        )
      }

      {/* Modal add/edit */}
      <Modal open={modalOpen} onClose={() => setModal(false)} title={editItem ? 'Editar Negocio' : 'Registrar Nuevo Negocio'} size="lg"
        footer={<>
          <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn variant="primary" onClick={save}><Save size={14}/>{editItem ? 'Guardar cambios' : 'Registrar negocio'}</Btn>
        </>}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nombre del negocio *" className="col-span-2">
            <input className={`${inp} col-span-2`} value={form.nombre||''} onChange={e => f('nombre',e.target.value)} placeholder="Empresa XYZ S.A.C." />
          </Field>
          <Field label="RUC / Identificación fiscal">
            <input className={inp} value={form.ruc||''} onChange={e => f('ruc',e.target.value)} placeholder="20123456789" />
          </Field>
          <Field label="Contacto principal">
            <input className={inp} value={form.contacto||''} onChange={e => f('contacto',e.target.value)} placeholder="Juan Pérez" />
          </Field>
          <Field label="Email">
            <input type="email" className={inp} value={form.email||''} onChange={e => f('email',e.target.value)} placeholder="contacto@empresa.com" />
          </Field>
          <Field label="Teléfono">
            <input className={inp} value={form.telefono||''} onChange={e => f('telefono',e.target.value)} placeholder="+51 999 888 777" />
          </Field>
          <Field label="Código URL (slug de acceso) *">
            <input className={inp} value={form.empresaId||''} onChange={e => f('empresaId', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))} placeholder="mi-empresa" />
            {form.empresaId && (
              <div className="flex items-center gap-2 mt-1.5 px-2.5 py-1.5 bg-[#00c896]/8 border border-[#00c896]/20 rounded-lg">
                <Link2 size={11} className="text-[#00c896] shrink-0"/>
                <span className="text-[11px] text-[#00c896] font-mono truncate">
                  {window.location.origin}/app/{form.empresaId}
                </span>
              </div>
            )}
          </Field>
          <Field label="Contraseña de acceso">
            <div className="relative">
              <input type={showPass?'text':'password'} className={`${inp} pr-10`} value={form.password||''} onChange={e => f('password',e.target.value)} placeholder="••••••••" />
              <button type="button" onClick={() => setShowPass(p=>!p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6f80] hover:text-[#e8edf2]">
                {showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
            </div>
          </Field>
          <Field label="Plan contratado">
            <select className={inp} value={form.plan||'trial'} onChange={e => {
              const selectedPlan = planes.find(p => p.id === e.target.value)
              f('plan', e.target.value)
              if (selectedPlan && !editItem) {
                f('fechaVencimiento', format(addDays(new Date(), selectedPlan.vigenciaDias || 30), 'yyyy-MM-dd'))
              }
            }}>
              {planes.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.precioMensual === 0 ? '(Gratis)' : `(S/ ${p.precioMensual}/mes)`}</option>)}
            </select>
          </Field>
          <Field label="Estado">
            <select className={inp} value={form.estado||'trial'} onChange={e => f('estado',e.target.value)}>
              {['trial','activo','suspendido','cancelado'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </Field>
          <Field label="Fecha de registro">
            <input type="date" className={inp} value={form.fechaRegistro||''} onChange={e => f('fechaRegistro',e.target.value)} />
          </Field>
          <Field label="Fecha de vencimiento">
            <input type="date" className={inp} value={form.fechaVencimiento||''} onChange={e => f('fechaVencimiento',e.target.value)} />
          </Field>
          <div className="col-span-2">
            <Field label="Notas internas">
              <textarea rows={2} className={`${inp} resize-y`} value={form.notas||''} onChange={e => f('notas',e.target.value)} placeholder="Observaciones, acuerdos especiales…" />
            </Field>
          </div>
          <Field label="Versión del sistema" hint="Se propaga al Sidebar, Login y Configuración de esta empresa">
            <input className={inp} value={form.version||'StockPro v2.0'} onChange={e => f('version',e.target.value)} placeholder="StockPro v2.0" />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={() => remove(confirmDel?.id)}
        danger title="Eliminar negocio" message={`¿Confirmas la eliminación de "${confirmDel?.nombre}"? Esta acción no se puede deshacer.`} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// TAB: PLANES Y PRECIOS
// ══════════════════════════════════════════════════════════
function TabPlanes({ planes, setPlanes, toast }) {
  const [modalOpen, setModal]   = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm]         = useState({})
  const [newFeat, setNewFeat]   = useState('')
  const [confirmDel, setConfirmDel] = useState(null)

  function openNew() {
    setEditItem(null)
    setForm({ nombre:'', descripcion:'', precioMensual:0, precioAnual:0, moneda:'PEN', color:'#6366f1', destacado:false, activo:true, vigenciaDias:30, caracteristicas:[] })
    setModal(true)
  }

  function openEdit(p) { setEditItem(p); setForm({ ...p, caracteristicas:[...(p.caracteristicas||[])] }); setModal(true) }

  function save() {
    if (!form.nombre?.trim()) { toast('El nombre del plan es requerido', 'error'); return }
    if (editItem) {
      setPlanes(prev => prev.map(p => p.id === editItem.id ? { ...form, id:editItem.id } : p))
      toast('Plan actualizado', 'success')
    } else {
      setPlanes(prev => [...prev, { ...form, id: form.nombre.toLowerCase().replace(/\s+/g,'-') || uid() }])
      toast('Plan creado', 'success')
    }
    setModal(false)
  }

  function remove(id) { setPlanes(prev => prev.filter(p => p.id !== id)); toast('Plan eliminado', 'success') }
  function toggleActivo(id) { setPlanes(prev => prev.map(p => p.id === id ? { ...p, activo:!p.activo } : p)) }
  function toggleDestacado(id) { setPlanes(prev => prev.map(p => ({ ...p, destacado: p.id === id ? !p.destacado : false }))) }
  function addFeat() { if (!newFeat.trim()) return; setForm(p => ({ ...p, caracteristicas:[...(p.caracteristicas||[]), newFeat.trim()] })); setNewFeat('') }
  function removeFeat(i) { setForm(p => ({ ...p, caracteristicas: p.caracteristicas.filter((_,idx) => idx !== i) })) }

  const inp = 'w-full px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] placeholder-[#5f6f80] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20'
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-[#e8edf2]">Planes y Precios</h2>
          <p className="text-[12px] text-[#5f6f80] mt-0.5">Define los planes SaaS disponibles para tus clientes</p>
        </div>
        <Btn variant="primary" onClick={openNew}><Plus size={14}/>Nuevo plan</Btn>
      </div>

      {planes.length === 0
        ? <EmptyState icon={CreditCard} title="No hay planes definidos" action={<Btn variant="primary" onClick={openNew}><Plus size={14}/>Crear plan</Btn>} />
        : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {planes.map(p => (
              <div key={p.id} className={`relative bg-[#161d28] border rounded-xl overflow-hidden transition-all ${p.destacado ? 'border-[#00c896]/40 shadow-[0_0_20px_rgba(0,200,150,0.08)]' : 'border-white/[0.08]'}`}>
                <div className="h-1 w-full" style={{ background: p.color }} />
                {p.destacado && (
                  <div className="absolute top-3 right-3">
                    <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#00c896]/15 text-[#00c896]">
                      <Star size={10} fill="currentColor" /> Destacado
                    </span>
                  </div>
                )}
                {!p.activo && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl z-10">
                    <Badge variant="neutral">Inactivo</Badge>
                  </div>
                )}
                <div className="p-5">
                  <h3 className="text-[17px] font-bold text-[#e8edf2] mb-1">{p.nombre}</h3>
                  <p className="text-[12px] text-[#5f6f80] mb-4">{p.descripcion}</p>
                  <div className="mb-4">
                    <span className="text-[28px] font-extrabold text-[#e8edf2]">{p.precioMensual === 0 ? 'Gratis' : `S/ ${p.precioMensual}`}</span>
                    {p.precioMensual > 0 && <span className="text-[13px] text-[#5f6f80]">/mes</span>}
                    {p.precioAnual > 0 && (
                      <div className="text-[12px] text-[#5f6f80] mt-0.5">S/ {p.precioAnual}/año <span className="text-emerald-400">(ahorra {Math.round(100-(p.precioAnual/(p.precioMensual*12)*100))}%)</span></div>
                    )}
                  </div>
                  <ul className="space-y-1.5 mb-5">
                    {(p.caracteristicas||[]).map((c, i) => (
                      <li key={i} className="flex items-center gap-2 text-[12px] text-[#9ba8b6]">
                        <CheckCircle size={12} className="shrink-0" style={{ color: p.color }} />{c}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
                    <Btn variant="ghost" size="sm" onClick={() => openEdit(p)}><Edit2 size={12}/>Editar</Btn>
                    <Btn variant="ghost" size="sm" onClick={() => toggleActivo(p.id)}>{p.activo ? 'Desactivar' : 'Activar'}</Btn>
                    <Btn variant="ghost" size="sm" onClick={() => toggleDestacado(p.id)}><Star size={12}/>Destacar</Btn>
                    <Btn variant="danger" size="icon" onClick={() => setConfirmDel(p)} title="Eliminar"><Trash2 size={12}/></Btn>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      }

      <Modal open={modalOpen} onClose={() => setModal(false)} title={editItem ? `Editar plan: ${editItem.nombre}` : 'Crear nuevo plan'} size="lg"
        footer={<>
          <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn variant="primary" onClick={save}><Save size={14}/>{editItem ? 'Guardar cambios' : 'Crear plan'}</Btn>
        </>}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field label="Nombre del plan *">
              <input className={inp} value={form.nombre||''} onChange={e => f('nombre',e.target.value)} placeholder="Pro, Enterprise…" />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Descripción corta">
              <input className={inp} value={form.descripcion||''} onChange={e => f('descripcion',e.target.value)} placeholder="Breve descripción para los clientes" />
            </Field>
          </div>
          <Field label="Precio mensual (S/)">
            <input type="number" min="0" className={inp} value={form.precioMensual||0} onChange={e => f('precioMensual', parseFloat(e.target.value)||0)} />
          </Field>
          <Field label="Precio anual (S/)">
            <input type="number" min="0" className={inp} value={form.precioAnual||0} onChange={e => f('precioAnual', parseFloat(e.target.value)||0)} />
          </Field>
          <Field label="Vigencia por defecto (días)">
            <input type="number" min="1" className={inp} value={form.vigenciaDias||30} onChange={e => f('vigenciaDias', parseInt(e.target.value)||30)} />
          </Field>
          <Field label="Color de acento">
            <div className="flex items-center gap-2">
              <input type="color" value={form.color||'#6366f1'} onChange={e => f('color',e.target.value)} className="w-10 h-9 rounded cursor-pointer bg-transparent border border-white/[0.08]" />
              <input className={`${inp} flex-1`} value={form.color||''} onChange={e => f('color',e.target.value)} placeholder="#6366f1" />
            </div>
          </Field>
          <Field label="Moneda">
            <select className={inp} value={form.moneda||'USD'} onChange={e => f('moneda',e.target.value)}>
              <option>USD</option><option>PEN</option><option>EUR</option>
            </select>
          </Field>
          <div className="col-span-2 flex items-center gap-6">
            <Toggle value={!!form.activo} onChange={v => f('activo',v)} label="Plan activo (visible para clientes)" />
            <Toggle value={!!form.destacado} onChange={v => f('destacado',v)} label="Destacar este plan" />
          </div>
          <div className="col-span-2">
            <Field label="Características incluidas">
              <div className="space-y-1.5 mb-2">
                {(form.caracteristicas||[]).map((c, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[#1a2230] px-3 py-1.5 rounded-lg">
                    <CheckCircle size={12} className="text-[#00c896] shrink-0" />
                    <span className="flex-1 text-[13px] text-[#e8edf2]">{c}</span>
                    <button onClick={() => removeFeat(i)} className="text-[#5f6f80] hover:text-red-400"><Trash2 size={12}/></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input className={`${inp} flex-1`} value={newFeat} onChange={e => setNewFeat(e.target.value)} onKeyDown={e => e.key==='Enter' && addFeat()} placeholder="Agregar característica…" />
                <Btn variant="secondary" onClick={addFeat}><Plus size={14}/>Agregar</Btn>
              </div>
            </Field>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={() => remove(confirmDel?.id)}
        danger title="Eliminar plan" message={`¿Eliminar el plan "${confirmDel?.nombre}"? Los negocios con este plan no serán afectados.`} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// TAB: HISTORIAL DE RENOVACIONES
// ══════════════════════════════════════════════════════════
function TabRenovaciones({ renovaciones, setRenovaciones, negocios, planes, toast }) {
  const [modalOpen, setModal]     = useState(false)
  const [form, setForm]           = useState({})
  const [filtroNeg, setFiltroNeg] = useState('todos')
  const [filtroEst, setFiltroEst] = useState('todos')
  const [search, setSearch]       = useState('')
  const [confirmDel, setConfirmDel] = useState(null)

  const stats = useMemo(() => {
    const hoy = new Date()
    const mesActual = renovaciones.filter(r => {
      const d = new Date(r.fechaPago)
      return d.getFullYear() === hoy.getFullYear() && d.getMonth() === hoy.getMonth()
    })
    return {
      total: renovaciones.length,
      montoTotal: renovaciones.reduce((s,r) => s + (r.monto||0), 0),
      montoMes: mesActual.reduce((s,r) => s + (r.monto||0), 0),
      pendientes: renovaciones.filter(r => r.estado === 'pendiente').length,
    }
  }, [renovaciones])

  const filtered = useMemo(() => {
    let r = [...renovaciones].sort((a,b) => b.fechaPago?.localeCompare(a.fechaPago))
    if (filtroNeg !== 'todos') r = r.filter(x => x.negocioId === filtroNeg)
    if (filtroEst !== 'todos') r = r.filter(x => x.estado   === filtroEst)
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(x => x.negocioNombre?.toLowerCase().includes(q) || x.comprobante?.toLowerCase().includes(q))
    }
    return r
  }, [renovaciones, filtroNeg, filtroEst, search])

  function openNew() {
    setForm({ negocioId:'', negocioNombre:'', plan:'basico', monto:0, moneda:'PEN', ciclo:'anual', fechaPago:today(), metodoPago:'tarjeta', periodoInicio:today(), periodoFin:'', estado:'pagado', comprobante:`REC-${new Date().getFullYear()}-${String(renovaciones.length+1).padStart(3,'0')}` })
    setModal(true)
  }

  function save() {
    if (!form.negocioId) { toast('Selecciona un negocio', 'error'); return }
    const neg = negocios.find(n => n.id === form.negocioId)
    setRenovaciones(prev => [...prev, { ...form, id:`ren_${uid()}`, negocioNombre: neg?.nombre || form.negocioNombre }])
    toast('Renovación registrada', 'success')
    setModal(false)
  }

  const inp = 'w-full px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] placeholder-[#5f6f80] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20'
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const montoTotal = filtered.reduce((s,r) => s + (r.monto||0), 0)

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total renovaciones" value={stats.total} accentColor="#3b82f6" icon={<RefreshCw size={32}/>} />
        <KpiCard label="Monto total" value={`$${stats.montoTotal.toLocaleString()}`} accentColor="#10b981" icon={<DollarSign size={32}/>} mono />
        <KpiCard label="Monto este mes" value={`$${stats.montoMes.toLocaleString()}`} accentColor="#00c896" icon={<Calendar size={32}/>} mono />
        <KpiCard label="Pendientes de pago" value={stats.pendientes} accentColor="#f59e0b" icon={<Clock size={32}/>} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5f6f80]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar empresa o comprobante…" className={`${inp} pl-8`} />
        </div>
        <select value={filtroNeg} onChange={e => setFiltroNeg(e.target.value)} className={`${inp} w-auto`}>
          <option value="todos">Todos los negocios</option>
          {negocios.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
        </select>
        <select value={filtroEst} onChange={e => setFiltroEst(e.target.value)} className={`${inp} w-auto`}>
          <option value="todos">Todos los estados</option>
          {['pagado','pendiente','fallido','anulado'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
        <Btn variant="primary" onClick={openNew}><Plus size={14}/>Registrar pago</Btn>
      </div>

      {filtered.length > 0 && (
        <div className="text-[12px] text-[#5f6f80]">
          Mostrando {filtered.length} registros · Total filtrado: <span className="text-[#00c896] font-semibold">${montoTotal.toLocaleString()} USD</span>
        </div>
      )}

      {filtered.length === 0
        ? <EmptyState icon={RefreshCw} title="Sin renovaciones" description="Registra el primer pago para comenzar el historial." action={<Btn variant="primary" onClick={openNew}><Plus size={14}/>Registrar pago</Btn>} />
        : (
          <TableWrap>
            <thead>
              <tr><Th>Empresa</Th><Th>Plan</Th><Th>Período</Th><Th>Monto</Th><Th>Método</Th><Th>Comprobante</Th><Th>Estado</Th><Th></Th></tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const plan = planes.find(p => p.id === r.plan)
                const estadoVariant = { pagado:'success', pendiente:'warning', fallido:'danger', anulado:'neutral' }
                return (
                  <tr key={r.id} className="border-t border-white/[0.05] hover:bg-white/[0.025]">
                    <Td>
                      <div className="font-medium text-[#e8edf2]">{r.negocioNombre}</div>
                      <div className="text-[11px] text-[#5f6f80]">{r.fechaPago}</div>
                    </Td>
                    <Td>
                      {plan && <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full" style={{ background:`${plan.color}20`, color:plan.color }}>{plan.nombre}</span>}
                    </Td>
                    <Td muted>
                      <div className="text-[12px]">{r.periodoInicio}</div>
                      <div className="text-[11px] text-[#5f6f80]">→ {r.periodoFin}</div>
                    </Td>
                    <Td mono><span className="text-[#00c896] font-bold">${(r.monto||0).toLocaleString()}</span> <span className="text-[11px] text-[#5f6f80]">{r.moneda}</span></Td>
                    <Td muted>{r.metodoPago}</Td>
                    <Td mono muted>{r.comprobante}</Td>
                    <Td><Badge variant={estadoVariant[r.estado]||'neutral'}>{r.estado}</Badge></Td>
                    <Td>
                      <Btn variant="danger" size="icon" onClick={() => setConfirmDel(r)} title="Eliminar"><Trash2 size={12}/></Btn>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </TableWrap>
        )
      }

      <Modal open={modalOpen} onClose={() => setModal(false)} title="Registrar Renovación / Pago" size="md"
        footer={<>
          <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn variant="primary" onClick={save}><Save size={14}/>Registrar pago</Btn>
        </>}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field label="Empresa *">
              <select className={inp} value={form.negocioId||''} onChange={e => f('negocioId',e.target.value)}>
                <option value="">Seleccionar negocio…</option>
                {negocios.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Plan">
            <select className={inp} value={form.plan||'pro'} onChange={e => f('plan',e.target.value)}>
              {planes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Field>
          <Field label="Ciclo">
            <select className={inp} value={form.ciclo||'mensual'} onChange={e => f('ciclo',e.target.value)}>
              <option value="mensual">Mensual</option>
              <option value="anual">Anual</option>
            </select>
          </Field>
          <Field label="Monto">
            <input type="number" min="0" className={inp} value={form.monto||''} onChange={e => f('monto',parseFloat(e.target.value)||0)} />
          </Field>
          <Field label="Moneda">
            <select className={inp} value={form.moneda||'USD'} onChange={e => f('moneda',e.target.value)}>
              <option>USD</option><option>PEN</option><option>EUR</option>
            </select>
          </Field>
          <Field label="Fecha de pago">
            <input type="date" className={inp} value={form.fechaPago||''} onChange={e => f('fechaPago',e.target.value)} />
          </Field>
          <Field label="Método de pago">
            <select className={inp} value={form.metodoPago||'tarjeta'} onChange={e => f('metodoPago',e.target.value)}>
              {['tarjeta','transferencia','efectivo','paypal','yape'].map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
            </select>
          </Field>
          <Field label="Inicio del período">
            <input type="date" className={inp} value={form.periodoInicio||''} onChange={e => f('periodoInicio',e.target.value)} />
          </Field>
          <Field label="Fin del período">
            <input type="date" className={inp} value={form.periodoFin||''} onChange={e => f('periodoFin',e.target.value)} />
          </Field>
          <Field label="N° Comprobante">
            <input className={inp} value={form.comprobante||''} onChange={e => f('comprobante',e.target.value)} />
          </Field>
          <Field label="Estado">
            <select className={inp} value={form.estado||'pagado'} onChange={e => f('estado',e.target.value)}>
              {['pagado','pendiente','fallido','anulado'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </Field>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={() => { setRenovaciones(prev => prev.filter(r => r.id !== confirmDel?.id)); toast('Renovación eliminada', 'success') }}
        danger title="Eliminar registro" message="¿Eliminar este registro de renovación? No afecta el estado del negocio." />
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// TAB: LÍMITES DEL PLAN
// ══════════════════════════════════════════════════════════
function TabLimites({ limites, setLimites, planes, toast }) {
  const [activePlan, setActivePlan] = useState(planes[0]?.id || '')
  const [localForm, setLocalForm]   = useState({})

  useEffect(() => {
    const current = limites[activePlan] || {}
    setLocalForm({ maxUsuarios:1, maxProductos:100, maxAlmacenes:1, maxProveedores:10, maxClientes:20, maxOrdenesMes:50, almacenamientoGB:1, soporte:'email', apiAccess:false, multiEmpresa:false, exportAvanzada:false, reportesAvanzados:false, ...current })
  }, [activePlan, limites])

  function save() {
    setLimites(prev => ({ ...prev, [activePlan]: { ...localForm } }))
    toast(`Límites del plan "${activePlan}" guardados`, 'success')
  }

  const plan = planes.find(p => p.id === activePlan)
  const inp = 'w-full px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] placeholder-[#5f6f80] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20'
  const s = (k, v) => setLocalForm(p => ({ ...p, [k]: v }))

  const numFields = [
    { key:'maxUsuarios',    label:'Máx. usuarios',          hint:'-1 = ilimitado', icon:<Users size={14}/> },
    { key:'maxProductos',   label:'Máx. productos',         hint:'-1 = ilimitado', icon:<Package size={14}/> },
    { key:'maxAlmacenes',   label:'Máx. almacenes',         hint:'-1 = ilimitado', icon:<Database size={14}/> },
    { key:'maxProveedores', label:'Máx. proveedores',       hint:'-1 = ilimitado', icon:<Tag size={14}/> },
    { key:'maxClientes',    label:'Máx. clientes',          hint:'-1 = ilimitado', icon:<Users size={14}/> },
    { key:'maxOrdenesMes',  label:'Máx. órdenes/mes',       hint:'-1 = ilimitado', icon:<Hash size={14}/> },
    { key:'almacenamientoGB', label:'Almacenamiento (GB)',  hint:'para archivos e imágenes', icon:<Database size={14}/> },
  ]

  const toggleFields = [
    { key:'apiAccess',       label:'Acceso API',            desc:'Permite conexión vía API REST' },
    { key:'multiEmpresa',    label:'Multi-empresa',         desc:'Gestionar múltiples empresas en una cuenta' },
    { key:'exportAvanzada',  label:'Exportación avanzada',  desc:'PDF, Excel, CSV con reportes personalizados' },
    { key:'reportesAvanzados',label:'Reportes avanzados',   desc:'Dashboards KPI, previsión de demanda, SUNAT' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-[#e8edf2]">Límites por Plan</h2>
          <p className="text-[12px] text-[#5f6f80] mt-0.5">Configura los límites operativos de cada plan SaaS</p>
        </div>
      </div>

      {/* Plan selector */}
      <div className="flex gap-2 flex-wrap">
        {planes.map(p => (
          <button key={p.id} onClick={() => setActivePlan(p.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium border transition-all ${activePlan === p.id ? 'text-[#e8edf2] border-opacity-40' : 'border-white/[0.08] text-[#5f6f80] hover:text-[#e8edf2] hover:bg-white/5'}`}
            style={activePlan === p.id ? { borderColor: p.color, background:`${p.color}15`, color: p.color } : {}}>
            {p.nombre}
          </button>
        ))}
      </div>

      {plan && (
        <div className="bg-[#161d28] border border-white/[0.08] rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/[0.06]">
            <div className="w-3 h-3 rounded-full" style={{ background: plan.color }} />
            <h3 className="text-[15px] font-semibold text-[#e8edf2]">Plan {plan.nombre}</h3>
            <span className="text-[12px] text-[#5f6f80]">{plan.descripcion}</span>
          </div>

          {/* Numeric limits */}
          <div>
            <p className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide mb-4">Límites cuantitativos · (-1 = ilimitado)</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {numFields.map(field => (
                <Field key={field.key} label={field.label} hint={field.hint}>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5f6f80]">{field.icon}</span>
                    <input type="number" className={`${inp} pl-8`} value={localForm[field.key]??''} onChange={e => s(field.key, parseInt(e.target.value)||0)} />
                  </div>
                </Field>
              ))}
              <Field label="Tipo de soporte">
                <select className={inp} value={localForm.soporte||'email'} onChange={e => s('soporte',e.target.value)}>
                  <option value="email">Email</option>
                  <option value="prioritario">Prioritario</option>
                  <option value="24/7">24/7 dedicado</option>
                </select>
              </Field>
            </div>
          </div>

          {/* Toggle features */}
          <div>
            <p className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide mb-4">Funcionalidades incluidas</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {toggleFields.map(field => (
                <div key={field.key} className="flex items-center justify-between p-4 bg-[#1a2230] rounded-lg border border-white/[0.06]">
                  <div>
                    <div className="text-[13px] font-medium text-[#e8edf2]">{field.label}</div>
                    <div className="text-[11px] text-[#5f6f80] mt-0.5">{field.desc}</div>
                  </div>
                  <Toggle value={!!localForm[field.key]} onChange={v => s(field.key, v)} />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-white/[0.06]">
            <Btn variant="primary" onClick={save}><Save size={14}/>Guardar límites del plan {plan.nombre}</Btn>
          </div>
        </div>
      )}

      {planes.length === 0 && <Alert variant="info">Primero crea al menos un plan en la pestaña "Planes y Precios".</Alert>}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// TAB: ALERTAS DE VENCIMIENTO
// ══════════════════════════════════════════════════════════
function TabAlertas({ alertas, setAlertas, negocios, planes, toast }) {
  const [modalOpen, setModal]   = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm]         = useState({})
  const [confirmDel, setConfirmDel] = useState(null)
  const CANALES = ['email', 'sistema', 'whatsapp', 'sms']

  const proximosVencimientos = useMemo(() => {
    const hoy = new Date()
    return negocios
      .filter(n => n.fechaVencimiento && n.estado !== 'cancelado')
      .map(n => {
        const dias = differenceInDays(new Date(n.fechaVencimiento), hoy)
        const plan = planes.find(p => p.id === n.plan)
        const reglasActivas = alertas.filter(a => a.activa && dias >= 0 && dias <= a.diasAntes).sort((a,b) => a.diasAntes - b.diasAntes)
        return { ...n, dias, plan, reglasActivas }
      })
      .filter(n => n.dias <= 30)
      .sort((a, b) => a.dias - b.dias)
  }, [negocios, alertas, planes])

  function openNew() {
    setEditItem(null)
    setForm({ diasAntes:7, activa:true, canales:['email','sistema'], asunto:'', mensaje:'' })
    setModal(true)
  }
  function openEdit(a) { setEditItem(a); setForm({ ...a, canales:[...(a.canales||[])] }); setModal(true) }

  function save() {
    if (!form.asunto?.trim()) { toast('El asunto es requerido', 'error'); return }
    if (editItem) {
      setAlertas(prev => prev.map(a => a.id === editItem.id ? { ...form, id:editItem.id } : a))
      toast('Regla de alerta actualizada', 'success')
    } else {
      setAlertas(prev => [...prev, { ...form, id:`al_${uid()}` }])
      toast('Regla de alerta creada', 'success')
    }
    setModal(false)
  }

  function remove(id) { setAlertas(prev => prev.filter(a => a.id !== id)); toast('Regla eliminada', 'success') }
  function toggleActiva(id) { setAlertas(prev => prev.map(a => a.id === id ? { ...a, activa:!a.activa } : a)) }
  function toggleCanal(canal) {
    setForm(p => {
      const cs = p.canales || []
      return { ...p, canales: cs.includes(canal) ? cs.filter(c => c !== canal) : [...cs, canal] }
    })
  }

  const inp = 'w-full px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] placeholder-[#5f6f80] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20'
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="space-y-6">
      {/* Reglas */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[15px] font-semibold text-[#e8edf2]">Reglas de Alerta</h2>
            <p className="text-[12px] text-[#5f6f80] mt-0.5">Define cuándo y cómo se notifica a los clientes sobre el vencimiento de su plan</p>
          </div>
          <Btn variant="primary" onClick={openNew}><Plus size={14}/>Nueva regla</Btn>
        </div>

        {alertas.length === 0
          ? <EmptyState icon={Bell} title="Sin reglas de alerta" action={<Btn variant="primary" onClick={openNew}><Plus size={14}/>Crear regla</Btn>} />
          : (
            <div className="space-y-2">
              {[...alertas].sort((a,b) => a.diasAntes - b.diasAntes).map(a => (
                <div key={a.id} className={`flex items-start gap-4 p-4 bg-[#161d28] rounded-xl border transition-all ${a.activa ? 'border-white/[0.08]' : 'border-white/[0.04] opacity-60'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-[13px] ${a.diasAntes <= 7 ? 'bg-red-500/15 text-red-400' : a.diasAntes <= 15 ? 'bg-yellow-500/15 text-yellow-400' : 'bg-blue-500/15 text-blue-400'}`}>
                    {a.diasAntes}d
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[13px] font-semibold text-[#e8edf2]">{a.asunto}</span>
                      <Badge variant={a.activa ? 'success' : 'neutral'}>{a.activa ? 'Activa' : 'Inactiva'}</Badge>
                    </div>
                    <p className="text-[12px] text-[#5f6f80] truncate">{a.mensaje}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      {(a.canales||[]).map(c => (
                        <span key={c} className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.06] text-[#9ba8b6]">{c}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Toggle value={a.activa} onChange={() => toggleActiva(a.id)} />
                    <Btn variant="ghost" size="icon" onClick={() => openEdit(a)}><Edit2 size={13}/></Btn>
                    <Btn variant="danger" size="icon" onClick={() => setConfirmDel(a)}><Trash2 size={13}/></Btn>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>

      {/* Vencimientos próximos */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Clock size={15} className="text-[#00c896]" />
          <h3 className="text-[14px] font-semibold text-[#e8edf2]">Vencimientos próximos (≤30 días)</h3>
          <Badge variant={proximosVencimientos.length > 0 ? 'warning' : 'success'}>{proximosVencimientos.length}</Badge>
        </div>
        {proximosVencimientos.length === 0 ? (
          <Alert variant="success">No hay vencimientos próximos en los próximos 30 días.</Alert>
        ) : (
          <TableWrap>
            <thead>
              <tr><Th>Empresa</Th><Th>Plan</Th><Th>Vencimiento</Th><Th>Días restantes</Th><Th>Estado</Th><Th>Alertas a enviar</Th></tr>
            </thead>
            <tbody>
              {proximosVencimientos.map(n => (
                <tr key={n.id} className="border-t border-white/[0.05] hover:bg-white/[0.025]">
                  <Td>
                    <div className="font-medium text-[#e8edf2]">{n.nombre}</div>
                    <div className="text-[11px] text-[#5f6f80]">{n.email}</div>
                  </Td>
                  <Td>
                    {n.plan && <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full" style={{ background:`${n.plan.color}20`, color:n.plan.color }}>{n.plan.nombre}</span>}
                  </Td>
                  <Td muted>{n.fechaVencimiento}</Td>
                  <Td>
                    <span className={`font-bold text-[14px] ${n.dias <= 0 ? 'text-red-400' : n.dias <= 7 ? 'text-red-400' : n.dias <= 15 ? 'text-yellow-400' : 'text-blue-400'}`}>
                      {n.dias <= 0 ? 'VENCIDO' : `${n.dias} días`}
                    </span>
                  </Td>
                  <Td><Badge variant={ESTADO_BADGE[estadoEfectivo(n)]||'neutral'}>{estadoEfectivo(n)}</Badge></Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {n.reglasActivas.length > 0
                        ? n.reglasActivas.map(r => <span key={r.id} className="text-[11px] px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full">{r.diasAntes}d</span>)
                        : <span className="text-[11px] text-[#5f6f80]">—</span>
                      }
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModal(false)} title={editItem ? 'Editar regla de alerta' : 'Nueva regla de alerta'} size="md"
        footer={<>
          <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn variant="primary" onClick={save}><Save size={14}/>{editItem ? 'Guardar cambios' : 'Crear regla'}</Btn>
        </>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Días antes del vencimiento">
              <input type="number" min="1" max="365" className={inp} value={form.diasAntes||7} onChange={e => f('diasAntes',parseInt(e.target.value)||1)} />
            </Field>
            <Field label="Estado">
              <div className="flex items-center h-9">
                <Toggle value={!!form.activa} onChange={v => f('activa',v)} label="Regla activa" />
              </div>
            </Field>
          </div>
          <Field label="Asunto del mensaje *">
            <input className={inp} value={form.asunto||''} onChange={e => f('asunto',e.target.value)} placeholder="¡Plan próximo a vencer!" />
          </Field>
          <Field label="Mensaje" hint="Variables: {plan} = nombre del plan, {dias} = días restantes, {empresa} = nombre del negocio">
            <textarea rows={3} className={`${inp} resize-y`} value={form.mensaje||''} onChange={e => f('mensaje',e.target.value)} placeholder="Tu plan {plan} vence en {dias} días…" />
          </Field>
          <Field label="Canales de notificación">
            <div className="flex flex-wrap gap-2 mt-1">
              {CANALES.map(c => {
                const active = (form.canales||[]).includes(c)
                return (
                  <button key={c} type="button" onClick={() => toggleCanal(c)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${active ? 'bg-[#00c896]/15 border-[#00c896]/40 text-[#00c896]' : 'bg-[#1a2230] border-white/[0.08] text-[#5f6f80] hover:text-[#e8edf2]'}`}>
                    {active && <CheckCircle size={12}/>}{c}
                  </button>
                )
              })}
            </div>
          </Field>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={() => remove(confirmDel?.id)}
        danger title="Eliminar regla" message={`¿Eliminar la regla "${confirmDel?.asunto}"?`} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// TAB: LANDING PAGE CONFIG
// ══════════════════════════════════════════════════════════
function TabLanding({ landing, setLanding, planes, toast }) {
  const [section, setSection] = useState('sitio')
  const [local, setLocal]     = useState(() => JSON.parse(JSON.stringify(landing)))
  const [featModal, setFeatModal] = useState(false)
  const [editFeat, setEditFeat]   = useState(null)
  const [featForm, setFeatForm]   = useState({})

  const set = (path, value) => {
    setLocal(prev => {
      const copy = JSON.parse(JSON.stringify(prev))
      const keys = path.split('.')
      let obj = copy
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]]
      obj[keys[keys.length - 1]] = value
      return copy
    })
  }

  function save() {
    setLanding(JSON.parse(JSON.stringify(local)))
    toast('Configuración de landing guardada', 'success')
  }

  function openNewFeat() { setEditFeat(null); setFeatForm({ icono:'⭐', titulo:'', descripcion:'' }); setFeatModal(true) }
  function openEditFeat(f) { setEditFeat(f); setFeatForm({ ...f }); setFeatModal(true) }
  function saveFeat() {
    if (!featForm.titulo?.trim()) { toast('El título es requerido', 'error'); return }
    if (editFeat) {
      setLocal(p => ({ ...p, caracteristicas: p.caracteristicas.map(c => c.id === editFeat.id ? { ...featForm, id:editFeat.id } : c) }))
    } else {
      setLocal(p => ({ ...p, caracteristicas: [...p.caracteristicas, { ...featForm, id:`cf_${uid()}` }] }))
    }
    setFeatModal(false)
  }
  function removeFeat(id) { setLocal(p => ({ ...p, caracteristicas: p.caracteristicas.filter(c => c.id !== id) })) }

  const inp = 'w-full px-3 py-2 bg-[#1e2835] border border-white/[0.08] rounded-lg text-[13px] text-[#e8edf2] placeholder-[#5f6f80] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20'
  const lbl = (label, hint) => (
    <div>
      <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1">{label}</label>
      {hint && <p className="text-[11px] text-[#5f6f80] mb-1.5">{hint}</p>}
    </div>
  )

  const SECTIONS = [
    { id:'sitio', label:'Sitio', icon: Settings },
    { id:'hero', label:'Sección Hero', icon: Megaphone },
    { id:'caracteristicas', label:'Características', icon: Star },
    { id:'contacto', label:'Contacto & Redes', icon: Mail },
    { id:'seo', label:'SEO & Footer', icon: BarChart3 },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-[#e8edf2]">Configuración del Sitio Web / Landing Page</h2>
          <p className="text-[12px] text-[#5f6f80] mt-0.5">Esta información se usará para publicar y promocionar el sistema</p>
        </div>
        <Btn variant="primary" onClick={save}><Save size={14}/>Guardar todo</Btn>
      </div>

      {/* Sub-nav */}
      <div className="flex gap-1 border-b border-white/[0.06] pb-0">
        {SECTIONS.map(s => {
          const Icon = s.icon
          const active = section === s.id
          return (
            <button key={s.id} onClick={() => setSection(s.id)}
              className={`flex items-center gap-2 px-3 py-2 text-[12px] font-medium rounded-t border-b-2 -mb-px transition-colors ${active ? 'text-[#00c896] border-[#00c896]' : 'text-[#5f6f80] border-transparent hover:text-[#e8edf2]'}`}>
              <Icon size={13}/>{s.label}
            </button>
          )
        })}
      </div>

      {/* SITIO */}
      {section === 'sitio' && (
        <Card>
          <CardHeader title="Información general del sitio" />
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              {lbl('Nombre del producto / marca')}
              <input className={inp} value={local.sitio?.nombre||''} onChange={e => set('sitio.nombre',e.target.value)} placeholder="StockPro" />
            </div>
            <div className="col-span-2">
              {lbl('Tagline', 'Frase corta descriptiva')}
              <input className={inp} value={local.sitio?.tagline||''} onChange={e => set('sitio.tagline',e.target.value)} placeholder="Logística inteligente para tu empresa" />
            </div>
            <div className="col-span-2">
              {lbl('Descripción', 'Texto descriptivo completo del producto')}
              <textarea rows={3} className={`${inp} resize-y`} value={local.sitio?.descripcion||''} onChange={e => set('sitio.descripcion',e.target.value)} />
            </div>
            <div>
              {lbl('Color primario')}
              <div className="flex items-center gap-2">
                <input type="color" value={local.sitio?.colorPrimario||'#00c896'} onChange={e => set('sitio.colorPrimario',e.target.value)} className="w-10 h-9 rounded cursor-pointer bg-transparent border border-white/[0.08]" />
                <input className={`${inp} flex-1`} value={local.sitio?.colorPrimario||''} onChange={e => set('sitio.colorPrimario',e.target.value)} />
              </div>
            </div>
            <div>
              {lbl('URL del logo')}
              <div className="flex items-center gap-2">
                <Link2 size={13} className="text-[#5f6f80] shrink-0" />
                <input className={inp} value={local.sitio?.logoUrl||''} onChange={e => set('sitio.logoUrl',e.target.value)} placeholder="https://…" />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* HERO */}
      {section === 'hero' && (
        <Card>
          <CardHeader title="Sección Hero (portada principal)" />
          <div className="space-y-4">
            {lbl('Título principal')}
            <input className={inp} value={local.hero?.titulo||''} onChange={e => set('hero.titulo',e.target.value)} placeholder="Controla tu logística con precisión" />
            {lbl('Subtítulo')}
            <textarea rows={2} className={`${inp} resize-y`} value={local.hero?.subtitulo||''} onChange={e => set('hero.subtitulo',e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              {lbl('CTA principal — texto')}
              <input className={inp} value={local.hero?.ctaTexto||''} onChange={e => set('hero.ctaTexto',e.target.value)} placeholder="Comenzar prueba gratis" />
              {lbl('CTA principal — URL')}
              <input className={inp} value={local.hero?.ctaUrl||''} onChange={e => set('hero.ctaUrl',e.target.value)} placeholder="#planes" />
              {lbl('CTA secundario — texto')}
              <input className={inp} value={local.hero?.ctaTexto2||''} onChange={e => set('hero.ctaTexto2',e.target.value)} placeholder="Ver demo en vivo" />
              {lbl('CTA secundario — URL')}
              <input className={inp} value={local.hero?.ctaUrl2||''} onChange={e => set('hero.ctaUrl2',e.target.value)} placeholder="#demo" />
            </div>
            {lbl('URL de imagen hero')}
            <input className={inp} value={local.hero?.imagenUrl||''} onChange={e => set('hero.imagenUrl',e.target.value)} placeholder="https://…/hero.png" />
            {local.hero?.imagenUrl && (
              <div className="rounded-xl overflow-hidden border border-white/[0.08] max-h-40">
                <img src={local.hero.imagenUrl} alt="hero preview" className="w-full h-40 object-cover" onError={e => e.target.style.display='none'} />
              </div>
            )}
          </div>
        </Card>
      )}

      {/* CARACTERÍSTICAS */}
      {section === 'caracteristicas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-[#5f6f80]">Funcionalidades destacadas que aparecerán en el sitio web</p>
            <Btn variant="primary" size="sm" onClick={openNewFeat}><Plus size={13}/>Agregar</Btn>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(local.caracteristicas||[]).map(c => (
              <div key={c.id} className="bg-[#161d28] border border-white/[0.08] rounded-xl p-4 flex gap-3 group">
                <div className="text-2xl shrink-0">{c.icono}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[13px] text-[#e8edf2] mb-0.5">{c.titulo}</div>
                  <div className="text-[12px] text-[#5f6f80] line-clamp-2">{c.descripcion}</div>
                </div>
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Btn variant="ghost" size="icon" onClick={() => openEditFeat(c)}><Edit2 size={12}/></Btn>
                  <Btn variant="danger" size="icon" onClick={() => removeFeat(c.id)}><Trash2 size={12}/></Btn>
                </div>
              </div>
            ))}
          </div>

          <Modal open={featModal} onClose={() => setFeatModal(false)} title={editFeat ? 'Editar característica' : 'Nueva característica'} size="sm"
            footer={<>
              <Btn variant="secondary" onClick={() => setFeatModal(false)}>Cancelar</Btn>
              <Btn variant="primary" onClick={saveFeat}><Save size={14}/>Guardar</Btn>
            </>}>
            <div className="space-y-3">
              <Field label="Ícono (emoji)">
                <input className={inp} value={featForm.icono||''} onChange={e => setFeatForm(p=>({...p,icono:e.target.value}))} placeholder="📦" />
              </Field>
              <Field label="Título *">
                <input className={inp} value={featForm.titulo||''} onChange={e => setFeatForm(p=>({...p,titulo:e.target.value}))} />
              </Field>
              <Field label="Descripción">
                <textarea rows={2} className={`${inp} resize-y`} value={featForm.descripcion||''} onChange={e => setFeatForm(p=>({...p,descripcion:e.target.value}))} />
              </Field>
            </div>
          </Modal>
        </div>
      )}

      {/* CONTACTO & REDES */}
      {section === 'contacto' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Card>
            <CardHeader title="Información de contacto" />
            <div className="space-y-3">
              {[
                { key:'email', icon:<Mail size={13}/>, placeholder:'ventas@empresa.com' },
                { key:'telefono', icon:<Phone size={13}/>, placeholder:'+51 1 234 5678' },
                { key:'whatsapp', icon:<MessageSquare size={13}/>, placeholder:'+51 999 000 111' },
                { key:'direccion', icon:<Type size={13}/>, placeholder:'Lima, Perú' },
              ].map(f => (
                <div key={f.key}>
                  {lbl(f.key.charAt(0).toUpperCase()+f.key.slice(1))}
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5f6f80]">{f.icon}</span>
                    <input className={`${inp} pl-8`} value={local.contacto?.[f.key]||''} onChange={e => set(`contacto.${f.key}`,e.target.value)} placeholder={f.placeholder} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader title="Redes sociales" />
            <div className="space-y-3">
              {[
                { key:'linkedin', icon:<Linkedin size={13}/>, label:'LinkedIn' },
                { key:'twitter', icon:<Twitter size={13}/>, label:'Twitter / X' },
                { key:'facebook', icon:<Facebook size={13}/>, label:'Facebook' },
                { key:'instagram', icon:<Instagram size={13}/>, label:'Instagram' },
                { key:'youtube', icon:<Youtube size={13}/>, label:'YouTube' },
              ].map(r => (
                <div key={r.key}>
                  {lbl(r.label)}
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5f6f80]">{r.icon}</span>
                    <input className={`${inp} pl-8`} value={local.redesSociales?.[r.key]||''} onChange={e => set(`redesSociales.${r.key}`,e.target.value)} placeholder="https://…" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* SEO & FOOTER */}
      {section === 'seo' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Card>
            <CardHeader title="SEO y metadatos" />
            <div className="space-y-3">
              {lbl('Meta título', 'Aparece en la pestaña del navegador y en Google')}
              <input className={inp} value={local.seo?.titulo||''} onChange={e => set('seo.titulo',e.target.value)} />
              {lbl('Meta descripción', 'Texto que aparece bajo el título en los resultados de búsqueda (160 chars)')}
              <textarea rows={3} className={`${inp} resize-y`} value={local.seo?.descripcion||''} onChange={e => set('seo.descripcion',e.target.value)} />
              <div className="text-[11px] text-[#5f6f80] text-right">{(local.seo?.descripcion||'').length}/160</div>
              {lbl('Keywords', 'Separadas por coma')}
              <textarea rows={2} className={`${inp} resize-y`} value={local.seo?.keywords||''} onChange={e => set('seo.keywords',e.target.value)} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Footer y configuración general" />
            <div className="space-y-3">
              {lbl('Texto legal del footer')}
              <textarea rows={2} className={`${inp} resize-y`} value={local.footer?.textoLegal||''} onChange={e => set('footer.textoLegal',e.target.value)} />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] text-[#e8edf2]">Mostrar precios públicamente</div>
                  <div className="text-[11px] text-[#5f6f80]">Tabla de precios visible en el sitio</div>
                </div>
                <Toggle value={!!local.footer?.mostrarPrecios} onChange={v => set('footer.mostrarPrecios',v)} />
              </div>
              {lbl('Moneda pública')}
              <select className={inp} value={local.footer?.moneda||'USD'} onChange={e => set('footer.moneda',e.target.value)}>
                <option>USD</option><option>PEN</option><option>EUR</option>
              </select>
              {lbl('Días de prueba gratuita')}
              <input type="number" min="0" className={inp} value={local.footer?.probarGratisDias||14} onChange={e => set('footer.probarGratisDias',parseInt(e.target.value)||0)} />
            </div>
          </Card>
        </div>
      )}

      <div className="flex justify-end pt-2 border-t border-white/[0.06]">
        <Btn variant="primary" onClick={save}><Save size={14}/>Guardar configuración de landing</Btn>
      </div>
    </div>
  )
}
