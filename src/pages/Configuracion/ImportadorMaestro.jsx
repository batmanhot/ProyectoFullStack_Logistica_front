import { useState, useEffect, useRef } from 'react'
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, Download } from 'lucide-react'
import { ConfirmDialog, Btn, Spinner } from '../../components/ui/index'
import { obtenerPlantillaImport, usePrevisualizarImport, useConfirmarImport } from '../../queries/importacion.queries'
import { descargarPlantillaExcel, leerFilasExcel } from '../../utils/plantillaExcel'

// Importador genérico de datos maestros (clientes, proveedores, categorías,
// almacenes). El Excel se parsea acá; la validación y el upsert (transaccional,
// todo o nada) los hace el backend — ver src/importacion/ en la API.
export default function ImportadorMaestro({ entidad, label, toast }) {
  const [plantilla, setPlantilla]     = useState(null)
  const [rawFilas, setRawFilas]       = useState([])   // [{ "<Columna>": valor }] — lo que se manda
  const [preview, setPreview]         = useState(null) // { resumen, filas: [{ fila, valido, errores, datos, accion }] }
  const [confirmOpen, setConfirmOpen] = useState(false)
  const fileInputRef = useRef(null)

  const previsualizar = usePrevisualizarImport()
  const confirmar     = useConfirmarImport()

  useEffect(() => {
    setPlantilla(null); setRawFilas([]); setPreview(null)
    obtenerPlantillaImport(entidad)
      .then(p => setPlantilla(p?.data ?? p))
      .catch(() => toast('No se pudo cargar la plantilla', 'error'))
  }, [entidad])  // eslint-disable-line react-hooks/exhaustive-deps

  async function descargarPlantilla() {
    if (!plantilla) return
    await descargarPlantillaExcel({
      nombreHoja: plantilla.label || label,
      nombreArchivo: `plantilla_${entidad}`,
      columnas: plantilla.columnas,
      filas: plantilla.ejemplos || [],
    })
    toast('Plantilla descargada', 'success')
  }

  async function handleArchivo(e) {
    const file = e.target.files[0]
    if (!file) return
    try {
      const rows = await leerFilasExcel(file)
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (rows.length < 2) { toast('El archivo no tiene filas con datos', 'error'); return }

      // Re-keyeo por encabezado (tolera columnas en otro orden que la plantilla).
      const headers = rows[0].map(h => String(h).trim())
      const idxDe = col => headers.findIndex(h => h.toLowerCase() === String(col).toLowerCase())
      const limpias = rows.slice(1)
        .map(row => {
          const o = {}
          for (const col of plantilla.columnas) {
            const i = idxDe(col)
            o[col] = i >= 0 ? (row[i] ?? '') : ''
          }
          return o
        })
        .filter(o => Object.values(o).some(v => String(v).trim() !== ''))
      if (!limpias.length) { toast('El archivo no tiene filas con datos', 'error'); return }

      const res = await previsualizar.mutateAsync({ entidad, filas: limpias })
      if (res?.error) { toast(res.error, 'error'); return }
      setRawFilas(limpias)
      setPreview(res.data)
      toast(`${res.data.resumen.total} fila(s) analizadas — revisa la vista previa`, 'info')
    } catch {
      toast('Error al leer el archivo. Usa la plantilla descargada.', 'error')
    }
  }

  async function ejecutar() {
    const res = await confirmar.mutateAsync({ entidad, filas: rawFilas })
    setConfirmOpen(false)
    if (res?.error) { toast(res.error, 'error', 7000); return }
    const { creados = 0, actualizados = 0 } = res.data?.resumen || {}
    toast(`Importación de ${label}: ${creados} creados, ${actualizados} actualizados`, 'success', 6000)
    setRawFilas([]); setPreview(null)
  }

  if (!plantilla) return <div className="flex justify-center p-8"><Spinner /></div>

  const filas = preview?.filas || []
  const rs    = preview?.resumen
  const puedeConfirmar = rs && rs.error === 0 && (rs.crear + rs.actualizar) > 0

  return (
    <div className="flex flex-col gap-5">

      {/* Instrucciones */}
      <div className="bg-[#0d2137] border border-blue-500/25 rounded-xl p-5">
        <p className="text-[13px] font-semibold text-blue-300 mb-2">¿Cómo importar {label.toLowerCase()}?</p>
        <ol className="text-[12px] text-blue-200/70 flex flex-col gap-1 list-decimal list-inside leading-relaxed">
          <li>Descarga la plantilla Excel con el botón de abajo.</li>
          <li>Rellena tus datos respetando las columnas (no cambies los encabezados). Obligatorias: <span className="text-white/80 font-medium">{plantilla.requeridas.join(', ')}</span>.</li>
          <li>Sube el archivo y revisa la vista previa.</li>
          <li>Si el registro ya existe (mismo {entidad === 'clientes' || entidad === 'proveedores' ? 'RUC o razón social' : 'nombre'}) se <span className="text-yellow-300 font-medium">actualiza</span>; si es nuevo se <span className="text-emerald-300 font-medium">crea</span>.</li>
          <li>La importación es <span className="text-white/80 font-medium">todo o nada</span>: si alguna fila tiene error, no se guarda ninguna.</li>
        </ol>
      </div>

      {/* Paso 1 */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-2">Paso 1 — Descargar plantilla</div>
        <p className="text-[13px] text-[#9ba8b6] mb-4">Plantilla Excel con las columnas correctas y una fila de ejemplo.</p>
        <Btn variant="secondary" onClick={descargarPlantilla}>
          <Download size={14}/> Descargar Plantilla Excel
        </Btn>
      </div>

      {/* Paso 2 */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-2">Paso 2 — Subir archivo</div>
        <p className="text-[13px] text-[#9ba8b6] mb-4">Selecciona el archivo Excel (.xlsx) o CSV.</p>
        <input ref={fileInputRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleArchivo} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={previsualizar.isPending}
          className="flex items-center gap-3 w-full px-4 py-6 border-2 border-dashed border-white/12 hover:border-[#00c896]/50 rounded-xl text-[#5f6f80] hover:text-[#00c896] transition-all group disabled:opacity-50"
        >
          <FileSpreadsheet size={28} className="shrink-0 group-hover:scale-110 transition-transform"/>
          <div className="text-left">
            <p className="text-[13px] font-medium">{previsualizar.isPending ? 'Analizando…' : 'Haz clic para seleccionar un archivo'}</p>
            <p className="text-[11px] text-[#5f6f80] mt-0.5">Formatos aceptados: .xlsx, .csv</p>
          </div>
        </button>
      </div>

      {/* Paso 3 — Vista previa */}
      {preview && (
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Paso 3 — Vista previa</div>
              <div className="flex items-center gap-3 mt-1.5 text-[12px]">
                <span className="flex items-center gap-1 text-emerald-400"><CheckCircle size={12}/> {rs.crear} nuevos</span>
                <span className="flex items-center gap-1 text-yellow-400"><CheckCircle size={12}/> {rs.actualizar} actualizaciones</span>
                <span className="flex items-center gap-1 text-red-400"><XCircle size={12}/> {rs.error} con error</span>
              </div>
            </div>
            <button onClick={() => { setPreview(null); setRawFilas([]) }}
              className="text-[11px] text-[#5f6f80] hover:text-white/60 transition-colors">Limpiar</button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-white/6">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-[#1a2230]">
                  {['Fila','Estado','Acción', ...plantilla.campos.map(c => c.columna)].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-semibold text-[#5f6f80] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={i} className={`border-t border-white/4 ${!f.valido ? 'bg-red-500/5' : ''}`}>
                    <td className="px-3 py-2 text-[#5f6f80]">{f.fila}</td>
                    <td className="px-3 py-2">
                      {f.valido
                        ? <span className="flex items-center gap-1 text-emerald-400"><CheckCircle size={11}/>OK</span>
                        : <span className="flex items-center gap-1 text-red-400" title={f.errores.join(' · ')}>
                            <AlertTriangle size={11}/>{f.errores[0]}
                          </span>}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        f.accion === 'crear' ? 'bg-emerald-500/15 text-emerald-400'
                        : f.accion === 'actualizar' ? 'bg-yellow-500/15 text-yellow-400'
                        : 'bg-white/10 text-[#5f6f80]'}`}>
                        {f.accion === 'crear' ? 'NUEVO' : f.accion === 'actualizar' ? 'ACTUALIZAR' : '—'}
                      </span>
                    </td>
                    {plantilla.campos.map(c => (
                      <td key={c.campo} className="px-3 py-2 text-[#9ba8b6] max-w-[200px] truncate">
                        {f.datos?.[c.campo] === undefined || f.datos?.[c.campo] === '' ? '—' : String(f.datos[c.campo])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rs.error > 0 && (
            <p className="text-[12px] text-red-400 mt-3">
              Hay {rs.error} fila(s) con error. Corrige el archivo y vuelve a subirlo — no se importará nada hasta que todas estén OK.
            </p>
          )}

          {puedeConfirmar && (
            <div className="flex justify-end mt-4">
              <Btn variant="primary" disabled={confirmar.isPending} onClick={() => setConfirmOpen(true)}>
                <Upload size={14}/> Confirmar Importación ({rs.crear + rs.actualizar} {label.toLowerCase()})
              </Btn>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={ejecutar}
        title="Confirmar importación"
        message={rs ? `Se crearán ${rs.crear} y se actualizarán ${rs.actualizar} ${label.toLowerCase()}. ¿Continuar?` : ''} />
    </div>
  )
}
