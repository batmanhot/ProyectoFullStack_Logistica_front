import { useState, useMemo, useEffect, useRef } from 'react'
import {
  Building2, Plus, Edit2, Trash2, Ban, Search, Save, Eye, EyeOff,
  AlertTriangle, Clock, CheckCircle, Link2, Users, LogIn, Radar,
} from 'lucide-react'
import { differenceInDays, format, addDays } from 'date-fns'
import {
  Modal, ConfirmDialog, EmptyState, Badge, Btn,
  Field, TableWrap, Th, Td, KpiCard, Input, Select, Textarea, Alert, Toggle,
} from '../../components/ui/index'
import { useNegocio } from '../../queries/admin.queries'
import ModalVista360 from './ModalVista360'
import { estadoEfectivo, ESTADO_BADGE, ESTADO_LABEL } from './constants'

const ESTADOS_FILTRO = ['activo', 'trial', 'por_vencer', 'gracia', 'suspendido', 'vencido', 'cancelado', 'archivado']

// El modal de alta/edición es largo — se parte en 3 secciones navegables.
const SECCIONES = [
  { id: 'datos',    label: 'Datos del negocio' },
  { id: 'gobierno', label: 'Propietario y Admin' },
  { id: 'plan',     label: 'Suscripción' },
]

// ══════════════════════════════════════════════════════════
// TAB: NEGOCIOS
// ══════════════════════════════════════════════════════════
export default function TabNegocios({ negocios, crearNegocio, actualizarNegocio, eliminarNegocio, archivarNegocio, planes, toast }) {
  const negocioList = useMemo(() => (Array.isArray(negocios) ? negocios : []), [negocios])

  const [search, setSearch]     = useState('')
  const [filtroEstado, setFE]   = useState('todos')
  const [filtroPlan,   setFP]   = useState('todos')
  const [modalOpen, setModal]   = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm]         = useState({})
  const [showPass, setShowPass] = useState(false)
  const [tab, setTab]           = useState('datos')      // sección visible del modal (form largo → 3 pestañas)
  const [adminAbierto, setAdminAbierto] = useState(false) // el bloque Admin del Negocio (opcional) arranca colapsado
  const [confirmDel, setConfirmDel] = useState(null)
  const [archivarItem, setArchivarItem] = useState(null) // negocio en flujo de "Eliminar definitivamente"
  const [confirmarNombre, setConfirmarNombre] = useState('')
  const [vista360Id, setVista360Id] = useState(null)

  // Detalle enriquecido (usuarios/límite, último acceso) — findAll no lo trae, solo findOne.
  const { data: detalleUso } = useNegocio(editItem?.id)

  // La fila de la lista puede venir con datos viejos/incompletos del negocio o
  // de sus usuarios de gobierno. El detalle (findOne) es la fuente autoritativa:
  // en cuanto llega (y en cada refetch), rellena el form — pero NUNCA pisa un
  // campo que el SuperAdmin ya tocó (touchedRef).
  const touchedRef = useRef(new Set())
  useEffect(() => {
    if (!modalOpen || !editItem || !detalleUso || detalleUso.id !== editItem.id) return
    const t = touchedRef.current
    const pick = k => (t.has(k) ? undefined : (detalleUso[k] ?? '')) // undefined → conservar prev
    setForm(prev => {
      const next = { ...prev }
      for (const k of [
        'nombre', 'nombreCorto', 'ruc', 'contacto', 'email', 'telefono', 'plan', 'estado', 'notas',
        'ownerNombre', 'ownerEmail', 'ownerTelefono', 'ownerDocumento', 'ownerCargo',
        'adminNombre', 'adminEmail', 'adminTelefono', 'adminDocumento', 'adminCargo',
      ]) {
        const v = pick(k)
        if (v !== undefined) next[k] = v
      }
      if (!t.has('ownerActivo')) next.ownerActivo = detalleUso.ownerActivo ?? true
      if (!t.has('adminActivo')) next.adminActivo = detalleUso.adminActivo ?? true
      next.ownerExiste = detalleUso.ownerExiste ?? prev.ownerExiste
      next.adminExiste = detalleUso.adminExiste ?? prev.adminExiste
      return next
    })
  }, [detalleUso, modalOpen, editItem])

  // Todo derivado de estadoEfectivo (lo que manda el backend, ver
  // NegociosService.calcularEstadoEfectivo) — antes esto mezclaba `estado`
  // crudo para activos/trial con un cálculo de fechas aparte para
  // "por vencer", pudiendo desacordar entre sí.
  const stats = useMemo(() => {
    const conteo = { activo: 0, trial: 0, por_vencer: 0, gracia: 0, vencido: 0 }
    for (const n of negocioList) {
      const e = estadoEfectivo(n)
      if (e in conteo) conteo[e]++
    }
    return {
      total: negocioList.length,
      activos: conteo.activo,
      trial: conteo.trial,
      porVencer: conteo.por_vencer,
      gracia: conteo.gracia,
      vencidos: conteo.vencido,
    }
  }, [negocioList])

  const filtered = useMemo(() => {
    let r = [...negocioList]
    if (search) {
      const q = search.toLowerCase()
      r = r.filter(n => n.nombre.toLowerCase().includes(q) || n.ruc?.includes(q) || n.email?.toLowerCase().includes(q) || n.empresaId?.toLowerCase().includes(q))
    }
    if (filtroEstado !== 'todos') r = r.filter(n => estadoEfectivo(n) === filtroEstado)
    if (filtroPlan   !== 'todos') r = r.filter(n => n.plan   === filtroPlan)
    return r
  }, [negocioList, search, filtroEstado, filtroPlan])

  function getAccessLink(empresaId) {
    return `${window.location.origin}/app/${empresaId}`
  }

  function copyLink(empresaId) {
    navigator.clipboard.writeText(getAccessLink(empresaId)).then(() => toast('Link copiado al portapapeles', 'success'))
  }

  function openNew() {
    touchedRef.current = new Set()
    setTab('datos')
    setAdminAbierto(false)
    setEditItem(null)
    setForm({ nombre:'', nombreCorto:'', ruc:'', contacto:'', email:'', telefono:'', plan:'trial', estado:'trial', fechaVencimiento:format(addDays(new Date(), 30), 'yyyy-MM-dd'), empresaId:'', notas:'',
      ownerNombre:'', ownerEmail:'', ownerPassword:'', ownerTelefono:'', ownerDocumento:'', ownerCargo:'', ownerActivo:true,
      adminNombre:'', adminEmail:'', adminPassword:'', adminTelefono:'', adminDocumento:'', adminCargo:'', adminActivo:true })
    setModal(true)
  }

  function openEdit(item) {
    touchedRef.current = new Set()
    setTab('datos')
    setAdminAbierto(false)
    setEditItem(item)
    setForm({
      ...item,
      ownerNombre: item?.ownerNombre ?? '', ownerEmail: item?.ownerEmail ?? '', ownerPassword: '',
      ownerTelefono: item?.ownerTelefono ?? '', ownerDocumento: item?.ownerDocumento ?? '', ownerCargo: item?.ownerCargo ?? '',
      ownerActivo: item?.ownerActivo ?? true,
      adminNombre: item?.adminNombre ?? '', adminEmail: item?.adminEmail ?? '', adminPassword: '',
      adminTelefono: item?.adminTelefono ?? '', adminDocumento: item?.adminDocumento ?? '', adminCargo: item?.adminCargo ?? '',
      adminActivo: item?.adminActivo ?? true,
    })
    setModal(true)
  }

  function generarPasswordTemporal(campo) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
    let password = ''
    for (let i = 0; i < 12; i++) password += chars[Math.floor(Math.random() * chars.length)]
    setForm(prev => ({ ...prev, [campo]: password }))
    setShowPass(true)
    return password
  }

  async function save() {
    // Cada validación salta a la pestaña donde está el campo con problema.
    if (!form.nombre?.trim()) { setTab('datos'); toast('El nombre es requerido', 'error'); return }
    if (!form.empresaId?.trim()) { setTab('datos'); toast('El ID de empresa es requerido', 'error'); return }
    // El Administrador del Negocio (admin) es opcional pero, si se toca, van los 3 campos.
    const tocaAdmin = !!(form.adminNombre?.trim() || form.adminEmail?.trim() || form.adminPassword)
    if (tocaAdmin && !editItem) {
      if (!form.adminNombre?.trim() || !form.adminEmail?.trim() || (form.adminPassword?.length ?? 0) < 8) {
        setTab('gobierno'); setAdminAbierto(true)
        toast('Para registrar el Administrador del Negocio: nombre, email y contraseña (mín. 8).', 'error'); return
      }
    }

    if (editItem) {
      // El bloque Admin del Negocio solo se envía si YA existe (se está editando)
      // o si se cargaron sus credenciales ahora (se lo está creando). Si está
      // vacío y no existe, no se manda nada de admin — evita "faltan datos del admin".
      const editaAdmin = form.adminExiste || !!(form.adminNombre?.trim() || form.adminEmail?.trim() || form.adminPassword)
      if (editaAdmin && !form.adminExiste) {
        if (!form.adminNombre?.trim() || !form.adminEmail?.trim() || (form.adminPassword?.length ?? 0) < 8) {
          setTab('gobierno'); setAdminAbierto(true)
          toast('Para registrar el Administrador del Negocio: nombre, email y contraseña (mín. 8).', 'error'); return
        }
      }
      const res = await actualizarNegocio.mutateAsync({
        id: editItem.id,
        nombre: form.nombre,
        nombreCorto: form.nombreCorto,
        ruc: form.ruc,
        contacto: form.contacto,
        email: form.email,
        telefono: form.telefono,
        plan: form.plan,
        estado: form.estado,
        fechaVencimiento: form.fechaVencimiento || undefined,
        notas: form.notas,
        ownerNombre: form.ownerNombre || undefined,
        ownerEmail: form.ownerEmail || undefined,
        ownerPassword: form.ownerPassword || undefined,
        ownerTelefono: form.ownerTelefono || undefined,
        ownerDocumento: form.ownerDocumento || undefined,
        ownerCargo: form.ownerCargo || undefined,
        ...(form.ownerExiste && { ownerActivo: form.ownerActivo }),
        ...(editaAdmin && {
          adminNombre: form.adminNombre || undefined,
          adminEmail: form.adminEmail || undefined,
          adminPassword: form.adminPassword || undefined,
          adminTelefono: form.adminTelefono || undefined,
          adminDocumento: form.adminDocumento || undefined,
          adminCargo: form.adminCargo || undefined,
          ...(form.adminExiste && { adminActivo: form.adminActivo }),
        }),
      })
      if (res?.error) { toast(res.error, 'error'); return }
      toast('Negocio actualizado', 'success')
    } else {
      if (!form.ownerNombre?.trim()) { setTab('gobierno'); toast('El nombre del Propietario es requerido', 'error'); return }
      if (!form.ownerEmail?.trim())  { setTab('gobierno'); toast('El email del Propietario es requerido', 'error');  return }
      if ((form.ownerPassword?.length ?? 0) < 8) { setTab('gobierno'); toast('La contraseña del Propietario debe tener al menos 8 caracteres', 'error'); return }
      const res = await crearNegocio.mutateAsync({
        codigo: form.empresaId, nombre: form.nombre, nombreCorto: form.nombreCorto, ruc: form.ruc,
        contacto: form.contacto, email: form.email, telefono: form.telefono, plan: form.plan, estado: form.estado,
        fechaVencimiento: form.fechaVencimiento || undefined, notas: form.notas,
        ownerNombre: form.ownerNombre, ownerEmail: form.ownerEmail, ownerPassword: form.ownerPassword,
        ownerTelefono: form.ownerTelefono || undefined, ownerDocumento: form.ownerDocumento || undefined, ownerCargo: form.ownerCargo || undefined,
        ...(tocaAdmin && {
          adminNombre: form.adminNombre, adminEmail: form.adminEmail, adminPassword: form.adminPassword,
          adminTelefono: form.adminTelefono || undefined, adminDocumento: form.adminDocumento || undefined, adminCargo: form.adminCargo || undefined,
        }),
      })
      if (res?.error) { toast(res.error, 'error'); return }
      toast('Negocio registrado correctamente', 'success')
    }
    setModal(false)
  }

  /** "Cancelar negocio" — reversible: solo suspende el acceso, no borra nada (ver NegociosService.remove). */
  async function remove(id) {
    const res = await eliminarNegocio.mutateAsync(id)
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Negocio cancelado — puedes reactivarlo editándolo', 'success')
  }

  /** "Eliminar definitivamente" — exige repetir el nombre exacto (validado también en el backend). */
  async function archivar() {
    const res = await archivarNegocio.mutateAsync({ id: archivarItem.id, confirmacionNombre: confirmarNombre })
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Negocio eliminado definitivamente', 'success')
    setArchivarItem(null)
    setConfirmarNombre('')
  }

  const f = (k, v) => { touchedRef.current.add(k); setForm(p => ({ ...p, [k]: v })) }

  // El bloque "Administrador del Negocio" es opcional — se muestra solo si el
  // negocio ya tiene uno, si se cargaron sus datos, o si el usuario lo abre.
  const mostrarAdmin = adminAbierto
    || !!(form.adminExiste || form.adminNombre?.trim() || form.adminEmail?.trim() || form.adminPassword)

  // "Quitar" el bloque Admin: solo cuando aún no existe uno guardado — limpia
  // lo tipeado para que no se envíe nada de admin y lo vuelve a colapsar.
  function quitarAdmin() {
    for (const k of ['adminNombre', 'adminEmail', 'adminPassword', 'adminTelefono', 'adminDocumento', 'adminCargo']) f(k, '')
    setAdminAbierto(false)
  }

  const kpis = [
    { label:'Total registrados', value:stats.total,    color:'#3b82f6', icon:<Building2 size={32}/> },
    { label:'Activos',           value:stats.activos,  color:'#10b981', icon:<CheckCircle size={32}/> },
    { label:'Trial activo',      value:stats.trial,    color:'#6366f1', icon:<Clock size={32}/> },
    { label:'Por vencer (≤30d)', value:stats.porVencer,color:'#f59e0b', icon:<AlertTriangle size={32}/> },
    { label:'En gracia',         value:stats.gracia,   color:'#fb923c', icon:<Clock size={32}/> },
    { label:'Vencidos',          value:stats.vencidos, color:'#ef4444', icon:<AlertTriangle size={32}/> },
  ]

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(k => <KpiCard key={k.label} label={k.label} value={k.value} accentColor={k.color} icon={k.icon} />)}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, RUC, email o ID…" className="pl-8" />
        </div>
        <Select value={filtroEstado} onChange={e => setFE(e.target.value)} style={{ width: 190 }}>
          <option value="todos">Todos los estados</option>
          {ESTADOS_FILTRO.map(s => <option key={s} value={s}>{ESTADO_LABEL[s] || s}</option>)}
        </Select>
        <Select value={filtroPlan} onChange={e => setFP(e.target.value)} style={{ width: 190 }}>
          <option value="todos">Todos los planes</option>
          {planes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </Select>
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
                  <tr key={n.id} className="border-t border-[var(--border)]/60 hover:bg-[var(--bg-muted)]/50 transition-colors">
                    <Td>
                      <div className="font-medium text-[var(--text-primary)]">{n.nombre}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">ID: {n.empresaId} {n.ruc && `· RUC: ${n.ruc}`}</div>
                    </Td>
                    <Td>
                      {plan && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-semibold" style={{ background:`${plan.color}20`, color:plan.color }}>
                          {plan.nombre}
                        </span>
                      )}
                    </Td>
                    <Td><Badge variant={ESTADO_BADGE[estadoEfectivo(n)] || 'neutral'}>{ESTADO_LABEL[estadoEfectivo(n)] || estadoEfectivo(n)}</Badge></Td>
                    <Td>
                      {dias !== null ? (
                        <div>
                          <div className="text-[13px] text-[var(--text-primary)]">{n.fechaVencimiento}</div>
                          <div className={`text-[11px] ${dias < 0 ? 'text-red-400' : dias <= 7 ? 'text-red-400' : dias <= 30 ? 'text-yellow-400' : 'text-[var(--text-muted)]'}`}>
                            {dias < 0 ? `Vencido hace ${-dias}d` : dias === 0 ? 'Vence hoy' : `${dias}d restantes`}
                          </div>
                        </div>
                      ) : '—'}
                    </Td>
                    <Td>
                      {link ? (
                        <div className="flex items-center gap-1.5 max-w-[200px]">
                          <span className="text-[11px] text-[var(--text-muted)] font-mono truncate" title={link}>
                            /app/{n.empresaId}
                          </span>
                          <button
                            onClick={() => copyLink(n.empresaId)}
                            title="Copiar link de acceso"
                            className="shrink-0 p-1 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                          >
                            <Link2 size={12}/>
                          </button>
                        </div>
                      ) : '—'}
                    </Td>
                    <Td muted>
                      <div className="text-[12px]">{n.contacto}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">{n.email}</div>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1 justify-end">
                        <Btn variant="ghost" size="sm" onClick={() => setVista360Id(n.id)} title="Resumen consolidado del negocio"><Radar size={13}/>Vista 360°</Btn>
                        <Btn variant="ghost" size="icon" onClick={() => openEdit(n)} title="Editar"><Edit2 size={13}/></Btn>
                        {estadoEfectivo(n) !== 'cancelado' && estadoEfectivo(n) !== 'archivado' && (
                          <Btn variant="ghost" size="icon" onClick={() => setConfirmDel(n)} title="Cancelar negocio (reversible)"><Ban size={13}/></Btn>
                        )}
                        {estadoEfectivo(n) !== 'archivado' && (
                          <Btn variant="danger" size="icon" onClick={() => { setArchivarItem(n); setConfirmarNombre('') }} title="Eliminar definitivamente"><Trash2 size={13}/></Btn>
                        )}
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
          <Btn variant="primary" onClick={save} disabled={crearNegocio.isPending || actualizarNegocio.isPending}><Save size={14}/>{editItem ? 'Guardar cambios' : 'Registrar negocio'}</Btn>
        </>}>
        {/* El formulario es largo — se parte en 3 secciones navegables. */}
        <div className="flex gap-1 border-b border-[var(--border)] shrink-0">
          {SECCIONES.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setTab(s.id)}
              className={`px-3.5 py-2 text-[12px] font-semibold -mb-px border-b-2 transition-colors ${
                tab === s.id
                  ? 'border-[var(--accent)] text-[var(--text-primary)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* ── Sección 1 · Datos del negocio ── */}
        {tab === 'datos' && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nombre del negocio *" className="col-span-2">
            <Input className="col-span-2" value={form.nombre||''} onChange={e => f('nombre',e.target.value)} placeholder="Empresa XYZ S.A.C." />
          </Field>
          <Field label="Nombre corto (opcional)" className="col-span-2">
            <Input className="col-span-2" value={form.nombreCorto||''} onChange={e => f('nombreCorto',e.target.value)} placeholder="Empresa XYZ" />
            <div className="text-[11px] text-[var(--text-muted)] mt-1">Se muestra en el sidebar del negocio en lugar del nombre completo, si se llena. Útil cuando el nombre completo es muy largo.</div>
          </Field>
          <Field label="RUC / Identificación fiscal">
            <Input value={form.ruc||''} onChange={e => f('ruc',e.target.value)} placeholder="20123456789" />
          </Field>
          <Field label="Contacto principal">
            <Input value={form.contacto||''} onChange={e => f('contacto',e.target.value)} placeholder="Juan Pérez" />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email||''} onChange={e => f('email',e.target.value)} placeholder="contacto@empresa.com" />
          </Field>
          <Field label="Teléfono">
            <Input value={form.telefono||''} onChange={e => f('telefono',e.target.value)} placeholder="+51 999 888 777" />
          </Field>
          <Field label="Código URL (slug de acceso) *">
            <Input value={form.empresaId||''} onChange={e => f('empresaId', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))} placeholder="mi-empresa" />
            {form.empresaId && (
              <div className="flex items-center gap-2 mt-1.5 px-2.5 py-1.5 bg-[var(--accent-dim)] border border-[var(--accent)]/20 rounded-lg">
                <Link2 size={11} className="text-[var(--accent)] shrink-0"/>
                <span className="text-[11px] text-[var(--accent)] font-mono truncate">
                  {window.location.origin}/app/{form.empresaId}
                </span>
              </div>
            )}
          </Field>
        </div>
        )}

        {/* ── Sección 2 · Propietario y Administrador ── */}
        {tab === 'gobierno' && (
        <div className="flex flex-col gap-4">
          {/* Propietario (Owner) — obligatorio (docs/GOBIERNO-PLATAFORMA.md regla 3) */}
          <div className="border border-[var(--accent)]/25 rounded-xl p-3 bg-[var(--accent-dim)]">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                Propietario del negocio (Owner){!editItem && ' *'}
              </div>
              {editItem && (
                <button type="button" onClick={() => generarPasswordTemporal('ownerPassword')} className="px-2.5 py-1.5 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-dim)] text-[11px] font-semibold text-[var(--accent)] hover:brightness-110 transition-colors">
                  Reiniciar contraseña
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label={editItem ? 'Nombre del Propietario' : 'Nombre del Propietario *'}>
                <Input value={form.ownerNombre||''} onChange={e => f('ownerNombre',e.target.value)} placeholder="Juan Pérez" />
              </Field>
              <Field label={editItem ? 'Email del Propietario' : 'Email del Propietario *'}>
                <Input type="email" value={form.ownerEmail||''} onChange={e => f('ownerEmail',e.target.value)} placeholder="dueno@empresa.com" />
              </Field>
            </div>
            <div className="mt-4">
              <Field label={editItem ? 'Nueva contraseña (opcional)' : 'Contraseña inicial (mín. 8 caracteres) *'}>
                <div className="relative">
                  <Input type={showPass?'text':'password'} className="pr-10" value={form.ownerPassword||''} onChange={e => f('ownerPassword',e.target.value)} placeholder={editItem ? 'Dejar vacío para conservar la actual' : '••••••••'} />
                  <button type="button" onClick={() => setShowPass(p=>!p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                    {showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                </div>
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <Field label="Teléfono"><Input value={form.ownerTelefono||''} onChange={e => f('ownerTelefono',e.target.value)} placeholder="+51 999 888 777" /></Field>
              <Field label="Documento (DNI/CE)"><Input value={form.ownerDocumento||''} onChange={e => f('ownerDocumento',e.target.value)} placeholder="12345678" /></Field>
              <Field label="Cargo"><Input value={form.ownerCargo||''} onChange={e => f('ownerCargo',e.target.value)} placeholder="Gerente General" /></Field>
            </div>
            {editItem && (
              <label className="flex items-center gap-2.5 mt-3 cursor-pointer select-none">
                <Toggle value={form.ownerActivo !== false} onChange={v => f('ownerActivo', v)} />
                <span className="text-[12px] text-[var(--text-secondary)]">Cuenta activa — puede iniciar sesión en el sistema (ocupa un cupo del plan)</span>
              </label>
            )}
          </div>

          {/* Administrador del Negocio (Admin Tenant) — opcional, colapsado por defecto */}
          {!mostrarAdmin ? (
            <button
              type="button"
              onClick={() => setAdminAbierto(true)}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-dashed border-[var(--border)] text-[12px] font-semibold text-[var(--text-secondary)] hover:border-[var(--accent)]/40 hover:text-[var(--text-primary)] transition-colors"
            >
              <Plus size={14}/> Añadir Administrador del Negocio (opcional)
            </button>
          ) : (
          <div className="border border-[var(--border)] rounded-xl p-3 bg-[var(--bg-muted)]">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">Administrador del Negocio (opcional)</div>
              <div className="flex items-center gap-2">
                {editItem && (form.adminNombre || form.adminEmail) && (
                  <button type="button" onClick={() => generarPasswordTemporal('adminPassword')} className="px-2.5 py-1.5 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-dim)] text-[11px] font-semibold text-[var(--accent)] hover:brightness-110 transition-colors">
                    Reiniciar contraseña
                  </button>
                )}
                {!form.adminExiste && (
                  <button type="button" onClick={quitarAdmin} className="text-[11px] font-semibold text-[var(--text-muted)] hover:text-red-400 transition-colors">
                    Quitar
                  </button>
                )}
              </div>
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mb-3">Segundo usuario de gobierno del negocio. Déjalo vacío si no aplica.</div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nombre del administrador">
                <Input value={form.adminNombre||''} onChange={e => f('adminNombre',e.target.value)} placeholder="María Gómez" />
              </Field>
              <Field label="Email del administrador">
                <Input type="email" value={form.adminEmail||''} onChange={e => f('adminEmail',e.target.value)} placeholder="admin@empresa.com" />
              </Field>
            </div>
            <div className="mt-4">
              <Field label={editItem ? 'Nueva contraseña (opcional)' : 'Contraseña (mín. 8 caracteres)'}>
                <div className="relative">
                  <Input type={showPass?'text':'password'} className="pr-10" value={form.adminPassword||''} onChange={e => f('adminPassword',e.target.value)} placeholder={editItem ? 'Dejar vacío para conservar la actual' : '••••••••'} />
                  <button type="button" onClick={() => setShowPass(p=>!p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                    {showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                </div>
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <Field label="Teléfono"><Input value={form.adminTelefono||''} onChange={e => f('adminTelefono',e.target.value)} placeholder="+51 999 888 777" /></Field>
              <Field label="Documento (DNI/CE)"><Input value={form.adminDocumento||''} onChange={e => f('adminDocumento',e.target.value)} placeholder="12345678" /></Field>
              <Field label="Cargo"><Input value={form.adminCargo||''} onChange={e => f('adminCargo',e.target.value)} placeholder="Jefe de Almacén" /></Field>
            </div>
            {editItem && form.adminExiste && (
              <label className="flex items-center gap-2.5 mt-3 cursor-pointer select-none">
                <Toggle value={form.adminActivo !== false} onChange={v => f('adminActivo', v)} />
                <span className="text-[12px] text-[var(--text-secondary)]">Cuenta activa — puede iniciar sesión en el sistema (ocupa un cupo del plan)</span>
              </label>
            )}
          </div>
          )}
        </div>
        )}

        {/* ── Sección 3 · Suscripción ── */}
        {tab === 'plan' && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Plan contratado">
            <Select value={form.plan||'trial'} onChange={e => {
              const selectedPlan = planes.find(p => p.id === e.target.value)
              f('plan', e.target.value)
              if (selectedPlan && !editItem) {
                f('fechaVencimiento', format(addDays(new Date(), selectedPlan.vigenciaDias || 30), 'yyyy-MM-dd'))
              }
            }}>
              {planes.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.precioMensual === 0 ? '(Gratis)' : `(S/ ${p.precioMensual}/mes)`}</option>)}
            </Select>
          </Field>
          <Field label="Estado">
            <Select value={form.estado||'trial'} onChange={e => f('estado',e.target.value)}>
              {['trial','activo','suspendido','cancelado'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </Select>
          </Field>
          <Field label="Fecha de registro">
            <Input type="date" value={form.fechaRegistro||''} onChange={e => f('fechaRegistro',e.target.value)} />
          </Field>
          <Field label="Fecha de vencimiento">
            <Input type="date" value={form.fechaVencimiento||''} onChange={e => f('fechaVencimiento',e.target.value)} />
          </Field>
          {editItem && (
            <div className="col-span-2 border border-[var(--border)] rounded-xl p-3 bg-[var(--bg-muted)]">
              <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)] mb-3">Uso</div>
              {!detalleUso ? (
                <div className="text-[12px] text-[var(--text-muted)]">Cargando…</div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2.5">
                    <Users size={14} className="text-[var(--text-muted)] shrink-0"/>
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Usuarios</div>
                      <div className="text-[13px] text-[var(--text-primary)] font-medium">
                        {detalleUso._count?.usuarios ?? '—'} / {(() => {
                          const max = planes.find(p => p.id === detalleUso.plan)?.maxUsuarios
                          return max === -1 ? 'Ilimitado' : (max ?? '—')
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <LogIn size={14} className="text-[var(--text-muted)] shrink-0"/>
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Último acceso</div>
                      <div className="text-[13px] text-[var(--text-primary)] font-medium">
                        {detalleUso.ultimoAcceso ? format(new Date(detalleUso.ultimoAcceso), 'dd/MM/yyyy HH:mm') : 'Nunca'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="col-span-2">
            <Field label="Notas internas">
              <Textarea rows={2} value={form.notas||''} onChange={e => f('notas',e.target.value)} placeholder="Observaciones, acuerdos especiales…" />
            </Field>
          </div>
        </div>
        )}
      </Modal>

      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={() => remove(confirmDel?.id)}
        danger title="Cancelar negocio"
        message={`¿Cancelar "${confirmDel?.nombre}"? Sus usuarios pierden acceso de inmediato, pero no se borra ningún dato — puedes reactivarlo editándolo y volviendo a ponerlo en Activo.`} />

      {/* "Eliminar definitivamente" — protegido, exige repetir el nombre exacto (mismo criterio validado en el backend). */}
      <Modal open={!!archivarItem} onClose={() => setArchivarItem(null)} title="Eliminar negocio definitivamente" size="sm"
        footer={<>
          <Btn variant="secondary" onClick={() => setArchivarItem(null)}>Cancelar</Btn>
          <Btn variant="danger" disabled={confirmarNombre.trim().toLowerCase() !== (archivarItem?.nombre||'').trim().toLowerCase() || archivarNegocio.isPending}
            onClick={archivar}>
            <Trash2 size={14}/> {archivarNegocio.isPending ? 'Eliminando...' : 'Eliminar definitivamente'}
          </Btn>
        </>}>
        <Alert variant="danger">
          Esto es lo que de verdad no se puede deshacer desde el panel. "{archivarItem?.nombre}" queda archivado de forma
          permanente y sus usuarios pierden el acceso para siempre — a diferencia de "Cancelar", que sí se puede revertir.
        </Alert>
        <Field label={`Escribe el nombre exacto del negocio para confirmar: "${archivarItem?.nombre}"`}>
          <Input value={confirmarNombre} onChange={e => setConfirmarNombre(e.target.value)} placeholder={archivarItem?.nombre}/>
        </Field>
      </Modal>

      <ModalVista360 negocioId={vista360Id} onClose={() => setVista360Id(null)} />
    </div>
  )
}
