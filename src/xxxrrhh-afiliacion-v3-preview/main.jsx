/* eslint-disable react-refresh/only-export-components */
import { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowLeft, ArrowRight, BadgeCheck, BriefcaseBusiness, Check, CheckCircle2,
  ChevronDown, ClipboardCheck, FileText, HeartPulse, Landmark,
  MoreHorizontal, Pencil, Plus, Search, ShieldCheck, Trash2,
  UserRound, UsersRound, X,
} from 'lucide-react'
import '../index.css'

const INITIAL_RECORDS = [
  { id: 'af-1048', name: 'Mariana Salazar', initials: 'MS', document: 'DNI 7284••••', role: 'Jefa de operaciones', startDate: '2026-09-02', started: '02 set 2026', pension: 'AFP Integra', health: 'EsSalud', status: 'Completa', updated: 'Hoy, 09:32', owner: 'Paola Núñez', dependents: 1 },
  { id: 'af-1047', name: 'Carlos Rodríguez', initials: 'CR', document: 'DNI 4561••••', role: 'Supervisor de almacén', startDate: '2026-08-18', started: '18 ago 2026', pension: 'ONP', health: 'EsSalud', status: 'Completa', updated: 'Ayer, 16:18', owner: 'Paola Núñez', dependents: 0 },
  { id: 'af-1046', name: 'Lucía Fernández', initials: 'LF', document: 'DNI 7159••••', role: 'Asistente comercial', startDate: '2026-09-15', started: '15 set 2026', pension: 'Pendiente', health: 'Pendiente', status: 'Requiere atención', updated: 'Hoy, 08:10', owner: 'Diego Castro', dependents: 0 },
  { id: 'af-1045', name: 'Álvaro Mendoza', initials: 'AM', document: 'CE 0018••••', role: 'Analista de inventario', startDate: '2026-08-04', started: '04 ago 2026', pension: 'AFP Prima', health: 'EPS Pacífico', status: 'Completa', updated: '04 ago, 10:45', owner: 'Paola Núñez', dependents: 2 },
  { id: 'af-1044', name: 'Renata Castillo', initials: 'RC', document: 'DNI 7042••••', role: 'Auxiliar de despacho', startDate: '2026-08-01', started: '01 ago 2026', pension: 'AFP Habitat', health: 'EsSalud', status: 'Completa', updated: '01 ago, 14:04', owner: 'Paola Núñez', dependents: 0 },
]

const EMPTY_FORM = {
  documentType: 'DNI', document: '', firstName: '', lastName: '', role: '', startDate: '',
  pension: 'AFP', afp: 'Integra', health: 'EsSalud', eps: '', dependents: 'No',
}

const STEPS = [
  { id: 1, label: 'Persona', hint: 'Identidad y vínculo' },
  { id: 2, label: 'Cobertura', hint: 'Pensión y salud' },
  { id: 3, label: 'Validar', hint: 'Revisión final' },
]

const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'

