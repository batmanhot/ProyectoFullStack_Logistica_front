import { useMemo, useState } from 'react'
import {
  ShieldCheck, Plus, Edit2, Trash2, Lock, Key, CheckSquare, Square, Users, Building2, AlertTriangle,
} from 'lucide-react'
import {
  Modal, ConfirmDialog, EmptyState, Badge, Btn, Field, Input, Textarea,
} from '../../components/ui/index'
import { MODULOS_GRUPOS, TODOS_MODULOS } from '../Usuarios/constants'
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
  const catalogo = useMemo(() => roles.filter(r => !r.protegido), [roles])

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
    <div className="space-y-7 max-w-4xl">
      {/* ── Roles de gobierno ─────────────────────────────── */}
      <section className="space-y-3">
        <div>
          <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Roles de gobierno</h3>
          <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
            Propietario y Administrador del negocio. Su <b>acceso total</b> es intocable y se
            asignan desde <b>Negocios</b>, no aquí — solo puedes ajustar el nombre y la descripción
            que ven los negocios.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {gobierno.map(rol => {
            const uso = rol.enUso || { usuarios: 0, negocios: 0 }
            return (
              <div key={rol.id} className="flex items-start gap-3 bg-[#161d28] border border-blue-500/20 rounded-xl px-4 py-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Lock size={15} className="text-blue-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-[var(--text-primary)] truncate">{rol.label}</span>
                    <code className="text-[11px] text-[var(--text-muted)] bg-white/5 px-1.5 py-0.5 rounded">{rol.codigo}</code>
                  </div>
                  {rol.descripcion && (
                    <div className="text-[12px] text-[var(--text-muted)] mt-0.5">{rol.descripcion}</div>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[var(--text-muted)]">
                    <span className="inline-flex items-center gap-1"><Key size={12} className="text-amber-400" /> Acceso total</span>
                    <span className="inline-flex items-center gap-1"><Building2 size={12} /> {uso.negocios} negocio{uso.negocios === 1 ? '' : 's'}</span>
                  </div>
                </div>
                <Btn variant="ghost" size="sm" className="shrink-0" onClick={() => setEditor({ modo: 'editar', rol })}>
                  <Edit2 size={13} /> Nombre
                </Btn>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Plantillas del catálogo ───────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[13px] font-semibold text-[var(--text-primary)]">Plantillas del catálogo</h3>
            <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
              Las hereda todo negocio. El tenant las asigna tal cual o las <b>duplica como rol
              propio</b> para ajustarlas — nunca edita estas.
            </p>
          </div>
          <Btn variant="primary" size="sm" className="shrink-0" onClick={() => setEditor({ modo: 'nuevo' })}>
            <Plus size={13} /> Crear rol
          </Btn>
        </div>

        {isLoading ? (
          <div className="text-[13px] text-[var(--text-muted)] px-1">Cargando catálogo…</div>
        ) : catalogo.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="Sin plantillas" description="Crea la primera plantilla de rol del sistema." />
        ) : (
          <div className="grid gap-3">
            {catalogo.map(rol => {
              const mods = permisosDeRol(rol)
              const uso = rol.enUso || { usuarios: 0, negocios: 0 }
              return (
                <div key={rol.id} className="flex items-start gap-3 bg-[#161d28] border border-white/8 rounded-xl px-4 py-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center shrink-0">
                    <ShieldCheck size={16} className="text-[var(--accent)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-[var(--text-primary)] truncate">{rol.label}</span>
                      <code className="text-[11px] text-[var(--text-muted)] bg-white/5 px-1.5 py-0.5 rounded">{rol.codigo}</code>
                      <Badge variant={esAccesoTotal(mods) ? 'warning' : 'neutral'}>{resumenPermisos(mods)}</Badge>
                    </div>
                    {rol.descripcion && (
                      <div className="text-[12px] text-[var(--text-muted)] mt-0.5">{rol.descripcion}</div>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[var(--text-muted)]">
                      <span className="inline-flex items-center gap-1"><Users size={12} /> {uso.usuarios} usuario{uso.usuarios === 1 ? '' : 's'}</span>
                      <span className="inline-flex items-center gap-1"><Building2 size={12} /> {uso.negocios} negocio{uso.negocios === 1 ? '' : 's'}</span>
                    </div>
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
              )
            })}
          </div>
        )}
      </section>

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

  // permisos bloqueados: los roles de gobierno siempre son acceso total.
  const permisosBloqueados = protegido

  function toggleModulo(id) {
    if (permisosBloqueados) return
    setPermisos(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]))
  }
  function toggleGrupo(grupo) {
    if (permisosBloqueados) return
    const ids = grupo.items.map(i => i.id)
    setPermisos(p => (ids.every(id => p.includes(id)) ? p.filter(x => !ids.includes(x)) : [...new Set([...p, ...ids])]))
  }

  const sinModulos = !protegido && !esAdmin && permisos.length === 0

  function submit() {
    if (!label.trim() || sinModulos) return
    if (!esEditar && !CODIGO_RE.test(codigo)) { setErrCodigo('Solo minúsculas, números y guiones'); return }

    const payload = { label: label.trim(), descripcion: descripcion.trim() || undefined }
    if (!esEditar) payload.codigo = codigo
    // A un rol de gobierno nunca le mandamos `permisos` (el backend lo rechaza);
    // su acceso total ya está fijado.
    if (!protegido) payload.permisos = esAdmin ? ['*'] : permisos
    onGuardar(payload)
  }

  return (
    <Modal
      open onClose={onClose} size="lg"
      title={!esEditar ? 'Nuevo rol del sistema'
        : protegido ? `Nombre y descripción: ${rol.label}`
        : `Editar rol: ${rol.label}`}
      footer={<>
        <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" disabled={!label.trim() || sinModulos || guardando} onClick={submit}>
          <ShieldCheck size={13} /> {esEditar ? 'Guardar cambios' : 'Crear rol'}
        </Btn>
      </>}
    >
      {protegido && (
        <div className="flex items-start gap-2 px-4 py-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-[12px] text-blue-300">
          <Lock size={13} className="mt-0.5 shrink-0" />
          <span>
            <b>{rol.label}</b> es un rol de gobierno de la plataforma. Su acceso total es intocable y su
            código está reservado — solo puedes ajustar el nombre y la descripción que ven los negocios.
          </span>
        </div>
      )}

      {esEditar && enUso > 0 && !protegido && (
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
        (esAdmin || protegido) ? 'bg-amber-500/10 border-amber-500/30' : 'bg-[#1a2230] border-white/6 hover:border-white/12'
      } ${permisosBloqueados ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}>
        <input type="checkbox" checked={esAdmin || protegido} disabled={permisosBloqueados}
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

      {!(esAdmin || protegido) && (
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
