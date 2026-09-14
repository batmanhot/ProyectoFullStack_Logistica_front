import { useMemo, useState, Fragment } from 'react'
import {
  ShieldCheck, Plus, Edit2, Trash2, Lock, Key, CheckSquare, Square, Users, Building2, AlertTriangle,
  Grid3x3, ChevronDown, ChevronUp, Check,
} from 'lucide-react'
import {
  Modal, ConfirmDialog, EmptyState, Badge, Btn, Field, Input, Textarea,
} from '../../components/ui/index'
import { MODULOS_GRUPOS, TODOS_MODULOS, ROLES_BASE_META } from '../Usuarios/constants'
import {
  useRolesBase, useCrearRolBase, useActualizarRolBase, useEliminarRolBase,
} from '../../queries/admin.queries'

// ══════════════════════════════════════════════════════════
// TAB: ROLES DEL SISTEMA — catálogo base (Rol.empresaId = null)
//   El SuperAdmin gobierna las plantillas de rol que TODOS los tenants
//   heredan. Los tenants las usan tal cual o las duplican como rol propio;
//   nunca editan estas. `owner`/`admin` son de gobierno: acceso total
//   intocable, solo se les puede cambiar el texto visible.
// ══════════════════════════════════════════════════════════

const CODIGO_RE = /^[a-z0-9-]+$/

const permisosDeRol = (rol) => (rol?.permisos || []).map(p => p.modulo)
const esAccesoTotal = (mods) => mods.includes('*')

