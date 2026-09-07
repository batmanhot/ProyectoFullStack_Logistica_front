import { useState, useMemo } from 'react'
import {
  Building2, Plus, Edit2, Trash2, Ban, Search, Save, Eye, EyeOff,
  Link2, Users, LogIn, Download,
} from 'lucide-react'
import { differenceInDays, format, addDays } from 'date-fns'
import {
  PageHeader, Card, KpiCard, FilterChips, Badge, Btn, Field, Input, Select,
  Textarea, TableWrap, Th, Td, EmptyState, Modal, ConfirmDialog, Alert,
} from './ui'
import { useNegocio } from '../../queries/admin.queries'
import { estadoEfectivo, ESTADO_BADGE, ESTADO_LABEL } from '../AdminSaaS/constants'
import { exportCsv } from './export-utils'

const ESTADO_BADGE_V2 = { activo:'success', trial:'info', por_vencer:'warning', gracia:'warning', suspendido:'warning', vencido:'danger', cancelado:'neutral', archivado:'neutral' }
const ESTADOS_FILTRO = [
  { value:'todos', label:'Todos' },
  { value:'activo', label:'Activo' },
  { value:'trial', label:'Trial' },
  { value:'gracia', label:'Gracia' },
  { value:'suspendido', label:'Suspendido' },
  { value:'vencido', label:'Vencido' },
  { value:'cancelado', label:'Cancelado' },
]

/**
 * Negocios — primera pantalla migrada a la identidad visual de
 * AdminSaaSV2. Lógica de negocio (estados, guardado, cancelar vs eliminar
 * definitivamente) idéntica byte a byte a pages/AdminSaaS/TabNegocios.jsx —
 * solo cambia la presentación.
 */
