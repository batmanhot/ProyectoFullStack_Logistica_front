/**
 * StockPro — Capa de Datos v2.1 (Multi-Tenant)
 *
 * Aislamiento por tenant: cada empresa tiene sus propias claves
 * con el prefijo  sp_{tenantId}_{entidad}
 *
 * Claves GLOBALES (sin prefijo):
 *   sp_session   — sesión activa del usuario
 *   sp_empresas  — registro de organizaciones
 *
 * Cuando se migre a backend, solo cambia leer()/guardar() → fetch().
 * El resto del sistema (páginas, contexto, validadores) no se toca.
 */
import { newId, fechaHoy } from '../utils/helpers'
import {
  CONFIG_DEFAULT, CONFIGS_DEMO, CAT, ALM, PROV, PROD, MOV, OC,
  ROLES, USR, USR_ACME, AJ, DEV, TR, COT,
  CLIENTES_DEMO, DESPACHOS_DEMO, TRANSPORTISTAS_DEMO, RUTAS_DEMO,
  CXC_DEMO, PROF_DEMO, EMPRESAS_DEMO, AREAS_DEMO, PI_DEMO,
} from '../data/demoData'
import {
  validateProducto, validateMovimiento, validateOrden,
  validateDespacho, validateCliente, validateTransferencia, validateUsuario,
} from './validators'

// ── Multi-Tenant ──────────────────────────────────────────────
let _tenantId = 'dlnorte'

// Tenants con dataset demo precargado
const DEMO_TENANTS = new Set(['dlnorte', 'acme'])

export const setTenant = (id) => { _tenantId = id }
export const getTenant = () => _tenantId

// Clave prefijada por tenant
function k(name) { return `sp_${_tenantId}_${name}` }

// Claves globales (no por tenant)
const SK = { session: 'sp_session', empresas: 'sp_empresas' }

// Claves de entidades por tenant — se evalúan en el momento de llamarlas
const KEYS = {
  get config()      { return k('config')      },
  get productos()   { return k('productos')   },
  get categorias()  { return k('categorias')  },
  get almacenes()   { return k('almacenes')   },
  get proveedores() { return k('proveedores') },
  get movimientos() { return k('movimientos') },
  get ordenes()     { return k('ordenes')     },
  get usuarios()    { return k('usuarios')    },
}

// Seed helper: demo → datos de ejemplo; nuevos tenants → vacío
function demo(fallback)  { return DEMO_TENANTS.has(_tenantId) ? fallback : [] }
function demoUsr()       {
  if (!DEMO_TENANTS.has(_tenantId)) return []
  return _tenantId === 'acme' ? USR_ACME : USR
}

// ── Auditoría interna ─────────────────────────────────────────
function _audit(accion, modulo, detalle, datos) {
  try {
    const ses   = JSON.parse(localStorage.getItem(SK.session) || 'null')
    const logs  = JSON.parse(localStorage.getItem(k('auditoria')) || '[]')
    const ahora = new Date()
    logs.unshift({
      id:            Math.random().toString(36).slice(2,10),
      timestamp:     ahora.toISOString(),
      fecha:         ahora.toISOString().split('T')[0],
      hora:          ahora.toTimeString().slice(0,8),
      usuarioId:     ses?.id     || 'sistema',
      usuarioNombre: ses?.nombre || 'Sistema',
      accion, modulo, detalle, datos: datos || null,
    })
    if (logs.length > 500) logs.splice(500)
    localStorage.setItem(k('auditoria'), JSON.stringify(logs))
  } catch(e) { /* silencioso — no interrumpir operación */ }
}

