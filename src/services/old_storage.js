/**
 * StockPro — Capa de Datos v2.0
 * Empresa demo: Distribuidora Lima Norte S.A.C.
 * 24 productos · 7 proveedores · 3 almacenes · 8 categorías · 6 meses historial
 */
import { newId, fechaHoy } from '../utils/helpers'

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

const CONFIG_DEFAULT={empresa:'Distribuidora Lima Norte S.A.C.',ruc:'20512345678',direccion:'Av. Universitaria 2650, Los Olivos, Lima',telefono:'01-537-8900',email:'operaciones@dlnorte.pe',logo:null,moneda:'PEN',simboloMoneda:'S/',formulaValorizacion:'PMP',alertaStockMinimo:true,alertaVencimiento:true,diasAlertaVencimiento:30,serieOC:'OC',serieMov:'MOV'}
export function getConfig(){return ok({...CONFIG_DEFAULT,...(leer(KEYS.config)||{})})}
export function saveConfig(cfg){const c=leer(KEYS.config)||{};guardar(KEYS.config,{...c,...cfg});return ok(true)}

const CAT=[
  {id:'cat1',nombre:'Tecnología',descripcion:'Equipos de cómputo y periféricos',activo:true},
  {id:'cat2',nombre:'Ferretería',descripcion:'Herramientas y materiales',activo:true},
  {id:'cat3',nombre:'Insumos Químicos',descripcion:'Resinas, solventes, adhesivos industriales',activo:true},
  {id:'cat4',nombre:'Papelería',descripcion:'Artículos de oficina, papel, tóner',activo:true},
  {id:'cat5',nombre:'Limpieza',descripcion:'Detergentes, desinfectantes, implementos',activo:true},
  {id:'cat6',nombre:'Alimentos',descripcion:'Productos alimenticios no perecederos',activo:true},
  {id:'cat7',nombre:'Seguridad EPP',descripcion:'Cascos, guantes, ropa certificada',activo:true},
  {id:'cat8',nombre:'Electrodomésticos',descripcion:'Pequeños electrodomésticos',activo:true},
]
export function getCategorias(){const d=leer(KEYS.categorias)||CAT;if(!leer(KEYS.categorias))guardar(KEYS.categorias,CAT);return ok(d)}
export function saveCategoria(c){const l=leer(KEYS.categorias)||CAT;if(c.id){const i=l.findIndex(x=>x.id===c.id);if(i>=0)l[i]=c;else return err('No encontrado')}else l.push({...c,id:newId(),activo:true});guardar(KEYS.categorias,l);return ok(true)}
export function deleteCategoria(id){guardar(KEYS.categorias,(leer(KEYS.categorias)||[]).filter(c=>c.id!==id));return ok(true)}
export function getCategoriasAll(){return getCategorias()}

const ALM=[
  {id:'alm1',nombre:'Almacén Central',   codigo:'ALM-01',ubicacion:'Planta Baja — Los Olivos',   activo:true,default:true},
  {id:'alm2',nombre:'Almacén Secundario',codigo:'ALM-02',ubicacion:'Piso 1 — Los Olivos',        activo:true,default:false},
  {id:'alm3',nombre:'Almacén Frío',      codigo:'ALM-03',ubicacion:'Sótano — Temperatura 4–8°C', activo:true,default:false},
]
export function getAlmacenes(){const d=leer(KEYS.almacenes)||ALM;if(!leer(KEYS.almacenes))guardar(KEYS.almacenes,ALM);return ok(d)}
export function saveAlmacen(a){const l=leer(KEYS.almacenes)||ALM;if(a.id){const i=l.findIndex(x=>x.id===a.id);if(i>=0)l[i]=a;else l.push({...a,id:newId(),activo:true})}else l.push({...a,id:newId(),activo:true});guardar(KEYS.almacenes,l);return ok(true)}
export function deleteAlmacen(id){guardar(KEYS.almacenes,(leer(KEYS.almacenes)||[]).filter(a=>a.id!==id));return ok(true)}