export default function TabNegocios({ negocios, planes, crearNegocio, actualizarNegocio, eliminarNegocio, archivarNegocio, toast }) {
  const negocioList = Array.isArray(negocios) ? negocios : []

  const [search, setSearch]     = useState('')
  const [filtroEstado, setFE]   = useState('todos')
  const [filtroPlan,   setFP]   = useState('todos')
  const [modalOpen, setModal]   = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm]         = useState({})
  const [showPass, setShowPass] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [archivarItem, setArchivarItem] = useState(null)
  const [confirmarNombre, setConfirmarNombre] = useState('')

  const { data: detalleUso } = useNegocio(editItem?.id)

  const stats = useMemo(() => {
    const conteo = { activo: 0, trial: 0, por_vencer: 0, gracia: 0, vencido: 0, suspendido: 0, cancelado: 0, archivado: 0 }
    for (const n of negocioList) {
      const e = estadoEfectivo(n)
      if (e in conteo) conteo[e]++
    }
    return {
      total: negocioList.length,
      habilitados: conteo.activo + conteo.trial + conteo.gracia + conteo.por_vencer,
      suspendidos: conteo.suspendido + conteo.vencido + conteo.cancelado + conteo.archivado,
      seguimiento: conteo.por_vencer + conteo.gracia,
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

  function getAccessLink(empresaId) { return `${window.location.origin}/app/${empresaId}` }

  function exportar() {
    const rows = [
      ['Negocio','Código','RUC','Plan','Estado','Vencimiento','Contacto','Email'],
      ...filtered.map(n => [n.nombre, n.empresaId, n.ruc||'', planes.find(p=>p.id===n.plan)?.nombre||n.plan, ESTADO_LABEL[estadoEfectivo(n)]||estadoEfectivo(n), n.fechaVencimiento||'', n.contacto||'', n.email||'']),
    ]
    exportCsv(rows, 'negocios')
    toast(`${filtered.length} negocio(s) exportado(s)`, 'success')
  }
  function copyLink(empresaId) { navigator.clipboard.writeText(getAccessLink(empresaId)).then(() => toast('Link copiado al portapapeles', 'success')) }

  function openNew() {
    setEditItem(null)
    setForm({ nombre:'', nombreCorto:'', ruc:'', contacto:'', email:'', telefono:'', plan:'trial', estado:'trial', fechaVencimiento:format(addDays(new Date(), 30), 'yyyy-MM-dd'), empresaId:'', notas:'', adminNombre:'', adminEmail:'', adminPassword:'' })
    setModal(true)
  }

  function openEdit(item) {
    const admin = item?.usuarios?.[0] || item?.admin || item?.usuarioAdminInicial || {}
    setEditItem(item)
    setForm({ ...item, adminNombre: item?.adminNombre ?? admin.nombre ?? '', adminEmail: item?.adminEmail ?? admin.email ?? '', adminPassword: '' })
    setModal(true)
  }

  function generarPasswordTemporal() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
    let password = ''
    for (let i = 0; i < 12; i++) password += chars[Math.floor(Math.random() * chars.length)]
    setForm(prev => ({ ...prev, adminPassword: password }))
    setShowPass(true)
    return password
  }

  async function save() {
    if (!form.nombre?.trim()) { toast('El nombre es requerido', 'error'); return }
    if (!form.empresaId?.trim()) { toast('El ID de empresa es requerido', 'error'); return }
    if (editItem) {
      const res = await actualizarNegocio.mutateAsync({
        id: editItem.id, nombre: form.nombre, nombreCorto: form.nombreCorto, ruc: form.ruc, contacto: form.contacto,
        email: form.email, telefono: form.telefono, plan: form.plan, estado: form.estado,
        fechaVencimiento: form.fechaVencimiento || undefined, notas: form.notas,
        adminNombre: form.adminNombre || undefined, adminEmail: form.adminEmail || undefined, adminPassword: form.adminPassword || undefined,
      })
      if (res?.error) { toast(res.error, 'error'); return }
      toast('Negocio actualizado', 'success')
    } else {
      if (!form.adminNombre?.trim()) { toast('El nombre del admin es requerido', 'error'); return }
      if (!form.adminEmail?.trim())  { toast('El email del admin es requerido', 'error');  return }
      if ((form.adminPassword?.length ?? 0) < 8) { toast('La contraseña del admin debe tener al menos 8 caracteres', 'error'); return }
      const res = await crearNegocio.mutateAsync({ codigo: form.empresaId, nombre: form.nombre, nombreCorto: form.nombreCorto, ruc: form.ruc, contacto: form.contacto, email: form.email, telefono: form.telefono, plan: form.plan, estado: form.estado, fechaVencimiento: form.fechaVencimiento || undefined, notas: form.notas, adminNombre: form.adminNombre, adminEmail: form.adminEmail, adminPassword: form.adminPassword })
      if (res?.error) { toast(res.error, 'error'); return }
      toast('Negocio registrado correctamente', 'success')
    }
    setModal(false)
  }

  async function remove(id) {
    const res = await eliminarNegocio.mutateAsync(id)
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Negocio cancelado — puedes reactivarlo editándolo', 'success')
  }

  async function archivar() {
    const res = await archivarNegocio.mutateAsync({ id: archivarItem.id, confirmacionNombre: confirmarNombre })
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Negocio eliminado definitivamente', 'success')
    setArchivarItem(null)
    setConfirmarNombre('')
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div>
      <PageHeader
        breadcrumb="Clientes"
        title="Negocios"
        description="Administra el ciclo de vida, la suscripción y el acceso operativo de cada tenant."
        actions={<>
          <Btn variant="secondary" onClick={exportar}><Download size={14}/>Exportar</Btn>
          <Btn variant="primary" onClick={openNew}><Plus size={14}/>Nuevo negocio</Btn>
        </>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Negocios registrados" value={stats.total} sub="Base de tenants" tone="indigo" icon={Building2} />
        <KpiCard label="Accesos habilitados" value={stats.habilitados} sub="Activos, trial o gracia" tone="green" icon={Users} />
        <KpiCard label="Accesos suspendidos" value={stats.suspendidos} sub={stats.suspendidos > 0 ? 'Requieren renovación' : 'Ninguno por ahora'} subTone={stats.suspendidos > 0 ? 'danger' : undefined} tone="red" icon={Ban} />
        <KpiCard label="Con seguimiento" value={stats.seguimiento} sub="Por vencer o en gracia" tone="amber" icon={LogIn} />
      </div>

      <Card className="mb-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa3b2]" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por negocio, código, ciudad o plan" className="pl-8" />
            </div>
            <Select value={filtroPlan} onChange={e => setFP(e.target.value)} style={{ width: 200 }}>
              <option value="todos">Todos los planes</option>
              {planes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </Select>
          </div>
          <FilterChips options={ESTADOS_FILTRO} value={filtroEstado} onChange={setFE} />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No hay negocios" description="Registra el primer negocio para comenzar." action={<Btn variant="primary" onClick={openNew}><Plus size={14}/>Registrar negocio</Btn>} />
      ) : (
        <TableWrap>
          <thead>
            <tr><Th>Negocio</Th><Th>Plan</Th><Th>Estado</Th><Th>Vencimiento</Th><Th>Link de acceso</Th><Th>Contacto</Th><Th right>Acciones</Th></tr>
          </thead>
          <tbody>
            {filtered.map(n => {
              const plan = planes.find(p => p.id === n.plan)
              const dias = n.fechaVencimiento ? differenceInDays(new Date(n.fechaVencimiento), new Date()) : null
              const link = n.empresaId ? getAccessLink(n.empresaId) : null
              return (
                <tr key={n.id} className="border-t border-[#eef1f6] hover:bg-[#f9fafc] transition-colors">
                  <Td>
                    <div className="font-semibold text-[#172033]">{n.nombre}</div>
                    <div className="text-[11.5px] text-[#8893a3]">{n.empresaId}{n.ruc && ` · RUC ${n.ruc}`}</div>
                  </Td>
                  <Td>{plan && <Badge variant="info">{plan.nombre}</Badge>}</Td>
                  <Td><Badge variant={ESTADO_BADGE_V2[estadoEfectivo(n)] || ESTADO_BADGE[estadoEfectivo(n)] || 'neutral'}>{ESTADO_LABEL[estadoEfectivo(n)] || estadoEfectivo(n)}</Badge></Td>
                  <Td>
                    {dias !== null ? (
                      <div>
                        <div className="text-[13px] text-[#172033]">{n.fechaVencimiento}</div>
                        <div className={`text-[11.5px] font-medium ${dias < 0 ? 'text-red-500' : dias <= 7 ? 'text-red-500' : dias <= 30 ? 'text-amber-600' : 'text-[#8893a3]'}`}>
                          {dias < 0 ? `Vencido hace ${-dias}d` : dias === 0 ? 'Vence hoy' : `${dias}d restantes`}
                        </div>
                      </div>
                    ) : '—'}
                  </Td>
                  <Td>
                    {link ? (
                      <div className="flex items-center gap-1.5 max-w-[190px]">
                        <span className="text-[11.5px] text-[#687386] font-mono truncate" title={link}>/app/{n.empresaId}</span>
                        <button onClick={() => copyLink(n.empresaId)} title="Copiar link de acceso" className="shrink-0 p-1 rounded hover:bg-[#eef1f6] text-[#8893a3] hover:text-[#355fd1]">
                          <Link2 size={12}/>
                        </button>
                      </div>
                    ) : '—'}
                  </Td>
                  <Td muted>
                    <div className="text-[12.5px] text-[#172033]">{n.contacto}</div>
                    <div className="text-[11.5px] text-[#8893a3]">{n.email}</div>
                  </Td>
                  <Td right>
                    <div className="flex items-center gap-1 justify-end">
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
      )}

      {/* Modal add/edit */}
      <Modal open={modalOpen} onClose={() => setModal(false)} title={editItem ? 'Editar Negocio' : 'Registrar Nuevo Negocio'} size="lg"
        footer={<>
          <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn variant="primary" onClick={save}><Save size={14}/>{editItem ? 'Guardar cambios' : 'Registrar negocio'}</Btn>
        </>}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nombre del negocio *" className="col-span-2">
            <Input value={form.nombre||''} onChange={e => f('nombre',e.target.value)} placeholder="Empresa XYZ S.A.C." />
          </Field>
          <Field label="Nombre corto (opcional)" className="col-span-2">
            <Input value={form.nombreCorto||''} onChange={e => f('nombreCorto',e.target.value)} placeholder="Empresa XYZ" hint="Se muestra en el sidebar del negocio en lugar del nombre completo, si se llena." />
          </Field>
          <Field label="RUC / Identificación fiscal"><Input value={form.ruc||''} onChange={e => f('ruc',e.target.value)} placeholder="20123456789" /></Field>
          <Field label="Contacto principal"><Input value={form.contacto||''} onChange={e => f('contacto',e.target.value)} placeholder="Juan Pérez" /></Field>
          <Field label="Email"><Input type="email" value={form.email||''} onChange={e => f('email',e.target.value)} placeholder="contacto@empresa.com" /></Field>
          <Field label="Teléfono"><Input value={form.telefono||''} onChange={e => f('telefono',e.target.value)} placeholder="+51 999 888 777" /></Field>
          <Field label="Código URL (slug de acceso) *">
            <Input value={form.empresaId||''} onChange={e => f('empresaId', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))} placeholder="mi-empresa" />
            {form.empresaId && (
              <div className="flex items-center gap-2 mt-1.5 px-2.5 py-1.5 bg-[#eef2ff] border border-[#355fd1]/20 rounded-lg">
                <Link2 size={11} className="text-[#355fd1] shrink-0"/>
                <span className="text-[11.5px] text-[#294da8] font-mono truncate">{window.location.origin}/app/{form.empresaId}</span>
              </div>
            )}
          </Field>

          <div className="col-span-2 border border-[#dfe4ec] rounded-2xl p-4 bg-[#f9fafc]">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#687386]">Acceso del administrador</div>
              {editItem && <Btn variant="secondary" size="sm" onClick={generarPasswordTemporal}>Reiniciar contraseña</Btn>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label={editItem ? 'Nombre del administrador' : 'Nombre del administrador *'}><Input value={form.adminNombre||''} onChange={e => f('adminNombre',e.target.value)} placeholder="Juan Pérez" /></Field>
              <Field label={editItem ? 'Email del administrador' : 'Email del administrador *'}><Input type="email" value={form.adminEmail||''} onChange={e => f('adminEmail',e.target.value)} placeholder="admin@empresa.com" /></Field>
            </div>
            <div className="mt-4">
              <Field label={editItem ? 'Nueva contraseña (opcional)' : 'Contraseña inicial (mín. 8 caracteres) *'}>
                <div className="relative">
                  <Input type={showPass?'text':'password'} className="pr-10" value={form.adminPassword||''} onChange={e => f('adminPassword',e.target.value)} placeholder={editItem ? 'Dejar vacío para conservar la actual' : '••••••••'} />
                  <button type="button" onClick={() => setShowPass(p=>!p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8893a3] hover:text-[#172033]">
                    {showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                </div>
              </Field>
            </div>
          </div>

          <Field label="Plan contratado">
            <Select value={form.plan||'trial'} onChange={e => {
              const selectedPlan = planes.find(p => p.id === e.target.value)
              f('plan', e.target.value)
              if (selectedPlan && !editItem) f('fechaVencimiento', format(addDays(new Date(), selectedPlan.vigenciaDias || 30), 'yyyy-MM-dd'))
            }}>
              {planes.map(p => <option key={p.id} value={p.id}>{p.nombre} {p.precioMensual === 0 ? '(Gratis)' : `(S/ ${p.precioMensual}/mes)`}</option>)}
            </Select>
          </Field>
          <Field label="Estado">
            <Select value={form.estado||'trial'} onChange={e => f('estado',e.target.value)}>
              {['trial','activo','suspendido','cancelado'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </Select>
          </Field>
          <Field label="Fecha de registro"><Input type="date" value={form.fechaRegistro||''} onChange={e => f('fechaRegistro',e.target.value)} /></Field>
          <Field label="Fecha de vencimiento"><Input type="date" value={form.fechaVencimiento||''} onChange={e => f('fechaVencimiento',e.target.value)} /></Field>

          {editItem && (
            <div className="col-span-2 border border-[#dfe4ec] rounded-2xl p-4 bg-[#f9fafc]">
              <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#687386] mb-3">Uso</div>
              {!detalleUso ? <div className="text-[12.5px] text-[#8893a3]">Cargando…</div> : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2.5">
                    <Users size={14} className="text-[#8893a3] shrink-0"/>
                    <div>
                      <div className="text-[10px] text-[#8893a3] uppercase tracking-wide">Usuarios</div>
                      <div className="text-[13px] text-[#172033] font-semibold">
                        {detalleUso._count?.usuarios ?? '—'} / {(() => { const max = planes.find(p => p.id === detalleUso.plan)?.maxUsuarios; return max === -1 ? 'Ilimitado' : (max ?? '—') })()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <LogIn size={14} className="text-[#8893a3] shrink-0"/>
                    <div>
                      <div className="text-[10px] text-[#8893a3] uppercase tracking-wide">Último acceso</div>
                      <div className="text-[13px] text-[#172033] font-semibold">{detalleUso.ultimoAcceso ? format(new Date(detalleUso.ultimoAcceso), 'dd/MM/yyyy HH:mm') : 'Nunca'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="col-span-2">
            <Field label="Notas internas"><Textarea rows={2} value={form.notas||''} onChange={e => f('notas',e.target.value)} placeholder="Observaciones, acuerdos especiales…" /></Field>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={() => remove(confirmDel?.id)}
        danger title="Cancelar negocio"
        message={`¿Cancelar "${confirmDel?.nombre}"? Sus usuarios pierden acceso de inmediato, pero no se borra ningún dato — puedes reactivarlo editándolo y volviendo a ponerlo en Activo.`} />

      <Modal open={!!archivarItem} onClose={() => setArchivarItem(null)} title="Eliminar negocio definitivamente" size="sm"
        footer={<>
          <Btn variant="secondary" onClick={() => setArchivarItem(null)}>Cancelar</Btn>
          <Btn variant="danger" disabled={confirmarNombre.trim().toLowerCase() !== (archivarItem?.nombre||'').trim().toLowerCase() || archivarNegocio.isPending} onClick={archivar}>
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
    </div>
  )
}
