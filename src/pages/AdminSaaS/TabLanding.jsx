import { useState, useEffect } from 'react'
import {
  Star, Mail, Phone, MessageSquare, Type, Megaphone, Settings,
  Twitter, Linkedin, Facebook, Instagram, Youtube, BarChart3,
  Plus, Edit2, Trash2, Save, Link2,
} from 'lucide-react'
import {
  Modal, Field, Card, CardHeader, Btn, Toggle,
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

  const inp = 'w-full px-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[13px] text-[#e8edf2] placeholder-[#5f6f80] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20'
  const lbl = (label, hint) => (
    <div>
      <label className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-wide block mb-1">{label}</label>
      {hint && <p className="text-[11px] text-[#5f6f80] mb-1.5">{hint}</p>}
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-[#e8edf2]">Configuración del Sitio Web / Landing Page</h2>
          <p className="text-[12px] text-[#5f6f80] mt-0.5">Esta información se usará para publicar y promocionar el sistema</p>
        </div>
        <Btn variant="primary" onClick={save}><Save size={14}/>Guardar todo</Btn>
      </div>

      {/* Sub-nav */}
      <div className="flex gap-1 border-b border-white/6 pb-0">
        {SECTIONS.map(s => {
          const Icon = s.icon
          const active = section === s.id
          return (
            <button key={s.id} onClick={() => setSection(s.id)}
              className={`flex items-center gap-2 px-3 py-2 text-[12px] font-medium rounded-t border-b-2 -mb-px transition-colors ${active ? 'text-[#00c896] border-[#00c896]' : 'text-[#5f6f80] border-transparent hover:text-[#e8edf2]'}`}>
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
              <input className={inp} value={local.sitio?.nombre||''} onChange={e => set('sitio.nombre',e.target.value)} placeholder="StockPro" />
            </div>
            <div className="col-span-2">
              {lbl('Tagline', 'Frase corta descriptiva')}
              <input className={inp} value={local.sitio?.tagline||''} onChange={e => set('sitio.tagline',e.target.value)} placeholder="Logística inteligente para tu empresa" />
            </div>
            <div className="col-span-2">
              {lbl('Descripción', 'Texto descriptivo completo del producto')}
              <textarea rows={3} className={`${inp} resize-y`} value={local.sitio?.descripcion||''} onChange={e => set('sitio.descripcion',e.target.value)} />
            </div>
            <div>
              {lbl('Color primario')}
              <div className="flex items-center gap-2">
                <input type="color" value={local.sitio?.colorPrimario||'#00c896'} onChange={e => set('sitio.colorPrimario',e.target.value)} className="w-10 h-9 rounded cursor-pointer bg-transparent border border-white/8" />
                <input className={`${inp} flex-1`} value={local.sitio?.colorPrimario||''} onChange={e => set('sitio.colorPrimario',e.target.value)} />
              </div>
            </div>
            <div>
              {lbl('URL del logo')}
              <div className="flex items-center gap-2">
                <Link2 size={13} className="text-[#5f6f80] shrink-0" />
                <input className={inp} value={local.sitio?.logoUrl||''} onChange={e => set('sitio.logoUrl',e.target.value)} placeholder="https://…" />
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
            <input className={inp} value={local.hero?.titulo||''} onChange={e => set('hero.titulo',e.target.value)} placeholder="Controla tu logística con precisión" />
            {lbl('Subtítulo')}
            <textarea rows={2} className={`${inp} resize-y`} value={local.hero?.subtitulo||''} onChange={e => set('hero.subtitulo',e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              {lbl('CTA principal — texto')}
              <input className={inp} value={local.hero?.ctaTexto||''} onChange={e => set('hero.ctaTexto',e.target.value)} placeholder="Comenzar prueba gratis" />
              {lbl('CTA principal — URL')}
              <input className={inp} value={local.hero?.ctaUrl||''} onChange={e => set('hero.ctaUrl',e.target.value)} placeholder="#planes" />
              {lbl('CTA secundario — texto')}
              <input className={inp} value={local.hero?.ctaTexto2||''} onChange={e => set('hero.ctaTexto2',e.target.value)} placeholder="Ver demo en vivo" />
              {lbl('CTA secundario — URL')}
              <input className={inp} value={local.hero?.ctaUrl2||''} onChange={e => set('hero.ctaUrl2',e.target.value)} placeholder="#demo" />
            </div>
            {lbl('URL de imagen hero')}
            <input className={inp} value={local.hero?.imagenUrl||''} onChange={e => set('hero.imagenUrl',e.target.value)} placeholder="https://…/hero.png" />
            {local.hero?.imagenUrl && (
              <div className="rounded-xl overflow-hidden border border-white/8 max-h-40">
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
            <p className="text-[12px] text-[#5f6f80]">Funcionalidades destacadas que aparecerán en el sitio web</p>
            <Btn variant="primary" size="sm" onClick={openNewFeat}><Plus size={13}/>Agregar</Btn>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(local.caracteristicas||[]).map(c => (
              <div key={c.id} className="bg-[#161d28] border border-white/8 rounded-xl p-4 flex gap-3 group">
                <div className="text-2xl shrink-0">{c.icono}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[13px] text-[#e8edf2] mb-0.5">{c.titulo}</div>
                  <div className="text-[12px] text-[#5f6f80] line-clamp-2">{c.descripcion}</div>
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
                <input className={inp} value={featForm.icono||''} onChange={e => setFeatForm(p=>({...p,icono:e.target.value}))} placeholder="📦" />
              </Field>
              <Field label="Título *">
                <input className={inp} value={featForm.titulo||''} onChange={e => setFeatForm(p=>({...p,titulo:e.target.value}))} />
              </Field>
              <Field label="Descripción">
                <textarea rows={2} className={`${inp} resize-y`} value={featForm.descripcion||''} onChange={e => setFeatForm(p=>({...p,descripcion:e.target.value}))} />
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
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5f6f80]">{f.icon}</span>
                    <input className={`${inp} pl-8`} value={local.contacto?.[f.key]||''} onChange={e => set(`contacto.${f.key}`,e.target.value)} placeholder={f.placeholder} />
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-white/6">
                {lbl('Email de soporte (uso interno)', 'No se publica en el sitio web. Es el contacto técnico que usa el sistema — por ejemplo, ante Google/Mozilla si detectan mal uso del envío de notificaciones push.')}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5f6f80]"><Mail size={13}/></span>
                  <input className={`${inp} pl-8`} value={local.contacto?.emailSoporte||''} onChange={e => set('contacto.emailSoporte',e.target.value)} placeholder="soporte@tudominio.com" />
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
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5f6f80]">{r.icon}</span>
                    <input className={`${inp} pl-8`} value={local.redesSociales?.[r.key]||''} onChange={e => set(`redesSociales.${r.key}`,e.target.value)} placeholder="https://…" />
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
              <input className={inp} value={local.seo?.titulo||''} onChange={e => set('seo.titulo',e.target.value)} />
              {lbl('Meta descripción', 'Texto que aparece bajo el título en los resultados de búsqueda (160 chars)')}
              <textarea rows={3} className={`${inp} resize-y`} value={local.seo?.descripcion||''} onChange={e => set('seo.descripcion',e.target.value)} />
              <div className="text-[11px] text-[#5f6f80] text-right">{(local.seo?.descripcion||'').length}/160</div>
              {lbl('Keywords', 'Separadas por coma')}
              <textarea rows={2} className={`${inp} resize-y`} value={local.seo?.keywords||''} onChange={e => set('seo.keywords',e.target.value)} />
            </div>
          </Card>
          <Card>
            <CardHeader title="Footer y configuración general" />
            <div className="space-y-3">
              {lbl('Texto legal del footer')}
              <textarea rows={2} className={`${inp} resize-y`} value={local.footer?.textoLegal||''} onChange={e => set('footer.textoLegal',e.target.value)} />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] text-[#e8edf2]">Mostrar precios públicamente</div>
                  <div className="text-[11px] text-[#5f6f80]">Tabla de precios visible en el sitio</div>
                </div>
                <Toggle value={!!local.footer?.mostrarPrecios} onChange={v => set('footer.mostrarPrecios',v)} />
              </div>
              {lbl('Moneda pública')}
              <select className={inp} value={local.footer?.moneda||'USD'} onChange={e => set('footer.moneda',e.target.value)}>
                <option>USD</option><option>PEN</option><option>EUR</option>
              </select>
              {lbl('Días de prueba gratuita')}
              <input type="number" min="0" className={inp} value={local.footer?.probarGratisDias||14} onChange={e => set('footer.probarGratisDias',parseInt(e.target.value)||0)} />
            </div>
          </Card>
        </div>
      )}

      <div className="flex justify-end pt-2 border-t border-white/6">
        <Btn variant="primary" onClick={save}><Save size={14}/>Guardar configuración de landing</Btn>
      </div>
    </div>
  )
}
