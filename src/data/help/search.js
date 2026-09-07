// Centro de Ayuda — Búsqueda global (spec sección 26)
// Busca sobre conceptos, módulos, procedimientos, FAQ y problemas frecuentes.
// Dataset pequeño (~50 artículos) → filtro simple en memoria, sin librería
// externa. Si el contenido crece mucho (Fase 4, +200 artículos), evaluar Fuse.js.

import { CONCEPTOS } from './conceptos'
import { MODULOS_AYUDA } from './modulos'
import { PROCEDIMIENTOS } from './procedimientos'
import { FAQ } from './faq'
import { PROBLEMAS } from './problemas'

function norm(s) {
  return (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita acentos para que "recepcion" encuentre "recepción"
}

function coincide(query, ...campos) {
  const q = norm(query)
  return campos.some(c => norm(c).includes(q))
}

/**
 * Busca en todo el contenido del Centro de Ayuda.
 * Devuelve resultados agrupados por categoría, cada uno con { to, titulo, extracto }
 * listo para renderizar como link de navegación.
 */
export function buscarEnAyuda(query) {
  const q = (query || '').trim()
  if (q.length < 2) {
    return { conceptos: [], modulos: [], procedimientos: [], faq: [], problemas: [], total: 0 }
  }

  const conceptos = CONCEPTOS
    .filter(c => coincide(q, c.nombre, c.descripcion, c.paraQueSirve))
    .map(c => ({ to: `/ayuda/conceptos#${c.slug}`, titulo: c.nombre, extracto: c.descripcion }))

  const modulos = MODULOS_AYUDA
    .filter(m => coincide(q, m.nombre, m.queEs, m.paraQueSirve))
    .map(m => ({ to: `/ayuda/modulos/${m.slug}`, titulo: m.nombre, extracto: m.queEs }))

  const procedimientos = PROCEDIMIENTOS
    .filter(p => coincide(q, p.pregunta, p.objetivo))
    .map(p => ({ to: `/ayuda/como-hago/${p.slug}`, titulo: p.pregunta, extracto: p.objetivo }))

  const faq = FAQ
    .filter(f => coincide(q, f.pregunta, f.respuesta))
    .map(f => ({ to: `/ayuda/faq#${f.slug}`, titulo: f.pregunta, extracto: f.respuesta }))

  const problemas = PROBLEMAS
    .filter(p => coincide(q, p.problema, p.solucion))
    .map(p => ({ to: `/ayuda/problemas#${p.slug}`, titulo: p.problema, extracto: p.solucion }))

  return {
    conceptos, modulos, procedimientos, faq, problemas,
    total: conceptos.length + modulos.length + procedimientos.length + faq.length + problemas.length,
  }
}
