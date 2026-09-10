import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { Btn } from '../../components/ui/index'
import { TabCategorias, TabAlmacenes } from '../Maestros'
import { useConfiguracion, usePatchConfiguracion, useLimpiarOperativos, useRestaurarDemo } from '../../queries/configuracion.queries'
import { useCategoriasList } from '../../queries/categorias.queries'
import { useAlmacenesList } from '../../queries/almacenes.queries'
import { useProveedoresList } from '../../queries/proveedores.queries'
import { useProductosList, useCrearProducto, useActualizarProducto } from '../../queries/productos.queries'
import { TABS } from './constants'
import TabAreasInternas from './TabAreasInternas'
import TabEmpresa from './TabEmpresa'
import TabValorizacion from './TabValorizacion'
import TabAprobaciones from './TabAprobaciones'
import TabAlertas from './TabAlertas'
import TabImportarDatos from './TabImportarDatos'
import TabDatosReset from './TabDatosReset'

// El backend (GET /configuracion) es la única fuente. `form` es solo el buffer
// de edición de los campos de texto de la empresa; el resto se persiste al
// instante en su propio control.
function apiToForm(c) {
  return {
    empresa:             c?.nombre    ?? '',
    ruc:                 c?.ruc       ?? '',
    telefono:            c?.telefono  ?? '',
    direccion:           c?.direccion ?? '',
    email:               c?.email     ?? '',
    formulaValorizacion: c?.formulaValorizacion ?? 'PMP',
    alertaVencimiento:   c?.alertaVencimiento ?? true,
  }
}

export default function Configuracion() {
  const { toast, sesion } = useApp()
  const tenantId = sesion?.empresaId || 'desconocido'
  const [tab, setTab] = useState('empresa')

  const { data: configApi }  = useConfiguracion()
  const patchConfiguracion   = usePatchConfiguracion()
  const limpiarOperativos    = useLimpiarOperativos()
  const restaurarDemo        = useRestaurarDemo()

  const { data: cats  = [] } = useCategoriasList()
  const { data: alms  = [] } = useAlmacenesList()
  const { data: provs = [] } = useProveedoresList()
  const { data: prods = [] } = useProductosList()
  const crearProducto        = useCrearProducto()
  const actualizarProducto   = useActualizarProducto()

  const [form, setForm] = useState(() => apiToForm(null))

  // Rehidratar el buffer cuando llegan/cambian los datos del backend.
  useEffect(() => {
    if (configApi) setForm(apiToForm(configApi))
  }, [configApi])

  const [confirmReset, setConfirmReset]     = useState(false)
  const [confirmLimpiar, setConfirmLimpiar] = useState(false)

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // Campos de texto de la empresa → botón "Guardar Configuración".
  async function guardarEmpresa() {
    const res = await patchConfiguracion.mutateAsync({
      nombre:    form.empresa,
      ruc:       form.ruc,
      email:     form.email,
      telefono:  form.telefono,
      direccion: form.direccion,
    })
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Configuración guardada', 'success')
  }

  // Método de valorización → se guarda al instante (aplica al Kardex valorizado).
  async function guardarFormula(id) {
    if (id === form.formulaValorizacion) return
    f('formulaValorizacion', id)
    const res = await patchConfiguracion.mutateAsync({ formulaValorizacion: id })
    if (res?.error) { toast(res.error, 'error'); f('formulaValorizacion', form.formulaValorizacion); return }
    toast(`Método de valorización: ${id}`, 'success')
  }

  // Alertas de vencimiento → se guarda al instante.
  async function toggleAlertaVencimiento(v) {
    f('alertaVencimiento', v)
    const res = await patchConfiguracion.mutateAsync({ alertaVencimiento: v })
    if (res?.error) { toast(res.error, 'error'); f('alertaVencimiento', !v); return }
    toast(v ? 'Alertas de vencimiento activadas' : 'Alertas de vencimiento desactivadas', 'success')
  }

  async function handleReset() {
    const res = await restaurarDemo.mutateAsync()
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Datos demo restaurados — recargando...', 'success', 3000)
    setTimeout(() => window.location.reload(), 1800)
  }

  async function handleLimpiar() {
    const res = await limpiarOperativos.mutateAsync()
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Datos operativos eliminados — recargando...', 'success', 3000)
    setTimeout(() => window.location.reload(), 1800)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-white/8 flex-wrap">
        {TABS.map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium border-b-2 -mb-px transition-all whitespace-nowrap
              ${tab === id ? 'text-[#00c896] border-[#00c896]' : 'text-[#5f6f80] border-transparent hover:text-[#9ba8b6]'}`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {tab === 'empresa'       && <TabEmpresa form={form} f={f} tenantId={tenantId} sesion={sesion} />}
      {tab === 'valorizacion'  && <TabValorizacion form={form} onChange={guardarFormula} />}
      {tab === 'aprobaciones'  && <TabAprobaciones />}
      {tab === 'alertas'       && <TabAlertas form={form} onChange={toggleAlertaVencimiento} />}
      {tab === 'areas-internas' && <TabAreasInternas toast={toast} />}
      {tab === 'categorias'    && <TabCategorias />}
      {tab === 'almacenes'     && <TabAlmacenes />}

      {tab === 'importar' && (
        <TabImportarDatos
          cats={cats} alms={alms} provs={provs} prods={prods}
          crearProducto={crearProducto} actualizarProducto={actualizarProducto}
          toast={toast}
        />
      )}

      {tab === 'datos' && (
        <TabDatosReset
          tenantId={tenantId} sesion={sesion} configApi={configApi}
          form={form}
          confirmReset={confirmReset} setConfirmReset={setConfirmReset}
          confirmLimpiar={confirmLimpiar} setConfirmLimpiar={setConfirmLimpiar}
          handleReset={handleReset} handleLimpiar={handleLimpiar}
        />
      )}

      {/* Botón guardar — solo el tab Empresa tiene campos que se editan en buffer */}
      {tab === 'empresa' && (
        <div className="flex justify-end">
          <Btn variant="primary" size="lg" onClick={guardarEmpresa} disabled={patchConfiguracion.isPending}>
            <Save size={15} /> Guardar Configuración
          </Btn>
        </div>
      )}
    </div>
  )
}
