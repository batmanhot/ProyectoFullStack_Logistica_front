import { Building2, Bell, DollarSign, Database, Upload, Layers, Tag, Warehouse, ShieldCheck } from 'lucide-react'

export const TABS = [
  ['empresa',           'Empresa',           Building2],
  ['valorizacion',      'Valorización',      DollarSign],
  ['aprobaciones',      'Aprobaciones',      ShieldCheck],
  ['alertas',           'Alertas',           Bell],
  ['areas-internas',    'Áreas Internas',    Layers],
  ['categorias',        'Categorías',        Tag],
  ['almacenes',         'Almacenes',         Warehouse],
  ['importar',          'Importar Datos',    Upload],
  ['datos',             'Datos / Reset',     Database],
]

export const SI = 'px-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 w-full font-[inherit] placeholder-[#5f6f80]'
export const SI_CI = SI