// Alcance de roles (2026-09-11): los 3 niveles que se definieron para el
// negocio — Gestión (Owner + Gerencias: supervisa/controla/decide),
// Admin (Supervisor Operativo de la capa de Operaciones: gobierna la
// cuenta, aprueba, no decide estrategia) y Operativo (el resto: ejecutan).
// Solo `owner` y `gerente-operaciones` son "Gestión" hoy — si mañana se
// suma otro "gerente-*", agregarlo acá.
const TIERS = {
  gestion:   { label: 'Gestión — decide',              color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  admin:     { label: 'Admin — supervisa y aprueba',    color: '#00c896', bg: 'rgba(0,200,150,0.12)' },
  // '#5f6f80' (el gris tenue que usa el resto de la pantalla para texto
  // secundario) se leía casi invisible acá — bajo contraste sobre el fondo
  // oscuro, justo en el grupo más grande (10 roles). '#9ba8b6' es el mismo
  // gris pero más claro, ya usado en Panorama de Almacenes para texto
  // secundario legible sobre fondo oscuro.
  operativo: { label: 'Operativo — ejecuta',            color: '#9ba8b6', bg: 'rgba(155,168,182,0.10)' },
}
function tierDeRol(codigo) {
  if (codigo === 'owner' || codigo === 'gerente-operaciones') return 'gestion'
  if (codigo === 'admin') return 'admin'
  return 'operativo'
}

function resumenPermisos(mods) {
  if (esAccesoTotal(mods)) return 'Acceso total'
  const n = mods.filter(m => TODOS_MODULOS.includes(m)).length
  return `${n} módulo${n === 1 ? '' : 's'}`
}

export default function TabRolesSistema({ toast }) {
  const { data: roles = [], isLoading } = useRolesBase()
  const crear = useCrearRolBase()
  const actualizar = useActualizarRolBase()
  const eliminar = useEliminarRolBase()

  const [editor, setEditor] = useState(null)   // { modo:'nuevo'|'editar', rol }
  const [confirmDel, setConfirmDel] = useState(null)

  // owner/admin son roles de GOBIERNO — no son plantillas asignables/duplicables
  // por el tenant (se asignan desde Negocios). Van en su propio bloque.
  const gobierno = useMemo(() => roles.filter(r => r.protegido), [roles])
  // Orden alfabético: con 3 columnas el orden de llegada de la API se leía
  // salteado (llena por fila, no por columna) — alfabético es predecible.
  const catalogo = useMemo(
    () => roles.filter(r => !r.protegido).sort((a, b) => a.label.localeCompare(b.label)),
    [roles],
  )

  async function guardar(payload) {
    const editando = editor?.modo === 'editar'
    const res = editando
      ? await actualizar.mutateAsync({ id: editor.rol.id, ...payload })
      : await crear.mutateAsync(payload)
    if (res?.error) { toast?.(res.error, 'error'); return }
    toast?.(editando ? 'Rol del sistema actualizado' : 'Rol del sistema creado', 'success')
    setEditor(null)
  }

  async function borrar() {
    const res = await eliminar.mutateAsync(confirmDel.id)
    if (res?.error) { toast?.(res.error, 'error'); setConfirmDel(null); return }
    toast?.('Rol del sistema eliminado', 'success')
    setConfirmDel(null)
  }

  return (
    <div className="space-y-7 max-w-[2100px]">
      {/* Matriz + Roles de gobierno lado a lado — la matriz es lo ancho
          (necesita espacio para las columnas de rol), gobierno son solo 2
          tarjetas chicas: en vez de dejarlas a todo el ancho de la pantalla
          abajo, aprovechan la columna angosta al costado. items-start (no
          stretch): el contenido no es parejo (matriz colapsada vs. 2
          tarjetas) — forzar el mismo alto dejaría un hueco. */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* w-full explícito: con items-start (necesario para que la
            columna angosta no se estire a la altura de la matriz), en
            mobile (flex-col) el eje cruzado es el ancho — sin w-full este
            div se dimensiona por su contenido (fit-content) en vez de
            ocupar el 100%, y la fila de badges de tiers no alcanza a
            envolver: se desborda horizontalmente en vez de hacer wrap.
            flex-[2] (vs. flex-1 de la columna lateral): reparte el ancho
            2:1 en vez de un px fijo — un ancho fijo (lo que había antes)
            se comía TODA la pantalla apenas se activaba lg:flex-row en
            viewports angostos (~1024px), empujando la matriz fuera de
            vista por completo. */}
        <div className="flex-[2] min-w-0 w-full">
          <MatrizAccesos roles={roles}/>
        </div>

        {/* Roles de gobierno + Plantillas del catálogo, columna al costado
            de la matriz — ninguna de las dos necesita el ancho completo de
            la pantalla, así que comparten esta misma columna en vez de
            bajar a franjas completas debajo. lg:flex-1 (proporcional, no
            un px fijo) + min-w para no quedar ilegible en el extremo
            angosto — las grillas de tarjetas de abajo se autoajustan
            (auto-fit) al ancho real que le toque, así que no dependen de
            que esta columna tenga un ancho exacto. */}
        <div className="w-full lg:flex-1 lg:min-w-[280px] flex flex-col gap-4">
          <div className="bg-[#161d28] border border-white/8 rounded-xl p-4 flex flex-col gap-3">
            <div>
              <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Roles de gobierno</h3>
              <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                Propietario y Administrador — ninguno se puede eliminar ni cambiar de código, y se
                asignan desde <b>Negocios</b>, no aquí. El <b>Propietario</b> conserva <b>acceso
                total</b> intocable (la llave maestra); el <b>Administrador</b> tiene un catálogo de
                permisos editable, como cualquier rol.
              </p>
            </div>
            {/* auto-fit/minmax en vez de breakpoints fijos: el número de
                columnas se autoajusta al ancho REAL de esta tarjeta (que
                ahora es proporcional, no un px fijo) — con solo 2 roles,
                auto-fit no deja columnas vacías de más. */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3">
              {gobierno.map(rol => {
                const uso = rol.enUso || { usuarios: 0, negocios: 0 }
                const mods = permisosDeRol(rol)
                return (
                  <div key={rol.id} className="flex flex-col gap-2 bg-[#1a2230] border border-blue-500/20 rounded-xl px-3.5 py-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                        <Lock size={14} className="text-blue-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[var(--text-primary)] truncate" title={rol.label}>{rol.label}</div>
                        <code className="text-[11px] text-[var(--text-muted)] bg-white/5 px-1.5 py-0.5 rounded">{rol.codigo}</code>
                      </div>
                    </div>
                    {rol.descripcion && (
                      <div className="text-[12px] text-[var(--text-muted)] line-clamp-2">{rol.descripcion}</div>
                    )}
                    <div className="flex flex-col gap-1.5">
                      {rol.permisosBloqueados ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)]"><Key size={12} className="text-amber-400" /> Acceso total</span>
                      ) : (
                        <Badge variant={esAccesoTotal(mods) ? 'warning' : 'neutral'}>{resumenPermisos(mods)}</Badge>
                      )}
                      <div className="flex items-center gap-2.5 text-[11px] text-[var(--text-muted)]">
                        <span className="inline-flex items-center gap-1" title={`${uso.usuarios} usuario${uso.usuarios === 1 ? '' : 's'}`}><Users size={11} /> {uso.usuarios}</span>
                        <span className="inline-flex items-center gap-1" title={`${uso.negocios} negocio${uso.negocios === 1 ? '' : 's'}`}><Building2 size={11} /> {uso.negocios}</span>
                      </div>
                    </div>
                    <Btn variant="ghost" size="sm" onClick={() => setEditor({ modo: 'editar', rol })}>
                      <Edit2 size={13} /> {rol.permisosBloqueados ? 'Nombre' : 'Editar'}
                    </Btn>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Plantillas del catálogo ───────────────────────── */}
          <div className="bg-[#161d28] border border-white/8 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Plantillas del catálogo</h3>
                <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                  Las hereda todo negocio. Se <b>duplican como rol propio</b> para ajustarlas — nunca
                  se editan estas.
                </p>
              </div>
              <Btn variant="primary" size="sm" className="shrink-0" onClick={() => setEditor({ modo: 'nuevo' })}>
                <Plus size={14} /> Crear rol
              </Btn>
            </div>

            {isLoading ? (
              <div className="text-[13px] text-[var(--text-muted)] px-1">Cargando catálogo…</div>
            ) : catalogo.length === 0 ? (
              <EmptyState icon={ShieldCheck} title="Sin plantillas" description="Crea la primera plantilla de rol del sistema." />
            ) : (
              // Mismo criterio auto-fit; el piso de 230px es más alto que el
              // de gobierno porque esta tarjeta suma 2 botones-ícono
              // (editar/eliminar) en la cabecera — con menos de eso el
              // nombre del rol se aplasta a 1px de ancho (bug real ya
              // encontrado y confirmado por DOM).
              <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-3">
                {catalogo.map(rol => {
                  const mods = permisosDeRol(rol)
                  const uso = rol.enUso || { usuarios: 0, negocios: 0 }
                  return (
                    <div key={rol.id} className="flex flex-col gap-2 bg-[#1a2230] border border-white/8 rounded-xl px-3.5 py-3">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center shrink-0">
                          <ShieldCheck size={14} className="text-[var(--accent)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-[var(--text-primary)] truncate" title={rol.label}>{rol.label}</div>
                          <code className="text-[11px] text-[var(--text-muted)] bg-white/5 px-1.5 py-0.5 rounded">{rol.codigo}</code>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Btn variant="ghost" size="icon" title="Editar" onClick={() => setEditor({ modo: 'editar', rol })}>
                            <Edit2 size={13} />
                          </Btn>
                          <Btn
                            variant="ghost" size="icon"
                            className="text-red-400 hover:text-red-300 disabled:opacity-30 disabled:hover:text-red-400"
                            disabled={uso.usuarios > 0}
                            title={uso.usuarios > 0 ? 'En uso — no se puede eliminar' : 'Eliminar'}
                            onClick={() => setConfirmDel(rol)}
                          >
                            <Trash2 size={13} />
                          </Btn>
                        </div>
                      </div>
                      {rol.descripcion && (
                        <div className="text-[12px] text-[var(--text-muted)] line-clamp-2">{rol.descripcion}</div>
                      )}
                      <div className="flex flex-col gap-1.5">
                        <Badge variant={esAccesoTotal(mods) ? 'warning' : 'neutral'}>{resumenPermisos(mods)}</Badge>
                        <div className="flex items-center gap-2.5 text-[11px] text-[var(--text-muted)]">
                          <span className="inline-flex items-center gap-1" title={`${uso.usuarios} usuario${uso.usuarios === 1 ? '' : 's'}`}><Users size={11} /> {uso.usuarios}</span>
                          <span className="inline-flex items-center gap-1" title={`${uso.negocios} negocio${uso.negocios === 1 ? '' : 's'}`}><Building2 size={11} /> {uso.negocios}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {editor && (
        <EditorRol
          key={editor.rol?.id || 'nuevo'}
          modo={editor.modo}
          rol={editor.rol}
          guardando={crear.isPending || actualizar.isPending}
          onGuardar={guardar}
          onClose={() => setEditor(null)}
        />
      )}

      <ConfirmDialog
        open={!!confirmDel} onClose={() => setConfirmDel(null)} onConfirm={borrar} danger
        title="Eliminar rol del sistema"
        message={`¿Eliminar la plantilla "${confirmDel?.label}" (${confirmDel?.codigo})? Desaparece del catálogo para todos los negocios. Solo es posible porque nadie la está usando.`}
      />
    </div>
  )
}

// ── Matriz de accesos ─────────────────────────────────────
// Tabla módulo × rol para validar de un vistazo qué cambió con el Alcance de
// roles (2026-09-11) — mismo criterio de "tiene el módulo" que el resto de
// esta pantalla: '*' (comodín, hoy solo Owner) cubre todo; el resto, el
// permiso exacto. Gobierno primero (Owner/Admin), después catálogo por orden
// alfabético — mismo orden en que ya se agrupan arriba.
function MatrizAccesos({ roles }) {
  const [abierta, setAbierta] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  // Orden por TIER (Gestión → Admin → Operativo), no por protegido/catálogo
  // — acá lo que importa es el nivel de negocio, no si el SuperAdmin puede
  // editar el rol. Dentro de Gestión, Owner primero (la llave maestra);
  // dentro de Operativo, alfabético.
  const rolesOrdenados = useMemo(() => {
    const ORDEN_TIER = { gestion: 0, admin: 1, operativo: 2 }
    return [...roles].sort((a, b) => {
      const ta = tierDeRol(a.codigo), tb = tierDeRol(b.codigo)
      if (ta !== tb) return ORDEN_TIER[ta] - ORDEN_TIER[tb]
      if (ta === 'gestion') return a.codigo === 'owner' ? -1 : b.codigo === 'owner' ? 1 : 0
      return a.label.localeCompare(b.label)
    })
  }, [roles])

  // Agrupa las columnas ya ordenadas en bloques contiguos de un mismo tier,
  // para el colspan de la fila de encabezado superior.
  const bloquesTier = useMemo(() => {
    const acc = []
    for (const rol of rolesOrdenados) {
      const tier = tierDeRol(rol.codigo)
      const ultimo = acc[acc.length - 1]
      if (ultimo?.tier === tier) ultimo.count++
      else acc.push({ tier, count: 1 })
    }
    return acc
  }, [rolesOrdenados])

  // Filtra por nombre de MÓDULO (no de rol — para eso ya está el scroll
  // horizontal) — con 44 filas en 9 grupos, ubicar uno a mano era lento.
  // Un grupo sin ninguna fila que matchee desaparece entero.
  const gruposFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return MODULOS_GRUPOS
    return MODULOS_GRUPOS
      .map(grupo => ({ ...grupo, items: grupo.items.filter(m => m.label.toLowerCase().includes(q)) }))
      .filter(grupo => grupo.items.length > 0)
  }, [busqueda])

  return (
    <section className="space-y-3 bg-[#161d28] border border-white/8 rounded-xl p-4">
      <button type="button" onClick={() => setAbierta(v => !v)}
        className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors">
        <Grid3x3 size={15}/> Matriz de accesos por rol
        {abierta ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
      </button>
      <p className="text-[12px] text-[var(--text-muted)] -mt-2">
        Qué módulo tiene cada rol, de un vistazo. <Key size={11} className="inline text-amber-400 -mt-0.5"/> = acceso
        total (comodín); <Check size={11} className="inline text-[#00c896] -mt-0.5"/> = módulo puntual.
      </p>
      <div className="flex flex-wrap gap-3 -mt-1">
        {Object.entries(TIERS).map(([key, t]) => (
          <span key={key} className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md"
            style={{ background: t.bg, color: t.color }}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: t.color }}/>
            {t.label}
          </span>
        ))}
      </div>

      {abierta && rolesOrdenados.length > 0 && (
        <>
          <Input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Filtrar por módulo... (ej: despachos)" className="max-w-xs text-[12px]"/>

          <div className="border border-white/8 rounded-xl overflow-auto" style={{ maxHeight: 820 }}>
            <table className="border-collapse text-[11.5px] w-full">
              <thead>
                <tr>
                  <th rowSpan={2} className="sticky top-0 left-0 z-20 bg-[#1a2230] px-3 py-2 text-left border-b border-r border-white/10 min-w-[160px] align-bottom">
                    Módulo
                  </th>
                  {bloquesTier.map((b, i) => {
                    const t = TIERS[b.tier]
                    return (
                      <th key={i} colSpan={b.count}
                        className="sticky top-0 z-10 h-6 px-2 text-center text-[9.5px] font-semibold uppercase tracking-wider border-b border-l border-white/10"
                        style={{ background: t.bg, color: t.color }}>
                        {t.label}
                      </th>
                    )
                  })}
                </tr>
                <tr>
                  {rolesOrdenados.map(rol => {
                    const mods = permisosDeRol(rol)
                    const total = esAccesoTotal(mods)
                    const t = TIERS[tierDeRol(rol.codigo)]
                    return (
                      <th key={rol.id} title={rol.label}
                        className="sticky top-6 z-10 px-2 py-2 text-center border-b border-l border-white/6 align-bottom"
                        style={{ minWidth: 100, background: t.bg, color: ROLES_BASE_META[rol.codigo]?.color || 'var(--text-muted)' }}>
                        <div className="flex flex-col items-center gap-1">
                          {total && <Key size={10} className="text-amber-400 shrink-0"/>}
                          <span className="leading-tight break-words">{rol.label}</span>
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {gruposFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={rolesOrdenados.length + 1} className="px-3 py-6 text-center text-[var(--text-muted)]">
                      Ningún módulo coincide con "{busqueda}"
                    </td>
                  </tr>
                ) : gruposFiltrados.map(grupo => (
                <Fragment key={grupo.grupo}>
                  <tr>
                    <td colSpan={rolesOrdenados.length + 1}
                      className="sticky left-0 bg-[#141b25] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] border-b border-white/6"
                      style={{ color: grupo.color }}>
                      {grupo.grupo}
                    </td>
                  </tr>
                  {grupo.items.map(mod => (
                    <tr key={mod.id} className="hover:bg-white/[0.02]">
                      <td className="sticky left-0 z-[5] bg-[#161d28] px-3 py-1.5 border-b border-r border-white/6 whitespace-nowrap text-[var(--text-secondary)]">
                        {mod.label}
                      </td>
                      {rolesOrdenados.map(rol => {
                        const mods = permisosDeRol(rol)
                        const tiene = esAccesoTotal(mods) || mods.includes(mod.id)
                        return (
                          <td key={rol.id} className="px-2 py-1.5 border-b border-l border-white/6 text-center">
                            {tiene
                              ? <Check size={13} className="mx-auto text-[#00c896]"/>
                              : <span className="text-white/10">—</span>}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}
    </section>
  )
}

// ── Editor ────────────────────────────────────────────────
function EditorRol({ modo, rol, guardando, onGuardar, onClose }) {
  const esEditar = modo === 'editar'
  const protegido = !!rol?.protegido
  const enUso = rol?.enUso?.usuarios || 0

  const modsIniciales = permisosDeRol(rol)
  const [codigo, setCodigo] = useState(rol?.codigo || '')
  const [label, setLabel] = useState(rol?.label || '')
  const [descripcion, setDescripcion] = useState(rol?.descripcion || '')
  const [esAdmin, setEsAdmin] = useState(esAccesoTotal(modsIniciales))
  const [permisos, setPermisos] = useState(
    esAccesoTotal(modsIniciales) ? [] : modsIniciales.filter(m => TODOS_MODULOS.includes(m)),
  )
  const [errCodigo, setErrCodigo] = useState('')

  // Alcance de roles (2026-09-11): antes "protegido" (owner/admin) implicaba
  // siempre acceso total intocable. Ahora solo Owner tiene ese candado real
  // — Admin sigue sin poder eliminarse/renombrar su código (protegido=true),
  // pero su lista de módulos SÍ es editable (permisosBloqueados=false).
  const permisosBloqueados = rol?.permisosBloqueados ?? protegido

  function toggleModulo(id) {
    if (permisosBloqueados) return
    setPermisos(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]))
  }
  function toggleGrupo(grupo) {
    if (permisosBloqueados) return
    const ids = grupo.items.map(i => i.id)
    setPermisos(p => (ids.every(id => p.includes(id)) ? p.filter(x => !ids.includes(x)) : [...new Set([...p, ...ids])]))
  }

  const sinModulos = !permisosBloqueados && !esAdmin && permisos.length === 0

  function submit() {
    if (!label.trim() || sinModulos) return
    if (!esEditar && !CODIGO_RE.test(codigo)) { setErrCodigo('Solo minúsculas, números y guiones'); return }

    const payload = { label: label.trim(), descripcion: descripcion.trim() || undefined }
    if (!esEditar) payload.codigo = codigo
    // A un rol con los permisos bloqueados (hoy, solo Owner) nunca le
    // mandamos `permisos` (el backend lo rechaza); su acceso total ya está
    // fijado. Admin es "protegido" (no eliminable) pero no está bloqueado.
    if (!permisosBloqueados) payload.permisos = esAdmin ? ['*'] : permisos
    onGuardar(payload)
  }

  return (
    <Modal
      open onClose={onClose} size="lg"
      title={!esEditar ? 'Nuevo rol del sistema'
        : permisosBloqueados ? `Nombre y descripción: ${rol.label}`
        : `Editar rol: ${rol.label}`}
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" disabled={!label.trim() || sinModulos || guardando} onClick={submit}>
          <ShieldCheck size={13} /> {esEditar ? 'Guardar cambios' : 'Crear rol'}
        </Btn>
      </>}
    >
      {permisosBloqueados && (
        <div className="flex items-start gap-2 px-4 py-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-[12px] text-blue-300">
          <Lock size={13} className="mt-0.5 shrink-0" />
          <span>
            <b>{rol.label}</b> es la llave maestra de la plataforma. Su acceso total es intocable y su
            código está reservado — solo puedes ajustar el nombre y la descripción que ven los negocios.
          </span>
        </div>
      )}

      {protegido && !permisosBloqueados && (
        <div className="flex items-start gap-2 px-4 py-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-[12px] text-blue-300">
          <Lock size={13} className="mt-0.5 shrink-0" />
          <span>
            <b>{rol.label}</b> es un rol de gobierno: no se puede eliminar ni cambiar su código —
            pero su lista de módulos sí es editable, como cualquier rol del catálogo.
          </span>
        </div>
      )}

      {esEditar && enUso > 0 && !permisosBloqueados && (
        <div className="flex items-start gap-2 px-4 py-3 bg-amber-500/10 rounded-xl border border-amber-500/25 text-[12px] text-amber-300">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          <span>
            <b>{enUso} usuario{enUso === 1 ? '' : 's'}</b> en {rol.enUso.negocios} negocio{rol.enUso.negocios === 1 ? '' : 's'} usan
            este rol. Cualquier cambio de permisos se aplica de inmediato en todos ellos.
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Código *" hint={esEditar ? 'No se puede cambiar' : 'Identificador único — minúsculas, números y guiones'} error={errCodigo}>
          <Input
            value={codigo}
            onChange={e => { setCodigo(e.target.value.toLowerCase()); setErrCodigo('') }}
            placeholder="ej: coordinador-turno"
            disabled={esEditar}
          />
        </Field>
        <Field label="Nombre visible *">
          <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Ej: Coordinador de turno" />
        </Field>
      </div>

      <Field label="Descripción" hint="Lo ve el tenant al asignar el rol">
        <Textarea rows={2} value={descripcion} onChange={e => setDescripcion(e.target.value)}
          placeholder="Para qué sirve este rol y qué alcance tiene." />
      </Field>

      <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
        (esAdmin || permisosBloqueados) ? 'bg-amber-500/10 border-amber-500/30' : 'bg-[#1a2230] border-white/6 hover:border-white/12'
      } ${permisosBloqueados ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}>
        <input type="checkbox" checked={esAdmin || permisosBloqueados} disabled={permisosBloqueados}
          onChange={e => setEsAdmin(e.target.checked)} className="accent-amber-500" />
        <div>
          <div className="text-[13px] font-semibold text-[#e8edf2] flex items-center gap-2">
            <Key size={13} className="text-amber-400" /> Acceso total
          </div>
          <div className="text-[11px] text-[#9ba8b6]">
            Todos los módulos, incluidos los que se agreguen en el futuro.
          </div>
        </div>
      </label>

      {!(esAdmin || permisosBloqueados) && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">
              Módulos — {permisos.length}/{TODOS_MODULOS.length}
            </span>
            <div className="flex gap-2">
              <Btn variant="ghost" size="sm" onClick={() => setPermisos(TODOS_MODULOS)}>Todos</Btn>
              <Btn variant="ghost" size="sm" onClick={() => setPermisos(['dashboard'])}>Ninguno</Btn>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {MODULOS_GRUPOS.map(grupo => {
              const ids = grupo.items.map(i => i.id)
              const activos = ids.filter(id => permisos.includes(id)).length
              const todos = activos === ids.length
              const alguno = activos > 0 && activos < ids.length
              return (
                <div key={grupo.grupo} className="bg-[#1a2230] rounded-xl overflow-hidden border border-white/6">
                  <button type="button"
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/3 transition-colors text-left"
                    onClick={() => toggleGrupo(grupo)}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: grupo.color + '22' }}>
                        {todos
                          ? <CheckSquare size={14} style={{ color: grupo.color }} />
                          : alguno
                            ? <div className="w-2.5 h-2.5 rounded-sm" style={{ background: grupo.color, opacity: 0.6 }} />
                            : <Square size={14} style={{ color: 'var(--text-muted)' }} />}
                      </div>
                      <span className="text-[12px] font-semibold" style={{ color: grupo.color }}>{grupo.grupo}</span>
                    </div>
                    <span className="text-[11px] text-[#5f6f80]">{activos}/{ids.length}</span>
                  </button>
                  <div className="px-4 pb-3 grid grid-cols-2 md:grid-cols-3 gap-1.5">
                    {grupo.items.map(mod => {
                      const activo = permisos.includes(mod.id)
                      return (
                        <label key={mod.id}
                          className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-all ${activo ? 'bg-white/4' : 'hover:bg-white/2'}`}>
                          <input type="checkbox" checked={activo} onChange={() => toggleModulo(mod.id)}
                            className="mt-0.5 shrink-0 accent-[#00c896]" />
                          <div>
                            <div className={`text-[12px] font-medium ${activo ? 'text-[#e8edf2]' : 'text-[#5f6f80]'}`}>{mod.label}</div>
                            <div className="text-[10px] text-[#5f6f80] leading-snug">{mod.desc}</div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Modal>
  )
}