function App() {
  const [records, setRecords] = useState(INITIAL_RECORDS)
  const [view, setView] = useState('list')
  const [filter, setFilter] = useState('Todos')
  const [query, setQuery] = useState('')
  const [activeMenu, setActiveMenu] = useState(null)
  const [detail, setDetail] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [notice, setNotice] = useState('')

  const visibleRecords = useMemo(() => records.filter((record) => {
    const matchesFilter = filter === 'Todos' || record.status === filter
    const term = query.trim().toLocaleLowerCase()
    const matchesSearch = !term || `${record.name} ${record.role} ${record.document}`.toLocaleLowerCase().includes(term)
    return matchesFilter && matchesSearch
  }), [records, filter, query])

  const openForm = (record = null) => {
    setSelected(record)
    setForm(record ? {
      ...EMPTY_FORM,
      document: record.document.replace(/\D/g, '').slice(0, 8),
      firstName: record.name.split(' ')[0],
      lastName: record.name.split(' ').slice(1).join(' '),
      role: record.role,
      startDate: record.startDate,
      pension: record.pension === 'ONP' ? 'ONP' : 'AFP',
      afp: record.pension.replace('AFP ', '') || 'Integra',
      health: record.health.startsWith('EPS') ? 'EPS' : 'EsSalud',
      eps: record.health.replace('EPS ', ''),
      dependents: record.dependents ? 'Sí' : 'No',
    } : EMPTY_FORM)
    setStep(1)
    setSubmitted(false)
    setDetail(null)
    setActiveMenu(null)
    setView('form')
  }

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const requiredPerson = Boolean(form.document && form.firstName && form.lastName && form.role && form.startDate)
  const canContinue = step !== 1 || requiredPerson

  const saveRecord = () => {
    setSubmitted(true)
    if (!requiredPerson) {
      setStep(1)
      return
    }
    const name = `${form.firstName} ${form.lastName}`.trim()
    const now = 'Ahora'
    const record = {
      id: selected?.id || `af-${form.document || 'nuevo'}`,
      name,
      initials: name.split(' ').map((word) => word[0]).slice(0, 2).join(''),
      document: `${form.documentType} ${form.document.slice(0, 4)}••••`,
      role: form.role,
      startDate: form.startDate,
      started: formatStartDate(form.startDate),
      pension: form.pension === 'AFP' ? `AFP ${form.afp}` : 'ONP',
      health: form.health === 'EPS' ? `EPS ${form.eps || 'por confirmar'}` : 'EsSalud',
      status: 'Completa',
      updated: now,
      owner: 'Paola Núñez',
      dependents: form.dependents === 'Sí' ? 1 : 0,
    }
    setRecords((current) => selected ? current.map((item) => item.id === selected.id ? record : item) : [record, ...current])
    setView('list')
    flash(selected ? 'Ficha de afiliación actualizada' : 'Afiliación registrada correctamente')
  }

  const flash = (message) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 3400)
  }

  const removeRecord = () => {
    setRecords((current) => current.filter((record) => record.id !== deleteTarget.id))
    setDeleteTarget(null)
    setDetail(null)
    flash('La ficha fue retirada del listado')
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <ProductBar view={view} onBack={() => setView('list')} />
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-7 lg:px-10 lg:py-10">
        {view === 'list' ? (
          <Directory
            records={visibleRecords}
            total={records.length}
            pending={records.filter((record) => record.status === 'Requiere atención').length}
            filter={filter}
            setFilter={setFilter}
            query={query}
            setQuery={setQuery}
            activeMenu={activeMenu}
            setActiveMenu={setActiveMenu}
            onNew={() => openForm()}
            onDetail={setDetail}
            onEdit={openForm}
            onRemove={setDeleteTarget}
          />
        ) : (
          <AffiliationForm
            form={form}
            update={updateForm}
            step={step}
            setStep={setStep}
            submitted={submitted}
            canContinue={canContinue}
            editing={Boolean(selected)}
            onCancel={() => setView('list')}
            onSave={saveRecord}
          />
        )}
      </main>
      {detail && <DetailModal record={detail} onClose={() => setDetail(null)} onEdit={() => openForm(detail)} />}
      {deleteTarget && <DeleteDialog record={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={removeRecord} />}
      {notice && <Toast>{notice}</Toast>}
    </div>
  )
}

function ProductBar({ view, onBack }) {
  return (
    <header className="border-b border-slate-800 bg-slate-950 text-white">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-5 sm:px-7 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500 text-sm font-bold shadow-lg shadow-indigo-900/40">A</div>
          <div>
            <p className="text-sm font-semibold tracking-[-.015em]">Andina</p>
            <p className="text-[11px] text-slate-400">Gestión de personas</p>
          </div>
        </div>
        {view === 'form' ? (
          <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"><X size={16} />Cancelar</button>
        ) : (
          <div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex"><ShieldCheck size={15} className="text-emerald-400" />Datos personales protegidos</div>
        )}
      </div>
    </header>
  )
}