const PROV=[
  {id:'prov1',razonSocial:'TechImport Perú S.A.C.',ruc:'20601234567',contacto:'Ing. Roberto Vargas',direccion:'Av. La Marina 2000, San Miguel, Lima',telefono:'01-425-6700',email:'ventas@techimport.pe',activo:true,plazoEntrega:5},
  {id:'prov2',razonSocial:'Ferretería Industrial Sur',ruc:'20487654321',contacto:'Sra. Elena Mamani',direccion:'Av. Argentina 1560, Callao, Lima',telefono:'01-362-4488',email:'pedidos@ferrsur.pe',activo:true,plazoEntrega:2},
  {id:'prov3',razonSocial:'Químicos del Pacífico E.I.R.L.',ruc:'20533447788',contacto:'Sr. Víctor Quispe',direccion:'Av. Venezuela 3150, Cercado de Lima',telefono:'01-719-3300',email:'quimicos@pacifico.pe',activo:true,plazoEntrega:4},
  {id:'prov4',razonSocial:'Papelera Nacional S.A.',ruc:'20456789012',contacto:'Sra. Carmen Rodríguez',direccion:'Av. Colonial 1230, Breña, Lima',telefono:'01-224-8855',email:'comercial@papnac.pe',activo:true,plazoEntrega:1},
  {id:'prov5',razonSocial:'Limpieza Total Distribuciones',ruc:'20598766543',contacto:'Sr. Marcos Huanca',direccion:'Av. Universitaria 890, San Martín de Porres, Lima',telefono:'987-654-321',email:'marcos@limpiezatotal.pe',activo:true,plazoEntrega:2},
  {id:'prov6',razonSocial:'Alimentos del Norte S.A.C.',ruc:'20577889900',contacto:'Ing. Patricia Flores',direccion:'Av. Naranjal 1100, Los Olivos, Lima',telefono:'01-508-7744',email:'pedidos@alimelnorte.pe',activo:true,plazoEntrega:3},
  {id:'prov7',razonSocial:'Seguridad y EPP Lima',ruc:'20565443210',contacto:'Sr. César Mendoza',direccion:'Av. Próceres de la Independencia 2580, San Juan de Lurigancho, Lima',telefono:'964-321-987',email:'epp@seguridadlima.pe',activo:true,plazoEntrega:3},
]
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
// PRODUCTOS — 24 SKUs con batches reales
// ═══════════════════════════════════════════════════════════
const PROD=[
  // TECNOLOGÍA
  {id:'prod1',sku:'TEC-001',nombre:'Laptop HP 15" Core i5 12va Gen',descripcion:'HP 255 G9, Core i5-1235U, 8GB RAM, 512GB SSD NVMe, 15.6" FHD, Win 11 Pro',categoriaId:'cat1',unidadMedida:'UND',stockActual:18,stockMinimo:5,stockMaximo:50,almacenId:'alm1',proveedorId:'prov1',precioVenta:3450,activo:true,tieneVencimiento:false,fechaVencimiento:null,batches:[{id:'b101',cantidad:10,costo:2780,fecha:'15/08/2024',lote:'L-HP-0824'},{id:'b102',cantidad:8,costo:2850,fecha:'20/11/2024',lote:'L-HP-1124'}],createdAt:'2024-08-15T08:00:00Z',updatedAt:'2024-11-20T10:00:00Z'},
  {id:'prod2',sku:'TEC-002',nombre:'Monitor LG 24" IPS Full HD 75Hz',descripcion:'LG 24MK430H, IPS FHD 1920x1080, 75Hz, HDMI + VGA, AMD FreeSync',categoriaId:'cat1',unidadMedida:'UND',stockActual:11,stockMinimo:4,stockMaximo:30,almacenId:'alm1',proveedorId:'prov1',precioVenta:720,activo:true,tieneVencimiento:false,fechaVencimiento:null,batches:[{id:'b103',cantidad:6,costo:470,fecha:'2024-09-10',lote:'L-LG-0924'},{id:'b104',cantidad:5,costo:488,fecha:'2025-01-08',lote:'L-LG-0125'}],createdAt:'2024-09-10T09:00:00Z',updatedAt:'2025-01-08T11:00:00Z'},
  {id:'prod3',sku:'TEC-003',nombre:'Combo Teclado + Mouse Logitech MK220',descripcion:'Inalámbrico, receptor USB, teclado compacto, mouse óptico 1000dpi',categoriaId:'cat1',unidadMedida:'UND',stockActual:3,stockMinimo:8,stockMaximo:60,almacenId:'alm1',proveedorId:'prov1',precioVenta:95,activo:true,tieneVencimiento:false,fechaVencimiento:null,batches:[{id:'b105',cantidad:3,costo:62,fecha:'2025-01-20',lote:'L-LOG-0125'}],createdAt:'2024-10-01T08:00:00Z',updatedAt:'2025-01-20T08:00:00Z'},
  {id:'prod4',sku:'TEC-004',nombre:'UPS APC Back-UPS 600VA',descripcion:'APC BX600CI-LM, 600VA/300W, 6 salidas, cable USB',categoriaId:'cat1',unidadMedida:'UND',stockActual:7,stockMinimo:3,stockMaximo:20,almacenId:'alm2',proveedorId:'prov1',precioVenta:380,activo:true,tieneVencimiento:false,fechaVencimiento:null,batches:[{id:'b106',cantidad:7,costo:248,fecha:'2024-12-05',lote:'L-APC-1224'}],createdAt:'2024-12-05T10:00:00Z',updatedAt:'2024-12-05T10:00:00Z'},
  // FERRETERÍA
  {id:'prod5',sku:'FER-001',nombre:'Taladro Percutor Bosch GSB 550',descripcion:'Bosch Professional GSB 550, 550W, 13mm, 2 velocidades, maletín incluido',categoriaId:'cat2',unidadMedida:'UND',stockActual:4,stockMinimo:5,stockMaximo:25,almacenId:'alm1',proveedorId:'prov2',precioVenta:285,activo:true,tieneVencimiento:false,fechaVencimiento:null,batches:[{id:'b107',cantidad:4,costo:178,fecha:'2025-02-10',lote:'L-BSH-0225'}],createdAt:'2025-02-10T08:00:00Z',updatedAt:'2025-02-10T08:00:00Z'},
  {id:'prod6',sku:'FER-002',nombre:'Amoladora Angular Stanley 4.5"',descripcion:'Stanley STGT6115, 600W, 11000 rpm, protección ajustable',categoriaId:'cat2',unidadMedida:'UND',stockActual:9,stockMinimo:3,stockMaximo:20,almacenId:'alm1',proveedorId:'prov2',precioVenta:155,activo:true,tieneVencimiento:false,fechaVencimiento:null,batches:[{id:'b108',cantidad:5,costo:95,fecha:'2024-10-15',lote:'L-STN-1024'},{id:'b109',cantidad:4,costo:98,fecha:'2025-01-12',lote:'L-STN-0125'}],createdAt:'2024-10-15T09:00:00Z',updatedAt:'2025-01-12T09:00:00Z'},
  {id:'prod7',sku:'FER-003',nombre:'Cinta Métrica Stanley 5m x 25mm',descripcion:'Stanley PowerLock 5m, 25mm, bloqueo automático',categoriaId:'cat2',unidadMedida:'UND',stockActual:45,stockMinimo:20,stockMaximo:200,almacenId:'alm2',proveedorId:'prov2',precioVenta:28,activo:true,tieneVencimiento:false,fechaVencimiento:null,batches:[{id:'b110',cantidad:30,costo:16.5,fecha:'2024-09-20',lote:'L-STN-0924'},{id:'b111',cantidad:15,costo:17.0,fecha:'2025-02-01',lote:'L-STN-0225'}],createdAt:'2024-09-20T10:00:00Z',updatedAt:'2025-02-01T10:00:00Z'},
  // INSUMOS QUÍMICOS
  {id:'prod8',sku:'QUI-001',nombre:'Resina Epóxica Bicomponente 1kg',descripcion:'Resina A+B 1kg, ratio 2:1, transparente, cura 24h a 25°C',categoriaId:'cat3',unidadMedida:'KG',stockActual:68,stockMinimo:25,stockMaximo:300,almacenId:'alm1',proveedorId:'prov3',precioVenta:78,activo:true,tieneVencimiento:true,fechaVencimiento:'2026-09-30',batches:[{id:'b112',cantidad:30,costo:41,fecha:'2024-10-01',lote:'L-RES-1024'},{id:'b113',cantidad:25,costo:43,fecha:'2025-01-20',lote:'L-RES-0125'},{id:'b114',cantidad:13,costo:44,fecha:'2025-03-05',lote:'L-RES-0325'}],createdAt:'2024-10-01T08:00:00Z',updatedAt:'2025-03-05T09:00:00Z'},
  {id:'prod9',sku:'QUI-002',nombre:'Thinner Acrílico 1L',descripcion:'Thinner acrílico estándar 1 litro, uso industrial',categoriaId:'cat3',unidadMedida:'LT',stockActual:120,stockMinimo:40,stockMaximo:500,almacenId:'alm1',proveedorId:'prov3',precioVenta:12,activo:true,tieneVencimiento:true,fechaVencimiento:'2026-12-31',batches:[{id:'b115',cantidad:60,costo:7.2,fecha:'2024-11-10',lote:'L-THI-1124'},{id:'b116',cantidad:60,costo:7.5,fecha:'2025-02-15',lote:'L-THI-0225'}],createdAt:'2024-11-10T08:00:00Z',updatedAt:'2025-02-15T08:00:00Z'},
  {id:'prod10',sku:'QUI-003',nombre:'Silicona Neutra Transparente 280ml',descripcion:'Silicona neutra 280ml, resistente a agua y hongos, -40 a 150°C',categoriaId:'cat3',unidadMedida:'UND',stockActual:88,stockMinimo:30,stockMaximo:250,almacenId:'alm2',proveedorId:'prov3',precioVenta:18,activo:true,tieneVencimiento:true,fechaVencimiento:'2027-06-30',batches:[{id:'b117',cantidad:50,costo:11,fecha:'2024-12-01',lote:'L-SIL-1224'},{id:'b118',cantidad:38,costo:11.5,fecha:'2025-02-20',lote:'L-SIL-0225'}],createdAt:'2024-12-01T09:00:00Z',updatedAt:'2025-02-20T09:00:00Z'},
  // PAPELERÍA
  {id:'prod11',sku:'PAP-001',nombre:'Papel Bond A4 75gr x 500 hojas',descripcion:'Resma papel bond A4, 75gr/m², 500 hojas, blancura 92%',categoriaId:'cat4',unidadMedida:'RESMA',stockActual:210,stockMinimo:50,stockMaximo:600,almacenId:'alm2',proveedorId:'prov4',precioVenta:22,activo:true,tieneVencimiento:false,fechaVencimiento:null,batches:[{id:'b119',cantidad:120,costo:13.5,fecha:'2024-10-20',lote:'L-PAP-1024'},{id:'b120',cantidad:90,costo:14.0,fecha:'2025-01-15',lote:'L-PAP-0125'}],createdAt:'2024-10-20T08:00:00Z',updatedAt:'2025-01-15T08:00:00Z'},
  {id:'prod12',sku:'PAP-002',nombre:'Folder Manila A4 x 100 unid.',descripcion:'Folder manila A4, kraft 200gr, con gancho plástico',categoriaId:'cat4',unidadMedida:'CJA',stockActual:38,stockMinimo:15,stockMaximo:100,almacenId:'alm2',proveedorId:'prov4',precioVenta:42,activo:true,tieneVencimiento:false,fechaVencimiento:null,batches:[{id:'b121',cantidad:25,costo:26,fecha:'2024-11-05',lote:'L-FOL-1124'},{id:'b122',cantidad:13,costo:27,fecha:'2025-02-08',lote:'L-FOL-0225'}],createdAt:'2024-11-05T08:00:00Z',updatedAt:'2025-02-08T08:00:00Z'},
  {id:'prod13',sku:'PAP-003',nombre:'Tóner HP 85A (CE285A)',descripcion:'Original HP 85A, negro, 1600 pág, LaserJet P1102/M1132',categoriaId:'cat4',unidadMedida:'UND',stockActual:14,stockMinimo:6,stockMaximo:40,almacenId:'alm1',proveedorId:'prov4',precioVenta:185,activo:true,tieneVencimiento:true,fechaVencimiento:'2027-03-31',batches:[{id:'b123',cantidad:8,costo:118,fecha:'2024-12-10',lote:'L-TON-1224'},{id:'b124',cantidad:6,costo:122,fecha:'2025-02-25',lote:'L-TON-0225'}],createdAt:'2024-12-10T09:00:00Z',updatedAt:'2025-02-25T09:00:00Z'},
  // LIMPIEZA
  {id:'prod14',sku:'LIM-001',nombre:'Lejía Concentrada 3.8L Clorox',descripcion:'Lejía Clorox 3.8L, grado industrial, hipoclorito 5.25%',categoriaId:'cat5',unidadMedida:'UND',stockActual:0,stockMinimo:24,stockMaximo:150,almacenId:'alm1',proveedorId:'prov5',precioVenta:22,activo:true,tieneVencimiento:true,fechaVencimiento:'2025-06-30',batches:[],createdAt:'2024-09-01T08:00:00Z',updatedAt:'2025-03-01T08:00:00Z'},
  {id:'prod15',sku:'LIM-002',nombre:'Desinfectante Multiusos Dettol 1L',descripcion:'Dettol 1L, 99.9% bacterias, pisos y superficies',categoriaId:'cat5',unidadMedida:'UND',stockActual:56,stockMinimo:20,stockMaximo:200,almacenId:'alm1',proveedorId:'prov5',precioVenta:18,activo:true,tieneVencimiento:true,fechaVencimiento:'2026-08-15',batches:[{id:'b125',cantidad:30,costo:10.5,fecha:'2024-11-20',lote:'L-DET-1124'},{id:'b126',cantidad:26,costo:11.0,fecha:'2025-02-10',lote:'L-DET-0225'}],createdAt:'2024-11-20T09:00:00Z',updatedAt:'2025-02-10T09:00:00Z'},
  {id:'prod16',sku:'LIM-003',nombre:'Jabón Líquido Industrial 5L',descripcion:'Jabón líquido biodegradable 5L, pH neutro, concentrado',categoriaId:'cat5',unidadMedida:'UND',stockActual:2,stockMinimo:10,stockMaximo:60,almacenId:'alm2',proveedorId:'prov5',precioVenta:35,activo:true,tieneVencimiento:true,fechaVencimiento:'2025-04-30',batches:[{id:'b127',cantidad:2,costo:21,fecha:'2024-12-20',lote:'L-JAB-1224'}],createdAt:'2024-12-20T09:00:00Z',updatedAt:'2024-12-20T09:00:00Z'},
  // ALIMENTOS
  {id:'prod17',sku:'ALI-001',nombre:'Azúcar Rubia Cartavio x 50kg',descripcion:'Azúcar rubia granulada 50kg Cartavio, mayorista',categoriaId:'cat6',unidadMedida:'SACO',stockActual:35,stockMinimo:15,stockMaximo:100,almacenId:'alm3',proveedorId:'prov6',precioVenta:155,activo:true,tieneVencimiento:true,fechaVencimiento:'2025-12-31',batches:[{id:'b128',cantidad:20,costo:118,fecha:'2025-01-10',lote:'L-AZU-0125'},{id:'b129',cantidad:15,costo:120,fecha:'2025-02-20',lote:'L-AZU-0225'}],createdAt:'2025-01-10T08:00:00Z',updatedAt:'2025-02-20T08:00:00Z'},
  {id:'prod18',sku:'ALI-002',nombre:'Aceite Vegetal Primor 1L',descripcion:'Primor 1L, mezcla soja-girasol, sin colesterol',categoriaId:'cat6',unidadMedida:'UND',stockActual:144,stockMinimo:60,stockMaximo:400,almacenId:'alm3',proveedorId:'prov6',precioVenta:8.9,activo:true,tieneVencimiento:true,fechaVencimiento:'2026-01-15',batches:[{id:'b130',cantidad:80,costo:5.8,fecha:'2024-12-15',lote:'L-ACE-1224'},{id:'b131',cantidad:64,costo:6.0,fecha:'2025-02-05',lote:'L-ACE-0225'}],createdAt:'2024-12-15T08:00:00Z',updatedAt:'2025-02-05T08:00:00Z'},
  {id:'prod19',sku:'ALI-003',nombre:'Leche Evaporada Gloria Caja x 24',descripcion:'Gloria 400g tall x 24 latas, entera',categoriaId:'cat6',unidadMedida:'CJA',stockActual:28,stockMinimo:12,stockMaximo:80,almacenId:'alm3',proveedorId:'prov6',precioVenta:88,activo:true,tieneVencimiento:true,fechaVencimiento:'2025-05-20',batches:[{id:'b132',cantidad:18,costo:55,fecha:'2024-11-25',lote:'L-GLO-1124'},{id:'b133',cantidad:10,costo:57,fecha:'2025-01-30',lote:'L-GLO-0125'}],createdAt:'2024-11-25T09:00:00Z',updatedAt:'2025-01-30T09:00:00Z'},
  {id:'prod20',sku:'ALI-004',nombre:'Arroz Extra Paisana 50kg',descripcion:'Arroz blanco extra Paisana 50kg, premium cosecha 2024',categoriaId:'cat6',unidadMedida:'SACO',stockActual:50,stockMinimo:20,stockMaximo:150,almacenId:'alm3',proveedorId:'prov6',precioVenta:198,activo:true,tieneVencimiento:true,fechaVencimiento:'2025-09-30',batches:[{id:'b134',cantidad:30,costo:148,fecha:'2025-01-05',lote:'L-ARR-0125'},{id:'b135',cantidad:20,costo:152,fecha:'2025-02-25',lote:'L-ARR-0225'}],createdAt:'2025-01-05T08:00:00Z',updatedAt:'2025-02-25T08:00:00Z'},
  // SEGURIDAD
  {id:'prod21',sku:'SEG-001',nombre:'Casco Seguridad 3M H-700',descripcion:'3M H-700, HDPE, clase E 20kV, certificado ANSI Z89.1',categoriaId:'cat7',unidadMedida:'UND',stockActual:22,stockMinimo:10,stockMaximo:80,almacenId:'alm2',proveedorId:'prov7',precioVenta:48,activo:true,tieneVencimiento:false,fechaVencimiento:null,batches:[{id:'b136',cantidad:15,costo:29,fecha:'2024-10-10',lote:'L-CAS-1024'},{id:'b137',cantidad:7,costo:30,fecha:'2025-01-22',lote:'L-CAS-0125'}],createdAt:'2024-10-10T09:00:00Z',updatedAt:'2025-01-22T09:00:00Z'},
  {id:'prod22',sku:'SEG-002',nombre:'Guantes Nitrilo T-L Caja x 100',descripcion:'Nitrilo talla L, sin polvo, azul, 0.1mm, caja x 100',categoriaId:'cat7',unidadMedida:'CJA',stockActual:31,stockMinimo:12,stockMaximo:80,almacenId:'alm2',proveedorId:'prov7',precioVenta:52,activo:true,tieneVencimiento:true,fechaVencimiento:'2028-12-31',batches:[{id:'b138',cantidad:20,costo:32,fecha:'2024-12-08',lote:'L-GUA-1224'},{id:'b139',cantidad:11,costo:33,fecha:'2025-02-18',lote:'L-GUA-0225'}],createdAt:'2024-12-08T09:00:00Z',updatedAt:'2025-02-18T09:00:00Z'},
  {id:'prod23',sku:'SEG-003',nombre:'Zapatos Seguridad Punta Acero T-42',descripcion:'Cuero genuino, punta acero, suela antideslizante, EN ISO 20345',categoriaId:'cat7',unidadMedida:'PAR',stockActual:8,stockMinimo:5,stockMaximo:30,almacenId:'alm2',proveedorId:'prov7',precioVenta:145,activo:true,tieneVencimiento:false,fechaVencimiento:null,batches:[{id:'b140',cantidad:8,costo:88,fecha:'2025-01-18',lote:'L-ZAP-0125'}],createdAt:'2025-01-18T09:00:00Z',updatedAt:'2025-01-18T09:00:00Z'},
  // ELECTRODOMÉSTICOS
  {id:'prod24',sku:'ELE-001',nombre:'Licuadora Oster 700W 2L',descripcion:'Oster BLSTMG 700W, vaso vidrio 2L, 3 velocidades + pulse',categoriaId:'cat8',unidadMedida:'UND',stockActual:13,stockMinimo:5,stockMaximo:40,almacenId:'alm1',proveedorId:'prov1',precioVenta:185,activo:true,tieneVencimiento:false,fechaVencimiento:null,batches:[{id:'b141',cantidad:8,costo:112,fecha:'2024-11-15',lote:'L-OST-1124'},{id:'b142',cantidad:5,costo:118,fecha:'2025-02-12',lote:'L-OST-0225'}],createdAt:'2024-11-15T09:00:00Z',updatedAt:'2025-02-12T09:00:00Z'},
]

