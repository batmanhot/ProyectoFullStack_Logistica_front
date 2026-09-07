import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { ConfirmDialog, Btn } from '../../components/ui/index'

export default function TabImportarDatos({ cats, alms, provs, prods, crearProducto, actualizarProducto, toast }) {
  const [filasImport, setFilasImport]     = useState([])
  const [confirmImport, setConfirmImport] = useState(false)
  const fileInputRef = useRef(null)

  function descargarPlantilla() {
    const filas = [
      ['SKU *','Nombre *','Descripción','Categoría','Unidad Medida',
       'Stock Actual','Stock Mínimo','Stock Máximo','Almacén','Proveedor',
       'Precio Venta','Tiene Vencimiento (Si/No)','Fecha Vencimiento (AAAA-MM-DD)'],
      ['PROD-001','Ejemplo Producto 1','Descripción opcional',
       cats[0]?.nombre||'Categoría 1','UND',0,5,100,
       alms[0]?.nombre||'Almacén Central',provs[0]?.razonSocial||'',99.90,'No',''],
      ['PROD-002','Ejemplo con Vencimiento','Producto perecedero',
       cats[0]?.nombre||'Categoría 1','KG',0,10,200,
       alms[0]?.nombre||'Almacén Central','',25.00,'Si','2026-12-31'],
    ]
    const ws = XLSX.utils.aoa_to_sheet(filas)
    ws['!cols'] = [10,30,35,20,14,12,12,12,22,25,12,24,26].map(wch=>({wch}))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Productos')
    XLSX.writeFile(wb, 'plantilla_productos.xlsx')
    toast('Plantilla descargada', 'success')
  }

  function handleArchivoImport(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb   = XLSX.read(ev.target.result, { type: 'binary' })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        if (rows.length < 2) { toast('El archivo no tiene datos', 'error'); return }

        const exist = prods

        const parsed = rows.slice(1)
          .filter(r => r.some(c => String(c).trim() !== ''))
          .map((row, idx) => {
            const sku        = String(row[0]||'').trim()
            const nombre     = String(row[1]||'').trim()
            const descripcion= String(row[2]||'').trim()
            const catNom     = String(row[3]||'').trim()
            const unidad     = String(row[4]||'UND').trim().toUpperCase()||'UND'
            const stockActual= Math.max(0, parseFloat(row[5])||0)
            const stockMinimo= Math.max(0, parseFloat(row[6])||0)
            const stockMaximo= Math.max(0, parseFloat(row[7])||0)
            const almNom     = String(row[8]||'').trim()
            const provNom    = String(row[9]||'').trim()
            const precioVenta= Math.max(0, parseFloat(row[10])||0)
            const tieneVenc  = ['si','sí'].includes(String(row[11]||'').trim().toLowerCase())
            const fechaVenc  = String(row[12]||'').trim()||null

            const cat  = cats.find(c => c.nombre.toLowerCase()  === catNom.toLowerCase())
            const alm  = alms.find(a => a.nombre.toLowerCase()  === almNom.toLowerCase())
            const prov = provs.find(p => (p.razonSocial||'').toLowerCase() === provNom.toLowerCase())
            const prev = exist.find(p => p.sku === sku)

            const errores = []
            if (!sku)            errores.push('SKU requerido')
            if (!nombre)         errores.push('Nombre requerido')
            if (catNom && !cat)  errores.push(`Categoría "${catNom}" no existe`)
            if (almNom && !alm)  errores.push(`Almacén "${almNom}" no existe`)

            return {
              _fila: idx + 2, _valid: errores.length === 0,
              _errores: errores, _accion: prev ? 'actualizar' : 'crear',
              _existenteId: prev?.id,
              sku, nombre, descripcion,
              categoriaId: cat?.id||'', categoriaNombre: catNom,
              unidadMedida: unidad,
              stockActual, stockMinimo, stockMaximo,
              almacenId: alm?.id||'', almacenNombre: almNom,
              proveedorId: prov?.id||'',
              precioVenta, tieneVencimiento: tieneVenc,
              fechaVencimiento: tieneVenc ? fechaVenc : null,
              activo: true,
            }
          })

        setFilasImport(parsed)
        if (fileInputRef.current) fileInputRef.current.value = ''
        toast(`${parsed.length} fila(s) detectadas — revisa la vista previa`, 'info')
      } catch {
        toast('Error al leer el archivo. Usa la plantilla descargada.', 'error')
      }
    }
    reader.readAsBinaryString(file)
  }

  async function ejecutarImport() {
    const validas = filasImport.filter(r => r._valid)
    if (!validas.length) { toast('No hay filas válidas para importar', 'error'); return }
    let creados = 0, actualizados = 0
    const fallidas = []
    for (const r of validas) {
      const prod = {
        sku: r.sku, nombre: r.nombre,
        categoriaId: r.categoriaId || null,
        unidadMedida: r.unidadMedida,
        stockMinimo: r.stockMinimo, stockMaximo: r.stockMaximo,
        proveedorId: r.proveedorId || null,
        precioVenta: r.precioVenta,
        esPerecedero: r.tieneVencimiento,
      }
      const res = r._accion === 'actualizar'
        ? await actualizarProducto.mutateAsync({ id: r._existenteId, ...prod })
        : await crearProducto.mutateAsync(prod)
      if (res?.error) { fallidas.push({ sku: r.sku, error: res.error }); continue }
      r._accion === 'actualizar' ? actualizados++ : creados++
    }
    const resumen = `Importación: ${creados} creados, ${actualizados} actualizados` +
      (fallidas.length ? `, ${fallidas.length} fallido(s)` : '')
    toast(resumen, fallidas.length ? 'warning' : 'success', 6000)
    if (fallidas.length) {
      toast(`Fallaron: ${fallidas.map(f => f.sku).join(', ')}`, 'error', 8000)
    }
    setFilasImport([])
    setConfirmImport(false)
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Instrucciones */}
      <div className="bg-[#0d2137] border border-blue-500/25 rounded-xl p-5">
        <p className="text-[13px] font-semibold text-blue-300 mb-2">¿Cómo importar productos?</p>
        <ol className="text-[12px] text-blue-200/70 flex flex-col gap-1 list-decimal list-inside leading-relaxed">
          <li>Descarga la plantilla Excel con el botón de abajo.</li>
          <li>Rellena tus productos respetando las columnas (no cambies los encabezados).</li>
          <li>Los campos <span className="text-white/80 font-medium">Categoría</span> y <span className="text-white/80 font-medium">Almacén</span> deben coincidir exactamente con los nombres configurados en el sistema.</li>
          <li>Sube el archivo y revisa la vista previa antes de confirmar.</li>
          <li>Si el SKU ya existe, el producto se <span className="text-yellow-300 font-medium">actualiza</span>. Si es nuevo, se <span className="text-emerald-300 font-medium">crea</span>.</li>
        </ol>
      </div>

      {/* Descargar plantilla */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-2">Paso 1 — Descargar plantilla</div>
        <p className="text-[13px] text-[#9ba8b6] mb-4">
          Genera una plantilla Excel con las columnas correctas y filas de ejemplo usando los datos de tu sistema (categorías, almacenes y proveedores actuales).
        </p>
        <Btn variant="secondary" onClick={descargarPlantilla}>
          <Download size={14}/> Descargar Plantilla Excel
        </Btn>
      </div>

      {/* Subir archivo */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-2">Paso 2 — Subir archivo</div>
        <p className="text-[13px] text-[#9ba8b6] mb-4">Selecciona el archivo Excel (.xlsx) o CSV con tus productos.</p>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv"
          className="hidden" onChange={handleArchivoImport} />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-3 w-full px-4 py-6 border-2 border-dashed border-white/12 hover:border-[#00c896]/50 rounded-xl text-[#5f6f80] hover:text-[#00c896] transition-all group"
        >
          <FileSpreadsheet size={28} className="shrink-0 group-hover:scale-110 transition-transform"/>
          <div className="text-left">
            <p className="text-[13px] font-medium">Haz clic para seleccionar un archivo</p>
            <p className="text-[11px] text-[#5f6f80] mt-0.5">Formatos aceptados: .xlsx, .xls, .csv</p>
          </div>
        </button>
      </div>

      {/* Vista previa */}
      {filasImport.length > 0 && (
        <div className="bg-[#161d28] border border-white/8 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em]">Paso 3 — Vista previa</div>
              <div className="flex items-center gap-3 mt-1.5 text-[12px]">
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle size={12}/> {filasImport.filter(r=>r._valid&&r._accion==='crear').length} nuevos
                </span>
                <span className="flex items-center gap-1 text-yellow-400">
                  <CheckCircle size={12}/> {filasImport.filter(r=>r._valid&&r._accion==='actualizar').length} actualizaciones
                </span>
                <span className="flex items-center gap-1 text-red-400">
                  <XCircle size={12}/> {filasImport.filter(r=>!r._valid).length} con error
                </span>
              </div>
            </div>
            <button onClick={() => setFilasImport([])}
              className="text-[11px] text-[#5f6f80] hover:text-white/60 transition-colors">
              Limpiar
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-white/6">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-[#1a2230]">
                  {['Fila','Estado','Acción','SKU','Nombre','Categoría','Almacén','Stock','Precio'].map(h=>(
                    <th key={h} className="px-3 py-2.5 text-left font-semibold text-[#5f6f80] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filasImport.map((r,i) => (
                  <tr key={i} className={`border-t border-white/4 ${!r._valid?'bg-red-500/5':''}`}>
                    <td className="px-3 py-2 text-[#5f6f80]">{r._fila}</td>
                    <td className="px-3 py-2">
                      {r._valid
                        ? <span className="flex items-center gap-1 text-emerald-400"><CheckCircle size={11}/>OK</span>
                        : <span className="flex items-center gap-1 text-red-400" title={r._errores.join(' · ')}>
                            <AlertTriangle size={11}/>{r._errores[0]}
                          </span>
                      }
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${r._accion==='crear'?'bg-emerald-500/15 text-emerald-400':'bg-yellow-500/15 text-yellow-400'}`}>
                        {r._accion==='crear'?'NUEVO':'ACTUALIZAR'}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[#9ba8b6]">{r.sku}</td>
                    <td className="px-3 py-2 text-[#e8edf2] max-w-[180px] truncate">{r.nombre}</td>
                    <td className="px-3 py-2 text-[#9ba8b6]">{r.categoriaNombre||'—'}</td>
                    <td className="px-3 py-2 text-[#9ba8b6]">{r.almacenNombre||'—'}</td>
                    <td className="px-3 py-2 text-[#9ba8b6]">{r.stockActual}</td>
                    <td className="px-3 py-2 text-[#9ba8b6]">{r.precioVenta.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filasImport.some(r=>r._valid) && (
            <div className="flex justify-end mt-4">
              <Btn variant="primary" onClick={() => setConfirmImport(true)}>
                <Upload size={14}/> Confirmar Importación ({filasImport.filter(r=>r._valid).length} productos)
              </Btn>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog open={confirmImport} onClose={() => setConfirmImport(false)} onConfirm={ejecutarImport}
        title="Confirmar importación"
        message={`Se importarán ${filasImport.filter(r=>r._valid&&r._accion==='crear').length} productos nuevos y se actualizarán ${filasImport.filter(r=>r._valid&&r._accion==='actualizar').length}. Las filas con error serán ignoradas. ¿Continuar?`} />
    </div>
  )
}
