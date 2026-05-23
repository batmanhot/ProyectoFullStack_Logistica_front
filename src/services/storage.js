/**
 * StockPro — Capa de Datos v2.0
 * Demo data extracted to src/data/demoData.js
 */
import { newId, fechaHoy } from '../utils/helpers'
import {
  CONFIG_DEFAULT, CAT, ALM, PROV, PROD, MOV, OC,
  ROLES, USR, AJ, DEV, TR, COT,
  CLIENTES_DEMO, DESPACHOS_DEMO, TRANSPORTISTAS_DEMO, RUTAS_DEMO,
  CXC_DEMO, PROF_DEMO,
} from '../data/demoData'
import {
  validateProducto, validateMovimiento, validateOrden,
  validateDespacho, validateCliente, validateTransferencia, validateUsuario,
} from './validators'

const KEYS={config:'sp_config',productos:'sp_productos',categorias:'sp_categorias',almacenes:'sp_almacenes',proveedores:'sp_proveedores',movimientos:'sp_movimientos',ordenes:'sp_ordenes',usuarios:'sp_usuarios'}

// ── Auditoría interna — se llama desde cada función de escritura ──────
function _audit(accion, modulo, detalle, datos) {
  try {
    const ses   = JSON.parse(localStorage.getItem('sp_session') || 'null')
    const logs  = JSON.parse(localStorage.getItem('sp_auditoria') || '[]')
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
    localStorage.setItem('sp_auditoria', JSON.stringify(logs))
  } catch(e) { /* silencioso — no interrumpir operación */ }
}