export function getProductos(){let d=leer(KEYS.productos);if(!d){guardar(KEYS.productos,PROD);d=PROD}return ok(d)}
export function getProductoById(id){const l=leer(KEYS.productos)||PROD;const p=l.find(x=>x.id===id);return p?ok(p):err('Producto no encontrado')}
export function saveProducto(prod){
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
const _m=(id,tipo,pId,aId,cant,cu,ct,lote,fecha,motivo,doc,notas='')=>({id,tipo,productoId:pId,almacenId:aId,cantidad:cant,costoUnitario:cu,costoTotal:ct,lote,fecha,motivo,documento:doc,notas,usuarioId:'usr1',createdAt:new Date(fecha.split('/').reverse().join('-')).toISOString()})

const MOV=[
  // Ago–Oct 2024: entradas iniciales
  _m('mv001','ENTRADA','prod1','alm1',10,2780,27800,'L-HP-0824','15/08/2024','Compra OC-001-0001','OC-001-0001'),
  _m('mv002','ENTRADA','prod2','alm1',6,470,2820,'L-LG-0924','10/09/2024','Compra OC-001-0002','OC-001-0002'),
  _m('mv003','ENTRADA','prod7','alm2',30,16.5,495,'L-STN-0924','20/09/2024','Compra OC-001-0003','OC-001-0003'),
  _m('mv004','ENTRADA','prod8','alm1',30,41,1230,'L-RES-1024','01/10/2024','Compra OC-001-0004','OC-001-0004'),
  _m('mv005','ENTRADA','prod21','alm2',15,29,435,'L-CAS-1024','10/10/2024','Compra OC-001-0005','OC-001-0005'),
  _m('mv006','ENTRADA','prod6','alm1',5,95,475,'L-STN-1024','15/10/2024','Compra OC-001-0006','OC-001-0006'),
  _m('mv007','ENTRADA','prod3','alm1',20,62,1240,'L-LOG-1024','20/10/2024','Compra OC-001-0007','OC-001-0007'),
  _m('mv008','ENTRADA','prod11','alm2',120,13.5,1620,'L-PAP-1024','20/10/2024','Compra OC-001-0008','OC-001-0008'),
  // Salidas Oct 2024
  _m('mv020','SALIDA','prod1','alm1',3,2780,8340,'','25/10/2024','Venta mayorista Corporación ABC','GR-001-0001'),
  _m('mv021','SALIDA','prod2','alm1',2,470,940,'','28/10/2024','Venta tienda tecnología','GR-001-0002'),
  _m('mv022','SALIDA','prod11','alm2',25,13.5,337.5,'','30/10/2024','Venta papelería','GR-001-0003'),
  _m('mv023','SALIDA','prod7','alm2',8,16.5,132,'','31/10/2024','Venta ferretería','GR-001-0004'),
  _m('mv024','SALIDA','prod3','alm1',6,62,372,'','31/10/2024','Venta periféricos','GR-001-0005'),
  // Nov 2024: entradas
  _m('mv030','ENTRADA','prod24','alm1',8,112,896,'L-OST-1124','15/11/2024','Compra OC-001-0009','OC-001-0009'),
  _m('mv031','ENTRADA','prod12','alm2',25,26,650,'L-FOL-1124','05/11/2024','Compra OC-001-0010','OC-001-0010'),
  _m('mv032','ENTRADA','prod9','alm1',60,7.2,432,'L-THI-1124','10/11/2024','Compra OC-001-0011','OC-001-0011'),
  _m('mv033','ENTRADA','prod15','alm1',30,10.5,315,'L-DET-1124','20/11/2024','Compra OC-001-0012','OC-001-0012'),
  _m('mv034','ENTRADA','prod19','alm3',18,55,990,'L-GLO-1124','25/11/2024','Compra OC-001-0013','OC-001-0013'),
  _m('mv035','ENTRADA','prod1','alm1',8,2850,22800,'L-HP-1124','20/11/2024','Compra OC-001-0020','OC-001-0020'),
  // Salidas Nov 2024
  _m('mv040','SALIDA','prod1','alm1',2,2780,5560,'','05/11/2024','Venta Nexus Solutions','GR-001-0006'),
  _m('mv041','SALIDA','prod8','alm1',8,41,328,'','08/11/2024','Venta resina','GR-001-0007'),
  _m('mv042','SALIDA','prod9','alm1',15,7.2,108,'','12/11/2024','Venta thinner','GR-001-0008'),
  _m('mv043','SALIDA','prod11','alm2',30,13.5,405,'','15/11/2024','Venta papel — Colegios Lima Norte','GR-001-0009'),
  _m('mv044','SALIDA','prod7','alm2',10,16.5,165,'','18/11/2024','Venta cintas métricas','GR-001-0010'),
  _m('mv045','SALIDA','prod24','alm1',2,112,224,'','22/11/2024','Venta licuadoras','GR-001-0011'),
  _m('mv046','SALIDA','prod3','alm1',5,62,310,'','25/11/2024','Venta combos teclado','GR-001-0012'),
  _m('mv047','SALIDA','prod15','alm1',8,10.5,84,'','28/11/2024','Venta desinfectante','GR-001-0013'),
  _m('mv048','SALIDA','prod19','alm3',4,55,220,'','30/11/2024','Venta leche Gloria','GR-001-0014'),
  // Dic 2024: entradas
  _m('mv050','ENTRADA','prod4','alm2',7,248,1736,'L-APC-1224','05/12/2024','Compra OC-001-0014','OC-001-0014'),
  _m('mv051','ENTRADA','prod13','alm1',8,118,944,'L-TON-1224','10/12/2024','Compra OC-001-0015','OC-001-0015'),
  _m('mv052','ENTRADA','prod10','alm2',50,11,550,'L-SIL-1224','01/12/2024','Compra OC-001-0016','OC-001-0016'),
  _m('mv053','ENTRADA','prod16','alm2',12,21,252,'L-JAB-1224','20/12/2024','Compra OC-001-0017','OC-001-0017'),
  _m('mv054','ENTRADA','prod22','alm2',20,32,640,'L-GUA-1224','08/12/2024','Compra OC-001-0018','OC-001-0018'),
  _m('mv055','ENTRADA','prod18','alm3',80,5.8,464,'L-ACE-1224','15/12/2024','Compra OC-001-0026','OC-001-0026'),
  // Salidas Dic 2024
  _m('mv060','SALIDA','prod1','alm1',2,2807,5614,'','03/12/2024','Venta Tecnología Lima','GR-001-0015'),
  _m('mv061','SALIDA','prod2','alm1',3,470,1410,'','05/12/2024','Venta monitores','GR-001-0016'),
  _m('mv062','SALIDA','prod8','alm1',10,41.6,416,'','08/12/2024','Venta resina epóxica','GR-001-0017'),
  _m('mv063','SALIDA','prod11','alm2',40,13.6,544,'','10/12/2024','Venta cierre año — Oficinas Corporativas','GR-001-0018'),
  _m('mv064','SALIDA','prod21','alm2',5,29,145,'','12/12/2024','Venta cascos EPP','GR-001-0019'),
  _m('mv065','SALIDA','prod24','alm1',3,114,342,'','15/12/2024','Venta licuadoras','GR-001-0020'),
  _m('mv066','SALIDA','prod9','alm1',20,7.3,146,'','18/12/2024','Venta thinner','GR-001-0021'),
  _m('mv067','SALIDA','prod10','alm2',15,11,165,'','20/12/2024','Venta silicona neutra','GR-001-0022'),
  _m('mv068','SALIDA','prod22','alm2',6,32,192,'','22/12/2024','Venta guantes nitrilo','GR-001-0023'),
  _m('mv069','SALIDA','prod13','alm1',3,118,354,'','27/12/2024','Venta tóner HP','GR-001-0024'),
  // Ajuste fin de año
  _m('mv070','AJUSTE','prod14','alm1',50,8.5,425,'','28/12/2024','[- AJUSTE] Faltante en conteo físico','AJ-001-0001','Inventario cierre 2024'),
  // Ene 2025: entradas
  _m('mv080','ENTRADA','prod2','alm1',5,488,2440,'L-LG-0125','08/01/2025','Compra OC-001-0021','OC-001-0021'),
  _m('mv081','ENTRADA','prod11','alm2',90,14,1260,'L-PAP-0125','15/01/2025','Compra OC-001-0022','OC-001-0022'),
  _m('mv082','ENTRADA','prod21','alm2',7,30,210,'L-CAS-0125','22/01/2025','Compra OC-001-0023','OC-001-0023'),
  _m('mv083','ENTRADA','prod23','alm2',8,88,704,'L-ZAP-0125','18/01/2025','Compra OC-001-0024','OC-001-0024'),
  _m('mv084','ENTRADA','prod19','alm3',10,57,570,'L-GLO-0125','30/01/2025','Compra OC-001-0025','OC-001-0025'),
  _m('mv085','ENTRADA','prod17','alm3',20,118,2360,'L-AZU-0125','10/01/2025','Compra OC-001-0019','OC-001-0019'),
  _m('mv086','ENTRADA','prod20','alm3',30,148,4440,'L-ARR-0125','05/01/2025','Compra OC-001-0027','OC-001-0027'),
  _m('mv087','ENTRADA','prod6','alm1',4,98,392,'L-STN-0125','12/01/2025','Compra OC-001-0028','OC-001-0028'),
  _m('mv088','ENTRADA','prod3','alm1',3,62,186,'L-LOG-0125','20/01/2025','Compra OC-001-0041','OC-001-0041'),
  // Salidas Ene 2025
  _m('mv090','SALIDA','prod1','alm1',1,2812,2812,'','06/01/2025','Venta Municipalidad','GR-002-0001'),
  _m('mv091','SALIDA','prod11','alm2',35,13.7,479.5,'','08/01/2025','Venta papel oficina','GR-002-0002'),
  _m('mv092','SALIDA','prod8','alm1',7,42.1,294.7,'','10/01/2025','Venta resina','GR-002-0003'),
  _m('mv093','SALIDA','prod18','alm3',20,5.8,116,'','12/01/2025','Venta aceite — Mayorista El Huerto','GR-002-0004'),
  _m('mv094','SALIDA','prod20','alm3',8,148,1184,'','15/01/2025','Venta arroz','GR-002-0005'),
  _m('mv095','SALIDA','prod17','alm3',5,118.8,594,'','18/01/2025','Venta azúcar','GR-002-0006'),
  _m('mv096','SALIDA','prod9','alm1',12,7.2,86.4,'','20/01/2025','Venta thinner','GR-002-0007'),
  _m('mv097','SALIDA','prod15','alm1',10,10.7,107,'','22/01/2025','Venta desinfectante','GR-002-0008'),
  _m('mv098','SALIDA','prod21','alm2',3,29.4,88.2,'','25/01/2025','Venta cascos — Const. Horizonte','GR-002-0009'),
  _m('mv099','SALIDA','prod22','alm2',4,32.2,128.8,'','28/01/2025','Venta guantes','GR-002-0010'),
  _m('mv100','SALIDA','prod7','alm2',12,16.6,199.2,'','29/01/2025','Venta cintas métricas','GR-002-0011'),
  _m('mv101','SALIDA','prod24','alm1',2,114.5,229,'','30/01/2025','Venta licuadoras','GR-002-0012'),
  // Feb 2025: entradas
  _m('mv110','ENTRADA','prod5','alm1',6,178,1068,'L-BSH-0225','10/02/2025','Compra OC-001-0029','OC-001-0029'),
  _m('mv111','ENTRADA','prod8','alm1',25,43,1075,'L-RES-0125','20/01/2025','Compra OC-001-0030','OC-001-0030'),
  _m('mv112','ENTRADA','prod12','alm2',13,27,351,'L-FOL-0225','08/02/2025','Compra OC-001-0031','OC-001-0031'),
  _m('mv113','ENTRADA','prod9','alm1',60,7.5,450,'L-THI-0225','15/02/2025','Compra OC-001-0032','OC-001-0032'),
  _m('mv114','ENTRADA','prod15','alm1',26,11,286,'L-DET-0225','10/02/2025','Compra OC-001-0033','OC-001-0033'),
  _m('mv115','ENTRADA','prod10','alm2',38,11.5,437,'L-SIL-0225','20/02/2025','Compra OC-001-0034','OC-001-0034'),
  _m('mv116','ENTRADA','prod22','alm2',11,33,363,'L-GUA-0225','18/02/2025','Compra OC-001-0035','OC-001-0035'),
  _m('mv117','ENTRADA','prod18','alm3',64,6.0,384,'L-ACE-0225','05/02/2025','Compra OC-001-0036','OC-001-0036'),
  _m('mv118','ENTRADA','prod20','alm3',20,152,3040,'L-ARR-0225','25/02/2025','Compra OC-001-0037','OC-001-0037'),
  _m('mv119','ENTRADA','prod17','alm3',15,120,1800,'L-AZU-0225','20/02/2025','Compra OC-001-0038','OC-001-0038'),
  _m('mv120','ENTRADA','prod13','alm1',6,122,732,'L-TON-0225','25/02/2025','Compra OC-001-0039','OC-001-0039'),
  _m('mv121','ENTRADA','prod8','alm1',13,44,572,'L-RES-0325','05/03/2025','Compra OC-001-0040','OC-001-0040'),
  _m('mv122','ENTRADA','prod7','alm2',15,17,255,'L-STN-0225','01/02/2025','Compra OC-001-0042','OC-001-0042'),
  _m('mv123','ENTRADA','prod24','alm1',5,118,590,'L-OST-0225','12/02/2025','Compra OC-001-0043','OC-001-0043'),
  // Salidas Feb 2025
  _m('mv130','SALIDA','prod8','alm1',9,42.5,382.5,'','03/02/2025','Venta resina','GR-002-0013'),
  _m('mv131','SALIDA','prod11','alm2',40,13.8,552,'','05/02/2025','Venta papel — Copy Center','GR-002-0014'),
  _m('mv132','SALIDA','prod18','alm3',25,5.9,147.5,'','07/02/2025','Venta aceite','GR-002-0015'),
  _m('mv133','SALIDA','prod1','alm1',2,2815,5630,'','10/02/2025','Venta laptops','GR-002-0016'),
  _m('mv134','SALIDA','prod20','alm3',10,149.5,1495,'','12/02/2025','Venta arroz — Bodega San Martín','GR-002-0017'),
  _m('mv135','SALIDA','prod9','alm1',18,7.3,131.4,'','14/02/2025','Venta thinner','GR-002-0018'),
  _m('mv136','SALIDA','prod17','alm3',8,119.3,954.4,'','15/02/2025','Venta azúcar','GR-002-0019'),
  _m('mv137','SALIDA','prod7','alm2',14,16.7,233.8,'','17/02/2025','Venta cintas métricas','GR-002-0020'),
  _m('mv138','SALIDA','prod21','alm2',4,29.3,117.2,'','18/02/2025','Venta cascos EPP — Const. Horizonte','GR-002-0021'),
  _m('mv139','SALIDA','prod2','alm1',2,478.5,957,'','20/02/2025','Venta monitores','GR-002-0022'),
  _m('mv140','SALIDA','prod10','alm2',20,11.2,224,'','22/02/2025','Venta silicona','GR-002-0023'),
  _m('mv141','SALIDA','prod15','alm1',12,10.8,129.6,'','24/02/2025','Venta desinfectante','GR-002-0024'),
  _m('mv142','SALIDA','prod22','alm2',5,32.4,162,'','25/02/2025','Venta guantes nitrilo','GR-002-0025'),
  _m('mv143','SALIDA','prod12','alm2',8,26.4,211.2,'','27/02/2025','Venta folders manila','GR-002-0026'),
  _m('mv144','SALIDA','prod5','alm1',2,178,356,'','28/02/2025','Venta taladros Bosch','GR-002-0027'),
  // Transferencias Feb 2025
  _m('mv150','TRANSFERENCIA','prod11','alm2',20,13.8,276,'','20/02/2025','[TRANSFER OUT → alm1] Rebalanceo','TR-001-0001'),
  _m('mv151','TRANSFERENCIA','prod11','alm1',20,13.8,276,'','20/02/2025','[TRANSFER IN ← alm2] Rebalanceo','TR-001-0001'),
  // Devolución
  _m('mv160','ENTRADA','prod8','alm1',2,42.5,85,'','05/03/2025','[DEV CLIENTE] Error en pedido','DEV-001-0001'),
  // Mar 2025 (semana actual)
  _m('mv170','SALIDA','prod8','alm1',5,43,215,'','10/03/2025','Venta resina epóxica','GR-003-0001'),
  _m('mv171','SALIDA','prod18','alm3',18,5.95,107.1,'','10/03/2025','Venta aceite — Distribuidor Norte','GR-003-0002'),
  _m('mv172','SALIDA','prod11','alm2',25,13.8,345,'','11/03/2025','Venta papel bond','GR-003-0003'),
  _m('mv173','SALIDA','prod20','alm3',12,150,1800,'','12/03/2025','Venta arroz Paisana','GR-003-0004'),
  _m('mv174','SALIDA','prod9','alm1',15,7.4,111,'','12/03/2025','Venta thinner','GR-003-0005'),
  _m('mv175','SALIDA','prod15','alm1',6,10.8,64.8,'','13/03/2025','Venta desinfectante','GR-003-0006'),
]

export function getMovimientos(f={}){let d=leer(KEYS.movimientos)||MOV;if(!leer(KEYS.movimientos))guardar(KEYS.movimientos,MOV);if(f.productoId)d=d.filter(m=>m.productoId===f.productoId);if(f.tipo)d=d.filter(m=>m.tipo===f.tipo);if(f.desde)d=d.filter(m=>{const md=new Date(m.fecha.split('/').reverse().join('-'));const fd=new Date(f.desde.split('/').reverse().join('-'));return md>=fd});if(f.hasta)d=d.filter(m=>{const md=new Date(m.fecha.split('/').reverse().join('-'));const fd=new Date(f.hasta.split('/').reverse().join('-'));return md<=fd});return ok([...d].sort((a,b)=>{const ad=new Date(a.fecha.split('/').reverse().join('-'));const bd=new Date(b.fecha.split('/').reverse().join('-'));return bd-ad}))}
export function registrarMovimiento(mov){
  const l=leer(KEYS.movimientos)||[]
  const n={...mov,id:newId(),fecha:mov.fecha||fechaHoy(),createdAt:new Date().toISOString()}
  l.push(n);guardar(KEYS.movimientos,l)
  const tipoLabel={ENTRADA:'Entrada registrada',SALIDA:'Salida registrada',AJUSTE:'Ajuste registrado',TRANSFERENCIA:'Transferencia registrada',DEVOLUCION:'Devolución registrada'}
  const modLabel={ENTRADA:'entradas',SALIDA:'salidas',AJUSTE:'ajustes',TRANSFERENCIA:'transferencias',DEVOLUCION:'devoluciones'}
  const prods=leer(KEYS.productos)||[]
  const prod=prods.find(p=>p.id===mov.productoId)
  _audit('CREATE', modLabel[mov.tipo]||'movimientos',
    `${tipoLabel[mov.tipo]||mov.tipo} — ${prod?.nombre||mov.productoId} · ${mov.cantidad} ${prod?.unidadMedida||''} · Doc: ${mov.documento||'—'}`,
    { tipo:mov.tipo, productoId:mov.productoId, cantidad:mov.cantidad, documento:mov.documento })
  return ok(n)
}

// ═══════════════════════════════════════════════════════════
// ÓRDENES DE COMPRA
// ═══════════════════════════════════════════════════════════
const OC=[
  {id:'oc01',numero:'OC-001-0001',proveedorId:'prov1',fecha:'2024-08-12',fechaEntrega:'2024-08-15',estado:'RECIBIDA',items:[{productoId:'prod1',cantidad:10,costoUnitario:2780,subtotal:27800,cantidadRecibida:10}],subtotal:27800,igv:5004,total:32804,notas:'Equipos cómputo Q3 2024',usuarioId:'usr1',createdAt:'2024-08-12T09:00:00Z'},
  {id:'oc02',numero:'OC-001-0002',proveedorId:'prov1',fecha:'2024-09-08',fechaEntrega:'2024-09-10',estado:'RECIBIDA',items:[{productoId:'prod2',cantidad:6,costoUnitario:470,subtotal:2820,cantidadRecibida:6}],subtotal:2820,igv:507.6,total:3327.6,notas:'',usuarioId:'usr1',createdAt:'2024-09-08T09:00:00Z'},
  {id:'oc03',numero:'OC-001-0003',proveedorId:'prov2',fecha:'2024-09-18',fechaEntrega:'2024-09-20',estado:'RECIBIDA',items:[{productoId:'prod7',cantidad:30,costoUnitario:16.5,subtotal:495,cantidadRecibida:30}],subtotal:495,igv:89.1,total:584.1,notas:'',usuarioId:'usr1',createdAt:'2024-09-18T09:00:00Z'},
  {id:'oc04',numero:'OC-001-0004',proveedorId:'prov3',fecha:'2024-09-28',fechaEntrega:'2024-10-01',estado:'RECIBIDA',items:[{productoId:'prod8',cantidad:30,costoUnitario:41,subtotal:1230,cantidadRecibida:30}],subtotal:1230,igv:221.4,total:1451.4,notas:'Primer lote resina epóxica',usuarioId:'usr1',createdAt:'2024-09-28T09:00:00Z'},
  {id:'oc05',numero:'OC-001-0020',proveedorId:'prov1',fecha:'2024-11-18',fechaEntrega:'2024-11-20',estado:'RECIBIDA',items:[{productoId:'prod1',cantidad:8,costoUnitario:2850,subtotal:22800,cantidadRecibida:8}],subtotal:22800,igv:4104,total:26904,notas:'Reposición laptops nov',usuarioId:'usr1',createdAt:'2024-11-18T09:00:00Z'},
  {id:'oc06',numero:'OC-001-0021',proveedorId:'prov1',fecha:'2025-01-06',fechaEntrega:'2025-01-08',estado:'RECIBIDA',items:[{productoId:'prod2',cantidad:5,costoUnitario:488,subtotal:2440,cantidadRecibida:5}],subtotal:2440,igv:439.2,total:2879.2,notas:'Reposición monitores enero',usuarioId:'usr1',createdAt:'2025-01-06T09:00:00Z'},
  {id:'oc07',numero:'OC-001-0029',proveedorId:'prov2',fecha:'2025-02-08',fechaEntrega:'2025-02-10',estado:'RECIBIDA',items:[{productoId:'prod5',cantidad:6,costoUnitario:178,subtotal:1068,cantidadRecibida:6}],subtotal:1068,igv:192.24,total:1260.24,notas:'Reposición herramientas',usuarioId:'usr1',createdAt:'2025-02-08T09:00:00Z'},
  {id:'oc08',numero:'OC-001-0030',proveedorId:'prov3',fecha:'2025-01-18',fechaEntrega:'2025-01-20',estado:'RECIBIDA',items:[{productoId:'prod8',cantidad:25,costoUnitario:43,subtotal:1075,cantidadRecibida:25},{productoId:'prod9',cantidad:60,costoUnitario:7.5,subtotal:450,cantidadRecibida:60}],subtotal:1525,igv:274.5,total:1799.5,notas:'Insumos químicos enero',usuarioId:'usr1',createdAt:'2025-01-18T09:00:00Z'},
  {id:'oc09',numero:'OC-001-0038',proveedorId:'prov6',fecha:'2025-02-18',fechaEntrega:'2025-02-20',estado:'RECIBIDA',items:[{productoId:'prod17',cantidad:15,costoUnitario:120,subtotal:1800,cantidadRecibida:15},{productoId:'prod18',cantidad:64,costoUnitario:6.0,subtotal:384,cantidadRecibida:64},{productoId:'prod20',cantidad:20,costoUnitario:152,subtotal:3040,cantidadRecibida:20}],subtotal:5224,igv:940.32,total:6164.32,notas:'Alimentos febrero',usuarioId:'usr1',createdAt:'2025-02-18T09:00:00Z'},
  // OC activas para el dashboard
  {id:'oc10',numero:'OC-002-0001',proveedorId:'prov1',fecha:'2025-03-10',fechaEntrega:'2025-03-15',estado:'APROBADA',items:[{productoId:'prod1',cantidad:8,costoUnitario:2900,subtotal:23200,cantidadRecibida:0},{productoId:'prod2',cantidad:5,costoUnitario:495,subtotal:2475,cantidadRecibida:0}],subtotal:25675,igv:4621.5,total:30296.5,notas:'Tecnología Q1 2025 — Aprobada gerencia',usuarioId:'usr2',createdAt:'2025-03-10T09:00:00Z'},
  {id:'oc11',numero:'OC-002-0002',proveedorId:'prov5',fecha:'2025-03-11',fechaEntrega:'2025-03-14',estado:'PENDIENTE',items:[{productoId:'prod14',cantidad:48,costoUnitario:13.5,subtotal:648,cantidadRecibida:0},{productoId:'prod16',cantidad:20,costoUnitario:21,subtotal:420,cantidadRecibida:0}],subtotal:1068,igv:192.24,total:1260.24,notas:'URGENTE — lejía agotada, jabón crítico',usuarioId:'usr1',createdAt:'2025-03-11T07:30:00Z'},
  {id:'oc12',numero:'OC-002-0003',proveedorId:'prov3',fecha:'2025-03-12',fechaEntrega:'2025-03-18',estado:'PARCIAL',items:[{productoId:'prod8',cantidad:30,costoUnitario:44,subtotal:1320,cantidadRecibida:15},{productoId:'prod10',cantidad:50,costoUnitario:11.5,subtotal:575,cantidadRecibida:50}],subtotal:1895,igv:341.1,total:2236.1,notas:'Recibido parcial: silicona completa, resina pendiente 15 kg',usuarioId:'usr1',createdAt:'2025-03-12T09:00:00Z'},
  {id:'oc13',numero:'OC-002-0004',proveedorId:'prov4',fecha:'2025-03-13',fechaEntrega:'2025-03-14',estado:'PENDIENTE',items:[{productoId:'prod11',cantidad:200,costoUnitario:14.5,subtotal:2900,cantidadRecibida:0},{productoId:'prod13',cantidad:10,costoUnitario:125,subtotal:1250,cantidadRecibida:0}],subtotal:4150,igv:747,total:4897,notas:'Papelería Q2 2025',usuarioId:'usr3',createdAt:'2025-03-13T10:00:00Z'},
]
export function getOrdenes(f={}){let d=leer(KEYS.ordenes)||OC;if(!leer(KEYS.ordenes))guardar(KEYS.ordenes,OC);if(f.estado)d=d.filter(o=>o.estado===f.estado);return ok([...d].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)))}
export function getOrdenById(id){const l=leer(KEYS.ordenes)||OC;const o=l.find(x=>x.id===id);return o?ok(o):err('No encontrada')}
export function saveOrden(orden){
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
const ROLES={
  admin:     {label:'Administrador',permisos:['*','auditoria']},
  supervisor:{label:'Supervisor',   permisos:['dashboard','inventario','movimientos','reportes','ordenes','proveedores','kardex','vencimientos','reorden','prevision','alertas','cotizaciones','clientes','despachos','transportes']},
  almacenero:{label:'Almacenero',   permisos:['dashboard','inventario','entradas','salidas','ajustes','devoluciones','transferencias','kardex','vencimientos','inv-fisico','alertas','despachos','clientes','transportes']},
}
const USR=[
  {id:'usr1',nombre:'Gerardo Ramos Vega',  email:'admin@dlnorte.pe',  password:'admin123',  rol:'admin',      activo:true,createdAt:'2024-08-01T00:00:00Z'},
  {id:'usr2',nombre:'Carlos Huamán Torres',email:'carlos@dlnorte.pe', password:'carlos123', rol:'almacenero', activo:true,createdAt:'2024-08-01T00:00:00Z'},
  {id:'usr3',nombre:'Ana Lucía Paredes',   email:'ana@dlnorte.pe',    password:'ana123',    rol:'supervisor', activo:true,createdAt:'2024-09-01T00:00:00Z'},
  {id:'usr4',nombre:'Miguel Ángel Cáceres',email:'miguel@dlnorte.pe', password:'miguel123', rol:'almacenero', activo:true,createdAt:'2025-01-15T00:00:00Z'},
]
export function getUsuarios(){const d=leer('sp_usuarios')||USR;if(!leer('sp_usuarios'))guardar('sp_usuarios',USR);return ok(d)}
export function saveUsuario(u){
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
  // Combinar roles base con roles custom del localStorage
  try {
    const custom = JSON.parse(localStorage.getItem('sp_roles_custom')||'{}')
    return ok({...ROLES,...custom})
  } catch { return ok(ROLES) }
}
export function tienePermiso(rol,modulo){
  // Primero buscar en roles base
  let r = ROLES[rol]
  // Si no está en base, buscar en custom
  if(!r){
    try { const custom=JSON.parse(localStorage.getItem('sp_roles_custom')||'{}'); r=custom[rol] } catch {}
  }
  if(!r) return false
  return r.permisos.includes('*')||r.permisos.includes(modulo)
}

// ═══════════════════════════════════════════════════════════
// AJUSTES
// ═══════════════════════════════════════════════════════════
const AJ=[
  {id:'aj1',productoId:'prod14',almacenId:'alm1',tipo:'NEGATIVO',cantidad:50,motivo:'Faltante en conteo físico',documento:'AJ-001-0001',fecha:'2024-12-28',costoUnitario:8.5,costoTotal:425,usuarioId:'usr1',notas:'Inventario cierre 2024',createdAt:'2024-12-28T09:00:00Z'},
  {id:'aj2',productoId:'prod11',almacenId:'alm2',tipo:'POSITIVO',cantidad:5, motivo:'Sobrante en conteo físico',documento:'AJ-001-0002',fecha:'2025-01-05',costoUnitario:13.5,costoTotal:67.5,usuarioId:'usr2',notas:'Verificación enero',createdAt:'2025-01-05T10:00:00Z'},
  {id:'aj3',productoId:'prod9', almacenId:'alm1',tipo:'NEGATIVO',cantidad:3, motivo:'Merma / daño',documento:'AJ-001-0003',fecha:'2025-01-18',costoUnitario:7.2,costoTotal:21.6,usuarioId:'usr2',notas:'Envase roto en traslado',createdAt:'2025-01-18T11:00:00Z'},
  {id:'aj4',productoId:'prod7', almacenId:'alm2',tipo:'POSITIVO',cantidad:8, motivo:'Sobrante en conteo físico',documento:'AJ-001-0004',fecha:'2025-02-03',costoUnitario:16.5,costoTotal:132,usuarioId:'usr2',notas:'Diferencia inventario feb',createdAt:'2025-02-03T09:00:00Z'},
  {id:'aj5',productoId:'prod18',almacenId:'alm3',tipo:'NEGATIVO',cantidad:4, motivo:'Producto vencido / dado de baja',documento:'AJ-001-0005',fecha:'2025-03-01',costoUnitario:5.8,costoTotal:23.2,usuarioId:'usr1',notas:'Aceite fecha vencida lote anterior',createdAt:'2025-03-01T08:00:00Z'},
]
export function getAjustes(f={}){let d=leer('sp_ajustes')||AJ;if(!leer('sp_ajustes'))guardar('sp_ajustes',AJ);if(f.productoId)d=d.filter(a=>a.productoId===f.productoId);if(f.desde)d=d.filter(a=>a.fecha>=f.desde);if(f.hasta)d=d.filter(a=>a.fecha<=f.hasta);return ok([...d].sort((a,b)=>b.fecha.localeCompare(a.fecha)))}
export function registrarAjuste(a){const l=leer('sp_ajustes')||[];l.push({...a,id:newId(),createdAt:new Date().toISOString()});guardar('sp_ajustes',l);return ok(true)}

// DEVOLUCIONES
const DEV=[
  {id:'dev1',tipo:'CLIENTE',  productoId:'prod8', almacenId:'alm1',cantidad:2, costoUnitario:42.5,costoTotal:85,  estadoItem:'BUENO',  motivo:'Error en pedido',        documento:'DEV-001-0001',referenciaDoc:'GR-001-0017',fecha:'2025-03-05',notas:'Reingresa al stock',       usuarioId:'usr1',createdAt:'2025-03-05T10:00:00Z'},
  {id:'dev2',tipo:'PROVEEDOR',productoId:'prod9', almacenId:'alm1',cantidad:5, costoUnitario:7.2, costoTotal:36,  estadoItem:'DAÑADO', motivo:'Producto en mal estado', documento:'DEV-001-0002',referenciaDoc:'OC-001-0011',fecha:'2024-11-25',notas:'Envases con fuga',         usuarioId:'usr1',createdAt:'2024-11-25T11:00:00Z'},
  {id:'dev3',tipo:'CLIENTE',  productoId:'prod11',almacenId:'alm2',cantidad:10,costoUnitario:13.5,costoTotal:135, estadoItem:'BUENO',  motivo:'Exceso de cantidad',     documento:'DEV-001-0003',referenciaDoc:'GR-002-0009',fecha:'2025-02-03',notas:'Reingresa al stock',       usuarioId:'usr2',createdAt:'2025-02-03T09:00:00Z'},
  {id:'dev4',tipo:'PROVEEDOR',productoId:'prod16',almacenId:'alm2',cantidad:3, costoUnitario:21,  costoTotal:63,  estadoItem:'VENCIDO',motivo:'Producto vencido',        documento:'DEV-001-0004',referenciaDoc:'OC-001-0017',fecha:'2025-01-15',notas:'Fecha anterior a acordado',usuarioId:'usr1',createdAt:'2025-01-15T10:00:00Z'},
  {id:'dev5',tipo:'CLIENTE',  productoId:'prod5', almacenId:'alm1',cantidad:1, costoUnitario:178, costoTotal:178, estadoItem:'DAÑADO', motivo:'Producto defectuoso',     documento:'DEV-001-0005',referenciaDoc:'GR-002-0027',fecha:'2025-03-02',notas:'Falla en motor, dado de baja',usuarioId:'usr2',createdAt:'2025-03-02T14:00:00Z'},
]
export function getDevoluciones(f={}){let d=leer('sp_devoluciones')||DEV;if(!leer('sp_devoluciones'))guardar('sp_devoluciones',DEV);if(f.tipo)d=d.filter(x=>x.tipo===f.tipo);if(f.desde)d=d.filter(x=>x.fecha>=f.desde);return ok([...d].sort((a,b)=>b.fecha.localeCompare(a.fecha)))}
export function registrarDevolucion(dev){const l=leer('sp_devoluciones')||[];l.push({...dev,id:newId(),createdAt:new Date().toISOString()});guardar('sp_devoluciones',l);return ok(true)}

// TRANSFERENCIAS
const TR=[
  {id:'tr1',numero:'TR-001-0001',productoId:'prod11',almacenOrigenId:'alm2',almacenDestinoId:'alm1',cantidad:20,costoUnitario:13.8,costoTotal:276,fecha:'2025-02-20',motivo:'Rebalanceo de stock',notas:'Alm. central necesitaba papel',usuarioId:'usr1',createdAt:'2025-02-20T10:00:00Z'},
  {id:'tr2',numero:'TR-001-0002',productoId:'prod22',almacenOrigenId:'alm2',almacenDestinoId:'alm1',cantidad:5, costoUnitario:32.4,costoTotal:162,fecha:'2025-01-25',motivo:'Pedido urgente',   notas:'Obra necesita guantes hoy',   usuarioId:'usr2',createdAt:'2025-01-25T14:00:00Z'},
  {id:'tr3',numero:'TR-001-0003',productoId:'prod9', almacenOrigenId:'alm1',almacenDestinoId:'alm2',cantidad:10,costoUnitario:7.35,costoTotal:73.5,fecha:'2025-02-28',motivo:'Reorganización',  notas:'Thinner al almacén 2',        usuarioId:'usr1',createdAt:'2025-02-28T09:00:00Z'},
]
export function getTransferencias(f={}){let d=leer('sp_transferencias')||TR;if(!leer('sp_transferencias'))guardar('sp_transferencias',TR);if(f.productoId)d=d.filter(t=>t.productoId===f.productoId);if(f.desde)d=d.filter(t=>t.fecha>=f.desde);if(f.hasta)d=d.filter(t=>t.fecha<=f.hasta);return ok([...d].sort((a,b)=>b.fecha.localeCompare(a.fecha)))}
export function registrarTransferencia(tr){const l=leer('sp_transferencias')||[];l.push({...tr,id:newId(),createdAt:new Date().toISOString()});guardar('sp_transferencias',l);return ok(true)}

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
  lines.sort((a,b)=>{const d=a.fecha.localeCompare(b.fecha);return d!==0?d:(a.createdAt||'').localeCompare(b.createdAt||'')})
  let s=0
  return lines.map(l=>{s=s+l.entrada-l.salida;return{...l,saldo:Math.max(0,Math.round(s*1000)/1000)}})
}

