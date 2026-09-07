import { useState } from 'react'
import {
  Star, Mail, Phone, MessageSquare, Type, Megaphone, Settings,
  Twitter, Linkedin, Facebook, Instagram, Youtube, BarChart3,
  Plus, Edit2, Trash2, Save, Link2,
} from 'lucide-react'
import { PageHeader, Card, Field, Btn, Toggle, Input, Select, Textarea, Modal } from './ui'
import { uid, LANDING_INIT } from '../AdminSaaS/constants'

const SECTIONS = [
  { id:'sitio', label:'Sitio', icon: Settings },
  { id:'hero', label:'Sección Hero', icon: Megaphone },
  { id:'caracteristicas', label:'Características', icon: Star },
  { id:'contacto', label:'Contacto & Redes', icon: Mail },
  { id:'seo', label:'SEO & Footer', icon: BarChart3 },
]

/** Vista previa en vivo, inspirada en LandingPreview del mockup de referencia. */
function LandingPreview({ local }) {
  const color = local.sitio?.colorPrimario || '#355fd1'
  return (
    <aside className="overflow-hidden rounded-2xl border border-[#26314a] bg-[#0b1220] text-white shadow-lg sticky top-6">
      <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
        <span className="size-2 rounded-full bg-red-400" /><span className="size-2 rounded-full bg-amber-400" /><span className="size-2 rounded-full bg-emerald-400" />
        <span className="ml-2 text-[11px] text-white/50">Vista previa</span>
      </div>
      <div className="p-6" style={{ background: `linear-gradient(135deg, ${color}33, #0b1220 60%)` }}>
        <p className="text-[13px] font-bold">{local.sitio?.nombre || 'StockPro'}</p>
        <p className="mt-8 text-[22px] font-bold leading-tight">{local.hero?.titulo || '—'}</p>
        <p className="mt-3 text-[13px] leading-6 text-white/65">{local.hero?.subtitulo || ''}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-lg px-3 py-2 text-[12px] font-bold" style={{ background: color, color: '#fff' }}>{local.hero?.ctaTexto || 'Comenzar'}</span>
          {local.hero?.ctaTexto2 && <span className="rounded-lg border border-white/20 px-3 py-2 text-[12px] font-semibold">{local.hero.ctaTexto2}</span>}
        </div>
      </div>
    </aside>
  )
}