function leer(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
function guardar(key,data){try{localStorage.setItem(key,JSON.stringify(data));return true}catch{return false}}
function ok(data){return{data,error:null}}
function err(msg){return{data:null,error:msg}}

// ═══════════════════════════════════════════════════════════
// EMPRESAS — Registro global de organizaciones
// ═══════════════════════════════════════════════════════════
export function getEmpresas() {
  const d = leer(SK.empresas) || EMPRESAS_DEMO
  if (!leer(SK.empresas)) guardar(SK.empresas, EMPRESAS_DEMO)
  return ok(d)
}

export function registrarEmpresa(emp) {
  if (!emp.nombre?.trim()) return err('La razón social es obligatoria')
  if (!emp.ruc?.trim())    return err('El RUC es obligatorio')
  const lista = leer(SK.empresas) || EMPRESAS_DEMO
  if (lista.find(e => e.ruc === emp.ruc.trim()))
    return err('Ya existe una organización registrada con ese RUC')
  const id = emp.id?.trim().toLowerCase() || emp.ruc.trim().slice(-8).toLowerCase()
  if (lista.find(e => e.id === id))
    return err(`El código '${id}' ya está en uso, elige otro`)
  const nueva = {
    id, nombre: emp.nombre.trim(), ruc: emp.ruc.trim(),
    plan: emp.plan || 'starter', activo: true,
    createdAt: new Date().toISOString(),
  }
  lista.push(nueva)
  guardar(SK.empresas, lista)
  // Seed config inicial para el nuevo tenant (sin datos demo)
  setTenant(id)
  guardar(KEYS.config, { ...CONFIG_DEFAULT, empresa: nueva.nombre, ruc: nueva.ruc })
  return ok(nueva)
}

// ═══════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════
export function getConfig(){
  const stored = leer(KEYS.config)
  const base = { ...CONFIG_DEFAULT, ...(CONFIGS_DEMO[_tenantId] || {}) }
  if (!stored) guardar(KEYS.config, base)  // seed on first access
  return ok({ ...base, ...(stored || {}) })
}
export function saveConfig(cfg){const c=leer(KEYS.config)||{};guardar(KEYS.config,{...c,...cfg});return ok(true)}

// ═══════════════════════════════════════════════════════════
// CATÁLOGOS
// ═══════════════════════════════════════════════════════════
export function getCategorias(){const d=leer(KEYS.categorias)||demo(CAT);if(!leer(KEYS.categorias))guardar(KEYS.categorias,demo(CAT));return ok(d)}
export function saveCategoria(c){const l=leer(KEYS.categorias)||demo(CAT);if(c.id){const i=l.findIndex(x=>x.id===c.id);if(i>=0)l[i]=c;else return err('No encontrado')}else l.push({...c,id:newId(),activo:true});guardar(KEYS.categorias,l);return ok(true)}
export function deleteCategoria(id){guardar(KEYS.categorias,(leer(KEYS.categorias)||[]).filter(c=>c.id!==id));return ok(true)}
export function getCategoriasAll(){return getCategorias()}

export function getAlmacenes(){const d=leer(KEYS.almacenes)||demo(ALM);if(!leer(KEYS.almacenes))guardar(KEYS.almacenes,demo(ALM));return ok(d)}
export function saveAlmacen(a){const l=leer(KEYS.almacenes)||demo(ALM);if(a.id){const i=l.findIndex(x=>x.id===a.id);if(i>=0)l[i]=a;else l.push({...a,id:newId(),activo:true})}else l.push({...a,id:newId(),activo:true});guardar(KEYS.almacenes,l);return ok(true)}
export function deleteAlmacen(id){guardar(KEYS.almacenes,(leer(KEYS.almacenes)||[]).filter(a=>a.id!==id));return ok(true)}

export function getProveedores(){const d=leer(KEYS.proveedores)||demo(PROV);if(!leer(KEYS.proveedores))guardar(KEYS.proveedores,demo(PROV));return ok(d)}
export function saveProveedor(p){
  const l=leer(KEYS.proveedores)||demo(PROV);const esNuevo=!p.id
  if(p.id){const i=l.findIndex(x=>x.id===p.id);if(i>=0)l[i]=p;else l.push({...p,id:newId(),activo:true})}
  else l.push({...p,id:newId(),activo:true})
  guardar(KEYS.proveedores,l)
  _audit(esNuevo?'CREATE':'UPDATE','proveedores',`Proveedor ${esNuevo?'creado':'modificado'} — ${p.razonSocial}`)
  return ok(true)
}
export function deleteProveedor(id){
  const p=(leer(KEYS.proveedores)||[]).find(x=>x.id===id)
  guardar(KEYS.proveedores,(leer(KEYS.proveedores)||[]).filter(x=>x.id!==id))
  _audit('DELETE','proveedores',`Proveedor eliminado — ${p?.razonSocial||id}`)
  return ok(true)
}

// ═══════════════════════════════════════════════════════════
// PRODUCTOS
// ═══════════════════════════════════════════════════════════
export function getProductos(){let d=leer(KEYS.productos);if(!d){d=demo(PROD);guardar(KEYS.productos,d)}return ok(d)}
export function getProductoById(id){const l=leer(KEYS.productos)||demo(PROD);const p=l.find(x=>x.id===id);return p?ok(p):err('Producto no encontrado')}
export function saveProducto(prod){
  const vErr = validateProducto(prod, {
    categorias: leer(KEYS.categorias)||demo(CAT),
    almacenes:  leer(KEYS.almacenes)||demo(ALM),
    proveedores:leer(KEYS.proveedores)||demo(PROV),
  })
  if(vErr) return err(vErr)
  const l=leer(KEYS.productos)||[];const t=new Date().toISOString()
  const esNuevo=!prod.id
  if(prod.id){const i=l.findIndex(p=>p.id===prod.id);if(i>=0)l[i]={...prod,updatedAt:t};else return err('No encontrado')}
  else l.push({...prod,id:newId(),batches:[],stockActual:0,createdAt:t,updatedAt:t})
  guardar(KEYS.productos,l)
  _audit(esNuevo?'CREATE':'UPDATE','inventario',`${esNuevo?'Producto creado':'Producto modificado'} — ${prod.nombre} (${prod.sku})`)
  return ok(true)
}
export function deleteProducto(id){
  const prod=(leer(KEYS.productos)||[]).find(p=>p.id===id)
  guardar(KEYS.productos,(leer(KEYS.productos)||[]).filter(p=>p.id!==id))
  _audit('DELETE','inventario',`Producto eliminado — ${prod?.nombre||id} (${prod?.sku||''})`)
  return ok(true)
}
export function _actualizarBatchesProducto(pId,batches,stock){const l=leer(KEYS.productos)||[];const i=l.findIndex(p=>p.id===pId);if(i<0)return false;l[i].batches=batches;l[i].stockActual=stock;l[i].updatedAt=new Date().toISOString();guardar(KEYS.productos,l);return true}

// ═══════════════════════════════════════════════════════════
// MOVIMIENTOS
// ═══════════════════════════════════════════════════════════
export function getMovimientos(f={}){let d=leer(KEYS.movimientos)||demo(MOV);if(!leer(KEYS.movimientos))guardar(KEYS.movimientos,demo(MOV));if(f.productoId)d=d.filter(m=>m.productoId===f.productoId);if(f.tipo)d=d.filter(m=>m.tipo===f.tipo);if(f.desde)d=d.filter(m=>m.fecha>=f.desde);if(f.hasta)d=d.filter(m=>m.fecha<=f.hasta);return ok([...d].sort((a,b)=>b.fecha.localeCompare(a.fecha)))}
export function registrarMovimiento(mov){
  const prods=leer(KEYS.productos)||[]
  const vErr=validateMovimiento(mov,{productos:prods,almacenes:leer(KEYS.almacenes)||demo(ALM)})
  if(vErr) return err(vErr)
  const l=leer(KEYS.movimientos)||[]
  const n={...mov,id:newId(),fecha:mov.fecha||fechaHoy(),createdAt:new Date().toISOString()}
  l.push(n);guardar(KEYS.movimientos,l)
  const tipoLabel={ENTRADA:'Entrada registrada',SALIDA:'Salida registrada',AJUSTE:'Ajuste registrado',TRANSFERENCIA:'Transferencia registrada',DEVOLUCION:'Devolución registrada'}
  const modLabel={ENTRADA:'entradas',SALIDA:'salidas',AJUSTE:'ajustes',TRANSFERENCIA:'transferencias',DEVOLUCION:'devoluciones'}
  const prod=prods.find(p=>p.id===mov.productoId)
  _audit('CREATE', modLabel[mov.tipo]||'movimientos',
    `${tipoLabel[mov.tipo]||mov.tipo} — ${prod?.nombre||mov.productoId} · ${mov.cantidad} ${prod?.unidadMedida||''} · Doc: ${mov.documento||'—'}`,
    { tipo:mov.tipo, productoId:mov.productoId, cantidad:mov.cantidad, documento:mov.documento })
  return ok(n)
}

// ═══════════════════════════════════════════════════════════
// ÓRDENES DE COMPRA
// ═══════════════════════════════════════════════════════════
export function getOrdenes(f={}){let d=leer(KEYS.ordenes)||demo(OC);if(!leer(KEYS.ordenes))guardar(KEYS.ordenes,demo(OC));if(f.estado)d=d.filter(o=>o.estado===f.estado);return ok([...d].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)))}
export function getOrdenById(id){const l=leer(KEYS.ordenes)||demo(OC);const o=l.find(x=>x.id===id);return o?ok(o):err('No encontrada')}
export function saveOrden(orden){
  const vErr=validateOrden(orden,{proveedores:leer(KEYS.proveedores)||demo(PROV),productos:leer(KEYS.productos)||[]})
  if(vErr) return err(vErr)
  const l=leer(KEYS.ordenes)||[];const t=new Date().toISOString()
  const esNueva=!orden.id||(l.findIndex(o=>o.id===orden.id)<0)
  if(orden.id){const i=l.findIndex(o=>o.id===orden.id);if(i>=0)l[i]={...orden,updatedAt:t};else l.push({...orden,id:newId(),createdAt:t})}
  else l.push({...orden,id:newId(),createdAt:t})
  guardar(KEYS.ordenes,l)
  _audit(esNueva?'CREATE':'UPDATE','ordenes',`OC ${orden.numero||''} — Estado: ${orden.estado} · Total: ${orden.total||0}`)
  return ok(true)
}

