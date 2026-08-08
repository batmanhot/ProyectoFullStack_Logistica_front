import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import * as storage from '../../services/storage'
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
import TabSistema from './TabSistema'
import TabValorizacion from './TabValorizacion'
import TabAlertas from './TabAlertas'
import TabImportarDatos from './TabImportarDatos'
import TabDatosReset from './TabDatosReset'

export default function Configuracion() {
  const { toast, sesion } = useApp()
  const tenantId = sesion?.empresaId || 'desconocido'
  const [form, setForm]           = useState(() => storage.getConfig().data || {})
  const [tab, setTab]             = useState('empresa')

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

  // Cuando los datos del backend llegan, sobreescribir los campos de empresa en el form
  useEffect(() => {
    if (!configApi) return
    setForm(prev => ({
      ...prev,
      empresa:   configApi.nombre    ?? prev.empresa,
      ruc:       configApi.ruc       ?? prev.ruc,
      contacto:  configApi.contacto  ?? prev.contacto,
      email:     configApi.email     ?? prev.email,
      telefono:  configApi.telefono  ?? prev.telefono,
      direccion: configApi.direccion ?? prev.direccion,
      modoDesarrollo: configApi.modoDesarrollo ?? prev.modoDesarrollo,
    }))
  }, [configApi])
  const [confirmReset, setConfirmReset]     = useState(false)
  const [confirmLimpiar, setConfirmLimpiar] = useState(false)

  async function saveConfig(cfg) {
    // Campos de empresa → backend; el resto → localStorage
    const res = await patchConfiguracion.mutateAsync({
      nombre:    cfg.empresa,
      ruc:       cfg.ruc,
      contacto:  cfg.contacto,
      email:     cfg.email,
      telefono:  cfg.telefono,
      direccion: cfg.direccion,
    })
    if (res?.error) { toast(res.error, 'error'); return }
    storage.saveConfig(cfg)
    toast('Configuración guardada', 'success')
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // Switch persistido directo en backend (no espera al botón "Guardar
  // Configuración" general) — controla si el Login muestra las tarjetas de
  // acceso rápido para esta empresa (solo tiene efecto si origen='demo').
  async function toggleModoDesarrollo(v) {
    f('modoDesarrollo', v)
    const res = await patchConfiguracion.mutateAsync({ modoDesarrollo: v })
    if (res?.error) { toast(res.error, 'error'); return }
    toast(v ? 'Modo desarrollo activado' : 'Modo desarrollo desactivado', 'success')
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

      {/* ── Empresa ─────────────────────────────────── */}
      {tab === 'empresa' && <TabEmpresa form={form} f={f} tenantId={tenantId} sesion={sesion} />}

      {/* ── Sistema ─────────────────────────────────── */}
      {tab === 'sistema' && <TabSistema form={form} f={f} />}

      {/* ── Valorización ─────────────────────────────── */}
      {tab === 'valorizacion' && <TabValorizacion form={form} f={f} />}

      {/* ── Alertas ─────────────────────────────────── */}
      {tab === 'alertas' && <TabAlertas form={form} f={f} />}

      {/* ── Áreas Internas ──────────────────────────── */}
      {tab === 'areas-internas' && <TabAreasInternas toast={toast} />}

      {/* ── Categorías ──────────────────────────────── */}
      {tab === 'categorias' && <TabCategorias />}

      {/* ── Almacenes ───────────────────────────────── */}
      {tab === 'almacenes' && <TabAlmacenes />}

      {/* ── Importar Datos ───────────────────────────── */}
      {tab === 'importar' && (
        <TabImportarDatos
          cats={cats} alms={alms} provs={provs} prods={prods}
          crearProducto={crearProducto} actualizarProducto={actualizarProducto}
          toast={toast}
        />
      )}

      {/* ── Datos / Reset ────────────────────────────── */}
      {tab === 'datos' && (
        <TabDatosReset
          tenantId={tenantId} sesion={sesion} configApi={configApi}
          form={form} setForm={setForm}
          toggleModoDesarrollo={toggleModoDesarrollo}
          saveConfig={saveConfig}
          confirmReset={confirmReset} setConfirmReset={setConfirmReset}
          confirmLimpiar={confirmLimpiar} setConfirmLimpiar={setConfirmLimpiar}
          handleReset={handleReset} handleLimpiar={handleLimpiar}
        />
      )}

      {/* Botón guardar */}
      {tab !== 'datos' && tab !== 'importar' && tab !== 'areas-internas' && tab !== 'categorias' && tab !== 'almacenes' && (
        <div className="flex justify-end">
          <Btn variant="primary" size="lg" onClick={() => saveConfig(form)}>
            <Save size={15} /> Guardar Configuración
          </Btn>
        </div>
      )}
    </div>
  )
}