function Directory({ records, total, pending, filter, setFilter, query, setQuery, activeMenu, setActiveMenu, onNew, onDetail, onEdit, onRemove }) {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600"><UsersRound size={15} />RECURSOS HUMANOS</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-.04em] text-slate-950 sm:text-4xl">Personal y afiliaciones</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Gestiona las coberturas laborales y detecta fichas que aún requieren información.</p>
        </div>
        <button type="button" onClick={onNew} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"><Plus size={17} />Nueva afiliación</button>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <Metric label="Personal afiliado" value={total} hint="Registros activos" tone="indigo" icon={UsersRound} />
        <Metric label="Requiere atención" value={pending} hint={pending ? 'Completa las coberturas pendientes' : 'Todo está al día'} tone="amber" icon={ClipboardCheck} />
        <Metric label="Cobertura validada" value={`${Math.round(((total - pending) / Math.max(total, 1)) * 100)}%`} hint="Pensión y salud confirmadas" tone="emerald" icon={BadgeCheck} />
      </section>

      <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1" aria-label="Filtro de estado">
            {['Todos', 'Requiere atención', 'Completa'].map((item) => <FilterTab key={item} active={filter === item} onClick={() => setFilter(item)}>{item}{item === 'Todos' && <span className="ml-1.5 text-slate-400">{total}</span>}</FilterTab>)}
          </div>
          <label className="flex h-10 w-full max-w-xs items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 transition focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100">
            <Search size={16} className="shrink-0 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Buscar por persona o cargo" />
          </label>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[740px]">
            <div className="grid grid-cols-[minmax(260px,1.45fr)_minmax(190px,1fr)_150px_125px_44px] items-center gap-5 border-b border-slate-100 bg-slate-50/70 px-6 py-3 text-[11px] font-bold uppercase tracking-[.1em] text-slate-400">
              <span>Colaborador</span><span>Afiliaciones</span><span>Estado</span><span>Actualización</span><span />
            </div>
            {records.length ? records.map((record) => (
              <RecordRow key={record.id} record={record} menuOpen={activeMenu === record.id} onMenu={(open) => setActiveMenu(open ? record.id : null)} onDetail={() => { setActiveMenu(null); onDetail(record) }} onEdit={() => onEdit(record)} onRemove={() => { setActiveMenu(null); onRemove(record) }} />
            )) : <EmptyState onNew={onNew} />}
          </div>
        </div>
        {records.length > 0 && <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5 text-xs text-slate-500 sm:px-6"><span>Mostrando {records.length} de {total} registros</span><div className="flex items-center gap-1"><button disabled className="rounded-lg px-2.5 py-1.5 text-slate-300">Anterior</button><span className="rounded-lg bg-indigo-50 px-2.5 py-1.5 font-semibold text-indigo-700">1</span><button disabled className="rounded-lg px-2.5 py-1.5 text-slate-300">Siguiente</button></div></div>}
      </section>
      <p className="mt-4 flex items-center gap-2 text-xs text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-slate-300" />Vista de demostración: los cambios solo viven durante esta sesión.</p>
    </>
  )
}

function Metric({ label, value, hint, tone, icon }) {
  const Icon = icon
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  }
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold tracking-[-.04em] text-slate-950">{value}</p></div><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${colors[tone]}`}><Icon size={18} /></span></div><p className="mt-3 text-xs text-slate-400">{hint}</p></article>
}

function FilterTab({ active, children, onClick }) {
  return <button type="button" onClick={onClick} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{children}</button>
}