// ═══════════════════════════════════════════════════════════
// USUARIOS Y ROLES
// ═══════════════════════════════════════════════════════════
export function getUsuarios(){
  const stored=leer(KEYS.usuarios)
  if(!stored){guardar(KEYS.usuarios,demoUsr());return ok(demoUsr())}
  // Merge: agregar usuarios demo nuevos que aún no estén en localStorage
  const demo=demoUsr();let changed=false
  demo.forEach(du=>{if(!stored.find(u=>u.id===du.id)){stored.push(du);changed=true}})
  if(changed)guardar(KEYS.usuarios,stored)
  return ok(stored)
}
export function saveUsuario(u){
  const vErr=validateUsuario(u)
  if(vErr) return err(vErr)
  const l=leer(KEYS.usuarios)||demoUsr();const esNuevo=!u.id
  if(u.id){const i=l.findIndex(x=>x.id===u.id);if(i>=0)l[i]={...l[i],...u};else l.push({...u,id:newId(),empresaId:_tenantId,createdAt:new Date().toISOString()})}
  else l.push({...u,id:newId(),empresaId:_tenantId,createdAt:new Date().toISOString()})
  guardar(KEYS.usuarios,l)
  _audit(esNuevo?'CREATE':'UPDATE','usuarios',`Usuario ${esNuevo?'creado':'modificado'} — ${u.nombre} (${u.rol})`)
  return ok(true)
}
export function deleteUsuario(id){
  const u=(leer(KEYS.usuarios)||[]).find(x=>x.id===id)
  guardar(KEYS.usuarios,(leer(KEYS.usuarios)||[]).filter(x=>x.id!==id))
  _audit('DELETE','usuarios',`Usuario eliminado — ${u?.nombre||id}`)
  return ok(true)
}
export function loginUsuario(email,password){
  const l=getUsuarios().data||[]
  const u=l.find(x=>x.email===email&&x.password===password&&x.activo)
  if(!u){
    registrarAuditoria({usuarioId:'desconocido',usuarioNombre:email,accion:'LOGIN_FAILED',modulo:'auth',detalle:`Intento de acceso fallido: ${email}`})
    return err('Credenciales incorrectas o usuario inactivo')
  }
  const s={...u,loginAt:new Date().toISOString(),empresaId:_tenantId}
  guardar(SK.session,s)
  registrarAuditoria({usuarioId:u.id,usuarioNombre:u.nombre,accion:'LOGIN',modulo:'auth',detalle:'Inicio de sesión exitoso'})
  return ok(s)
}
export function getSession(){return ok(leer(SK.session))}
export function logout(){
  const ses=leer(SK.session)
  _audit('LOGOUT','auth',`Cierre de sesión — ${ses?.nombre||'usuario'}`)
  localStorage.removeItem(SK.session);return ok(true)
}
export function getRoles(){
  try {
    const custom = JSON.parse(localStorage.getItem(k('roles_custom'))||'{}')
    return ok({...ROLES,...custom})
  } catch { return ok(ROLES) }
}
export function tienePermiso(rol,modulo){
  let r = ROLES[rol]
  if(!r){
    try { const custom=JSON.parse(localStorage.getItem(k('roles_custom'))||'{}'); r=custom[rol] } catch {}
  }
  if(!r) return false
  return r.permisos.includes('*')||r.permisos.includes(modulo)
}

// ═══════════════════════════════════════════════════════════
// AJUSTES
// ═══════════════════════════════════════════════════════════
export function getAjustes(f={}){let d=leer(k('ajustes'))||demo(AJ);if(!leer(k('ajustes')))guardar(k('ajustes'),demo(AJ));if(f.productoId)d=d.filter(a=>a.productoId===f.productoId);if(f.desde)d=d.filter(a=>a.fecha>=f.desde);if(f.hasta)d=d.filter(a=>a.fecha<=f.hasta);return ok([...d].sort((a,b)=>b.fecha.localeCompare(a.fecha)))}
export function registrarAjuste(a){const l=leer(k('ajustes'))||[];l.push({...a,id:newId(),createdAt:new Date().toISOString()});guardar(k('ajustes'),l);return ok(true)}

