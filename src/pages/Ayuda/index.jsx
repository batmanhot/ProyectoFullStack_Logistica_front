import { Routes, Route, NavLink } from 'react-router-dom'
import AyudaHome from './AyudaHome'
import AyudaConceptos from './AyudaConceptos'
import AyudaModulos from './AyudaModulos'
import AyudaModuloDetalle from './AyudaModuloDetalle'
import AyudaComoHago from './AyudaComoHago'
import AyudaProcedimientoDetalle from './AyudaProcedimientoDetalle'
import AyudaProblemas from './AyudaProblemas'
import AyudaFaq from './AyudaFaq'

const NAV_ITEMS = [
  { to: '/ayuda',            label: 'Inicio',              end: true },
  { to: '/ayuda/conceptos',  label: 'Conceptos y Glosario' },
  { to: '/ayuda/modulos',    label: 'Módulos' },
  { to: '/ayuda/como-hago',  label: '¿Cómo hago...?' },
  { to: '/ayuda/problemas',  label: 'Problemas frecuentes' },
  { to: '/ayuda/faq',        label: 'FAQ' },
]

function AyudaNav() {
  return (
    <div className="flex items-center gap-1 px-6 pt-4 pb-3 border-b overflow-x-auto shrink-0"
      style={{ borderColor: 'var(--border)' }}>
      {NAV_ITEMS.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className="px-3 py-1.5 rounded-lg text-[12.5px] font-medium whitespace-nowrap transition-colors hover:bg-white/5"
          style={({ isActive }) => isActive
            ? { background: 'var(--accent-dim)', color: 'var(--accent)' }
            : { color: 'var(--text-secondary)' }}
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  )
}

// Rutas internas del Centro de Ayuda — montado en App.jsx como "/ayuda/*".
// Estructura (spec sección 5): Inicio, Conceptos/Glosario, Módulos,
// ¿Cómo hago...?, Problemas frecuentes, FAQ. Ampliable sin tocar App.jsx:
// agregar acá una nueva <Route> y, si aplica, un ítem en NAV_ITEMS.
export default function Ayuda() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <AyudaNav />
      <div className="flex-1 overflow-y-auto">
        <Routes>
          <Route index element={<AyudaHome />} />
          <Route path="conceptos" element={<AyudaConceptos />} />
          <Route path="modulos" element={<AyudaModulos />} />
          <Route path="modulos/:slug" element={<AyudaModuloDetalle />} />
          <Route path="como-hago" element={<AyudaComoHago />} />
          <Route path="como-hago/:slug" element={<AyudaProcedimientoDetalle />} />
          <Route path="problemas" element={<AyudaProblemas />} />
          <Route path="faq" element={<AyudaFaq />} />
          <Route path="*" element={<AyudaHome />} />
        </Routes>
      </div>
    </div>
  )
}