/** Landing CMS — misma lógica del panel clásico (deep-clone draft, guardado del objeto completo), restilizado. */
export default function TabLanding({ landing, guardarLanding, toast }) {
  const [section, setSection] = useState('sitio')
  const [local, setLocal]     = useState(() => JSON.parse(JSON.stringify(landing ?? LANDING_INIT)))
  const [featModal, setFeatModal] = useState(false)
  const [editFeat, setEditFeat]   = useState(null)
  const [featForm, setFeatForm]   = useState({})

  // Sincroniza `local` cuando `landing` llega de forma asíncrona (react-query)
  // después del primer render — setState durante el render (patrón oficial de
  // React para "ajustar estado cuando cambia una prop"), no en un efecto, para
  // no disparar un ciclo extra de render.
  const [syncedLanding, setSyncedLanding] = useState(landing)
  if (landing !== syncedLanding) {
    setSyncedLanding(landing)
    setLocal(JSON.parse(JSON.stringify(landing ?? LANDING_INIT)))
  }

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

  async function save() {
    const res = await guardarLanding.mutateAsync(local)
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Configuración de landing guardada', 'success')
  }

  function openNewFeat() { setEditFeat(null); setFeatForm({ icono:'⭐', titulo:'', descripcion:'' }); setFeatModal(true) }
  function openEditFeat(f) { setEditFeat(f); setFeatForm({ ...f }); setFeatModal(true) }
  function saveFeat() {
    if (!featForm.titulo?.trim()) { toast('El título es requerido', 'error'); return }
    if (editFeat) setLocal(p => ({ ...p, caracteristicas: p.caracteristicas.map(c => c.id === editFeat.id ? { ...featForm, id:editFeat.id } : c) }))
    else setLocal(p => ({ ...p, caracteristicas: [...p.caracteristicas, { ...featForm, id:`cf_${uid()}` }] }))
    setFeatModal(false)
  }
  function removeFeat(id) { setLocal(p => ({ ...p, caracteristicas: p.caracteristicas.filter(c => c.id !== id) })) }

  const lbl = (label, hint) => (
    <div className="mb-1.5">
      <label className="text-[12px] font-semibold text-[#3d4759] block">{label}</label>
      {hint && <p className="text-[11.5px] text-[#8893a3]">{hint}</p>}
    </div>
  )

  return (
    <div>
      <PageHeader breadcrumb="Landing CMS" title="Landing Page" description="Contenido público del sitio de marketing."
        actions={<Btn variant="primary" onClick={save}><Save size={14}/>Guardar todo</Btn>} />

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
        <div>
          <div className="flex gap-1 border-b border-[#eef1f6] mb-5 overflow-x-auto">
            {SECTIONS.map(s => {
              const Icon = s.icon; const active = section === s.id
              return (
                <button key={s.id} onClick={() => setSection(s.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 text-[13px] font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${active ? 'text-[#355fd1] border-[#355fd1]' : 'text-[#8893a3] border-transparent hover:text-[#172033]'}`}>
                  <Icon size={13}/>{s.label}
                </button>
              )
            })}
          </div>

          {section === 'sitio' && (
            <Card>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">{lbl('Nombre del producto / marca')}<Input value={local.sitio?.nombre||''} onChange={e => set('sitio.nombre',e.target.value)} placeholder="StockPro" /></div>
                <div className="col-span-2">{lbl('Tagline', 'Frase corta descriptiva')}<Input value={local.sitio?.tagline||''} onChange={e => set('sitio.tagline',e.target.value)} placeholder="Logística inteligente para tu empresa" /></div>
                <div className="col-span-2">{lbl('Descripción', 'Texto descriptivo completo del producto')}<Textarea rows={3} value={local.sitio?.descripcion||''} onChange={e => set('sitio.descripcion',e.target.value)} /></div>
                <div>{lbl('Color primario')}<div className="flex items-center gap-2"><input type="color" value={local.sitio?.colorPrimario||'#355fd1'} onChange={e => set('sitio.colorPrimario',e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-[#dfe4ec]" /><Input className="flex-1" value={local.sitio?.colorPrimario||''} onChange={e => set('sitio.colorPrimario',e.target.value)} /></div></div>
                <div>{lbl('URL del logo')}<div className="relative"><Link2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa3b2]" /><Input className="pl-8" value={local.sitio?.logoUrl||''} onChange={e => set('sitio.logoUrl',e.target.value)} placeholder="https://…" /></div></div>
              </div>
            </Card>
          )}

          {section === 'hero' && (
            <Card>
              <div className="space-y-4">
                <div>{lbl('Título principal')}<Input value={local.hero?.titulo||''} onChange={e => set('hero.titulo',e.target.value)} placeholder="Controla tu logística con precisión" /></div>
                <div>{lbl('Subtítulo')}<Textarea rows={2} value={local.hero?.subtitulo||''} onChange={e => set('hero.subtitulo',e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div>{lbl('CTA principal — texto')}<Input value={local.hero?.ctaTexto||''} onChange={e => set('hero.ctaTexto',e.target.value)} placeholder="Comenzar prueba gratis" /></div>
                  <div>{lbl('CTA principal — URL')}<Input value={local.hero?.ctaUrl||''} onChange={e => set('hero.ctaUrl',e.target.value)} placeholder="#planes" /></div>
                  <div>{lbl('CTA secundario — texto')}<Input value={local.hero?.ctaTexto2||''} onChange={e => set('hero.ctaTexto2',e.target.value)} placeholder="Ver demo en vivo" /></div>
                  <div>{lbl('CTA secundario — URL')}<Input value={local.hero?.ctaUrl2||''} onChange={e => set('hero.ctaUrl2',e.target.value)} placeholder="#demo" /></div>
                </div>
                <div>{lbl('URL de imagen hero')}<Input value={local.hero?.imagenUrl||''} onChange={e => set('hero.imagenUrl',e.target.value)} placeholder="https://…/hero.png" /></div>
              </div>
            </Card>
          )}

          {section === 'caracteristicas' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[12.5px] text-[#8893a3]">Funcionalidades destacadas que aparecerán en el sitio web</p>
                <Btn variant="primary" size="sm" onClick={openNewFeat}><Plus size={13}/>Agregar</Btn>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(local.caracteristicas||[]).map(c => (
                  <Card key={c.id} className="!p-4 flex gap-3 group">
                    <div className="text-2xl shrink-0">{c.icono}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[13px] text-[#172033] mb-0.5">{c.titulo}</div>
                      <div className="text-[12px] text-[#8893a3] line-clamp-2">{c.descripcion}</div>
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Btn variant="ghost" size="icon" onClick={() => openEditFeat(c)}><Edit2 size={12}/></Btn>
                      <Btn variant="danger" size="icon" onClick={() => removeFeat(c.id)}><Trash2 size={12}/></Btn>
                    </div>
                  </Card>
                ))}
              </div>

              <Modal open={featModal} onClose={() => setFeatModal(false)} title={editFeat ? 'Editar característica' : 'Nueva característica'} size="sm"
                footer={<><Btn variant="secondary" onClick={() => setFeatModal(false)}>Cancelar</Btn><Btn variant="primary" onClick={saveFeat}><Save size={14}/>Guardar</Btn></>}>
                <div className="space-y-3">
                  <Field label="Ícono (emoji)"><Input value={featForm.icono||''} onChange={e => setFeatForm(p=>({...p,icono:e.target.value}))} placeholder="📦" /></Field>
                  <Field label="Título *"><Input value={featForm.titulo||''} onChange={e => setFeatForm(p=>({...p,titulo:e.target.value}))} /></Field>
                  <Field label="Descripción"><Textarea rows={2} value={featForm.descripcion||''} onChange={e => setFeatForm(p=>({...p,descripcion:e.target.value}))} /></Field>
                </div>
              </Modal>
            </div>
          )}

          {section === 'contacto' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <h3 className="text-[13px] font-bold uppercase tracking-[0.06em] text-[#687386] mb-4">Información de contacto</h3>
                <div className="space-y-3">
                  {[
                    { key:'email', icon:<Mail size={13}/>, placeholder:'ventas@empresa.com' },
                    { key:'telefono', icon:<Phone size={13}/>, placeholder:'+51 1 234 5678' },
                    { key:'whatsapp', icon:<MessageSquare size={13}/>, placeholder:'+51 999 000 111' },
                    { key:'direccion', icon:<Type size={13}/>, placeholder:'Lima, Perú' },
                  ].map(f => (
                    <div key={f.key}>
                      {lbl(f.key.charAt(0).toUpperCase()+f.key.slice(1))}
                      <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa3b2]">{f.icon}</span><Input className="pl-8" value={local.contacto?.[f.key]||''} onChange={e => set(`contacto.${f.key}`,e.target.value)} placeholder={f.placeholder} /></div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-[#eef1f6]">
                    {lbl('Email de soporte (uso interno)', 'No se publica en el sitio web.')}
                    <div className="relative"><Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa3b2]" /><Input className="pl-8" value={local.contacto?.emailSoporte||''} onChange={e => set('contacto.emailSoporte',e.target.value)} placeholder="soporte@tudominio.com" /></div>
                  </div>
                </div>
              </Card>
              <Card>
                <h3 className="text-[13px] font-bold uppercase tracking-[0.06em] text-[#687386] mb-4">Redes sociales</h3>
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
                      <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa3b2]">{r.icon}</span><Input className="pl-8" value={local.redesSociales?.[r.key]||''} onChange={e => set(`redesSociales.${r.key}`,e.target.value)} placeholder="https://…" /></div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {section === 'seo' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <h3 className="text-[13px] font-bold uppercase tracking-[0.06em] text-[#687386] mb-4">SEO y metadatos</h3>
                <div className="space-y-3">
                  {lbl('Meta título', 'Aparece en la pestaña del navegador y en Google')}
                  <Input value={local.seo?.titulo||''} onChange={e => set('seo.titulo',e.target.value)} />
                  {lbl('Meta descripción', 'Texto bajo el título en resultados de búsqueda (160 chars)')}
                  <Textarea rows={3} value={local.seo?.descripcion||''} onChange={e => set('seo.descripcion',e.target.value)} />
                  <div className="text-[11px] text-[#8893a3] text-right">{(local.seo?.descripcion||'').length}/160</div>
                  {lbl('Keywords', 'Separadas por coma')}
                  <Textarea rows={2} value={local.seo?.keywords||''} onChange={e => set('seo.keywords',e.target.value)} />
                </div>
              </Card>
              <Card>
                <h3 className="text-[13px] font-bold uppercase tracking-[0.06em] text-[#687386] mb-4">Footer y configuración general</h3>
                <div className="space-y-3">
                  {lbl('Texto legal del footer')}
                  <Textarea rows={2} value={local.footer?.textoLegal||''} onChange={e => set('footer.textoLegal',e.target.value)} />
                  <div className="flex items-center justify-between py-1">
                    <div><div className="text-[13px] text-[#172033]">Mostrar precios públicamente</div><div className="text-[11.5px] text-[#8893a3]">Tabla de precios visible en el sitio</div></div>
                    <Toggle value={!!local.footer?.mostrarPrecios} onChange={v => set('footer.mostrarPrecios',v)} />
                  </div>
                  {lbl('Moneda pública')}
                  <Select value={local.footer?.moneda||'USD'} onChange={e => set('footer.moneda',e.target.value)}><option>USD</option><option>PEN</option><option>EUR</option></Select>
                  {lbl('Días de prueba gratuita')}
                  <Input type="number" min="0" value={local.footer?.probarGratisDias||14} onChange={e => set('footer.probarGratisDias',parseInt(e.target.value)||0)} />
                </div>
              </Card>
            </div>
          )}
        </div>

        <LandingPreview local={local} />
      </div>
    </div>
  )
}