// DEVOLUCIONES
export function getDevoluciones(f={}){let d=leer(k('devoluciones'))||demo(DEV);if(!leer(k('devoluciones')))guardar(k('devoluciones'),demo(DEV));if(f.tipo)d=d.filter(x=>x.tipo===f.tipo);if(f.desde)d=d.filter(x=>x.fecha>=f.desde);return ok([...d].sort((a,b)=>b.fecha.localeCompare(a.fecha)))}
export function registrarDevolucion(dev){const l=leer(k('devoluciones'))||[];l.push({...dev,id:newId(),createdAt:new Date().toISOString()});guardar(k('devoluciones'),l);return ok(true)}

// TRANSFERENCIAS
export function getTransferencias(f={}){let d=leer(k('transferencias'))||demo(TR);if(!leer(k('transferencias')))guardar(k('transferencias'),demo(TR));if(f.productoId)d=d.filter(t=>t.productoId===f.productoId);if(f.desde)d=d.filter(t=>t.fecha>=f.desde);if(f.hasta)d=d.filter(t=>t.fecha<=f.hasta);return ok([...d].sort((a,b)=>b.fecha.localeCompare(a.fecha)))}
export function registrarTransferencia(tr){
  const vErr=validateTransferencia(tr,{productos:leer(KEYS.productos)||[],almacenes:leer(KEYS.almacenes)||demo(ALM)})
  if(vErr) return err(vErr)
  const l=leer(k('transferencias'))||[];l.push({...tr,id:newId(),createdAt:new Date().toISOString()});guardar(k('transferencias'),l);return ok(true)
}

// KARDEX
export function getKardex(pId){
  const movs=(leer(KEYS.movimientos)||[]).filter(m=>m.productoId===pId)
  const trs=(leer(k('transferencias'))||[]).filter(t=>t.productoId===pId)
  const lines=[]
  movs.forEach(m=>{
    const eE=m.tipo==='ENTRADA';const eS=m.tipo==='SALIDA'
    const eAP=m.tipo==='AJUSTE'&&m.motivo?.includes('[+ AJUSTE]')
    const eAN=m.tipo==='AJUSTE'&&m.motivo?.includes('[- AJUSTE]')
    lines.push({fecha:m.fecha,tipo:m.tipo,documento:m.documento||'—',motivo:m.motivo||'—',
      entrada:(eE||eAP)?m.cantidad:0,salida:(eS||eAN)?m.cantidad:0,
      costoUnit:m.costoUnitario||0,createdAt:m.createdAt||m.fecha})
  })
  trs.forEach(t=>{
    lines.push({fecha:t.fecha,tipo:'TRANSFER-OUT',documento:t.numero,motivo:`Transfer → ${t.almacenDestinoId}`,entrada:0,salida:t.cantidad,costoUnit:t.costoUnitario,createdAt:t.createdAt})
    lines.push({fecha:t.fecha,tipo:'TRANSFER-IN', documento:t.numero,motivo:`Transfer ← ${t.almacenOrigenId}`, entrada:t.cantidad,salida:0,costoUnit:t.costoUnitario,createdAt:t.createdAt})
  })
  lines.sort((a,b)=>{
    function toYMD(f){
      if(!f) return '0000-00-00'
      const s=String(f).trim()
      if(s[2]==='/')return `${s.slice(6,10)}-${s.slice(3,5)}-${s.slice(0,2)}`
      return s.slice(0,10)
    }
    const fa=toYMD(a.fecha), fb=toYMD(b.fecha)
    if(fa!==fb) return fa.localeCompare(fb)
    const ca=(a.createdAt||''), cb=(b.createdAt||'')
    if(ca!==cb) return ca.localeCompare(cb)
    const ia=parseInt((a.id||'').replace(/[^0-9]/g,'')||'0')
    const ib=parseInt((b.id||'').replace(/[^0-9]/g,'')||'0')
    return ia-ib
  })
  let s=0
  return lines.map(l=>{s=s+l.entrada-l.salida;return{...l,saldo:Math.max(0,Math.round(s*1000)/1000)}})
}

// COTIZACIONES
export function getCotizaciones(f={}){let d=leer(k('cotizaciones'))||demo(COT);if(!leer(k('cotizaciones')))guardar(k('cotizaciones'),demo(COT));if(f.estado)d=d.filter(c=>c.estado===f.estado);return ok([...d].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)))}
export function saveCotizacion(c){const l=leer(k('cotizaciones'))||[];const t=new Date().toISOString();if(c.id){const i=l.findIndex(x=>x.id===c.id);if(i>=0)l[i]={...c,updatedAt:t};else l.push({...c,updatedAt:t})}else l.push({...c,id:newId(),createdAt:t});guardar(k('cotizaciones'),l);return ok(true)}

// INVENTARIO FÍSICO
export function getInventariosFisicos(){return ok([...(leer(k('inv_fisico'))||[])].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)))}
export function saveInventarioFisico(inv){const l=leer(k('inv_fisico'))||[];const t=new Date().toISOString();if(inv.id){const i=l.findIndex(x=>x.id===inv.id);if(i>=0)l[i]={...inv,updatedAt:t};else l.push({...inv,updatedAt:t})}else l.push({...inv,id:newId(),createdAt:t});guardar(k('inv_fisico'),l);return ok(true)}