function RecordRow({ record, menuOpen, onMenu, onDetail, onEdit, onRemove }) {
  return (
    <div className="group grid grid-cols-[minmax(260px,1.45fr)_minmax(190px,1fr)_150px_125px_44px] items-center gap-5 border-b border-slate-100 px-6 py-4 transition last:border-0 hover:bg-slate-50/80">
      <button type="button" onClick={onDetail} className="flex min-w-0 items-center gap-3 text-left">
        <Avatar initials={record.initials} pending={record.status !== 'Completa'} />
        <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-900">{record.name}</span><span className="mt-1 block truncate text-xs text-slate-500">{record.role} · {record.document}</span></span>
      </button>
      <div className="min-w-0"><p className="truncate text-xs font-medium text-slate-700">{record.pension}</p><p className="mt-1 truncate text-xs text-slate-400">{record.health}</p></div>
      <div><StatusBadge status={record.status} /></div>
      <div><p className="text-xs text-slate-600">{record.updated}</p><p className="mt-1 text-[11px] text-slate-400">Por {record.owner}</p></div>
      <div className="relative"><button type="button" onClick={() => onMenu(!menuOpen)} aria-label={`Acciones para ${record.name}`} className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 sm:opacity-0 sm:group-hover:opacity-100"><MoreHorizontal size={18} /></button>{menuOpen && <ContextMenu onDetail={onDetail} onEdit={onEdit} onRemove={onRemove} />}</div>
    </div>
  )
}

function ContextMenu({ onDetail, onEdit, onRemove }) {
  return <div className="absolute right-0 top-9 z-20 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10"><MenuButton icon={UserRound} onClick={onDetail}>Ver detalle</MenuButton><MenuButton icon={Pencil} onClick={onEdit}>Editar ficha</MenuButton><div className="my-1 border-t border-slate-100" /><MenuButton icon={Trash2} onClick={onRemove} danger>Retirar ficha</MenuButton></div>
}

function MenuButton({ icon, children, onClick, danger = false }) {
  const Icon = icon
  return <button type="button" onClick={onClick} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition ${danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-50'}`}><Icon size={14} />{children}</button>
}

function EmptyState({ onNew }) {
  return <div className="px-6 py-14 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Search size={20} /></span><p className="mt-4 text-sm font-semibold text-slate-800">No encontramos afiliaciones</p><p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">Prueba con otro término o registra una nueva ficha de afiliación.</p><button type="button" onClick={onNew} className="mt-5 text-sm font-semibold text-indigo-600 hover:text-indigo-700">Crear afiliación</button></div>
}

function AffiliationForm({ form, update, step, setStep, submitted, canContinue, editing, onCancel, onSave }) {
  const next = () => {
    if (!canContinue) return
    setStep((current) => Math.min(3, current + 1))
  }
  return (
    <>
      <button type="button" onClick={onCancel} className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"><ArrowLeft size={16} />Volver a afiliaciones</button>
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-5 border-b border-slate-200 pb-7">
          <div><div className="flex items-center gap-2 text-xs font-semibold text-indigo-600"><FileText size={15} />FICHA LABORAL</div><h1 className="mt-3 text-3xl font-semibold tracking-[-.04em] text-slate-950">{editing ? 'Editar afiliación' : 'Nueva afiliación'}</h1><p className="mt-2 text-sm text-slate-500">Completa solo los datos necesarios para registrar la cobertura.</p></div>
          <span className="rounded-full bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">Borrador sin guardar</span>
        </div>
        <div className="mt-8 grid gap-7 lg:grid-cols-[210px_minmax(0,1fr)]">
          <StepRail step={step} setStep={setStep} />
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)] sm:p-8">
            {step === 1 && <PersonSection form={form} update={update} submitted={submitted} />}
            {step === 2 && <CoverageSection form={form} update={update} />}
            {step === 3 && <ReviewSection form={form} />}
            <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
              <button type="button" onClick={() => setStep((current) => Math.max(1, current - 1))} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 ${step === 1 ? 'invisible' : ''}`}><ArrowLeft size={16} />Anterior</button>
              {step < 3 ? <button type="button" onClick={next} disabled={!canContinue} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none">Continuar<ArrowRight size={16} /></button> : <button type="button" onClick={onSave} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-700"><Check size={17} />Guardar ficha</button>}
            </div>
            {step === 1 && submitted && !canContinue && <p className="mt-3 text-right text-xs font-medium text-rose-600">Completa los campos obligatorios para continuar.</p>}
          </section>
        </div>
      </div>
    </>
  )
}

function StepRail({ step, setStep }) {
  return <ol className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1">
    {STEPS.map((item) => <li key={item.id}><button type="button" disabled={item.id > step} onClick={() => setStep(item.id)} className={`flex min-w-[150px] items-center gap-3 rounded-xl p-3 text-left transition lg:w-full ${item.id === step ? 'bg-indigo-50' : 'hover:bg-white disabled:cursor-default disabled:hover:bg-transparent'}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${item.id < step ? 'bg-emerald-500 text-white' : item.id === step ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{item.id < step ? <Check size={14} /> : item.id}</span><span><span className={`block text-sm font-semibold ${item.id <= step ? 'text-slate-800' : 'text-slate-400'}`}>{item.label}</span><span className="mt-0.5 block text-[11px] text-slate-400">{item.hint}</span></span></button></li>)}
  </ol>
}

