import { useState, useEffect } from 'react'
import {
  Star, Mail, Phone, MessageSquare, Type, Megaphone, Settings,
  Twitter, Linkedin, Facebook, Instagram, Youtube, BarChart3,
  Plus, Edit2, Trash2, Save, Link2,
} from 'lucide-react'
import {
  Modal, Field, Card, CardHeader, Btn, Toggle, Input, Select, Textarea,
} from '../../components/ui/index'
import { uid, LANDING_INIT } from './constants'

// ══════════════════════════════════════════════════════════
// TAB: LANDING PAGE CONFIG
// ══════════════════════════════════════════════════════════
export default function TabLanding({ landing, guardarLanding, planes, toast }) {
  const [section, setSection] = useState('sitio')
  const [local, setLocal]     = useState(() => JSON.parse(JSON.stringify(landing ?? LANDING_INIT)))
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

  useEffect(() => {
    if (landing) setLocal(JSON.parse(JSON.stringify(landing)))
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