// NOTIFICACIONES
export function getNotificaciones(){return ok(leer(k('notif'))||[])}
export function saveNotificacion(n){const l=leer(k('notif'))||[];l.unshift({...n,id:newId(),createdAt:new Date().toISOString(),leida:false});if(l.length>200)l.splice(200);guardar(k('notif'),l);return ok(true)}
export function marcarNotifLeida(id){const l=leer(k('notif'))||[];const i=l.findIndex(n=>n.id===id);if(i>=0)l[i].leida=true;guardar(k('notif'),l);return ok(true)}
export function marcarTodasLeidas(){guardar(k('notif'),(leer(k('notif'))||[]).map(n=>({...n,leida:true})));return ok(true)}

// ═══════════════════════════════════════════════════════════
// RESET Y EXPORTACIÓN
// ═══════════════════════════════════════════════════════════

// Claves operativas del tenant activo
function operationalKeys() {
  return [
    k('productos'), k('proveedores'), k('movimientos'), k('ordenes'),
    k('ajustes'), k('devoluciones'), k('transferencias'), k('cotizaciones'),
    k('inv_fisico'), k('clientes'), k('despachos'), k('transportistas'),
    k('rutas'), k('notif'), k('alertas_leidas'),
    k('cxc'), k('proformas'),
    k('empaques'), k('flota'), k('listas_precios'),
    k('areas'), k('pedidos_internos'),
    k('auditoria'),
  ]
}

export function resetDemo(){
  [...operationalKeys(), KEYS.config, KEYS.categorias, KEYS.almacenes, KEYS.usuarios, SK.session, k('demo_version')]
    .forEach(key => localStorage.removeItem(key))
  return ok(true)
}

export function limpiarDatosOperativos(){
  operationalKeys().forEach(key => guardar(key, []))
  return ok(true)
}

export function exportarDatos(){
  const d={}
  ;[KEYS.config,KEYS.productos,KEYS.categorias,KEYS.almacenes,KEYS.proveedores,
    KEYS.movimientos,KEYS.ordenes,KEYS.usuarios,
    k('ajustes'),k('devoluciones'),k('transferencias'),k('cotizaciones')
  ].forEach(key=>{try{d[key]=JSON.parse(localStorage.getItem(key)||'null')}catch{d[key]=null}})
  return ok(d)
}

// ═══════════════════════════════════════════════════════════
// CLIENTES
// ═══════════════════════════════════════════════════════════
export function getClientes(filtros={}) {
  let data = leer(k('clientes')) || demo(CLIENTES_DEMO)
  if (!leer(k('clientes'))) guardar(k('clientes'), demo(CLIENTES_DEMO))
  if (filtros.busqueda) {
    const q = filtros.busqueda.toLowerCase()
    data = data.filter(c => c.razonSocial.toLowerCase().includes(q) || c.ruc?.includes(filtros.busqueda))
  }
  return ok(data)
}

export function saveCliente(cli) {
  const vErr=validateCliente(cli)
  if(vErr) return err(vErr)
  const lista = leer(k('clientes')) || demo(CLIENTES_DEMO)
  const ahora = new Date().toISOString()
  if (cli.id) {
    const idx = lista.findIndex(c => c.id === cli.id)
    if (idx >= 0) lista[idx] = { ...cli, updatedAt: ahora }
    else lista.push({ ...cli, updatedAt: ahora })
  } else {
    lista.push({ ...cli, id: newId(), createdAt: ahora, activo: true })
  }
  guardar(k('clientes'), lista)
  _audit(cli.id?'UPDATE':'CREATE','clientes',`Cliente ${cli.id?'modificado':'creado'} — ${cli.razonSocial}`)
  return ok(true)
}

export function deleteCliente(id) {
  const cli=(leer(k('clientes'))||[]).find(x=>x.id===id)
  guardar(k('clientes'), (leer(k('clientes')) || []).filter(c => c.id !== id))
  _audit('DELETE','clientes',`Cliente eliminado — ${cli?.razonSocial||id}`)
  return ok(true)
}

// ═══════════════════════════════════════════════════════════
// DESPACHOS
// ═══════════════════════════════════════════════════════════
function _repararNumeroDespacho(lista) {
  let changed = false
  const usados = new Set(lista.filter(d => !d.numero?.includes(',')).map(d=>d.numero))
  lista.forEach(d => {
    if (d.numero && d.numero.includes(',')) {
      let n = 1
      let candidato
      do { candidato = `DES-001-${String(n).padStart(4,'0')}`; n++ } while (usados.has(candidato))
      d.numero = candidato
      usados.add(candidato)
      changed = true
    }
  })
  if (changed) guardar(k('despachos'), lista)
  return lista
}