// COTIZACIONES
const COT=[
  {id:'rfq1',numero:'RFQ-001-0001',estado:'ADJUDICADA',fecha:'2025-01-15',fechaVencimiento:'2025-01-22',
   items:[{productoId:'prod1',descripcion:'Laptop HP 15" Core i5',cantidad:8},{productoId:'prod2',descripcion:'Monitor LG 24" FHD',cantidad:5}],
   respuestas:[
     {proveedorId:'prov1',fecha:'2025-01-17',items:[{productoId:'prod1',precioUnitario:2850,subtotal:22800},{productoId:'prod2',precioUnitario:488,subtotal:2440}],total:25240,tiempoEntrega:5,notas:'Precio especial por volumen',ganadora:true},
     {proveedorId:'prov4',fecha:'2025-01-18',items:[{productoId:'prod1',precioUnitario:2980,subtotal:23840},{productoId:'prod2',precioUnitario:510,subtotal:2550}],total:26390,tiempoEntrega:7,notas:'Stock disponible inmediato',ganadora:false},
   ],notas:'Equipos ampliación área ventas',usuarioId:'usr1',createdAt:'2025-01-15T09:00:00Z'},
  {id:'rfq2',numero:'RFQ-001-0002',estado:'RESPONDIDA',fecha:'2025-02-20',fechaVencimiento:'2025-02-28',
   items:[{productoId:'prod17',descripcion:'Azúcar Rubia 50kg',cantidad:50},{productoId:'prod20',descripcion:'Arroz Extra 50kg',cantidad:40}],
   respuestas:[{proveedorId:'prov6',fecha:'2025-02-22',items:[{productoId:'prod17',precioUnitario:118,subtotal:5900},{productoId:'prod20',precioUnitario:150,subtotal:6000}],total:11900,tiempoEntrega:3,notas:'Precio fijo hasta fin de mes',ganadora:false}],
   notas:'Reposición alimentos Q1 — comparar con spot market',usuarioId:'usr3',createdAt:'2025-02-20T10:00:00Z'},
  {id:'rfq3',numero:'RFQ-001-0003',estado:'ENVIADA',fecha:'2025-03-10',fechaVencimiento:'2025-03-17',
   items:[{productoId:'prod14',descripcion:'Lejía Clorox 3.8L',cantidad:48},{productoId:'prod15',descripcion:'Desinfectante Dettol 1L',cantidad:50},{productoId:'prod16',descripcion:'Jabón Líquido 5L',cantidad:24}],
   respuestas:[],notas:'URGENTE — reposición limpieza, stocks críticos',usuarioId:'usr1',createdAt:'2025-03-10T08:00:00Z'},
]
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
export function resetDemo(){['sp_config','sp_productos','sp_categorias','sp_almacenes','sp_proveedores','sp_movimientos','sp_ordenes','sp_usuarios','sp_session','sp_ajustes','sp_devoluciones','sp_transferencias','sp_cotizaciones','sp_inv_fisico','sp_notif','sp_alertas_leidas','sp_demo_version'].forEach(k=>localStorage.removeItem(k));return ok(true)}
export function exportarDatos(){const d={};['sp_config','sp_productos','sp_categorias','sp_almacenes','sp_proveedores','sp_movimientos','sp_ordenes','sp_usuarios','sp_ajustes','sp_devoluciones','sp_transferencias','sp_cotizaciones'].forEach(k=>{try{d[k]=JSON.parse(localStorage.getItem(k)||'null')}catch{d[k]=null}});return ok(d)}

