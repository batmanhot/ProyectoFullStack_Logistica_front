import { AlertTriangle, CircleHelp } from 'lucide-react'

export function ModuleHeader({ eyebrow, title, description, action }) {
  return <header className="mb-9 flex flex-wrap items-end justify-between gap-6">
    <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-[#00c896]">{eyebrow}</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.03em] text-[#e8edf2] md:text-4xl">{title}</h1><p className="mt-3 max-w-3xl text-[15px] leading-7 text-[#9ba8b6] md:text-base">{description}</p></div>
    {action}
  </header>
}

export function ModuleTabs({ tabs, active, onChange }) {
  return <nav aria-label="Secciones del módulo" className="mb-8 overflow-x-auto border-b border-white/8">
    <div className="flex min-w-max gap-3 md:gap-5">{tabs.map(tab => <button key={tab.id} type="button" onClick={() => onChange(tab.id)} aria-current={active === tab.id ? 'page' : undefined} className={`border-b-2 px-1 py-4 text-sm font-medium transition-colors ${active === tab.id ? 'border-[#00c896] text-[#00c896]' : 'border-transparent text-[#8392a4] hover:text-[#e8edf2]'}`}>{tab.label}</button>)}</div>
  </nav>
}

export function DemoStatusBanner({ children = 'Esta sección usa información de demostración. La integración autoritativa con el backend continúa pendiente.' }) {
  return <div role="status" className="mb-5 flex gap-3 rounded-xl border border-amber-500/25 bg-amber-500/7 p-4"><AlertTriangle size={19} className="mt-0.5 shrink-0 text-amber-400" /><div><p className="text-sm font-semibold text-amber-200">Maqueta funcional · backend pendiente</p><p className="mt-1 text-xs leading-relaxed text-amber-100/75">{children}</p></div></div>
}

export function HelpPanel({ children }) {
  return <details className="mt-6 rounded-2xl border border-white/8 bg-[#131a24] px-5 py-4"><summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-[#9ba8b6]"><CircleHelp size={17} className="text-[#00c896]" />Cómo funciona esta sección</summary><div className="mt-4 border-t border-white/6 pt-4 text-sm leading-6 text-[#8392a4]">{children}</div></details>
}

export function Card({ title, children, className = '' }) {
  return <article className={`rounded-2xl border border-white/8 bg-[#161d28] p-6 md:p-7 ${className}`}>{title && <h2 className="text-lg font-semibold text-[#e8edf2]">{title}</h2>}<div className={title ? 'mt-5 text-[15px] leading-7 text-[#9ba8b6]' : 'text-[15px] leading-7 text-[#9ba8b6]'}>{children}</div></article>
}

export function EmptyTab({ title, description }) {
  return <div className="rounded-2xl border border-dashed border-white/12 bg-[#161d28]/60 px-6 py-14 text-center"><p className="text-lg font-medium text-[#e8edf2]">{title}</p><p className="mx-auto mt-3 max-w-xl text-[15px] leading-6 text-[#8392a4]">{description}</p></div>
}
