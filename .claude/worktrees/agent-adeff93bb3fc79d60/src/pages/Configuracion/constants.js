import { Building2, Settings, Bell, DollarSign, Database, Upload, Layers, Tag, Warehouse } from 'lucide-react'

export const TABS = [
  ['empresa',           'Empresa',           Building2],
  ['sistema',           'Sistema',           Settings],
  ['valorizacion',      'Valorización',      DollarSign],
  ['alertas',           'Alertas',           Bell],
  ['areas-internas',    'Áreas Internas',    Layers],
  ['categorias',        'Categorías',        Tag],
  ['almacenes',         'Almacenes',         Warehouse],
  ['importar',          'Importar Datos',    Upload],
  ['datos',             'Datos / Reset',     Database],
]

export const MONEDAS = [
  { code: 'PEN', simbolo: 'S/',  nombre: 'Sol peruano' },
  { code: 'USD', simbolo: '$',   nombre: 'Dólar americano' },
  { code: 'EUR', simbolo: '€',   nombre: 'Euro' },
]

export const SI = 'px-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 w-full font-[inherit] placeholder-[#5f6f80]'
export const SEL = SI + ' pr-8'
export const SI_CI = SI
export const DS_CI = { colorScheme: 'dark' }