export function getDespachos(filtros={}) {
  let data = leer(k('despachos')) || demo(DESPACHOS_DEMO)
  if (!leer(k('despachos'))) guardar(k('despachos'), demo(DESPACHOS_DEMO))
  data = _repararNumeroDespacho(data)
  if (filtros.estado) data = data.filter(d => d.estado === filtros.estado)
  if (filtros.clienteId) data = data.filter(d => d.clienteId === filtros.clienteId)
  if (filtros.desde) data = data.filter(d => d.fecha >= filtros.desde)
  return ok([...data].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
}

export function getDespachoById(id){const l=leer(k('despachos'))||demo(DESPACHOS_DEMO);const d=l.find(x=>x.id===id);return d?ok(d):err('Despacho no encontrado')}

export function saveDespacho(des) {
  const vErr=validateDespacho(des,{clientes:leer(k('clientes'))||demo(CLIENTES_DEMO),almacenes:leer(KEYS.almacenes)||demo(ALM),productos:leer(KEYS.productos)||[]})
  if(vErr) return err(vErr)
  const lista = leer(k('despachos')) || []
  const ahora = new Date().toISOString()
  if (des.id) {
    const idx = lista.findIndex(d => d.id === des.id)
    if (idx >= 0) lista[idx] = { ...des, updatedAt: ahora }
    else lista.push({ ...des, id: newId(), createdAt: ahora })
  } else {
    lista.push({ ...des, id: newId(), createdAt: ahora })
  }
  guardar(k('despachos'), lista)
  _audit(des.id?'UPDATE':'CREATE','despachos',`Despacho ${des.numero||''} — Cliente: ${des.clienteId} · Estado: ${des.estado}`)
  return ok(true)
}

// ═══════════════════════════════════════════════════════════
// TRANSPORTISTAS
// ═══════════════════════════════════════════════════════════
export function getTransportistas(filtros={}) {
  let data = leer(k('transportistas')) || demo(TRANSPORTISTAS_DEMO)
  if (!leer(k('transportistas'))) guardar(k('transportistas'), demo(TRANSPORTISTAS_DEMO))
  if (filtros.tipo) data = data.filter(t => t.tipo === filtros.tipo)
  return ok(data)
}

export function saveTransportista(tra) {
  const lista = leer(k('transportistas')) || demo(TRANSPORTISTAS_DEMO)
  const ahora = new Date().toISOString()
  if (tra.id) {
    const idx = lista.findIndex(t => t.id === tra.id)
    if (idx >= 0) lista[idx] = { ...tra, updatedAt: ahora }
    else lista.push({ ...tra, updatedAt: ahora })
  } else {
    lista.push({ ...tra, id: newId(), createdAt: ahora, activo: true })
  }
  guardar(k('transportistas'), lista)
  return ok(true)
}

export function deleteTransportista(id) {
  guardar(k('transportistas'), (leer(k('transportistas')) || []).filter(t => t.id !== id))
  return ok(true)
}

// ═══════════════════════════════════════════════════════════
// RUTAS
// ═══════════════════════════════════════════════════════════
export function getRutas(filtros={}) {
  let data = leer(k('rutas')) || demo(RUTAS_DEMO)
  if (!leer(k('rutas'))) guardar(k('rutas'), demo(RUTAS_DEMO))
  if (filtros.estado) data = data.filter(r => r.estado === filtros.estado)
  if (filtros.transportistaId) data = data.filter(r => r.transportistaId === filtros.transportistaId)
  if (filtros.fecha) data = data.filter(r => r.fechaSalida === filtros.fecha)
  return ok([...data].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
}

export function saveRuta(ruta) {
  const lista = leer(k('rutas')) || []
  const ahora = new Date().toISOString()
  if (ruta.id) {
    const idx = lista.findIndex(r => r.id === ruta.id)
    if (idx >= 0) lista[idx] = { ...ruta, updatedAt: ahora }
    else lista.push({ ...ruta, id: newId(), createdAt: ahora })
  } else {
    lista.push({ ...ruta, id: newId(), createdAt: ahora })
  }
  guardar(k('rutas'), lista)
  return ok(true)
}

// ── Stock Reservado ───────────────────────────────────────
const ESTADOS_RESERVA = ['PEDIDO','APROBADO','PICKING','LISTO']

export function getStockReservado() {
  const despachos = leer(k('despachos')) || []
  const reservas  = {}
  despachos
    .filter(d => ESTADOS_RESERVA.includes(d.estado))
    .forEach(d => {
      (d.items || []).forEach(it => {
        reservas[it.productoId] = (reservas[it.productoId] || 0) + (it.cantidad || 0)
      })
    })
  return ok(reservas)
}

export function getStockDisponible(productoId) {
  const prods    = leer(KEYS.productos) || []
  const prod     = prods.find(p => p.id === productoId)
  if (!prod) return ok(0)
  const reservas = getStockReservado().data || {}
  const reservado = reservas[productoId] || 0
  return ok(Math.max(0, prod.stockActual - reservado))
}

// ═══════════════════════════════════════════════════════════
// AUDITORÍA
// ═══════════════════════════════════════════════════════════
const MAX_LOGS = 500

export function registrarAuditoria({ usuarioId, usuarioNombre, accion, modulo, detalle, datos = null }) {
  try {
    const logs = leer(k('auditoria')) || []
    const nuevo = {
      id:             newId(),
      timestamp:      new Date().toISOString(),
      fecha:          new Date().toISOString().split('T')[0],
      hora:           new Date().toTimeString().slice(0,8),
      usuarioId:      usuarioId || 'sistema',
      usuarioNombre:  usuarioNombre || 'Sistema',
      accion, modulo, detalle, datos,
    }
    logs.unshift(nuevo)
    if (logs.length > MAX_LOGS) logs.splice(MAX_LOGS)
    guardar(k('auditoria'), logs)
    return ok(nuevo)
  } catch { return ok(null) }
}

export function getAuditoria(filtros = {}) {
  let logs = leer(k('auditoria')) || []
  if (filtros.usuarioId) logs = logs.filter(l => l.usuarioId === filtros.usuarioId)
  if (filtros.modulo)    logs = logs.filter(l => l.modulo === filtros.modulo)
  if (filtros.accion)    logs = logs.filter(l => l.accion === filtros.accion)
  if (filtros.desde)     logs = logs.filter(l => l.fecha >= filtros.desde)
  if (filtros.hasta)     logs = logs.filter(l => l.fecha <= filtros.hasta)
  if (filtros.busqueda) {
    const q = filtros.busqueda.toLowerCase()
    logs = logs.filter(l =>
      l.detalle?.toLowerCase().includes(q) ||
      l.usuarioNombre?.toLowerCase().includes(q) ||
      l.modulo?.toLowerCase().includes(q)
    )
  }
  return ok(logs)
}

export function limpiarAuditoria() {
  guardar(k('auditoria'), [])
  return ok(true)
}

// ═══════════════════════════════════════════════════════════
// CUENTAS POR COBRAR
// ═══════════════════════════════════════════════════════════
export function getCxC(){let d=leer(k('cxc'))||demo(CXC_DEMO);if(!leer(k('cxc')))guardar(k('cxc'),demo(CXC_DEMO));return ok([...d].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)))}
export function saveCxC(doc){const l=leer(k('cxc'))||demo(CXC_DEMO);const t=new Date().toISOString();if(doc.id){const i=l.findIndex(x=>x.id===doc.id);if(i>=0)l[i]={...doc,updatedAt:t};else l.push({...doc,id:newId(),createdAt:t})}else l.push({...doc,id:newId(),createdAt:t});guardar(k('cxc'),l);_audit('SAVE','cxc',`CxC ${doc.numero}`);return ok(true)}
export function deleteCxC(id){guardar(k('cxc'),(leer(k('cxc'))||[]).filter(x=>x.id!==id));return ok(true)}

