import { Clock, Navigation as NavIcon, CheckCircle, X } from 'lucide-react'

export const SI  = 'w-full px-3 py-2 bg-[#1e2835] border border-white/8 rounded-lg text-[13px] text-[#e8edf2] outline-none focus:border-[#00c896] focus:ring-2 focus:ring-[#00c896]/20 font-[inherit] placeholder-[#5f6f80]'
export const SEL = SI + ' pr-8'

export const ESTADO_RUTA = {
  PROGRAMADA: { label:'Programada',  color:'neutral', icon:Clock        },
  EN_RUTA:    { label:'En Ruta',     color:'info',    icon:NavIcon      },
  COMPLETADA: { label:'Completada',  color:'success', icon:CheckCircle  },
  CANCELADA:  { label:'Cancelada',   color:'danger',  icon:X            },
}

export const ESTADO_PARADA = {
  PENDIENTE: { label:'Pendiente',    color:'neutral' },
  EN_CAMINO: { label:'En camino',    color:'info'    },
  ENTREGADO: { label:'Entregado',    color:'success' },
  FALLIDO:   { label:'No entregado', color:'danger'  },
}
