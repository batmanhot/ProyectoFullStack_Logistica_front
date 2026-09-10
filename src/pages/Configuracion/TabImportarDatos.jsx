import { useState } from 'react'
import { Package, Users, Truck, Tag, Warehouse } from 'lucide-react'
import ImportadorProductos from './ImportadorProductos'
import ImportadorMaestro from './ImportadorMaestro'

const OPCIONES = [
  { id: 'productos',    label: 'Productos',    icon: Package,   entidad: null },
  { id: 'clientes',     label: 'Clientes',     icon: Users,     entidad: 'clientes' },
  { id: 'proveedores',  label: 'Proveedores',  icon: Truck,     entidad: 'proveedores' },
  { id: 'categorias',   label: 'Categorías',   icon: Tag,       entidad: 'categorias' },
  { id: 'almacenes',    label: 'Almacenes',    icon: Warehouse, entidad: 'almacenes' },
]

export default function TabImportarDatos({ cats, alms, provs, prods, crearProducto, actualizarProducto, toast }) {
  const [sel, setSel] = useState('productos')
  const opcion = OPCIONES.find(o => o.id === sel) || OPCIONES[0]

  return (
    <div className="flex flex-col gap-5">
      {/* Selector de qué importar */}
      <div className="bg-[#161d28] border border-white/8 rounded-xl p-4">
        <div className="text-[11px] font-semibold text-[#5f6f80] uppercase tracking-[0.06em] mb-3">¿Qué querés importar?</div>
        <div className="flex flex-wrap gap-2">
          {OPCIONES.map(o => {
            const Icon = o.icon
            const activo = o.id === sel
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setSel(o.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12px] font-medium border transition-all
                  ${activo
                    ? 'bg-[#00c896]/12 border-[#00c896] text-[#00c896]'
                    : 'bg-[#1a2230] border-white/8 text-[#9ba8b6] hover:border-white/20'}`}
              >
                <Icon size={14}/> {o.label}
              </button>
            )
          })}
        </div>
      </div>

      {opcion.id === 'productos'
        ? <ImportadorProductos
            cats={cats} alms={alms} provs={provs} prods={prods}
            crearProducto={crearProducto} actualizarProducto={actualizarProducto}
            toast={toast}
          />
        : <ImportadorMaestro key={opcion.entidad} entidad={opcion.entidad} label={opcion.label} toast={toast} />
      }
    </div>
  )
}