function PersonSection({ form, update, submitted }) {
  return <>
    <SectionHeader icon={UserRound} eyebrow="Paso 1 · Persona" title="Identifica al colaborador" text="Estos datos crean el vínculo laboral y permiten reconocer su ficha." />
    <fieldset><legend className="mb-3 text-xs font-bold uppercase tracking-[.1em] text-slate-400">Identidad</legend><div className="grid gap-4 sm:grid-cols-2"><Field label="Tipo de documento"><Select value={form.documentType} onChange={(event) => update('documentType', event.target.value)}><option>DNI</option><option>Carné de extranjería</option><option>Pasaporte</option></Select></Field><Field label="Número de documento" error={submitted && !form.document}><input autoFocus value={form.document} onChange={(event) => update('document', event.target.value)} className={inputClass} placeholder="Ej. 72648159" /></Field><Field label="Nombres" error={submitted && !form.firstName}><input value={form.firstName} onChange={(event) => update('firstName', event.target.value)} className={inputClass} placeholder="Ej. Mariana" /></Field><Field label="Apellidos" error={submitted && !form.lastName}><input value={form.lastName} onChange={(event) => update('lastName', event.target.value)} className={inputClass} placeholder="Ej. Salazar" /></Field></div></fieldset>
    <div className="my-7 border-t border-slate-100" />
    <fieldset><legend className="mb-3 text-xs font-bold uppercase tracking-[.1em] text-slate-400">Vínculo laboral</legend><div className="grid gap-4 sm:grid-cols-2"><Field label="Cargo" error={submitted && !form.role}><input value={form.role} onChange={(event) => update('role', event.target.value)} className={inputClass} placeholder="Ej. Jefa de operaciones" /></Field><Field label="Fecha de ingreso" error={submitted && !form.startDate}><input type="date" value={form.startDate} onChange={(event) => update('startDate', event.target.value)} className={inputClass} /></Field></div></fieldset>
  </>
}

function CoverageSection({ form, update }) {
  return <>
    <SectionHeader icon={HeartPulse} eyebrow="Paso 2 · Cobertura" title="Define sus afiliaciones" text="Selecciona la cobertura vigente. Podrás adjuntar sustentos al finalizar la ficha." />
    <fieldset><legend className="mb-3 text-xs font-bold uppercase tracking-[.1em] text-slate-400">Sistema previsional</legend><div className="grid gap-3 sm:grid-cols-2"><ChoiceCard selected={form.pension === 'AFP'} onClick={() => update('pension', 'AFP')} icon={Landmark} title="AFP" text="Fondo privado de pensiones" /><ChoiceCard selected={form.pension === 'ONP'} onClick={() => update('pension', 'ONP')} icon={ShieldCheck} title="ONP" text="Sistema nacional de pensiones" /></div>{form.pension === 'AFP' && <div className="mt-4"><Field label="AFP seleccionada"><Select value={form.afp} onChange={(event) => update('afp', event.target.value)}><option>Integra</option><option>Prima</option><option>Profuturo</option><option>Habitat</option></Select></Field></div>}</fieldset>
    <div className="my-7 border-t border-slate-100" />
    <fieldset><legend className="mb-3 text-xs font-bold uppercase tracking-[.1em] text-slate-400">Cobertura de salud</legend><div className="grid gap-3 sm:grid-cols-2"><ChoiceCard selected={form.health === 'EsSalud'} onClick={() => update('health', 'EsSalud')} icon={HeartPulse} title="EsSalud" text="Cobertura obligatoria" /><ChoiceCard selected={form.health === 'EPS'} onClick={() => update('health', 'EPS')} icon={BriefcaseBusiness} title="EPS" text="Cobertura privada complementaria" /></div>{form.health === 'EPS' && <div className="mt-4"><Field label="Entidad prestadora de salud"><input value={form.eps} onChange={(event) => update('eps', event.target.value)} className={inputClass} placeholder="Ej. Pacífico EPS" /></Field></div>}</fieldset>
  </>
}