// ═══════════════════════════════════════════════════════════
// PROFORMAS
// ═══════════════════════════════════════════════════════════
export function getProformas(){let d=leer(k('proformas'))||demo(PROF_DEMO);if(!leer(k('proformas')))guardar(k('proformas'),demo(PROF_DEMO));return ok([...d].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)))}
export function saveProforma(p){const l=leer(k('proformas'))||demo(PROF_DEMO);const t=new Date().toISOString();if(p.id){const i=l.findIndex(x=>x.id===p.id);if(i>=0)l[i]={...p,updatedAt:t};else l.push({...p,id:newId(),createdAt:t})}else l.push({...p,id:newId(),createdAt:t});guardar(k('proformas'),l);_audit('SAVE','proformas',`Proforma ${p.numero}`);return ok(true)}
export function deleteProforma(id){guardar(k('proformas'),(leer(k('proformas'))||[]).filter(x=>x.id!==id));return ok(true)}

// ═══════════════════════════════════════════════════════════
// LOTES Y SERIES
// ═══════════════════════════════════════════════════════════
export function getLotesProducto(productoId){
  const movs = (leer(KEYS.movimientos)||[]).filter(m=>m.productoId===productoId&&m.lote)
  const map = {}
  movs.forEach(m=>{
    const key=m.lote
    if(!map[key])map[key]={lote:key,productoId,entradas:0,salidas:0,costo:m.costoUnitario||0,fechaEntrada:m.fecha,fechaUltMov:m.fecha}
    if(m.tipo==='ENTRADA')map[key].entradas+=(m.cantidad||0)
    if(m.tipo==='SALIDA')map[key].salidas+=(m.cantidad||0)
    if(m.fecha>map[key].fechaUltMov)map[key].fechaUltMov=m.fecha
  })
  return ok(Object.values(map).map(l=>({...l,saldo:Math.max(0,l.entradas-l.salidas)})))
}

// ═══════════════════════════════════════════════════════════
// ÁREAS INTERNAS
// ═══════════════════════════════════════════════════════════
export function getAreas(filtros={}) {
  let data = leer(k('areas')) || demo(AREAS_DEMO)
  if (!leer(k('areas'))) guardar(k('areas'), demo(AREAS_DEMO))
  if (filtros.activo !== undefined) data = data.filter(a => a.activo === filtros.activo)
  return ok([...data].sort((a,b) => a.nombre.localeCompare(b.nombre)))
}

export function saveArea(area) {
  if (!area.nombre?.trim()) return err('El nombre del área es obligatorio')
  if (!area.codigo?.trim()) return err('El código del área es obligatorio')
  const lista = leer(k('areas')) || demo(AREAS_DEMO)
  const ahora = new Date().toISOString()
  const esNueva = !area.id
  if (area.id) {
    const idx = lista.findIndex(a => a.id === area.id)
    if (idx >= 0) lista[idx] = { ...area, updatedAt: ahora }
    else lista.push({ ...area, updatedAt: ahora })
  } else {
    const codigo = area.codigo.trim().toUpperCase()
    if (lista.find(a => a.codigo === codigo)) return err(`El código '${codigo}' ya está en uso`)
    lista.push({ ...area, id: newId(), codigo, activo: true, createdAt: ahora })
  }
  guardar(k('areas'), lista)
  _audit(esNueva?'CREATE':'UPDATE','areas',`Área ${esNueva?'creada':'modificada'} — ${area.nombre}`)
  return ok(true)
}

export function deleteArea(id) {
  const area = (leer(k('areas'))||[]).find(a => a.id === id)
  guardar(k('areas'), (leer(k('areas'))||[]).filter(a => a.id !== id))
  _audit('DELETE','areas',`Área eliminada — ${area?.nombre||id}`)
  return ok(true)
}

// ═══════════════════════════════════════════════════════════
// PEDIDOS INTERNOS
// Estados: BORRADOR → ENVIADO → APROBADO → PICKING → ENTREGADO | RECHAZADO
// ═══════════════════════════════════════════════════════════
function _nextNumeroPI() {
  const lista = leer(k('pedidos_internos')) || []
  const nums = lista
    .map(p => parseInt((p.numero||'').split('-').pop()) || 0)
    .filter(n => !isNaN(n))
  const max = nums.length ? Math.max(...nums) : 0
  return `NDI-001-${String(max + 1).padStart(4,'0')}`
}

export function getPedidosInternos(filtros={}) {
  let data = leer(k('pedidos_internos')) || demo(PI_DEMO)
  if (!leer(k('pedidos_internos'))) guardar(k('pedidos_internos'), demo(PI_DEMO))
  if (filtros.estado)    data = data.filter(p => p.estado    === filtros.estado)
  if (filtros.areaId)    data = data.filter(p => p.areaId    === filtros.areaId)
  if (filtros.prioridad) data = data.filter(p => p.prioridad === filtros.prioridad)
  if (filtros.desde)     data = data.filter(p => p.fecha     >= filtros.desde)
  if (filtros.hasta)     data = data.filter(p => p.fecha     <= filtros.hasta)
  return ok([...data].sort((a,b) => b.createdAt.localeCompare(a.createdAt)))
}

export function getPedidoInternoById(id) {
  const l = leer(k('pedidos_internos')) || demo(PI_DEMO)
  const p = l.find(x => x.id === id)
  return p ? ok(p) : err('Pedido interno no encontrado')
}