// ═══════════════════════════════════════════════════════════
// CLIENTES
// ═══════════════════════════════════════════════════════════
const CLIENTES_DEMO = [
  {id:'cli1',razonSocial:'Corporación ABC S.A.C.',       ruc:'20312345678',contacto:'Ing. Mario Castro',   telefono:'01-445-7788',email:'pedidos@corpabc.pe',    direccion:'Av. Javier Prado 1520, San Isidro',    activo:true,createdAt:'2024-08-01T00:00:00Z'},
  {id:'cli2',razonSocial:'Nexus Solutions Perú S.R.L.',  ruc:'20498765432',contacto:'Sra. Karina Huerta',  telefono:'01-612-3344',email:'compras@nexusperu.pe',  direccion:'Av. Larco 1301, Miraflores',     activo:true,createdAt:'2024-09-01T00:00:00Z'},
  {id:'cli3',razonSocial:'Colegios Lima Norte E.I.R.L.', ruc:'20567891234',contacto:'Dir. Patricia Salas', telefono:'987-111-222',email:'logistica@colnorte.pe', direccion:'Av. Universitaria 3400, Los Olivos',   activo:true,createdAt:'2024-09-15T00:00:00Z'},
  {id:'cli4',razonSocial:'Tecnología Lima S.A.',         ruc:'20534561234',contacto:'Sr. Roberto Ríos',    telefono:'01-382-9900',email:'rrios@teclima.pe',      direccion:'Jirón Lampa 585, Lima',       activo:true,createdAt:'2024-10-01T00:00:00Z'},
  {id:'cli5',razonSocial:'Municipalidad de Los Olivos',  ruc:'20131370965',contacto:'Lic. Carmen Vargas',  telefono:'01-533-6100',email:'logistica@munilosol.gob.pe',direccion:'Av. Carlos Izaguirre 176, Los Olivos, Lima',activo:true,createdAt:'2024-11-01T00:00:00Z'},
  {id:'cli6',razonSocial:'Bodega San Martín',            ruc:'10456789012',contacto:'Sr. Juan Flores',     telefono:'964-555-777',email:'jflores@gmail.com',      direccion:'Av. Arica 420, Breña, Lima',            activo:true,createdAt:'2025-01-01T00:00:00Z'},
  {id:'cli7',razonSocial:'Distribuidora El Huerto',      ruc:'20612345678',contacto:'Sra. Rosa Mendoza',   telefono:'01-528-4466',email:'rosa@elhuerto.pe',       direccion:'Av. Tupac Amaru 1200, Comas, Lima',          activo:true,createdAt:'2025-01-15T00:00:00Z'},
]

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
const DESPACHOS_DEMO = [
  {
    id:'des1', numero:'GD-001-0001', estado:'ENTREGADO',
    clienteId:'cli1', almacenId:'alm1',
    fecha:'2025-01-10', fechaEntrega:'2025-01-12', fechaDespacho:'2025-01-12',
    items:[
      {productoId:'prod1',cantidad:2,costoUnitario:2815,precioVenta:3450,subtotal:6900},
      {productoId:'prod2',cantidad:3,precioVenta:720,costoUnitario:478.5,subtotal:2160},
    ],
    subtotal:9060, igv:1630.8, total:10690.8,
    guiaNumero:'GR-001-0001', direccionEntrega:'Av. Javier Prado 1520, San Isidro',
    transportista:'Courier Lima Express', observaciones:'Entregado conforme',
    usuarioId:'usr2', createdAt:'2025-01-10T09:00:00Z',
  },
  {
    id:'des2', numero:'GD-001-0002', estado:'ENTREGADO',
    clienteId:'cli3', almacenId:'alm2',
    fecha:'2025-01-08', fechaEntrega:'2025-01-09', fechaDespacho:'2025-01-09',
    items:[
      {productoId:'prod11',cantidad:35,costoUnitario:13.7,precioVenta:22,subtotal:770},
    ],
    subtotal:770, igv:138.6, total:908.6,
    guiaNumero:'GR-002-0002', direccionEntrega:'Av. Universitaria 3400, Los Olivos',
    transportista:'Unidad propia', observaciones:'',
    usuarioId:'usr2', createdAt:'2025-01-08T08:00:00Z',
  },
  {
    id:'des3', numero:'GD-001-0003', estado:'DESPACHADO',
    clienteId:'cli2', almacenId:'alm1',
    fecha:'2025-03-13', fechaEntrega:'2025-03-15', fechaDespacho:'2025-03-14',
    items:[
      {productoId:'prod8', cantidad:5,costoUnitario:43,precioVenta:78,subtotal:390},
      {productoId:'prod10',cantidad:20,costoUnitario:11.2,precioVenta:18,subtotal:360},
    ],
    subtotal:750, igv:135, total:885,
    guiaNumero:'GR-003-0001', direccionEntrega:'Av. Larco 1301, Miraflores',
    transportista:'Courier Lima Express', observaciones:'En ruta',
    usuarioId:'usr1', createdAt:'2025-03-13T10:00:00Z',
  },
  {
    id:'des4', numero:'GD-001-0004', estado:'LISTO',
    clienteId:'cli5', almacenId:'alm1',
    fecha:'2025-03-14', fechaEntrega:'2025-03-16', fechaDespacho:null,
    items:[
      {productoId:'prod21',cantidad:5,costoUnitario:29.3,precioVenta:48,subtotal:240},
      {productoId:'prod22',cantidad:3,costoUnitario:32.4,precioVenta:52,subtotal:156},
    ],
    subtotal:396, igv:71.28, total:467.28,
    guiaNumero:null, direccionEntrega:'Av. Carlos Izaguirre 176, Los Olivos, Lima',
    transportista:'Unidad propia', observaciones:'Esperando transportista',
    usuarioId:'usr2', createdAt:'2025-03-14T08:00:00Z',
  },
  {
    id:'des5', numero:'GD-001-0005', estado:'PICKING',
    clienteId:'cli7', almacenId:'alm3',
    fecha:'2025-03-15', fechaEntrega:'2025-03-17', fechaDespacho:null,
    items:[
      {productoId:'prod18',cantidad:20,costoUnitario:5.95,precioVenta:8.9,subtotal:178},
      {productoId:'prod20',cantidad:5, costoUnitario:150,precioVenta:198,subtotal:990},
      {productoId:'prod17',cantidad:3, costoUnitario:119.3,precioVenta:155,subtotal:465},
    ],
    subtotal:1633, igv:293.94, total:1926.94,
    guiaNumero:null, direccionEntrega:'Av. Tupac Amaru 1200, Comas, Lima',
    transportista:'Por asignar', observaciones:'Preparando en almacén frío',
    usuarioId:'usr2', createdAt:'2025-03-15T07:30:00Z',
  },
  {
    id:'des6', numero:'GD-001-0006', estado:'APROBADO',
    clienteId:'cli4', almacenId:'alm1',
    fecha:'2025-03-15', fechaEntrega:'2025-03-18', fechaDespacho:null,
    items:[
      {productoId:'prod1',cantidad:1,costoUnitario:2812,precioVenta:3450,subtotal:3450},
      {productoId:'prod4',cantidad:2,costoUnitario:248,precioVenta:380,subtotal:760},
    ],
    subtotal:4210, igv:757.8, total:4967.8,
    guiaNumero:null, direccionEntrega:'Jirón Lampa 585, Lima',
    transportista:'Por asignar', observaciones:'Cliente solicita entrega urgente',
    usuarioId:'usr1', createdAt:'2025-03-15T09:00:00Z',
  },
  {
    id:'des7', numero:'GD-001-0007', estado:'PEDIDO',
    clienteId:'cli6', almacenId:'alm2',
    fecha:'2025-03-15', fechaEntrega:'2025-03-20', fechaDespacho:null,
    items:[
      {productoId:'prod7', cantidad:10,costoUnitario:16.7,precioVenta:28,subtotal:280},
      {productoId:'prod11',cantidad:20,costoUnitario:13.8,precioVenta:22,subtotal:440},
    ],
    subtotal:720, igv:129.6, total:849.6,
    guiaNumero:null, direccionEntrega:'Av. Arica 420, Breña, Lima',
    transportista:'Por asignar', observaciones:'',
    usuarioId:'usr3', createdAt:'2025-03-15T11:00:00Z',
  },
]

