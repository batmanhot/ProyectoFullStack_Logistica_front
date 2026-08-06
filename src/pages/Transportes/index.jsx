import { useState } from 'react'
import { Truck, Navigation as NavIcon, Users } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import TabRutas from './TabRutas'
import TabSeguimiento from './TabSeguimiento'
import TabTransportistas from './TabTransportistas'

export default function Transportes() {
  const { sesion } = useApp()
  const esChofer = sesion?.rol?.codigo === 'chofer'
  const [tab, setTab] = useState('rutas')

  // El Chofer solo gestiona SUS propias rutas asignadas (ver TabRutas) — no
  // necesita el panorama de todas las rutas (Seguimiento) ni administrar
  // transportistas.
  const tabs = [
    ['rutas',          'Rutas y Salidas', NavIcon],
    ...(esChofer ? [] : [
      ['seguimiento',    'Seguimiento',     Truck],
      ['transportistas', 'Transportistas',  Users],
    ]),
  ]

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-5">
      <div className="flex gap-0.5 border-b border-white/8">
        {tabs.map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-all ${
              tab === id ? 'text-[#00c896] border-[#00c896]' : 'text-[#5f6f80] border-transparent hover:text-[#9ba8b6]'
            }`}>
            <Icon size={14}/>{label}
          </button>
        ))}
      </div>
      {tab === 'rutas'          && <TabRutas/>}
      {tab === 'seguimiento'    && <TabSeguimiento/>}
      {tab === 'transportistas' && <TabTransportistas/>}
    </div>
  )
}