export function savePedidoInterno(pedido) {
  if (!pedido.areaId)               return err('Selecciona el área solicitante')
  if (!pedido.almacenId)            return err('Selecciona el almacén de despacho')
  if (!pedido.fechaRequerida)       return err('Indica la fecha requerida')
  if (!pedido.items?.length)        return err('Agrega al menos un producto')
  const itemInvalido = pedido.items.find(it => !it.productoId || !(it.cantidad > 0))
  if (itemInvalido) return err('Todos los items deben tener producto y cantidad válida')

  const lista = leer(k('pedidos_internos')) || demo(PI_DEMO)
  const ahora = new Date().toISOString()
  const esNuevo = !pedido.id
  if (pedido.id) {
    const idx = lista.findIndex(p => p.id === pedido.id)
    if (idx >= 0) lista[idx] = { ...lista[idx], ...pedido, updatedAt: ahora }
    else lista.push({ ...pedido, updatedAt: ahora })
  } else {
    lista.push({
      ...pedido,
      id:       newId(),
      numero:   _nextNumeroPI(),
      estado:   pedido.estado || 'BORRADOR',
      prioridad:pedido.prioridad || 'NORMAL',
      fecha:    pedido.fecha || fechaHoy(),
      createdAt: ahora,
      updatedAt: ahora,
    })
  }
  guardar(k('pedidos_internos'), lista)
  _audit(esNuevo?'CREATE':'UPDATE','pedidos_internos',
    `Pedido interno ${esNuevo?'creado':'modificado'} — ${pedido.numero||'nuevo'} · Área: ${pedido.areaId}`)
  return ok(true)
}

export function enviarPedidoInterno(id) {
  const lista = leer(k('pedidos_internos')) || []
  const idx   = lista.findIndex(p => p.id === id)
  if (idx < 0) return err('Pedido no encontrado')
  if (lista[idx].estado !== 'BORRADOR') return err('Solo se pueden enviar pedidos en borrador')
  lista[idx] = { ...lista[idx], estado: 'ENVIADO', updatedAt: new Date().toISOString() }
  guardar(k('pedidos_internos'), lista)
  _audit('UPDATE','pedidos_internos',`Pedido interno enviado — ${lista[idx].numero}`)
  return ok(true)
}

export function aprobarPedidoInterno(id, usuarioAprobadorId, notasAprobacion='') {
  const lista = leer(k('pedidos_internos')) || []
  const idx   = lista.findIndex(p => p.id === id)
  if (idx < 0) return err('Pedido no encontrado')
  if (lista[idx].estado !== 'ENVIADO') return err('Solo se pueden aprobar pedidos enviados')
  const ahora = new Date().toISOString()
  lista[idx] = {
    ...lista[idx], estado: 'APROBADO',
    usuarioAprobadorId, notasAprobacion,
    fechaAprobacion: ahora.split('T')[0],
    updatedAt: ahora,
  }
  guardar(k('pedidos_internos'), lista)
  _audit('UPDATE','pedidos_internos',`Pedido interno aprobado — ${lista[idx].numero}`)
  return ok(true)
}

export function rechazarPedidoInterno(id, usuarioAprobadorId, motivoRechazo) {
  if (!motivoRechazo?.trim()) return err('Debes indicar el motivo del rechazo')
  const lista = leer(k('pedidos_internos')) || []
  const idx   = lista.findIndex(p => p.id === id)
  if (idx < 0) return err('Pedido no encontrado')
  if (!['ENVIADO','APROBADO'].includes(lista[idx].estado)) return err('Estado no permite rechazo')
  lista[idx] = {
    ...lista[idx], estado: 'RECHAZADO',
    usuarioAprobadorId, motivoRechazo: motivoRechazo.trim(),
    updatedAt: new Date().toISOString(),
  }
  guardar(k('pedidos_internos'), lista)
  _audit('UPDATE','pedidos_internos',`Pedido interno rechazado — ${lista[idx].numero} · Motivo: ${motivoRechazo}`)
  return ok(true)
}

export function marcarPickingPI(id) {
  const lista = leer(k('pedidos_internos')) || []
  const idx   = lista.findIndex(p => p.id === id)
  if (idx < 0) return err('Pedido no encontrado')
  if (lista[idx].estado !== 'APROBADO') return err('Solo se puede iniciar picking en pedidos aprobados')
  lista[idx] = { ...lista[idx], estado: 'PICKING', updatedAt: new Date().toISOString() }
  guardar(k('pedidos_internos'), lista)
  _audit('UPDATE','pedidos_internos',`Picking iniciado — ${lista[idx].numero}`)
  return ok(true)
}

export function entregarPedidoInterno(id, usuarioEntregaId) {
  const lista = leer(k('pedidos_internos')) || []
  const idx   = lista.findIndex(p => p.id === id)
  if (idx < 0) return err('Pedido no encontrado')
  if (lista[idx].estado !== 'PICKING') return err('Solo se pueden entregar pedidos en picking')
  const ahora = new Date().toISOString()
  lista[idx] = {
    ...lista[idx], estado: 'ENTREGADO',
    fechaEntrega: ahora.split('T')[0],
    usuarioEntregaId,
    reciboConfirmado: false,
    updatedAt: ahora,
  }
  guardar(k('pedidos_internos'), lista)
  _audit('UPDATE','pedidos_internos',`Pedido interno entregado — ${lista[idx].numero}`)
  return ok(true)
}

export function confirmarReciboPedido(id) {
  const lista = leer(k('pedidos_internos')) || []
  const idx   = lista.findIndex(p => p.id === id)
  if (idx < 0) return err('Pedido no encontrado')
  lista[idx] = { ...lista[idx], reciboConfirmado: true, updatedAt: new Date().toISOString() }
  guardar(k('pedidos_internos'), lista)
  return ok(true)
}

export function deletePedidoInterno(id) {
  const lista = leer(k('pedidos_internos')) || []
  const pi = lista.find(p => p.id === id)
  if (pi && pi.estado !== 'BORRADOR') return err('Solo se pueden eliminar pedidos en borrador')
  guardar(k('pedidos_internos'), lista.filter(p => p.id !== id))
  _audit('DELETE','pedidos_internos',`Pedido interno eliminado — ${pi?.numero||id}`)
  return ok(true)
}