function ReviewSection({ form }) {
  const name = `${form.firstName} ${form.lastName}`.trim() || 'Colaborador pendiente'
  return <>
    <SectionHeader icon={BadgeCheck} eyebrow="Paso 3 · Validar" title="Revisa antes de guardar" text="La ficha quedará disponible para completar con documentos y derechohabientes." />
    <div className="overflow-hidden rounded-2xl border border-slate-200"><SummaryRow label="Colaborador" value={name} detail={`${form.documentType} ${form.document || '—'} · ${form.role || 'Sin cargo'}`} /><SummaryRow label="Pensión" value={form.pension === 'AFP' ? `AFP ${form.afp}` : 'ONP'} detail="Sistema previsional" /><SummaryRow label="Salud" value={form.health === 'EPS' ? `EPS ${form.eps || 'por confirmar'}` : 'EsSalud'} detail="Cobertura de salud" /><SummaryRow label="Inicio laboral" value={formatStartDate(form.startDate) || 'Por definir'} detail="Fecha declarada" /></div>
    <div className="mt-5 flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3.5 text-sm leading-6 text-emerald-900"><CheckCircle2 size={18} className="mt-1 shrink-0 text-emerald-600" /><p>La información principal está lista. Los anexos se gestionan después, sin bloquear este registro.</p></div>
  </>
}

function SectionHeader({ icon, eyebrow, title, text }) {
  const Icon = icon
  return <div className="mb-7"><div className="flex items-center gap-2 text-xs font-semibold text-indigo-600"><Icon size={15} />{eyebrow}</div><h2 className="mt-3 text-xl font-semibold tracking-[-.025em] text-slate-950">{title}</h2><p className="mt-1.5 max-w-xl text-sm leading-6 text-slate-500">{text}</p></div>
}

function Field({ label, children, error = false }) {
  return <label className="block"><span className="text-xs font-semibold text-slate-700">{label}</span><div className={`mt-1.5 ${error ? '[&>input]:border-rose-400 [&>input]:focus:border-rose-500 [&>input]:focus:ring-rose-100' : ''}`}>{children}</div>{error && <span className="mt-1.5 block text-[11px] font-medium text-rose-600">Este campo es obligatorio.</span>}</label>
}

function Select({ children, ...props }) {
  return <div className="relative"><select {...props} className={`${inputClass} appearance-none pr-10`}>{children}</select><ChevronDown size={16} className="pointer-events-none absolute right-3.5 top-3 text-slate-400" /></div>
}

