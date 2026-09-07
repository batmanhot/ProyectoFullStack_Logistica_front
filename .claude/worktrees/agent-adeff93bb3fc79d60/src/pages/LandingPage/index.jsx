/**
 * LandingPage/index.jsx — Landing Page pública de StockPro (v2.0)
 *
 * Optimización comercial completa orientada a conversión:
 *   - Hero con headline de resultados empresariales
 *   - Sección "Problema Empresarial" (nueva)
 *   - Beneficios orientados a impacto (no funcionalidades)
 *   - Sección "Así funciona" con mockups visuales por módulo (nueva)
 *   - CTA sticky en mobile
 *   - SEO comercial mejorado con OpenGraph
 *
 * Carga dinámicamente vía API pública (ver `usePublicLanding`/`usePublicPlanes` en
 * `queries/admin.queries.js`): landing configurada por SuperAdmin (AdminSaaS → "Landing Page")
 * y planes activos con precios/límites, resueltos desde PlanSaaS.
 */
import { useMemo, useEffect, useState, useCallback } from 'react'
import { usePublicLanding, usePublicPlanes } from '../../queries/admin.queries'
import { useNavigate } from 'react-router-dom'

import { LANDING_DEFAULT, PLANES_DEFAULT } from './constants'
import { scrollSmoothTo } from './scrollSmoothTo'

import { Navbar } from './Navbar'
import { Hero } from './Hero'
import { ProblemaEmpresarial } from './ProblemaEmpresarial'
import { StatsBar } from './StatsBar'
import { Beneficios } from './Beneficios'
import { ComoFunciona } from './ComoFunciona'
import { PlanesYPrecios } from './PlanesYPrecios'
import { Testimonios } from './Testimonios'
import { CtaCentral } from './CtaCentral'
import { Contacto } from './Contacto'
import { Footer } from './Footer'
import { CtaStickyMobile } from './CtaStickyMobile'

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate   = useNavigate()
  const [menuOpen,         setMenuOpen]         = useState(false)
  const [ciclo,            setCiclo]            = useState('mensual')
  const [scrolled,         setScrolled]         = useState(false)
  const [moduloActivo,     setModuloActivo]     = useState('dashboard')
  const [showStickyMobile, setShowStickyMobile] = useState(false)

  const { data: landingAPI }    = usePublicLanding()
  const { data: planesAPI = [] } = usePublicPlanes()
  const landing = landingAPI ?? LANDING_DEFAULT
  const planes  = planesAPI.length > 0
    ? planesAPI.filter(p => p.activo !== false)
    : PLANES_DEFAULT.filter(p => p.activo !== false)

  const { sitio, hero, caracteristicas, contacto, redesSociales, footer } = landing
  const primary = sitio?.colorPrimario || '#00c896'

  useEffect(() => {
    // ── SEO mejorado ──────────────────────────────────────
    const seo = landing?.seo
    document.title = seo?.titulo || 'StockPro — Software Logístico SaaS | Inventario, Almacenes y Despachos'

    const setMeta = (name, content) => {
      let el = document.querySelector(`meta[name="${name}"]`)
      if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el) }
      el.setAttribute('content', content)
    }
    const setOG = (prop, content) => {
      let el = document.querySelector(`meta[property="${prop}"]`)
      if (!el) { el = document.createElement('meta'); el.setAttribute('property', prop); document.head.appendChild(el) }
      el.setAttribute('content', content)
    }

    setMeta('description', seo?.descripcion || 'Digitaliza tu operación logística con StockPro. Software ERP logístico para gestión de inventario, almacenes, pedidos y trazabilidad en tiempo real. Prueba 30 días gratis.')
    setMeta('keywords',    seo?.keywords    || 'software logístico, sistema logístico, gestión de inventario, control de almacenes, trazabilidad logística, ERP logístico')
    setOG('og:title',       seo?.titulo      || 'StockPro — Software Logístico SaaS')
    setOG('og:description', seo?.descripcion || 'Digitaliza tu operación logística')
    setOG('og:type', 'website')

    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 60)
      setShowStickyMobile(y > 500)
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [landing])

  function goSection(id) { setMenuOpen(false); scrollSmoothTo(id) }

  // ─────────────────────────────────────────────────────────
  return (
    <div data-landing="true"
         className="min-h-screen bg-[#0e1117] text-[#e8edf2] font-sans overflow-x-hidden"
         style={{ backgroundColor: '#0e1117', color: '#e8edf2' }}>

      <Navbar sitio={sitio} primary={primary} scrolled={scrolled}
              menuOpen={menuOpen} setMenuOpen={setMenuOpen}
              navigate={navigate} goSection={goSection}/>

      <Hero primary={primary} hero={hero} footer={footer} navigate={navigate} goSection={goSection}/>

      <ProblemaEmpresarial primary={primary} goSection={goSection}/>

      <StatsBar primary={primary}/>

      <Beneficios primary={primary} caracteristicas={caracteristicas}/>

      <ComoFunciona primary={primary} moduloActivo={moduloActivo}
                    setModuloActivo={setModuloActivo} navigate={navigate}/>

      <PlanesYPrecios primary={primary} planes={planes} ciclo={ciclo} setCiclo={setCiclo}
                      navigate={navigate} goSection={goSection} contacto={contacto}/>

      <Testimonios primary={primary}/>

      <CtaCentral primary={primary} navigate={navigate} goSection={goSection} sitio={sitio} footer={footer}/>

      <Contacto primary={primary} contacto={contacto}/>

      <Footer sitio={sitio} primary={primary} redesSociales={redesSociales}
              footer={footer} navigate={navigate}/>

      <CtaStickyMobile primary={primary} showStickyMobile={showStickyMobile} navigate={navigate}/>

    </div>
  )
}