export function getDespachos(filtros={}) {
  let data = leer('sp_despachos') || DESPACHOS_DEMO
  if (!leer('sp_despachos')) guardar('sp_despachos', DESPACHOS_DEMO)
  if (filtros.estado) data = data.filter(d => d.estado === filtros.estado)
  if (filtros.clienteId) data = data.filter(d => d.clienteId === filtros.clienteId)
  if (filtros.desde) data = data.filter(d => d.fecha >= filtros.desde)
  return ok([...data].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
}

export function saveDespacho(des) {
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
const TRANSPORTISTAS_DEMO = [
  {id:'tra1',nombre:'Juan Carlos Pérez',  tipo:'PROPIO',  placa:'ABC-123',vehiculo:'Camioneta Toyota Hilux',telefono:'987-001-001',email:'jcperez@dlnorte.pe',licencia:'Q84512301',activo:true,createdAt:'2024-08-01T00:00:00Z'},
  {id:'tra2',nombre:'Miguel Ríos Torres', tipo:'PROPIO',  placa:'XYZ-456',vehiculo:'Van Hyundai H-1',       telefono:'987-002-002',email:'mrios@dlnorte.pe',  licencia:'Q84522302',activo:true,createdAt:'2024-08-01T00:00:00Z'},
  {id:'tra3',nombre:'Courier Lima Express',tipo:'TERCERO',placa:'',       vehiculo:'Flota propia',           telefono:'01-445-8800',email:'ops@clexpress.pe',  licencia:'',         activo:true,createdAt:'2024-09-01T00:00:00Z'},
  {id:'tra4',nombre:'TransRápido SAC',    tipo:'TERCERO',placa:'',        vehiculo:'Moto / Bicicleta',       telefono:'987-003-003',email:'rep@transrapido.pe',licencia:'',         activo:true,createdAt:'2024-10-01T00:00:00Z'},
  {id:'tra5',nombre:'Carlos Meza Huanca', tipo:'PROPIO',  placa:'DEF-789',vehiculo:'Moto Honda CG 150',     telefono:'987-004-004',email:'cmeza@dlnorte.pe',  licencia:'M12345678',activo:true,createdAt:'2025-01-01T00:00:00Z'},
]

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
const RUTAS_DEMO = [
  {
    id:'rut1', numero:'RT-001-0001', estado:'COMPLETADA',
    transportistaId:'tra1', fechaSalida:'2025-01-12', horaSalida:'08:00',
    fechaRetorno:'2025-01-12', horaRetorno:'14:30',
    despachoIds:['des1','des2'],
    paradas:[
      {despachoId:'des1',orden:1,estado:'ENTREGADO',horaLlegada:'09:15',horaPartida:'09:45',observacion:'Entregado conforme'},
      {despachoId:'des2',orden:2,estado:'ENTREGADO',horaLlegada:'11:00',horaPartida:'11:20',observacion:''},
    ],
    kmRecorrido:85, costoViaje:120, observaciones:'Ruta completada sin novedades',
    usuarioId:'usr1', createdAt:'2025-01-11T16:00:00Z',
  },
  {
    id:'rut2', numero:'RT-001-0002', estado:'EN_RUTA',
    transportistaId:'tra3', fechaSalida:'2025-03-14', horaSalida:'09:00',
    fechaRetorno:null, horaRetorno:null,
    despachoIds:['des3'],
    paradas:[
      {despachoId:'des3',orden:1,estado:'EN_CAMINO',horaLlegada:null,horaPartida:null,observacion:''},
    ],
    kmRecorrido:0, costoViaje:45, observaciones:'',
    usuarioId:'usr2', createdAt:'2025-03-14T08:30:00Z',
  },
  {
    id:'rut3', numero:'RT-001-0003', estado:'PROGRAMADA',
    transportistaId:'tra1', fechaSalida:'2025-03-16', horaSalida:'07:30',
    fechaRetorno:null, horaRetorno:null,
    despachoIds:['des4','des6'],
    paradas:[
      {despachoId:'des4',orden:1,estado:'PENDIENTE',horaLlegada:null,horaPartida:null,observacion:''},
      {despachoId:'des6',orden:2,estado:'PENDIENTE',horaLlegada:null,horaPartida:null,observacion:''},
    ],
    kmRecorrido:0, costoViaje:80, observaciones:'Prioridad: cliente Municipalidad',
    usuarioId:'usr1', createdAt:'2025-03-15T15:00:00Z',
  },
  {
    id:'rut4', numero:'RT-001-0004', estado:'PROGRAMADA',
    transportistaId:'tra2', fechaSalida:'2025-03-17', horaSalida:'08:00',
    fechaRetorno:null, horaRetorno:null,
    despachoIds:['des5','des7'],
    paradas:[
      {despachoId:'des5',orden:1,estado:'PENDIENTE',horaLlegada:null,horaPartida:null,observacion:''},
      {despachoId:'des7',orden:2,estado:'PENDIENTE',horaLlegada:null,horaPartida:null,observacion:''},
    ],
    kmRecorrido:0, costoViaje:65, observaciones:'',
    usuarioId:'usr2', createdAt:'2025-03-15T16:00:00Z',
  },
]

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

// ═══════════════════════════════════════════════════════════
// AUDITORÍA DEL SISTEMA
// ═══════════════════════════════════════════════════════════
const KEY_AUDIT = 'sp_auditoria'
const MAX_LOGS  = 500  // máximo de registros en localStorage

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
      accion,         // CREATE | UPDATE | DELETE | LOGIN | LOGOUT | EXPORT | PRINT
      modulo,         // inventario | entradas | salidas | etc.
      detalle,        // descripción legible
      datos,          // objeto JSON opcional con datos del cambio
    }
    logs.unshift(nuevo)  // más reciente primero
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