function ChoiceCard({ selected, onClick, icon, title, text }) {
  const Icon = icon
  return <button type="button" onClick={onClick} className={`rounded-xl border p-4 text-left transition ${selected ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}><div className="flex items-start justify-between gap-4"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${selected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}><Icon size={18} /></span>{selected && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white"><Check size={12} strokeWidth={3} /></span>}</div><p className="mt-3 text-sm font-semibold text-slate-900">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{text}</p></button>
}

function SummaryRow({ label, value, detail }) {
  return <div className="flex items-center justify-between gap-5 border-b border-slate-100 p-4 last:border-0"><div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[.1em] text-slate-400">{label}</p><p className="mt-1 truncate text-xs text-slate-500">{detail}</p></div><p className="max-w-[55%] text-right text-sm font-semibold text-slate-900">{value}</p></div>
}

function DetailModal({ record, onClose, onEdit }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 p-4 sm:p-8" role="presentation">
      <aside role="dialog" aria-modal="true" aria-labelledby="detail-title" aria-describedby="detail-description" className="flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-950/30">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div><p className="text-xs font-semibold text-indigo-600">FICHA DE AFILIACIÓN</p><h2 id="detail-title" className="mt-1 text-lg font-semibold tracking-[-.02em] text-slate-950">Detalle del colaborador</h2></div>
          <button type="button" onClick={onClose} aria-label="Cerrar detalle" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        </div>
        <div id="detail-description" className="flex-1 overflow-y-auto px-6 py-6">
          <div className="flex items-center gap-3"><Avatar initials={record.initials} large pending={record.status !== 'Completa'} /><div className="min-w-0"><p className="truncate text-lg font-semibold text-slate-950">{record.name}</p><p className="mt-1 truncate text-sm text-slate-500">{record.role}</p></div></div>
          <div className="mt-4"><StatusBadge status={record.status} /></div>
          <div className="my-6 border-t border-slate-100" />
          <DrawerBlock title="Cobertura"><DrawerItem label="Sistema previsional" value={record.pension} /><DrawerItem label="Cobertura de salud" value={record.health} /><DrawerItem label="Derechohabientes" value={record.dependents ? `${record.dependents} registrado(s)` : 'Sin registro'} /></DrawerBlock>
          <DrawerBlock title="Vínculo laboral"><DrawerItem label="Documento" value={record.document} /><DrawerItem label="Fecha de ingreso" value={record.started} /><DrawerItem label="Responsable" value={record.owner} /></DrawerBlock>
          <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-700">Documentos y auditoría</p><p className="mt-1 text-xs leading-5 text-slate-500">Esta información se habilitará una vez integrada con el backend de RR. HH.</p></div>
        </div>
        <div className="border-t border-slate-100 p-5"><button type="button" onClick={onEdit} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"><Pencil size={16} />Editar ficha</button></div>
      </aside>
    </div>
  )
}

function DrawerBlock({ title, children }) {
  return <section className="mb-6"><h3 className="text-[11px] font-bold uppercase tracking-[.11em] text-slate-400">{title}</h3><div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-100">{children}</div></section>
}

function DrawerItem({ label, value }) {
  return <div className="flex items-center justify-between gap-4 px-3.5 py-3"><span className="text-xs text-slate-500">{label}</span><span className="max-w-[60%] text-right text-xs font-semibold text-slate-800">{value}</span></div>
}

function DeleteDialog({ record, onCancel, onConfirm }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-5"><section role="alertdialog" aria-modal="true" aria-labelledby="delete-title" className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><Trash2 size={19} /></span><h2 id="delete-title" className="mt-4 text-lg font-semibold text-slate-950">¿Retirar esta ficha?</h2><p className="mt-2 text-sm leading-6 text-slate-500">{record.name} dejará de aparecer en el listado. Esta acción es solo de demostración y no elimina información real.</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onCancel} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button><button type="button" onClick={onConfirm} className="rounded-xl bg-rose-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-rose-700">Retirar ficha</button></div></section></div>
}

function StatusBadge({ status }) {
  const attention = status !== 'Completa'
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold ${attention ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}><span className={`h-1.5 w-1.5 rounded-full ${attention ? 'bg-amber-500' : 'bg-emerald-500'}`} />{status}</span>
}

function Avatar({ initials, pending = false, large = false }) {
  return <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${large ? 'h-12 w-12 text-sm' : 'h-9 w-9 text-xs'} ${pending ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>{initials}</span>
}

function Toast({ children }) {
  return <div role="status" className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-2xl"><CheckCircle2 size={17} className="text-emerald-400" />{children}</div>
}

function formatStartDate(value) {
  if (!value) return ''
  return new Date(`${value}T00:00:00`).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

createRoot(document.getElementById('root')).render(<App />)