function leer(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
function guardar(key,data){try{localStorage.setItem(key,JSON.stringify(data));return true}catch{return false}}
function ok(data){return{data,error:null}}
function err(msg){return{data:null,error:msg}}

export function getConfig(){return ok({...CONFIG_DEFAULT,...(leer(KEYS.config)||{})})}
export function saveConfig(cfg){const c=leer(KEYS.config)||{};guardar(KEYS.config,{...c,...cfg});return ok(true)}

export function getCategorias(){const d=leer(KEYS.categorias)||CAT;if(!leer(KEYS.categorias))guardar(KEYS.categorias,CAT);return ok(d)}
export function saveCategoria(c){const l=leer(KEYS.categorias)||CAT;if(c.id){const i=l.findIndex(x=>x.id===c.id);if(i>=0)l[i]=c;else return err('No encontrado')}else l.push({...c,id:newId(),activo:true});guardar(KEYS.categorias,l);return ok(true)}
export function deleteCategoria(id){guardar(KEYS.categorias,(leer(KEYS.categorias)||[]).filter(c=>c.id!==id));return ok(true)}
export function getCategoriasAll(){return getCategorias()}

export function getAlmacenes(){const d=leer(KEYS.almacenes)||ALM;if(!leer(KEYS.almacenes))guardar(KEYS.almacenes,ALM);return ok(d)}
export function saveAlmacen(a){const l=leer(KEYS.almacenes)||ALM;if(a.id){const i=l.findIndex(x=>x.id===a.id);if(i>=0)l[i]=a;else l.push({...a,id:newId(),activo:true})}else l.push({...a,id:newId(),activo:true});guardar(KEYS.almacenes,l);return ok(true)}
export function deleteAlmacen(id){guardar(KEYS.almacenes,(leer(KEYS.almacenes)||[]).filter(a=>a.id!==id));return ok(true)}

export function getProveedores(){const d=leer(KEYS.proveedores)||PROV;if(!leer(KEYS.proveedores))guardar(KEYS.proveedores,PROV);return ok(d)}
export function saveProveedor(p){
  const l=leer(KEYS.proveedores)||PROV;const esNuevo=!p.id
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
export function getProductos(){let d=leer(KEYS.productos);if(!d){guardar(KEYS.productos,PROD);d=PROD}return ok(d)}
export function getProductoById(id){const l=leer(KEYS.productos)||PROD;const p=l.find(x=>x.id===id);return p?ok(p):err('Producto no encontrado')}
export function saveProducto(prod){
  const vErr = validateProducto(prod, {
    categorias: leer(KEYS.categorias)||CAT,
    almacenes:  leer(KEYS.almacenes)||ALM,
    proveedores:leer(KEYS.proveedores)||PROV,
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
// MOVIMIENTOS — 6 meses historial (Ago 2024 – Mar 2025)
// ═══════════════════════════════════════════════════════════
export function getMovimientos(f={}){let d=leer(KEYS.movimientos)||MOV;if(!leer(KEYS.movimientos))guardar(KEYS.movimientos,MOV);if(f.productoId)d=d.filter(m=>m.productoId===f.productoId);if(f.tipo)d=d.filter(m=>m.tipo===f.tipo);if(f.desde)d=d.filter(m=>m.fecha>=f.desde);if(f.hasta)d=d.filter(m=>m.fecha<=f.hasta);return ok([...d].sort((a,b)=>b.fecha.localeCompare(a.fecha)))}
export function registrarMovimiento(mov){
  const prods=leer(KEYS.productos)||[]
  const vErr=validateMovimiento(mov,{productos:prods,almacenes:leer(KEYS.almacenes)||ALM})
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
export function getOrdenes(f={}){let d=leer(KEYS.ordenes)||OC;if(!leer(KEYS.ordenes))guardar(KEYS.ordenes,OC);if(f.estado)d=d.filter(o=>o.estado===f.estado);return ok([...d].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)))}
export function getOrdenById(id){const l=leer(KEYS.ordenes)||OC;const o=l.find(x=>x.id===id);return o?ok(o):err('No encontrada')}
export function saveOrden(orden){
  const vErr=validateOrden(orden,{proveedores:leer(KEYS.proveedores)||PROV,productos:leer(KEYS.productos)||[]})
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
export function getUsuarios(){const d=leer('sp_usuarios')||USR;if(!leer('sp_usuarios'))guardar('sp_usuarios',USR);return ok(d)}
export function saveUsuario(u){
  const vErr=validateUsuario(u)
  if(vErr) return err(vErr)
  const l=leer('sp_usuarios')||USR;const esNuevo=!u.id
  if(u.id){const i=l.findIndex(x=>x.id===u.id);if(i>=0)l[i]={...l[i],...u};else l.push({...u,id:newId(),createdAt:new Date().toISOString()})}
  else l.push({...u,id:newId(),createdAt:new Date().toISOString()})
  guardar('sp_usuarios',l)
  _audit(esNuevo?'CREATE':'UPDATE','usuarios',`Usuario ${esNuevo?'creado':'modificado'} — ${u.nombre} (${u.rol})`)
  return ok(true)
}
export function deleteUsuario(id){
  const u=(leer('sp_usuarios')||[]).find(x=>x.id===id)
  guardar('sp_usuarios',(leer('sp_usuarios')||[]).filter(x=>x.id!==id))
  _audit('DELETE','usuarios',`Usuario eliminado — ${u?.nombre||id}`)
  return ok(true)
}
export function loginUsuario(email,password){const l=leer('sp_usuarios')||USR;const u=l.find(x=>x.email===email&&x.password===password&&x.activo);if(!u){registrarAuditoria({usuarioId:'desconocido',usuarioNombre:email,accion:'LOGIN_FAILED',modulo:'auth',detalle:`Intento de acceso fallido para: ${email}`});return err('Credenciales incorrectas o usuario inactivo');}const s={...u,loginAt:new Date().toISOString()};guardar('sp_session',s);registrarAuditoria({usuarioId:u.id,usuarioNombre:u.nombre,accion:'LOGIN',modulo:'auth',detalle:`Inicio de sesión exitoso`});return ok(s)}
export function getSession(){return ok(leer('sp_session'))}
export function logout(){
  const ses=leer('sp_session')
  _audit('LOGOUT','auth',`Cierre de sesión — ${ses?.nombre||'usuario'}`)
  localStorage.removeItem('sp_session');return ok(true)
}
export function getRoles(){
  try {
    const custom = JSON.parse(localStorage.getItem('sp_roles_custom')||'{}')
    return ok({...ROLES,...custom})
  } catch { return ok(ROLES) }
}
export function tienePermiso(rol,modulo){
  let r = ROLES[rol]
  if(!r){
    try { const custom=JSON.parse(localStorage.getItem('sp_roles_custom')||'{}'); r=custom[rol] } catch {}
  }
  if(!r) return false
  return r.permisos.includes('*')||r.permisos.includes(modulo)
}

// ═══════════════════════════════════════════════════════════
// AJUSTES
// ═══════════════════════════════════════════════════════════
export function getAjustes(f={}){let d=leer('sp_ajustes')||AJ;if(!leer('sp_ajustes'))guardar('sp_ajustes',AJ);if(f.productoId)d=d.filter(a=>a.productoId===f.productoId);if(f.desde)d=d.filter(a=>a.fecha>=f.desde);if(f.hasta)d=d.filter(a=>a.fecha<=f.hasta);return ok([...d].sort((a,b)=>b.fecha.localeCompare(a.fecha)))}
export function registrarAjuste(a){const l=leer('sp_ajustes')||[];l.push({...a,id:newId(),createdAt:new Date().toISOString()});guardar('sp_ajustes',l);return ok(true)}

// DEVOLUCIONES
export function getDevoluciones(f={}){let d=leer('sp_devoluciones')||DEV;if(!leer('sp_devoluciones'))guardar('sp_devoluciones',DEV);if(f.tipo)d=d.filter(x=>x.tipo===f.tipo);if(f.desde)d=d.filter(x=>x.fecha>=f.desde);return ok([...d].sort((a,b)=>b.fecha.localeCompare(a.fecha)))}
export function registrarDevolucion(dev){const l=leer('sp_devoluciones')||[];l.push({...dev,id:newId(),createdAt:new Date().toISOString()});guardar('sp_devoluciones',l);return ok(true)}

// TRANSFERENCIAS
export function getTransferencias(f={}){let d=leer('sp_transferencias')||TR;if(!leer('sp_transferencias'))guardar('sp_transferencias',TR);if(f.productoId)d=d.filter(t=>t.productoId===f.productoId);if(f.desde)d=d.filter(t=>t.fecha>=f.desde);if(f.hasta)d=d.filter(t=>t.fecha<=f.hasta);return ok([...d].sort((a,b)=>b.fecha.localeCompare(a.fecha)))}
export function registrarTransferencia(tr){
  const vErr=validateTransferencia(tr,{productos:leer(KEYS.productos)||[],almacenes:leer(KEYS.almacenes)||ALM})
  if(vErr) return err(vErr)
  const l=leer('sp_transferencias')||[];l.push({...tr,id:newId(),createdAt:new Date().toISOString()});guardar('sp_transferencias',l);return ok(true)
}

// KARDEX
export function getKardex(pId){
  const movs=(leer(KEYS.movimientos)||[]).filter(m=>m.productoId===pId)
  const trs=(leer('sp_transferencias')||[]).filter(t=>t.productoId===pId)
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
  // Secondary sort: por createdAt completo (ISO), luego por id numérico del movimiento
  lines.sort((a,b)=>{
    // Normalizar fecha a YYYY-MM-DD para comparación segura
    function toYMD(f){
      if(!f) return '0000-00-00'
      const s=String(f).trim()
      // Si viene como DD/MM/YYYY convertir
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
export function getCotizaciones(f={}){let d=leer('sp_cotizaciones')||COT;if(!leer('sp_cotizaciones'))guardar('sp_cotizaciones',COT);if(f.estado)d=d.filter(c=>c.estado===f.estado);return ok([...d].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)))}
export function saveCotizacion(c){const l=leer('sp_cotizaciones')||[];const t=new Date().toISOString();if(c.id){const i=l.findIndex(x=>x.id===c.id);if(i>=0)l[i]={...c,updatedAt:t};else l.push({...c,updatedAt:t})}else l.push({...c,id:newId(),createdAt:t});guardar('sp_cotizaciones',l);return ok(true)}

// INVENTARIO FÍSICO
export function getInventariosFisicos(){return ok([...(leer('sp_inv_fisico')||[])].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)))}
export function saveInventarioFisico(inv){const l=leer('sp_inv_fisico')||[];const t=new Date().toISOString();if(inv.id){const i=l.findIndex(x=>x.id===inv.id);if(i>=0)l[i]={...inv,updatedAt:t};else l.push({...inv,updatedAt:t})}else l.push({...inv,id:newId(),createdAt:t});guardar('sp_inv_fisico',l);return ok(true)}

// NOTIFICACIONES
export function getNotificaciones(){return ok(leer('sp_notif')||[])}
export function saveNotificacion(n){const l=leer('sp_notif')||[];l.unshift({...n,id:newId(),createdAt:new Date().toISOString(),leida:false});if(l.length>200)l.splice(200);guardar('sp_notif',l);return ok(true)}
export function marcarNotifLeida(id){const l=leer('sp_notif')||[];const i=l.findIndex(n=>n.id===id);if(i>=0)l[i].leida=true;guardar('sp_notif',l);return ok(true)}
export function marcarTodasLeidas(){guardar('sp_notif',(leer('sp_notif')||[]).map(n=>({...n,leida:true})));return ok(true)}

// RESET Y EXPORTACIÓN

// Lista maestra de claves operativas — usada por ambas funciones de reset
// para garantizar que siempre sean simétricas (lo que uno borra, el otro restaura)
const OPERATIONAL_KEYS = [
  'sp_productos', 'sp_proveedores', 'sp_movimientos', 'sp_ordenes',
  'sp_ajustes', 'sp_devoluciones', 'sp_transferencias', 'sp_cotizaciones',
  'sp_inv_fisico', 'sp_clientes', 'sp_despachos', 'sp_transportistas',
  'sp_rutas', 'sp_notif', 'sp_alertas_leidas',
  'sp_cxc', 'sp_proformas',
  'sp_empaques', 'sp_flota', 'sp_listas_precios',
  'sp_auditoria',
]

// Borra todo (operativo + estructura) para que initDemo recargue el dataset demo completo
export function resetDemo(){
  [...OPERATIONAL_KEYS, 'sp_config','sp_categorias','sp_almacenes','sp_usuarios','sp_session','sp_demo_version']
    .forEach(k => localStorage.removeItem(k))
  return ok(true)
}

// Elimina solo datos operativos — conserva config, categorías, almacenes y usuarios.
// Usamos guardar(k, []) en vez de removeItem para que los getters encuentren la clave
// existente (aunque vacía) y no auto-siembren los datos demo al recargar.
export function limpiarDatosOperativos(){
  OPERATIONAL_KEYS.forEach(k => guardar(k, []))
  return ok(true)
}
export function exportarDatos(){const d={};['sp_config','sp_productos','sp_categorias','sp_almacenes','sp_proveedores','sp_movimientos','sp_ordenes','sp_usuarios','sp_ajustes','sp_devoluciones','sp_transferencias','sp_cotizaciones'].forEach(k=>{try{d[k]=JSON.parse(localStorage.getItem(k)||'null')}catch{d[k]=null}});return ok(d)}

// ═══════════════════════════════════════════════════════════
// CLIENTES
// ═══════════════════════════════════════════════════════════
export function getClientes(filtros={}) {
  let data = leer('sp_clientes') || CLIENTES_DEMO
  if (!leer('sp_clientes')) guardar('sp_clientes', CLIENTES_DEMO)
  if (filtros.busqueda) {
    const q = filtros.busqueda.toLowerCase()
    data = data.filter(c => c.razonSocial.toLowerCase().includes(q) || c.ruc?.includes(filtros.busqueda))
  }
  return ok(data)
}

export function saveCliente(cli) {
  const vErr=validateCliente(cli)
  if(vErr) return err(vErr)
  const lista = leer('sp_clientes') || CLIENTES_DEMO
  const ahora = new Date().toISOString()
  if (cli.id) {
    const idx = lista.findIndex(c => c.id === cli.id)
    if (idx >= 0) lista[idx] = { ...cli, updatedAt: ahora }
    else lista.push({ ...cli, updatedAt: ahora })
  } else {
    lista.push({ ...cli, id: newId(), createdAt: ahora, activo: true })
  }
  guardar('sp_clientes', lista)
  _audit(cli.id?'UPDATE':'CREATE','clientes',`Cliente ${cli.id?'modificado':'creado'} — ${cli.razonSocial}`)
  return ok(true)
}

export function deleteCliente(id) {
  const cli=(leer('sp_clientes')||[]).find(x=>x.id===id)
  guardar('sp_clientes', (leer('sp_clientes') || []).filter(c => c.id !== id))
  _audit('DELETE','clientes',`Cliente eliminado — ${cli?.razonSocial||id}`)
  return ok(true)
}

// ═══════════════════════════════════════════════════════════
// DESPACHOS (Pedidos → Picking → Guía de Remisión → Entrega)
// ═══════════════════════════════════════════════════════════
/*
  Estados del flujo:
  PEDIDO    → pedido registrado, pendiente de aprobación
  APROBADO  → aprobado, pendiente de preparación (picking)
  PICKING   → en preparación en almacén
  LISTO     → listo para despachar
  DESPACHADO→ guía emitida, en tránsito
  ENTREGADO → confirmado por el cliente
  ANULADO   → cancelado
*/

// ── Reparar números de despacho corruptos (bug generarNumDoc) ─
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
  if (changed) guardar('sp_despachos', lista)
  return lista
}

export function getDespachos(filtros={}) {
  let data = leer('sp_despachos') || DESPACHOS_DEMO
  if (!leer('sp_despachos')) guardar('sp_despachos', DESPACHOS_DEMO)
  data = _repararNumeroDespacho(data)
  if (filtros.estado) data = data.filter(d => d.estado === filtros.estado)
  if (filtros.clienteId) data = data.filter(d => d.clienteId === filtros.clienteId)
  if (filtros.desde) data = data.filter(d => d.fecha >= filtros.desde)
  return ok([...data].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
}

export function getDespachoById(id){const l=leer('sp_despachos')||DESPACHOS_DEMO;const d=l.find(x=>x.id===id);return d?ok(d):err('Despacho no encontrado')}

export function saveDespacho(des) {
  const vErr=validateDespacho(des,{clientes:leer('sp_clientes')||CLIENTES_DEMO,almacenes:leer(KEYS.almacenes)||ALM,productos:leer(KEYS.productos)||[]})
  if(vErr) return err(vErr)
  const lista = leer('sp_despachos') || []
  const ahora = new Date().toISOString()
  if (des.id) {
    const idx = lista.findIndex(d => d.id === des.id)
    if (idx >= 0) lista[idx] = { ...des, updatedAt: ahora }
    else lista.push({ ...des, id: newId(), createdAt: ahora })
  } else {
    lista.push({ ...des, id: newId(), createdAt: ahora })
  }
  guardar('sp_despachos', lista)
  _audit(des.id?'UPDATE':'CREATE','despachos',`Despacho ${des.numero||''} — Cliente: ${des.clienteId} · Estado: ${des.estado}`)
  return ok(true)
}

// ═══════════════════════════════════════════════════════════
// TRANSPORTISTAS
// ═══════════════════════════════════════════════════════════
export function getTransportistas(filtros={}) {
  let data = leer('sp_transportistas') || TRANSPORTISTAS_DEMO
  if (!leer('sp_transportistas')) guardar('sp_transportistas', TRANSPORTISTAS_DEMO)
  if (filtros.tipo) data = data.filter(t => t.tipo === filtros.tipo)
  return ok(data)
}

export function saveTransportista(tra) {
  const lista = leer('sp_transportistas') || TRANSPORTISTAS_DEMO
  const ahora = new Date().toISOString()
  if (tra.id) {
    const idx = lista.findIndex(t => t.id === tra.id)
    if (idx >= 0) lista[idx] = { ...tra, updatedAt: ahora }
    else lista.push({ ...tra, updatedAt: ahora })
  } else {
    lista.push({ ...tra, id: newId(), createdAt: ahora, activo: true })
  }
  guardar('sp_transportistas', lista)
  return ok(true)
}

export function deleteTransportista(id) {
  guardar('sp_transportistas', (leer('sp_transportistas') || []).filter(t => t.id !== id))
  return ok(true)
}

// ═══════════════════════════════════════════════════════════
// RUTAS / SALIDAS (programación de viajes)
// ═══════════════════════════════════════════════════════════
/*
  Estados:
  PROGRAMADA  → ruta creada, aún no sale
  EN_RUTA     → vehículo en camino
  COMPLETADA  → todos los despachos entregados
  INCOMPLETA  → terminó pero quedaron despachos sin entregar
  CANCELADA   → cancelada antes de salir
*/
export function getRutas(filtros={}) {
  let data = leer('sp_rutas') || RUTAS_DEMO
  if (!leer('sp_rutas')) guardar('sp_rutas', RUTAS_DEMO)
  if (filtros.estado) data = data.filter(r => r.estado === filtros.estado)
  if (filtros.transportistaId) data = data.filter(r => r.transportistaId === filtros.transportistaId)
  if (filtros.fecha) data = data.filter(r => r.fechaSalida === filtros.fecha)
  return ok([...data].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
}

export function saveRuta(ruta) {
  const lista = leer('sp_rutas') || []
  const ahora = new Date().toISOString()
  if (ruta.id) {
    const idx = lista.findIndex(r => r.id === ruta.id)
    if (idx >= 0) lista[idx] = { ...ruta, updatedAt: ahora }
    else lista.push({ ...ruta, id: newId(), createdAt: ahora })
  } else {
    lista.push({ ...ruta, id: newId(), createdAt: ahora })
  }
  guardar('sp_rutas', lista)
  return ok(true)
}

// ── Stock Reservado por Despachos activos ─────────────────
const ESTADOS_RESERVA = ['PEDIDO','APROBADO','PICKING','LISTO']

export function getStockReservado() {
  const despachos = leer('sp_despachos') || []
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

// ══════════════════════════════════════════════════════════
// AUDITORÍA DEL SISTEMA
// ══════════════════════════════════════════════════════════
const KEY_AUDIT = 'sp_auditoria'
const MAX_LOGS  = 500

export function registrarAuditoria({ usuarioId, usuarioNombre, accion, modulo, detalle, datos = null }) {
  try {
    const logs = leer(KEY_AUDIT) || []
    const nuevo = {
      id:             newId(),
      timestamp:      new Date().toISOString(),
      fecha:          new Date().toISOString().split('T')[0],
      hora:           new Date().toTimeString().slice(0,8),
      usuarioId:      usuarioId || 'sistema',
      usuarioNombre:  usuarioNombre || 'Sistema',
      accion,
      modulo,
      detalle,
      datos,
    }
    logs.unshift(nuevo)
    if (logs.length > MAX_LOGS) logs.splice(MAX_LOGS)
    guardar(KEY_AUDIT, logs)
    return ok(nuevo)
  } catch { return ok(null) }
}

export function getAuditoria(filtros = {}) {
  let logs = leer(KEY_AUDIT) || []
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
  guardar(KEY_AUDIT, [])
  return ok(true)
}

// ══════════════════════════════════════════════════════════
// CUENTAS POR COBRAR (CxC)
// ══════════════════════════════════════════════════════════
export function getCxC(){let d=leer('sp_cxc')||CXC_DEMO;if(!leer('sp_cxc'))guardar('sp_cxc',CXC_DEMO);return ok([...d].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)))}
export function saveCxC(doc){const l=leer('sp_cxc')||CXC_DEMO;const t=new Date().toISOString();if(doc.id){const i=l.findIndex(x=>x.id===doc.id);if(i>=0)l[i]={...doc,updatedAt:t};else l.push({...doc,id:newId(),createdAt:t})}else l.push({...doc,id:newId(),createdAt:t});guardar('sp_cxc',l);_audit('SAVE','cxc',`CxC ${doc.numero}`);return ok(true)}
export function deleteCxC(id){guardar('sp_cxc',(leer('sp_cxc')||[]).filter(x=>x.id!==id));return ok(true)}

// ══════════════════════════════════════════════════════════
// PROFORMAS / COTIZACIONES DE VENTA A CLIENTES
// ══════════════════════════════════════════════════════════
export function getProformas(){let d=leer('sp_proformas')||PROF_DEMO;if(!leer('sp_proformas'))guardar('sp_proformas',PROF_DEMO);return ok([...d].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)))}
export function saveProforma(p){const l=leer('sp_proformas')||PROF_DEMO;const t=new Date().toISOString();if(p.id){const i=l.findIndex(x=>x.id===p.id);if(i>=0)l[i]={...p,updatedAt:t};else l.push({...p,id:newId(),createdAt:t})}else l.push({...p,id:newId(),createdAt:t});guardar('sp_proformas',l);_audit('SAVE','proformas',`Proforma ${p.numero}`);return ok(true)}
export function deleteProforma(id){guardar('sp_proformas',(leer('sp_proformas')||[]).filter(x=>x.id!==id));return ok(true)}

// ══════════════════════════════════════════════════════════
// LOTES Y SERIES
// ══════════════════════════════════════════════════════════
export function getLotesProducto(productoId){
  const movs = (leer('sp_movimientos')||[]).filter(m=>m.productoId===productoId&&m.lote)
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
