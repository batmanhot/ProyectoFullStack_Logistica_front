import { useState, useEffect } from 'react'
import {
  Star, Mail, Phone, MessageSquare, Type, Megaphone, Settings,
  Twitter, Linkedin, Facebook, Instagram, Youtube, BarChart3,
  Plus, Edit2, Trash2, Save, Link2, Quote, Activity, Building2,
} from 'lucide-react'
import {
  Modal, Field, Card, CardHeader, Btn, Toggle, Input, Select, Textarea,
} from '../../components/ui/index'
import { uid, LANDING_INIT } from './constants'

// ══════════════════════════════════════════════════════════
// TAB: LANDING PAGE CONFIG
// ══════════════════════════════════════════════════════════
export default function TabLanding({ landing, guardarLanding, toast }) {
  const [section, setSection] = useState('sitio')
  const [local, setLocal]     = useState(() => structuredClone(landing ?? LANDING_INIT))
  const [featModal, setFeatModal] = useState(false)
  const [editFeat, setEditFeat]   = useState(null)
  const [featForm, setFeatForm]   = useState({})
  const [testiModal, setTestiModal] = useState(false)
  const [editTesti, setEditTesti]   = useState(null)
  const [testiForm, setTestiForm]   = useState({})
  const [statModal, setStatModal] = useState(false)
  const [editStat, setEditStat]   = useState(null)
  const [statForm, setStatForm]   = useState({})

  const set = (path, value) => {
    setLocal(prev => {
      const copy = structuredClone(prev)
      const keys = path.split('.')
      let obj = copy
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]]
      obj[keys[keys.length - 1]] = value
      return copy
    })
  }

  // Re-sincroniza el borrador cuando el servidor devuelve una versión nueva
  // (p. ej. tras guardar). Sync deliberado de prop→estado editable.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (landing) setLocal(structuredClone(landing))
  }, [landing])

  async function save() {
    const res = await guardarLanding.mutateAsync(local)
    if (res?.error) { toast(res.error, 'error'); return }
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

  function openNewTesti() { setEditTesti(null); setTestiForm({ nombre:'', cargo:'', empresa:'', texto:'', rating:5, avatar:'' }); setTestiModal(true) }
  function openEditTesti(t) { setEditTesti(t); setTestiForm({ ...t }); setTestiModal(true) }
  function saveTesti() {
    if (!testiForm.nombre?.trim() || !testiForm.texto?.trim()) { toast('Nombre y testimonio son requeridos', 'error'); return }
    const avatar = testiForm.avatar?.trim() || testiForm.nombre.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
    const testimonios = local.testimonios || []
    if (editTesti) {
      setLocal(p => ({ ...p, testimonios: testimonios.map(t => t.id === editTesti.id ? { ...testiForm, avatar, id: editTesti.id } : t) }))
    } else {
      setLocal(p => ({ ...p, testimonios: [...testimonios, { ...testiForm, avatar, id: `ts_${uid()}` }] }))
    }
    setTestiModal(false)
  }
  function removeTesti(id) { setLocal(p => ({ ...p, testimonios: (p.testimonios || []).filter(t => t.id !== id) })) }

  function openNewStat() { setEditStat(null); setStatForm({ icono:'📈', valor:'', label:'' }); setStatModal(true) }
  function openEditStat(s) { setEditStat(s); setStatForm({ ...s }); setStatModal(true) }
  function saveStat() {
    if (!statForm.valor?.trim() || !statForm.label?.trim()) { toast('Valor y descripción son requeridos', 'error'); return }
    const stats = local.stats || []
    if (editStat) {
      setLocal(p => ({ ...p, stats: stats.map(s => s.id === editStat.id ? { ...statForm, id: editStat.id } : s) }))
    } else {
      setLocal(p => ({ ...p, stats: [...stats, { ...statForm, id: `st_${uid()}` }] }))
    }
    setStatModal(false)
  }
  function removeStat(id) { setLocal(p => ({ ...p, stats: (p.stats || []).filter(s => s.id !== id) })) }

  const lbl = (label, hint) => (
    <div>
      <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide block mb-1">{label}</label>
      {hint && <p className="text-[11px] text-[var(--text-muted)] mb-1.5">{hint}</p>}
    </div>
  )

  const SECTIONS = [
    { id:'sitio', label:'Sitio', icon: Settings },
    { id:'hero', label:'Sección Hero', icon: Megaphone },
    { id:'caracteristicas', label:'Características', icon: Star },
    { id:'testimonios', label:'Testimonios', icon: Quote },
    { id:'stats', label:'Métricas', icon: Activity },
    { id:'onPremise', label:'On-Premise', icon: Building2 },
    { id:'contacto', label:'Contacto & Redes', icon: Mail },
    { id:'seo', label:'SEO & Footer', icon: BarChart3 },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end">
        <Btn variant="primary" onClick={save}><Save size={14}/>Guardar todo</Btn>
      </div>

      {/* Sub-nav */}
      <div className="flex gap-1 border-b border-[var(--border)] pb-0">
        {SECTIONS.map(s => {
          const Icon = s.icon
          const active = section === s.id
          return (
            <button key={s.id} onClick={() => setSection(s.id)}
              className={`flex items-center gap-2 px-3 py-2 text-[12px] font-medium rounded-t border-b-2 -mb-px transition-colors ${active ? 'text-[var(--accent)] border-[var(--accent)]' : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-primary)]'}`}>
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
              <Input value={local.sitio?.nombre||''} onChange={e => set('sitio.nombre',e.target.value)} placeholder="StockPro" />
            </div>
            <div className="col-span-2">
              {lbl('Tagline', 'Frase corta descriptiva')}
              <Input value={local.sitio?.tagline||''} onChange={e => set('sitio.tagline',e.target.value)} placeholder="Logística inteligente para tu empresa" />
            </div>
            <div className="col-span-2">
              {lbl('Descripción', 'Texto descriptivo completo del producto')}
              <Textarea rows={3} value={local.sitio?.descripcion||''} onChange={e => set('sitio.descripcion',e.target.value)} />
            </div>
            <div>
              {lbl('Color primario')}
              <div className="flex items-center gap-2">
                <input type="color" value={local.sitio?.colorPrimario||'#00c896'} onChange={e => set('sitio.colorPrimario',e.target.value)} className="w-10 h-9 rounded cursor-pointer bg-transparent border border-[var(--border)]" />
                <Input className="flex-1" value={local.sitio?.colorPrimario||''} onChange={e => set('sitio.colorPrimario',e.target.value)} />
              </div>
            </div>
            <div>
              {lbl('URL del logo')}
              <div className="flex items-center gap-2">
                <Link2 size={13} className="text-[var(--text-muted)] shrink-0" />
                <Input value={local.sitio?.logoUrl||''} onChange={e => set('sitio.logoUrl',e.target.value)} placeholder="https://…" />
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
            <Input value={local.hero?.titulo||''} onChange={e => set('hero.titulo',e.target.value)} placeholder="Controla tu logística con precisión" />
            {lbl('Subtítulo')}
            <Textarea rows={2} value={local.hero?.subtitulo||''} onChange={e => set('hero.subtitulo',e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              {lbl('CTA principal — texto')}
              <Input value={local.hero?.ctaTexto||''} onChange={e => set('hero.ctaTexto',e.target.value)} placeholder="Comenzar prueba gratis" />
              {lbl('CTA principal — URL')}
              <Input value={local.hero?.ctaUrl||''} onChange={e => set('hero.ctaUrl',e.target.value)} placeholder="#planes" />
              {lbl('CTA secundario — texto')}
              <Input value={local.hero?.ctaTexto2||''} onChange={e => set('hero.ctaTexto2',e.target.value)} placeholder="Ver demo en vivo" />
              {lbl('CTA secundario — URL')}
              <Input value={local.hero?.ctaUrl2||''} onChange={e => set('hero.ctaUrl2',e.target.value)} placeholder="#demo" />
            </div>
            {lbl('URL de imagen hero')}
            <Input value={local.hero?.imagenUrl||''} onChange={e => set('hero.imagenUrl',e.target.value)} placeholder="https://…/hero.png" />
            {local.hero?.imagenUrl && (
              <div className="rounded-xl overflow-hidden border border-[var(--border)] max-h-40">
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
            <p className="text-[12px] text-[var(--text-muted)]">Funcionalidades destacadas que aparecerán en el sitio web</p>
            <Btn variant="primary" size="sm" onClick={openNewFeat}><Plus size={13}/>Agregar</Btn>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(local.caracteristicas||[]).map(c => (
              <div key={c.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 flex gap-3 group">
                <div className="text-2xl shrink-0">{c.icono}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[13px] text-[var(--text-primary)] mb-0.5">{c.titulo}</div>
                  <div className="text-[12px] text-[var(--text-muted)] line-clamp-2">{c.descripcion}</div>
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
                <Input value={featForm.icono||''} onChange={e => setFeatForm(p=>({...p,icono:e.target.value}))} placeholder="📦" />
              </Field>
              <Field label="Título *">
                <Input value={featForm.titulo||''} onChange={e => setFeatForm(p=>({...p,titulo:e.target.value}))} />
              </Field>
              <Field label="Descripción">
                <Textarea rows={2} value={featForm.descripcion||''} onChange={e => setFeatForm(p=>({...p,descripcion:e.target.value}))} />
              </Field>
            </div>
          </Modal>
        </div>
      )}

      {/* TESTIMONIOS */}
      {section === 'testimonios' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[12px] text-[var(--text-muted)]">
              Casos de éxito reales que aparecen en "Empresas que ya transformaron su operación". Si no hay ninguno cargado, esa sección no se muestra en el sitio — nunca se rellena con ejemplos inventados.
            </p>
            <Btn variant="primary" size="sm" onClick={openNewTesti}><Plus size={13}/>Agregar</Btn>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(local.testimonios||[]).map(t => (
              <div key={t.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 flex flex-col gap-2 group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-[11px] font-bold flex items-center justify-center shrink-0">{t.avatar}</div>
                    <div className="min-w-0">
                      <div className="font-semibold text-[12px] text-[var(--text-primary)] truncate">{t.nombre}</div>
                      <div className="text-[11px] text-[var(--text-muted)] truncate">{t.cargo} · {t.empresa}</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Btn variant="ghost" size="icon" onClick={() => openEditTesti(t)}><Edit2 size={12}/></Btn>
                    <Btn variant="danger" size="icon" onClick={() => removeTesti(t.id)}><Trash2 size={12}/></Btn>
                  </div>
                </div>
                <div className="text-[11px] text-amber-400">{'★'.repeat(t.rating||5)}{'☆'.repeat(5-(t.rating||5))}</div>
                <div className="text-[12px] text-[var(--text-muted)] line-clamp-3">"{t.texto}"</div>
              </div>
            ))}
            {(local.testimonios||[]).length === 0 && (
              <p className="text-[12px] text-[var(--text-muted)] italic col-span-full py-6 text-center">Sin testimonios cargados — la sección está oculta en el sitio público.</p>
            )}
          </div>

          <Modal open={testiModal} onClose={() => setTestiModal(false)} title={editTesti ? 'Editar testimonio' : 'Nuevo testimonio'} size="sm"
            footer={<>
              <Btn variant="secondary" onClick={() => setTestiModal(false)}>Cancelar</Btn>
              <Btn variant="primary" onClick={saveTesti}><Save size={14}/>Guardar</Btn>
            </>}>
            <div className="space-y-3">
              <Field label="Nombre *">
                <Input value={testiForm.nombre||''} onChange={e => setTestiForm(p=>({...p,nombre:e.target.value}))} placeholder="Nombre y apellido" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cargo">
                  <Input value={testiForm.cargo||''} onChange={e => setTestiForm(p=>({...p,cargo:e.target.value}))} placeholder="Gerente de Operaciones" />
                </Field>
                <Field label="Empresa">
                  <Input value={testiForm.empresa||''} onChange={e => setTestiForm(p=>({...p,empresa:e.target.value}))} placeholder="Nombre de la empresa" />
                </Field>
              </div>
              <Field label="Testimonio *">
                <Textarea rows={3} value={testiForm.texto||''} onChange={e => setTestiForm(p=>({...p,texto:e.target.value}))} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Valoración (1-5)">
                  <Select value={testiForm.rating||5} onChange={e => setTestiForm(p=>({...p,rating:parseInt(e.target.value)}))}>
                    {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} ★</option>)}
                  </Select>
                </Field>
                <Field label="Iniciales (avatar)" hint="Se generan solas si lo dejas vacío">
                  <Input value={testiForm.avatar||''} onChange={e => setTestiForm(p=>({...p,avatar:e.target.value.toUpperCase().slice(0,2)}))} placeholder="Ej: CM" />
                </Field>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {/* MÉTRICAS / STATS */}
      {section === 'stats' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[12px] text-[var(--text-muted)]">
              Cifras de confianza que aparecen justo debajo del Hero (ej. empresas activas, uptime). Si no hay ninguna cargada, esa barra no se muestra — nunca se rellena con cifras inventadas.
            </p>
            <Btn variant="primary" size="sm" onClick={openNewStat}><Plus size={13}/>Agregar</Btn>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(local.stats||[]).map(s => (
              <div key={s.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-3 group">
                <div className="text-2xl shrink-0">{s.icono}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[16px] text-[var(--text-primary)]">{s.valor}</div>
                  <div className="text-[11px] text-[var(--text-muted)] truncate">{s.label}</div>
                </div>
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Btn variant="ghost" size="icon" onClick={() => openEditStat(s)}><Edit2 size={12}/></Btn>
                  <Btn variant="danger" size="icon" onClick={() => removeStat(s.id)}><Trash2 size={12}/></Btn>
                </div>
              </div>
            ))}
            {(local.stats||[]).length === 0 && (
              <p className="text-[12px] text-[var(--text-muted)] italic col-span-full py-6 text-center">Sin métricas cargadas — la barra está oculta en el sitio público.</p>
            )}
          </div>

          <Modal open={statModal} onClose={() => setStatModal(false)} title={editStat ? 'Editar métrica' : 'Nueva métrica'} size="sm"
            footer={<>
              <Btn variant="secondary" onClick={() => setStatModal(false)}>Cancelar</Btn>
              <Btn variant="primary" onClick={saveStat}><Save size={14}/>Guardar</Btn>
            </>}>
            <div className="space-y-3">
              <Field label="Ícono (emoji)">
                <Input value={statForm.icono||''} onChange={e => setStatForm(p=>({...p,icono:e.target.value}))} placeholder="🏢" />
              </Field>
              <Field label="Valor *" hint="El número o cifra grande, ej. 500+, 99.9%">
                <Input value={statForm.valor||''} onChange={e => setStatForm(p=>({...p,valor:e.target.value}))} placeholder="500+" />
              </Field>
              <Field label="Descripción *">
                <Input value={statForm.label||''} onChange={e => setStatForm(p=>({...p,label:e.target.value}))} placeholder="Empresas activas" />
              </Field>
            </div>
          </Modal>
        </div>
      )}

      {/* ON-PREMISE */}
      {section === 'onPremise' && (
        <Card>
          <CardHeader title="Tarjeta de On-Premise en Planes y Precios" />
          <p className="text-[12px] text-[var(--text-muted)] mb-4">
            Opción de despliegue sin precio fijo — se cotiza según el tipo de negocio. Se muestra como tarjeta aparte, debajo de los planes cloud, con un botón que lleva a Contacto.
          </p>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] text-[var(--text-primary)]">Mostrar en Planes y Precios</div>
                <div className="text-[11px] text-[var(--text-muted)]">Si está apagado, la tarjeta no aparece en el sitio</div>
              </div>
              <Toggle value={!!local.onPremise?.activo} onChange={v => set('onPremise.activo', v)} />
            </div>
            {lbl('Nombre')}
            <Input value={local.onPremise?.nombre||''} onChange={e => set('onPremise.nombre', e.target.value)} placeholder="On-Premise" />
            {lbl('Descripción')}
            <Textarea rows={2} value={local.onPremise?.descripcion||''} onChange={e => set('onPremise.descripcion', e.target.value)} />
            {lbl('Características', 'Una por línea')}
            <Textarea rows={4}
              value={(local.onPremise?.caracteristicas||[]).join('\n')}
              onChange={e => set('onPremise.caracteristicas', e.target.value.split('\n'))}
              onBlur={e => set('onPremise.caracteristicas', e.target.value.split('\n').map(s=>s.trim()).filter(Boolean))}
            />
            {lbl('Texto del botón')}
            <Input value={local.onPremise?.ctaTexto||''} onChange={e => set('onPremise.ctaTexto', e.target.value)} placeholder="Conversemos" />
          </div>
        </Card>
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
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">{f.icon}</span>
                    <Input className="pl-8" value={local.contacto?.[f.key]||''} onChange={e => set(`contacto.${f.key}`,e.target.value)} placeholder={f.placeholder} />
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-[var(--border)]">
                {lbl('Email de soporte (uso interno)', 'No se publica en el sitio web. Es el contacto técnico que usa el sistema — por ejemplo, ante Google/Mozilla si detectan mal uso del envío de notificaciones push.')}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"><Mail size={13}/></span>
                  <Input className="pl-8" value={local.contacto?.emailSoporte||''} onChange={e => set('contacto.emailSoporte',e.target.value)} placeholder="soporte@tudominio.com" />
                </div>
              </div>
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
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">{r.icon}</span>
                    <Input className="pl-8" value={local.redesSociales?.[r.key]||''} onChange={e => set(`redesSociales.${r.key}`,e.target.value)} placeholder="https://…" />
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
              <Input value={local.seo?.titulo||''} onChange={e => set('seo.titulo',e.target.value)} />
              {lbl('Meta descripción', 'Texto que aparece bajo el título en los resultados de búsqueda (160 chars)')}
              <Textarea rows={3} value={local.seo?.descripcion||''} onChange={e => set('seo.descripcion',e.target.value)} />
              <div className="text-[11px] text-[var(--text-muted)] text-right">{(local.seo?.descripcion||'').length}/160</div>
              {lbl('Keywords', 'Separadas por coma')}
              <Textarea rows={2} value={local.seo?.keywords||''} onChange={e => set('seo.keywords',e.target.value)} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Footer y configuración general" />
            <div className="space-y-3">
              {lbl('Texto legal del footer')}
              <Textarea rows={2} value={local.footer?.textoLegal||''} onChange={e => set('footer.textoLegal',e.target.value)} />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] text-[var(--text-primary)]">Mostrar precios públicamente</div>
                  <div className="text-[11px] text-[var(--text-muted)]">Tabla de precios visible en el sitio</div>
                </div>
                <Toggle value={!!local.footer?.mostrarPrecios} onChange={v => set('footer.mostrarPrecios',v)} />
              </div>
              {lbl('Moneda pública')}
              <Select value={local.footer?.moneda||'USD'} onChange={e => set('footer.moneda',e.target.value)}>
                <option>USD</option><option>PEN</option><option>EUR</option>
              </Select>
              {lbl('Días de prueba gratuita')}
              <Input type="number" min="0" value={local.footer?.probarGratisDias||14} onChange={e => set('footer.probarGratisDias',parseInt(e.target.value)||0)} />
            </div>
          </Card>
        </div>
      )}

      <div className="flex justify-end pt-2 border-t border-[var(--border)]">
        <Btn variant="primary" onClick={save}><Save size={14}/>Guardar configuración de landing</Btn>
      </div>
    </div>
  )
}
